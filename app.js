/* ============================================================
   girl math — die Logik
   ------------------------------------------------------------
   Was diese Datei tut, in einfachen Worten:
   1. Sie hält alle deine Zahlen in einer Variablen namens STATE.
   2. Sie speichert STATE im Browser (localStorage), damit nichts
      verloren geht, wenn du die Seite schließt.
   3. Sie rechnet daraus die Prozente, deine Arbeitsstunden und
      dein Konsumopfer-Verdikt.
   4. Sie „zeichnet" die Seite immer wieder neu (render...), wenn
      sich etwas ändert.

   Metapher: STATE ist dein Notizzettel. localStorage ist die
   Schublade, in die der Zettel gelegt wird. render() ist das
   saubere Abschreiben des Zettels an die Wand (die Seite).
   ============================================================ */

/* ------------------------------------------------------------
   1. KATEGORIEN — die Bausteine deiner Monatsübersicht.

   Jede Kategorie ist eine Liste von Posten. Die Felder bedeuten:

     typ            wie der Posten in die Rechnung eingeht
                      positiv   = Geld kommt rein (Gehalt)
                      notwendig = musst du ausgeben (Miete, Essen)
                      nicht     = eine „Ausnahme" (Sushi, Klamotten)
                      sparen    = zur Seite gelegt (wird positiv bewertet)

     schalter       Ein Häkchen an jedem Posten dieser Kategorie:
                      feld = welches Feld am Posten gesetzt wird
                      text = was neben dem Häkchen steht

                    Neue Posten starten immer ohne Häkchen (siehe unten).

                    Zwei Sorten gibt es:
                      "notwendig" bei Abos und Versicherungen — entscheidet,
                                  ob der Posten als Ausnahme zählt
                      "gearbeitet" bei den Einnahmen — entscheidet, ob dieses
                                  Geld in den Stundenlohn eingeht

     wiederkehrend  true = läuft jeden Monat weiter und wandert beim
                    Monatswechsel automatisch mit. Diese Posten haben
                    zusätzlich einen Rhythmus (monatlich … jährlich).

     vertrag        true = taucht im Kündigungs-Blick auf (Abos,
                    Versicherungen — Dinge, die man kündigen kann)

     zeitfeld       true = hier steht das Feld für deine Wochenstunden
                    (nur bei den Einnahmen, weil daraus der Stundenlohn
                    entsteht)

     altHaken       Nur für gespeicherte Stände von früher: Womit die App
                    damals gerechnet hat, als es das Häkchen noch nicht gab.
                    Neue Posten sind davon nicht betroffen.

     platzhalter    Das blasse Beispiel im leeren Eingabefeld

     hinweis        Ein erklärender Satz unter der Überschrift
   ------------------------------------------------------------ */
/* JEDES Häkchen startet leer. Ausnahmslos.

   Der Grund ist Vertrauen in die eigenen Zahlen: Ein Häkchen, das die App
   von sich aus setzt, verändert die Rechnung, ohne dass du es angetippt
   hast. Später steht dann eine Zahl da, die man sich nicht erklären kann.
   Lieber rechnet die App erst, wenn du gesagt hast, was gilt.

   Deshalb gibt es hier auch keine Standard-Stellung mehr: leer ist die
   einzige. Was du früher schon angehakt hast, bleibt angehakt — das rührt
   dieser Wechsel nicht an. */
const SCHALTER_NOTWENDIG  = { feld: "notwendig",  text: "notwendig?" };
const SCHALTER_GEARBEITET = { feld: "gearbeitet", text: "dafür gearbeitet?" };

/* `nurBeiSparziel` blendet dieses eine Häkchen aus, solange gar kein Ziel
   gesetzt ist. Eine Frage nach etwas, das es nicht gibt, wäre nur ein Rätsel. */
const SCHALTER_FUERS_ZIEL = { feld: "fuersZiel", text: "fürs Sparziel?", nurBeiSparziel: true };

const KATEGORIEN = [
  { key: "income",         titel: "1 · Einnahmen 💰",              typ: "positiv",   zeitfeld: true, schalter: SCHALTER_GEARBEITET, altHaken: true, platzhalter: "z.B. Gehalt",
    hinweis: "Auch Bürgergeld, Unterhalt, Kindergeld oder Geschenke." },
  { key: "fixkosten",      titel: "2 · Fixkosten 🏠",              typ: "notwendig", wiederkehrend: true, platzhalter: "z.B. Miete" },
  { key: "abos",           titel: "3 · Abos 📺",                   typ: "abo",       wiederkehrend: true, schalter: SCHALTER_NOTWENDIG, vertrag: true, platzhalter: "z.B. Netflix" },
  { key: "versicherungen", titel: "4 · Versicherungen 🛡️",         typ: "abo",       wiederkehrend: true, schalter: SCHALTER_NOTWENDIG, altHaken: true, vertrag: true, platzhalter: "z.B. Haftpflicht" },
  { key: "lebensmittel",   titel: "5 · Einkauf: Lebensmittel 🥑", typ: "notwendig", platzhalter: "z.B. Wocheneinkauf" },
  { key: "luxus",          titel: "6 · Einkauf: Ausnahmen 🍣",    typ: "nicht",     platzhalter: "z.B. Sushi" },
  { key: "konsum",         titel: "7 · Große Ausnahmen 🛍️",        typ: "nicht",     platzhalter: "z.B. Klamotten" },
  { key: "sparen",         titel: "8 · Sparen 💌",                 typ: "sparen",    schalter: SCHALTER_FUERS_ZIEL, platzhalter: "z.B. Rücklage" },
];

/* Soll das Häkchen dieser Kategorie überhaupt zu sehen sein?

   Nur „fürs Sparziel?" hat eine Bedingung: Ohne Ziel wäre es eine Frage nach
   etwas, das es nicht gibt. Die Prüfung steht hier an einer Stelle, weil das
   Häkchen an ZWEI Orten gezeichnet wird — an jedem Posten und im Formular
   zum Hinzufügen. Stünde sie doppelt, liefen die beiden irgendwann auseinander. */
function schalterZeigen(kat) {
  if (!kat.schalter) return false;
  return !kat.schalter.nurBeiSparziel || sparzielAktiv();
}

/* Ist dieser Posten eine „Ausnahme"? Bei Abos und Versicherungen entscheidet
   das Häkchen, sonst der Kategorie-Typ. Einnahmen, Sparen und notwendige
   Ausgaben sind nie Ausnahmen. */
function istAusnahmePosten(kat, posten) {
  if (kat.typ === "positiv" || kat.typ === "sparen" || kat.typ === "notwendig") return false;
  if (kat.schalter && kat.schalter.feld === "notwendig") return !posten.notwendig;
  return kat.typ === "nicht";
}

/* ------------------------------------------------------------
   2. RHYTHMEN — wie oft eine wiederkehrende Zahlung abgeht.
   Die Zahl ist der Abstand in Monaten. Daraus rechnen wir zwei
   Dinge: die monatliche Umlage (Jahresbeitrag / 12) und ob der
   Posten GENAU DIESEN Monat wirklich vom Konto geht.
   ------------------------------------------------------------ */
const INTERVALL = {
  monatlich:         1,
  vierteljaehrlich:  3,
  halbjaehrlich:     6,
  jaehrlich:        12,
};

const RHYTHMUS_TEXT = {
  monatlich:        "monatlich",
  vierteljaehrlich: "alle 3 Monate",
  halbjaehrlich:    "alle 6 Monate",
  jaehrlich:        "einmal im Jahr",
};

/* ------------------------------------------------------------
   3. DIE 50/30/20-REGEL für den Realitäts-Check.

   Bewusst FEST eingebaut und nicht umschaltbar: Eine Messlatte,
   die man selbst tiefer hängen kann, misst nichts mehr.

   Hier stand früher zusätzlich ein selbstgesetztes Ziel. Das ist raus.
   Es startete bei 30% (also genau bei der Regel), durfte die Regel nicht
   überschreiten, und maß damit nichts, was die Regel nicht schon misst.
   Die 30% sind jetzt die eine Marke: für den Stand oben, für die Serie,
   für den Sofort-Einwurf und fürs Archiv.
   ------------------------------------------------------------ */
const REGEL = {
  name: "50/30/20",
  notwendig: 50,
  nicht: 30,
  sparen: 20,
  erklaerung: [
    "Die Zahlen stammen von Elizabeth Warren, einer amerikanischen Professorin für Insolvenzrecht. Sie hat Tausende Fälle untersucht, in denen Menschen zahlungsunfähig wurden, und dabei etwas Überraschendes herausgefunden.",
    "Die meisten sind nicht durchs Shoppen pleitegegangen. Sie sind pleitegegangen, weil ihre festen monatlichen Kosten für Miete, Auto, Versicherungen und Kredite auf über die Hälfte ihres Einkommens angewachsen waren. Wer so wenig Spielraum hat, kommt schon durch eine kaputte Waschmaschine oder einen Monat Krankheit ins Straucheln.",
    "Deshalb die 50 Prozent. Sie sind keine Sparvorgabe, sondern eine Sicherheitsgrenze. Die 30 Prozent sind das, was du dir guten Gewissens gönnen darfst. Und die 20 Prozent sind das, was dich unabhängig macht.",
  ],
};

/* ------------------------------------------------------------
   4. KONSUMOPFER-SKALA — die Sprüche deiner besten Freundin.

   "grenze" ist die Obergrenze (in %) für diese Stufe.
   Pro Stufe gibt es mehrere Sprüche; welcher kommt, hängt am
   Monat — so wiederholt sich der Witz nicht jeden Monat.

   Jeder Spruch ist eine FUNKTION, keine feste Zeile. Sie bekommt
   deine echten Zahlen (siehe `spruchDaten` weiter unten) und darf
   sie beim Namen nennen.

   DER TON: trocken, sarkastisch, schadenfroh. Drei Regeln, und jede
   davon ist wichtiger als ein guter Einfall.

   1. DIE APP REDET ÜBER SICH, NICHT ÜBER DICH.
      "Ich hab schon mal Popcorn geholt." "Ich frag nicht mal mehr wofür."
      "Ich führ da jetzt eine eigene Spalte für." Sie beschreibt ihre
      eigene Reaktion auf dein Verhalten, nie dein Verhalten selbst.
      Genau das ist der Unterschied zwischen schadenfroh und belehrend:
      "Du gibst zu viel aus" ist eine Mahnung, "ich hol schon mal
      Popcorn" ist eine Freundin, die es sich gemütlich macht.

   2. REGISTERBRUCH. Dein Untergang wird in Amtssprache oder Floskel
      abgehandelt: "Täterin bekannt." "Herzlichen Glückwunsch zum
      Zweitjob." "Stört dich offenbar nicht." Je größer das Drama, desto
      sachlicher der Satz.

   3. SIE IST SCHON FERTIG MIT DIR. Kein Streit, keine Drohung, keine
      Verteidigung. Sie hat gewonnen und macht sich einen schönen Abend.
      Deshalb ist "du hast dir das schöngeredet, ich hab nachgerechnet"
      nur mittelmäßig: da streitet sie noch.

   Dazu, unverändert gültig: DIE ZAHL IST DIE MUNITION, NICHT DIE POINTE.
   "624 € = 45 h Arbeit" ist eine Umrechnung, da zuckt man mit den
   Schultern. Die Pointe steht hinten, ist kurz und am liebsten ein
   Fragment: "Verstörend." "Ätzend." "Täterin bekannt."

   Und was NICHT funktioniert: Poesie. "Für Sachen, die keine Adresse
   haben" war mal ein Spruch hier. Man muss zweimal lesen, um die
   Anspielung auf die Miete zu verstehen, und wer sie versteht, denkt
   "ah, clever". Das ist der Tod von frech. Frech ist sofort da oder
   gar nicht. Also keine Rätsel, keine Reime, keine überdehnten Bilder.

   Wichtig für eigene Sprüche: Wenn die Zahlen fehlen, die dein Spruch
   braucht, gib etwas Falsches zurück (`false`, `null`). Dann wird er
   übersprungen und der nächste kommt dran. Der LETZTE Spruch jeder
   Stufe muss deshalb ohne Bedingung durchgehen — er ist das Auffangnetz.
   ------------------------------------------------------------ */

// Ein Posten taugt nur für einen Spruch, wenn er auch einen Namen hat.
const hatNamen = (t) => !!(t && t.label && t.label !== "(ohne Namen)");

const VERDIKTE = [
  {
    grenze: 10, stufe: 0, sprueche: [
      d => hatNamen(d.top) &&
        `Spar-Königin 👑 Dein größter Ausrutscher: ${d.top.label} für ${euro(d.top.betrag)}. Ich hab extra nachgerechnet, ob ich dich dafür fertigmachen kann. Kann ich nicht. Ätzend.`,
      d => d.summe > 0 &&
        `${d.prozent}%. ${euro(d.summe)} raus, der Rest liegt noch da. Und jetzt? Soll ich klatschen? Ich klatsch nicht.`,
      d => `Spar-Königin 👑 Dein Konto sieht aus wie das einer erwachsenen Frau. Verstörend.`,
      d => `Unter 10%. Entweder Disziplin oder Grippe. Ich zähl beides.`,
    ],
  },
  {
    grenze: 20, stufe: 1, sprueche: [
      d => d.jahr > 0 &&
        `Erwachsen. Igitt. ${euro(d.summe)} diesen Monat, ${euro(d.jahr)} aufs Jahr. Ich geb dem drei Wochen.`,
      d => hatNamen(d.top) && d.top.anzahl > 1 &&
        `${d.top.label}, ${d.top.anzahl}×. Noch nenn ich das Zufall. Wir wissen beide, dass ich lüge.`,
      d => `Du hast dich benommen. Einmal. Wir tun jetzt so, als wäre das dein Charakter.`,
      d => `Solide wie eine Steuererklärung. Langweilig, und ich bin trotzdem stolz.`,
    ],
  },
  {
    grenze: 35, stufe: 2, sprueche: [
      d => d.miete &&
        `${euro(d.summe)} weg, ${d.miete}. Sag jetzt bitte nicht, das war ein besonderer Monat.`,
      d => hatNamen(d.top) && d.topMiete &&
        `${d.top.label}: ${euro(d.top.betrag)}, ${d.topMiete}. Ich schreib ${d.top.label} einfach zu den Fixkosten. Spart uns beiden Zeit.`,
      /* „deine zweite Miete" braucht ein weibliches Wort. Heißt deine größte
         Rechnung „Strom", fällt der Spruch aus und der nächste kommt dran —
         lieber ein anderer Satz als ein falscher. */
      d => hatNamen(d.fix) && istWeiblich(d.fix.label) &&
        `${d.fix.label}: ${euro(d.fix.betrag)}. Deine Ausnahmen: ${euro(d.summe)}. Die sind auf dem besten Weg, deine zweite ${d.fix.label} zu werden.`,
      d => `Du stehst auf der Kippe, Schatz. Ich hab schon mal Popcorn geholt.`,
    ],
  },
  {
    grenze: 50, stufe: 3, sprueche: [
      d => hatNamen(d.top) && hatNamen(d.fix) &&
        `${d.top.label}: ${euro(d.top.betrag)}. ${d.fix.label}: ${euro(d.fix.betrag)}. Für eins davon kriegst du wenigstens einen Schlüssel.`,
      d => d.jahr > 0 &&
        `${euro(d.jahr)} im Jahr, wenn das so bleibt. Das ist ein Gebrauchtwagen. Jedes Jahr einer.`,
      d => d.miete &&
        `${euro(d.summe)} weg, ${d.miete}. Du hast dir das schöngeredet, ich hab's nachgerechnet. Einer von uns hatte recht.`,
      d => `Halbe-halbe zwischen Leben und Laune. Deine Laune wohnt besser als du.`,
    ],
  },
  {
    grenze: 70, stufe: 4, sprueche: [
      d => hatNamen(d.top) &&
        `Konsumopfer 🛍️ ${euro(d.top.betrag)} an ${d.top.label}. Du bist da keine Kundin mehr. Du bist Sponsorin.`,
      d => d.miete &&
        `Über die Hälfte weg. ${euro(d.summe)}, ${d.miete}. Herzlichen Glückwunsch zum Zweitjob.`,
      d => d.ueberRegel > 0 &&
        `${d.prozent}%. Erlaubt wären 30. ${euro(d.ueberRegel)} Unterschied, aber du wirst deine Gründe haben.`,
      d => `Dein Ernst? ${d.prozent}%. Ich frag nicht mal mehr wofür.`,
    ],
  },
  {
    grenze: 100, stufe: 5, sprueche: [
      d => hatNamen(d.top) && d.gespart < d.top.betrag &&
        `Totales Konsumopfer 💀 ${d.top.label} hat ${euro(d.top.betrag)} von dir bekommen. Du selbst: ${euro(d.gespart)}. Merkste selber, oder?`,
      d => `${euro(d.summe)} raus, Notgroschen bei ${euro(d.puffer)}. Wenn was kaputtgeht, ruf mich nicht an. Ich hab auch nichts.`,
      d => d.miete &&
        `${euro(d.summe)} weg, ${d.miete}. Dein Gehalt kam an, hat sich kurz umgesehen und ist wieder gegangen.`,
      d => `Das war kein Monat, das war ein Raubzug. Täterin bekannt.`,
    ],
  },
  {
    grenze: Infinity, stufe: 6, sprueche: [
      d => hatNamen(d.top) &&
        `Mehr raus als rein. ${d.top.label} allein: ${euro(d.top.betrag)}. Das Geld dafür existiert nicht. Stört dich offenbar nicht.`,
      d => d.miete &&
        `${d.miete} für nichts, was bleibt. Sag mir bitte, dass da ein Fehler drin ist.`,
      d => `Insolvenz-Vibes 💀💀 ${euro(d.summe)} raus bei ${euro(d.gehalt)} rein. Du gibst Geld aus, das noch nicht erfunden wurde.`,
      d => `Mehr ausgegeben als verdient. An der Stelle hör ich mit den Witzen auf.`,
      d => `Mehr ausgegeben als verdient. Ich hab keinen Spruch mehr, ich hab nur noch Fragen.`,
    ],
  },
];

/* ------------------------------------------------------------
   5. SOFORT-REAKTIONEN — was die App sagt, in der Sekunde, in der
   du eine Ausnahme eintippst. Das Urteil am Monatsende kommt zu
   spät; wehtun muss es beim Tippen.
   ------------------------------------------------------------ */
// „1 Ausnahme", ab zwei „5 Ausnahmen". Ohne das stünde da „1 Ausnahmen".
const ausnahmen = (n) => n === 1 ? "1 Ausnahme" : `${n} Ausnahmen`;

const ZAEHL_SPRUECHE = [
  (n, p) => `Ausnahme Nummer ${n} diesen Monat: ${p.label} für ${euro(p.amount)}. Ich zähle mit.`,
  (n, p) => `Notiert. ${p.label}, ${euro(p.amount)}. Macht ${ausnahmen(n)} bisher. Kein Kommentar.`,
  (n, p) => `Nummer ${n}. Ich hab aufgehört zu zählen. Nein, Quatsch, ich zähl natürlich weiter.`,
  (n, p) => `${ausnahmen(n)}. Du weißt, dass ich das aufschreibe, ja?`,
];

/* ------------------------------------------------------------
   5b. AFFIRMATIONEN — der Gegenpol zum Verdikt.

   Der Rest der App zeigt dir, was schiefläuft. Das hier ist die
   andere Seite: ein Satz, der dich trägt statt dich zu stellen.
   Er wechselt von allein, einmal am Tag.

   Der Ton ist mit Absicht ein völlig anderer als überall sonst in
   der App. Keine Disziplin, keine Mahnung, keine Realitätsprüfung:
   reine Behauptung im Hier und Jetzt. Diese Sätze sollen nicht
   beschreiben, wie es gerade IST, sondern den Kopf auf Reichtum
   umgewöhnen. Dass sie größer klingen als der aktuelle Kontostand,
   ist der Punkt und kein Fehler.

   Zwei Tonlagen mischen sich hier, und beide sind gewollt:
     BESITZEN   „Ich bin reich", „Mein Konto ist immer gedeckt"
     EMPFANGEN  „Geld kommt in Leichtigkeit zu mir", „Ich werde
                dafür bezahlt, dass ich existiere"

   Die zweite ist die wichtigere. Geld muss hier weder verdient noch
   erkämpft werden, es darf einfach kommen. Das ist der Ton, den
   Nadinelle vorgegeben hat: weich, mühelos, empfangend.

   Deshalb gilt für eigene Sätze die umgekehrte Regel wie beim Rest
   der Datei: Gegenwart statt Zukunft, keine Bedingung („auch wenn",
   „sobald ich"), keine Vertröstung („irgendwann"). Alles, was den
   Satz kleiner macht, macht ihn kaputt. Eine Verneinung darf dagegen
   stehen, wenn sie den Satz GRÖSSER macht: „Ich muss das Geld nicht
   suchen. Es kommt zu mir."

   Diese Liste steht FEST im Programm und ist immer vollständig da.
   Sie liegt bewusst nicht im Speicher des Browsers: Dort wäre sie
   ein Stand von früher, der bei jeder Änderung nachgezogen werden
   müsste. So bekommt jede beim nächsten Öffnen genau die Sätze, die
   gerade hier stehen, ohne einen einzigen Knopf dafür.

   Eigene Sätze kommen obendrauf und liegen im Speicher (siehe
   `eigeneAffirmationen` in den Einstellungen). Nur sie lassen sich
   löschen, denn nur sie gehören der Nutzerin.

   Die Reihenfolge ist gemischt und nicht nach Themen sortiert.
   Angezeigt wird der Reihe nach, ein Satz pro Tag — thematisch
   sortiert bekäme man eine Woche lang nur „Geld kommt zu mir".
   ------------------------------------------------------------ */
const AFFIRMATIONEN = [
  "Ich bin reich.",
  "Geld kommt in Leichtigkeit zu mir.",
  "Ich muss das Geld nicht suchen. Es kommt zu mir.",
  "Es ist immer mehr als genug für mich da.",
  "Ich werde dafür bezahlt, dass ich existiere.",
  "Ich bin es wert, genug Geld zu besitzen.",
  "Ich habe passive Einnahmequellen.",
  "Meine Existenz bringt Geld.",
  "Ich habe Wohlstand verdient.",
  "Mein Vermögen wächst jeden Tag.",
  "Ich empfange gern und mit offenen Händen.",
  "Ich lasse los, und es kommt zu mir zurück.",
  "Geld findet den Weg zu mir ganz von allein.",
  "Alles fügt sich zu meinen Gunsten.",
  "Ich darf reich sein.",
  "Ich habe ein Händchen für Geld.",
  "Geld fließt mir mühelos zu.",
  "Ich bin finanziell gebildet.",
  "Geld kommt zu mir, während ich mich ausruhe.",
  "Ich bin die reichste Frau, die ich kenne.",
  "Ich ziehe Geld magisch an.",
  "Ich verdiene Geld, während ich schlafe.",
  "Mein Sein genügt, damit Geld zu mir findet.",
  "Ich kann gut mit Geld umgehen.",
  "Wohlstand ist mein natürlicher Zustand.",
  "Es darf mir leichtfallen.",
  "Ich beherrsche den Umgang mit Geld.",
  "Ich bin ein Magnet für Geld.",
  "Ich werde reich beschenkt.",
  "Ich habe es verdient, reich zu sein.",
  "Mein Konto wächst schneller, als ich ausgeben kann.",
  "Geld ermöglicht mir vieles.",
  "Ich lebe im Überfluss.",
  "Geld fließt zu mir wie Wasser.",
  "Geld ist eine gute Sache. Ich kann viel Gutes damit vollbringen.",
  "Große Summen fühlen sich für mich ganz normal an.",
  "Das Geld ermöglicht es mir, meine Träume zu erfüllen.",
  "Reichtum erreicht mich aus erwarteten und aus unerwarteten Quellen.",
  "Ich liebe den Umgang mit Geld.",
  "Mein Geld arbeitet für mich, rund um die Uhr.",
  "Geld macht mich glücklich.",
  "Ich vertraue, und das Geld kommt.",
  "Ich ziehe Gelegenheiten an, die mich reicher machen.",
  "Ich kann mir kaufen, was ich will.",
  "Reich sein steht mir.",
  "Meine Leichtigkeit zieht Fülle an.",
  "Ich besitze mehr Geld, als ich mir vorstellen kann.",
  "Mein Einkommen vervielfacht sich.",
  "Mein Konto ist immer gedeckt.",
  "Geld findet mich, wo immer ich bin.",
  "Ich bin versorgt, immer.",
  "Ich bin finanziell sorglos.",
  "Ich bin eine Frau mit Vermögen.",
  "Das Leben kümmert sich um mich.",
  "Für mich ist genug da, und für alle anderen auch.",
  "Ich habe es verdient, finanziell frei zu leben.",
  "Menschen zahlen mir gern, was ich wert bin.",
  "Ich mache es mir leicht.",
  "Ich habe finanziell alles, was ich benötige.",
  "Ich verdiene mein Geld mit dem, was ich liebe.",
  "Fülle ist mein Grundzustand.",
  "Meine Finanzen sind fabelhaft.",
  "Jeden Tag kommt Geld zu mir.",
  "Ich atme aus, und es ist genug da.",
  "Ich bin finanziell abgesichert.",
  "Meine Einnahmequellen vermehren sich von allein.",
  "Ich bin eine Frau, die empfängt.",
  "Ich verdiene Wohlstand.",
  "Ich habe alles, was ich brauche, und mehr.",
  "Reichtum darf mühelos sein.",
  "Ich bin es wert.",
  "Das Geld ist längst unterwegs zu mir.",
  "Ich gebe mir die Erlaubnis, viel zu haben.",
  "Im Herzen bin ich Millionärin.",
  "Ich lasse Geld zu mir kommen.",
  "Ich nehme Geld an, ohne mich zu rechtfertigen.",
  "Ich habe mehr Geld, als ich ausgeben kann.",
  "Ich bin bereit für große Summen.",
  "Geld kommt zu mir, weil ich es bin.",
  "Geld strömt in mein Leben.",
  "Reichtum fühlt sich sicher für mich an.",
  "Ich ruhe, und mein Wohlstand wächst.",
  "Ich bin reich und werde immer reicher.",
  "Mein Leben ist voller Fülle.",
  "Ich lasse mich beschenken.",
  "Ich bekomme alles, was ich will.",
  "Ich bin für den Überfluss gemacht.",
  "Ich bin offen für Reichtum.",
  "Geld gehört zu meinem Leben wie die Luft zum Atmen.",
  "Ich verdiene ein Leben in Fülle.",
  "Geld kommt schneller zu mir, als ich es erwarte.",
  "Ich wurde dazu geboren, reich zu sein.",
  "Ich nehme an, was das Leben mir gibt.",
  "Ich habe immer Geld.",
  "Ich bin von Fülle umgeben.",
  "Geld liebt mich.",
  "Geschenke, Glück und Zufälle gehören zu meinem Einkommen.",
  "Ich liebe Reichtum.",
  "Ich bin finanziell frei.",
  "Ich werde für das bezahlt, was mir Freude macht.",
  "Mein Geld kauft mir Zeit.",
  "Ich empfange so leicht, wie ich gebe.",
  "Ich bin weich und wohlhabend zugleich.",
  "Ich halte die Hände offen, und es fällt hinein.",
  "Meine Rücklagen tragen mich durch jede Überraschung.",
  "Ich schlafe ruhig, weil mein Geld für mich sorgt.",
  "Ich teile aus der Fülle heraus.",
  "Mein Reichtum macht auch andere reicher.",
  "Meine Zahlen wachsen jeden Monat.",
  "Mein Einkommen wächst, während ich lebe.",
  "Ich bin meine eigene beste Investition.",
];

