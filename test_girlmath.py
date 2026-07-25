"""girl math — Regressionstests im echten Browser.

Prueft die Rechenwege und die Bedienung gegen den aktuellen Stand der App:
Einnahmen mit und ohne Arbeit, Umlage nicht-monatlicher Posten, die 30%-Marke,
Serie, Sofort-Einwurf, Rangliste, Ruecklage, Kuendigungs-Blick, Notgroschen,
Klappkarten, Monatsbericht, automatische Sicherung und die Migration alter
Staende.

Aufruf:  python3 test_girlmath.py
"""
import subprocess, sys, time
from pathlib import Path

from playwright.sync_api import sync_playwright

# Alles relativ zu dieser Datei: Das Skript läuft damit überall, wo das
# Projekt liegt, ohne dass jemand Pfade anpassen muss.
ROOT = Path(__file__).resolve().parent
SHOTS = ROOT / ".test-ausgabe"
SHOTS.mkdir(exist_ok=True)

PORT = 8899

fehler = []


def norm(x):
    """Geschuetzte Leerzeichen aus der Euro-Formatierung angleichen.

    toLocaleString setzt zwischen Zahl und Waehrungszeichen ein geschuetztes
    Leerzeichen (U+00A0), teils auch ein schmales (U+202F). Beide sehen aus
    wie ein normales Leerzeichen, sind aber keines — ohne diese Umwandlung
    scheitert jeder Vergleich mit einem Euro-Betrag.
    """
    if not isinstance(x, str):
        return x
    return x.replace(" ", " ").replace(" ", " ")


def pruefe(name, ist, soll):
    ist, soll = norm(ist), norm(soll)
    ok = ist == soll
    print(("  OK  " if ok else "  FAIL") + f" {name}: {ist!r}" + ("" if ok else f" (erwartet {soll!r})"))
    if not ok:
        fehler.append(name)


def karte(kat):
    """CSS-Selektor fuer die Karte einer Kategorie."""
    return f'.karte:has(form[data-add="{kat}"])'


def add(page, kat, label, betrag, rhythmus=None, faellig=None, haken=None):
    """Traegt einen Posten ueber das Formular der Kategorie ein.

    `haken` bedient das Kategorie-Haekchen: bei Abos und Versicherungen
    „notwendig?", bei den Einnahmen „dafuer gearbeitet?".
    """
    form = page.locator(f'form[data-add="{kat}"]')
    form.locator("[data-add-label]").fill(label)
    form.locator("[data-add-amount]").fill(str(betrag))
    if rhythmus:
        # Erst der Rhythmus — dadurch klappt die Monats-Auswahl ueberhaupt erst auf
        form.locator("[data-add-rhythmus]").select_option(rhythmus)
    if faellig:
        form.locator("[data-add-faellig]").select_option(str(faellig))
    if haken is not None:
        box = form.locator("[data-add-schalter]")
        if box.is_checked() != haken:
            box.click()
    form.locator('button[type="submit"]').click()


def setze(page, selektor, wert):
    """Feld fuellen und das change-Ereignis ausloesen."""
    page.locator(selektor).fill(str(wert))
    page.locator(selektor).dispatch_event("change")


def neu_starten(page):
    """Leeren Stand herstellen und das Willkommens-Fenster wegklicken."""
    page.evaluate("localStorage.clear()")
    page.reload()
    page.wait_for_selector(".modal-box")
    page.click("#btn-onboarding-fertig")


