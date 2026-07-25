# girl math 💸

Dein konfrontativer Finanzplaner. Trag deine Einnahmen und Ausgaben ein — am
Ende rechnet die App gnadenlos aus, welcher Anteil deines Gehalts ins Unnötige
geflossen ist, und sagt dir direkt ins Gesicht, ob du gerade Spar-Königin oder
Konsumopfer bist.

Keine Anmeldung, kein Server, keine Kosten. **Deine Zahlen bleiben nur in deinem
Browser** (localStorage) — niemand sonst sieht sie.

## Starten (auf deinem Rechner)

Einfach die Datei `index.html` doppelklicken. Sie öffnet sich im Browser und
läuft sofort — es muss nichts installiert werden.

## Bedienen

Beim ersten Besuch erklärt dir ein kurzes Fenster den Ablauf. Später kommst du
über das **?** oben rechts jederzeit wieder dran.

1. **Einnahmen** eintragen (dein Gehalt). Ohne Gehalt gibt die App kein Urteil ab.
2. **Fixkosten** (Miete, Strom …).
3. **Abos** — bei jedem den Schalter „notwendig?" setzen: Zugticket = ja,
   Netflix = nein.
4. **Versicherungen** — genauso mit „notwendig?"-Schalter, damit du siehst,
   was davon wirklich sein muss.
5. **Einkauf** in Lebensmittel (notwendig) und Ausnahmen (Sushi, Snacks).
6. **Große Ausnahmen** (Klamotten & alles nicht Lebensnotwendige).
7. **Sparen** (was du zur Seite legst).
8. **Kontostand**: Startguthaben eintragen, den aktuellen Stand rechnet die App.

Oben siehst du live dein Konsumopfer-Verdikt, darunter ein Kreisdiagramm mit der
Aufteilung deines Geldes. Am Monatsende auf **„Monat abschließen"** — der Monat
wandert ins Archiv, und der neue Monat startet schon vorbefüllt.

## Was du nur einmal eintippst

Fixkosten, Abos und Versicherungen sind **wiederkehrend**: Sie wandern beim
Monatswechsel automatisch mit, inklusive Betrag und Rhythmus. Was weg soll,
löschst du einfach mit dem ✕.

Bei jedem dieser Posten stellst du den **Rhythmus** ein — monatlich, alle
3 Monate, alle 6 Monate oder einmal im Jahr. Bei allem, was nicht monatlich
läuft, wählst du zusätzlich den Monat der Fälligkeit. Daraus macht die App zwei
Dinge:

- **Umlage:** Eine Jahresversicherung über 360 € zählt in der Übersicht als
  30 €/Monat. So verzerrt ein einzelner Oktober deine Prozente nicht.
- **Warnung:** Läuft der volle Betrag diesen Monat wirklich ab, steht das in
  einer eigenen Karte — und zwei Monate vorher warnt dich die App schon mal vor.

Der **Kontostand** rechnet dagegen immer mit dem echten Geld, denn deine Bank
legt nichts um. Weichen beide Zahlen voneinander ab, sagt die App das dazu.

Mit **Sichern (Export)** lädst du deinen Stand als Datei herunter (Backup oder
Umzug auf ein anderes Gerät), mit **Laden (Import)** spielst du sie zurück.

## Online stellen (damit eine Freundin es auch nutzen kann)

Über GitHub Pages:

```bash
cd ~/girl-math
git init
git add .
git commit -m "girl math: erste Version"
gh repo create girl-math --public --source=. --push
```

Danach im Repo unter **Settings → Pages** die Quelle auf den `main`-Branch
stellen. Nach ein paar Minuten gibt es eine URL wie
`https://<dein-name>.github.io/girl-math/` — die kannst du teilen. Jede Person
hat ihre eigenen, privaten Daten im eigenen Browser. Im Repo liegt nur das
Programm, niemals deine Zahlen.

## Aufbau des Codes

| Datei         | Zweck                                                        |
|---------------|-------------------------------------------------------------|
| `index.html`  | Aufbau der Seite (welche Bereiche es gibt)                   |
| `styles.css`  | Aussehen (Pink & Grün auf Perlweiß, alles Dunkle in Warmbraun) |
| `app.js`      | Logik: Eingaben, Rechnen, Konsumopfer-Score, Speichern      |

Die Sprüche stehen oben in `app.js` in der Liste `VERDIKTE` — pro Stufe mehrere,
damit sich der Witz nicht jeden Monat wiederholt. Welcher kommt, hängt am Monat.
Schreib sie jederzeit nach deinem Geschmack um.

Die Kategorien stehen direkt darüber in `KATEGORIEN`. Eine neue Kategorie ist
eine neue Zeile in dieser Liste, mehr braucht es nicht.

Alte gespeicherte Stände werden beim Laden automatisch auf die aktuelle Struktur
gehoben (`migriere` in `app.js`) — auch Backup-Dateien aus der ersten Version
lassen sich noch importieren.