// Länger als das nimmt die App nicht an — ein Satz, kein Aufsatz.
const AFFIRMATION_MAX = 200;

const SPEICHER_SCHLUESSEL = "girlmath.v1"; // Name der "Schublade" im Browser

/* ------------------------------------------------------------
   6. KLEINE HELFER
   ------------------------------------------------------------ */

// Eindeutige ID für jeden Posten (Zeitstempel + Zufall, reicht völlig).
function neueId() {
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Monats-ID im Format "2026-07" aus einem Datum.
function monatsId(datum) {
  const jahr = datum.getFullYear();
  const monat = String(datum.getMonth() + 1).padStart(2, "0");
  return jahr + "-" + monat;
}

// Aus "2026-07" den nächsten Monat "2026-08" machen (Jahreswechsel inklusive).
function naechsterMonat(id) {
  let [jahr, monat] = id.split("-").map(Number);
  monat += 1;
  if (monat > 12) { monat = 1; jahr += 1; }
  return jahr + "-" + String(monat).padStart(2, "0");
}

// Die Monatsnummer (1–12) aus einer Monats-ID herausziehen.
function monatsNummer(id) {
  return Number(String(id).split("-")[1]) || 1;
}

/* Eine Monats-ID um n Monate weiterschieben: monatPlus("2026-11", 3) = "2027-02".

   Der Trick, um den Jahreswechsel loszuwerden: Wir rechnen erst alles in
   „Monate seit Jahr 0" um, addieren dort, und bauen daraus wieder Jahr und
   Monat. Dann muss niemand daran denken, dass nach 12 wieder 1 kommt. */
function monatPlus(id, n) {
  const [jahr, monat] = String(id).split("-").map(Number);
  const gesamt = jahr * 12 + (monat - 1) + Math.round(n);
  return Math.floor(gesamt / 12) + "-" + String((gesamt % 12) + 1).padStart(2, "0");
}

// Wie viele Monate liegen zwischen zwei Monats-IDs? Negativ, wenn `bis` vorher liegt.
function monateBis(von, bis) {
  const [j1, m1] = String(von).split("-").map(Number);
  const [j2, m2] = String(bis).split("-").map(Number);
  return (j2 * 12 + m2) - (j1 * 12 + m1);
}

// "2026-07" hübsch anzeigen als "Juli 2026".
const MONATSNAMEN = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const MONATE_KURZ = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

function monatLesbar(id) {
  const [jahr, monat] = id.split("-").map(Number);
  return MONATSNAMEN[monat - 1] + " " + jahr;
}

// Eine Zahl als Euro anzeigen, z.B. 1234.5 -> "1.234,50 €".
function euro(n) {
  return (n || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

/* Auf ganze Cent runden.

   Warum das nötig ist: Ein Computer speichert Kommazahlen im Zweiersystem,
   und 0,10 lässt sich dort so wenig sauber schreiben wie 1/3 im Zehnersystem.
   Aus 1066,04 + 0,10 wird deshalb gern mal 1066,1399999999999. Am Bildschirm
   sieht man davon nichts, weil euro() rundet — aber sobald so eine Zahl in ein
   EINGABEFELD wandert, steht sie dort mit acht Nachkommastellen. Genau das
   passiert beim Monatsabschluss: Der errechnete Kontostand wird zum neuen
   Startguthaben, und der Rattenschwanz wächst Monat für Monat weiter.

   Metapher: einmal im Monat Kassensturz auf ganze Cent, statt Bruchteile
   von Cent ewig mitzuschleppen. */
function runde(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/* Einen getippten Betrag lesen — auch wenn er nicht so aussieht, wie
   JavaScript ihn gern hätte.

   Drei Dinge werden begradigt: das deutsche Komma („−300,50"), das echte
   Minuszeichen „−" aus Textprogrammen (JavaScript kennt nur den Bindestrich)
   und Leerzeichen. Ein Euro-Zeichen darf auch dabeistehen.

   Leer bleibt leer: Zurück kommt dann null und nicht 0. Der Unterschied ist
   inhaltlich — „ich weiß es nicht" ist etwas anderes als „das Konto stand auf
   genau null", und beim Anker entscheidet genau das, ob gerechnet oder
   übernommen wird. */
function betragAusText(text) {
  const sauber = String(text == null ? "" : text)
    .replace(/[−–—]/g, "-")   // typografische Striche zum echten Minus
    .replace(/[€\s]/g, "")
    .replace(",", ".")
    .trim();
  if (sauber === "") return null;
  const zahl = Number(sauber);
  return Number.isFinite(zahl) ? runde(zahl) : null;
}

// Die Beträge einer Postenliste zusammenzählen (ohne Rhythmus-Umlage).
function summe(liste) {
  return (liste || []).reduce((s, posten) => s + (Number(posten.amount) || 0), 0);
}

// Posten fürs Anzeigen nach Betrag sortieren — der höchste zuerst.
// Wichtig: Wir sortieren eine KOPIE (das [...] macht die Kopie), damit
// die gespeicherte Reihenfolge im STATE unberührt bleibt. sort() würde
// sonst die Original-Liste umbauen.
function sortiertNachBetrag(liste) {
  return [...(liste || [])].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
}

/* Geht dieser Posten in dem Monat mit der Nummer `nr` wirklich vom Konto?
   Beispiel: eine jährliche Versicherung mit faellig = 10 (Oktober) geht
   nur im Oktober ab. Eine vierteljährliche mit faellig = 2 geht im
   Februar, Mai, August und November ab.
   Der doppelte Modulo (% … + … %) sorgt dafür, dass die Rechnung auch
   bei negativen Differenzen sauber aufgeht. */
function istFaelligIn(posten, nr, intervall) {
  const anker = Number(posten.faellig) || nr;
  return ((((nr - anker) % intervall) + intervall) % intervall) === 0;
}

// Aus einem Text eine stabile Zahl machen — damit derselbe Monat immer
// denselben Spruch bekommt (und nicht bei jedem Klick einen neuen).
function textZuZahl(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

// Kleiner Schutz, damit Anführungszeichen in Bezeichnungen das HTML nicht zerschießen.
function escapeAttr(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/* ------------------------------------------------------------
   7. LEBENSZEIT — der schärfste Umrechner der App.

   Aus Gehalt und Wochenstunden ergibt sich dein Stundenlohn, und
   damit lässt sich jeder Betrag in Arbeitszeit übersetzen.
   Metapher: Der Preis auf dem Etikett ist nur die halbe Wahrheit.
   Die andere Hälfte steht auf deiner Uhr.

   Rechenweg: Ein Monat hat im Schnitt 52/12 = 4,33 Wochen.
   ------------------------------------------------------------ */
const WOCHEN_PRO_MONAT = 52 / 12;

function stundenlohnAus(gehalt, wochenstunden) {
  const stundenImMonat = (Number(wochenstunden) || 0) * WOCHEN_PRO_MONAT;
  if (gehalt <= 0 || stundenImMonat <= 0) return 0;
  return gehalt / stundenImMonat;
}

// Einen Betrag als Arbeitszeit ausdrücken: "40 min", "2,5 h", "17 h".
function stundenText(betrag, lohn) {
  if (!lohn || !(betrag > 0)) return "";
  const h = betrag / lohn;
  if (h < 1)  return Math.round(h * 60) + " min";
  if (h < 10) return h.toFixed(1).replace(".", ",") + " h";
  return Math.round(h) + " h";
}

// Bei großen Summen zusätzlich in Arbeitstage (8 h) umrechnen.
function arbeitstageText(betrag, lohn) {
  if (!lohn || !(betrag > 0)) return "";
  const tage = betrag / lohn / 8;
  if (tage < 1) return "";
  return tage.toFixed(1).replace(".", ",") + " Arbeitstage";
}

/* ------------------------------------------------------------
   7b. DER MIETEN-MASSSTAB — der Vergleich für alle anderen.

   Der Stundenlohn oben setzt Erwerbsarbeit voraus. Wer Bürgergeld
   bezieht, Unterhalt bekommt, studiert oder von Erspartem lebt, hat
   keinen — und würde von der App kein einziges Mal hören, was ein
   Kauf wirklich bedeutet. Ein Finanzplaner, der nur mit Gehaltszettel
   funktioniert, ist ein halber Finanzplaner.

   Der Ersatz ist NICHT eine zweite Umrechnung in Zeit. Zeit trifft nur,
   wenn man sie erlebt hat: "45 Stunden gearbeitet" sitzt, weil die
   Stunden wirklich passiert sind. "Davon hättest du 4 Tage gelebt"
   beschreibt dagegen etwas, das nie stattgefunden hat — die Tage fehlen
   ihr nirgends, sie hat ja trotzdem gelebt. Saubere Rechnung, kein Gefühl.

   Was jede kennt und niemand wegdiskutieren kann, ist die eigene größte
   Rechnung: die Miete. "162 € Shein, ein Drittel deiner Miete" braucht
   keine Erklärung — bei der Miete weiß jeder sofort, was sie bedeutet.
   ------------------------------------------------------------ */

/* Den Namen deiner größten Rechnung so einbauen, dass der Satz deutsch bleibt.

   Das Problem: Du tippst den Namen selbst ein, und deutsche Grammatik hängt
   am Geschlecht des Wortes. "28% deiner Miete" stimmt, "28% deiner Strom"
   ist Unsinn. Raten kann die App das nicht.

   Also zwei Wege. Die üblichen Verdächtigen stehen in einer Liste und
   bekommen die kurze Form. Alles andere läuft über "deiner Rechnung für X" —
   "Rechnung" ist immer weiblich, damit stimmt der Satz für jedes Wort, das
   du eintippen kannst, auch für "Leasing Nummer 2" oder "Bude". */
const WEIBLICHE_FIXKOSTEN = [
  "miete", "kaltmiete", "warmmiete", "wohnung", "bude", "versicherung",
  "rate", "kita", "heizung", "garage", "krankenkasse", "pflege", "wohnungsmiete",
];

function istWeiblich(name) {
  return WEIBLICHE_FIXKOSTEN.includes(String(name || "").trim().toLowerCase());
}

function fixNameMit(artikel, name) {
  // "deiner Miete" — oder, wenn wir das Wort nicht kennen, "deiner Rechnung für Strom".
  return istWeiblich(name) ? `${artikel} ${name}` : `${artikel} Rechnung für ${name}`;
}

/* Einen Betrag ins Verhältnis zur größten notwendigen Ausgabe setzen.
   `fix` ist { label, betrag } — meist die Miete, sonst Strom oder Einkauf.

   Unter 10% bleibt es still: "3% deiner Miete" wäre kein Argument,
   sondern nur eine Zahl, und die App soll nicht bei jedem Kaffee reden. */
function mietenText(betrag, fix) {
  if (!fix || !(fix.betrag > 0) || !(betrag > 0)) return "";
  const anteil = betrag / fix.betrag;
  if (anteil < 0.1) return "";
  const name = (fix.label && fix.label !== "(ohne Namen)") ? fix.label : "Fixkosten";
  if (anteil < 1)  return Math.round(anteil * 100) + "% " + fixNameMit("deiner", name);
  if (anteil < 10) return anteil.toFixed(1).replace(".", ",") + "× " + fixNameMit("deine", name);
  return Math.round(anteil) + "× " + fixNameMit("deine", name);
}

/* Der Maßstab für einen Betrag — in der Währung, die es bei DIESER
   Nutzerin überhaupt gibt.

   Wer arbeitet, versteht Arbeitsstunden am besten: das Geld ist schon
   verdient, der Preis steht auf der Uhr. Wer nicht arbeitet, bekommt den
   Vergleich mit der eigenen größten Rechnung. Und wenn weder Stundenlohn
   noch Fixkosten dastehen, sagen wir lieber nichts als etwas Erfundenes. */
function massstab(betrag, z) {
  const std = stundenText(betrag, z.stundenlohn);
  if (std) return std + " Arbeit";
  return mietenText(betrag, z.notwendige && z.notwendige[0]);
}

/* ------------------------------------------------------------
   7c. DER GEHALTSZYKLUS — der Kalender, nach dem du wirklich lebst.

   Dein Geld läuft nicht von Monatsanfang zu Monatsende. Es läuft von
   Gehalt zu Gehalt. Wer am 28. sein Gehalt bekommt, hat am 3. keinen
   „neuen Monat" — der ist längst zu einem Drittel gelebt und bezahlt.
   Ein Finanzplaner, der am 1. bei null anfängt, misst deshalb einen
   Monat, den es für dich gar nicht gibt.

   Hier steht die Umrechnung: aus dem Tag, an dem dein Gehalt kam, und
   dem heutigen Datum wird „Tag 7 von 31, noch 24 Tage bis zum nächsten
   Gehalt".

   Der Zyklus startet auf Ansage, nicht nach Kalender: Du drückst
   „Gehalt ist da", und ab diesem Tag zählt die App. Ein fest
   eingestellter Zahltag hätte bei jeder geraten, deren Geld mal am 27.
   und mal am 30. kommt, und zwar lautlos falsch. Ein Knopf weiß es
   immer, und er kostet dich einen Druck im Monat.
   ------------------------------------------------------------ */

/* Ein Datum als "2026-07-25" — ohne Uhrzeit, ohne Zeitzone. So bleibt ein
   gespeicherter Zyklusstart nach dem Neuladen derselbe Tag.

   `toISOString()` wäre hier eine Falle: Das rechnet auf Weltzeit um, und
   der deutsche 25. Juli um Mitternacht wird darin zum 24. Juli. */
function alsTagesId(d) {
  const monat = String(d.getMonth() + 1).padStart(2, "0");
  const tag   = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${monat}-${tag}`;
}

/* Und zurück. Gibt `null`, wenn dort nichts Brauchbares steht — dann zeigt
   die App die Einladung, statt mit einem kaputten Datum zu rechnen. */
function ausTagesId(id) {
  const teile = String(id || "").split("-").map(Number);
  if (teile.length !== 3 || teile.some(n => !Number.isFinite(n))) return null;
  const d = new Date(teile[0], teile[1] - 1, teile[2]);
  return isNaN(d.getTime()) ? null : d;
}

/* Volle Tage zwischen zwei Daten.

   Beide werden vorher auf Mitternacht gesetzt, damit die Uhrzeit das
   Ergebnis nicht verschiebt. Das Math.round fängt zusätzlich die Sommerzeit
   ab: In der Umstellungsnacht hat ein Tag 23 oder 25 Stunden, und ohne
   Rundung käme dann 6,96 statt 7 heraus. */
function tageZwischen(von, bis) {
  const a = new Date(von.getFullYear(), von.getMonth(), von.getDate());
  const b = new Date(bis.getFullYear(), bis.getMonth(), bis.getDate());
  return Math.round((b - a) / 86400000);
}

// Ein Datum als "28. August" anzeigen.
function datumLesbar(d) {
  return d.getDate() + ". " + MONATSNAMEN[d.getMonth()];
}

// Aus "2026-08" ein kurzes "Aug 26" machen — für enge Stellen wie Auswahlfelder.
function monatKurz(id) {
  const [jahr, monat] = String(id).split("-").map(Number);
  return MONATE_KURZ[monat - 1] + " " + String(jahr).slice(2);
}

/* Wo im Gehaltszyklus stehst du heute?

   Gibt `null` zurück, solange kein Zyklus gestartet wurde — dann zeigt die
   Karte die Einladung mit dem Knopf, statt mit einem geratenen Datum zu
   rechnen.

   Das Ende ist eine Annahme: der gleiche Tag im Folgemonat. Mehr weiß die
   App nicht, bevor du das nächste Mal drückst, und für die Frage „wie viel
   Zeit ist rum" stimmt diese Annahme auf ein, zwei Tage genau.

   `ueberfaellig` ist der ehrliche Sonderfall. Ist der angenommene Endtag
   vorbei, ist entweder das Gehalt noch nicht da oder der Knopf noch nicht
   gedrückt. Beides sagt die Karte lieber, als „morgen kommt dein Gehalt"
   zu behaupten. */
function gehaltszyklus(heute) {
  const start = ausTagesId(STATE.einstellungen.zyklusStart);
  if (!start) return null;

  const jetzt = heute || new Date();
  const heuteNull = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate());
  /* Gleicher Tag im Folgemonat. Den Jahreswechsel rechnet der Browser von
     allein, und ein 31. Januar landet im Februar auf dem 2. oder 3. März —
     für die Länge eines Zyklus ist das genau genug. */
  const ende = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());

  const laenge = tageZwischen(start, ende);
  const tag    = tageZwischen(start, heuteNull) + 1; // am Starttag selbst ist Tag 1
  return {
    start: start,
    ende: ende,
    laenge: laenge,
    tag: tag,
    restTage: Math.max(0, laenge - tag),  // volle Tage, die noch kommen
    // Gedeckelt, damit ein überfälliger Zyklus den Balken nicht sprengt.
    anteil: laenge > 0 ? Math.min(1, tag / laenge) : 0,
    ueberfaellig: heuteNull > ende,
  };
}

/* ------------------------------------------------------------
   7d. PAUSE — für alles, was eine Weile stillsteht.

   Ein pausiertes Abo ist kein gekündigtes Abo. Das Gym ruht diesen einen
   Monat, im nächsten geht es weiter, und beides muss die App wissen: Der
   Beitrag darf jetzt in KEINE Zahl eingehen, der Vertrag aber trotzdem in
   der Liste stehen bleiben.

   Deshalb speichert die Pause nicht „ja/nein", sondern einen Endmonat.
   Eine Pause ohne Ende wäre eine Kündigung, die man vergisst — und dann
   rechnet die App monatelang zu gut. Läuft der Endmonat ab, endet die Pause
   beim Monatswechsel von allein.
   ------------------------------------------------------------ */
function istPausiert(posten, monatId) {
  const bis = posten && posten.pausiertBis;
  if (!bis) return false;
  // Die Pause gilt bis EINSCHLIESSLICH `bis`.
  return monateBis(monatId, bis) >= 0;
}

/* ------------------------------------------------------------
   8. NEUEN MONAT bauen.
   Alle wiederkehrenden Kategorien (Fixkosten, Abos, Versicherungen)
   werden aus dem Vormonat übernommen — inklusive Rhythmus. Genau
   das ist der Punkt: du tippst deine Miete nur EINMAL ein.
   ------------------------------------------------------------ */
function neuerMonat(id, startguthaben, vorlage) {
  const monat = {
    id: id,
    // Gerundet, damit sich die Nachkommastellen der Rechnung nicht von Monat
    // zu Monat weiterschleppen — siehe runde().
    startBalance: runde(startguthaben),
    /* Der ANKER: „Hier weiß ich, was wirklich auf dem Konto lag."

       Steht hier eine Zahl, fängt die Kontostand-Kette in diesem Monat neu
       an und rechnet ab hier vorwärts. Steht hier null, erbt der Monat den
       Schlussstand seines Vormonats — das ist der Normalfall.

       Der allererste Monat der App ist immer ein Anker: Vor ihm gibt es
       nichts, aus dem er erben könnte. Jeder Folgemonat startet ohne, denn
       seine Zahl ist ja gerechnet und nicht gewusst. */
    anchorBalance: vorlage ? null : runde(startguthaben),
    /* Was dir zugeflossen ist, ohne dass du etwas dafür getan hast.

       Startet in JEDEM Monat leer, auch wenn die Vorlage voll war: Ein
       geschenkter Moment gehört dem Monat, in dem er passiert ist. Ihn
       mitwandern zu lassen wie eine Miete würde ihn zur Gewohnheit machen
       und ihm genau das nehmen, was ihn besonders macht. */
    zufluesse: [],
  };
  KATEGORIEN.forEach(kat => {
    const uebernehmen = kat.wiederkehrend && vorlage && Array.isArray(vorlage[kat.key]);
    monat[kat.key] = uebernehmen
      ? vorlage[kat.key].map(p => {
          const kopie = { ...p, id: neueId() }; // Kopie mit frischer ID
          /* Eine abgelaufene Pause endet hier von selbst. Genau dafür steht in
             der Pause ein Endmonat und kein bloßes Häkchen: Das Gym läuft im
             nächsten Monat wieder, ohne dass du daran denken musst. */
          if (kopie.pausiertBis && monateBis(id, kopie.pausiertBis) < 0) kopie.pausiertBis = "";
          return kopie;
        })
      : [];
  });
  return monat;
}

/* ------------------------------------------------------------
   9. STATE laden, aufräumen & speichern

   Wichtig: ältere Stände kennen weder Versicherungen noch Rhythmen
   noch Ziele. `normalisiereMonat` füllt fehlende Felder auf, damit
   ein alter Stand nicht die Seite zerschießt. Metapher: ein alter
   Zettel wird auf das neue Formular übertragen, kein Feld bleibt leer.
   ------------------------------------------------------------ */

/* Merker für den einen Moment beim Update von „eingefrorene Zahlen" auf
   „gerechnete Kette". Er lebt nur bis zum ersten render() und wird bewusst
   nicht mitgespeichert: Liefe die Absicherung bei jedem Laden erneut, würde
   sie jede Korrektur sofort wieder festnageln.

   Steht hier oben und nicht bei laden(): `let` gilt erst ab seiner Zeile,
   und migriere() greift schon in der nächsten Zeile darauf zu. */
let ankerPruefenNoetig = false;

let STATE = laden();

/* Ein Sparziel ist das EINE Ding, auf das du zusparst — eine Reise, ein
   Führerschein, ein Umzug. Bewusst nur eines: Fünf halbvolle Fortschritts-
   balken nebeneinander sind kein Plan, sondern eine Wunschliste.

   `betrag` 0 heißt: es gibt gerade kein Ziel. Dann bleibt die Karte leer
   und der Schalter an den Sparposten verschwindet. */
function leeresSparziel() {
  return {
    label: "",     // wie es heißt ("Reise nach Lissabon")
    betrag: 0,     // was es kostet
    termin: "",    // Wunschmonat als "JJJJ-MM", leer = ohne festen Termin
    start: 0,      // was du dafür schon zurückgelegt hattest, bevor die App davon wusste
  };
}

/* Ein gespeichertes Sparziel auf saubere Werte bringen. */
function sauberesSparziel(roh) {
  const s = (roh && typeof roh === "object") ? roh : {};
  const termin = typeof s.termin === "string" && /^\d{4}-\d{2}$/.test(s.termin) ? s.termin : "";
  return {
    label:  typeof s.label === "string" ? s.label.slice(0, 60) : "",
    betrag: Math.max(0, Number(s.betrag) || 0),
    termin: termin,
    start:  Math.max(0, Number(s.start) || 0),
  };
}

function standardEinstellungen() {
  return {
    wochenstunden: 40,      // für die Lebenszeit-Umrechnung
    notgroschenStart: 0,    // was du schon zurückgelegt hast, außerhalb der App
    zugeklappt: [],         // welche Kategorie-Karten du eingeklappt hast
    eigeneAffirmationen: [],  // nur deine selbst getippten; die 111 stehen im Programm
    sparziel: leeresSparziel(), // dein eines Ziel, auf das du zusparst
    zyklusStart: "",        // "" = noch nie gedrückt, sonst "2026-07-25"
  };
}

/* Einen gespeicherten Zyklusstart auf einen gültigen Wert bringen.
   Alles, was sich nicht als Datum lesen lässt, gilt als „noch nie gedrückt" —
   dann zeigt die Zyklus-Karte die Einladung statt geratener Zahlen. */
function saubererZyklusStart(roh) {
  return ausTagesId(roh) ? String(roh) : "";
}

/* Eine Liste von Affirmationen aufräumen: nur echte Sätze, gekürzt,
   ohne Leerzeichen am Rand und ohne Dopplungen. */
function saubereAffirmationen(liste) {
  const gesehen = new Set();
  return (Array.isArray(liste) ? liste : [])
    .filter(s => typeof s === "string")
    .map(s => s.trim().slice(0, AFFIRMATION_MAX))
    .filter(s => {
      if (s === "" || gesehen.has(s)) return false;
      gesehen.add(s);
      return true;
    });
}

function leererStand() {
  return {
    version: 3,
    einstellungen: standardEinstellungen(),
    currentMonth: neuerMonat(monatsId(new Date()), 0, null),
    archive: [],
    onboardingGesehen: false,
    letzterAbschluss: "",
  };
}

function laden() {
  try {
    const roh = localStorage.getItem(SPEICHER_SCHLUESSEL);
    if (!roh) return leererStand();
    return migriere(JSON.parse(roh)) || leererStand();
  } catch (e) {
    console.warn("Konnte gespeicherten Stand nicht lesen:", e);
    return leererStand();
  }
}

// Einen gespeicherten Stand auf die aktuelle Struktur heben.
function migriere(daten) {
  if (!daten || typeof daten !== "object" || !daten.currentMonth) return null;
  const heute = monatsId(new Date());

  const archive = (Array.isArray(daten.archive) ? daten.archive : []).map(eintrag => {
    const id = (eintrag && eintrag.id) || heute;
    return {
      id: id,
      summary: (eintrag && eintrag.summary) || {},
      snapshot: normalisiereMonat(eintrag && eintrag.snapshot, id),
    };
  });

  const aktuellerMonat = normalisiereMonat(daten.currentMonth, heute);

  /* Der Kontostand war früher eine Kette aus eingefrorenen Zahlen: Jeder
     Monat schrieb seinen Schlussstand fest in den nächsten. Jetzt wird die
     Kette gerechnet, und dafür braucht sie genau einen Startpunkt.

     Ein Stand aus der Zeit davor hat noch keinen. Also setzen wir ihn hier
     einmalig: Der ÄLTESTE bekannte Monat wird zum Anker, mit dem Wert, der
     ohnehin schon in ihm stand. Von dort rechnet die Kette vorwärts und kommt
     bei denselben Zahlen heraus wie vorher — denn genau diese Rechnung stand
     ja hinter den eingefrorenen Werten.

     Archiv ist neueste-zuerst sortiert, der älteste steht also ganz hinten.
     Gibt es kein Archiv, ist der laufende Monat selbst der Anfang.

     Die Prüfung „hat schon irgendwer einen Anker?" verhindert, dass dieser
     Notnagel bei jedem Laden erneut zuschlägt und einen später gesetzten
     Anker überschreibt. */
  const alleMonate = archive.map(e => e.snapshot).concat([aktuellerMonat]);
  const hatAnker = alleMonate.some(m => m.anchorBalance !== null);
  if (!hatAnker && alleMonate.length > 0) {
    const aeltester = archive.length > 0 ? archive[archive.length - 1].snapshot : aktuellerMonat;
    aeltester.anchorBalance = runde(aeltester.startBalance);
    /* „Kommt dieselbe Zahl heraus" gilt nur, wenn jeder Archiv-Monat seinen
       vollständigen Schnappschuss hat. Sehr alte Stände haben da Lücken, und
       dann rechnet die Kette an einer leeren Stelle vorbei und landet woanders.

       Deshalb wird nach dem Laden einmal nachgerechnet und im Zweifel auch der
       laufende Monat verankert — siehe ankerAbsichern(). Ein Update darf die
       Zahl, die sie gestern gesehen hat, nicht verschieben. */
    ankerPruefenNoetig = true;
  }

  const roheEinst = (daten.einstellungen && typeof daten.einstellungen === "object")
    ? daten.einstellungen : {};
  const stunden = Number(roheEinst.wochenstunden);

  return {
    version: 3,
    einstellungen: {
      wochenstunden: (stunden > 0 && stunden <= 80) ? stunden : 40,
      notgroschenStart: Math.max(0, Number(roheEinst.notgroschenStart) || 0),
      // Nur Kategorie-Schlüssel durchlassen, die es wirklich gibt.
      zugeklappt: (Array.isArray(roheEinst.zugeklappt) ? roheEinst.zugeklappt : [])
        .filter(key => KATEGORIEN.some(kat => kat.key === key)),
      /* Hier stehen NUR selbst getippte Sätze. Die 111 Vorschläge liegen im
         Programm und sind ohnehin immer da.

         Das alte Feld `affirmationen` wird bewusst nicht mehr gelesen: Dort
         lagen Kopien der Vorschläge von damals, teils in Fassungen, die es
         längst nicht mehr gibt. Übernähmen wir sie, stünden sie neben den
         aktuellen und die Liste würde bei jeder Änderung länger statt richtig.
         Ein neuer Feldname zieht die Grenze sauber, ohne raten zu müssen. */
      eigeneAffirmationen: saubereAffirmationen(roheEinst.eigeneAffirmationen),
      // Ältere Stände kennen kein Sparziel — dann steht hier eben keines.
      sparziel: sauberesSparziel(roheEinst.sparziel),
      /* … und keinen gestarteten Zyklus. Ein `zahltag` aus älteren Ständen
         wird bewusst nicht umgerechnet: Der Zyklus startet jetzt auf Ansage,
         und ein einziger Knopfdruck ist ehrlicher als ein Datum, das die App
         aus einer alten Einstellung zurückrechnet. */
      zyklusStart: saubererZyklusStart(roheEinst.zyklusStart),
    },
    currentMonth: aktuellerMonat,
    archive: archive,
    onboardingGesehen: daten.onboardingGesehen === true,
    /* Wann zuletzt ein Monat abgeschlossen wurde, als "JJJJ-MM-TT".
       Daraus weiß die App, ob seit deinem letzten Gehalt schon abgeschlossen
       wurde — und erinnert dich nur dann, wenn sie es WIRKLICH weiß. Bei
       älteren Ständen steht hier nichts, und dann schweigt sie lieber. */
    letzterAbschluss: typeof daten.letzterAbschluss === "string" ? daten.letzterAbschluss : "",
  };
}

// Einen Monat auf Vollständigkeit bringen: alle Kategorien vorhanden,
// alle Posten mit ID, Rhythmus und Fälligkeit versehen.
function normalisiereMonat(monat, ersatzId) {
  const roh = (monat && typeof monat === "object") ? monat : {};
  // Ein `ziel` aus alten Ständen wird hier stillschweigend fallengelassen —
  // das selbstgesetzte Ziel gibt es nicht mehr, gemessen wird an der Regel.
  const sauber = {
    id: typeof roh.id === "string" ? roh.id : ersatzId,
    /* Gerundet gelesen: Ältere Stände haben durch den Monatswechsel
       Nachkommastellen wie 1066,1399999999 angesammelt. Beim ersten Laden
       nach diesem Update ist das ein für alle Mal weg. */
    startBalance: runde(roh.startBalance),
    /* Der Anker — siehe neuerMonat(). Nur eine echte Zahl zählt: null,
       fehlend oder Unsinn heißt gleichermaßen „kein Anker, erbe vom
       Vormonat". Deshalb hier die ausdrückliche Prüfung auf eine Zahl statt
       des sonst üblichen `|| 0` — die 0 ist ein gültiger Anker
       („Konto stand auf genau null") und darf nicht aus Versehen entstehen. */
    anchorBalance: typeof roh.anchorBalance === "number" && Number.isFinite(roh.anchorBalance)
      ? runde(roh.anchorBalance)
      : null,
    /* Stände von vor dieser Karte kennen das Feld nicht. Dann steht hier
       eben eine leere Liste — der Monat ist deshalb nicht kaputt, er hat
       nur noch nichts gezählt. */
    zufluesse: (Array.isArray(roh.zufluesse) ? roh.zufluesse : []).map(saubererZufluss),
  };
  KATEGORIEN.forEach(kat => {
    const liste = Array.isArray(roh[kat.key]) ? roh[kat.key] : [];
    sauber[kat.key] = liste.map(p => normalisierePosten(p, kat, sauber.id));
  });
  return sauber;
}

/* Ein einzelner Zufluss auf saubere Werte gebracht.

   Der Betrag darf ausdrücklich 0 sein: Blumen ohne Preisschild sind genauso
   ein Moment wie zwanzig Euro. Deshalb ist der Wert hier optional und die
   Anzahl zählt trotzdem mit. */
function saubererZufluss(roh) {
  const p = (roh && typeof roh === "object") ? roh : {};
  return {
    id: p.id ? String(p.id) : neueId(),
    label: typeof p.label === "string" ? p.label : "",
    amount: Math.max(0, Number(p.amount) || 0),
  };
}

function normalisierePosten(roh, kat, monatId) {
  const p = (roh && typeof roh === "object") ? roh : {};
  const posten = {
    id: p.id ? String(p.id) : neueId(),
    label: typeof p.label === "string" ? p.label : "",
    amount: Number(p.amount) || 0,
  };
  if (kat.schalter) {
    const feld = kat.schalter.feld;
    /* Steht im gespeicherten Posten schon ja oder nein, gilt das.

       Fehlt das Feld ganz, ist der Stand älter als das Häkchen. Dann zählt,
       was die App damals angenommen hat (`altHaken`): Einnahmen galten alle
       als Arbeitseinkommen, Versicherungen alle als notwendig. Ohne diese
       Zeile würden alte Stände beim Laden still ihre Arbeitszeit-Rechnung
       verlieren und ihre Versicherungen plötzlich als Ausnahme zählen. */
    posten[feld] = typeof p[feld] === "boolean" ? p[feld] : !!kat.altHaken;
  }
  if (kat.wiederkehrend) {
    posten.rhythmus = INTERVALL[p.rhythmus] ? p.rhythmus : "monatlich";
    const f = Number(p.faellig);
    posten.faellig = (f >= 1 && f <= 12) ? f : monatsNummer(monatId);
    /* Bis wann pausiert? Leer = läuft normal. Stände von vor der Pause-Funktion
       kennen das Feld nicht — dann steht hier eben nichts, und alles rechnet
       genau wie bisher. */
    posten.pausiertBis = /^\d{4}-\d{2}$/.test(p.pausiertBis) ? p.pausiertBis : "";
  }
  return posten;
}

function speichern() {
  localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(STATE));
}

/* ------------------------------------------------------------
   10. RECHNEN — das Herz der App.

   Zwei Sichten auf dieselben Zahlen, und beide werden gebraucht:

   UMLAGE  — jährliche und vierteljährliche Beträge werden auf
             Monate verteilt (360 € Versicherung = 30 €/Monat).
             Damit bleiben deine Prozente über die Monate stabil
             und ein einzelner Oktober verzerrt nichts.

   REAL    — was diesen Monat wirklich vom Konto geht. Nur das
             darf in den Kontostand, denn deine Bank legt nichts um.
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   10a. DIE KONTOSTAND-KETTE

   Warum es sie gibt: Früher schrieb jeder Monatsabschluss den errechneten
   Kontostand als feste Zahl in den nächsten Monat. Der Juli hatte sich das
   Ergebnis vom Juni abgeschrieben und fragte nie wieder nach. Ein Zahlendreher
   im Juni war damit für alle Zeit in jedem Folgemonat drin — es gab keine
   Stelle, an der man ihn hätte herausnehmen können.

   Jetzt wird nichts mehr abgeschrieben, sondern gerechnet. Und zwar bei jeder
   Anzeige neu, von vorne:

     Anfang Juli = Ende Juni = Anfang Juni + Junis Bewegungen = …

   … zurück bis zum letzten ANKER. Ein Anker ist ein Monat, in dem du gesagt
   hast „hier weiß ich, was wirklich auf dem Konto lag". Ab dort läuft die
   Rechnung vorwärts. Korrigierst du irgendwo etwas, heilt alles danach von
   selbst mit — genau das war vorher unmöglich.

   Metapher: Vorher war es eine Reihe von Zetteln, auf denen jeder nur das
   Ergebnis des vorigen abgeschrieben hatte. Jetzt ist es eine Rechnung, die
   man von oben nachlesen kann — und die Zettel liegen alle noch da.

   Möglich ist das, weil beim Abschluss ohnehin eine vollständige Kopie jedes
   Monats ins Archiv wandert (`snapshot`). Die Daten waren immer da, sie
   wurden nur nie wieder angesehen.

   Zurück kommt eine Tabelle: Monats-ID → { start, ende, ausAnker, vonMonat }.
   ------------------------------------------------------------ */
function kontostandKette() {
  // Archiv ist neueste-zuerst gespeichert. Gerechnet wird chronologisch,
  // also älteste zuerst — deshalb einmal umdrehen.
  const monate = (STATE.archive || []).map(e => e.snapshot).reverse();
  monate.push(STATE.currentMonth);

  const kette = {};
  let vorherEnde = null;   // Schlussstand des Vormonats
  let vorherId = null;

  monate.forEach(monat => {
    if (!monat || !monat.id) return;

    /* Drei Quellen für den Startwert, in dieser Rangfolge:
       1. Ein gesetzter Anker — er sticht immer, denn er ist gewusst statt gerechnet.
       2. Der Schlussstand des Vormonats — der Normalfall.
       3. Das alte `startBalance`-Feld — nur beim allerersten Monat, falls
          die Migration keinen Anker setzen konnte. Reine Rückfalllinie. */
    const ausAnker = monat.anchorBalance !== null && monat.anchorBalance !== undefined;
    let start;
    if (ausAnker)              start = runde(monat.anchorBalance);
    else if (vorherEnde !== null) start = vorherEnde;
    else                       start = runde(monat.startBalance);

    /* Hier steckt der eigentliche Trick: rechne() bekommt den Startwert von
       außen gereicht und liest ihn NICHT aus dem Monat. Sonst müsste diese
       Funktion die gespeicherten Daten anfassen, um zu rechnen — und wer
       zum Rechnen schreibt, hat irgendwann zwei Wahrheiten. */
    const ende = rechne(monat, start).kontostand;

    kette[monat.id] = {
      start: start,
      ende: ende,
      ausAnker: ausAnker,
      // Aus welchem Monat der Startwert stammt — für den Satz „übernommen aus Juni".
      vonMonat: ausAnker ? null : vorherId,
    };

    vorherEnde = ende;
    vorherId = monat.id;
  });

  return kette;
}

/* Der Startwert für einen einzelnen Monat, ohne dass der Aufrufer die ganze
   Kette auseinandernehmen muss. Kennt die Kette den Monat nicht (dann ist er
   weder im Archiv noch der laufende), fällt sie auf sein altes Feld zurück. */
/* Die Sicherung für den Umstieg von den eingefrorenen Zahlen auf die Kette.

   Läuft genau einmal, direkt nach dem ersten Laden eines alten Standes. Sie
   rechnet die Kette einmal probeweise durch und vergleicht ihr Ergebnis für
   den laufenden Monat mit der Zahl, die dort eingefroren stand.

   Stimmen beide überein, war das Archiv vollständig und die Kette darf
   allein weiterrechnen. Weichen sie ab — weil ein alter Schnappschuss Lücken
   hat —, bekommt der laufende Monat seinen bisherigen Wert als Anker. Dann
   sieht sie nach dem Update exakt dieselbe Zahl wie davor, und die Kette
   greift ab dem nächsten Monatsabschluss.

   Der Grundsatz dahinter: Ein Update darf Zahlen besser machen, aber niemals
   heimlich verschieben. */
function ankerAbsichern() {
  if (!ankerPruefenNoetig) return;
  ankerPruefenNoetig = false;

  const monat = STATE.currentMonth;
  const vorher = runde(monat.startBalance);
  const gerechnet = kontostandKette()[monat.id];

  if (gerechnet && Math.abs(gerechnet.start - vorher) > 0.005) {
    console.info(
      `girl math: Der gerechnete Startwert (${gerechnet.start}) weicht vom bisher ` +
      `gespeicherten (${vorher}) ab — vermutlich fehlen einem Archiv-Monat Daten. ` +
      `Der bisherige Wert bleibt stehen und ist jetzt als Startwert gesetzt.`
    );
    monat.anchorBalance = vorher;
    speichern();
  }
}

function startwertFuer(monatId, kette) {
  const glied = kette && kette[monatId];
  if (glied) return glied.start;
  const monat = monatId === STATE.currentMonth.id
    ? STATE.currentMonth
    : (STATE.archive || []).find(e => e.id === monatId);
  return runde(monat ? (monat.snapshot || monat).startBalance : 0);
}

/* Die Zahlen des laufenden Monats — immer mit dem Startwert aus der Kette.
   Alle Stellen, die früher `rechne(STATE.currentMonth)` gerufen haben, gehen
   jetzt hier durch, damit keine davon einen veralteten Startwert erwischt. */
function rechneAktuell() {
  const kette = kontostandKette();
  return rechne(STATE.currentMonth, startwertFuer(STATE.currentMonth.id, kette));
}

/* `startUeberschreibung` ist der Startwert aus der Kontostand-Kette. Fehlt er,
   greift das im Monat gespeicherte `startBalance` — so bleiben ältere Aufrufe
   und die Tests gültig, die einen Monat für sich allein durchrechnen. */
function rechne(monat, startUeberschreibung) {
  const monatNr = monatsNummer(monat.id);

  const z = {
    gehalt: 0,            // ALLES, was reinkommt — auch Bürgergeld, Geschenke, Verkäufe
    arbeitsEinkommen: 0,  // nur das, wofür du wirklich Stunden gearbeitet hast
    gespart: 0,           // alles Zurückgelegte zusammen
    gespartZiel: 0,       // … davon fürs Sparziel
    gespartPuffer: 0,     // … davon für den Notgroschen
    notwendigUmlage: 0, nichtUmlage: 0,   // auf den Monat verteilt
    notwendigReal: 0,   nichtReal: 0,     // was wirklich abgeht
    faelligJetzt: [],                     // große Brocken DIESEN Monat
    faelligBald: [],                      // … und in den nächsten zwei
    ruecklageProMonat: 0,                 // was du zurücklegen solltest
    ruecklagePosten: [],                  // … und woraus sich diese Summe zusammensetzt
    ausnahmen: [],                        // alle Ausnahmen einzeln (für die Rangliste)
    notwendige: [],                       // Miete, Strom & Co. (als Vergleichsmaßstab)
    vertraege: [],                        // Abos + Versicherungen (Kündigungs-Blick)
    pausiert: [],                         // was diesen Monat stillsteht
    pausiertSumme: 0,                     // … und was dadurch bei dir bleibt
  };

  KATEGORIEN.forEach(kat => {
    (monat[kat.key] || []).forEach(posten => {
      const betrag = Number(posten.amount) || 0;

      /* Pausiert? Dann zählt dieser Posten in KEINE einzige Zahl — nicht in
         die Prozente, nicht in den Kontostand, nicht in den Kündigungs-Blick.
         Er wird nur gemerkt, damit die App sagen kann, was dir das spart.

         Diese Prüfung steht ganz oben, weil sie sonst an vier Stellen
         wiederholt werden müsste und irgendwann eine davon vergessen wird. */
      if (kat.wiederkehrend && istPausiert(posten, monat.id)) {
        const proMonat = betrag / (INTERVALL[posten.rhythmus] || 1);
        z.pausiert.push({
          label: posten.label || "(ohne Namen)",
          umlage: proMonat,
          bis: posten.pausiertBis,
        });
        z.pausiertSumme += proMonat;
        return;
      }

      if (kat.typ === "positiv") {
        // In die Prozente geht ALLES ein, was du zur Verfügung hast — Bürgergeld
        // und Flohmarkt-Geld zählen genauso wie Gehalt. In den Stundenlohn geht
        // nur das, wofür du tatsächlich gearbeitet hast: Ein Geburtstagsgeschenk
        // durch deine Wochenstunden zu teilen wäre schlicht falsch gerechnet.
        z.gehalt += betrag;
        if (posten.gearbeitet) z.arbeitsEinkommen += betrag;
        return;
      }
      /* Gespartes zählt einmal in die Gesamtsumme (für die Sparquote) und
         zusätzlich in genau einen der beiden Töpfe. Ohne Häkchen geht es an
         den Notgroschen — das ist die Stellung, die alle bisherigen Einträge
         haben, und deshalb ändert sich für einen alten Stand nichts. */
      if (kat.typ === "sparen") {
        z.gespart += betrag;
        if (posten.fuersZiel) z.gespartZiel += betrag;
        else                  z.gespartPuffer += betrag;
        return;
      }

      // Notwendig oder Ausnahme? Bei Abos/Versicherungen entscheidet das Häkchen.
      const istNotwendig = !istAusnahmePosten(kat, posten);

      // Rhythmus nur bei wiederkehrenden Kategorien, sonst schlicht monatlich.
      const intervall = kat.wiederkehrend ? (INTERVALL[posten.rhythmus] || 1) : 1;
      const umlage = betrag / intervall;
      const gehtDiesenMonatAb = intervall === 1 || istFaelligIn(posten, monatNr, intervall);
      const real = gehtDiesenMonatAb ? betrag : 0;

      if (istNotwendig) { z.notwendigUmlage += umlage; z.notwendigReal += real; }
      else              { z.nichtUmlage     += umlage; z.nichtReal     += real; }

      // Deine größte notwendige Ausgabe merken — meistens die Miete. Sie ist
      // der ehrlichste Vergleichsmaßstab, den die App hat: eine Zahl, die du
      // selbst eingetragen hast und die niemand wegdiskutieren kann.
      if (istNotwendig && betrag > 0) {
        z.notwendige.push({ label: posten.label || "(ohne Namen)", betrag: umlage });
      }

      // Für die Rangliste: jede einzelne Ausnahme merken.
      if (!istNotwendig && betrag > 0) {
        z.ausnahmen.push({ label: posten.label || "(ohne Namen)", betrag: umlage, kategorie: kat.titel });
      }

      // Für den Kündigungs-Blick: alles, was ein Vertrag ist.
      if (kat.vertrag && betrag > 0) {
        z.vertraege.push({
          label: posten.label || "(ohne Namen)",
          proMonat: umlage,
          proJahr: umlage * 12,
          notwendig: istNotwendig,
          rhythmus: posten.rhythmus,
          kategorie: kat.titel,
        });
      }

      // Nur nicht-monatliche Posten sind eine Warnung wert.
      if (intervall > 1 && betrag > 0) {
        z.ruecklageProMonat += umlage;
        // Die Einzelteile mitnehmen, damit die Rücklagen-Karte die Rechnung
        // zeigen kann und nicht nur das Ergebnis.
        z.ruecklagePosten.push({
          label: posten.label || "(ohne Namen)",
          betrag: betrag,       // der volle Betrag, wie er auf der Rechnung steht
          intervall: intervall, // durch wie viele Monate er geteilt wird
          umlage: umlage,       // sein Anteil an einem einzelnen Monat
          rhythmus: posten.rhythmus,
        });
        const merker = {
          label: posten.label || "(ohne Namen)",
          betrag: betrag,
          rhythmus: posten.rhythmus,
        };
        if (gehtDiesenMonatAb) {
          z.faelligJetzt.push(merker);
        } else {
          // In welchem der nächsten zwei Monate schlägt er zu?
          for (let k = 1; k <= 2; k++) {
            const nr = ((monatNr - 1 + k) % 12) + 1;
            if (istFaelligIn(posten, nr, intervall)) {
              z.faelligBald.push({ ...merker, monatNr: nr });
              break;
            }
          }
        }
      }
    });
  });

  z.ausgegebenUmlage = z.notwendigUmlage + z.nichtUmlage;
  z.ausgegebenReal   = z.notwendigReal + z.nichtReal;
  z.uebrig           = z.gehalt - z.ausgegebenUmlage - z.gespart;
  z.startBalance     = runde(startUeberschreibung !== undefined && startUeberschreibung !== null
                              ? startUeberschreibung
                              : monat.startBalance);
  /* Der Kontostand ist eine VORSCHAU aufs Monatsende, keine Momentaufnahme:
     Hier ist schon alles abgezogen, was diesen Monat noch abgebucht wird.
     Deine Banking-App zeigt heute deshalb eine andere Zahl — und genau das
     sagt die Kontostand-Karte inzwischen auch dazu.

     Gerundet, weil diese Zahl beim Monatsabschluss zum neuen Startguthaben
     wird und sonst Nachkommastellen ansammelt. */
  z.kontostand       = runde(z.startBalance + z.gehalt - z.ausgegebenReal - z.gespart);
  z.imMinus          = z.kontostand < 0;

  // Prozente vom Gehalt — auf Basis der Umlage.
  const anteil = (wert) => (z.gehalt > 0 ? (wert / z.gehalt) * 100 : 0);
  z.quoteNotwendig = anteil(z.notwendigUmlage);
  z.quoteNicht     = anteil(z.nichtUmlage);   // <- das ist der Konsumopfer-Wert
  z.quoteSpar      = anteil(z.gespart);

  // Ohne Gehalt sind Prozente sinnlos — dann urteilen wir gar nicht erst.
  z.keinGehalt = z.gehalt <= 0;
  // Weicht die Umlage von der echten Abbuchung ab? Dann erklären wir das.
  z.hatUmlage = Math.abs(z.ausgegebenUmlage - z.ausgegebenReal) > 0.005;

  // Lebenszeit — ausdrücklich nur aus dem erarbeiteten Teil des Einkommens.
  z.stundenlohn = stundenlohnAus(z.arbeitsEinkommen, STATE.einstellungen.wochenstunden);
  // Kommt Geld rein, aber keins davon aus Arbeit? Dann sagen wir das offen,
  // statt still keine Arbeitszeit anzuzeigen.
  z.ohneArbeitseinkommen = z.gehalt > 0 && z.arbeitsEinkommen <= 0;

  /* Hältst du die 30%-Marke der Regel?

     Früher stand hier ein zweites, selbstgesetztes Ziel daneben. Das hat sich
     mit der Regel gebissen: Sein Startwert WAR die Regel, höher als 50% ging
     es nicht, und alles über 30% wurde ohnehin als zu hoch markiert. Zwei
     Messlatten, die dasselbe messen, messen am Ende nichts.

     Drei Zustände, nicht zwei: true = gehalten, false = gerissen,
     null = ohne Einnahmen gar nicht messbar. Ein Monat ohne Einnahmen darf dir
     nicht als Versagen angerechnet werden — die App wusste es einfach nicht. */
  z.regelErreicht = z.keinGehalt ? null : (z.quoteNicht <= REGEL.nicht);
  // Wie viel Euro liegst du über der 30%-Marke? 0, wenn du drunter bist.
  z.ueberRegel = Math.max(0, ((z.quoteNicht - REGEL.nicht) / 100) * z.gehalt);

  // Gleiche Bezeichnungen zusammenfassen, dann absteigend sortieren:
  // zweimal „Sushi" für 10 € und 20 € wird zu einem Eintrag „Sushi · 2× · 30 €".
  z.ausnahmen = fasseGleicheZusammen(z.ausnahmen);
  z.ausnahmen.sort((a, b) => b.betrag - a.betrag);
  z.notwendige.sort((a, b) => b.betrag - a.betrag);
  z.vertraege.sort((a, b) => b.proJahr - a.proJahr);

  /* Das Sparziel hängt hier mit dran, damit jede Anzeige es ohne eigene
     Rechnerei hat. Es muss ganz am Ende stehen: Es braucht die fertigen
     Summen oben (Ausnahmen für die Umleitung, notwendige Kosten für den
     Notgroschen-Vorrang). */
  z.sparziel = sparziel(z);

  return z;
}

/* Posten mit derselben Bezeichnung zu einem Eintrag verschmelzen.

   Verglichen wird kleingeschrieben und ohne Leerzeichen am Rand, damit
   „Sushi", „sushi " und „ SUSHI" als dasselbe erkannt werden. Angezeigt
   wird die erste Schreibweise, die vorkam.
   Metapher: alle Kassenzettel mit demselben Wort auf einen Stapel legen
   und den Stapel als Ganzes wiegen. */
function fasseGleicheZusammen(liste) {
  const stapel = new Map();
  liste.forEach(a => {
    const schluessel = a.label.trim().toLowerCase();
    const vorhanden = stapel.get(schluessel);
    if (vorhanden) {
      vorhanden.betrag += a.betrag;
      vorhanden.anzahl += 1;
    } else {
      stapel.set(schluessel, { label: a.label.trim(), betrag: a.betrag, anzahl: 1 });
    }
  });
  return [...stapel.values()];
}

// Zum Prozentsatz die passende Verdikt-Stufe finden.
function verdiktFuer(quoteNicht) {
  return VERDIKTE.find(v => quoteNicht <= v.grenze) || VERDIKTE[VERDIKTE.length - 1];
}

/* Die Munition, aus der ein Spruch schöpfen darf.

   Das ist der ganze Trick der App: Der Roast benutzt nicht irgendeine
   Formulierung, sondern DEINE Zahl. Wichtig dabei — die Zahl ist die
   Munition, nicht die Pointe. "624 € = 45 h Arbeit" ist eine Umrechnung
   und trifft niemanden. "Du bist da keine Kundin mehr, du bist Sponsorin"
   trifft, weil es die Rolle umdreht. Die Zahl macht es unwiderlegbar,
   das Bild macht es scharf. Beides zusammen, sonst keins von beiden.

     top       teuerster Ausnahme-Posten { label, betrag, anzahl }
     fix       größte notwendige Ausgabe { label, betrag } — meist die Miete
     summe     alle Ausnahmen zusammen
     jahr      dieselbe Summe aufs Jahr hochgerechnet
     anzahl    Stückzahl aller Ausnahmen (dreimal Sushi = drei)
     prozent   die Quote
     gespart   was diesen Monat zur Seite ging
     puffer    Notgroschen-Stand
     ueberRegel wie viel Euro über der 30%-Marke der Regel

   Zwei Maßstäbe, und der zweite ist der wichtigere:
     std/tage/topStd    Arbeitszeit — nur mit Erwerbseinkommen
     miete/topMiete     im Verhältnis zu deiner größten Rechnung — geht immer

   Fehlt eine Zahl, ist der Wert leer, 0 oder null — der Spruch, der sie
   bräuchte, meldet sich dann gar nicht erst. */
function spruchDaten(z) {
  const top = z.ausnahmen[0] || null;
  const fix = z.notwendige[0] || null;
  return {
    prozent: Math.round(z.quoteNicht),
    gehalt:  z.gehalt,
    summe:   z.nichtUmlage,
    jahr:    z.nichtUmlage * 12,
    gespart: z.gespart,
    puffer:  notgroschen(z).bisher,
    ueberRegel: z.ueberRegel,
    // Stückzahl über alle Sorten: dreimal Sushi zählt als drei, nicht als eins.
    // Muss zur "Ausnahme Nummer 7"-Zählung beim Eintippen passen.
    anzahl:  z.ausnahmen.reduce((s, a) => s + (a.anzahl || 1), 0),
    top:     top,
    fix:     fix,
    // Arbeitszeit — bleibt leer, wenn nichts als Arbeitseinkommen markiert ist.
    std:     stundenText(z.nichtUmlage, z.stundenlohn),
    tage:    arbeitstageText(z.nichtUmlage, z.stundenlohn),
    topStd:  top ? stundenText(top.betrag, z.stundenlohn) : "",
    // Verhältnis zur größten Rechnung — braucht nur die Fixkosten.
    miete:    mietenText(z.nichtUmlage, fix),
    topMiete: top ? mietenText(top.betrag, fix) : "",
  };
}

/* Einen der Sprüche dieser Stufe wählen — stabil pro Monat und Stufe.

   Reihenfolge ist wichtig: ERST fragen, wer heute überhaupt etwas zu sagen
   hat, DANN unter denen würfeln. Andersherum (würfeln, dann zum nächsten
   weiterrücken) käme der Spruch hinter einer Lücke doppelt so oft dran wie
   die anderen — und weil die datenkonkreten Sprüche vorne stehen und der
   allgemeine hinten, würde ausgerechnet der allgemeine den Roast verdrängen.

   Gewürfelt wird aus der Monats-ID, damit der Witz nicht bei jedem Klick
   wechselt. Metapher: einmal in die Runde fragen, wer etwas beizutragen
   hat, und aus den Gemeldeten einen dranehmen. */
function spruchFuer(verdikt, monatId, daten) {
  // Ein Spruch darf beides sein: eine Funktion, die mit deinen Zahlen rechnet,
  // ODER schlicht ein fester Satz. Wenn du schnell eine Zeile dazwischen-
  // schreiben willst, soll dich nicht die Schreibweise aufhalten.
  const moeglich = verdikt.sprueche
    .map(s => (typeof s === "function" ? s(daten) : s))
    .filter(Boolean);
  if (moeglich.length === 0) return "";
  return moeglich[textZuZahl(monatId + "|" + verdikt.stufe) % moeglich.length];
}

/* Wie viele abgeschlossene Monate in Folge bist du unter der 30%-Marke
   geblieben? Wir laufen das Archiv von vorne (= neuester Monat) durch und
   hören beim ersten Monat auf, in dem du drüber warst.

   `regelErreicht` gibt es erst seit dem Wegfall des selbstgesetzten Ziels.
   Ältere Archiv-Einträge haben stattdessen `zielErreicht` — die zählen wir
   weiter mit, sonst stünde eine ehrlich erarbeitete Serie plötzlich bei 0. */
function serieLaenge() {
  let n = 0;
  for (const eintrag of STATE.archive) {
    const s = eintrag.summary;
    const geschafft = s && (s.regelErreicht !== undefined ? s.regelErreicht : s.zielErreicht);
    if (geschafft === true) n++;
    else break;
  }
  return n;
}

/* Was in einem Monat in genau einen der beiden Spartöpfe ging.
   `fuersZiel` true = Sparziel, false = Notgroschen. */
function sparenIn(monat, fuersZiel) {
  const liste = (monat && Array.isArray(monat.sparen)) ? monat.sparen : [];
  return liste
    .filter(p => !!p.fuersZiel === fuersZiel)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
}

/* Gibt es überhaupt ein Sparziel? Ohne eines gehört alles Gesparte dem
   Notgroschen — auch das, was früher mal fürs Ziel weggelegt wurde. Sonst
   läge nach dem Löschen eines Ziels Geld herum, das zu keinem Topf mehr
   zählt und in keinem Balken auftaucht. */
function sparzielAktiv() {
  return (Number((STATE.einstellungen.sparziel || {}).betrag) || 0) > 0;
}

/* Dasselbe für einen abgeschlossenen Monat aus dem Archiv.

   Der Fallback ist wichtig: Monate, die vor dem Sparziel abgeschlossen
   wurden, kennen nur `gespart`. Alles darin war damals Notgroschen, also
   wird es auch heute als Notgroschen gezählt — sonst würde ein alter
   Stand rückwirkend seinen Puffer verlieren. */
function gespartAusArchiv(eintrag, fuersZiel) {
  const s = (eintrag && eintrag.summary) || {};
  if (fuersZiel) return Number(s.gespartZiel) || 0;
  // Ohne aktives Ziel fällt auch das damalige Ziel-Sparen an den Notgroschen.
  if (!sparzielAktiv()) return Number(s.gespart) || 0;
  return Number(s.gespartPuffer ?? s.gespart) || 0;
}

/* Der Notgroschen: drei Monatsausgaben als Puffer. Die App kennt deine
   notwendigen Monatskosten schon, also rechnet sie dir das Ziel selbst
   aus. Zusammengezählt wird alles, was du je zurückgelegt hast — die
   abgeschlossenen Monate plus der laufende.

   Nicht mitgezählt wird, was du fürs Sparziel weglegst. Das Geld für die
   Reise ist kein Puffer: Wenn die Waschmaschine kaputtgeht, ist entweder
   die Reise weg oder du im Dispo. Beides zusammen in einen Balken zu
   werfen würde dir eine Sicherheit vorrechnen, die es nicht gibt. */
function notgroschen(z) {
  const dreiMonate  = z.notwendigUmlage * 3;
  const sechsMonate = z.notwendigUmlage * 6;

  const alt = STATE.archive.reduce((s, m) => s + gespartAusArchiv(m, false), 0);
  // Was schon vor der App auf der hohen Kante lag, zählt selbstverständlich mit.
  const vorhanden = Number(STATE.einstellungen.notgroschenStart) || 0;
  // Ohne Ziel gibt es keine Aufteilung: dann ist alles Gesparte Puffer.
  const jetzt = sparzielAktiv()
    ? sparenIn(STATE.currentMonth, false)
    : summe(STATE.currentMonth.sparen);
  const bisher = vorhanden + alt + jetzt;

  /* Der Notgroschen läuft in zwei Stufen. Sobald drei Monate stehen, rückt
     das angezeigte Ziel auf sechs Monate weiter — sonst bliebe der Balken für
     immer auf 100% stehen und du hättest nichts mehr, worauf du zuläufst. */
  const dreiGeschafft  = dreiMonate > 0 && bisher >= dreiMonate;
  const sechsGeschafft = sechsMonate > 0 && bisher >= sechsMonate;
  const ziel = dreiGeschafft ? sechsMonate : dreiMonate;

  return {
    ziel: ziel,
    stufe: dreiGeschafft ? "6 Monatsausgaben" : "3 Monatsausgaben",
    dreiMonate: dreiMonate,
    sechsMonate: sechsMonate,
    dreiGeschafft: dreiGeschafft,
    sechsGeschafft: sechsGeschafft,
    bisher: bisher,
    quote: ziel > 0 ? Math.min(100, (bisher / ziel) * 100) : 0,
    fehlt: Math.max(0, ziel - bisher),
  };
}

/* ------------------------------------------------------------
   DAS SPARZIEL — die eine Sache, auf die du zusparst.

   Der Unterschied zum Notgroschen: Dessen Höhe rechnet die App aus
   deinen Fixkosten aus, hier sagst DU, was es kostet. Eine Reise kostet
   nun mal, was sie kostet.

   Die Frage ist deshalb auch nicht „schaffst du eine Vorgabe", sondern
   „wann bist du da". Und darauf gibt es zwei Antworten:

     ANKUNFT      — wann du ankommst, wenn du weitermachst wie bisher
     UMLEITUNG    — wann du ankommst, wenn die Hälfte deiner Ausnahmen
                    stattdessen hierher geht

   Der Abstand zwischen beiden Daten ist die eigentliche Aussage der
   ganzen Karte. Er macht aus „ich gebe zu viel für Sushi aus" ein
   „das Sushi kostet mich drei Monate Lissabon".
   ------------------------------------------------------------ */

/* Deine echte monatliche Sparrate fürs Ziel.

   Gemittelt wird über alle abgeschlossenen Monate ZURÜCK BIS ZU DEM, in dem
   du zuletzt etwas fürs Ziel weggelegt hast — die Nullen dazwischen zählen
   mit. Wer jeden zweiten Monat 200 € spart, spart im Schnitt 100 €, und
   genau das muss dastehen. Würden wir nur die Monate mit Betrag mitteln,
   käme eine Ankunft heraus, die es nie geben wird.

   Gibt es noch keinen abgeschlossenen Monat mit Ziel-Sparen, nehmen wir den
   laufenden: Am Anfang ist er die einzige Auskunft, die es gibt. */
function zielRate() {
  const werte = STATE.archive.map(m => gespartAusArchiv(m, true)); // neueste zuerst
  let aeltesterMitBetrag = -1;
  werte.forEach((w, i) => { if (w > 0) aeltesterMitBetrag = i; });

  if (aeltesterMitBetrag < 0) return sparenIn(STATE.currentMonth, true);

  const fenster = werte.slice(0, aeltesterMitBetrag + 1);
  return fenster.reduce((a, b) => a + b, 0) / fenster.length;
}

function sparziel(z) {
  const roh = STATE.einstellungen.sparziel || leeresSparziel();
  const betrag = Number(roh.betrag) || 0;

  // Kein Betrag, kein Ziel. Dann bleibt die Karte eine Einladung.
  if (betrag <= 0) return { aktiv: false, label: roh.label || "", termin: roh.termin || "" };

  const start = Number(roh.start) || 0;
  const alt = STATE.archive.reduce((s, m) => s + gespartAusArchiv(m, true), 0);
  const bisher = start + alt + sparenIn(STATE.currentMonth, true);
  const fehlt = Math.max(0, betrag - bisher);
  const geschafft = fehlt <= 0;

  const rate = zielRate();
  const heute = STATE.currentMonth.id;

  // Wie viele Monate noch, bei welcher Rate? Ohne Rate gibt es keine Ankunft,
  // und dann sagen wir das auch so, statt ein Datum zu erfinden.
  const ankunftBei = (r) => {
    if (geschafft) return heute;
    if (!(r > 0)) return null;
    return monatPlus(heute, Math.ceil(fehlt / r));
  };

  /* Die Umleitung: die HÄLFTE deiner Ausnahmen. Nicht alles — „gib nie
     wieder Geld für dich aus" ist kein Vorschlag, den irgendwer annimmt.
     Die Hälfte ist eine Zahl, bei der man kurz nachdenkt statt abzuwinken. */
  const umleitbar = z.nichtUmlage / 2;
  const ankunft = ankunftBei(rate);
  const ankunftUmgeleitet = ankunftBei(rate + umleitbar);
  const gewinn = (ankunft && ankunftUmgeleitet) ? monateBis(ankunftUmgeleitet, ankunft) : 0;

  /* Der Wunschtermin, falls du einen gesetzt hast. Daraus wird die Rate,
     die du bräuchtest — die ehrlichste Zahl der ganzen Karte. */
  const termin = roh.termin || "";
  const monateBisTermin = termin ? monateBis(heute, termin) : null;
  const terminVorbei = monateBisTermin !== null && monateBisTermin < 0;
  const noetigeRate = (monateBisTermin !== null && monateBisTermin > 0)
    ? fehlt / monateBisTermin
    : null;

  const n = notgroschen(z);

  return {
    aktiv: true,
    label: roh.label || "",
    betrag: betrag,
    bisher: bisher,
    fehlt: fehlt,
    geschafft: geschafft,
    quote: Math.min(100, (bisher / betrag) * 100),
    rate: rate,
    ankunft: ankunft,
    umleitbar: umleitbar,
    ankunftUmgeleitet: ankunftUmgeleitet,
    // Nur ein echter Vorsprung ist eine Aussage wert. Ein halber Monat nicht.
    gewinn: gewinn >= 1 ? gewinn : 0,
    termin: termin,
    terminVorbei: terminVorbei,
    monateBisTermin: monateBisTermin,
    noetigeRate: noetigeRate,
    // Schaffst du den Wunschtermin mit dem, was du gerade tust?
    terminSchaffbar: noetigeRate === null ? null : (rate >= noetigeRate),
    /* Der Notgroschen hat Vorrang, und die App sagt das — ohne etwas zu
       sperren. Es ist deine Entscheidung, aber nicht in Unkenntnis. */
    pufferFehlt: !n.dreiGeschafft && n.ziel > 0,
    pufferRest: n.fehlt,
  };
}

/* Was dieser Betrag am Sparziel anrichtet — der dritte Maßstab neben
   Arbeitszeit und Miete. Anders als die beiden zeigt er nicht, was der Kauf
   gekostet hat, sondern was er verschiebt.

   Zwei Fassungen, und die erste ist die schärfere: Wenn eine Sparrate
   existiert, wird der Betrag in Wartezeit umgerechnet. Ohne Rate bleibt
   der Anteil am Ziel — immer noch besser als nichts. */
function zielMassstab(betrag, sz) {
  if (!sz || !sz.aktiv || sz.geschafft || !(betrag > 0)) return "";
  const name = sz.label || "dein Ziel";

  if (sz.rate > 0) {
    const monate = betrag / sz.rate;
    if (monate >= 1) {
      const gerundet = Math.round(monate);
      return gerundet === 1 ? `1 Monat später: ${name}` : `${gerundet} Monate später: ${name}`;
    }
    const wochen = Math.round(monate * 4.33);
    if (wochen >= 1) return wochen === 1 ? `1 Woche später: ${name}` : `${wochen} Wochen später: ${name}`;
  }

  const anteil = betrag / sz.betrag;
  if (anteil < 0.02) return "";
  return Math.round(anteil * 100) + "% von: " + name;
}

/* Wie viele Ausnahmen stehen diesen Monat schon in der Liste?
   Zählt Stückzahl, nicht Betrag — für den „Nummer 7"-Spruch. */
function anzahlAusnahmen() {
  let n = 0;
  KATEGORIEN.forEach(kat => {
    (STATE.currentMonth[kat.key] || []).forEach(p => {
      if (istAusnahmePosten(kat, p) && (Number(p.amount) || 0) > 0) n++;
    });
  });
  return n;
}

/* ------------------------------------------------------------
   10b. WOHLSTAND, DER ZUFLIESST

   Die einzige Sammlung in dieser App, die nichts bewertet.

   Sie steht bewusst NEBEN der großen Rechnung und nicht darin: kein Cent
   von hier geht in dein Gehalt, in deinen Kontostand, in die Prozente
   oder in irgendein Ziel. Das hat zwei Gründe.

   Der erste ist Richtigkeit. Was dir jemand zusteckt, taucht auf keinem
   Kontoauszug auf. Ließe man es mitrechnen, stimmten die Zahlen der App
   nicht mehr mit denen deiner Bank überein.

   Der zweite ist wichtiger. Sobald etwas in die 50/30/20-Rechnung fällt,
   wird es zu Budget — zu etwas, das man verplant und wieder ausgibt. Diese
   Karte soll das Gegenteil sein: eine Liste, die nur wächst. Genau deshalb
   darfst du dieselben zwanzig Euro auch oben bei den Einnahmen stehen
   haben. Hier unten sind sie kein Geld, sondern ein Moment.

   Und deshalb zählt die App zwei Zahlen gleichberechtigt: die Summe UND
   wie oft es passiert ist. Blumen ohne Preisschild haben keinen Betrag,
   aber sie sind derselbe Beweis.
   ------------------------------------------------------------ */

/* Was ist diesem einen Monat zugeflossen? */
function zufluss(monat) {
  const liste = (monat && Array.isArray(monat.zufluesse)) ? monat.zufluesse : [];
  return {
    liste:  liste,
    anzahl: liste.length,
    summe:  liste.reduce((s, e) => s + (Number(e.amount) || 0), 0),
  };
}

/* Und dieselbe Frage fürs ganze Jahr, für jedes Jahr einzeln.

   Eintragen tust du monatlich, weil die App so aufgebaut ist. Aber der
   Betrag, der wirklich staunen lässt, ist der Jahresbetrag: Zwanzig Euro
   hier, ein Essen dort, das sieht einzeln nach nichts aus und steht am
   Jahresende als dreistellige Summe da.

   Gezählt wird aus dem laufenden Monat plus dem Archiv. Aus dem Archiv
   nehmen wir die Zahlen aus `summary`, weil sie beim Abschließen genau so
   festgehalten wurden. Fehlen sie (der Monat wurde abgeschlossen, bevor es
   diese Karte gab), zählt er als Null — er hat damals nichts gezählt, also
   darf er heute auch nichts behaupten.

   Zurück kommt eine Liste, neuestes Jahr zuerst. Jahre ohne einen einzigen
   Moment fallen raus: eine Zeile „2024 · 0 €" ist keine Auswertung. */
function zuflussJahre() {
  const jahre = new Map();

  const dazu = (monatsId, summe, anzahl) => {
    const jahr = String(monatsId || "").slice(0, 4);
    if (!/^\d{4}$/.test(jahr)) return;   // unlesbare ID: lieber gar nicht zählen
    const bisher = jahre.get(jahr) || { jahr: jahr, summe: 0, anzahl: 0 };
    bisher.summe  += summe;
    bisher.anzahl += anzahl;
    jahre.set(jahr, bisher);
  };

  const jetzt = zufluss(STATE.currentMonth);
  dazu(STATE.currentMonth.id, jetzt.summe, jetzt.anzahl);

  (STATE.archive || []).forEach(eintrag => {
    const s = (eintrag && eintrag.summary) || {};
    dazu(eintrag && eintrag.id, Number(s.zuflussSumme) || 0, Number(s.zuflussAnzahl) || 0);
  });

  return [...jahre.values()]
    .filter(e => e.anzahl > 0)
    .sort((a, b) => b.jahr.localeCompare(a.jahr));
}

/* Zwei Dinge, die die Seite sich nur bis zum nächsten Neuladen merkt.

   Beide bewusst NICHT im Speicher: Der Blätter-Stand soll morgen wieder beim
   Satz des Tages beginnen, und ob du die Sätze-Verwaltung offen hattest, ist
   nichts, wofür sich eine Sicherung lohnt. Sie leben nur, damit ein render()
   dir nicht mitten im Tippen alles wieder zuklappt. */
let affirmationOffset = 0;
let affirmationenOffen = false;

/* Und dasselbe für „Ziel ändern". Ohne diesen Merker klappt der Bereich bei
   jedem getippten Buchstaben zu, denn jede Änderung zeichnet die Karte neu. */
let sparzielAendernOffen = false;

// … und für „Stimmt das nicht?" in der Kontostand-Karte.
let ankerAendernOffen = false;

/* Welcher Satz ist heute dran?

   Wir zählen die Tage seit dem 1.1.1970 durch und teilen mit Rest durch die
   Anzahl der Sätze. Dadurch rückt der Satz jede Nacht um eins weiter und ist
   innerhalb DESSELBEN Tages immer derselbe — auch wenn die Seite zwischendurch
   hundertmal neu gezeichnet wird.

   Metapher: ein Abreißkalender. Ein Blatt pro Tag, und wer zweimal hinschaut,
   sieht zweimal dasselbe Blatt. */
function tagesNummer() {
  const jetzt = new Date();
  // Auf Mitternacht setzen, damit die Uhrzeit das Ergebnis nicht verschiebt.
  const mitternacht = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate());
  return Math.round(mitternacht.getTime() / 86400000);
}

/* Alles, was durchläuft: erst die festen Sätze aus dem Programm, dann deine
   eigenen. Die festen sind immer da, deshalb kann diese Liste nie leer sein. */
function alleAffirmationen() {
  return AFFIRMATIONEN.concat(STATE.einstellungen.eigeneAffirmationen || []);
}

/* Der Satz, der gerade dran ist — mit seiner Position, damit darunter
   „3 von 111" stehen kann. */
function aktuelleAffirmation() {
  const liste = alleAffirmationen();
  const platz = (tagesNummer() + affirmationOffset) % liste.length;
  return { text: liste[platz], nummer: platz + 1, gesamt: liste.length };
}

/* ============================================================
   11. ZEICHNEN (render) — STATE als Seite darstellen.
   render() ruft alle Teil-Zeichner auf und wird nach jeder
   Änderung erneut ausgeführt.
   ============================================================ */
function render() {
  /* Die Kette einmal für die ganze Anzeige rechnen und durchreichen, statt sie
     in jeder Karte neu aufzurollen. Sie ist die gemeinsame Wahrheit über alle
     Kontostände — der laufende Monat und das Archiv müssen dieselbe sehen. */
  const kette = kontostandKette();
  const z = rechne(STATE.currentMonth, startwertFuer(STATE.currentMonth.id, kette)); // "z" = Zahlen
  /* Und derselbe Gedanke für den Gehaltszyklus: Drei Karten brauchen ihn, und
     drei eigene Rechnungen wären drei Gelegenheiten, dass sie auseinanderlaufen.
     `zy` ist null, solange kein Zyklus gestartet wurde. */
  const zy = gehaltszyklus();
  renderStand(z, zy);
  renderKopf(z);
  renderSerie();
  renderZyklus(z, zy);
  renderKategorien(z);
  renderFaellig(z);
  renderVertraege(z);
  renderKonto(z, kette, zy);
  renderUebersicht(z);
  renderNotgroschen(z);
  renderSparziel(z);
  // Bekommt bewusst kein `z`: Diese Karte hängt an keiner Zahl der großen
  // Rechnung, und das soll man schon hier sehen.
  renderZufluss();
  renderAffirmation();
  renderArchiv(kette);
  renderModal();
}

/* ------------------------------------------------------------
   DAS MARKENZEICHEN — als Zeichnung im Code (SVG).

   SVG heißt: Wir beschreiben die Form in Zahlen, statt ein Bild
   zu laden. Vorteil — es bleibt in jeder Größe scharf und nimmt
   die Farben direkt aus styles.css.

   Gezeichnet wird ein Kreisring aus zwei Bögen mit dem
   Monogramm „gm" in der Mitte. Der Trick bei den Bögen:
   Wir zeichnen jeweils einen ganzen Kreis, machen ihn aber
   gestrichelt (stroke-dasharray) — und zwar so, dass genau EIN
   Strich sichtbar ist und die Lücke den Rest verschluckt.

     Umfang des Kreises = 2 × π × 40 = 251,3
     Brauner Bogen: 245° davon = 171,0 sichtbar, 80,3 Lücke
     Pinker Bogen:   55° davon =  38,4 sichtbar, 212,9 Lücke

   Das rotate(…) dreht jeden Bogen an seine Stelle im Kreis:
   Braun läuft von unten links über oben bis rechts, Pink sitzt
   unten rechts. Dazwischen bleiben zwei Lücken offen — der
   Ring ist absichtlich nicht geschlossen.

   Die Schrift muss nirgends angegeben werden: Das SVG liegt in
   der Überschrift <h1 class="marke"> und erbt von dort die
   kursive Serifenschrift der Wortmarke.
   ------------------------------------------------------------ */
const MARKE_SVG = `
  <svg class="marke-zeichen" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--braun)"
            stroke-width="9" stroke-linecap="round"
            stroke-dasharray="171 80.3" transform="rotate(105 50 50)" />
    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--pink)"
            stroke-width="9" stroke-linecap="round"
            stroke-dasharray="38.4 212.9" transform="rotate(20 50 50)" />
    <text x="52" y="56" text-anchor="middle">
      <tspan fill="var(--braun)">g</tspan><tspan fill="var(--pink)">m</tspan>
    </text>
  </svg>`;

/* Das Symbol für den Browser-Tab steht NICHT hier, sondern fest im
   <head> von index.html. Grund: Safari beachtet ein Tab-Symbol nur,
   wenn es beim Laden der Seite schon im HTML steht. */

/* --- 11a0. Die Leiste, die oben kleben bleibt ---

   Warum es sie gibt: Die Prozentzahl im Banner darunter beantwortet nur die
   halbe Frage. Man kann tadellos unter 30% Ausnahmen liegen und trotzdem im
   Minus stehen — dann lobt die App dich oben, und dreimal Scrollen weiter
   unten steht ein Minus. Diesen Schreck gibt es jetzt nicht mehr: Der
   Kontostand ist immer im Bild, egal wo du gerade bist.

   Beides zusammen ist der Punkt. Die Prozente sagen, WOFÜR das Geld weggeht.
   Der Kontostand sagt, OB überhaupt noch welches da ist. Keine der beiden
   Zahlen ersetzt die andere. --- */
function renderStand(z, zy) {
  const chips = [];
  if (!z.keinGehalt) {
    chips.push(`<span class="stand-chip ${z.regelErreicht ? "" : "chip-warn"}">${Math.round(z.quoteNicht)} % Ausnahmen</span>`);
  }
  if (zy) {
    chips.push(`<span class="stand-chip">Tag ${zy.tag}/${zy.laenge}</span>`);
  }

  // Ohne gestarteten Zyklus heißt das Ende des Zeitraums schlicht „Monatsende".
  const label = zy ? "bleibt bis zum nächsten Gehalt" : "bleibt am Monatsende";

  document.getElementById("stand").innerHTML = `
    <div class="stand-leiste ${z.imMinus ? "im-minus" : ""}">
      <div class="stand-geld">
        <span class="stand-label">${label}</span>
        <span class="stand-zahl">${euro(z.kontostand)}</span>
      </div>
      <div class="stand-chips">${chips.join("")}</div>
    </div>
  `;
}

/* --- 11a. Kopf mit großem Konsumopfer-Banner --- */
function renderKopf(z) {
  // Ohne Gehalt gibt es kein Urteil — sonst stünde bei 200 € Sushi
  // und 0 € Gehalt fröhlich „Spar-Königin" da.
  let banner;
  if (z.keinGehalt) {
    banner = `
      <div class="verdikt v-neutral">
        <p class="prozent">–<small> noch kein Gehalt eingetragen</small></p>
        <p class="spruch">Trag erst dein Gehalt ein. Vorher rede ich nicht über deine Ausnahmen.</p>
      </div>`;
  } else {
    const v = verdiktFuer(z.quoteNicht);
    /* Die Zeile unter dem Spruch: das eigentliche „oh shit".
       Wer arbeitet, bekommt Arbeitsstunden. Wer nicht arbeitet, bekommt den
       Vergleich mit der eigenen größten Rechnung — sonst stünde hier bei jeder
       ohne Gehaltszettel nichts, und genau die braucht den Satz am dringendsten. */
    const std = stundenText(z.nichtUmlage, z.stundenlohn);
    const tage = arbeitstageText(z.nichtUmlage, z.stundenlohn);
    const fix = z.notwendige[0];
    const imVerhaeltnis = mietenText(z.nichtUmlage, fix);

    /* Der Spruch wird VOR der Zeile gebaut, weil die Zeile ihn kennen muss.

       Sprüche dürfen dieselben Zahlen nennen wie diese Zeile — sie bekommen ja
       genau dieselben Daten. Dann stand hier zweimal derselbe Vergleich
       untereinander: „…2,0× deine Fixkosten." und darunter „Das sind 2,0×
       deine Fixkosten." Die Zeile meldet sich deshalb nur noch, wenn der
       Spruch ihre Zahl nicht schon gesagt hat. */
    const spruch = spruchFuer(v, STATE.currentMonth.id, spruchDaten(z));

    let zeit = "";
    if (std) {
      if (!spruch.includes(std)) {
        zeit = `<p class="verdikt-zeit">Dafür hast du <strong>${std}</strong> gearbeitet.${tage ? ` Das sind ${tage}.` : ""}</p>`;
      }
    } else if (imVerhaeltnis && !spruch.includes(imVerhaeltnis)) {
      zeit = `<p class="verdikt-zeit">Das sind <strong>${imVerhaeltnis}</strong>.</p>`;
    }
    /* Im Banner steht NUR das Urteil über die Ausnahmen. Kein Kontostand,
       kein roter Rahmen, kein zweiter Kasten.

       Hier stand beides eine Weile: ein roter Rahmen ums Banner und ein
       Einwand-Kasten mit dem Kontostand darin. Das war zu viel auf einmal —
       vier Blöcke übereinander, und man wusste nicht, wo man anfangen soll.
       Wer alles gleichzeitig anschreit, wird gar nicht mehr gelesen.

       Der Kontostand braucht das Banner auch nicht: Er steht ohnehin in der
       Leiste ganz oben und ist beim Scrollen immer da. Einmal sichtbar reicht. */
    banner = `
      <div class="verdikt v${v.stufe}">
        <p class="prozent">${Math.round(z.quoteNicht)}%<small> deines Gehalts für Ausnahmen</small></p>
        <p class="spruch">${spruch}</p>
        ${zeit}
      </div>`;
  }

  document.getElementById("kopf").innerHTML = `
    <div class="kopf-zeile">
      <h1 class="marke">${MARKE_SVG}girl<span>math</span></h1>
      <button id="btn-hilfe" class="hilfe-knopf" title="Wie geht das nochmal?">?</button>
    </div>
    <p class="monat-zeile">${monatLesbar(STATE.currentMonth.id)}</p>
    ${banner}
  `;
}

/* --- 11b. Die Serie ---

   Hier stand einmal eine ganze Karte: die Monats-Abmachung mit Prozentmarke
   und der Rechnung, wie viel Luft noch bleibt. Beides ist raus. Die
   Prozentzahl steht schon im Banner darüber, und „noch 480 € Luft" hat als
   Satz zwar gestimmt, gelesen hat er sich aber wie eine Erlaubnis.

   Übrig bleibt das, was keine andere Stelle zeigt: wie lange du das schon
   durchhältst. Ohne Prozente — die Zahl misst Monate, nicht Anteile.
   --- */
function renderSerie() {
  const serie = serieLaenge();

  // Ohne abgeschlossene Monate gibt es noch nichts zu zeigen.
  let html = "";
  if (serie > 0) {
    html = `<div class="serie serie-laeuft">🔥 ${serie} ${serie === 1 ? "Monat" : "Monate"} in Folge im Rahmen geblieben. Dein Geld macht, was du willst.</div>`;
  } else if (STATE.archive.length > 0) {
    html = `<div class="serie serie-weg">Hier fängt deine Serie an. 🔥</div>`;
  }

  document.getElementById("serie").innerHTML = html;
}

/* --- 11b2. Der Gehaltszyklus ---

   Die Karte beantwortet drei Fragen, die ein Kalendermonat nicht beantwortet:
   Wo im Zyklus stehe ich, wie lange muss das Geld noch reichen, und bin ich
   schneller als die Zeit?

   Die dritte ist die eigentliche. „Tag 7 von 31" ist nur eine Zahl; „23% der
   Zeit rum, 61% des Ausnahmen-Budgets weg" ist ein Befund. Verglichen wird
   bewusst NUR das Ausnahmen-Budget und nicht das ganze Geld: Miete und
   Versicherungen gehen am Anfang des Zyklus in einem Rutsch ab, da wäre am
   Tag 3 jeder Monat rot. Die Ausnahmen dagegen verteilen sich über den
   Zyklus — dort sagt das Tempo wirklich etwas.
   --- */
// Der Knopf, der einen neuen Zyklus startet. Steht auf der leeren Karte
// genauso wie unter der laufenden, nur mit anderer Beschriftung.
function zyklusKnopf(text) {
  return `<button id="btn-gehalt-da" class="btn zyklus-knopf">${text}</button>`;
}

function renderZyklus(z, zy) {
  const ziel = document.getElementById("zyklus");

  // Noch nie gedrückt: eine Einladung statt geratener Zahlen.
  if (!zy) {
    ziel.innerHTML = `
      <div class="karte zyklus-karte zyklus-leer">
        <h2 class="karte-titel">Dein Gehaltszyklus 📅</h2>
        <p class="kat-hinweis">Dein Geld läuft nicht von Monatsanfang bis Monatsende, sondern von
          Gehalt zu Gehalt. Sag mir Bescheid, wenn deins da ist, dann rechne ich in deinem Takt.</p>
        ${zyklusKnopf("Gehalt ist da 💸")}
      </div>`;
    return;
  }

  // Wie viel vom Zyklus ist rum, wie viel vom Ausnahmen-Budget ist weg?
  const budget    = (REGEL.nicht / 100) * z.gehalt;
  const geldTeil  = budget > 0 ? z.nichtUmlage / budget : 0;
  const zeitTeil  = zy.anteil;
  const zeitProz  = Math.round(zeitTeil * 100);
  const geldProz  = Math.round(geldTeil * 100);

  /* Der Tempo-Satz. Die 15 Prozentpunkte Abstand sind Absicht: Ohne diese
     Toleranz würde die App bei 24% gegen 26% schon von „zu schnell" reden,
     und eine Warnung, die jeden Tag kommt, hört nach drei Tagen niemand mehr. */
  let tempo = "";
  if (!z.keinGehalt && budget > 0) {
    if (geldTeil > zeitTeil + 0.15) {
      tempo = `<p class="zyklus-tempo warn">${zeitProz}% des Zyklus rum, <strong>${geldProz}% vom Ausnahmen-Budget</strong> weg.
        Du bist schneller als der Kalender.</p>`;
    } else if (geldTeil < zeitTeil - 0.15) {
      tempo = `<p class="zyklus-tempo gut">${zeitProz}% des Zyklus rum, erst <strong>${geldProz}% vom Ausnahmen-Budget</strong> weg.
        Ich schreib's mir auf.</p>`;
    } else {
      tempo = `<p class="zyklus-tempo">${zeitProz}% des Zyklus rum, <strong>${geldProz}% vom Ausnahmen-Budget</strong> weg. Im Takt.</p>`;
    }
  }

  /* Was pro Tag noch da ist. Nur bei Geld im Plus und mindestens einem Tag
     Rest — „0 € pro Tag für 0 Tage" hilft niemandem. */
  let proTag = "";
  if (zy.restTage > 0 && z.kontostand > 0) {
    proTag = `<p class="zyklus-protag">Bleiben <strong>${euro(z.kontostand / zy.restTage)}</strong> pro Tag,
      bis das nächste Gehalt kommt.</p>`;
  } else if (z.imMinus) {
    proTag = `<p class="zyklus-protag warn">Bis dahin fehlen dir <strong>${euro(Math.abs(z.kontostand))}</strong>.</p>`;
  }

  /* Erinnerung, den Monat abzuschließen — aber NUR, wenn die App es sicher
     weiß: Es muss schon einmal abgeschlossen worden sein, und das liegt vor
     dem Beginn dieses Zyklus. Bei einem frischen Stand steht dort nichts,
     und dann sagt die App lieber gar nichts, statt falsch zu erinnern. */
  /* Beide Seiten des Vergleichs müssen dieselbe Uhr benutzen. `new Date("2026-07-25")`
     läse das Datum als Weltzeit und läge damit in Deutschland ein bis zwei Stunden
     neben `zy.start`, das lokale Mitternacht ist. `ausTagesId` liest lokal. */
  let anstoss = "";
  const letzter = ausTagesId(STATE.letzterAbschluss);
  if (letzter && letzter < zy.start) {
    anstoss = `<p class="zyklus-anstoss">Dein Gehalt ist seit ${datumLesbar(zy.start)} da, abgeschlossen hast du seitdem nicht.
      Ganz unten wartet der Knopf „Monat abschließen".</p>`;
  }

  /* Der überfällige Fall zuerst: Ist der angenommene Endtag vorbei, weiß die
     App nichts Verlässliches mehr und sagt genau das, statt weiterzuzählen. */
  const restText = zy.ueberfaellig
    ? `Dieser Zyklus läuft schon länger als einen Monat. Ist dein Gehalt da? Dann drück den Knopf.`
    : zy.restTage === 0
      ? "Morgen kommt dein Gehalt."
      : `Noch <strong>${zy.restTage} ${zy.restTage === 1 ? "Tag" : "Tage"}</strong> bis zum nächsten Gehalt, ungefähr am ${datumLesbar(zy.ende)}.`;

  ziel.innerHTML = `
    <div class="karte zyklus-karte">
      <div class="zyklus-kopf">
        <h2 class="karte-titel">Tag ${zy.tag} von ${zy.laenge} 📅</h2>
        <span class="zyklus-spanne">${datumLesbar(zy.start)} bis ${datumLesbar(zy.ende)}</span>
      </div>

      <div class="balken-spur zyklus-spur">
        <div class="balken-fuellung fuell-zeit" style="width:${zeitProz}%"></div>
      </div>

      <p class="zyklus-rest ${zy.ueberfaellig ? "warn" : ""}">${restText}</p>
      ${tempo}
      ${proTag}
      ${anstoss}

      ${zyklusKnopf("Neues Gehalt ist da 💸")}
    </div>`;
}

/* --- 11c. Alle Eingabe-Kategorien --- */
function renderKategorien(z) {
  document.getElementById("kategorien").innerHTML =
    KATEGORIEN.map(kat => kategorieHtml(kat, z)).join("");
}

// HTML für eine einzelne Kategorie-Karte bauen.
function kategorieHtml(kat, z) {
  // Angezeigt wird nach Betrag sortiert (höchster oben), gespeichert
  // bleibt die ursprüngliche Reihenfolge.
  const liste = sortiertNachBetrag(STATE.currentMonth[kat.key]);

  /* Die Summe im Kartenkopf zählt NUR, was diesen Monat wirklich läuft.

     Sonst stünde bei zwei Abos „59,90 €", obwohl das pausierte Gym in keiner
     einzigen anderen Zahl der App auftaucht — und man säße wieder vor einer
     Summe, die sich nicht mit dem Kontostand deckt. Dass ein Eintrag fehlt,
     erklärt die durchgestrichene Zeile darunter. */
  const zaehlende = liste.filter(p => !(kat.wiederkehrend && istPausiert(p, STATE.currentMonth.id)));

  // Summe farblich passend zeigen
  let summenKlasse = "";
  if (kat.typ === "positiv" || kat.typ === "sparen") summenKlasse = "summe-positiv";
  if (kat.typ === "nicht") summenKlasse = "summe-nicht";

  const zeilen = liste.length === 0
    ? `<p class="leer-hinweis">Noch nichts eingetragen.</p>`
    : liste.map(p => postenHtml(kat, p, z)).join("");

  // Zweite Zeile im Hinzufügen-Formular: Häkchen und/oder Rhythmus.
  const extras = [];
  if (schalterZeigen(kat)) {
    extras.push(`<label class="schalter">
      <input type="checkbox" data-add-schalter>
      ${kat.schalter.text}
    </label>`);
  }
  if (kat.wiederkehrend) {
    // Der Rhythmus wird EINMAL beim Eintragen gewählt und danach nicht mehr
    // angezeigt — sonst stünde in jeder Zeile „monatlich". Ändert sich etwas,
    // löschst du den Posten und trägst ihn neu ein.
    extras.push(rhythmusAuswahl("monatlich", "data-add-rhythmus"));
    // Der Fälligkeits-Monat ist nur bei nicht-monatlichen Posten nötig und
    // taucht erst auf, wenn oben etwas anderes als „monatlich" gewählt ist.
    extras.push(`<label class="mini-label versteckt" data-add-faellig-feld>ab
      <select class="mini-auswahl" data-add-faellig>${monatsOptionen(monatsNummer(STATE.currentMonth.id))}</select>
    </label>`);
  }
  const extraZeile = extras.length ? `<div class="form-extras">${extras.join("")}</div>` : "";

  /* Nur Kategorien mit eigenem `hinweis` bekommen einen Satz.

     Hier stand früher bei allen drei wiederkehrenden Kategorien „Läuft
     automatisch in den nächsten Monat weiter." Dreimal derselbe Satz
     untereinander liest niemand, und beim ersten Monatswechsel sieht man
     es ohnehin. */
  const hinweis = kat.hinweis ? `<p class="kat-hinweis">${kat.hinweis}</p>` : "";

  // Nur bei den Einnahmen: das Feld für die Wochenstunden, aus dem sich
  // der Stundenlohn und damit die ganze Lebenszeit-Rechnung ergibt.
  const zeitfeld = kat.zeitfeld ? wochenstundenHtml(z) : "";

  /* Jede Kategorie ist ein <details>-Element: Der Kopf bleibt immer sichtbar,
     der Inhalt klappt darunter auf und zu. Das spart Platz, ohne dass du die
     Übersicht verlierst — Summe und Anzahl stehen auch im eingeklappten
     Zustand im Kopf.
     Welche Karten zu sind, merkt sich die App in den Einstellungen. */
  const offen = !STATE.einstellungen.zugeklappt.includes(kat.key);
  // „Posten" ist Buchhalter-Sprache. Im Kartenkopf steht deshalb „Eintrag".
  const anzahl = liste.length === 1 ? "1 Eintrag" : `${liste.length} Einträge`;

  return `
    <details class="karte kat-karte" data-kat="${kat.key}" ${offen ? "open" : ""}>
      <summary class="karte-kopf">
        <span class="karte-pfeil" aria-hidden="true">▸</span>
        <h2 class="karte-titel">${kat.titel}</h2>
        <span class="karte-anzahl">${anzahl}</span>
        <span class="karte-summe ${summenKlasse}">${euro(summe(zaehlende))}</span>
      </summary>

      <div class="karte-inhalt">
        ${hinweis}

        <div class="posten-liste">${zeilen}</div>

        <form class="hinzufuegen" data-add="${kat.key}">
          <div class="form-zeile">
            <input type="text" data-add-label placeholder="${kat.platzhalter}" />
            <input type="number" data-add-amount placeholder="0" step="0.01" inputmode="decimal" />
            <button type="submit" class="btn btn-plus" title="hinzufügen">＋</button>
          </div>
          ${extraZeile}
        </form>
        ${zeitfeld}
      </div>
    </details>
  `;
}

/* Das Wochenstunden-Feld samt errechnetem Stundenlohn.

   Der Stundenlohn entsteht NUR aus den Einnahmen mit gesetztem Häkchen
   „dafür gearbeitet?". Wer Bürgergeld bezieht, studiert, Unterhalt
   bekommt oder etwas auf dem Flohmarkt verkauft, hat dafür keine
   Arbeitsstunden geleistet.

   Früher blieb dann einfach alles leer — die halbe App schwieg. Jetzt
   übernimmt der zweite Umrechner: Ausnahmen werden in Lebenstagen
   gezeigt, gerechnet aus den notwendigen Monatskosten. Der Roast läuft
   also weiter, nur in einer anderen Währung. */
function wochenstundenHtml(z) {
  // Ohne Arbeitseinkommen ist das Feld sinnlos — dann erklären wir das,
  // statt eine Zahl zu zeigen, die nichts bedeutet.
  if (z.ohneArbeitseinkommen || z.arbeitsEinkommen <= 0) {
    const rechnetTrotzdem = z.notwendigUmlage > 0;
    const text = z.ohneArbeitseinkommen
      ? "Keine deiner Einnahmen ist als Arbeitseinkommen markiert, also rechne ich keinen Stundenlohn."
        + (rechnetTrotzdem
            ? " Stattdessen zeige ich dir an jeder Ausnahme, wie lange du von dem Geld gelebt hättest."
            : " Sobald deine Fixkosten drinstehen, zeige ich dir stattdessen, wie lange du von jeder Ausnahme gelebt hättest.")
      : "Sobald oben eine Einnahme mit „dafür gearbeitet?“ drin steht, rechne ich dir deinen Stundenlohn aus.";
    return `<div class="zeit-zeile"><p class="feld-hinweis breit">${text}</p></div>`;
  }

  return `
    <div class="zeit-zeile">
      <label class="mini-label">Wochenstunden
        <input id="wochenstunden" class="mini-zahl" type="number" min="1" max="80" step="1"
               value="${STATE.einstellungen.wochenstunden}" />
      </label>
      <span class="umlage-hinweis">≈ ${euro(z.stundenlohn)} pro Stunde</span>
      <p class="feld-hinweis breit">aus ${euro(z.arbeitsEinkommen)} Arbeitseinkommen</p>
    </div>
  `;
}

// Das Auswahlfeld für den Rhythmus (monatlich … jährlich).
function rhythmusAuswahl(aktuell, zusatzAttribute) {
  const optionen = Object.keys(INTERVALL).map(key =>
    `<option value="${key}" ${key === aktuell ? "selected" : ""}>${RHYTHMUS_TEXT[key]}</option>`
  ).join("");
  return `<select class="mini-auswahl" ${zusatzAttribute}>${optionen}</select>`;
}

// Die zwölf Monate als <option>-Liste, mit `aktuell` vorausgewählt.
function monatsOptionen(aktuell) {
  return MONATE_KURZ.map((name, i) =>
    `<option value="${i + 1}" ${(i + 1) === aktuell ? "selected" : ""}>${name}</option>`
  ).join("");
}

/* Die zwölf Monate ab dem laufenden als Auswahl für das Pausen-Ende.
   Weiter zurück als der laufende Monat geht nicht: Eine Pause, die schon
   vorbei ist, wäre keine. */
function pauseMonatsOptionen(aktuell) {
  const opts = [];
  for (let i = 0; i < 12; i++) {
    const id = monatPlus(STATE.currentMonth.id, i);
    opts.push(`<option value="${id}" ${id === aktuell ? "selected" : ""}>${monatKurz(id)}</option>`);
  }
  return opts.join("");
}

// HTML für eine einzelne Posten-Zeile.
function postenHtml(kat, p, z) {
  // Alles, was unter die Betrags-Zeile gehört (Häkchen, Rhythmus, Arbeitszeit).
  const meta = [];
  const betrag = Number(p.amount) || 0;
  const pausiert = kat.wiederkehrend && istPausiert(p, STATE.currentMonth.id);

  if (schalterZeigen(kat)) {
    const feld = kat.schalter.feld;
    meta.push(`<label class="schalter">
      <input type="checkbox" data-field="${feld}" data-cat="${kat.key}" data-id="${p.id}" ${p[feld] ? "checked" : ""}>
      ${kat.schalter.text}
    </label>`);
  }

  let intervall = 1;
  if (kat.wiederkehrend) {
    intervall = INTERVALL[p.rhythmus] || 1;
    // Monatliche Posten bekommen gar keinen Hinweis — das ist der Normalfall
    // und würde nur jede Zeile mit „monatlich" zumüllen. Alles andere wird
    // ruhig, aber sichtbar beschriftet.
    if (intervall > 1) {
      meta.push(`<span class="rhythmus-schild">${RHYTHMUS_TEXT[p.rhythmus]} · ab ${MONATE_KURZ[(p.faellig || 1) - 1]}</span>`);
      // Der Satz, der den Schock nimmt: was das pro Monat bedeutet.
      meta.push(`<span class="umlage-hinweis">= ${euro(betrag / intervall)} / Monat</span>`);
    }

    /* Die Pause-Bedienung. Zwei Zustände, und beide zeigen sofort, was gilt:
       Läuft der Posten, steht dort ein Knopf zum Pausieren. Ruht er, steht
       dort bis wann — änderbar, ohne den Posten zu löschen und neu anzulegen. */
    if (pausiert) {
      meta.push(`<span class="pause-schild">⏸ pausiert bis ${monatKurz(p.pausiertBis)}</span>`);
      meta.push(`<label class="mini-label">bis
        <select class="mini-auswahl" data-pause-bis data-cat="${kat.key}" data-id="${p.id}">${pauseMonatsOptionen(p.pausiertBis)}</select>
      </label>`);
      meta.push(`<button type="button" class="mini-knopf" data-pause-aus
        data-cat="${kat.key}" data-id="${p.id}">läuft wieder</button>`);
    } else {
      meta.push(`<button type="button" class="mini-knopf" data-pause-an
        data-cat="${kat.key}" data-id="${p.id}">⏸ pausieren</button>`);
    }
  }

  /* Der Zeitpreis nur da, wo er wehtut: bei Ausnahmen und bei allem,
     was du selbst als „nicht notwendig" markiert hast. `massstab` liefert
     Arbeitsstunden, wenn es welche gibt, sonst Lebenstage.

     Bei einem pausierten Posten fällt er weg: Ein Beitrag, der diesen Monat
     nicht abgeht, kostet dich auch keine Arbeitsstunden. */
  if (istAusnahmePosten(kat, p) && !pausiert) {
    const zp = massstab(betrag / intervall, z);
    if (zp) meta.push(`<span class="zeit-schild">⏱ ${zp}</span>`);

    // Und daneben, sobald ein Sparziel steht: was dieser Posten dort verschiebt.
    const zs = zielMassstab(betrag / intervall, z.sparziel);
    if (zs) meta.push(`<span class="ziel-schild">🎯 ${zs}</span>`);
  }

  const metaZeile = meta.length ? `<div class="posten-meta">${meta.join("")}</div>` : "";

  return `
    <div class="posten ${pausiert ? "posten-pausiert" : ""}">
      <div class="posten-zeile">
        <input type="text" value="${escapeAttr(p.label)}" placeholder="${kat.platzhalter}"
               data-field="label" data-cat="${kat.key}" data-id="${p.id}" />
        <input type="number" value="${p.amount ?? ""}" step="0.01" inputmode="decimal"
               data-field="amount" data-cat="${kat.key}" data-id="${p.id}" />
        <button class="del" data-del data-cat="${kat.key}" data-id="${p.id}" title="löschen">✕</button>
      </div>
      ${metaZeile}
    </div>
  `;
}

/* --- 11d. Die Fälligkeits-Warnung + der Rücklagen-Auftrag --- */
function renderFaellig(z) {
  const ziel = document.getElementById("faellig");

  if (z.faelligJetzt.length === 0 && z.faelligBald.length === 0) {
    ziel.innerHTML = "";
    return;
  }

  const zeile = (e, zusatz) => `
    <div class="faellig-zeile">
      <span class="faellig-name">${escapeAttr(e.label)}
        <small>${RHYTHMUS_TEXT[e.rhythmus]}${zusatz || ""}</small></span>
      <span class="faellig-betrag">${euro(e.betrag)}</span>
    </div>
  `;

  const jetzt = z.faelligJetzt.length ? `
    <div class="karte faellig-karte jetzt">
      <h3 class="faellig-titel">❗️ Diesen Monat geht zusätzlich ab</h3>
      ${z.faelligJetzt.map(e => zeile(e)).join("")}
      <div class="faellig-summe">zusammen ${euro(z.faelligJetzt.reduce((s, e) => s + e.betrag, 0))}</div>
    </div>` : "";

  const bald = z.faelligBald.length ? `
    <div class="karte faellig-karte bald">
      <h3 class="faellig-titel">👀 Kommt bald auf dich zu</h3>
      <p class="faellig-unter">Damit es dich nicht aus dem Nichts trifft.</p>
      ${z.faelligBald.map(e => zeile(e, " · im " + MONATSNAMEN[e.monatNr - 1])).join("")}
    </div>` : "";

  // Die Rechnung hinter der Summe: jeder nicht-monatliche Posten mit seinem
  // vollen Betrag, der Teilung und dem Anteil, der auf diesen Monat entfällt.
  // Größter Anteil zuerst — der erklärt die Summe am meisten.
  const aufschluesselung = [...z.ruecklagePosten]
    .sort((a, b) => b.umlage - a.umlage)
    .map(p => `
      <div class="ruecklage-zeile">
        <span class="ruecklage-name">${escapeAttr(p.label)}
          <small>${euro(p.betrag)} ÷ ${p.intervall} Monate</small></span>
        <span class="ruecklage-anteil">${euro(p.umlage)}</span>
      </div>`).join("");

  // Die Summenzeile lohnt sich erst ab zwei Posten. Bei einem einzigen stünde
  // dieselbe Zahl sonst dreimal auf derselben Karte.
  const summenzeile = z.ruecklagePosten.length > 1 ? `
    <div class="ruecklage-summe">
      <span>zusammen jeden Monat weglegen</span>
      <span>${euro(z.ruecklageProMonat)}</span>
    </div>` : "";

  // Der Schritt, der aus Wissen Handeln macht: das Geld auch wirklich weglegen.
  const ruecklage = z.ruecklageProMonat > 0 ? `
    <div class="karte ruecklage-karte">
      <h3 class="faellig-titel">🏦 Deine Rücklage für diesen Monat</h3>
      <p class="ruecklage-betrag">${euro(z.ruecklageProMonat)}</p>
      <div class="ruecklage-rechnung">
        ${aufschluesselung}
        ${summenzeile}
      </div>
      <p class="faellig-unter">Rechnen tut die App. Weglegen musst du selbst.</p>
    </div>` : "";

  ziel.innerHTML = jetzt + bald + ruecklage;
}

/* --- 11e. Kündigungs-Blick: was kostet dich das im JAHR? --- */
function renderVertraege(z) {
  const ziel = document.getElementById("vertraege");

  if (z.vertraege.length === 0) {
    ziel.innerHTML = "";
    return;
  }

  const zeilen = z.vertraege.map(v => {
    const zp = massstab(v.proJahr, z);
    return `
      <div class="vertrag-zeile ${v.notwendig ? "" : "kandidat"}">
        <div class="vertrag-name">
          ${escapeAttr(v.label)}
          ${v.notwendig ? "" : `<span class="kandidat-schild">kündigen?</span>`}
          <small>${euro(v.proMonat)} / Monat · ${RHYTHMUS_TEXT[v.rhythmus]}</small>
        </div>
        <div class="vertrag-jahr">
          ${euro(v.proJahr)}<small>im Jahr${zp ? ` · ${zp}` : ""}</small>
        </div>
      </div>
    `;
  }).join("");

  const gesamtJahr = z.vertraege.reduce((s, v) => s + v.proJahr, 0);
  const unnoetige = z.vertraege.filter(v => !v.notwendig);
  const unnoetigJahr = unnoetige.reduce((s, v) => s + v.proJahr, 0);
  const zpUnnoetig = massstab(unnoetigJahr, z);

  // Bei einem einzigen Vertrag stünde sonst „für Verträge, die du …".
  const wovon = unnoetige.length === 1
    ? "für einen Vertrag, den du selbst nicht als notwendig markiert hast"
    : "für Verträge, die du selbst nicht als notwendig markiert hast";

  const fazit = unnoetigJahr > 0
    ? `<div class="vertrag-fazit">Davon <strong>${euro(unnoetigJahr)}</strong> ${wovon}${
         zpUnnoetig ? `. Das sind ${zpUnnoetig}` : ""}.</div>`
    : "";

  ziel.innerHTML = `
    <h2 class="nr-titel">Was kostet dich das im Jahr?</h2>
    <div class="karte vertrag-karte">
      <p class="kat-hinweis">20 € im Monat klingen harmlos. 240 € im Jahr nicht mehr.</p>
      ${zeilen}
      <div class="vertrag-summe">zusammen ${euro(gesamtJahr)} im Jahr</div>
      ${fazit}
    </div>
  `;
}

/* --- 11f. Kontostand-Bereich (echtes Geld, keine Umlage) ---

   Hier stand früher eine einzige Zahl unter der Überschrift „Aktueller
   Kontostand". Zwei Dinge waren daran falsch, und beide haben echten Ärger
   gemacht:

   1. „Aktuell" stimmt nicht. Die Zahl zieht ALLES ab, was diesen Monat noch
      abgebucht wird — sie ist eine Vorschau aufs Ende, nicht der Stand von
      heute. Wer sie mit seiner Banking-App vergleicht, sieht zwei
      verschiedene Zahlen und schließt daraus, die App verrechne sich.
   2. Eine nackte Zahl ist nicht überprüfbar. Wenn sie komisch aussieht, kann
      man nur raten, welcher Posten schuld ist.

   Beides löst die Aufschlüsselung: Sie zeigt die Rechnung Zeile für Zeile.
   Stimmt eine Zahl nicht, sieht man sofort, WELCHE — statt das Ergebnis
   anzustarren. --- */
/* Der obere Block der Kontostand-Karte: Wo kommt der Startwert dieses Monats her?

   Zwei Zustände, und der Unterschied ist der ganze Punkt der Kette:

   ANKER   — du hast diese Zahl gewusst und eingetragen. Nur hier gibt es ein
             offenes Eingabefeld, denn nur hier ist Tippen überhaupt sinnvoll.

   GEERBT  — die Zahl ist der Schlussstand des Vormonats, also gerechnet.
             Ein Eingabefeld wäre hier eine Einladung zum Fehler: Man tippt,
             was die Bank heute sagt, und zählt damit das Gehalt doppelt.
             Deshalb steht der Wert als Text da — mit dem Weg, wie er entstand,
             und einem Ausweg für den Fall, dass er nicht stimmt. --- */
function startBlockHtml(z, glied) {
  const istErsterMonat = !STATE.archive || STATE.archive.length === 0;

  /* Der allererste Monat bekommt immer das Eingabefeld, auch ohne gesetzten
     Anker: Er IST der Anfang der Rechnung. Ihm „aus dem Vormonat" hinzu-
     schreiben wäre schlicht gelogen, es gibt keinen. */
  if (glied.ausAnker || istErsterMonat) {
    /* Ein Anker mitten in der Zeit lässt sich wieder auflösen. Beim allerersten
       Monat wäre das sinnlos: Vor ihm gibt es nichts, aus dem er erben könnte. */
    const zurueck = istErsterMonat ? "" : `
      <button type="button" id="btn-anker-weg" class="btn btn-leise anker-weg">
        Wieder aus dem Vormonat
      </button>`;

    return `
      <div class="konto-block">
        <div class="beschriftung">Kontostand zu Beginn dieses Monats</div>
        <input id="start-guthaben" type="number" step="0.01" inputmode="decimal"
               value="${glied.start}" />
        <div class="feld-hinweis">Bevor die Einnahmen dieses Monats kamen.</div>
        ${zurueck}
      </div>`;
  }

  return `
    <div class="konto-block">
      <div class="beschriftung">Kontostand zu Beginn dieses Monats</div>
      <div class="konto-geerbt">${euro(glied.start)}</div>
      <div class="feld-hinweis">${glied.vonMonat
        ? `Schlussstand vom ${monatLesbar(glied.vonMonat)}.`
        : `Aus dem Vormonat.`}</div>
      <details class="anker-setzen" ${ankerAendernOffen ? "open" : ""}>
        <summary>Stimmt das nicht?</summary>
        <p class="anker-text">Was wirklich auf dem Konto lag, bevor die Einnahmen kamen:</p>
        <input id="start-guthaben" type="number" step="0.01" inputmode="decimal"
               placeholder="${glied.start}" />
      </details>
    </div>`;
}

function renderKonto(z, kette, zy) {
  const glied = (kette && kette[STATE.currentMonth.id]) || { start: z.startBalance, ausAnker: true, vonMonat: null };

  // Eine Zeile der Aufschlüsselung. `zeichen` ist „+", „−" oder leer.
  const zeile = (zeichen, text, betrag, klasse) => `
    <div class="konto-zeile ${klasse || ""}">
      <span class="konto-zeichen">${zeichen}</span>
      <span class="konto-text">${text}</span>
      <span class="konto-betrag">${euro(betrag)}</span>
    </div>`;

  // Nur zeigen, wenn Umlage und echte Abbuchung auseinandergehen.
  const echtZeile = z.hatUmlage
    ? `<p class="konto-fussnote">Oben steht, was <strong>wirklich</strong> abgeht (${euro(z.ausgegebenReal)}).
         Die Übersicht darunter verteilt Jahresrechnungen auf alle Monate (${euro(z.ausgegebenUmlage)}).</p>`
    : "";

  // Was diesen Monat pausiert und deshalb in keiner Zeile oben auftaucht.
  const pauseZeile = z.pausiertSumme > 0
    ? `<p class="konto-pause">⏸ Pausiert: ${z.pausiert.map(p => escapeAttr(p.label)).join(", ")}.
         <strong>${euro(z.pausiertSumme)}</strong> bleiben diesen Monat bei dir.</p>`
    : "";

  const endeLabel = zy
    ? `Bleibt bis zum nächsten Gehalt am ${datumLesbar(zy.ende)}`
    : "Bleibt am Monatsende";

  document.getElementById("konto").innerHTML = `
    <h2 class="nr-titel">Kontostand</h2>
    <div class="karte konto-karte">
      ${startBlockHtml(z, glied)}

      <div class="konto-rechnung">
        ${zeile("", "Kontostand zu Beginn", z.startBalance)}
        ${zeile("+", "Einnahmen", z.gehalt, "positiv")}
        ${zeile("−", "Notwendige Ausgaben", z.notwendigReal)}
        ${zeile("−", "Ausnahmen", z.nichtReal, "nicht")}
        ${zeile("−", "Gespart", z.gespart)}
        <div class="konto-zeile ergebnis ${z.imMinus ? "negativ" : ""}">
          <span class="konto-zeichen">=</span>
          <span class="konto-text">${endeLabel}</span>
          <span class="konto-betrag">${euro(z.kontostand)}</span>
        </div>
      </div>

      <p class="konto-fussnote"><strong>Vorschau</strong> aufs Monatsende: Hier ist schon abgezogen,
        was erst noch abgebucht wird. Deine Bank zeigt heute eine andere Zahl.</p>
      ${pauseZeile}
      ${echtZeile}
    </div>
  `;
}

/* --- 11g. Monats-Übersicht: Diagramm, Zahlen, Rangliste, Realitäts-Check --- */
function renderUebersicht(z) {
  // Ein Regel-Balken: Ist-Wert als Füllung, Ziel als senkrechter Strich.
  const balken = (label, ist, ziel, fuellKlasse) => `
    <div class="balken-zeile">
      <div class="balken-label">
        <span>${label} <strong>${Math.round(ist)}%</strong></span>
        <span class="ziel">Ziel ${ziel}%</span>
      </div>
      <div class="balken-spur">
        <div class="balken-fuellung ${fuellKlasse}" style="width:${Math.min(ist, 100)}%"></div>
        <div class="ziel-strich" style="left:${ziel}%"></div>
      </div>
    </div>
  `;

  /* Die Zahlenzeilen nennen bewusst KEINE Prozente mehr.

     Sie standen hier, und der Anteil steht im Diagramm darüber und in den
     Regel-Balken darunter ohnehin. Dreimal dieselbe Prozentzahl auf einer
     Karte liest niemand als drei Aussagen — man liest sie als Rauschen. Hier
     ist der Euro-Betrag das Neue, und der bekommt jetzt die Zeile für sich. */
  document.getElementById("uebersicht").innerHTML = `
    <h2 class="nr-titel">Monats-Übersicht</h2>
    <div class="karte uebersicht-karte">
      ${donutHtml(z)}

      <div class="zahlenzeile"><span>Gehalt gesamt</span><span class="wert-positiv">${euro(z.gehalt)}</span></div>
      <div class="zahlenzeile"><span>Notwendige Ausgaben</span><span>${euro(z.notwendigUmlage)}</span></div>
      <div class="zahlenzeile"><span>Ausnahmen</span><span class="wert-nicht">${euro(z.nichtUmlage)}</span></div>
      <div class="zahlenzeile"><span>Gespart</span><span class="wert-positiv">${euro(z.gespart)}</span></div>
      <div class="zahlenzeile dick"><span><strong>Von diesem Monat noch frei</strong></span><span><strong>${euro(z.uebrig)}</strong></span></div>
      <p class="zahlen-fussnote">Ohne dein Startguthaben, und mit Jahresrechnungen auf die Monate
        verteilt. Was wirklich auf dem Konto bleibt, steht in der Karte darüber.</p>

      ${ranglisteHtml(z)}

      <div class="regel-titel">Realitäts-Check: die ${REGEL.name}-Regel</div>
      ${balken("Notwendig", z.quoteNotwendig, REGEL.notwendig, "fuell-notwendig")}
      ${balken("Ausnahmen", z.quoteNicht, REGEL.nicht, "fuell-nicht")}
      ${balken("Sparen", z.quoteSpar, REGEL.sparen, "fuell-sparen")}

      <details class="regel-details">
        <summary>Woher kommen diese Zahlen?</summary>
        ${REGEL.erklaerung.map(satz => `<p>${satz}</p>`).join("")}
      </details>
    </div>
  `;
}

/* Die Rangliste der teuersten Ausnahmen — damit die 370 € nicht
   anonym bleiben, sondern einen Namen und einen Preis in Zeit haben. */
function ranglisteHtml(z) {
  if (z.ausnahmen.length === 0) return "";

  const zeilen = z.ausnahmen.slice(0, 3).map((a, i) => {
    const zp = massstab(a.betrag, z);
    // Bei mehrfach eingetragenen Posten zeigen wir, wie oft — genau da fällt
    // auf, dass die drei kleinen Sushi zusammen teurer waren als gedacht.
    const wieOft = a.anzahl > 1 ? `<span class="rang-anzahl">${a.anzahl}×</span>` : "";
    return `
      <div class="rang-zeile">
        <span class="rang-platz">${i + 1}</span>
        <span class="rang-name">${escapeAttr(a.label)}${wieOft}</span>
        <span class="rang-wert">${euro(a.betrag)}${zp ? `<small>${zp}</small>` : ""}</span>
      </div>
    `;
  }).join("");

  // „und eine weitere", nicht „und 1 weitere".
  const uebrig = z.ausnahmen.length - 3;
  const rest = uebrig > 0
    ? `<p class="rang-rest">… und ${uebrig === 1 ? "eine weitere" : uebrig + " weitere"}.</p>`
    : "";

  return `
    <div class="rangliste">
      <div class="regel-titel">Deine teuersten Ausnahmen</div>
      ${zeilen}
      ${rest}
    </div>
  `;
}

/* Das Kreisdiagramm — von Hand als SVG gezeichnet, ohne fremde Bibliothek.

   Trick dahinter: Ein Ring ist nur ein Kreis mit dickem Rand. Mit
   "stroke-dasharray" sagt man dem Rand „male X Pixel, dann lass Y frei".
   Legt man mehrere solche Kreise übereinander und schiebt jeden ein Stück
   weiter (stroke-dashoffset), entstehen die Tortenstücke.
   Metapher: ein Maßband, das einmal um den Kreis läuft. Jede Kategorie
   bekommt ihr Stück des Maßbands zugeteilt. */
function donutHtml(z) {
  const teile = [
    { label: "Notwendig", wert: z.notwendigUmlage,     klasse: "seg-notwendig" },
    { label: "Ausnahmen", wert: z.nichtUmlage,         klasse: "seg-nicht" },
    { label: "Gespart",   wert: z.gespart,             klasse: "seg-sparen" },
    { label: "Übrig",     wert: Math.max(0, z.uebrig), klasse: "seg-uebrig" },
  ].filter(t => t.wert > 0.005);

  const basis = teile.reduce((s, t) => s + t.wert, 0);

  if (basis <= 0) {
    return `<p class="leer-hinweis mittig">Trag ein paar Zahlen ein, dann male ich dir das Diagramm.</p>`;
  }

  const radius = 54;
  const umfang = 2 * Math.PI * radius;
  let bisher = 0;

  const segmente = teile.map(t => {
    const laenge = (t.wert / basis) * umfang;
    const kreis = `<circle class="segment ${t.klasse}" cx="70" cy="70" r="${radius}"
        stroke-dasharray="${laenge.toFixed(2)} ${(umfang - laenge).toFixed(2)}"
        stroke-dashoffset="${(-bisher).toFixed(2)}" />`;
    bisher += laenge;
    return kreis;
  }).join("");

  // In der Mitte die eine Zahl, um die es geht.
  const mitteZahl = z.keinGehalt ? "–" : Math.round(z.quoteNicht) + "%";

  const legende = teile.map(t => `
    <div class="legende-eintrag">
      <span class="legende-punkt ${t.klasse}"></span>
      <span class="legende-text">${t.label}</span>
      <span class="legende-wert">${Math.round((t.wert / basis) * 100)}%</span>
    </div>
  `).join("");

  return `
    <div class="donut-bereich">
      <svg class="donut" viewBox="0 0 140 140" role="img" aria-label="Aufteilung deines Geldes">
        <g transform="rotate(-90 70 70)">
          <circle class="donut-spur" cx="70" cy="70" r="${radius}" />
          ${segmente}
        </g>
        <text class="donut-zahl" x="70" y="70" text-anchor="middle">${mitteZahl}</text>
        <text class="donut-unter" x="70" y="86" text-anchor="middle">Ausnahmen</text>
      </svg>
      <div class="legende">${legende}</div>
    </div>
  `;
}

/* --- 11h. Notgroschen: die wichtigste Zahl, die dir keiner sagt --- */
function renderNotgroschen(z) {
  const ziel = document.getElementById("notgroschen");

  // Das Feld für vorhandenes Guthaben, das in beiden Fällen unten steht.
  const vorhandenFeld = `
    <div class="notgroschen-vorhanden">
      <label class="mini-label">Schon vorhanden
        <input id="notgroschen-start" class="mini-zahl breit" type="number" step="0.01"
               inputmode="decimal" value="${STATE.einstellungen.notgroschenStart ?? 0}" />
      </label>
      <p class="feld-hinweis breit">Was auf dem Tagesgeldkonto oder unterm Kopfkissen liegt.</p>
    </div>
  `;

  // Ohne notwendige Ausgaben lässt sich noch kein Puffer-Ziel rechnen. Das
  // Feld für vorhandenes Guthaben zeigen wir trotzdem, sonst könntest du es
  // ausgerechnet am Anfang nicht eintragen.
  if (z.notwendigUmlage <= 0) {
    const n = notgroschen(z);
    ziel.innerHTML = `
      <h2 class="nr-titel">Dein Notgroschen</h2>
      <div class="karte notgroschen-karte">
        <div class="notgroschen-kopf">
          <div class="rechts">
            <div class="beschriftung">Bisher zusammen</div>
            <div class="notgroschen-ist">${euro(n.bisher)}</div>
          </div>
        </div>
        <p class="notgroschen-text">Sobald deine Fixkosten eingetragen sind, rechne ich dir aus,
          wie viel Puffer du brauchst: drei Monatsausgaben.</p>
        ${vorhandenFeld}
      </div>
    `;
    return;
  }

  const n = notgroschen(z);

  // Drei Stufen: unterwegs zu 3 Monaten, unterwegs zu 6 Monaten, fertig.
  let text;
  if (n.sechsGeschafft) {
    text = `<p class="notgroschen-text gut">Sechs Monate Puffer stehen. Was du ab jetzt
      zurücklegst, darf für dich arbeiten gehen.</p>`;
  } else if (n.dreiGeschafft) {
    text = `<p class="notgroschen-text gut">Drei Monate Puffer stehen, und das schaffen die
      meisten nie. Bis sechs fehlen dir <strong>${euro(n.fehlt)}</strong>.</p>`;
  } else {
    text = `<p class="notgroschen-text">Dir fehlen noch <strong>${euro(n.fehlt)}</strong>.
      Damit kannst du kündigen, ausziehen oder Nein sagen, ohne vorher zu rechnen.</p>`;
  }

  ziel.innerHTML = `
    <h2 class="nr-titel">Dein Notgroschen</h2>
    <div class="karte notgroschen-karte">
      <div class="notgroschen-kopf">
        <div>
          <div class="beschriftung">Ziel: ${n.stufe}</div>
          <div class="notgroschen-ziel">${euro(n.ziel)}</div>
        </div>
        <div class="rechts">
          <div class="beschriftung">Bisher zusammen</div>
          <div class="notgroschen-ist">${euro(n.bisher)}</div>
        </div>
      </div>
      <div class="balken-spur gross">
        <div class="balken-fuellung fuell-sparen" style="width:${n.quote}%"></div>
      </div>
      <div class="notgroschen-quote">${Math.round(n.quote)}% geschafft</div>
      ${text}
      ${vorhandenFeld}
    </div>
  `;
}

/* --- 11h2. Dein Sparziel ---

   Steht bewusst UNTER dem Notgroschen. Die Reihenfolge auf dem Bildschirm
   ist selbst die Aussage: erst der Puffer, dann die schönen Dinge. Verboten
   wird nichts, aber die Rangfolge steht nicht zur Debatte. --- */
/* Die Auswahlliste für den Wunschmonat.

   Bewusst KEIN `<input type="month">`: Safari auf dem Mac kennt das Feld nicht
   und macht ein Textfeld daraus, in das man tippen kann, dessen Inhalt die App
   aber nie akzeptiert — man tippt gegen eine Wand. Eine Auswahlliste
   funktioniert in jedem Browser gleich, und falsch eintragen kann man sich
   damit auch nicht mehr.

   Angeboten werden die nächsten fünf Jahre ab dem laufenden Monat. Ein bereits
   gespeicherter Termin kommt vorne dazu, falls er inzwischen in der
   Vergangenheit liegt — sonst würde die Auswahl ihn stillschweigend
   verschlucken und auf „kein Termin" zurückspringen. */
function terminAuswahl(aktuell) {
  const heute = STATE.currentMonth.id;
  const monate = [];
  if (aktuell && monateBis(heute, aktuell) < 0) monate.push(aktuell);
  for (let i = 0; i <= 60; i++) monate.push(monatPlus(heute, i));

  const optionen = monate.map(id =>
    `<option value="${id}"${id === aktuell ? " selected" : ""}>${monatLesbar(id)}</option>`
  ).join("");

  return `<select id="sparziel-termin" class="mini-auswahl">
    <option value=""${aktuell ? "" : " selected"}>kein Termin</option>
    ${optionen}
  </select>`;
}

function renderSparziel(z) {
  const ziel = document.getElementById("sparziel");
  const sz = z.sparziel;

  // Die Eingabefelder — in beiden Zuständen dieselben, nur unterschiedlich gefüllt.
  const felder = (s) => `
    <div class="sparziel-felder">
      <label class="mini-label breit">Wofür sparst du?
        <input id="sparziel-label" type="text" maxlength="60" placeholder="z.B. Reise nach Lissabon"
               value="${escapeAttr(s.label || "")}" />
      </label>
      <label class="mini-label">Was kostet es?
        <input id="sparziel-betrag" class="mini-zahl" type="number" step="0.01" inputmode="decimal"
               value="${s.betrag || ""}" />
      </label>
      <label class="mini-label">Bis wann? <span class="optional">(freiwillig)</span>
        ${terminAuswahl(s.termin || "")}
      </label>
    </div>
  `;

  // Zustand A: noch kein Ziel. Dann ist die Karte eine Einladung, kein Bericht.
  if (!sz.aktiv) {
    ziel.innerHTML = `
      <h2 class="nr-titel">Dein Sparziel</h2>
      <div class="karte sparziel-karte leer">
        <p class="sparziel-text">Eine Sache, auf die du zusparst. Trag ein, was sie kostet,
          und ich rechne dir aus, wann du da bist. Und wie viel früher, wenn ein Teil
          deiner Ausnahmen stattdessen hierher geht.</p>
        ${felder(sz)}
      </div>
    `;
    return;
  }

  const name = escapeAttr(sz.label || "dein Ziel");

  // Der Kernsatz: wann bist du da?
  let ankunftText;
  if (sz.geschafft) {
    ankunftText = `<p class="sparziel-text gut"><strong>Steht.</strong> ${euro(sz.bisher)} liegen bereit.
      Mehr braucht ${name} nicht.</p>`;
  } else if (!sz.ankunft) {
    ankunftText = `<p class="sparziel-text">Du legst dafür gerade nichts weg. So kommt der Monat
      nie, in dem es losgeht.</p>`;
  } else {
    ankunftText = `<p class="sparziel-text">Du legst im Schnitt <strong>${euro(sz.rate)}</strong> im Monat
      dafür weg. So wie bisher bist du im <strong>${monatLesbar(sz.ankunft)}</strong> da.</p>`;
  }

  /* Der eigentliche Punkt der Karte: was die Ausnahmen kosten.
     Nur wenn es wirklich etwas umzuleiten gibt und der Vorsprung
     mindestens einen ganzen Monat beträgt. */
  const umleitung = (!sz.geschafft && sz.gewinn > 0) ? `
    <div class="sparziel-umleitung">
      <p>Deine Ausnahmen diesen Monat: <strong>${euro(z.nichtUmlage)}</strong>.
        Die Hälfte davon stattdessen hierher, und du bist
        <strong>${sz.gewinn === 1 ? "einen Monat" : sz.gewinn + " Monate"} früher</strong> da:
        <strong>${monatLesbar(sz.ankunftUmgeleitet)}</strong>.</p>
    </div>` : "";

  // Der Wunschtermin, falls gesetzt: die Rate, die du dafür bräuchtest.
  let terminText = "";
  if (sz.termin && !sz.geschafft) {
    if (sz.terminVorbei) {
      terminText = `<p class="sparziel-termin warn">${monatLesbar(sz.termin)} ist vorbei,
        es fehlen ${euro(sz.fehlt)}.</p>`;
    } else if (sz.terminSchaffbar) {
      terminText = `<p class="sparziel-termin gut">Für ${monatLesbar(sz.termin)} brauchst du
        ${euro(sz.noetigeRate)} im Monat. Das passt.</p>`;
    } else {
      terminText = `<p class="sparziel-termin warn">Für ${monatLesbar(sz.termin)} bräuchtest du
        <strong>${euro(sz.noetigeRate)}</strong> im Monat. Du legst ${euro(sz.rate)} weg.</p>`;
    }
  }

  /* Der Notgroschen-Vorrang. Kein Verbot, keine Sperre, ein Satz.
     Er steht ganz unten, damit er das Letzte ist, was hängen bleibt. */
  const vorrang = sz.pufferFehlt ? `
    <p class="sparziel-vorrang">Bis dein Notgroschen steht, fehlen ${euro(sz.pufferRest)}.
      Dieses Geld hier ist kein Puffer.</p>` : "";

  ziel.innerHTML = `
    <h2 class="nr-titel">Dein Sparziel</h2>
    <div class="karte sparziel-karte">
      <div class="sparziel-kopf">
        <div>
          <div class="beschriftung">${name}</div>
          <div class="sparziel-summe">${euro(sz.betrag)}</div>
        </div>
        <div class="rechts">
          <div class="beschriftung">Bisher zusammen</div>
          <div class="sparziel-ist">${euro(sz.bisher)}</div>
        </div>
      </div>
      <div class="balken-spur gross">
        <div class="balken-fuellung fuell-ziel" style="width:${sz.quote}%"></div>
      </div>
      <div class="notgroschen-quote">${Math.round(sz.quote)}% geschafft${
        sz.geschafft ? "" : ` · noch ${euro(sz.fehlt)}`}</div>
      ${ankunftText}
      ${umleitung}
      ${terminText}
      ${vorrang}
      <details class="sparziel-aendern" ${sparzielAendernOffen ? "open" : ""}>
        <summary>Ziel ändern</summary>
        ${felder(sz)}
        <label class="mini-label breit">Schon dafür zurückgelegt
          <input id="sparziel-start" class="mini-zahl breit" type="number" step="0.01"
                 inputmode="decimal" value="${STATE.einstellungen.sparziel.start ?? 0}" />
        </label>
        <button id="btn-sparziel-weg" class="btn btn-leise">Ziel löschen</button>
      </details>
    </div>
  `;
}

/* --- 11h3. Wohlstand, der in mein Leben fließt ---

   Zwei Ebenen, und beide werden gebraucht.

   OBEN steht der laufende Monat, groß. Das ist die Zahl, die zu dem passt,
   was du gerade tust: eintragen, was diese Woche passiert ist.

   UNTEN steht die Jahresauswertung, eine Zeile pro Jahr. Das ist die Zahl,
   die staunen lässt. Zwanzig Euro hier, ein Essen dort, das sieht einzeln
   nach nichts aus und steht am Jahresende dreistellig da.

   Die Anzahl steht gleichberechtigt neben der Summe, weil manches keinen
   Preis hat. Und wenn nichts einen Wert bekommen hat, verschwindet der
   Euro-Betrag ganz: Drei Sträuße Blumen sind kein „0 €"-Monat.
   --- */

// „einmal" statt „1 Mal" — sonst liest sich jede Zeile wie ein Formular.
function malText(n) {
  return n === 1 ? "einmal" : `${n} Mal`;
}

function renderZufluss() {
  const ziel = document.getElementById("zufluss");
  const jetzt = zufluss(STATE.currentMonth);
  const jahre = zuflussJahre();
  const monatName = MONATSNAMEN[monatsNummer(STATE.currentMonth.id) - 1];

  // Immer gleich aufgebaut, damit die Karte nie ganz verschwindet: Der
  // Eintrag von heute ist der Grund, warum sie morgen etwas zu zeigen hat.
  const form = `
    <form class="zufluss-form" data-zufluss-form>
      <input type="text" data-zufluss-label maxlength="60"
             placeholder="z.B. zum Essen eingeladen" />
      <input type="number" data-zufluss-amount step="0.01" inputmode="decimal"
             placeholder="Wert" />
      <button type="submit" class="btn btn-plus" title="hinzufügen">＋</button>
    </form>
    <p class="feld-hinweis breit">Nur Dinge ohne Anlass und ohne Gegenleistung.
      Zugesteckt, mitgebracht, eingeladen, gefunden. Den Wert darfst du schätzen
      oder leer lassen, der Moment zählt trotzdem.</p>`;

  const kopf = `
    <h2 class="nr-titel">Wohlstand, der in mein Leben fließt 🌸</h2>`;
  const unter = `
    <p class="zufluss-unter">Alles, was zu dir kommt, ohne dass du etwas dafür getan hast.</p>`;

  // Noch nie etwas gezählt: kein Nullwert, sondern eine Einladung.
  if (jahre.length === 0) {
    ziel.innerHTML = `
      ${kopf}
      <div class="karte zufluss-karte">
        ${unter}
        <p class="zufluss-leer">Fang bei der letzten Kleinigkeit an, die dir jemand
          einfach so gegeben hat. Du wirst überrascht sein, wie schnell das hier voll wird.</p>
        ${form}
      </div>`;
    return;
  }

  /* Der Monat oben. Ist er noch leer, steht dort ein Satz statt einer
     großen Null — die Jahreszeile darunter trägt in dem Fall die Karte. */
  let monatsBlock;
  if (jetzt.anzahl === 0) {
    monatsBlock = `<p class="zufluss-monat-leer">Im ${monatName} steht noch nichts.</p>`;
  } else {
    const summenBlock = jetzt.summe > 0 ? `
      <div class="zufluss-zahl">
        <span class="zufluss-gross">${euro(jetzt.summe)}</span>
        <span class="zufluss-klein">im ${monatName} zugeflossen</span>
      </div>` : "";

    monatsBlock = `
      <div class="zufluss-zahlen">
        ${summenBlock}
        <div class="zufluss-zahl">
          <span class="zufluss-gross">${jetzt.anzahl} ×</span>
          <span class="zufluss-klein">hat jemand an dich gedacht</span>
        </div>
      </div>`;
  }

  /* Gelistet wird nur der laufende Monat, neuester Moment zuerst. Ältere
     stecken in ihrem Archiv-Monat und in der Jahreszahl unten — eine Liste,
     die über Jahre wächst, will niemand scrollen. */
  const eintraege = jetzt.liste.slice().reverse().map(e => `
    <li class="zufluss-eintrag">
      <span class="zufluss-was">${escapeAttr(e.label)}</span>
      ${e.amount > 0 ? `<span class="zufluss-wert">${euro(e.amount)}</span>` : ""}
      <button class="del" data-del data-cat="zufluesse" data-id="${e.id}" title="löschen">✕</button>
    </li>`).join("");

  /* Die Jahresauswertung. Sie erscheint erst, wenn sie etwas anderes sagt
     als der Monat darüber — im allerersten Monat wäre sie nur dieselbe Zahl
     mit einer anderen Überschrift.

     Das laufende Jahr wird als „bisher" gekennzeichnet: Es ist noch nicht
     fertig, und ein Vergleich mit einem vollen Vorjahr wäre sonst schief. */
  const laufendesJahr = String(STATE.currentMonth.id).slice(0, 4);
  const nurDieserMonat = jahre.length === 1 && jahre[0].anzahl === jetzt.anzahl;

  const jahresBlock = nurDieserMonat ? "" : `
    <div class="zufluss-jahre">
      <h3 class="zufluss-jahre-titel">Jahresauswertung</h3>
      ${jahre.map(j => `
        <div class="zufluss-jahr">
          <span class="zufluss-jahr-name">${j.jahr}${j.jahr === laufendesJahr ? " <small>bisher</small>" : ""}</span>
          <span class="zufluss-jahr-wert">${j.summe > 0 ? euro(j.summe) : ""}</span>
          <span class="zufluss-jahr-mal">${malText(j.anzahl)}</span>
        </div>`).join("")}
    </div>`;

  ziel.innerHTML = `
    ${kopf}
    <div class="karte zufluss-karte">
      ${unter}
      ${monatsBlock}
      ${eintraege ? `<ul class="zufluss-liste">${eintraege}</ul>` : ""}
      ${form}
      ${jahresBlock}
    </div>`;
}

/* --- 11i. Affirmationen ---

   Der einzige Bereich der App, der nichts von dir will. Er rechnet nicht,
   er vergleicht nicht, er hält dir nichts vor. Deshalb steht er ganz unten:
   Nach dem harten Teil ist er das, womit du rausgehst. --- */
function renderAffirmation() {
  const ziel = document.getElementById("affirmation");
  const eigene = STATE.einstellungen.eigeneAffirmationen || [];
  const a = aktuelleAffirmation();

  // Der Satz oben. Kann nie leer sein, die 111 stehen fest im Programm.
  const kopf = `
    <p class="affirmation-satz">${escapeAttr(a.text)}</p>
    <div class="affirmation-fuss">
      <button id="btn-affirmation-weiter" class="affirmation-weiter">nächster Satz ↻</button>
      <span class="affirmation-zaehler">${a.nummer} von ${a.gesamt}</span>
    </div>`;

  /* Aufgelistet werden NUR deine eigenen Sätze, und nur sie haben ein ✕.
     Die 111 sind fest und stehen hier gar nicht erst — sie wären 111 Zeilen,
     durch die niemand scrollen will, und löschen kann man sie ohnehin nicht. */
  const eintraege = eigene.map((satz, i) => `
    <li class="affirmation-eintrag">
      <span>${escapeAttr(satz)}</span>
      <button class="del" data-affirmation-weg="${i}" title="löschen">✕</button>
    </li>`).join("");

  ziel.innerHTML = `
    <h2 class="nr-titel">Affirmationen</h2>
    <div class="karte affirmation-karte">
      ${kopf}

      <details class="affirmation-verwalten" ${affirmationenOffen ? "open" : ""}>
        <summary>eigenen Satz hinzufügen</summary>

        <form class="affirmation-form" data-affirmation-form>
          <input type="text" data-affirmation-neu maxlength="${AFFIRMATION_MAX}"
                 placeholder="Eigener Satz, z.B. Mein Geld bleibt bei mir." />
          <button type="submit" class="btn btn-plus">+</button>
        </form>
        <p class="feld-hinweis breit">Deine Sätze mischen sich unter die
          ${AFFIRMATIONEN.length} und kommen ganz normal dran.</p>

        ${eigene.length ? `<ul class="affirmation-liste">${eintraege}</ul>` : ""}
      </details>
    </div>
  `;
}

/* --- 11j. Archiv der abgeschlossenen Monate --- */
function renderArchiv(kette) {
  const ziel = document.getElementById("archiv");

  if (!STATE.archive || STATE.archive.length === 0) {
    ziel.innerHTML = `
      <h2 class="archiv-titel">Archiv</h2>
      <p class="leer-hinweis">Noch kein Monat abgeschlossen. Am Monatsende auf „Monat abschließen" tippen.</p>
    `;
    return;
  }

  const eintraege = STATE.archive.map((m, i) => {
    const s = m.summary || {};
    const quote = Number(s.quoteNicht) || 0;
    const v = verdiktFuer(quote);

    // Trend im Vergleich zum davor abgeschlossenen Monat (der steht im Array dahinter).
    let trend = "";
    const vorher = STATE.archive[i + 1];
    if (vorher && vorher.summary) {
      const diff = Math.round(quote - (Number(vorher.summary.quoteNicht) || 0));
      if (diff < 0)      trend = `<div class="trend trend-besser">▼ ${Math.abs(diff)}%-Punkte besser als davor</div>`;
      else if (diff > 0) trend = `<div class="trend trend-schlechter">▲ ${diff}%-Punkte schlechter als davor</div>`;
      else               trend = `<div class="trend">gleich geblieben</div>`;
    }

    /* Ist sie in dem Monat unter der 30%-Marke geblieben?
       Bei null (keine Einnahmen eingetragen) sagen wir das offen, statt zu urteilen.
       Alte Einträge kennen nur `zielErreicht` — die lesen wir weiter mit. */
    const geschafft = s.regelErreicht !== undefined ? s.regelErreicht : s.zielErreicht;
    let zielMarke = "";
    if (geschafft === true)       zielMarke = `<div class="ziel-marke gut">Unter ${REGEL.nicht}% geblieben ✓</div>`;
    else if (geschafft === false) zielMarke = `<div class="ziel-marke schlecht">Über ${REGEL.nicht}% ✗</div>`;
    else if (geschafft === null)  zielMarke = `<div class="ziel-marke">Keine Einnahmen eingetragen — nicht bewertet</div>`;

    /* Der Kontostand kommt aus der KETTE, nicht aus der eingefrorenen
       Zusammenfassung. Genau darin liegt der Sinn der Sache: Korrigierst du
       einen früheren Monat, stehen hier sofort die neuen Zahlen — und zwar in
       jedem Monat danach. Die alte `summary.kontostand` dient nur noch als
       Rückfall für Einträge, deren Schnappschuss fehlt. */
    const glied = kette && kette[m.id];
    const start = glied ? glied.start : null;
    const ende  = glied ? glied.ende  : Number(s.kontostand) || 0;

    const ankerMarke = glied && glied.ausAnker
      ? `<span class="anker-marke" title="Dieser Startwert ist von dir gesetzt">gesetzt</span>`
      : "";

    const kontoZeile = start === null
      ? `<div class="archiv-konto">Kontostand am Ende ${euro(ende)}</div>`
      : `<div class="archiv-konto">Start ${euro(start)} ${ankerMarke} → Ende ${euro(ende)}</div>`;

    return `
      <div class="archiv-eintrag">
        <div>
          <div class="archiv-monat">${monatLesbar(m.id)}</div>
          <div class="archiv-detail">Gehalt ${euro(s.gehalt)} · Ausnahmen ${euro(s.nicht)} · gespart ${euro(s.gespart)}</div>
          ${kontoZeile}
          ${zielMarke}
          ${trend}
          <button type="button" class="archiv-korrigieren" data-korrigieren="${escapeAttr(m.id)}">
            Startwert korrigieren
          </button>
        </div>
        <span class="archiv-badge v${v.stufe}">${Math.round(quote)}%</span>
      </div>
    `;
  }).join("");

  ziel.innerHTML = `<h2 class="archiv-titel">Archiv</h2>${eintraege}`;
}

/* --- 11k. Das Willkommens-Fenster beim ersten Besuch --- */
function renderModal() {
  const ziel = document.getElementById("modal");

  if (STATE.onboardingGesehen) {
    ziel.innerHTML = "";
    document.body.classList.remove("modal-offen");
    return;
  }

  document.body.classList.add("modal-offen");
  ziel.innerHTML = `
    <div class="modal-hintergrund">
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-titel">
        <h2 id="modal-titel" class="modal-titel">Hey 💅</h2>
        <p class="modal-text">
          Ich bin die Freundin, die dir sagt, was dein Kontoauszug wirklich über dich denkt.
          Vier Sätze, dann kannst du loslegen:
        </p>
        <ol class="modal-liste">
          <li><strong>Einnahmen eintragen.</strong> Alles, was reinkommt: Gehalt, Bürgergeld, Unterhalt, Geschenke. Das Häkchen „dafür gearbeitet?“ nur da, wo du wirklich Stunden geleistet hast.</li>
          <li><strong>Fixkosten, Abos und Versicherungen einmal eintippen.</strong> Die wandern von allein in jeden neuen Monat.</li>
          <li><strong>Rhythmus setzen</strong>, wenn etwas nur vierteljährlich oder jährlich abgeht. Ich warne dich rechtzeitig vor.</li>
          <li><strong>Ausnahmen ehrlich eintragen.</strong> Sushi ist keine Lebensmittel-Kategorie, Schatz.</li>
        </ol>
        <p class="modal-fuss">
          Deine Zahlen bleiben nur in diesem Browser. Kein Server, kein Konto, niemand außer dir sieht sie.
        </p>
        <button id="btn-onboarding-fertig" class="btn btn-stark modal-knopf">Okay, los geht's</button>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------
   12. SOFORT-REAKTION — der kurze Einwurf beim Eintragen.
   Erscheint unten am Bildschirm und verschwindet nach ein paar
   Sekunden von allein.
   ------------------------------------------------------------ */
let reaktionsTimer = null;

function zeigeReaktion(text) {
  const ziel = document.getElementById("toast");
  ziel.innerHTML = `<div class="toast-box">${text}</div>`;
  // Einen alten Timer abbrechen, damit ein neuer Einwurf nicht
  // vom Countdown des vorigen weggeräumt wird.
  if (reaktionsTimer) clearTimeout(reaktionsTimer);
  reaktionsTimer = setTimeout(() => { ziel.innerHTML = ""; }, 5000);
}

/* Welcher Satz kommt? Von hart nach mild:
   1. Du hast eben dein Ziel gerissen -> das sagen wir sofort.
   2. Denselben Posten gab's diesen Monat schon -> das Muster zeigen.
   3. Ein einzelner großer Batzen (über 5% der Einnahmen) -> Maßstab.
   4. Sonst zählen wir mit, aber mit Namen und Betrag.

   Fall 2 und 3 nehmen `massstab`, nicht direkt die Arbeitsstunden —
   sonst schwiege die App bei jeder, die kein Erwerbseinkommen hat. */
function reaktionsText(z, posten) {
  /* Steht ein Sparziel, hat es Vorfahrt vor allen anderen Einwürfen — aber
     nur, wenn der Kauf es um mindestens einen ganzen Monat verschiebt.

     Warum vor dem Prozent-Satz: „du bist bei 34%" ist eine Kennzahl, über die
     man hinweglesen kann. „Lissabon rückt zwei Monate nach hinten" ist ein
     Termin, den sie sich selbst gesetzt hat. Das lässt sich nicht wegdiskutieren.
     Greift die Bedingung nicht, läuft die alte Kette unverändert weiter. */
  const sz = z.sparziel;
  if (sz && sz.aktiv && !sz.geschafft && sz.rate > 0 && posten.amount > 0) {
    const monate = Math.round(posten.amount / sz.rate);
    const name = escapeAttr(sz.label || "Dein Ziel");
    if (monate === 1) {
      return `${name} rückt damit <strong>einen Monat nach hinten</strong>.
        Ich hab das Datum schon umgeschrieben.`;
    }
    if (monate > 1) {
      return `${name}: <strong>${monate} Monate später</strong>.
        Ich hab das Datum schon umgeschrieben.`;
    }
  }

  if (!z.keinGehalt && !z.regelErreicht) {
    return `Damit bist du bei <strong>${Math.round(z.quoteNicht)}%</strong>.
      ${euro(z.ueberRegel)} über der ${REGEL.nicht}%-Marke, und der Monat ist nicht vorbei.`;
  }

  // Der schärfste Einwurf, den die App hat: nicht der einzelne Kauf, sondern
  // die Serie. Das dritte Sushi fällt einzeln nicht auf — zusammengezählt
  // schon. In z.ausnahmen sind gleiche Bezeichnungen bereits gebündelt.
  const schluessel = (posten.label || "").trim().toLowerCase();
  const gleiche = z.ausnahmen.find(a => a.label.trim().toLowerCase() === schluessel);
  if (gleiche && gleiche.anzahl > 1 && hatNamen(gleiche)) {
    const zp = massstab(gleiche.betrag, z);
    return `<strong>${gleiche.anzahl}× ${gleiche.label}</strong> diesen Monat, zusammen
      ${euro(gleiche.betrag)}${zp ? ` — ${zp}` : ""}. Das ist keine Ausnahme mehr,
      das ist ein Abo, das du nie abgeschlossen hast.`;
  }

  const zp = massstab(posten.amount, z);
  if (zp && z.gehalt > 0 && (posten.amount / z.gehalt) > 0.05) {
    return `${euro(posten.amount)} = <strong>${zp}</strong>. Wollte ich nur mal gesagt haben.`;
  }

  const n = anzahlAusnahmen();
  // Auch hier: Funktion oder fester Satz, beides ist erlaubt.
  const s = ZAEHL_SPRUECHE[n % ZAEHL_SPRUECHE.length];
  return typeof s === "function" ? s(n, posten) : s;
}

/* ============================================================
   13. EREIGNISSE — auf Klicks und Eingaben reagieren.
   Wir hängen die Zuhörer EINMAL an das ganze Dokument (statt an
   jedes einzelne Feld). Das nennt man "Event-Delegation": ein
   Türsteher am Eingang statt einer pro Zimmer.
   ============================================================ */

document.addEventListener("change", (e) => {
  // Rhythmus im Hinzufügen-Formular: die Monats-Auswahl ein- oder ausblenden.
  // Hier bewusst KEIN render() — das würde die halb ausgefüllte Zeile löschen.
  if (e.target.matches("[data-add-rhythmus]")) {
    const feld = e.target.closest("form").querySelector("[data-add-faellig-feld]");
    if (feld) feld.classList.toggle("versteckt", e.target.value === "monatlich");
    return;
  }

  // Das Ende einer laufenden Pause verschieben.
  const pauseBis = e.target.closest("[data-pause-bis]");
  if (pauseBis) {
    const { cat, id } = pauseBis.dataset;
    const posten = (STATE.currentMonth[cat] || []).find(p => p.id === id);
    if (posten) {
      posten.pausiertBis = e.target.value;
      speichern();
      render();
    }
    return;
  }

  // Ein bestehender Posten wurde geändert (Text, Betrag, Häkchen)
  const feld = e.target.closest("[data-field]");
  if (feld) {
    const { cat, id, field } = feld.dataset;
    const liste = STATE.currentMonth[cat];
    if (!liste) return;
    const posten = liste.find(p => p.id === id);
    if (!posten) return;

    if (field === "amount")     posten.amount     = e.target.value === "" ? 0 : Number(e.target.value);
    if (field === "label")      posten.label      = e.target.value;
    if (field === "notwendig")  posten.notwendig  = e.target.checked;
    if (field === "gearbeitet") posten.gearbeitet = e.target.checked;
    if (field === "fuersZiel")  posten.fuersZiel  = e.target.checked;

    speichern();
    render();
    return;
  }

  /* Kontostand zu Beginn des Monats — ab jetzt ein ANKER.

     Der Unterschied zu früher ist entscheidend: Was hier eingetragen wird,
     überschreibt keine gerechnete Zahl mehr, sondern setzt einen neuen
     Startpunkt für die Kette. Sie rechnet ab hier vorwärts, jeder Monat
     danach korrigiert sich mit, und wegnehmen lässt es sich auch wieder.

     Ein geleertes Feld löst den Anker auf, statt ihn auf 0 zu setzen —
     „ich weiß es doch nicht" ist etwas anderes als „das Konto stand auf null". */
  if (e.target.id === "start-guthaben") {
    STATE.currentMonth.anchorBalance = betragAusText(e.target.value);
    speichern();
    render();
    return;
  }

  // Wochenstunden (Grundlage der Lebenszeit-Rechnung)
  if (e.target.id === "wochenstunden") {
    const wert = Number(e.target.value);
    STATE.einstellungen.wochenstunden = Math.min(80, Math.max(1, isNaN(wert) ? 40 : wert));
    speichern();
    render();
    return;
  }

  // Notgroschen, der schon vor der App da war
  if (e.target.id === "notgroschen-start") {
    const wert = Number(e.target.value);
    STATE.einstellungen.notgroschenStart = Math.max(0, isNaN(wert) ? 0 : wert);
    speichern();
    render();
    return;
  }

  /* Die vier Felder des Sparziels. Sie stehen in der Karte an zwei Stellen
     (leerer Zustand und „Ziel ändern"), tragen aber dieselben IDs — es ist
     immer nur eine davon im Dokument. */
  if (e.target.id === "sparziel-label" || e.target.id === "sparziel-betrag" ||
      e.target.id === "sparziel-termin" || e.target.id === "sparziel-start") {
    const s = STATE.einstellungen.sparziel || leeresSparziel();
    if (e.target.id === "sparziel-label")  s.label  = e.target.value.slice(0, 60);
    if (e.target.id === "sparziel-betrag") s.betrag = Math.max(0, Number(e.target.value) || 0);
    if (e.target.id === "sparziel-termin") s.termin = e.target.value || "";
    if (e.target.id === "sparziel-start")  s.start  = Math.max(0, Number(e.target.value) || 0);
    STATE.einstellungen.sparziel = sauberesSparziel(s);
    speichern();
    render();
    return;
  }

  // Import-Datei ausgewählt
  if (e.target.id === "import-datei") {
    importDatei(e.target.files[0]);
  }
});

/* Eine Kategorie-Karte wurde auf- oder zugeklappt.
   Das "toggle"-Ereignis steigt nicht nach oben durch (es "bubblet" nicht),
   deshalb hören wir mit `true` in der Einfangphase zu — so bekommen wir es
   trotzdem am Dokument mit. Neu gezeichnet wird hier bewusst nichts, wir
   merken uns nur den Zustand. */
document.addEventListener("toggle", (e) => {
  // Die Sätze-Verwaltung merkt sich ihren Zustand nur bis zum Neuladen —
  // gerade genug, damit sie beim Hinzufügen eines Satzes offen bleibt.
  if (e.target.classList && e.target.classList.contains("affirmation-verwalten")) {
    affirmationenOffen = e.target.open;
    return;
  }

  if (e.target.classList && e.target.classList.contains("sparziel-aendern")) {
    sparzielAendernOffen = e.target.open;
    return;
  }

  if (e.target.classList && e.target.classList.contains("anker-setzen")) {
    ankerAendernOffen = e.target.open;
    return;
  }

  const karte = e.target.closest && e.target.closest("[data-kat]");
  if (!karte) return;

  const key = karte.dataset.kat;
  const zu = STATE.einstellungen.zugeklappt;
  const platz = zu.indexOf(key);

  /* Nur speichern, wenn sich wirklich etwas geändert hat.

     Wichtig: Der Browser meldet "toggle" auch dann, wenn eine Karte beim
     Neuzeichnen frisch entsteht. Ohne diese Prüfung würde jedes render()
     acht überflüssige Schreibvorgänge auslösen. */
  let geaendert = false;
  if (karte.open && platz >= 0) { zu.splice(platz, 1); geaendert = true; } // wieder offen
  if (!karte.open && platz < 0) { zu.push(key);        geaendert = true; } // zugeklappt

  if (geaendert) speichern();
}, true);

// Klicks: Löschen, Pause, Hilfe-Knopf, Willkommens-Fenster schließen
document.addEventListener("click", (e) => {
  /* Den Anker des laufenden Monats auflösen: Er erbt wieder vom Vormonat.
     Damit ist auch ein falsch gesetzter Anker keine Sackgasse. */
  if (e.target.closest("#btn-anker-weg")) {
    STATE.currentMonth.anchorBalance = null;
    speichern();
    render();
    return;
  }

  /* Einen Archiv-Monat korrigieren.

     Nur der Startwert lässt sich hier ändern, und das ist Absicht: Er ist die
     eine Zahl, die man im Nachhinein WISSEN kann — der Kontoauszug von damals
     sagt sie. Alles andere (welcher Posten wie hoch war) müsste man raten.

     Der Rest ergibt sich von selbst: Ab dem korrigierten Monat rechnet die
     Kette neu vorwärts, und jeder Monat danach zieht mit. */
  const korr = e.target.closest("[data-korrigieren]");
  if (korr) {
    const id = korr.dataset.korrigieren;
    const eintrag = (STATE.archive || []).find(m => m.id === id);
    if (!eintrag) return;

    const kette = kontostandKette();
    const jetzt = kette[id] ? kette[id].start : runde(eintrag.snapshot.startBalance);
    const eingabe = prompt(
      `${monatLesbar(id)}: Was lag auf dem Konto, bevor die Einnahmen kamen?\n\n` +
      `Gerechnet wird gerade mit ${euro(jetzt)}.\n` +
      `Leer lassen nimmt die Korrektur zurück.`,
      eintrag.snapshot.anchorBalance !== null && eintrag.snapshot.anchorBalance !== undefined
        ? String(eintrag.snapshot.anchorBalance)
        : ""
    );
    if (eingabe === null) return; // abgebrochen

    eintrag.snapshot.anchorBalance = betragAusText(eingabe);
    speichern();
    render();
    return;
  }

  /* Einen wiederkehrenden Posten pausieren.

     Die Pause endet standardmäßig mit DIESEM Monat — das ist der Fall, für
     den man den Knopf drückt („mein Gym ruht diesen Monat"). Dauert es
     länger, schiebt die Auswahl daneben das Ende weiter. */
  const pauseAn = e.target.closest("[data-pause-an]");
  if (pauseAn) {
    const { cat, id } = pauseAn.dataset;
    const posten = (STATE.currentMonth[cat] || []).find(p => p.id === id);
    if (posten) {
      posten.pausiertBis = STATE.currentMonth.id;
      speichern();
      render();
    }
    return;
  }

  // … und wieder aktivieren.
  const pauseAus = e.target.closest("[data-pause-aus]");
  if (pauseAus) {
    const { cat, id } = pauseAus.dataset;
    const posten = (STATE.currentMonth[cat] || []).find(p => p.id === id);
    if (posten) {
      posten.pausiertBis = "";
      speichern();
      render();
    }
    return;
  }

  const del = e.target.closest("[data-del]");
  if (del) {
    const { cat, id } = del.dataset;
    STATE.currentMonth[cat] = STATE.currentMonth[cat].filter(p => p.id !== id);
    speichern();
    render();
    return;
  }

  /* Das Sparziel löschen. Nachgefragt wird, weil auch die Häkchen an den
     Sparposten ihren Sinn verlieren — das Geld bleibt, aber es zählt ab
     dann wieder zum Notgroschen. */
  if (e.target.closest("#btn-sparziel-weg")) {
    const s = STATE.einstellungen.sparziel || leeresSparziel();
    const name = s.label || "dein Sparziel";
    if (!confirm(`„${name}" löschen?\n\nDein Gespartes bleibt erhalten und zählt ab dann wieder zum Notgroschen.`)) return;
    STATE.einstellungen.sparziel = leeresSparziel();
    /* Die Häkchen im laufenden Monat mit zurücksetzen. Ließe man sie stehen,
       wären beim nächsten Ziel plötzlich alte Sparposten dafür angerechnet,
       die mit ihm nie etwas zu tun hatten. */
    (STATE.currentMonth.sparen || []).forEach(p => { p.fuersZiel = false; });
    speichern();
    render();
    return;
  }

  // Einen Satz weiterblättern. Nur eine Anzeige-Sache, deshalb nichts speichern.
  if (e.target.closest("#btn-affirmation-weiter")) {
    affirmationOffset++;
    renderAffirmation();
    return;
  }

  // Einen deiner eigenen Sätze löschen. Die 111 aus dem Programm stehen fest.
  const weg = e.target.closest("[data-affirmation-weg]");
  if (weg) {
    const platz = Number(weg.dataset.affirmationWeg);
    STATE.einstellungen.eigeneAffirmationen.splice(platz, 1);
    speichern();
    renderAffirmation();
    return;
  }

  if (e.target.closest("#btn-onboarding-fertig")) {
    STATE.onboardingGesehen = true;
    speichern();
    render();
    return;
  }

  /* „Gehalt ist da" — der Zyklus fängt heute neu an.

     Bewusst ohne Rückfrage und ohne Datumsfeld: Der Knopf wird einmal im
     Monat gedrückt, und ein Dialog davor würde ihn zur Aufgabe machen.
     Danebengedrückt wird der Zyklus ein paar Tage zu früh anfangen, bis
     beim nächsten Gehalt wieder gedrückt wird. */
  if (e.target.closest("#btn-gehalt-da")) {
    STATE.einstellungen.zyklusStart = alsTagesId(new Date());
    speichern();
    render();
    return;
  }

  if (e.target.closest("#btn-hilfe")) {
    STATE.onboardingGesehen = false;
    speichern();
    render();
  }
});