server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "-d", str(ROOT)],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 430, "height": 1000}, accept_downloads=True)
    page = ctx.new_page()
    # Jeder JavaScript-Fehler laesst den Durchlauf durchfallen, auch wenn die
    # sichtbare Pruefung daneben noch gruen waere.
    page.on("pageerror", lambda e: fehler.append(f"JS-Fehler: {e}"))
    page.on("console", lambda m: fehler.append(f"Konsole: {m.text}") if m.type == "error" else None)
    page.on("dialog", lambda d: d.accept())

    print("\n=== 1. Erster Besuch: Willkommens-Fenster ===")
    page.goto(f"http://localhost:{PORT}/")
    page.wait_for_selector(".modal-box")
    pruefe("Modal sichtbar", page.locator(".modal-box").is_visible(), True)
    page.screenshot(path=f"{SHOTS}/01-onboarding.png")
    page.click("#btn-onboarding-fertig")
    pruefe("Modal weg nach Klick", page.locator(".modal-box").count(), 0)

    print("\n=== 2. Zahlenfelder ohne Rauf-/Runter-Pfeile ===")
    stil = page.evaluate(
        "getComputedStyle(document.querySelector('input[type=number]'))"
        ".getPropertyValue('-webkit-appearance')")
    pruefe("Spinner abgeschaltet", stil, "textfield")

    print("\n=== 3. Ohne Einnahmen kein Urteil, aber sofort ein Einwurf ===")
    add(page, "luxus", "Sushi", 200)
    pruefe("neutrales Banner statt Spar-Koenigin", page.locator(".verdikt.v-neutral").count(), 1)
    pruefe("Sofort-Einwurf erscheint", page.locator(".toast-box").count(), 1)
    print("  Einwurf:", page.locator(".toast-box").inner_text())

    print("\n=== 4. Ein voller Monat ===")
    add(page, "income", "Gehalt", 2000, haken=True)
    add(page, "fixkosten", "Miete", 800, rhythmus="monatlich")
    add(page, "abos", "Netflix", 20, rhythmus="monatlich", haken=False)
    add(page, "abos", "Deutschlandticket", 58, rhythmus="monatlich", haken=True)
    # Jaehrliche Kfz-Versicherung, faellig im Juli (= laufender Monat): 360 -> 30/Monat
    add(page, "versicherungen", "Kfz-Versicherung", 360, rhythmus="jaehrlich", faellig=7, haken=True)
    add(page, "lebensmittel", "Wocheneinkauf", 300)
    add(page, "konsum", "Klamotten", 150)
    add(page, "sparen", "Ruecklage", 200)

    # notwendig umgelegt = 800 + 58 + 300 + 30 = 1188 | Ausnahmen = 200 + 20 + 150 = 370
    # -> 370 / 2000 = 18,5% -> 19%, Verdikt-Stufe 1
    pruefe("Ausnahmen-Quote im Banner",
           page.locator(".verdikt .prozent").inner_text().split("%")[0], "19")
    pruefe("Verdikt-Stufe 1", page.locator(".verdikt.v1").count(), 1)

    zahlen = page.locator(".uebersicht-karte .zahlenzeile").all_inner_texts()
    print("  Uebersicht:", [z.replace("\n", " ") for z in zahlen])
    pruefe("Notwendig umgelegt 1.188", any("1.188,00" in z for z in zahlen), True)
    pruefe("Ausnahmen 370", any("370,00" in z for z in zahlen), True)

    print("\n=== 5. Die 30%-Marke ===")
    pruefe("unter der Marke -> gruene Karte", page.locator(".ziel-karte.ok").count(), 1)
    pruefe("kein selbstgesetztes Ziel mehr", page.locator("#ziel-prozent").count(), 0)
    print("  Stand:", norm(page.locator(".ziel-stand").inner_text()).replace("\n", " "))

    print("\n=== 6. Lebenszeit aus Arbeitseinkommen ===")
    # 2000 EUR / (40 h * 4,3333 Wochen) = 11,54 EUR pro Stunde
    pruefe("Stundenlohn ausgewiesen",
           norm(page.locator(f'{karte("income")} .umlage-hinweis').inner_text()),
           "≈ 11,54 € pro Stunde")
    # 150 EUR Klamotten / 11,54 = 13 h
    pruefe("Zeit-Schild an der Ausnahme",
           page.locator(f'{karte("konsum")} .zeit-schild').inner_text(), "⏱ 13 h Arbeit")
    pruefe("kein Schild bei Lebensmitteln",
           page.locator(f'{karte("lebensmittel")} .zeit-schild').count(), 0)
    pruefe("Schild bei Netflix (nicht notwendig)",
           page.locator(f'{karte("abos")} .zeit-schild').count(), 1)
    setze(page, "#wochenstunden", 20)
    pruefe("Stundenlohn folgt den Wochenstunden",
           norm(page.locator(f'{karte("income")} .umlage-hinweis').inner_text()),
           "≈ 23,08 € pro Stunde")
    setze(page, "#wochenstunden", 40)

    print("\n=== 7. Rangliste der teuersten Ausnahmen ===")
    pruefe("drei Plaetze", page.locator(".rang-zeile").count(), 3)
    pruefe("Platz 1 ist Sushi",
           page.locator(".rang-zeile").first.locator(".rang-name").inner_text(), "Sushi")

    print("\n=== 8. Nicht-monatliche Posten: Rhythmus, Umlage, Warnung ===")
    pruefe("keine Rhythmus-Auswahl in den Zeilen", page.locator(".posten select").count(), 0)
    pruefe("Miete ohne Schild",
           page.locator(f'{karte("fixkosten")} .rhythmus-schild').count(), 0)
    pruefe("Kfz zeigt Rhythmus und Monat",
           page.locator(f'{karte("versicherungen")} .rhythmus-schild').inner_text(),
           "einmal im Jahr · ab Jul")
    # Achtung: .umlage-hinweis traegt auch der Stundenlohn oben — deshalb
    # gezielt in der Versicherungs-Karte nachsehen.
    pruefe("Umlage-Hinweis 30 EUR/Monat",
           "30,00 € / Monat" in norm(
               page.locator(f'{karte("versicherungen")} .umlage-hinweis').inner_text()), True)
    pruefe("Warnung 'geht diesen Monat ab'", page.locator(".faellig-karte.jetzt").count(), 1)
    pruefe("Ruecklagen-Karte", page.locator(".ruecklage-betrag").inner_text(), "30,00 €")
    # Die Rechnung hinter der Summe steht offen da: voller Betrag, Teilung, Anteil.
    pruefe("Aufschluesselung: eine Zeile", page.locator(".ruecklage-zeile").count(), 1)
    pruefe("Aufschluesselung nennt den Posten",
           page.locator(".ruecklage-zeile .ruecklage-name").inner_text().split("\n")[0],
           "Kfz-Versicherung")
    pruefe("Aufschluesselung zeigt die Teilung",
           norm(page.locator(".ruecklage-zeile .ruecklage-name small").inner_text()),
           "360,00 € ÷ 12 Monate")
    pruefe("Aufschluesselung zeigt den Monatsanteil",
           norm(page.locator(".ruecklage-zeile .ruecklage-anteil").inner_text()), "30,00 €")
    pruefe("keine Summenzeile bei einem einzigen Posten",
           page.locator(".ruecklage-summe").count(), 0)

    print("\n=== 9. Kontostand rechnet mit echtem Geld ===")
    # real = 800 + 58 + 300 + 360 (Kfz voll!) + 370 = 1888 | 2000 - 1888 - 200 = -88
    pruefe("Kontostand", page.locator(".konto-stand").inner_text(), "-88,00 €")
    pruefe("Fussnote zur Umlage", page.locator(".konto-fussnote").count(), 1)
    pruefe("Feld klar beschriftet",
           page.locator(".konto-block .beschriftung").first.inner_text().lower(),
           "kontostand am monatsanfang")

    print("\n=== 10. Kuendigungs-Blick nach Jahreskosten ===")
    # Ticket 58*12 = 696 | Kfz 30*12 = 360 | Netflix 20*12 = 240
    namen = [n.split("\n")[0].strip() for n in page.locator(".vertrag-name").all_inner_texts()]
    print("  Reihenfolge:", namen)
    pruefe("nach Jahreskosten sortiert", namen[0], "Deutschlandticket")
    pruefe("Jahreskosten Platz 1",
           "696,00" in norm(page.locator(".vertrag-jahr").first.inner_text()), True)
    pruefe("nur Netflix ist Kandidat", page.locator(".kandidat-schild").count(), 1)

    print("\n=== 11. Realitaets-Check: feste Regel, erklaert ===")
    pruefe("kein Umschalter", page.locator("#regel-auswahl").count(), 0)
    pruefe("50/30/20 fest", page.locator(".balken-label .ziel").all_inner_texts(),
           ["Ziel 50%", "Ziel 30%", "Ziel 20%"])
    page.locator(".regel-details summary").click()
    text = page.locator(".regel-details").inner_text()
    pruefe("nennt Warren", "Elizabeth Warren" in text, True)
    pruefe("erklaert Insolvenz in Klartext", "zahlungsunfähig" in text, True)

    print("\n=== 12. Notgroschen mit Stufen ===")
    # notwendig 1188 -> 3 Monate = 3564, 6 Monate = 7128
    pruefe("3-Monats-Ziel zuerst",
           page.locator(".notgroschen-kopf .beschriftung").first.inner_text().lower(),
           "ziel: 3 monatsausgaben")
    pruefe("Zielbetrag", page.locator(".notgroschen-ziel").inner_text(), "3.564,00 €")
    setze(page, "#notgroschen-start", 4000)   # 3 Monate uebersprungen
    pruefe("Ziel rueckt auf 6 Monate",
           page.locator(".notgroschen-kopf .beschriftung").first.inner_text().lower(),
           "ziel: 6 monatsausgaben")
    pruefe("Zielbetrag 6 Monate", page.locator(".notgroschen-ziel").inner_text(), "7.128,00 €")
    pruefe("Balken nicht bei 100%", page.locator(".notgroschen-quote").inner_text(), "59% geschafft")
    setze(page, "#notgroschen-start", 0)

    print("\n=== 13. Kreisdiagramm ===")
    pruefe("vier Segmente", page.locator(".donut .segment").count(), 4)
    pruefe("Zahl in der Mitte", page.locator(".donut-zahl").text_content(), "19%")
    page.screenshot(path=f"{SHOTS}/02-voll.png", full_page=True)

    print("\n=== 14. Karten ein- und ausklappen ===")
    k = page.locator('details[data-kat="luxus"]')
    pruefe("acht Klappkarten", page.locator("details[data-kat]").count(), 8)
    pruefe("standardmaessig offen", k.get_attribute("open") is not None, True)
    # „Posten" ist Buchhalter-Sprache und steht nirgends mehr in der Oberflaeche.
    pruefe("Anzahl im Kopf", k.locator(".karte-anzahl").inner_text(), "1 Eintrag")
    pruefe("das Wort Posten kommt nirgends vor",
           "Posten" in page.locator(".wrap").inner_text(), False)
    k.locator("summary").click()
    pruefe("zugeklappt", k.get_attribute("open") is None, True)
    pruefe("Summe bleibt sichtbar", k.locator(".karte-summe").is_visible(), True)
    pruefe("Inhalt verborgen", k.locator(".posten-liste").is_visible(), False)
    page.wait_for_timeout(200)   # das toggle-Ereignis wird asynchron zugestellt
    page.reload()
    page.wait_for_selector(".verdikt")
    pruefe("bleibt nach dem Neuladen zu",
           page.locator('details[data-kat="luxus"]').get_attribute("open") is None, True)
    page.locator('details[data-kat="luxus"] summary').click()

    print("\n=== 15. Monatsbericht als PDF ===")
    pruefe("am Bildschirm unsichtbar", page.locator("#bericht").is_visible(), False)
    page.click("#btn-bericht")
    inhalt = page.locator("#bericht").text_content()
    for teil in ["Monatsbericht", "Die Zahlen", "50/30/20", "Alle Posten im Einzelnen",
                 "nirgendwo hochgeladen"]:
        pruefe(f"Bericht enthaelt '{teil}'", teil in inhalt, True)
    page.emulate_media(media="print")
    pruefe("beim Drucken sichtbar", page.locator("#bericht").is_visible(), True)
    pruefe("App beim Drucken ausgeblendet", page.locator(".wrap").is_visible(), False)
    page.pdf(path=f"{SHOTS}/monatsbericht.pdf", format="A4")
    page.emulate_media(media="screen")
    pruefe("danach wieder normal", page.locator(".wrap").is_visible(), True)

    print("\n=== 16. Monatsabschluss: Uebernahme, Serie, automatische Sicherung ===")
    with page.expect_download(timeout=15000) as dl:
        page.click("#btn-monat-abschliessen")
    pruefe("Sicherung wird automatisch heruntergeladen",
           dl.value.suggested_filename.startswith("girl-math-sicherung-"), True)
    page.wait_for_selector(".archiv-eintrag")

    pruefe("neuer Monat ist August", "August 2026" in page.locator(".monat-zeile").inner_text(), True)
    pruefe("Fixkosten mitgenommen", page.locator(f'{karte("fixkosten")} .posten').count(), 1)
    pruefe("Abos mitgenommen", page.locator(f'{karte("abos")} .posten').count(), 2)
    pruefe("Versicherung mitgenommen", page.locator(f'{karte("versicherungen")} .posten').count(), 1)
    pruefe("Ausnahmen NICHT mitgenommen", page.locator(f'{karte("luxus")} .posten').count(), 0)
    pruefe("Einnahmen NICHT mitgenommen", page.locator(f'{karte("income")} .posten').count(), 0)
    pruefe("Rhythmus mitgenommen",
           page.locator(f'{karte("versicherungen")} .rhythmus-schild').inner_text(),
           "einmal im Jahr · ab Jul")
    zusammenfassung = page.evaluate("JSON.stringify(STATE.archive[0].summary)")
    pruefe("Archiv-Zusammenfassung ist gefuellt", "quoteNicht" in zusammenfassung, True)
    pruefe("Serie laeuft", page.locator(".serie-laeuft").count(), 1)
    pruefe("Archiv zeigt: unter der Marke", page.locator(".ziel-marke.gut").count(), 1)

    print("\n=== 17. Serie reisst, leerer Monat wird nicht bewertet ===")
    pruefe("neuer Monat urteilt noch nicht", page.locator(".verdikt.v-neutral").count(), 1)
    add(page, "income", "Gehalt", 2000, haken=True)
    add(page, "luxus", "Wein", 900)   # 900/2000 = 45% > 30%
    pruefe("ueber der Marke gemeldet", page.locator(".ziel-karte.gerissen").count(), 1)
    with page.expect_download(timeout=15000):
        page.click("#btn-monat-abschliessen")
    page.wait_for_selector(".serie-weg")
    pruefe("Serie auf 0", page.locator(".serie-weg").count(), 1)
    pruefe("Archiv zeigt: darueber", page.locator(".ziel-marke.schlecht").count(), 1)

    with page.expect_download(timeout=15000):
        page.click("#btn-monat-abschliessen")   # Monat ohne jede Eingabe
    page.wait_for_selector(".archiv-eintrag")
    marken = page.locator(".ziel-marke").all_inner_texts()
    print("  Archiv-Marken:", marken)
    pruefe("leerer Monat gilt nicht als Versagen",
           sum(1 for m in marken if "nicht bewertet" in m), 1)

    print("\n=== 18. Einnahmen OHNE Arbeit (Buergergeld, Geschenk, Flohmarkt) ===")
    neu_starten(page)
    add(page, "income", "Buergergeld", 563, haken=False)
    add(page, "income", "Flohmarkt", 300, haken=False)
    add(page, "fixkosten", "Miete", 400, rhythmus="monatlich")
    add(page, "luxus", "Sushi", 10)
    add(page, "luxus", "Sushi", 20)
    add(page, "luxus", "Wein", 25)

    # Einnahmen gesamt 863, Ausnahmen 55 -> 55/863 = 6,4% -> 6%
    pruefe("Prozente rechnen mit ALLEN Einnahmen",
           page.locator(".verdikt .prozent").inner_text().split("%")[0], "6")
    pruefe("kein Stundenlohn ohne Arbeitseinkommen",
           page.locator(f'{karte("income")} .umlage-hinweis').count(), 0)
    pruefe("App erklaert das",
           "keinen Stundenlohn" in page.locator(".zeit-zeile").inner_text(), True)
    # Statt erfundener Arbeitsstunden vergleicht die App mit der groessten
    # Rechnung (meist der Miete).
    banner = page.locator(".verdikt-zeit").inner_text()
    print("  Banner-Vergleich:", banner)
    pruefe("keine Arbeitszeit behauptet", "gearbeitet" in banner, False)
    pruefe("stattdessen Vergleich mit der Miete", "Miete" in banner, True)
    # 863 rein, 400 Miete + 55 Ausnahmen raus = 408
    pruefe("Kontostand rechnet trotzdem",
           page.locator(".konto-stand").inner_text(), "408,00 €")

    print("\n=== 19. Gleiche Namen werden zusammengefasst ===")
    pruefe("zwei statt drei Eintraege", page.locator(".rang-zeile").count(), 2)
    erste = page.locator(".rang-zeile").first
    pruefe("2x Sushi (30) schlaegt 1x Wein (25)",
           "Sushi" in erste.locator(".rang-name").inner_text(), True)
    pruefe("Anzahl wird angezeigt", erste.locator(".rang-anzahl").inner_text(), "2×")
    pruefe("Betraege addiert", "30,00" in norm(erste.locator(".rang-wert").inner_text()), True)
    pruefe("Wein bleibt einzeln",
           page.locator(".rang-zeile").nth(1).locator(".rang-anzahl").count(), 0)
    page.screenshot(path=f"{SHOTS}/05-ohne-job.png", full_page=True)

    print("\n=== 20. Minijob dazu: Arbeitszeit taucht auf ===")
    add(page, "income", "Minijob", 500, haken=True)
    # 500 / (40 * 4,3333) = 2,88 EUR pro Stunde
    pruefe("Stundenlohn nur aus dem Minijob",
           norm(page.locator(f'{karte("income")} .umlage-hinweis').inner_text()),
           "≈ 2,88 € pro Stunde")
    pruefe("Grundlage wird genannt",
           "500,00" in norm(page.locator(f'{karte("income")} .feld-hinweis').inner_text()), True)
    # Einnahmen gesamt 1363, Ausnahmen 55 -> 4,0% -> 4%
    pruefe("Prozente weiter auf ALLEN Einnahmen",
           page.locator(".verdikt .prozent").inner_text().split("%")[0], "4")

    print("\n=== 21. Keine Gedankenstriche in den Anzeigetexten ===")
    treffer = [z.strip() for z in page.locator(".wrap").inner_text().split("\n") if "—" in z]
    print("  Zeilen mit Gedankenstrich:", treffer)
    pruefe("keine Gedankenstriche", len(treffer), 0)

    print("\n=== 22. Migration eines ALTEN Standes (Version 1) ===")
    alt = {
        "version": 1,
        "currentMonth": {
            "id": "2026-07", "startBalance": 500,
            "income": [{"id": "a1", "label": "Gehalt", "amount": 2000}],
            "fixkosten": [{"id": "a2", "label": "Miete", "amount": 800}],
            "abos": [{"id": "a3", "label": "Netflix", "amount": 20, "notwendig": False}],
            "lebensmittel": [], "luxus": [{"id": "a4", "label": "Sushi", "amount": 80}],
            "konsum": [], "sparen": [],
        },
        "archive": [{"id": "2026-06", "summary": {"gehalt": 1900, "nicht": 300, "gespart": 100,
                                                  "quoteNicht": 15.8}, "snapshot": {"id": "2026-06"}}],
    }
    page.evaluate("d => localStorage.setItem('girlmath.v1', JSON.stringify(d))", alt)
    page.reload()
    page.wait_for_selector(".verdikt")
    pruefe("alter Stand laedt ohne Absturz", page.locator(".marke").is_visible(), True)
    pruefe("Versicherungs-Kategorie ergaenzt",
           page.locator('form[data-add="versicherungen"]').count(), 1)
    # Ausnahmen = 80 Sushi + 20 Netflix = 100 -> 100/2000 = 5%
    pruefe("alte Zahlen gerechnet",
           page.locator(".verdikt .prozent").inner_text().split("%")[0], "5")
    pruefe("altes Archiv erhalten", page.locator(".archiv-eintrag").count(), 1)
    pruefe("Wochenstunden vorbelegt", page.locator("#wochenstunden").input_value(), "40")
    pruefe("alte Posten gelten als monatlich", page.locator(".rhythmus-schild").count(), 0)

    print("\n=== 23. Gesicherter Stand enthaelt alles ===")
    stand = page.evaluate("JSON.parse(JSON.stringify(STATE))")
    pruefe("Version 3", stand.get("version"), 3)
    pruefe("Wochenstunden gespeichert", stand["einstellungen"]["wochenstunden"], 40)
    pruefe("Notgroschen-Startwert gespeichert", stand["einstellungen"]["notgroschenStart"], 0)
    pruefe("Versicherungen im Monat", "versicherungen" in stand["currentMonth"], True)
    pruefe("Einnahme merkt sich 'gearbeitet'",
           all("gearbeitet" in p for p in stand["currentMonth"]["income"]), True)


    print("\n=== 24. Andere Geraete: Android und iPhone ===")
    # Groesse UND Geraetekennung nachbilden, damit auch die geraeteabhaengige
    # Anleitung zum PDF geprueft wird.
    for geraetename, erwarteter_satz in [("Pixel 7", "Als PDF speichern"),
                                         ("iPhone 14", "In Dateien sichern")]:
        gctx = browser.new_context(**p.devices[geraetename])
        gpage = gctx.new_page()
        gpage.on("pageerror", lambda e, n=geraetename: fehler.append(f"{n}: JS-Fehler: {e}"))
        gpage.on("console",
                 lambda m, n=geraetename: fehler.append(f"{n}: Konsole: {m.text}")
                 if m.type == "error" else None)
        hinweise = []
        gpage.on("dialog", lambda d: (hinweise.append(d.message), d.accept()))

        gpage.goto(f"http://localhost:{PORT}/")
        gpage.wait_for_selector(".modal-box")
        # Deckt das Willkommens-Fenster wirklich den ganzen Bildschirm ab?
        kasten = gpage.locator(".modal-hintergrund").bounding_box()
        schirm = gpage.viewport_size
        pruefe(f"{geraetename}: Abdeckung fuellt den Bildschirm",
               round(kasten["width"]) >= schirm["width"]
               and round(kasten["height"]) >= schirm["height"], True)
        gpage.click("#btn-onboarding-fertig")

        add(gpage, "income", "Gehalt", 1800, haken=True)
        add(gpage, "fixkosten", "Miete", 700, rhythmus="monatlich")
        add(gpage, "luxus", "Sushi", 120)
        # 120 / 1800 = 6,7% -> 7%
        pruefe(f"{geraetename}: rechnet",
               gpage.locator(".verdikt .prozent").inner_text().split("%")[0], "7")

        ueberstand = gpage.evaluate(
            "document.documentElement.scrollWidth - document.documentElement.clientWidth")
        pruefe(f"{geraetename}: kein seitliches Scrollen", ueberstand <= 0, True)

        k = gpage.locator('details[data-kat="luxus"]')
        k.locator("summary").click()
        pruefe(f"{geraetename}: Karte klappt zu", k.get_attribute("open") is None, True)

        gpage.click("#btn-bericht")
        pruefe(f"{geraetename}: Anleitung zum PDF passt zum Geraet",
               bool(hinweise) and erwarteter_satz in hinweise[-1], True)
        gpage.emulate_media(media="print")
        pruefe(f"{geraetename}: Druckansicht zeigt den Bericht",
               gpage.locator("#bericht").is_visible(), True)
        gpage.emulate_media(media="screen")
        gpage.screenshot(path=f"{SHOTS}/geraet-{geraetename.replace(' ', '-')}.png", full_page=True)
        gctx.close()

    page.screenshot(path=f"{SHOTS}/04-migriert.png", full_page=True)

    print("\n=== 25. Ruecklage: mehrere Posten ergeben eine Summe ===")
    neu_starten(page)
    # Den laufenden Monat aus der Seite holen, damit der Test in jedem Monat
    # des Jahres funktioniert und nicht nur im Juli.
    dieser_monat = page.evaluate("new Date().getMonth() + 1")
    add(page, "income", "Gehalt", 2000, haken=True)
    # 360 im Jahr -> 30 pro Monat | 120 alle 3 Monate -> 40 pro Monat | zusammen 70
    add(page, "versicherungen", "Kfz", 360, rhythmus="jaehrlich",
        faellig=dieser_monat, haken=True)
    add(page, "abos", "Fitness", 120, rhythmus="vierteljaehrlich",
        faellig=dieser_monat, haken=False)
    pruefe("Summe aus zwei Posten", page.locator(".ruecklage-betrag").inner_text(), "70,00 €")
    pruefe("zwei Zeilen in der Aufschluesselung", page.locator(".ruecklage-zeile").count(), 2)
    pruefe("groesster Anteil steht oben",
           page.locator(".ruecklage-zeile").first.locator(".ruecklage-anteil").inner_text(),
           "40,00 €")
    pruefe("Summenzeile taucht ab zwei Posten auf",
           norm(page.locator(".ruecklage-summe").inner_text()).replace("\n", " "),
           "zusammen jeden Monat weglegen 70,00 €")
    page.screenshot(path=f"{SHOTS}/05-ruecklage.png", full_page=True)

    print("\n=== 26. Affirmationen: fest im Programm, eigene obendrauf ===")
    neu_starten(page)
    fest = page.evaluate("AFFIRMATIONEN.length")
    pruefe("mindestens 111 feste Saetze", fest >= 111, True)
    pruefe("ein Satz steht da", page.locator(".affirmation-satz").count(), 1)
    pruefe("Zaehler nennt den vollen Vorrat",
           page.locator(".affirmation-zaehler").inner_text().endswith(f"von {fest}"), True)
    pruefe("keine Knoepfe zum Holen oder Zuruecksetzen",
           page.locator("#btn-affirmationen-holen").count()
           + page.locator("#btn-affirmationen-reset").count(), 0)
    pruefe("im Speicher liegt keine Kopie der festen Saetze",
           page.evaluate("STATE.einstellungen.eigeneAffirmationen.length"), 0)

    # Derselbe Tag zeigt denselben Satz, auch nach einer Neuberechnung der Seite
    heute = page.locator(".affirmation-satz").inner_text()
    add(page, "luxus", "Sushi", 20)
    pruefe("Satz bleibt beim Eintragen stehen", page.locator(".affirmation-satz").inner_text(), heute)

    page.click("#btn-affirmation-weiter")
    pruefe("Blaettern zeigt einen anderen Satz",
           page.locator(".affirmation-satz").inner_text() != heute, True)

    # Eigenen Satz hinzufuegen
    page.click(".affirmation-verwalten > summary")
    page.locator("[data-affirmation-neu]").fill("Mein Geld bleibt bei mir.")
    page.locator(".affirmation-form button[type=submit]").click()
    pruefe("eigener Satz ist gelistet",
           page.locator(".affirmation-eintrag", has_text="Mein Geld bleibt bei mir.").count(), 1)
    pruefe("nur der eigene wird gelistet, nicht die festen",
           page.locator(".affirmation-eintrag").count(), 1)
    pruefe("Vorrat um eins gewachsen",
           page.locator(".affirmation-zaehler").inner_text().endswith(f"von {fest + 1}"), True)

    # Ein fester Satz laesst sich nicht als eigener doppeln
    page.locator("[data-affirmation-neu]").fill("Ich bin reich.")
    page.locator(".affirmation-form button[type=submit]").click()
    pruefe("fester Satz wird nicht als eigener aufgenommen",
           page.evaluate("STATE.einstellungen.eigeneAffirmationen.length"), 1)

    # Der eigene Satz ueberlebt das Neuladen
    page.reload()
    page.click(".affirmation-verwalten > summary")
    pruefe("eigener Satz ueberlebt das Neuladen",
           page.locator(".affirmation-eintrag", has_text="Mein Geld bleibt bei mir.").count(), 1)

    # Eigenen Satz loeschen: die festen bleiben unangetastet
    page.locator(".affirmation-eintrag .del").first.click()
    pruefe("eigener Satz geloescht",
           page.evaluate("STATE.einstellungen.eigeneAffirmationen.length"), 0)
    pruefe("die festen Saetze sind weiterhin alle da",
           page.locator(".affirmation-zaehler").inner_text().endswith(f"von {fest}"), True)
    pruefe("es steht immer ein Satz da, nie eine Luecke",
           page.locator(".affirmation-satz").count(), 1)

    # Ein alter Stand aus der Zeit, als die Vorschlaege im Speicher lagen:
    # die Kopien von damals duerfen NICHT als eigene Saetze wieder auftauchen.
    page.evaluate("""
        const roh = JSON.parse(localStorage.getItem('girlmath.v1'));
        roh.einstellungen.affirmationen =
          AFFIRMATIONEN.concat(['Ein Vorschlag, den es nicht mehr gibt.']);
        delete roh.einstellungen.eigeneAffirmationen;
        localStorage.setItem('girlmath.v1', JSON.stringify(roh));
    """)
    page.reload()
    pruefe("alter Stand bringt keine Altlasten mit",
           page.evaluate("STATE.einstellungen.eigeneAffirmationen.length"), 0)
    pruefe("und zeigt genau die festen Saetze",
           page.locator(".affirmation-zaehler").inner_text().endswith(f"von {fest}"), True)

    page.screenshot(path=f"{SHOTS}/06-affirmationen.png", full_page=True)

    print("\n=== 27. Sparziel: Ankunft, Umleitung, Trennung vom Notgroschen ===")
    neu_starten(page)

    # Ohne Ziel gibt es weder Haekchen an den Sparposten noch eine Rechnung.
    pruefe("ohne Ziel steht die Einladung da", page.locator(".sparziel-karte.leer").count(), 1)
    add(page, "sparen", "Ruecklage", 100)
    pruefe("ohne Ziel kein Haekchen, weder am Posten noch im Formular",
           page.locator(f'{karte("sparen")} .schalter').count(), 0)

    add(page, "income", "Gehalt", 2000, haken=True)
    add(page, "fixkosten", "Miete", 800)
    # Notgroschen-Ziel = 3 x 800 = 2400, bisher 100
    pruefe("Gespartes zaehlt ohne Ziel voll zum Notgroschen",
           norm(page.locator(".notgroschen-ist").inner_text()), "100,00 €")

    # Ziel anlegen: 2000 EUR, ohne Termin
    setze(page, "#sparziel-label", "Lissabon")
    setze(page, "#sparziel-betrag", 2000)
    pruefe("Ziel steht mit Namen",
           page.locator(".sparziel-kopf .beschriftung").first.inner_text(), "Lissabon")
    pruefe("Zielbetrag", norm(page.locator(".sparziel-summe").inner_text()), "2.000,00 €")
    pruefe("noch nichts dafuer zurueckgelegt", norm(page.locator(".sparziel-ist").inner_text()), "0,00 €")
    pruefe("jetzt gibt es das Haekchen am Posten",
           page.locator(f'{karte("sparen")} .posten .schalter').count(), 1)

    # 200 EUR fuers Ziel weglegen — der Posten wandert damit aus dem Notgroschen raus.
    add(page, "sparen", "Reisekasse", 200)
    page.locator(f'{karte("sparen")} .posten:has(input[value="Reisekasse"]) .schalter input').click()
    pruefe("Ziel-Sparen zaehlt zum Ziel", norm(page.locator(".sparziel-ist").inner_text()), "200,00 €")
    pruefe("und NICHT mehr zum Notgroschen",
           norm(page.locator(".notgroschen-ist").inner_text()), "100,00 €")
    pruefe("Fortschritt 200 von 2000", page.locator(".sparziel-karte .notgroschen-quote").inner_text(),
           "10% geschafft · noch 1.800,00 €")

    # Ankunft: 1800 fehlen, 200 pro Monat -> 9 Monate
    heute = page.evaluate("STATE.currentMonth.id")
    MONATE_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
                 "August", "September", "Oktober", "November", "Dezember"]

    def id_plus(mid, n):
        """Monats-ID um n Monate weiterschieben — unabhaengig von der App gerechnet."""
        jahr, monat = (int(t) for t in mid.split("-"))
        gesamt = jahr * 12 + (monat - 1) + n
        return f"{gesamt // 12}-{(gesamt % 12) + 1:02d}"

    def monat_plus(mid, n):
        """Dasselbe, aber lesbar: 'Mai 2027'."""
        jahr, monat = (int(t) for t in id_plus(mid, n).split("-"))
        return f"{MONATE_DE[monat - 1]} {jahr}"

    pruefe("Ankunft in 9 Monaten",
           monat_plus(heute, 9) in page.locator(".sparziel-text").inner_text(), True)
    pruefe("Sparrate wird genannt",
           "200,00" in norm(page.locator(".sparziel-text").inner_text()), True)

    # Ausnahme: 300 EUR Sushi. Umleitbar ist die Haelfte (150).
    # 1800 / (200 + 150) = 5,14 -> 6 Monate, also 3 Monate frueher.
    add(page, "luxus", "Sushi", 300)
    pruefe("Umleitungs-Rechnung erscheint", page.locator(".sparziel-umleitung").count(), 1)
    umleitung = norm(page.locator(".sparziel-umleitung").inner_text())
    pruefe("3 Monate frueher", "3 Monate früher" in umleitung, True)
    pruefe("mit dem Ankunftsmonat", monat_plus(heute, 6) in umleitung, True)

    # Das Ziel-Schild am Posten: 300 / 200 = 1,5 -> gerundet 2 Monate
    pruefe("Ziel-Schild am Ausnahme-Posten",
           page.locator(f'{karte("luxus")} .ziel-schild').inner_text().strip(),
           "🎯 2 Monate später: Lissabon")

    # Der Notgroschen-Vorrang steht da, solange der Puffer nicht steht.
    pruefe("Notgroschen-Vorrang wird gesagt", page.locator(".sparziel-vorrang").count(), 1)

    # Wunschtermin, der nicht zu schaffen ist: naechster Monat, 1800 EUR offen.
    # Das "toggle"-Ereignis meldet sich erst im naechsten Frame — ein Mensch
    # braucht laenger zum Tippen, der Automat nicht. Deshalb hier kurz warten.
    page.click(".sparziel-aendern > summary")
    page.wait_for_timeout(100)
    # Eine Auswahlliste, kein <input type="month"> — das kennt Safari am Mac nicht.
    pruefe("Termin ist eine Auswahlliste",
           page.locator("select#sparziel-termin").count(), 1)
    page.locator("#sparziel-termin").select_option(id_plus(heute, 1))
    pruefe("„Ziel ändern\" bleibt beim Tippen offen",
           page.locator(".sparziel-aendern[open]").count(), 1)
    pruefe("zu knapper Termin wird als solcher benannt",
           page.locator(".sparziel-termin.warn").count(), 1)
    pruefe("und nennt die noetige Rate",
           "1.800,00" in norm(page.locator(".sparziel-termin").inner_text()), True)

    page.screenshot(path=f"{SHOTS}/07-sparziel.png", full_page=True)

    # Sofort-Einwurf: ein Kauf verschiebt das Ziel.
    add(page, "luxus", "Jacke", 400)
    pruefe("Einwurf nennt das Ziel",
           "Lissabon" in page.locator("#toast").inner_text(), True)

    # Ziel loeschen: das Gesparte faellt zurueck an den Notgroschen.
    page.click("#btn-sparziel-weg")
    pruefe("Karte ist wieder die Einladung", page.locator(".sparziel-karte.leer").count(), 1)
    pruefe("Gespartes gehoert wieder dem Notgroschen",
           norm(page.locator(".notgroschen-ist").inner_text()), "300,00 €")
    pruefe("und die Haekchen sind weg",
           page.locator(f'{karte("sparen")} .schalter').count(), 0)

    print("\n=== 28. Jedes Haekchen startet leer ===")
    neu_starten(page)
    # Kein Haekchen setzt sich von allein — weder im Formular noch am neuen Posten.
    for kat in ("income", "abos", "versicherungen"):
        pruefe(f"{kat}: Formular-Haekchen leer",
               page.locator(f'form[data-add="{kat}"] [data-add-schalter]').is_checked(), False)
        add(page, kat, "Testposten", 100)
        pruefe(f"{kat}: neuer Posten ohne Haken",
               page.locator(f'{karte(kat)} .posten input[type="checkbox"]').is_checked(), False)

    # Ohne Haken kein Arbeitseinkommen: die App rechnet keinen Stundenlohn,
    # statt einen zu erfinden, den niemand bestaetigt hat.
    pruefe("kein Stundenlohn ohne Haken", page.locator("#wochenstunden").count(), 0)
    page.locator(f'{karte("income")} .posten input[type="checkbox"]').click()
    pruefe("nach dem Antippen rechnet sie ihn", page.locator("#wochenstunden").count(), 1)

    print("\n=== 29. Sparziel: alte Staende und der Monatswechsel ===")
    neu_starten(page)
    # Ein Stand aus der Zeit vor dem Sparziel: kennt weder das Feld noch die
    # getrennten Summen im Archiv. Er darf weder abstuerzen noch Puffer verlieren.
    page.evaluate("""
      localStorage.setItem("girlmath.v1", JSON.stringify({
        version: 3,
        einstellungen: { wochenstunden: 40, notgroschenStart: 0, zugeklappt: [] },
        currentMonth: { id: "2026-03", startBalance: 0,
          income: [{ id: "a", label: "Gehalt", amount: 2000, gearbeitet: true }],
          fixkosten: [{ id: "b", label: "Miete", amount: 800, rhythmus: "monatlich", faellig: 3 }],
          sparen: [{ id: "c", label: "Rücklage", amount: 150 }] },
        archive: [{ id: "2026-02", summary: { gespart: 250, quoteNicht: 10, regelErreicht: true }, snapshot: {} }],
        onboardingGesehen: true
      }));
    """)
    page.reload()
    pruefe("alter Stand laedt ohne Ziel", page.locator(".sparziel-karte.leer").count(), 1)
    pruefe("alter Puffer bleibt vollstaendig",
           norm(page.locator(".notgroschen-ist").inner_text()), "400,00 €")

    # Jetzt ein Ziel setzen: das alte Gesparte bleibt beim Notgroschen,
    # weil es damals nie fuer ein Ziel markiert war.
    setze(page, "#sparziel-label", "Führerschein")
    setze(page, "#sparziel-betrag", 3000)
    pruefe("altes Gespartes bleibt Puffer",
           norm(page.locator(".notgroschen-ist").inner_text()), "400,00 €")
    pruefe("das Ziel startet bei null", norm(page.locator(".sparziel-ist").inner_text()), "0,00 €")

    # Monatswechsel: die getrennten Summen landen im Archiv und werden weitergezaehlt.
    page.locator(f'{karte("sparen")} .posten:has(input[value="Rücklage"]) .schalter input').click()
    pruefe("umgehaengt aufs Ziel", norm(page.locator(".sparziel-ist").inner_text()), "150,00 €")
    page.click("#btn-monat-abschliessen")
    pruefe("nach dem Abschluss zaehlt das Ziel weiter",
           norm(page.locator(".sparziel-ist").inner_text()), "150,00 €")
    pruefe("und der Puffer auch",
           norm(page.locator(".notgroschen-ist").inner_text()), "250,00 €")
    pruefe("Archiv haelt beide Summen getrennt",
           page.evaluate("STATE.archive[0].summary.gespartZiel"), 150)

    print("\n=== 30. Wohlstand, der in mein Leben fliesst ===")

    def zufluss_add(page, was, wert=None):
        """Traegt einen zugeflossenen Moment ueber das Formular ein."""
        page.locator("[data-zufluss-label]").fill(was)
        page.locator("[data-zufluss-amount]").fill("" if wert is None else str(wert))
        page.locator(".zufluss-form button[type=submit]").click()

    neu_starten(page)
    pruefe("Karte ist von Anfang an da", page.locator(".zufluss-karte").count(), 1)
    pruefe("aber ohne Nullwert", page.locator(".zufluss-gross").count(), 0)
    pruefe("stattdessen eine Einladung", page.locator(".zufluss-leer").count(), 1)

    # Ein Moment MIT Wert und einer OHNE. Beide zaehlen, nur einer hat einen Preis.
    zufluss_add(page, "Oma hat mir was zugesteckt", 20)
    zufluss_add(page, "Blumen von Nadja")
    pruefe("beide Momente stehen in der Liste", page.locator(".zufluss-eintrag").count(), 2)
    pruefe("nur einer zeigt einen Betrag", page.locator(".zufluss-wert").count(), 1)
    zahlen = page.locator(".zufluss-gross").all_inner_texts()
    pruefe("Summe und Anzahl des Monats stehen nebeneinander",
           [norm(t) for t in zahlen], ["20,00 €", "2 ×"])
    # .lower(), weil styles.css die Beschriftung in Grossbuchstaben setzt
    # und inner_text() den GERENDERTEN Text zurueckgibt.
    pruefe("die Summe traegt den Monatsnamen",
           "zugeflossen" in page.locator(".zufluss-klein").first.inner_text().lower(), True)
    pruefe("im ersten Monat noch keine Jahresauswertung",
           page.locator(".zufluss-jahre").count(), 0)

    # Das Kernversprechen: Diese Karte fasst KEINE Zahl der grossen Rechnung an.
    add(page, "income", "Gehalt", 1000, haken=True)
    add(page, "fixkosten", "Miete", 500)
    vorher = page.evaluate("(() => { const z = rechne(STATE.currentMonth);"
                           "  return [z.gehalt, z.kontostand, z.quoteNicht, z.quoteSpar]; })()")
    zufluss_add(page, "50 Euro auf der Strasse gefunden", 50)
    nachher = page.evaluate("(() => { const z = rechne(STATE.currentMonth);"
                            "  return [z.gehalt, z.kontostand, z.quoteNicht, z.quoteSpar]; })()")
    pruefe("Gehalt, Kontostand und Quoten bleiben unberuehrt", nachher, vorher)
    pruefe("Gehalt ist wirklich nur das Einkommen", page.evaluate("rechne(STATE.currentMonth).gehalt"), 1000)

    # Ohne Bezeichnung geht nichts rein: „20 €" allein erinnert an nichts.
    zufluss_add(page, "", 99)
    pruefe("namenloser Eintrag wird abgelehnt", page.locator(".zufluss-eintrag").count(), 3)

    # Der Bericht nennt die Momente beim Namen, auch die ohne Preisschild.
    page.click("#btn-bericht")
    bericht = page.locator("#bericht").inner_text()
    pruefe("Bericht listet die Momente", "Oma hat mir was zugesteckt" in bericht, True)
    pruefe("und schreibt bei den unbezifferten „ohne Preis“", "ohne Preis" in bericht, True)

    # Loeschen laeuft ueber denselben Weg wie bei den Posten.
    page.locator(".zufluss-eintrag", has_text="Blumen von Nadja").locator(".del").click()
    pruefe("geloescht", page.locator(".zufluss-eintrag").count(), 2)
    pruefe("und die Anzahl zaehlt runter",
           norm(page.locator(".zufluss-gross").nth(1).inner_text()), "2 ×")

    # Monatswechsel: Die Momente bleiben im alten Monat, das Jahr zaehlt weiter.
    page.click("#btn-monat-abschliessen")
    pruefe("neuer Monat startet ohne Momente",
           page.evaluate("STATE.currentMonth.zufluesse.length"), 0)
    pruefe("Archiv haelt die Summe fest",
           page.evaluate("STATE.archive[0].summary.zuflussSumme"), 70)
    pruefe("und die Anzahl",
           page.evaluate("STATE.archive[0].summary.zuflussAnzahl"), 2)
    pruefe("der leere Monat zeigt keine grosse Null",
           page.locator(".zufluss-gross").count(), 0)
    pruefe("sondern sagt es in einem Satz",
           "noch nichts" in page.locator(".zufluss-monat-leer").inner_text(), True)

    # Jetzt traegt die Jahresauswertung die Karte.
    pruefe("Jahresauswertung erscheint", page.locator(".zufluss-jahre").count(), 1)
    pruefe("mit einer Zeile fuers laufende Jahr", page.locator(".zufluss-jahr").count(), 1)
    pruefe("Jahressumme stimmt",
           norm(page.locator(".zufluss-jahr-wert").inner_text()), "70,00 €")
    pruefe("Jahres-Anzahl stimmt", page.locator(".zufluss-jahr-mal").inner_text(), "2 Mal")
    pruefe("das laufende Jahr ist als „bisher“ gekennzeichnet",
           "bisher" in page.locator(".zufluss-jahr-name").inner_text(), True)

    zufluss_add(page, "Kaffee ausgegeben bekommen", 4)
    zahlen = page.locator(".zufluss-gross").all_inner_texts()
    pruefe("der neue Monat zaehlt bei null wieder los",
           [norm(t) for t in zahlen], ["4,00 €", "1 ×"])
    pruefe("das Jahr zaehlt dazu",
           norm(page.locator(".zufluss-jahr-wert").inner_text()), "74,00 €")
    pruefe("und zwar in Momenten", page.locator(".zufluss-jahr-mal").inner_text(), "3 Mal")

    # Ein Jahreswechsel: jedes Jahr bekommt eine eigene Zeile, neuestes zuerst.
    page.evaluate("""
      STATE.archive.push({ id: "2025-11", summary: { zuflussSumme: 1240, zuflussAnzahl: 87 },
                           snapshot: { id: "2025-11" } });
      speichern(); render();
    """)
    pruefe("zwei Jahre, zwei Zeilen", page.locator(".zufluss-jahr").count(), 2)
    namen = [t.split()[0] for t in page.locator(".zufluss-jahr-name").all_inner_texts()]
    pruefe("neuestes Jahr zuerst", namen, ["2026", "2025"])
    werte = [norm(t) for t in page.locator(".zufluss-jahr-wert").all_inner_texts()]
    pruefe("jedes Jahr mit seiner eigenen Summe", werte, ["74,00 €", "1.240,00 €"])
    pruefe("das abgeschlossene Jahr ohne „bisher“",
           "bisher" in page.locator(".zufluss-jahr-name").nth(1).inner_text(), False)

    # Der Bericht traegt dieselbe Jahresauswertung.
    page.click("#btn-bericht")
    bericht = page.locator("#bericht").inner_text()
    pruefe("Bericht nennt die Jahresauswertung", "Jahresauswertung" in bericht, True)
    pruefe("und das abgeschlossene Jahr darin", "87 Mal" in bericht, True)

    # Momente ganz ohne Wert: dann verschwindet der Euro-Betrag, die Anzahl bleibt.
    neu_starten(page)
    zufluss_add(page, "Blumen")
    zufluss_add(page, "Zum Essen eingeladen")
    zahlen = page.locator(".zufluss-gross").all_inner_texts()
    pruefe("ohne Werte keine Null-Summe", [norm(t) for t in zahlen], ["2 ×"])

    # Ein Stand aus der Zeit vor dieser Karte darf weder abstuerzen noch etwas erfinden.
    page.evaluate("""
      localStorage.setItem("girlmath.v1", JSON.stringify({
        version: 3,
        einstellungen: { wochenstunden: 40 },
        currentMonth: { id: "2026-05", startBalance: 100, income: [{ label: "Gehalt", amount: 900 }] },
        archive: [{ id: "2026-04", summary: { gehalt: 900, quoteNicht: 10 }, snapshot: { id: "2026-04" } }],
        onboardingGesehen: true
      }));
    """)
    page.reload()
    pruefe("alter Stand laedt", page.evaluate("STATE.currentMonth.income.length"), 1)
    pruefe("und bekommt eine leere Liste", page.evaluate("STATE.currentMonth.zufluesse.length"), 0)
    pruefe("Archiv ohne die Felder ergibt keine Jahreszeile",
           page.evaluate("zuflussJahre().length"), 0)
    pruefe("die Karte zeigt wieder die Einladung", page.locator(".zufluss-leer").count(), 1)

    print("\n=== 32. Einzahl und Mehrzahl: die Falle ist immer die 1 ===")
    neu_starten(page)
    page.evaluate("""() => {
      STATE.currentMonth.income = [{id:"i",label:"Gehalt",amount:2000,gearbeitet:true}];
      STATE.currentMonth.fixkosten = [{id:"f",label:"Miete",amount:800,rhythmus:"monatlich",faellig:7}];
      STATE.currentMonth.abos = [{id:"a",label:"Netflix",amount:20,notwendig:false,rhythmus:"monatlich",faellig:7}];
      STATE.currentMonth.luxus = [{id:"l",label:"Sushi",amount:30}];
      speichern(); render();
    }""")
    pruefe("ein Eintrag, keine Einträge",
           page.locator(f'{karte("luxus")} .karte-anzahl').inner_text(), "1 Eintrag")
    pruefe("ein Vertrag, keine Verträge",
           "für einen Vertrag, den du" in norm(page.locator(".vertrag-fazit").inner_text()), True)

    # Rangliste zeigt drei Plaetze, der Rest wird gezaehlt.
    for anzahl, erwartet in ((4, "… und eine weitere."), (5, "… und 2 weitere.")):
        page.evaluate(f"""() => {{
          STATE.currentMonth.abos = [];
          STATE.currentMonth.luxus = Array.from({{length:{anzahl}}}, (_, i) =>
            ({{ id:"x"+i, label:"Sache"+i, amount: 50 - i }}));
          speichern(); render();
        }}""")
        pruefe(f"Rest bei {anzahl} Ausnahmen", page.locator(".rang-rest").inner_text(), erwartet)

    # Beim Sofort-Einwurf zaehlt die App mit, auch da lauert die 1.
    pruefe("eine Ausnahme im Einwurf",
           page.evaluate('ZAEHL_SPRUECHE[1](1, {label:"Sushi", amount:18})'),
           "Notiert. Sushi, 18,00 €. Macht 1 Ausnahme bisher. Kein Kommentar.")
    pruefe("mehrere Ausnahmen im Einwurf",
           page.evaluate('ZAEHL_SPRUECHE[3](4, {label:"Sushi", amount:18})'),
           "4 Ausnahmen. Du weißt, dass ich das aufschreibe, ja?")

    # Und im Sparziel: ein Monat gegen mehrere.
    pruefe("ein Monat spaeter",
           page.evaluate("""zielMassstab(100, {aktiv:true, geschafft:false, rate:100,
                             betrag:2000, label:"Lissabon"})"""),
           "1 Monat später: Lissabon")
    pruefe("mehrere Monate spaeter",
           page.evaluate("""zielMassstab(300, {aktiv:true, geschafft:false, rate:100,
                             betrag:2000, label:"Lissabon"})"""),
           "3 Monate später: Lissabon")

    print("\n=== 33. Der Vergleich bleibt deutsch, egal wie die Rechnung heisst ===")
    # Du tippst den Namen selbst ein, und deutsche Grammatik haengt am
    # Geschlecht des Wortes: „28% deiner Miete" stimmt, „28% deiner Strom" nicht.
    grammatik = page.evaluate("""() => {
      const proben = ["Miete", "Wohnung", "Strom", "Kredit", "Auto", "Leasing Nr. 2"];
      return proben.map(n => n + " -> " + mietenText(220, { label: n, betrag: 780 }));
    }""")
    for zeile in grammatik:
        print("   ", zeile)
    pruefe("bekannte weibliche Namen kurz",
           page.evaluate('mietenText(220, {label:"Miete", betrag:780})'), "28% deiner Miete")
    pruefe("alles andere ueber „Rechnung fuer“",
           page.evaluate('mietenText(220, {label:"Strom", betrag:780})'),
           "28% deiner Rechnung für Strom")
    pruefe("auch beim Vielfachen",
           page.evaluate('mietenText(900, {label:"Auto", betrag:780})'),
           "1,2× deine Rechnung für Auto")
    # Der „zweite Miete"-Spruch braucht ein weibliches Wort und faellt sonst aus.
    pruefe("Spruch faellt aus, wenn er nicht passt",
           page.evaluate("""VERDIKTE[2].sprueche[2]({
             fix: { label: "Strom", betrag: 780 }, summe: 560 })"""), False)

    print("\n=== 34. Banner sagt denselben Vergleich nur einmal ===")
    # Sprueche bekommen dieselben Zahlen wie die Zeile darunter. Nennt ein Spruch
    # den Massstab schon, muss die Zeile schweigen — sonst stand da zweimal
    # "2,0x deine Fixkosten" untereinander.
    neu_starten(page)
    add(page, "income", "Buergergeld", 600)     # ohne Haken: kein Arbeitseinkommen
    add(page, "fixkosten", "Miete", 78)
    for quote, betrag in (("33%", 200), ("60%", 360)):
        page.evaluate(f"""
          STATE.currentMonth.luxus = [{{ id: "x", label: "Sushi", amount: {betrag} }}];
          speichern();
        """)
        doppelt = []
        for nr in range(1, 13):
            page.evaluate(f'STATE.currentMonth.id = "2026-{nr:02d}"; render();')
            banner = page.locator(".verdikt").inner_text()
            mass = page.evaluate(
                "(() => { const z = rechne(STATE.currentMonth);"
                "  return mietenText(z.nichtUmlage, z.notwendige[0]); })()")
            if mass and banner.count(mass) > 1:
                doppelt.append(f"Monat {nr}: {mass!r}")
        pruefe(f"bei {quote} kein doppelter Vergleich", doppelt, [])

    browser.close()

server.terminate()
print("\n" + ("=" * 52))
if fehler:
    print(f"❌ {len(fehler)} Problem(e):")
    for f in fehler:
        print("   -", f)
    sys.exit(1)
print("✅ Alle Tests bestanden.")
