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

1. **Einnahmen** eintragen — alles, was reinkommt: Gehalt, Bürgergeld, Kindergeld,
   Unterhalt, Geschenke, Flohmarkt. Bei jeder Einnahme steht ein Häkchen
   **„dafür gearbeitet?"**; setz es nur da, wo du wirklich Stunden geleistet hast.
   Ohne Einnahmen gibt die App kein Urteil ab.
2. **Fixkosten** (Miete, Strom …).
3. **Abos** — bei jedem den Schalter „notwendig?" setzen: Zugticket = ja,
   Netflix = nein.
4. **Versicherungen** — genauso mit „notwendig?"-Schalter, damit du siehst,
   was davon wirklich sein muss.
5. **Einkauf** in Lebensmittel (notwendig) und Ausnahmen (Sushi, Snacks).
6. **Große Ausnahmen** (Klamotten & alles nicht Lebensnotwendige).
7. **Sparen** (was du zur Seite legst).
8. **Kontostand zu Beginn des Monats** eintragen: was auf dem Konto lag, bevor
   Gehalt und Ausgaben dieses Monats kamen. Alles Weitere rechnet die App und
   zeigt die Rechnung Zeile für Zeile.
9. **„Gehalt ist da"** drücken, sobald dein Geld auf dem Konto ist — dann rechnet
   die App in deinem Takt statt im Kalender (siehe „Dein Gehaltszyklus" unten).

Oben siehst du live dein Konsumopfer-Verdikt, darunter ein Kreisdiagramm mit der
Aufteilung deines Geldes. Am Monatsende auf **„Monat abschließen"** — der Monat
wandert ins Archiv, und der neue Monat startet schon vorbefüllt.

## Zwei Zahlen, nicht eine

Ganz oben klebt eine schmale Leiste, die beim Scrollen **immer sichtbar** bleibt.
Darin stehen beide Zahlen, die zusammen erst ein Bild ergeben:

- **Der Kontostand** sagt, **ob** überhaupt noch Geld da ist.
- **Die Prozente** sagen, **wofür** es weggeht.

Keine der beiden ersetzt die andere, und genau daran ist die App vorher
gescheitert: Man konnte tadellos unter 30 % Ausnahmen liegen und trotzdem im
Minus stehen — Miete, Versicherungen und Rücklagen räumen ein Konto leer, ohne
dass eine einzige Ausnahme dabei ist. Oben stand dann ein grünes „Spar-Königin",
und vom Minus erfuhr man erst nach dreimal Scrollen.

Jetzt wird die Leiste rot, sobald der Kontostand unter null geht. Mehr passiert
nicht, und das ist Absicht: Das Banner darunter urteilt weiter **nur** über die
Ausnahmen und bleibt schlicht.

Eine Zeit lang stand der Kontostand zusätzlich im Banner, mit rotem Rahmen und
eigenem Kasten. Das war zu viel auf einmal — vier Blöcke übereinander, und man
wusste nicht, wo man anfangen soll. Wer alles gleichzeitig anschreit, wird gar
nicht mehr gelesen. Jede Zahl steht deshalb an genau einer Stelle.

**Die Kontostand-Karte zeigt die Rechnung**, nicht nur das Ergebnis:
Startwert + Einnahmen − notwendige Ausgaben − Ausnahmen − Gespartes = was bleibt.
Sieht eine Zahl komisch aus, erkennst du sofort, **welche** Zeile schuld ist,
statt eine Summe anzustarren und zu raten.

Wichtig dabei: Diese Zahl ist eine **Vorschau aufs Ende des Zeitraums**. Alles,
was diesen Monat noch abgebucht wird, ist darin schon abgezogen. Deine
Banking-App zeigt heute deshalb etwas anderes — das ist kein Fehler, sondern ein
anderer Zeitpunkt.

## Dein Gehaltszyklus

Dein Geld läuft nicht von Monatsanfang bis Monatsende, sondern **von Gehalt zu
Gehalt**. Wer am 28. sein Gehalt bekommt, hat am 3. keinen frischen Monat vor
sich, sondern ein Drittel eines längst laufenden.

Der Zyklus startet auf Ansage: Ist dein Gehalt da, drückst du **„Gehalt ist da"**,
und ab diesem Tag zählt die App. Kein eingestellter Zahltag, weil ein fester Tag
bei jeder rät, deren Geld mal am 27. und mal am 30. kommt — und lautlos falsch
rät. Ein Knopf im Monat weiß es immer. Danach zeigt dir die Karte:

- **Tag 7 von 31**, mit Balken und den Daten des Zeitraums. Die Länge ist eine
  Annahme: vom Starttag bis zum gleichen Tag im Folgemonat.
- **Noch 24 Tage** bis zum nächsten Gehalt, mit ungefährem Datum. Läuft der
  Zyklus über, weil du länger nicht gedrückt hast, sagt die Karte genau das,
  statt weiterzuzählen.
- **Den Tempo-Check:** „23 % des Zyklus rum, 61 % vom Ausnahmen-Budget weg."
  Verglichen wird bewusst nur das Ausnahmen-Budget (die 30 % aus der Regel) und
  nicht dein ganzes Geld — Miete und Versicherungen gehen am Anfang in einem
  Rutsch ab, da wäre am Tag 3 jeder Monat rot.
- **Was pro Tag noch da ist**, bis das nächste Gehalt kommt.

Hast du seit deinem letzten Gehaltseingang noch nicht abgeschlossen, erinnert
dich die Karte daran. Sie tut das nur, wenn die App es **sicher weiß** — bei
einem frischen Stand schweigt sie lieber, statt falsch zu mahnen.

## Was dich diszipliniert hält

**Ein Maßstab statt eines Preises.** Jede Ausnahme bekommt ein Schild, das den
Betrag einordnet. Welcher Maßstab, hängt davon ab, was bei dir existiert:

- **Arbeitszeit**, wenn du Wochenstunden einträgst. 150 € Klamotten sind dann
  13 Stunden deines Lebens. Der Preis steht auf dem Etikett, der Rest auf deiner Uhr.
- **Deine größte Rechnung**, wenn du kein Erwerbseinkommen hast. Meistens ist das
  die Miete. 150 € sind dann „28 % deiner Miete".

In den Stundenlohn geht **nur** ein, was du mit dem Häkchen „dafür gearbeitet?"
markiert hast. Bürgergeld, ein Geburtstagsgeschenk oder 300 € von Kleinanzeigen
sind Einnahmen, aber keine Arbeitsstunden — da erfindet die App keine falsche
Zahl, sondern vergleicht mit deiner Miete. Deine Prozente, dein Kontostand und
alles andere rechnen ohnehin mit **allen** Einnahmen.

Warum die Miete und nicht noch eine Umrechnung in Zeit: Arbeitszeit trifft, weil
du sie erlebt hast. Eine Rechnung wie „davon hättest du vier Tage gelebt"
beschreibt dagegen etwas, das nie stattgefunden hat — die Tage fehlen dir
nirgends, du hast ja trotzdem gelebt. Bei der Miete weiß dagegen jeder sofort,
was sie bedeutet, und niemand kann so tun, als wäre sie nicht real.

**Zusammenhänge statt Einzelposten.** In der Rangliste der teuersten Ausnahmen
fasst die App gleiche Bezeichnungen zusammen. Dreimal „Sushi" für 10, 20 und 15 €
steht dort als ein Eintrag: **Sushi · 3× · 45 €**. Genau da fällt auf, was einzeln
harmlos aussieht.

**Eine Marke: 30 %.** Mehr als 30 % deiner Einnahmen für Ausnahmen ist zu viel —
das ist die Zahl aus der 50/30/20-Regel, und daran misst dich die App. Oben steht
jederzeit, wo du gerade stehst. Bleibst du einen abgeschlossenen Monat lang
drunter, läuft eine **Serie**: „🔥 3 Monate in Folge im Rahmen geblieben." Die
Flamme zählt Monate und nennt bewusst keine Prozente — die Zahl misst, wie lange
du das schon hältst, nicht wie knapp. Gehst du drüber, fängt sie bei 0 an.

Zwei Dinge standen hier mal zusätzlich und sind raus. Ein selbstgesetztes Ziel:
Es startete bei genau 30 %, durfte die Regel nicht überschreiten, und maß damit
nichts, was die Regel nicht schon misst. Und eine eigene Karte, die vorrechnete,
wie viele Euro bis zur Marke noch „Luft" sind. Der Satz stimmte, gelesen hat er
sich aber wie eine Erlaubnis. Zwei Messlatten für dieselbe Sache messen am Ende
gar nichts.

**Sofort-Einwurf.** Sobald du eine Ausnahme eintippst, kommt der Kommentar — nicht
erst am Monatsende, wenn's eh zu spät ist.

**Kündigungs-Blick.** Alle Abos und Versicherungen nach **Jahreskosten** sortiert.
20 € im Monat klingen harmlos, 240 € im Jahr nicht mehr. Was du selbst als „nicht
notwendig" markiert hast, ist als Kündigungs-Kandidat markiert.

**Realitäts-Check.** Der 50/30/20-Vergleich, mit einer aufklappbaren Erklärung, woher
die Regel kommt. Die Regel ist bewusst **fest** und nicht umstellbar — eine Messlatte,
die man selbst tiefer hängen kann, misst nichts mehr.

**Notgroschen.** Die App kennt deine notwendigen Monatskosten und rechnet dir
daraus dein Puffer-Ziel aus: drei Monatsausgaben. Der Balken zeigt, wie weit du
bist. Das ist kein Luxus-Sparen — mit Puffer kannst du kündigen, ausziehen oder
Nein sagen, ohne vorher zu rechnen.

Hast du schon etwas zurückgelegt, trag es einmal unter **„Schon vorhanden"** ein.
Alles, was du danach in der App unter „Sparen" einträgst, kommt automatisch obendrauf.

**Sparziel.** Eine Sache, auf die du zusparst: eine Reise, ein Führerschein, ein
Umzug. Du trägst ein, was sie kostet, und optional bis wann. Daraus rechnet die
App zwei Daten aus, und der Abstand zwischen ihnen ist der eigentliche Punkt:

- **Wann du ankommst**, wenn du weitermachst wie bisher.
- **Wann du ankommst**, wenn die Hälfte deiner Ausnahmen stattdessen dorthin geht.

Damit wird aus „ich gebe zu viel für Sushi aus" ein „das Sushi kostet mich drei
Monate Lissabon". Dasselbe steht als Schild an jedem Ausnahme-Posten, neben der
Arbeitszeit, und der Sofort-Einwurf nennt es zuerst: Ein Termin, den du dir selbst
gesetzt hast, lässt sich schlechter wegdiskutieren als eine Prozentzahl.

Bewusst nur **ein** Ziel. Fünf halbvolle Fortschrittsbalken nebeneinander sind
kein Plan, sondern eine Wunschliste.

Zurückgelegt wird über die Kategorie **Sparen**: Jeder Posten dort hat, sobald ein
Ziel steht, ein Häkchen **„fürs Sparziel?"**. Ohne Häkchen geht das Geld an den
Notgroschen, mit Häkchen ans Ziel. Beide Töpfe bleiben getrennt, und zwar aus
einem Grund: Das Geld für die Reise ist kein Puffer. Geht die Waschmaschine
kaputt, ist entweder die Reise weg oder du im Dispo. Solange dein Notgroschen
nicht steht, sagt die App das dazu — verbieten tut sie nichts, die Reihenfolge
steht trotzdem fest.

Löschst du das Ziel, bleibt dein Gespartes erhalten und zählt wieder zum
Notgroschen.

**Platz sparen.** Jede Kategorie lässt sich am Kopf ein- und ausklappen. Zugeklappt
bleiben Name, Anzahl der Posten und Summe sichtbar. Welche Karten zu sind, merkt
sich die App.

## Was dich trägt

**Wohlstand, der in mein Leben fließt.** Eine eigene Karte über den Affirmationen,
und die einzige Sammlung in der App, die nichts bewertet. Hier notierst du alles,
was zu dir gekommen ist, ohne dass du etwas dafür getan hast: Geld, das dir jemand
zugesteckt hat, Blumen, die dir jemand mitgebracht hat, eine Einladung zum Essen,
zwei Euro auf der Straße, eine Spende am Flohmarktstand.

Die Grenze läuft bei **es gab keinen Anlass**. Ein Geburtstagsgeschenk gehört nicht
hierher, ein Gehalt auch nicht, und Geld für einen Gefallen erst recht nicht. Es
geht um das, was einfach so passiert und das man am nächsten Tag schon wieder
vergessen hat.

Oben stehen zwei Zahlen gleich groß nebeneinander: **wie viel** dir in diesem Monat
zugeflossen ist und **wie oft** jemand an dich gedacht hat. Beides zählt gleich viel,
denn Blumen haben kein Preisschild. Deshalb ist der Wert beim Eintragen auch optional —
schätz ihn, oder lass ihn leer, der Moment zählt trotzdem. Hat in einem Monat nichts
einen Wert bekommen, verschwindet der Euro-Betrag ganz, statt „0 €" zu behaupten.

Unten in der Karte steht die **Jahresauswertung**, eine Zeile pro Jahr, das neueste
zuerst. Das ist die Zahl, die staunen lässt: Zwanzig Euro hier, ein Essen dort, das
sieht einzeln nach nichts aus und steht am Jahresende dreistellig da. Das laufende
Jahr ist als „bisher" gekennzeichnet, damit es sich nicht mit einem vollen Vorjahr
vergleicht.

Die Jahreszahlen entstehen aus dem Archiv, füllen sich also mit jedem **Monat, den du
abschließt**. Ein Monat, in dem noch nichts steht, zeigt oben keine große Null, sondern
einen Satz — die Jahresauswertung darunter trägt die Karte dann.

Wichtig, damit keine Verwirrung aufkommt: **Diese Karte rechnet nirgendwo mit.**
Kein Cent von hier geht in deine Einnahmen, in deinen Kontostand, in die Prozente
oder in ein Ziel. Deshalb darf dasselbe Geld auch oben bei den Einnahmen stehen,
wenn es wirklich auf dein Konto gekommen ist. Hier unten ist es kein Geld, sondern
ein Moment.

**Affirmationen.** Ganz unten steht ein Satz, der nichts von dir will: keine
Prozente, kein Vergleich, kein Urteil. Er wechselt einmal am Tag von allein, und
über **nächster Satz ↻** blätterst du weiter, wenn du mehr willst. Am nächsten Tag
steht wieder der Satz des Tages da.

111 Wohlstands-Affirmationen liegen von Anfang an drin, und sie mischen zwei
Tonlagen. Die eine besitzt: „Ich bin reich", „Mein Konto ist immer gedeckt". Die
andere empfängt, und sie ist die wichtigere: „Geld kommt in Leichtigkeit zu mir",
„Ich werde dafür bezahlt, dass ich existiere". Geld muss hier weder verdient noch
erkämpft werden, es darf einfach kommen.

Reine Behauptung in der Gegenwart, ohne Bedingung und ohne Vertröstung. Dass sie
größer klingen als dein Kontostand, ist der Sinn der Sache und kein Fehler: Sie
sollen den Kopf auf Reichtum umgewöhnen, nicht beschreiben, wie es gerade steht.

Die 111 stehen fest im Programm und sind immer vollständig da. Ändert sich die
Liste, hat sie jede beim nächsten Öffnen, ohne einen Knopf dafür zu drücken.

Unter **eigenen Satz hinzufügen** schreibst du deine eigenen dazu. Sie mischen sich
unter die 111 und kommen ganz normal dran. Aufgelistet werden dort nur deine, jeder
mit ✕ zum Löschen, denn nur sie gehören dir.

Der Rest der App zeigt dir, was schiefläuft. Dieser Bereich ist die andere Seite,
und er steht mit Absicht am Ende: nach dem harten Teil ist er das, womit du rausgehst.

## Was du nur einmal eintippst

Fixkosten, Abos und Versicherungen sind **wiederkehrend**: Sie wandern beim
Monatswechsel automatisch mit, inklusive Betrag und Rhythmus. Was weg soll,
löschst du einfach mit dem ✕.

**Pausieren statt löschen.** Ruht dein Gym diesen Monat, drückst du an dem
Eintrag auf **⏸ pausieren**. Der Beitrag zählt dann in **keine** Zahl der App
mehr: nicht in die Prozente, nicht in den Kontostand, nicht in die Summe im
Kartenkopf und nicht in den Kündigungs-Blick. Der Eintrag selbst bleibt stehen,
durchgestrichen und mit dem Schild „pausiert bis …", und die Kontostand-Karte
sagt dir, was dadurch bei dir bleibt.

Eine Pause hat immer ein **Ende** — voreingestellt ist der laufende Monat, mit
dem Feld daneben schiebst du es weiter. Beim Monatswechsel endet eine abgelaufene
Pause von allein und der Posten läuft wieder mit. Genau deshalb ist es ein
Endmonat und kein bloßes Häkchen: Eine Pause ohne Ende wäre eine Kündigung, die
man vergisst, und die App würde dir monatelang zu viel Geld ausrechnen.

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

### Wenn du später etwas änderst

Den Link verschickst du **einmal**. Er bleibt für immer derselbe, egal wie oft die
App noch umgebaut wird. Nach jedem `git push` baut GitHub die Seite in ein bis zwei
Minuten neu; wer sie offen hat, lädt einmal neu und hat die neue Fassung.

Damit das sofort greift, hängt in `index.html` ein Versionsstempel an beiden
Dateien: `styles.css?v=2` und `app.js?v=2`. Für den Browser ist `?v=3` eine andere
Adresse als `?v=2`, also holt er die Datei frisch, statt bis zu zehn Minuten die
alte weiterzubenutzen. **Bei jeder Änderung an `app.js` oder `styles.css` die Zahl
an beiden Stellen um eins hochzählen.** Vergisst man es, ist nichts kaputt, es
dauert nur wieder bis zu zehn Minuten.

Die gespeicherten Zahlen aller Nutzerinnen überstehen jedes Update unangetastet.
Der Code ist das Kochbuch, die Daten sind der Kühlschrank: Ein neues Kochbuch
räumt niemandem den Kühlschrank aus.

## Nachprüfen, ob noch alles stimmt

`test_girlmath.py` fährt die App in einem echten Browser hoch und geht sie
durch: rechnen, eintragen, Monat abschließen, Bericht, alte Stände laden, und
das Ganze zusätzlich auf einem Android- und einem iPhone-Bildschirm. Über
hundert Prüfungen. Wichtig dabei: **Jeder JavaScript-Fehler lässt den Durchlauf
durchfallen**, auch wenn die sichtbare Prüfung daneben grün wäre.

Einmalig einrichten:

```bash
pip3 install playwright
python3 -m playwright install chromium
```

Dann nach jeder Änderung:

```bash
cd ~/girl-math
python3 test_girlmath.py
```

Am Ende steht entweder „Alle Tests bestanden" oder eine Liste dessen, was nicht
mehr passt. Screenshots und ein Beispiel-Bericht landen in `.test-ausgabe/`.

Wenn du etwas an der App änderst und ein Test meckert, ist das keine
Schikane, sondern der Hinweis, dass eine Zahl oder ein Ablauf jetzt anders
ist als vorher. Entweder war die Änderung nicht gewollt, oder der Test muss
nachgezogen werden.

## Aufbau des Codes

| Datei         | Zweck                                                        |
|---------------|-------------------------------------------------------------|
| `index.html`  | Aufbau der Seite (welche Bereiche es gibt)                   |
| `styles.css`  | Aussehen (Pink & Grün auf Perlweiß, alles Dunkle in Warmbraun) |
| `app.js`      | Logik: Eingaben, Rechnen, Konsumopfer-Score, Speichern      |
| `test_girlmath.py` | Prüft im echten Browser, dass alles noch rechnet und läuft |

Die Sprüche stehen oben in `app.js` in der Liste `VERDIKTE` — pro Stufe mehrere,
damit sich der Witz nicht jeden Monat wiederholt. Welcher kommt, hängt am Monat.

`grenze` ist die Obergrenze in Prozent für diese Stufe, `stufe` bestimmt die
Farbe des Banners (`v0` bis `v6` in `styles.css`).

Ein Spruch darf zweierlei sein: ein **fester Satz** oder eine **Funktion**, die
deine echten Zahlen bekommt und sie beim Namen nennen darf:

| | |
|---|---|
| `d.top` | teuerster Ausnahme-Posten (`.label`, `.betrag`, `.anzahl`) |
| `d.fix` | größte notwendige Rechnung |
| `d.summe` / `d.jahr` | alle Ausnahmen, diesen Monat / aufs Jahr gerechnet |
| `d.miete` / `d.topMiete` | im Verhältnis zu deiner größten Rechnung |
| `d.std` / `d.tage` / `d.topStd` | Arbeitszeit dahinter, falls vorhanden |
| `d.prozent`, `d.anzahl`, `d.gespart`, `d.puffer`, `d.ueberRegel` | der Rest |

So sieht ein eigener Spruch aus:

```js
d => hatNamen(d.top) && `${d.top.label} für ${euro(d.top.betrag)}. Ernsthaft?`,
```

Die Bedingung davor ist wichtig: Fehlen die Zahlen, die dein Spruch braucht,
muss er etwas Falsches zurückgeben (`false` oder `null`). Dann meldet er sich
für diesen Monat einfach nicht und ein anderer kommt dran. Deshalb muss
**mindestens ein Spruch pro Stufe ohne Bedingung** auskommen, sonst steht das
Banner leer da.

Häng keinen Spruch allein an `d.std` oder `d.topStd`, sonst schweigt er bei jeder
ohne Gehaltszettel — Arbeitsstunden gibt es nur, wenn Einnahmen als
Arbeitseinkommen markiert sind. `d.miete` braucht dagegen nur die Fixkosten und
funktioniert deshalb bei jeder, egal woher das Geld kommt.

Und die wichtigste Regel beim Schreiben: **die Zahl ist die Munition, nicht die
Pointe.** „624 € = 45 h Arbeit" ist eine Umrechnung, da zuckt man mit den
Schultern. „Du bist da keine Kundin mehr, du bist Sponsorin" dreht die Rolle um
und bleibt hängen. Also immer ein Bild, eine Umdeutung oder ein Vergleich mit
ihrer eigenen Miete — nie nur eine geteilte Zahl.

Die Kategorien stehen direkt darüber in `KATEGORIEN`. Eine neue Kategorie ist
eine neue Zeile in dieser Liste, mehr braucht es nicht. Die Sofort-Einwürfe stehen
in `ZAEHL_SPRUECHE`, die 50/30/20-Regel samt Herkunft in `REGEL`.

Die Affirmationen stehen in `AFFIRMATIONEN` und liegen damit **fest im Programm**.
Ein Satz mehr oder weniger ist eine Zeile in dieser Liste, und beim nächsten Öffnen
hat ihn jede. Im Speicher landen nur selbst getippte Sätze
(`einstellungen.eigeneAffirmationen`), `alleAffirmationen()` hängt beides zusammen.

Das war einmal andersherum, und es ging schief: Lag die Vorschlagsliste im Speicher,
war sie dort ein Stand von früher. Gestrichene Sätze blieben liegen, umformulierte
standen doppelt da, und die Liste wuchs bei jeder Änderung, statt zu stimmen. Kein
Nachhol-Knopf repariert das, weil Nachholen nur hinzufügen kann. Deshalb liest
`migriere` das alte Feld `affirmationen` bewusst **nicht** mehr: Der neue Feldname
zieht die Grenze zwischen „gehört dem Programm" und „gehört der Nutzerin", ohne
raten zu müssen.

Welcher Satz dran ist, rechnet `aktuelleAffirmation` aus der Tagesnummer, damit er
innerhalb eines Tages stehen bleibt und nicht bei jedem Tastendruck springt.

Alte gespeicherte Stände werden beim Laden automatisch auf die aktuelle Struktur
gehoben (`migriere` in `app.js`) — auch Backup-Dateien aus der ersten Version
lassen sich noch importieren.