// Neuen Posten hinzufügen (Formular abgeschickt)
document.addEventListener("submit", (e) => {
  // Einen eigenen Satz zur Sammlung legen
  if (e.target.closest("[data-affirmation-form]")) {
    e.preventDefault();
    const feld = e.target.querySelector("[data-affirmation-neu]");
    const satz = feld.value.trim().slice(0, AFFIRMATION_MAX);
    if (satz === "") return;

    /* Doppelte lassen wir gar nicht erst rein, sonst käme derselbe Satz
       zweimal so oft dran wie die anderen. Geprüft wird gegen ALLE Sätze,
       auch die festen: Wer „Ich bin reich." eintippt, hat ihn längst. */
    if (!alleAffirmationen().includes(satz)) {
      STATE.einstellungen.eigeneAffirmationen.push(satz);
      speichern();
    }
    feld.value = "";
    renderAffirmation();
    return;
  }

  // Einen zugeflossenen Moment festhalten
  if (e.target.closest("[data-zufluss-form]")) {
    e.preventDefault();
    const textFeld = e.target.querySelector("[data-zufluss-label]");
    const wertFeld = e.target.querySelector("[data-zufluss-amount]");
    const label = textFeld.value.trim().slice(0, 60);
    const wert  = Math.max(0, Number(wertFeld.value) || 0);

    /* Ohne Bezeichnung geht nichts rein — anders als bei den Posten, wo ein
       nackter Betrag reicht. Hier ist der Text die eigentliche Sache: „20 €"
       erinnert an nichts, „Oma hat mir was zugesteckt" an alles. */
    if (label === "") {
      textFeld.focus();
      return;
    }

    STATE.currentMonth.zufluesse.push({ id: neueId(), label: label, amount: wert });
    speichern();
    textFeld.value = "";
    wertFeld.value = "";
    renderZufluss();
    return;
  }

  const form = e.target.closest("[data-add]");
  if (!form) return;
  e.preventDefault(); // Seite nicht neu laden

  const katKey = form.dataset.add;
  const kat = KATEGORIEN.find(k => k.key === katKey);
  if (!kat) return;

  const label  = form.querySelector("[data-add-label]").value.trim();
  const roh    = form.querySelector("[data-add-amount]").value;
  const amount = roh === "" ? 0 : Number(roh);

  // Leere Einträge (kein Text UND kein Betrag) ignorieren wir.
  if (label === "" && amount === 0) return;

  const posten = { id: neueId(), label: label || "(ohne Namen)", amount: amount };

  if (kat.schalter) {
    const feld = form.querySelector("[data-add-schalter]");
    posten[kat.schalter.feld] = feld ? feld.checked : false;
  }
  if (kat.wiederkehrend) {
    const rFeld = form.querySelector("[data-add-rhythmus]");
    posten.rhythmus = (rFeld && INTERVALL[rFeld.value]) ? rFeld.value : "monatlich";
    // Bei monatlichen Posten ist der Fälligkeits-Monat egal, deshalb nehmen
    // wir dort einfach den laufenden Monat.
    const fFeld = form.querySelector("[data-add-faellig]");
    posten.faellig = (posten.rhythmus !== "monatlich" && fFeld)
      ? Number(fFeld.value) || 1
      : monatsNummer(STATE.currentMonth.id);
  }

  STATE.currentMonth[katKey].push(posten);
  speichern();
  render();

  // War das eine Ausnahme? Dann kommt der Kommentar sofort, nicht erst
  // am Monatsende.
  if (istAusnahmePosten(kat, posten) && amount > 0) {
    zeigeReaktion(reaktionsText(rechneAktuell(), posten));
  }
});

