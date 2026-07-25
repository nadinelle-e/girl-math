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

1. **Einnahmen** eintragen (dein Gehalt).
2. **Notwendige Ausgaben** (Miete, Strom …).
3. **Abos** — bei jedem Abo den Schalter „notwendig?" setzen: Zugticket = ja,
   Netflix = nein.
4. **Einkauf** in Lebensmittel (notwendig) und Luxus & Snacks (nicht notwendig).
5. **Konsum** (Klamotten & alles nicht Lebensnotwendige).
6. **Sparen** (was du zur Seite legst).
7. **Kontostand**: Startguthaben eintragen, den aktuellen Stand rechnet die App.

Oben siehst du live dein Konsumopfer-Verdikt. Am Monatsende auf **„Monat
abschließen"** — der Monat wandert ins Archiv, und der neue Monat startet schon
mit deinen Fixkosten und Abos vorbefüllt.

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
| `styles.css`  | Aussehen (der freche, direkte Look)                         |
| `app.js`      | Logik: Eingaben, Rechnen, Konsumopfer-Score, Speichern      |

Die frechen Sprüche der Konsumopfer-Skala stehen oben in `app.js` in der Liste
`VERDIKTE` — die darfst du jederzeit nach deinem Geschmack umschreiben.
