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


def auf(page, kat):
    """Die Karte dieser Kategorie aufklappen und ihren Selektor zurueckgeben.

    Immer nur EINE Kategorie ist offen. Wer in einer Karte etwas pruefen oder
    bedienen will, klappt sie vorher auf — genau wie eine Nutzerin.
    """
    el = page.locator(f'details[data-kat="{kat}"]')
    if el.count() and el.get_attribute("open") is None:
        el.locator("summary").click()
    return f'.karte:has(form[data-add="{kat}"])'


def add(page, kat, label, betrag, rhythmus=None, faellig=None, haken=None):
    """Traegt einen Posten ueber das Formular der Kategorie ein.

    `haken` bedient das Kategorie-Haekchen: bei Abos und Versicherungen
    „notwendig?", bei den Einnahmen „dafuer gearbeitet?".
    """
    auf(page, kat)   # ihr Formular ist nur in der offenen Karte sichtbar
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


def oeffne(posten):
    """Den Posten antippen.

    Haekchen und Pausieren-Knopf erscheinen nur an dem Posten, den man
    gerade bearbeitet — sonst waeren es bei acht Abos sechzehn Bedien-
    elemente auf einem Schirm.
    """
    posten.locator('input[data-field="label"]').click()
    return posten


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

    # Die Euro-Betraege stehen genau EINMAL, in der Kontostand-Karte, und zwar
    # als echte Abbuchung: 800 + 58 + 300 + 360 (volle Kfz-Rechnung) = 1.518.
    konto = page.locator(".konto-karte .konto-rechnung").inner_text()
    print("  Kontostand-Karte:", konto.replace("\n", " "))
    pruefe("Notwendig echt 1.518", "1.518,00" in konto, True)
    pruefe("Ausnahmen 370", "370,00" in konto, True)

    # Die Uebersicht wiederholt diese Betraege NICHT mehr. Zwei Tabellen mit
    # denselben Zeilen und zwei verschiedenen Endsummen las niemand als zwei
    # Aussagen — man las sie als Widerspruch.
    pruefe("Uebersicht ohne zweite Tabelle",
           page.locator(".uebersicht-karte .zahlenzeile").count(), 0)
    pruefe("Uebersicht ohne Erklaer-Fussnote",
           page.locator(".uebersicht-karte .zahlen-fussnote").count(), 0)
    # Und die Kontostand-Karte muss den Unterschied nicht mehr wegerklaeren.
    pruefe("Keine Umlage-Erklaerung mehr in der Kontostand-Karte",
           "verteilt Jahresrechnungen" in page.locator(".konto-karte").inner_text(), False)

    print("\n=== 5. Prozente UND Kontostand, aber jede Zahl nur an EINER Stelle ===")
    # Dieser Monat ist der Beweisfall: 19% Ausnahmen (also unter der Marke),
    # aber durch die volle Kfz-Rechnung steht das Konto bei -88 EUR. Frueher
    # erfuhr man vom Minus erst nach dreimal Scrollen.
    #
    # Die Loesung ist NICHT, das Banner rot einzurahmen und einen zweiten Kasten
    # hineinzuschreiben — das war zu viel auf einmal und wurde deshalb gar nicht
    # gelesen. Das Banner urteilt weiter nur ueber die Ausnahmen; der Kontostand
    # steht in der Leiste oben, die beim Scrollen immer sichtbar bleibt.
    pruefe("Banner bleibt schlicht: kein Einwand-Kasten",
           page.locator(".verdikt-minus").count(), 0)
    pruefe("Banner bleibt schlicht: kein roter Rahmen",
           page.locator(".verdikt.im-minus").count(), 0)
    pruefe("Banner hat genau drei Zeilen (Prozent, Spruch, Zeit)",
           page.locator(".verdikt > p").count(), 3)

    # Die Leiste oben traegt beide Zahlen und wird rot.
    pruefe("Leiste oben im Minus", page.locator(".stand-leiste.im-minus").count(), 1)
    pruefe("Leiste zeigt den Kontostand",
           norm(page.locator(".stand-zahl").inner_text()), "-88,00 €")
    pruefe("Leiste zeigt auch die Prozente",
           "19 % Ausnahmen" in page.locator(".stand-chips").inner_text(), True)

    # Gegenprobe: Startguthaben rauf, Konto im Plus -> Leiste wieder ruhig.
    setze(page, "#start-guthaben", 500)
    pruefe("Leiste nicht mehr rot", page.locator(".stand-leiste.im-minus").count(), 0)
    pruefe("Banner unveraendert schlicht", page.locator(".verdikt-minus").count(), 0)
    setze(page, "#start-guthaben", 0)

    print("\n=== 6. Lebenszeit aus Arbeitseinkommen ===")
    # 2000 EUR / (40 h * 4,3333 Wochen) = 11,54 EUR pro Stunde
    pruefe("Stundenlohn ausgewiesen",
           norm(page.locator(f'{auf(page, "income")} .umlage-hinweis').inner_text()),
           "≈ 11,54 € pro Stunde")
    # 150 EUR Klamotten / 11,54 = 13 h
    pruefe("Zeit-Schild an der Ausnahme",
           page.locator(f'{auf(page, "konsum")} .zeit-schild').inner_text(), "⏱ 13 h Arbeit")
    pruefe("kein Schild bei Lebensmitteln",
           page.locator(f'{auf(page, "lebensmittel")} .zeit-schild').count(), 0)
    pruefe("Schild bei Netflix (nicht notwendig)",
           page.locator(f'{auf(page, "abos")} .zeit-schild').count(), 1)
    auf(page, "income"); setze(page, "#wochenstunden", 20)
    pruefe("Stundenlohn folgt den Wochenstunden",
           norm(page.locator(f'{auf(page, "income")} .umlage-hinweis').inner_text()),
           "≈ 23,08 € pro Stunde")
    auf(page, "income"); setze(page, "#wochenstunden", 40)

    print("\n=== 7. Rangliste der teuersten Ausnahmen ===")
    pruefe("drei Plaetze", page.locator(".rang-zeile").count(), 3)
    pruefe("Platz 1 ist Sushi",
           page.locator(".rang-zeile").first.locator(".rang-name").inner_text(), "Sushi")

    print("\n=== 8. Nicht-monatliche Posten: Rhythmus, Umlage, Warnung ===")
    pruefe("keine Rhythmus-Auswahl in den Zeilen", page.locator(".posten select").count(), 0)
    pruefe("Miete ohne Schild",
           page.locator(f'{auf(page, "fixkosten")} .rhythmus-schild').count(), 0)
    pruefe("Kfz zeigt Rhythmus und Monat",
           page.locator(f'{auf(page, "versicherungen")} .rhythmus-schild').inner_text(),
           "einmal im Jahr · ab Jul")
    # Achtung: .umlage-hinweis traegt auch der Stundenlohn oben — deshalb
    # gezielt in der Versicherungs-Karte nachsehen.
    pruefe("Umlage-Hinweis 30 EUR/Monat",
           "30,00 € im Monat" in norm(
               page.locator(f'{auf(page, "versicherungen")} .umlage-hinweis').inner_text()), True)
    # Die Erinnerung reicht: der Posten ist DIESEN Monat dran, mit vollem Betrag.
    pruefe("Warnung 'geht diesen Monat ab'", page.locator(".faellig-karte.jetzt").count(), 1)
    jetzt = norm(page.locator(".faellig-karte.jetzt").inner_text())
    pruefe("Warnung nennt den Posten", "Kfz-Versicherung" in jetzt, True)
    pruefe("Warnung nennt den vollen Betrag", "360,00 €" in jetzt, True)
    # Kein Rücklagen-Auftrag mehr. Fuer 30 Euro im Monat legt niemand Geld
    # auf ein zweites Konto — die Erinnerung oben tut denselben Dienst.
    pruefe("keine Ruecklagen-Karte", page.locator(".ruecklage-karte").count(), 0)

    print("\n=== 9. Kontostand rechnet mit echtem Geld — und zeigt die Rechnung ===")
    # real = 800 + 58 + 300 + 360 (Kfz voll!) + 370 = 1888 | 2000 - 1888 - 200 = -88
    ergebnis = page.locator(".konto-zeile.ergebnis")
    pruefe("Kontostand", norm(ergebnis.locator(".konto-betrag").inner_text()), "-88,00 €")
    pruefe("Ergebniszeile als negativ markiert",
           page.locator(".konto-zeile.ergebnis.negativ").count(), 1)
    pruefe("Feld klar beschriftet",
           page.locator(".konto-block .beschriftung").first.inner_text().lower(),
           "kontostand zu beginn dieses monats")

    # Die Aufschluesselung macht die Rechnung nachvollziehbar: sechs Zeilen,
    # und die Summe der fuenf oberen ergibt die sechste. Genau daran haette
    # man frueher gesehen, welche Zahl nicht stimmt, statt nur das Ergebnis.
    zeilen = [norm(t).replace("\n", " ") for t in page.locator(".konto-zeile").all_inner_texts()]
    print("  Aufschluesselung:", zeilen)
    pruefe("sechs Zeilen (Start, Einnahmen, notwendig, Ausnahmen, Sparen, Ergebnis)",
           len(zeilen), 6)
    pruefe("Einnahmen-Zeile", any("2.000,00 €" in z for z in zeilen), True)
    pruefe("notwendige Ausgaben real (mit voller Kfz)",
           any("1.518,00 €" in z for z in zeilen), True)
    pruefe("Ausnahmen-Zeile", any("370,00 €" in z for z in zeilen), True)
    pruefe("Sparen-Zeile", any("200,00 €" in z for z in zeilen), True)

    # Die Vorschau-Erklaerung: ohne sie vergleicht man die Zahl mit der
    # Banking-App und haelt die Abweichung fuer einen Rechenfehler.
    fuss = " ".join(page.locator(".konto-fussnote").all_inner_texts())
    pruefe("Vorschau wird erklaert", "Vorschau" in fuss, True)
    # Die zweite Fussnote ist weg: Sie erklaerte den Unterschied zu einer
    # Umlage-Tabelle, die es nicht mehr gibt.
    pruefe("kein Umlage-Vergleich mehr", "1.888,00" in norm(fuss), False)

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

    print("\n=== 14. Karten ein- und ausklappen: immer nur EINE offen ===")
    k = page.locator('details[data-kat="luxus"]')
    pruefe("acht Klappkarten", page.locator("details[data-kat]").count(), 8)
    # Zugeklappt ist der Normalzustand: Man bearbeitet immer nur eine Kategorie,
    # also steht hoechstens eine Karte offen.
    pruefe("hoechstens eine Karte offen",
           page.locator("details[data-kat][open]").count() <= 1, True)
    # „Posten" ist Buchhalter-Sprache und steht nirgends mehr in der Oberflaeche.
    pruefe("Anzahl im Kopf", k.locator(".karte-anzahl").inner_text(), "1 Eintrag")
    pruefe("das Wort Posten kommt nirgends vor",
           "Posten" in page.locator(".wrap").inner_text(), False)
    pruefe("Summe bleibt sichtbar", k.locator(".karte-summe").is_visible(), True)
    pruefe("Inhalt verborgen", k.locator(".posten-liste").is_visible(), False)

    k.locator("summary").click()
    pruefe("aufgeklappt", k.get_attribute("open") is not None, True)
    pruefe("Inhalt sichtbar", k.locator(".posten-liste").is_visible(), True)

    # Die naechste Karte oeffnen laesst die vorige von allein zuklappen.
    page.locator('details[data-kat="abos"] summary').click()
    page.wait_for_timeout(200)   # das toggle-Ereignis wird asynchron zugestellt
    pruefe("die vorige klappt von allein zu", k.get_attribute("open") is None, True)
    pruefe("und nur eine ist offen",
           page.locator("details[data-kat][open]").count(), 1)

    page.reload()
    page.wait_for_selector(".verdikt")
    pruefe("die offene bleibt nach dem Neuladen offen",
           page.locator('details[data-kat="abos"]').get_attribute("open") is not None, True)
    pruefe("und die anderen bleiben zu",
           page.locator("details[data-kat][open]").count(), 1)
    page.locator('details[data-kat="abos"] summary').click()

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
    pruefe("Fixkosten mitgenommen", page.locator(f'{auf(page, "fixkosten")} .posten').count(), 1)
    pruefe("Abos mitgenommen", page.locator(f'{auf(page, "abos")} .posten').count(), 2)
    pruefe("Versicherung mitgenommen", page.locator(f'{auf(page, "versicherungen")} .posten').count(), 1)
    pruefe("Ausnahmen NICHT mitgenommen", page.locator(f'{auf(page, "luxus")} .posten').count(), 0)
    pruefe("Einnahmen NICHT mitgenommen", page.locator(f'{auf(page, "income")} .posten').count(), 0)
    pruefe("Rhythmus mitgenommen",
           page.locator(f'{auf(page, "versicherungen")} .rhythmus-schild').inner_text(),
           "einmal im Jahr · ab Jul")
    zusammenfassung = page.evaluate("JSON.stringify(STATE.archive[0].summary)")
    pruefe("Archiv-Zusammenfassung ist gefuellt", "quoteNicht" in zusammenfassung, True)
    pruefe("Serie laeuft", page.locator(".serie-laeuft").count(), 1)
    # Die Flamme zaehlt Monate, keine Anteile. Ein Prozentzeichen an dieser
    # Stelle wuerde die Serie in dieselbe Sprache zurueckziehen, aus der sie
    # gerade herausgeholt wurde.
    serien_text = page.locator(".serie-laeuft").inner_text()
    print("  Serie:", serien_text)
    pruefe("Serie nennt Monate", "1 Monat" in serien_text, True)
    pruefe("Serie kommt ohne Prozente aus", "%" in serien_text, False)
    pruefe("Archiv zeigt: unter der Marke", page.locator(".ziel-marke.gut").count(), 1)

    print("\n=== 17. Serie reisst, leerer Monat wird nicht bewertet ===")
    pruefe("neuer Monat urteilt noch nicht", page.locator(".verdikt.v-neutral").count(), 1)
    add(page, "income", "Gehalt", 2000, haken=True)
    add(page, "luxus", "Wein", 900)   # 900/2000 = 45% > 30%
    # Gemeldet wird das im Banner und in der Leiste. Die alte Ziel-Karte, die
    # dasselbe ein drittes Mal sagte, gibt es nicht mehr.
    chips = page.locator(".stand-chips").inner_text()
    print("  Leiste:", chips.replace("\n", " "))
    pruefe("ueber der Marke gemeldet", page.locator(".stand-chip.chip-warn").count(), 1)
    pruefe("keine Ziel-Karte mehr", page.locator(".ziel-karte").count(), 0)
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
           page.locator(f'{auf(page, "income")} .umlage-hinweis').count(), 0)
    pruefe("App erklaert das",
           "keinen Stundenlohn" in page.locator(".zeit-zeile").inner_text(), True)
    # Statt erfundener Arbeitsstunden vergleicht die App mit der groessten
    # Rechnung (meist der Miete) — aber erst, wenn der Vergleich etwas sagt.
    # 55 EUR Ausnahmen gegen 400 EUR Miete waeren „14% deiner Miete" gewesen:
    # eine dritte Prozentzahl unter zwei anderen, mit einer dritten Bezugsgroesse.
    pruefe("kein Prozent-Vergleich unter einer ganzen Miete",
           page.locator(".verdikt-zeit").count(), 0)
    pruefe("erst recht keine Arbeitszeit behauptet",
           "gearbeitet" in page.locator(".verdikt").inner_text(), False)
    # Steigen die Ausnahmen ueber die Miete, meldet sich der Vergleich wieder —
    # dann aber als Vielfaches, und das versteht man ohne Nachrechnen.
    # (Der Vielfachen-Fall selbst steht in Abschnitt 33.)
    # 863 rein, 400 Miete + 55 Ausnahmen raus = 408
    pruefe("Kontostand rechnet trotzdem",
           norm(page.locator(".konto-zeile.ergebnis .konto-betrag").inner_text()), "408,00 €")

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
           norm(page.locator(f'{auf(page, "income")} .umlage-hinweis').inner_text()),
           "≈ 2,88 € pro Stunde")
    pruefe("Grundlage wird genannt",
           "500,00" in norm(page.locator(f'{auf(page, "income")} .feld-hinweis').inner_text()), True)
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

    print("\n=== 25. Mehrere grosse Brocken im selben Monat ===")
    neu_starten(page)
    # Den laufenden Monat aus der Seite holen, damit der Test in jedem Monat
    # des Jahres funktioniert und nicht nur im Juli.
    dieser_monat = page.evaluate("new Date().getMonth() + 1")
    add(page, "income", "Gehalt", 2000, haken=True)
    # Beide sind DIESEN Monat faellig: 360 + 120 = 480 gehen wirklich ab.
    add(page, "versicherungen", "Kfz", 360, rhythmus="jaehrlich",
        faellig=dieser_monat, haken=True)
    add(page, "abos", "Fitness", 120, rhythmus="vierteljaehrlich",
        faellig=dieser_monat, haken=False)
    jetzt = norm(page.locator(".faellig-karte.jetzt").inner_text())
    pruefe("beide Posten stehen in der Warnung",
           "Kfz" in jetzt and "Fitness" in jetzt, True)
    pruefe("volle Betraege, nicht die Monatsanteile",
           "360,00 €" in jetzt and "120,00 €" in jetzt, True)
    pruefe("Summe der echten Abbuchungen", "480,00 €" in jetzt, True)
    pruefe("kein Ruecklagen-Auftrag mehr", page.locator(".ruecklage-karte").count(), 0)
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
           page.locator(f'{auf(page, "sparen")} .schalter').count(), 0)

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
           page.locator(f'{auf(page, "sparen")} .posten .schalter').count(), 1)

    # 200 EUR fuers Ziel weglegen — der Posten wandert damit aus dem Notgroschen raus.
    add(page, "sparen", "Reisekasse", 200)
    oeffne(page.locator(f'{auf(page, "sparen")} .posten:has(input[value="Reisekasse"])'))
    page.locator(f'{auf(page, "sparen")} .posten:has(input[value="Reisekasse"]) .schalter input').click()
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
           page.locator(f'{auf(page, "luxus")} .ziel-schild').inner_text().strip(),
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
           page.locator(f'{auf(page, "sparen")} .schalter').count(), 0)

    print("\n=== 28. Jedes Haekchen startet leer ===")
    neu_starten(page)
    # Kein Haekchen setzt sich von allein — weder im Formular noch am neuen Posten.
    for kat in ("income", "abos", "versicherungen"):
        pruefe(f"{kat}: Formular-Haekchen leer",
               page.locator(f'form[data-add="{kat}"] [data-add-schalter]').is_checked(), False)
        add(page, kat, "Testposten", 100)
        pruefe(f"{kat}: neuer Posten ohne Haken",
               page.locator(f'{auf(page, kat)} .posten input[type="checkbox"]').is_checked(), False)

    # Ohne Haken kein Arbeitseinkommen: die App rechnet keinen Stundenlohn,
    # statt einen zu erfinden, den niemand bestaetigt hat.
    pruefe("kein Stundenlohn ohne Haken", page.locator("#wochenstunden").count(), 0)
    oeffne(page.locator(f'{auf(page, "income")} .posten'))
    page.locator(f'{auf(page, "income")} .posten input[type="checkbox"]').click()
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
    oeffne(page.locator(f'{auf(page, "sparen")} .posten:has(input[value="Rücklage"])'))
    page.locator(f'{auf(page, "sparen")} .posten:has(input[value="Rücklage"]) .schalter input').click()
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
           page.locator(f'{auf(page, "luxus")} .karte-anzahl').inner_text(), "1 Eintrag")
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
    # Geschlecht des Wortes: „2,0× deine Miete" stimmt, „2,0× deine Strom" nicht.
    grammatik = page.evaluate("""() => {
      const proben = ["Miete", "Wohnung", "Strom", "Kredit", "Auto", "Leasing Nr. 2"];
      return proben.map(n => n + " -> " + mietenText(1560, { label: n, betrag: 780 }));
    }""")
    for zeile in grammatik:
        print("   ", zeile)
    pruefe("bekannte weibliche Namen kurz",
           page.evaluate('mietenText(1560, {label:"Miete", betrag:780})'), "2,0× deine Miete")
    pruefe("alles andere ueber „Rechnung fuer“",
           page.evaluate('mietenText(1560, {label:"Strom", betrag:780})'),
           "2,0× deine Rechnung für Strom")
    pruefe("auch beim krummen Vielfachen",
           page.evaluate('mietenText(900, {label:"Auto", betrag:780})'),
           "1,2× deine Rechnung für Auto")
    # Unterhalb einer ganzen Miete schweigt der Vergleich. Frueher stand hier
    # „28% deiner Miete" — direkt unter der Prozentzahl des Banners, die den
    # Anteil am Gehalt misst. Zwei Prozentzeichen, zwei Bezugsgroessen.
    pruefe("unter einer ganzen Miete kein Prozent-Vergleich",
           page.evaluate('mietenText(220, {label:"Miete", betrag:780})'), "")
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

    print("\n=== 35. Pause: was ruht, zaehlt in KEINER Zahl mit ===")
    neu_starten(page)
    add(page, "income", "Gehalt", 2000, haken=True)
    add(page, "fixkosten", "Miete", 800, rhythmus="monatlich")
    add(page, "abos", "Gym", 40, rhythmus="monatlich", haken=False)
    add(page, "abos", "Netflix", 20, rhythmus="monatlich", haken=False)

    def posten_von(kat, label):
        return page.locator(f'{auf(page, kat)} .posten:has(input[value="{label}"])')

    gym = posten_von("abos", "Gym")
    # Vorher: Ausnahmen 40 + 20 = 60 -> 3% | Kontostand 2000 - 800 - 60 = 1140
    pruefe("vor der Pause: 3% Ausnahmen",
           page.locator(".verdikt .prozent").inner_text().split("%")[0], "3")
    pruefe("vor der Pause: Kontostand 1.140",
           norm(page.locator(".konto-zeile.ergebnis .konto-betrag").inner_text()), "1.140,00 €")
    pruefe("Gym steht im Kuendigungs-Blick",
           any("Gym" in n for n in page.locator(".vertrag-name").all_inner_texts()), True)

    oeffne(gym).locator("[data-pause-an]").click()

    # Nachher: nur noch Netflix zaehlt -> 20/2000 = 1% | 2000 - 800 - 20 = 1180
    pruefe("Posten sichtbar als pausiert", gym.locator(".pause-schild").count(), 1)
    pruefe("Zeile als pausiert markiert",
           page.locator(f'{auf(page, "abos")} .posten-pausiert').count(), 1)
    # Schild und Auswahl sind EIN Element: „⏸ pausiert bis [Jul]". Der Monat
    # steht genau einmal da, und ohne Jahreszahl — die Auswahl reicht ohnehin
    # nur bis Dezember dieses Jahres.
    pruefe("Schild sagt den Monat nicht ein zweites Mal",
           norm(gym.locator(".pause-schild").inner_text()).split("\n")[0],
           "⏸ pausiert bis")
    pruefe("Pause laeuft bis zum laufenden Monat",
           gym.locator("[data-pause-bis]").input_value(), "2026-07")
    pruefe("Auswahl ohne Jahreszahl",
           gym.locator("[data-pause-bis] option").first.inner_text(), "Jul")
    pruefe("Auswahl endet im Dezember",
           gym.locator("[data-pause-bis] option").count(), 6)
    pruefe("nach der Pause: 1% Ausnahmen",
           page.locator(".verdikt .prozent").inner_text().split("%")[0], "1")
    pruefe("nach der Pause: Kontostand 1.180",
           norm(page.locator(".konto-zeile.ergebnis .konto-betrag").inner_text()), "1.180,00 €")
    pruefe("kein Zeitpreis an einem ruhenden Posten", gym.locator(".zeit-schild").count(), 0)
    pruefe("Gym faellt aus dem Kuendigungs-Blick",
           any("Gym" in n for n in page.locator(".vertrag-name").all_inner_texts()), False)
    # Auch der Kartenkopf zaehlt nur noch, was laeuft: 20 statt 59,90.
    pruefe("Kartenkopf zaehlt das ruhende Abo nicht mit",
           norm(page.locator(f'{auf(page, "abos")} .karte-summe').inner_text()), "20,00 €")
    pruefe("Kontostand-Karte weist die Pause aus",
           "40,00 €" in norm(page.locator(".konto-pause").inner_text()), True)
    pruefe("Pause nennt den Posten beim Namen",
           "Gym" in page.locator(".konto-pause").inner_text(), True)

    # Pause verlaengern: bis September, dann ueberlebt sie einen Monatswechsel.
    gym.locator("[data-pause-bis]").select_option("2026-09")
    pruefe("Pause bis September",
           gym.locator("[data-pause-bis]").input_value(), "2026-09")

    with page.expect_download(timeout=15000):
        page.click("#btn-monat-abschliessen")
    page.wait_for_selector(".archiv-eintrag")
    gym = posten_von("abos", "Gym")
    pruefe("Pause wandert in den August mit", gym.locator(".pause-schild").count(), 1)

    # … und endet dann von allein. Zwei Monatswechsel weiter ist Oktober.
    with page.expect_download(timeout=15000):
        page.click("#btn-monat-abschliessen")   # -> September, letzter Pausenmonat
    page.wait_for_selector(".archiv-eintrag")
    with page.expect_download(timeout=15000):
        page.click("#btn-monat-abschliessen")   # -> Oktober, Pause abgelaufen
    page.wait_for_selector(".archiv-eintrag")
    gym = posten_von("abos", "Gym")
    pruefe("abgelaufene Pause endet von allein", gym.locator(".pause-schild").count(), 0)
    pruefe("Gym laeuft wieder mit", gym.locator("[data-pause-an]").count(), 1)
    pruefe("Feld im Speicher geleert",
           page.evaluate('STATE.currentMonth.abos.find(p => p.label === "Gym").pausiertBis'), "")

    # Von Hand wieder aktivieren
    oeffne(gym).locator("[data-pause-an]").click()
    gym = posten_von("abos", "Gym")
    pruefe("wieder pausiert", gym.locator(".pause-schild").count(), 1)
    oeffne(gym).locator("[data-pause-aus]").click()
    gym = posten_von("abos", "Gym")
    pruefe("Knopf 'laeuft wieder' hebt die Pause auf", gym.locator(".pause-schild").count(), 0)

    print("\n=== 36. Gehaltszyklus: startet per Knopf, nicht per Kalender ===")
    neu_starten(page)
    pruefe("ohne Start: Einladung statt geratener Zahlen",
           page.locator(".zyklus-leer").count(), 1)
    pruefe("Knopf steht auf der leeren Karte",
           page.locator(".zyklus-leer #btn-gehalt-da").count(), 1)
    # Achtung: .stand-label wird per CSS in Grossbuchstaben gesetzt, und
    # inner_text() liefert den GERENDERTEN Text. Deshalb hier klein vergleichen.
    pruefe("ohne Start zeigt die Leiste 'Monatsende'",
           "monatsende" in page.locator(".stand-label").inner_text().lower(), True)

    # Ein Druck, und der Zyklus laeuft ab heute.
    page.click("#btn-gehalt-da")
    heute = page.evaluate("alsTagesId(new Date())")
    pruefe("Startdatum gespeichert", page.evaluate("STATE.einstellungen.zyklusStart"), heute)
    pruefe("Zyklus-Karte erscheint", page.locator(".zyklus-karte .zyklus-spur").count(), 1)
    pruefe("am Starttag ist Tag 1", page.evaluate("gehaltszyklus().tag"), 1)
    pruefe("Leiste zeigt jetzt den Zyklus-Tag",
           page.locator(".stand-chip").last.inner_text().startswith("Tag "), True)
    pruefe("Knopf bleibt fuer das naechste Gehalt stehen",
           page.locator(".zyklus-karte #btn-gehalt-da").count(), 1)

    # Die Rechnung selbst, mit festem Startdatum und festem „heute" — sonst
    # haengt der Test daran, wann er laeuft. Gestartet am 28. Juli 2026,
    # heute ist der 3. August: Tag 7 von 31, angenommenes Ende am 28. August.
    page.evaluate('STATE.einstellungen.zyklusStart = "2026-07-28"; speichern(); render();')
    zy = page.evaluate("""(() => {
      const z = gehaltszyklus(new Date(2026, 7, 3));
      return { tag: z.tag, laenge: z.laenge, rest: z.restTage,
               start: z.start.getDate(), ende: z.ende.getDate(),
               ueber: z.ueberfaellig };
    })()""")
    print("  Zyklus am 3. August:", zy)
    pruefe("Tag im Zyklus", zy["tag"], 7)
    pruefe("Zykluslaenge", zy["laenge"], 31)
    pruefe("Tage bis zum naechsten Gehalt", zy["rest"], 24)
    pruefe("Zyklus startet am gedrueckten Tag", zy["start"], 28)
    pruefe("Ende ist der gleiche Tag im Folgemonat", zy["ende"], 28)
    pruefe("nicht ueberfaellig", zy["ueber"], False)

    # Am Starttag selbst ist Tag 1 — nicht Tag 0 und nicht Tag 31.
    pruefe("am Starttag beginnt der Zyklus",
           page.evaluate("gehaltszyklus(new Date(2026, 6, 28)).tag"), 1)
    # Ein Tag vor dem angenommenen Ende: der letzte Tag des Zyklus.
    pruefe("Tag vor dem Ende ist der letzte",
           page.evaluate("gehaltszyklus(new Date(2026, 7, 27)).restTage"), 0)

    # Laeuft der Zyklus ueber, behauptet die App nichts mehr, sondern sagt es.
    ueber = page.evaluate("""(() => {
      const z = gehaltszyklus(new Date(2026, 8, 10));
      return { ueber: z.ueberfaellig, anteil: z.anteil, rest: z.restTage };
    })()""")
    print("  Zyklus am 10. September:", ueber)
    pruefe("ueberfaellig erkannt", ueber["ueber"], True)
    pruefe("Balken bleibt bei 100%", ueber["anteil"], 1)
    pruefe("keine Resttage mehr", ueber["rest"], 0)

    # Ein kaputtes oder leeres Startdatum darf nicht rechnen, sondern muss
    # zurueck auf die Einladung fallen.
    page.evaluate('STATE.einstellungen.zyklusStart = "quatsch"; speichern(); render();')
    pruefe("kaputtes Datum rechnet nicht", page.evaluate("gehaltszyklus() === null"), True)
    pruefe("kaputtes Datum zeigt die Einladung", page.locator(".zyklus-leer").count(), 1)

    # Der Tempo-Vergleich: Zeit gegen Ausnahmen-Budget.
    page.evaluate('STATE.einstellungen.zyklusStart = alsTagesId(new Date()); speichern(); render();')
    add(page, "income", "Gehalt", 2000, haken=True)
    add(page, "luxus", "Sushi", 550)   # Budget sind 30% von 2000 = 600 -> 92% weg
    tempo = page.locator(".zyklus-tempo").inner_text()
    print("  Tempo:", tempo.replace("\n", " "))
    pruefe("Tempo nennt das Ausnahmen-Budget", "92% vom Ausnahmen-Budget" in tempo, True)

    print("\n=== 37. Kontostand rundet auf ganze Cent ===")
    # Ohne Rundung schleppt der Monatswechsel Nachkommastellen weiter: Aus dem
    # errechneten Kontostand wird das neue Startguthaben, und im Eingabefeld
    # stand dann 1066,1399999999999.
    pruefe("runde() macht aus Rechen-Rauschen einen Cent-Betrag",
           page.evaluate("runde(1066.1399999999999)"), 1066.14)
    neu_starten(page)
    add(page, "income", "Gehalt", 1951.8, haken=True)
    add(page, "income", "Flohmarkt", 126.5, haken=False)
    add(page, "fixkosten", "Miete", 716, rhythmus="monatlich")
    add(page, "abos", "Prime", 8.99, rhythmus="monatlich", haken=False)
    add(page, "abos", "Kindle", 4.99, rhythmus="monatlich", haken=False)
    setze(page, "#start-guthaben", 1066.14)
    with page.expect_download(timeout=15000):
        page.click("#btn-monat-abschliessen")
    page.wait_for_selector(".archiv-eintrag")
    uebernommen = page.evaluate("STATE.currentMonth.startBalance")
    print("  uebernommenes Startguthaben:", uebernommen)
    pruefe("hoechstens zwei Nachkommastellen",
           round(uebernommen, 2) == uebernommen, True)
    # 1066,14 + 1951,80 + 126,50 − 716 − 8,99 − 4,99 = 2414,46
    pruefe("Startguthaben genau uebernommen", uebernommen, 2414.46)

    print("\n=== 38. Die Kontostand-Kette: ein Fehler bleibt korrigierbar ===")
    # Frueher schrieb jeder Monatsabschluss den Kontostand als feste Zahl in den
    # naechsten Monat. Ein falscher Startwert war damit fuer immer in jedem
    # Folgemonat drin. Jetzt wird die Kette bei jeder Anzeige neu gerechnet,
    # und eine Korrektur in der Vergangenheit zieht bis heute durch.
    neu_starten(page)

    def monat_bauen(start_anker=None, mit_miete=False):
        """Einen Monat mit 1000 Einnahmen fuellen.

        Die Miete wird nur EINMAL eingetragen: Fixkosten sind wiederkehrend und
        wandern beim Abschluss von allein in den naechsten Monat. Einnahmen tun
        das nicht, die kommen jeden Monat neu dazu.
        """
        if start_anker is not None:
            setze(page, "#start-guthaben", start_anker)
        add(page, "income", "Gehalt", 1000, haken=True)
        if mit_miete:
            add(page, "fixkosten", "Miete", 400, rhythmus="monatlich")

    def abschliessen():
        with page.expect_download(timeout=15000):
            page.click("#btn-monat-abschliessen")
        page.wait_for_selector(".archiv-eintrag")

    def kette():
        return page.evaluate("kontostandKette()")

    # --- Monat 1: der Anker. -300 im Minus, 1000 rein, 400 Miete raus.
    m1 = page.evaluate("STATE.currentMonth.id")
    monat_bauen(-300, mit_miete=True)
    pruefe("erster Monat hat ein offenes Eingabefeld",
           page.locator(".konto-block > #start-guthaben").count(), 1)
    pruefe("Monat 1 startet beim Anker", kette()[m1]["start"], -300)
    pruefe("Monat 1 endet bei 300", kette()[m1]["ende"], 300)   # -300 + 1000 - 400
    pruefe("Monat 1 ist als Anker markiert", kette()[m1]["ausAnker"], True)

    # --- Monat 2 erbt. Hier darf kein offenes Feld mehr stehen: Genau da hat
    #     man frueher den Stand aus der Banking-App eingetippt (in dem das
    #     Gehalt schon drin war) und es damit doppelt gezaehlt.
    abschliessen()
    m2 = page.evaluate("STATE.currentMonth.id")
    pruefe("geerbter Monat zeigt den Wert als Text", page.locator(".konto-geerbt").count(), 1)
    pruefe("geerbter Wert stimmt", norm(page.locator(".konto-geerbt").inner_text()), "300,00 €")
    pruefe("kein offenes Eingabefeld mehr",
           page.locator(".konto-block > #start-guthaben").count(), 0)
    pruefe("Korrektur-Weg steht bereit", page.locator(".anker-setzen #start-guthaben").count(), 1)
    herkunft = page.locator(".konto-block .feld-hinweis").first.inner_text()
    print("  Herkunft:", herkunft.replace("\n", " "))
    pruefe("Herkunft nennt den Vormonat", "Schlussstand" in herkunft, True)
    pruefe("Herkunft bleibt ein kurzer Satz", len(herkunft) < 40, True)

    monat_bauen()
    pruefe("Monat 2 startet beim Schlussstand von Monat 1", kette()[m2]["start"], 300)
    pruefe("Monat 2 endet bei 900", kette()[m2]["ende"], 900)
    pruefe("Monat 2 ist KEIN Anker", kette()[m2]["ausAnker"], False)
    pruefe("Monat 2 kennt seine Herkunft", kette()[m2]["vonMonat"], m1)

    # --- Monat 3.
    abschliessen()
    m3 = page.evaluate("STATE.currentMonth.id")
    monat_bauen()
    pruefe("Monat 3 startet bei 900", kette()[m3]["start"], 900)
    pruefe("Monat 3 endet bei 1500", kette()[m3]["ende"], 1500)

    # --- DER KERN: Monat 1 im Archiv korrigieren. -300 war falsch, es waren -500.
    #     Alles danach muss um genau 200 nach unten wandern, ohne dass man
    #     Monat 2 oder 3 anfassen muesste.
    page.evaluate("window.prompt = () => '-500'")
    page.click(f'[data-korrigieren="{m1}"]')
    k = kette()
    pruefe("Monat 1 korrigiert", k[m1]["start"], -500)
    pruefe("Korrektur erreicht Monat 1s Ende", k[m1]["ende"], 100)
    pruefe("Korrektur erreicht Monat 2", k[m2]["start"], 100)
    pruefe("Korrektur erreicht Monat 2s Ende", k[m2]["ende"], 700)
    pruefe("Korrektur erreicht Monat 3", k[m3]["start"], 700)
    pruefe("Korrektur erreicht bis heute durch", k[m3]["ende"], 1300)
    pruefe("die Anzeige zieht mit",
           norm(page.locator(".konto-geerbt").inner_text()), "700,00 €")

    # --- Ein Anker MITTEN in der Zeit: ab Monat 2 zaehlt nur noch die neue Zahl.
    page.evaluate("window.prompt = () => '1000'")
    page.click(f'[data-korrigieren="{m2}"]')
    k = kette()
    pruefe("Anker in Monat 2 sticht die Kette", k[m2]["start"], 1000)
    pruefe("Monat 1 bleibt davon unberuehrt", k[m1]["start"], -500)
    pruefe("Monat 3 rechnet ab dem neuen Anker", k[m3]["start"], 1600)
    pruefe("Anker im Archiv markiert", page.locator(".anker-marke").count() >= 1, True)

    # --- Und wieder aufloesen: leere Eingabe nimmt den Anker zurueck.
    page.evaluate("window.prompt = () => ''")
    page.click(f'[data-korrigieren="{m2}"]')
    k = kette()
    pruefe("Anker aufgeloest, Monat 2 erbt wieder", k[m2]["start"], 100)
    pruefe("Monat 3 wieder in der alten Kette", k[m3]["start"], 700)

    # --- Der laufende Monat laesst sich genauso verankern und wieder loesen.
    page.locator(".anker-setzen > summary").click()
    setze(page, ".anker-setzen #start-guthaben", 2500)
    pruefe("laufender Monat verankert", kette()[m3]["start"], 2500)
    pruefe("jetzt steht dort ein offenes Feld",
           page.locator(".konto-block > #start-guthaben").count(), 1)
    page.click("#btn-anker-weg")
    pruefe("Anker weggenommen, wieder geerbt", kette()[m3]["start"], 700)
    pruefe("und wieder als Text statt Feld", page.locator(".konto-geerbt").count(), 1)

    print("\n=== 39. Alte Staende steigen ohne Zahlensprung um ===")
    # Ein Stand aus der Zeit vor der Kette hat noch keinen Anker. Er bekommt
    # ihn beim Laden gesetzt — und die Zahl, die sie gestern gesehen hat,
    # muss dieselbe bleiben.
    alt = {
        "version": 3,
        "einstellungen": {"wochenstunden": 40},
        "currentMonth": {
            "id": "2026-08", "startBalance": 1200,
            "income": [{"id": "b1", "label": "Gehalt", "amount": 2000}],
            "fixkosten": [{"id": "b2", "label": "Miete", "amount": 800}],
            "abos": [], "versicherungen": [], "lebensmittel": [],
            "luxus": [], "konsum": [], "sparen": [],
        },
        "archive": [{
            "id": "2026-07",
            "summary": {"gehalt": 2000, "nicht": 0, "gespart": 0, "quoteNicht": 0,
                        "kontostand": 1200},
            "snapshot": {
                "id": "2026-07", "startBalance": 0,
                "income": [{"id": "c1", "label": "Gehalt", "amount": 2000}],
                "fixkosten": [{"id": "c2", "label": "Miete", "amount": 800}],
                "abos": [], "versicherungen": [], "lebensmittel": [],
                "luxus": [], "konsum": [], "sparen": [],
            },
        }],
        "onboardingGesehen": True,
    }
    page.evaluate("d => localStorage.setItem('girlmath.v1', JSON.stringify(d))", alt)
    page.reload()
    page.wait_for_selector(".verdikt")
    k = kette()
    # Juli: 0 + 2000 - 800 = 1200. Genau das stand vorher eingefroren im August.
    pruefe("aeltester Monat wird zum Anker", k["2026-07"]["ausAnker"], True)
    pruefe("Anker uebernimmt den alten Wert", k["2026-07"]["start"], 0)
    pruefe("Kette rechnet den alten Schlussstand nach", k["2026-07"]["ende"], 1200)
    pruefe("laufender Monat startet unveraendert", k["2026-08"]["start"], 1200)
    pruefe("kein Zahlensprung beim Umstieg",
           k["2026-08"]["start"], page.evaluate("STATE.currentMonth.startBalance"))
    pruefe("und der laufende Monat braucht keinen eigenen Anker",
           page.evaluate("STATE.currentMonth.anchorBalance"), None)

    # Gegenprobe: ein Stand mit LUECKENHAFTEM Archiv. Hier kaeme die Kette auf
    # eine andere Zahl — dann muss der bisherige Wert stehen bleiben.
    luecke = {
        "version": 3,
        "einstellungen": {"wochenstunden": 40},
        "currentMonth": {
            "id": "2026-08", "startBalance": 1200,
            "income": [{"id": "d1", "label": "Gehalt", "amount": 2000}],
            "fixkosten": [], "abos": [], "versicherungen": [], "lebensmittel": [],
            "luxus": [], "konsum": [], "sparen": [],
        },
        # Schnappschuss ohne jede Bewegung: die Kette wuerde hier auf 0 landen.
        "archive": [{"id": "2026-07",
                     "summary": {"gehalt": 2000, "nicht": 0, "gespart": 0,
                                 "quoteNicht": 0, "kontostand": 1200},
                     "snapshot": {"id": "2026-07"}}],
        "onboardingGesehen": True,
    }
    page.evaluate("d => localStorage.setItem('girlmath.v1', JSON.stringify(d))", luecke)
    page.reload()
    page.wait_for_selector(".verdikt")
    pruefe("bei luecken Archiv wird der laufende Monat verankert",
           page.evaluate("STATE.currentMonth.anchorBalance"), 1200)
    pruefe("die angezeigte Zahl bleibt exakt wie vorher",
           kette()["2026-08"]["start"], 1200)

    browser.close()

server.terminate()
print("\n" + ("=" * 52))
if fehler:
    print(f"❌ {len(fehler)} Problem(e):")
    for f in fehler:
        print("   -", f)
    sys.exit(1)
print("✅ Alle Tests bestanden.")