/* ------------------------------------------------------------
   14. MONAT ABSCHLIESSEN
   Den aktuellen Monat als Schnappschuss ins Archiv legen und
   einen neuen Monat starten. Alle wiederkehrenden Kategorien
   (Fixkosten, Abos, Versicherungen) kommen automatisch mit,
   dein Ziel ebenfalls.
   ------------------------------------------------------------ */
document.getElementById("btn-monat-abschliessen").addEventListener("click", () => {
  const monat = STATE.currentMonth;
  const z = rechneAktuell();
  const zu = zufluss(monat);

  const bestaetigt = confirm(
    `„${monatLesbar(monat.id)}" abschließen?\n\n` +
    `Er wandert ins Archiv. Fixkosten, Abos und Versicherungen nimmst du in den nächsten Monat mit.\n` +
    `Kontostand ${euro(z.kontostand)} wird als neues Startguthaben übernommen.`
  );
  if (!bestaetigt) return;

  /* Den Startwert aus der Kette in den Monat schreiben, BEVOR er kopiert wird.
     Maßgeblich ist er nicht — die Kette rechnet ihn beim Anzeigen ohnehin neu.
     Aber ein Schnappschuss, in dem eine überholte Zahl steht, wäre eine zweite
     Wahrheit im Archiv, und irgendwer liest irgendwann die falsche. */
  monat.startBalance = z.startBalance;

  // Schnappschuss + zusammengefasste Zahlen ins Archiv (vorne einfügen = neueste zuerst)
  STATE.archive.unshift({
    id: monat.id,
    summary: {
      gehalt: z.gehalt,
      notwendig: z.notwendigUmlage,
      nicht: z.nichtUmlage,
      gespart: z.gespart,
      // Getrennt festhalten, damit Notgroschen und Sparziel jeder ihre
      // eigene Geschichte behalten. `gespart` bleibt die Summe aus beiden.
      gespartPuffer: z.gespartPuffer,
      gespartZiel: z.gespartZiel,
      kontostand: z.kontostand,
      quoteNicht: z.quoteNicht,
      quoteNotwendig: z.quoteNotwendig,
      quoteSpar: z.quoteSpar,
      regelErreicht: z.regelErreicht,
      /* Was dir in diesem Monat zugeflossen ist. Steht hier, obwohl es in
         `snapshot` ohnehin mitkommt: Die Gesamtzahl auf der Karte summiert
         nur diese beiden Felder und muss dafür nicht jeden Archiv-Monat
         durchrechnen. */
      zuflussSumme: zu.summe,
      zuflussAnzahl: zu.anzahl,
    },
    snapshot: JSON.parse(JSON.stringify(monat)), // tiefe Kopie, damit spätere Änderungen sie nicht betreffen
  });

  // Neuen Monat bauen: wiederkehrende Posten wandern mit, der Rest startet leer.
  // Abgelaufene Pausen enden dabei von selbst (siehe neuerMonat).
  STATE.currentMonth = neuerMonat(naechsterMonat(monat.id), z.kontostand, monat);

  /* Merken, wann zuletzt abgeschlossen wurde. Daraus weiß die Zyklus-Karte,
     ob seit dem letzten Gehaltseingang schon ein Monat abgeschlossen wurde —
     und erinnert nur dann, wenn sie es sicher weiß. */
  STATE.letzterAbschluss = alsTagesId(new Date());

  speichern();
  render();

  /* Einmal im Monat automatisch sichern.

     An Sicherungen denkt niemand, solange nichts kaputt ist — und dann ist
     es zu spät, weil deine Zahlen nur in diesem Browser liegen. Der
     Monatsabschluss ist der natürliche Moment dafür: einmal im Monat, ohne
     dass du dran denken musst. */
  sicherungHerunterladen();
  alert(
    "Monat abgeschlossen.\n\n" +
    "Ich habe gleich eine Sicherung deiner Zahlen heruntergeladen. " +
    "Heb die Datei auf — mit ihr bekommst du alles zurück, falls dieser Browser " +
    "mal leer ist oder du das Gerät wechselst."
  );
});

