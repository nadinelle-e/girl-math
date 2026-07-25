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
    pruefe("Anzahl im Kopf", k.locator(".karte-anzahl").inner_text(), "1 Posten")
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
    browser.close()

server.terminate()
print("\n" + ("=" * 52))
if fehler:
    print(f"❌ {len(fehler)} Problem(e):")
    for f in fehler:
        print("   -", f)
    sys.exit(1)
print("✅ Alle Tests bestanden.")