/* ------------------------------------------------------------
   15. SICHERN (Export) & LADEN (Import)
   Als JSON-Datei, damit du deinen Stand sichern oder auf ein
   anderes Gerät mitnehmen kannst.
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   MONATSBERICHT als PDF

   Kein zusätzliches Programm nötig: Jeder Browser kann eine Seite als PDF
   sichern. Wir bauen deshalb eine eigene, saubere Druckfassung und rufen
   den Druckdialog auf. Auf dem Mac heißt der Knopf dort „Als PDF sichern",
   auf dem iPhone findest du ihn im Teilen-Menü.

   Metapher: Die App zieht sich für den Termin einmal ordentlich an. Am
   Bildschirm siehst du davon nichts, das Kleid hängt im Schrank
   (display: none) und kommt nur zum Drucken raus.
   ------------------------------------------------------------ */
/* Der Hinweis vor dem Druckdialog.

   Der Dialog heißt „Drucken", obwohl niemand hier etwas drucken will —
   das Sichern als PDF versteckt sich darin. Ohne einen Satz dazu klickt
   man ihn weg und denkt, es hätte nicht funktioniert. Welchen Weg wir
   nennen, hängt am Gerät, deshalb fragen wir kurz nach, welches es ist. */
function berichtHinweis() {
  const kennung = navigator.userAgent;
  const istApple = /iPhone|iPad|iPod/.test(kennung);
  const istAndroid = /Android/.test(kennung);

  if (istApple) {
    return "Gleich öffnet sich die Druckansicht.\n\n" +
      "Tipp dort oben auf das Teilen-Symbol und wähle „In Dateien sichern“. " +
      "Dein Bericht liegt dann als PDF bei dir, gedruckt wird nichts.";
  }
  if (istAndroid) {
    return "Gleich öffnet sich die Druckansicht.\n\n" +
      "Wähle dort oben als Ziel „Als PDF speichern“ und tipp auf den blauen Knopf. " +
      "Dein Bericht landet dann als PDF in deinen Downloads, gedruckt wird nichts.";
  }
  return "Gleich öffnet sich der Druckdialog.\n\n" +
    "Wähle darin „Als PDF sichern“ (am Mac unten links im Ausklappmenü „PDF“, " +
    "unter Windows oben bei „Drucker“ den Eintrag „Microsoft Print to PDF“). " +
    "Dein Bericht wird dann als Datei gespeichert, gedruckt wird nichts.";
}

document.getElementById("btn-bericht").addEventListener("click", () => {
  renderBericht(rechneAktuell());
  alert(berichtHinweis());
  window.print();
});

function renderBericht(z) {
  const monat = STATE.currentMonth;
  const heute = new Date().toLocaleDateString("de-DE", {
    day: "2-digit", month: "long", year: "numeric",
  });

  // Eine Zeile der großen Zahlen-Tabelle.
  const zeile = (was, betrag, klasse) =>
    `<tr><th>${was}</th><td class="${klasse || ""}">${euro(betrag)}</td></tr>`;

  // Nur zeigen, wenn ein Teil des Geldes wirklich erarbeitet wurde.
  const erarbeitet = (z.arbeitsEinkommen > 0 && z.arbeitsEinkommen < z.gehalt)
    ? zeile("davon erarbeitet", z.arbeitsEinkommen)
    : "";

  // Das Urteil oben. Ohne Einnahmen gibt es keins.
  const v = z.keinGehalt ? null : verdiktFuer(z.quoteNicht);
  const verdikt = v
    ? `<div class="bericht-verdikt v${v.stufe}">
         <div class="bericht-prozent">${Math.round(z.quoteNicht)}%</div>
         <div class="bericht-prozent-unter">deines Geldes für Ausnahmen</div>
         <p class="bericht-spruch">${spruchFuer(v, monat.id, spruchDaten(z))}</p>
       </div>`
    : `<div class="bericht-verdikt v-neutral">
         <div class="bericht-prozent">–</div>
         <div class="bericht-prozent-unter">keine Einnahmen eingetragen</div>
       </div>`;

  // Die 30%-Marke: drunter geblieben oder drüber?
  let abmachung = "";
  if (z.regelErreicht === true) {
    abmachung = `<p class="bericht-abmachung gut">Unter der ${REGEL.nicht}%-Marke geblieben.</p>`;
  } else if (z.regelErreicht === false) {
    abmachung = `<p class="bericht-abmachung schlecht">Über der ${REGEL.nicht}%-Marke, und zwar um ${euro(z.ueberRegel)}.</p>`;
  }

  // Alle Ausnahmen, nicht nur die drei teuersten wie am Bildschirm.
  const ausnahmen = z.ausnahmen.length
    ? `<h2 class="bericht-titel">Deine Ausnahmen</h2>
       <table class="bericht-tabelle">
         ${z.ausnahmen.map(a => `
           <tr>
             <th>${escapeAttr(a.label)}${a.anzahl > 1 ? ` (${a.anzahl}×)` : ""}</th>
             <td>${euro(a.betrag)}</td>
           </tr>`).join("")}
         <tr class="summe"><th>zusammen</th><td>${euro(z.nichtUmlage)}</td></tr>
       </table>`
    : "";

  // Verträge nach Jahreskosten, mit Kündigungs-Kandidaten markiert.
  const vertraege = z.vertraege.length
    ? `<h2 class="bericht-titel">Abos und Versicherungen im Jahr</h2>
       <table class="bericht-tabelle">
         ${z.vertraege.map(t => `
           <tr>
             <th>${escapeAttr(t.label)}${t.notwendig ? "" : " · kündigen?"}</th>
             <td>${euro(t.proJahr)}</td>
           </tr>`).join("")}
         <tr class="summe"><th>zusammen im Jahr</th>
           <td>${euro(z.vertraege.reduce((s, t) => s + t.proJahr, 0))}</td></tr>
       </table>`
    : "";

  // Der Notgroschen-Stand, sofern überhaupt Fixkosten da sind.
  let puffer = "";
  if (z.notwendigUmlage > 0) {
    const n = notgroschen(z);
    puffer = `<h2 class="bericht-titel">Notgroschen</h2>
      <table class="bericht-tabelle">
        ${zeile("Ziel (" + n.stufe + ")", n.ziel)}
        ${zeile("bisher zusammen", n.bisher)}
        <tr class="summe"><th>Stand</th><td>${Math.round(n.quote)}%</td></tr>
      </table>`;
  }

  /* Was dir zugeflossen ist. Steht im Bericht ganz bewusst NICHT in der
     großen Zahlen-Tabelle, sondern als eigener Block darunter: Es ist kein
     Einkommen, das man verrechnet, sondern eine Liste, die man liest. */
  const zu = zufluss(monat);
  const jahreZu = zuflussJahre();
  let zugeflossen = "";
  if (zu.anzahl > 0) {
    /* Unter der Monatsliste steht dieselbe Jahresauswertung wie auf der
       Karte. Sie gehört in den Bericht, weil er das Blatt ist, das man
       aufhebt: In einem Jahr liest man dort nicht nur den Juli nach,
       sondern auch, was das Jahr insgesamt gebracht hat. */
    const jahresZeilen = jahreZu.map(j => `
      <tr><th>${j.jahr}</th>
          <td>${j.summe > 0 ? euro(j.summe) : "ohne Preis"} · ${malText(j.anzahl)}</td></tr>`).join("");

    zugeflossen = `<h2 class="bericht-titel">Wohlstand, der in dein Leben geflossen ist</h2>
      <table class="bericht-tabelle">
        ${zu.liste.map(e => `
          <tr><th>${escapeAttr(e.label)}</th>
              <td>${e.amount > 0 ? euro(e.amount) : "ohne Preis"}</td></tr>`).join("")}
        <tr class="summe"><th>${malText(zu.anzahl)} in diesem Monat</th>
          <td>${euro(zu.summe)}</td></tr>
      </table>
      <h3 class="bericht-untertitel">Jahresauswertung</h3>
      <table class="bericht-tabelle">${jahresZeilen}</table>`;
  }

  // Der Anhang: jeder einzelne Posten, nach Kategorie sortiert. Das macht
  // aus der Übersicht erst einen Bericht, den man nachschlagen kann.
  const anhang = KATEGORIEN.map(kat => {
    const liste = sortiertNachBetrag(monat[kat.key]);
    if (liste.length === 0) return "";
    return `
      <div class="bericht-block">
        <h3 class="bericht-untertitel">${kat.titel}</h3>
        <table class="bericht-tabelle">
          ${liste.map(p => {
            const intervall = kat.wiederkehrend ? (INTERVALL[p.rhythmus] || 1) : 1;
            const zusatz = intervall > 1 ? ` (${RHYTHMUS_TEXT[p.rhythmus]})` : "";
            return `<tr><th>${escapeAttr(p.label)}${zusatz}</th><td>${euro(p.amount)}</td></tr>`;
          }).join("")}
          <tr class="summe"><th>Summe</th><td>${euro(summe(liste))}</td></tr>
        </table>
      </div>`;
  }).join("");

  document.getElementById("bericht").innerHTML = `
    <div class="bericht-kopf">
      <h1 class="bericht-marke">girl<span>math</span></h1>
      <p class="bericht-monat">Monatsbericht · ${monatLesbar(monat.id)}</p>
    </div>

    ${verdikt}
    ${abmachung}

    <h2 class="bericht-titel">Die Zahlen</h2>
    <table class="bericht-tabelle gross">
      ${zeile("Einnahmen gesamt", z.gehalt)}
      ${erarbeitet}
      ${zeile("Notwendige Ausgaben", z.notwendigUmlage)}
      ${zeile("Ausnahmen", z.nichtUmlage, "wert-nicht")}
      ${zeile("Gespart", z.gespart)}
      ${zeile("Von diesem Monat noch frei", z.uebrig)}
      <tr class="summe"><th>Kontostand</th><td>${euro(z.kontostand)}</td></tr>
    </table>

    ${z.hatUmlage
      ? `<p class="bericht-fussnote">Jährliche und vierteljährliche Beträge sind auf den Monat
           umgelegt. Tatsächlich abgebucht wurden in diesem Monat ${euro(z.ausgegebenReal)}.</p>`
      : ""}

    <h2 class="bericht-titel">Realitäts-Check: die ${REGEL.name}-Regel</h2>
    <table class="bericht-tabelle">
      <tr><th>Notwendig</th><td>${Math.round(z.quoteNotwendig)}% <small>Ziel ${REGEL.notwendig}%</small></td></tr>
      <tr><th>Ausnahmen</th><td>${Math.round(z.quoteNicht)}% <small>Ziel ${REGEL.nicht}%</small></td></tr>
      <tr><th>Sparen</th><td>${Math.round(z.quoteSpar)}% <small>Ziel ${REGEL.sparen}%</small></td></tr>
    </table>

    ${ausnahmen}
    ${vertraege}
    ${puffer}
    ${zugeflossen}

    <h2 class="bericht-titel">Alle Posten im Einzelnen</h2>
    ${anhang}

    <p class="bericht-fuss">Erstellt am ${heute} · girl math ·
      Diese Zahlen stammen aus deinem Browser und wurden nirgendwo hochgeladen.</p>
  `;
}

/* Die Sicherung als Datei herunterladen. Steckt in einer eigenen Funktion,
   weil sie an zwei Stellen gebraucht wird: über den Knopf und automatisch
   beim Monatsabschluss. */
function sicherungHerunterladen() {
  const text = JSON.stringify(STATE, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "girl-math-sicherung-" + STATE.currentMonth.id + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("btn-export").addEventListener("click", sicherungHerunterladen);

document.getElementById("btn-import").addEventListener("click", () => {
  document.getElementById("import-datei").click(); // versteckte Dateiauswahl öffnen
});

function importDatei(datei) {
  if (!datei) return;
  const leser = new FileReader();
  leser.onload = () => {
    try {
      // Auch importierte Dateien laufen durch die Migration — dann funktionieren
      // alte Backups aus früheren Versionen weiterhin.
      const geladen = migriere(JSON.parse(leser.result));
      if (!geladen) throw new Error("Keine gültige girl-math-Datei.");
      if (!confirm("Aktuellen Stand mit der geladenen Datei ersetzen?")) return;
      STATE = geladen;
      speichern();
      render();
    } catch (err) {
      alert("Konnte die Datei nicht laden: " + err.message);
    }
  };
  leser.readAsText(datei);
}

/* ------------------------------------------------------------
   16. LOSLEGEN — einmal beim Laden der Seite alles zeichnen.
   ------------------------------------------------------------ */
// Zuerst: Stammt der Stand aus der Zeit vor der Kontostand-Kette, wird hier
// einmalig geprüft, dass sich beim Umstieg keine Zahl verschoben hat.
ankerAbsichern();
render();
