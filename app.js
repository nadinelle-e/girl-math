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
                      feld     = welches Feld am Posten gesetzt wird
                      text     = was neben dem Häkchen steht
                      standard = Stellung bei neuen Posten

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

     hinweis        Ein erklärender Satz unter der Überschrift
   ------------------------------------------------------------ */
const SCHALTER_NOTWENDIG_AUS = { feld: "notwendig",  text: "notwendig?",       standard: false };
const SCHALTER_NOTWENDIG_AN  = { feld: "notwendig",  text: "notwendig?",       standard: true  };
const SCHALTER_GEARBEITET    = { feld: "gearbeitet", text: "dafür gearbeitet?", standard: true  };

const KATEGORIEN = [
  { key: "income",         titel: "1 · Einnahmen 💰",              typ: "positiv",   zeitfeld: true, schalter: SCHALTER_GEARBEITET, platzhalter: "z.B. Gehalt",
    hinweis: "Alles, was reinkommt: Gehalt, Bürgergeld, Kindergeld, Unterhalt, Geschenke, Flohmarkt. Das Häkchen setzt du nur bei dem, wofür du wirklich Arbeitsstunden geleistet hast." },
  { key: "fixkosten",      titel: "2 · Fixkosten 🏠",              typ: "notwendig", wiederkehrend: true, platzhalter: "z.B. Miete" },
  { key: "abos",           titel: "3 · Abos 📺",                   typ: "abo",       wiederkehrend: true, schalter: SCHALTER_NOTWENDIG_AUS, vertrag: true, platzhalter: "z.B. Netflix" },
  { key: "versicherungen", titel: "4 · Versicherungen 🛡️",         typ: "abo",       wiederkehrend: true, schalter: SCHALTER_NOTWENDIG_AN,  vertrag: true, platzhalter: "z.B. Haftpflicht" },
  { key: "lebensmittel",   titel: "5 · Einkauf: Lebensmittel 🥑", typ: "notwendig", platzhalter: "z.B. Wocheneinkauf" },
  { key: "luxus",          titel: "6 · Einkauf: Ausnahmen 🍣",    typ: "nicht",     platzhalter: "z.B. Sushi" },
  { key: "konsum",         titel: "7 · Große Ausnahmen 🛍️",        typ: "nicht",     platzhalter: "z.B. Klamotten" },
  { key: "sparen",         titel: "8 · Sparen 💌",                 typ: "sparen",    platzhalter: "z.B. Rücklage" },
];

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

   Die Regel dabei, und sie ist die wichtigste in dieser Datei:
   DIE ZAHL IST DIE MUNITION, NICHT DIE POINTE.

   "624 € für Klamotten, dafür hast du 45 h gearbeitet" ist eine
   Umrechnung. Sie sagt nichts, was nicht schon dasteht, und man kann
   achselzuckend drüber hinweggehen: ja, hab ich, und?

   "Du bist da keine Kundin mehr, du bist Sponsorin" dreht die Rolle
   um. Plötzlich ist da ein anderer, der an ihr verdient. Das bleibt
   hängen. Die Zahl darunter macht es unwiderlegbar — aber die Pointe
   ist das Bild.

   Also: ein Bild, eine Umdeutung oder ein Vergleich mit ihrer eigenen
   Miete. Niemals nur eine geteilte Zahl.

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
        `${d.prozent}%. Du hast ${euro(d.summe)} verjubelt und den Rest tatsächlich behalten. Wer bist du und was hast du mit ihr gemacht?`,
      d => `Spar-Königin 👑 Dein Konto sieht aus wie das einer erwachsenen Frau. Verstörend.`,
      d => `Unter 10%. Entweder Disziplin oder Grippe. Ich zähl beides.`,
    ],
  },
  {
    grenze: 20, stufe: 1, sprueche: [
      d => d.jahr > 0 &&
        `Erwachsen. Igitt. ${euro(d.summe)} diesen Monat, ${euro(d.jahr)} aufs Jahr. Das ist ein Urlaub, den du dir in Einzelteilen gekauft hast.`,
      d => hatNamen(d.top) && d.top.anzahl > 1 &&
        `${d.top.label}, ${d.top.anzahl}×. Du hast ein Muster. Noch hast du es im Griff, aber ich guck jetzt hin.`,
      d => `Du hast dich benommen. Einmal. Wir tun jetzt so, als wäre das dein Charakter.`,
      d => `Solide wie eine Steuererklärung. Langweilig, und ich bin trotzdem stolz.`,
    ],
  },
  {
    grenze: 35, stufe: 2, sprueche: [
      d => d.miete &&
        `${euro(d.summe)} weg. Das sind ${d.miete}. Für Sachen, die keine Adresse haben.`,
      d => hatNamen(d.top) && d.topMiete &&
        `${d.top.label}: ${euro(d.top.betrag)}. Das sind ${d.topMiete}. Für einen Posten, der nicht mal ein Dach über dem Kopf ist.`,
      d => hatNamen(d.fix) &&
        `Deine größte Rechnung heißt ${d.fix.label} und kostet ${euro(d.fix.betrag)}. Deine Ausnahmen kosten ${euro(d.summe)}. Noch gewinnt die Rechnung. Noch.`,
      d => `Du stehst auf der Kippe, Schatz. Die Kippe hat WLAN und einen vollen Warenkorb.`,
    ],
  },
  {
    grenze: 50, stufe: 3, sprueche: [
      d => hatNamen(d.top) && hatNamen(d.fix) &&
        `${d.top.label} kostet dich ${euro(d.top.betrag)} im Monat, ${d.fix.label} kostet ${euro(d.fix.betrag)}. Du zahlst nebenbei eine zweite Rechnung, die dir nie jemand geschickt hat.`,
      d => d.jahr > 0 &&
        `${euro(d.jahr)} im Jahr, wenn das so weiterläuft. Dafür kriegt man ein Auto. Du kriegst dafür einen vollen Schrank und ein schlechtes Gefühl.`,
      d => d.miete &&
        `${euro(d.summe)} für Dinge, die dich morgen nicht wiedererkennen. Das sind ${d.miete}. Du hast dir das schöngeredet, ich hab's ausgerechnet.`,
      d => `Halbe-halbe zwischen Leben und Lifestyle. Lifestyle führt gerade nach Punkten.`,
    ],
  },
  {
    grenze: 70, stufe: 4, sprueche: [
      d => hatNamen(d.top) &&
        `Konsumopfer 🛍️ ${euro(d.top.betrag)} an ${d.top.label}. Du bist da keine Kundin mehr. Du bist Sponsorin.`,
      d => d.miete &&
        `Über die Hälfte weg. ${euro(d.summe)} an Leute, die deinen Namen nicht kennen — ${d.miete}.`,
      d => d.ueberRegel > 0 &&
        `${d.prozent}%. Erlaubt wären 30. Die ${euro(d.ueberRegel)} dazwischen hättest du behalten dürfen und hast dich dagegen entschieden.`,
      d => `Dein Ernst? ${d.prozent}%. Ich frag nicht wofür, ich seh's an deinem Flur.`,
    ],
  },
  {
    grenze: 100, stufe: 5, sprueche: [
      d => hatNamen(d.top) && d.gespart < d.top.betrag &&
        `Totales Konsumopfer 💀 ${d.top.label} hat diesen Monat ${euro(d.top.betrag)} von dir bekommen. Du selbst: ${euro(d.gespart)}. Rate mal, wer von euch beiden Pläne hat.`,
      d => `${euro(d.summe)} raus, Notgroschen bei ${euro(d.puffer)}. Wenn morgen die Waschmaschine stirbt, stehst du sehr gut angezogen daneben und guckst zu.`,
      d => d.miete &&
        `${euro(d.summe)} weg, ${d.miete}. Dein Gehalt kam an, hat sich kurz umgesehen und ist wieder gegangen.`,
      d => `Das war kein Monat, das war ein Raubzug. Und du warst Opfer und Täterin gleichzeitig.`,
    ],
  },
  {
    grenze: Infinity, stufe: 6, sprueche: [
      d => hatNamen(d.top) &&
        `Mehr raus als rein. ${d.top.label} allein: ${euro(d.top.betrag)}. Du finanzierst gerade fremde Leute mit Geld, das dir nicht gehört.`,
      d => d.miete &&
        `${d.miete}, ausgegeben für nichts, was bleibt. Du hast nicht über deine Verhältnisse gelebt, du hast die Verhältnisse ignoriert.`,
      d => `Insolvenz-Vibes 💀💀 ${euro(d.summe)} raus bei ${euro(d.gehalt)} rein. Du gibst Geld aus, das noch nicht erfunden wurde.`,
      d => `STOPP. Karte weg, Handy weg. Ruf mich an, wir regeln das zusammen.`,
    ],
  },
];

/* ------------------------------------------------------------
   5. SOFORT-REAKTIONEN — was die App sagt, in der Sekunde, in der
   du eine Ausnahme eintippst. Das Urteil am Monatsende kommt zu
   spät; wehtun muss es beim Tippen.
   ------------------------------------------------------------ */
const ZAEHL_SPRUECHE = [
  (n, p) => `Ausnahme Nummer ${n} diesen Monat: ${p.label} für ${euro(p.amount)}. Ich zähle mit.`,
  (n, p) => `Notiert. ${p.label}, ${euro(p.amount)}. Macht ${n} Ausnahmen bisher. Kein Kommentar.`,
  (n, p) => `Nummer ${n}. Das ist kein Zufall mehr, das ist ein Muster.`,
  (n, p) => `${n} Ausnahmen. Du weißt, dass ich das aufschreibe, ja?`,
];

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

/* Einen Betrag ins Verhältnis zur größten notwendigen Ausgabe setzen.
   `fix` ist { label, betrag } — meist die Miete, sonst Strom oder Einkauf.

   Unter 10% bleibt es still: "3% deiner Miete" wäre kein Argument,
   sondern nur eine Zahl, und die App soll nicht bei jedem Kaffee reden. */
function mietenText(betrag, fix) {
  if (!fix || !(fix.betrag > 0) || !(betrag > 0)) return "";
  const anteil = betrag / fix.betrag;
  if (anteil < 0.1) return "";
  const name = (fix.label && fix.label !== "(ohne Namen)") ? fix.label : "Fixkosten";
  if (anteil < 1) return Math.round(anteil * 100) + "% deiner " + name;
  if (anteil < 10) return anteil.toFixed(1).replace(".", ",") + "× deine " + name;
  return Math.round(anteil) + "× deine " + name;
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
   8. NEUEN MONAT bauen.
   Alle wiederkehrenden Kategorien (Fixkosten, Abos, Versicherungen)
   werden aus dem Vormonat übernommen — inklusive Rhythmus. Genau
   das ist der Punkt: du tippst deine Miete nur EINMAL ein.
   ------------------------------------------------------------ */
function neuerMonat(id, startguthaben, vorlage) {
  const monat = {
    id: id,
    startBalance: startguthaben || 0,
  };
  KATEGORIEN.forEach(kat => {
    const uebernehmen = kat.wiederkehrend && vorlage && Array.isArray(vorlage[kat.key]);
    monat[kat.key] = uebernehmen
      ? vorlage[kat.key].map(p => ({ ...p, id: neueId() })) // Kopie mit frischer ID
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
let STATE = laden();

function standardEinstellungen() {
  return {
    wochenstunden: 40,      // für die Lebenszeit-Umrechnung
    notgroschenStart: 0,    // was du schon zurückgelegt hast, außerhalb der App
    zugeklappt: [],         // welche Kategorie-Karten du eingeklappt hast
  };
}

function leererStand() {
  return {
    version: 3,
    einstellungen: standardEinstellungen(),
    currentMonth: neuerMonat(monatsId(new Date()), 0, null),
    archive: [],
    onboardingGesehen: false,
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
    },
    currentMonth: normalisiereMonat(daten.currentMonth, heute),
    archive: archive,
    onboardingGesehen: daten.onboardingGesehen === true,
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
    startBalance: Number(roh.startBalance) || 0,
  };
  KATEGORIEN.forEach(kat => {
    const liste = Array.isArray(roh[kat.key]) ? roh[kat.key] : [];
    sauber[kat.key] = liste.map(p => normalisierePosten(p, kat, sauber.id));
  });
  return sauber;
}

function normalisierePosten(roh, kat, monatId) {
  const p = (roh && typeof roh === "object") ? roh : {};
  const posten = {
    id: p.id ? String(p.id) : neueId(),
    label: typeof p.label === "string" ? p.label : "",
    amount: Number(p.amount) || 0,
  };
  if (kat.schalter) {
    // War das Häkchen schon gesetzt? Sonst die Standard-Stellung nehmen.
    const feld = kat.schalter.feld;
    posten[feld] = typeof p[feld] === "boolean" ? p[feld] : !!kat.schalter.standard;
  }
  if (kat.wiederkehrend) {
    posten.rhythmus = INTERVALL[p.rhythmus] ? p.rhythmus : "monatlich";
    const f = Number(p.faellig);
    posten.faellig = (f >= 1 && f <= 12) ? f : monatsNummer(monatId);
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
function rechne(monat) {
  const monatNr = monatsNummer(monat.id);

  const z = {
    gehalt: 0,            // ALLES, was reinkommt — auch Bürgergeld, Geschenke, Verkäufe
    arbeitsEinkommen: 0,  // nur das, wofür du wirklich Stunden gearbeitet hast
    gespart: 0,
    notwendigUmlage: 0, nichtUmlage: 0,   // auf den Monat verteilt
    notwendigReal: 0,   nichtReal: 0,     // was wirklich abgeht
    faelligJetzt: [],                     // große Brocken DIESEN Monat
    faelligBald: [],                      // … und in den nächsten zwei
    ruecklageProMonat: 0,                 // was du zurücklegen solltest
    ausnahmen: [],                        // alle Ausnahmen einzeln (für die Rangliste)
    notwendige: [],                       // Miete, Strom & Co. (als Vergleichsmaßstab)
    vertraege: [],                        // Abos + Versicherungen (Kündigungs-Blick)
  };

  KATEGORIEN.forEach(kat => {
    (monat[kat.key] || []).forEach(posten => {
      const betrag = Number(posten.amount) || 0;

      if (kat.typ === "positiv") {
        // In die Prozente geht ALLES ein, was du zur Verfügung hast — Bürgergeld
        // und Flohmarkt-Geld zählen genauso wie Gehalt. In den Stundenlohn geht
        // nur das, wofür du tatsächlich gearbeitet hast: Ein Geburtstagsgeschenk
        // durch deine Wochenstunden zu teilen wäre schlicht falsch gerechnet.
        z.gehalt += betrag;
        if (posten.gearbeitet) z.arbeitsEinkommen += betrag;
        return;
      }
      if (kat.typ === "sparen") { z.gespart += betrag; return; }

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
  z.kontostand       = (monat.startBalance || 0) + z.gehalt - z.ausgegebenReal - z.gespart;

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

/* Der Notgroschen: drei Monatsausgaben als Puffer. Die App kennt deine
   notwendigen Monatskosten schon, also rechnet sie dir das Ziel selbst
   aus. Zusammengezählt wird alles, was du je gespart hast — die
   abgeschlossenen Monate plus der laufende. */
function notgroschen(z) {
  const dreiMonate  = z.notwendigUmlage * 3;
  const sechsMonate = z.notwendigUmlage * 6;

  const alt = STATE.archive.reduce(
    (s, m) => s + (Number(m.summary && m.summary.gespart) || 0), 0);
  // Was schon vor der App auf der hohen Kante lag, zählt selbstverständlich mit.
  const vorhanden = Number(STATE.einstellungen.notgroschenStart) || 0;
  const bisher = vorhanden + alt + summe(STATE.currentMonth.sparen);

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

/* ============================================================
   11. ZEICHNEN (render) — STATE als Seite darstellen.
   render() ruft alle Teil-Zeichner auf und wird nach jeder
   Änderung erneut ausgeführt.
   ============================================================ */
function render() {
  const z = rechne(STATE.currentMonth); // "z" = Zahlen
  renderKopf(z);
  renderZiel(z);
  renderKategorien(z);
  renderFaellig(z);
  renderVertraege(z);
  renderKonto(z);
  renderUebersicht(z);
  renderNotgroschen(z);
  renderArchiv();
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
    let zeit = "";
    if (std) {
      zeit = `<p class="verdikt-zeit">Dafür hast du <strong>${std}</strong> gearbeitet.${tage ? ` Das sind ${tage}.` : ""}</p>`;
    } else if (imVerhaeltnis) {
      zeit = `<p class="verdikt-zeit">Das sind <strong>${imVerhaeltnis}</strong>.</p>`;
    }
    banner = `
      <div class="verdikt v${v.stufe}">
        <p class="prozent">${Math.round(z.quoteNicht)}%<small> deines Gehalts für Ausnahmen</small></p>
        <p class="spruch">${spruchFuer(v, STATE.currentMonth.id, spruchDaten(z))}</p>
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

/* --- 11b. Dein Stand gegen die 30%-Marke + die Serie ---

   Hier stand früher ein zweites, selbstgesetztes Ziel. Das ist raus: Sein
   Startwert war die Regel, es durfte die Regel nicht überschreiten, und
   damit hat es nichts gemessen, was die Regel nicht schon misst. Eine
   Messlatte reicht. --- */
function renderZiel(z) {
  const serie = serieLaenge();

  // Der Serien-Streifen. Ohne abgeschlossene Monate gibt es noch nichts zu zeigen.
  let serieHtml = "";
  if (serie > 0) {
    serieHtml = `<div class="serie serie-laeuft">🔥 ${serie} ${serie === 1 ? "Monat" : "Monate"} in Folge unter ${REGEL.nicht}% geblieben. Nicht du bist es, die das jetzt reißt.</div>`;
  } else if (STATE.archive.length > 0) {
    serieHtml = `<div class="serie serie-weg">Serie bei 0. Dieser Monat ist der erste einer neuen.</div>`;
  }

  let stand;
  if (z.keinGehalt) {
    stand = `<p class="ziel-stand">Sobald deine Einnahmen drin stehen, messe ich dich daran.</p>`;
  } else if (z.regelErreicht) {
    const luft = REGEL.nicht - z.quoteNicht;
    stand = `<p class="ziel-stand gut">Du bist bei <strong>${Math.round(z.quoteNicht)}%</strong>
      und hast noch <strong>${Math.round(luft)} Prozentpunkte</strong> Luft. Verbau's nicht.</p>`;
  } else {
    stand = `<p class="ziel-stand schlecht">Du bist bei <strong>${Math.round(z.quoteNicht)}%</strong>.
      Erlaubt wären ${REGEL.nicht}%. Das sind <strong>${euro(z.ueberRegel)}</strong> zu viel.</p>`;
  }

  let zustand = "";
  if (!z.keinGehalt) zustand = z.regelErreicht ? "ok" : "gerissen";

  document.getElementById("ziel").innerHTML = `
    <div class="karte ziel-karte ${zustand}">
      <div class="ziel-kopf">
        <h2 class="ziel-titel">${monatLesbar(STATE.currentMonth.id)}: höchstens ${REGEL.nicht}% Ausnahmen</h2>
      </div>
      ${stand}
      ${serieHtml}
    </div>
  `;
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

  // Summe farblich passend zeigen
  let summenKlasse = "";
  if (kat.typ === "positiv" || kat.typ === "sparen") summenKlasse = "summe-positiv";
  if (kat.typ === "nicht") summenKlasse = "summe-nicht";

  const zeilen = liste.length === 0
    ? `<p class="leer-hinweis">Noch nichts eingetragen.</p>`
    : liste.map(p => postenHtml(kat, p, z)).join("");

  // Zweite Zeile im Hinzufügen-Formular: Häkchen und/oder Rhythmus.
  const extras = [];
  if (kat.schalter) {
    extras.push(`<label class="schalter">
      <input type="checkbox" data-add-schalter ${kat.schalter.standard ? "checked" : ""}>
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

  // Bei wiederkehrenden Kategorien sagen wir dazu, dass sie mitwandern.
  // Kategorien mit eigenem `hinweis` bekommen ihren eigenen Satz.
  const hinweisText = kat.hinweis
    || (kat.wiederkehrend ? "Läuft automatisch in den nächsten Monat weiter." : "");
  const hinweis = hinweisText ? `<p class="kat-hinweis">${hinweisText}</p>` : "";

  // Nur bei den Einnahmen: das Feld für die Wochenstunden, aus dem sich
  // der Stundenlohn und damit die ganze Lebenszeit-Rechnung ergibt.
  const zeitfeld = kat.zeitfeld ? wochenstundenHtml(z) : "";

  /* Jede Kategorie ist ein <details>-Element: Der Kopf bleibt immer sichtbar,
     der Inhalt klappt darunter auf und zu. Das spart Platz, ohne dass du die
     Übersicht verlierst — Summe und Anzahl stehen auch im eingeklappten
     Zustand im Kopf.
     Welche Karten zu sind, merkt sich die App in den Einstellungen. */
  const offen = !STATE.einstellungen.zugeklappt.includes(kat.key);
  const anzahl = liste.length === 1 ? "1 Posten" : `${liste.length} Posten`;

  return `
    <details class="karte kat-karte" data-kat="${kat.key}" ${offen ? "open" : ""}>
      <summary class="karte-kopf">
        <span class="karte-pfeil" aria-hidden="true">▸</span>
        <h2 class="karte-titel">${kat.titel}</h2>
        <span class="karte-anzahl">${anzahl}</span>
        <span class="karte-summe ${summenKlasse}">${euro(summe(liste))}</span>
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
      <p class="feld-hinweis breit">Gerechnet aus ${euro(z.arbeitsEinkommen)} Arbeitseinkommen.
        Damit übersetze ich jede Ausnahme in Arbeitszeit. Der Preis steht auf dem Etikett, der Rest auf deiner Uhr.</p>
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

// HTML für eine einzelne Posten-Zeile.
function postenHtml(kat, p, z) {
  // Alles, was unter die Betrags-Zeile gehört (Häkchen, Rhythmus, Arbeitszeit).
  const meta = [];
  const betrag = Number(p.amount) || 0;

  if (kat.schalter) {
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
  }

  // Der Zeitpreis nur da, wo er wehtut: bei Ausnahmen und bei allem,
  // was du selbst als „nicht notwendig" markiert hast. `massstab` liefert
  // Arbeitsstunden, wenn es welche gibt, sonst Lebenstage.
  if (istAusnahmePosten(kat, p)) {
    const zp = massstab(betrag / intervall, z);
    if (zp) meta.push(`<span class="zeit-schild">⏱ ${zp}</span>`);
  }

  const metaZeile = meta.length ? `<div class="posten-meta">${meta.join("")}</div>` : "";

  return `
    <div class="posten">
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
      <h3 class="faellig-titel">💣 Diesen Monat geht zusätzlich ab</h3>
      <p class="faellig-unter">Das sind keine monatlichen Posten. Die schlagen jetzt komplett zu.</p>
      ${z.faelligJetzt.map(e => zeile(e)).join("")}
      <div class="faellig-summe">zusammen ${euro(z.faelligJetzt.reduce((s, e) => s + e.betrag, 0))}</div>
    </div>` : "";

  const bald = z.faelligBald.length ? `
    <div class="karte faellig-karte bald">
      <h3 class="faellig-titel">👀 Kommt bald auf dich zu</h3>
      <p class="faellig-unter">Damit es dich nicht aus dem Nichts trifft.</p>
      ${z.faelligBald.map(e => zeile(e, " · im " + MONATSNAMEN[e.monatNr - 1])).join("")}
    </div>` : "";

  // Der Schritt, der aus Wissen Handeln macht: das Geld auch wirklich weglegen.
  const ruecklage = z.ruecklageProMonat > 0 ? `
    <div class="karte ruecklage-karte">
      <h3 class="faellig-titel">🏦 Deine Rücklage für diesen Monat</h3>
      <p class="ruecklage-betrag">${euro(z.ruecklageProMonat)}</p>
      <p class="faellig-unter">So viel kosten deine nicht-monatlichen Posten im Schnitt pro Monat.
        Leg das jetzt zur Seite, dann trifft dich der Fälligkeits-Monat nicht.
        Rechnen tut die App das schon. Weglegen musst du selbst.</p>
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
  const unnoetigJahr = z.vertraege.filter(v => !v.notwendig).reduce((s, v) => s + v.proJahr, 0);
  const zpUnnoetig = massstab(unnoetigJahr, z);

  const fazit = unnoetigJahr > 0
    ? `<div class="vertrag-fazit">Davon <strong>${euro(unnoetigJahr)}</strong> im Jahr für Verträge,
         die du selbst als nicht notwendig markiert hast.${zpUnnoetig ? ` Das sind ${zpUnnoetig}.` : ""}
         Kündigen, pausieren oder wechseln?</div>`
    : `<div class="vertrag-fazit">Alles als notwendig markiert. Trotzdem lohnt der Blick: bei welchem davon
         zahlst du zu viel, ohne es zu merken?</div>`;

  ziel.innerHTML = `
    <h2 class="nr-titel">Was kostet dich das im Jahr?</h2>
    <div class="karte vertrag-karte">
      <p class="kat-hinweis">Abos und Versicherungen nach Jahreskosten sortiert.
        20 € im Monat klingen harmlos. 240 € im Jahr nicht mehr.</p>
      ${zeilen}
      <div class="vertrag-summe">zusammen ${euro(gesamtJahr)} im Jahr</div>
      ${fazit}
    </div>
  `;
}

/* --- 11f. Kontostand-Bereich (echtes Geld, keine Umlage) --- */
function renderKonto(z) {
  const negativ = z.kontostand < 0 ? "negativ" : "";

  // Nur zeigen, wenn Umlage und echte Abbuchung auseinandergehen.
  const echtZeile = z.hatUmlage
    ? `<p class="konto-fussnote">Diesen Monat wirklich abgebucht: <strong>${euro(z.ausgegebenReal)}</strong>
         In der Übersicht unten rechnen wir mit ${euro(z.ausgegebenUmlage)} umgelegt.</p>`
    : "";

  document.getElementById("konto").innerHTML = `
    <h2 class="nr-titel">9 · Kontostand</h2>
    <div class="karte konto-karte">
      <div class="konto-block">
        <div class="beschriftung">Kontostand am Monatsanfang</div>
        <input id="start-guthaben" type="number" step="0.01" inputmode="decimal"
               value="${STATE.currentMonth.startBalance ?? 0}" />
        <div class="feld-hinweis">Was am 1. wirklich auf dem Konto lag, vor Gehalt und vor allen Ausgaben.</div>
      </div>
      <div class="konto-block rechts">
        <div class="beschriftung">Aktueller Kontostand</div>
        <div class="konto-stand ${negativ}">${euro(z.kontostand)}</div>
      </div>
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

  const umlageHinweis = z.hatUmlage
    ? `<p class="kat-hinweis mittig">Jährliche und vierteljährliche Posten sind hier auf den Monat umgelegt.</p>`
    : "";

  document.getElementById("uebersicht").innerHTML = `
    <h2 class="nr-titel">Monats-Übersicht</h2>
    <div class="karte uebersicht-karte">
      ${donutHtml(z)}
      ${umlageHinweis}

      <div class="zahlenzeile"><span>Gehalt gesamt</span><span class="wert-positiv">${euro(z.gehalt)}</span></div>
      <div class="zahlenzeile"><span>Notwendige Ausgaben (${Math.round(z.quoteNotwendig)}%)</span><span>${euro(z.notwendigUmlage)}</span></div>
      <div class="zahlenzeile"><span>Ausnahmen (${Math.round(z.quoteNicht)}%)</span><span class="wert-nicht">${euro(z.nichtUmlage)}</span></div>
      <div class="zahlenzeile"><span>Gespart (${Math.round(z.quoteSpar)}%)</span><span class="wert-positiv">${euro(z.gespart)}</span></div>
      <div class="zahlenzeile dick"><span><strong>Noch nicht verplant</strong></span><span><strong>${euro(z.uebrig)}</strong></span></div>

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

  const rest = z.ausnahmen.length > 3
    ? `<p class="rang-rest">… und ${z.ausnahmen.length - 3} weitere.</p>`
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
      <p class="feld-hinweis breit">Was schon auf dem Tagesgeldkonto oder unterm Kopfkissen liegt.
        Einmal eintragen, dann rechnet die App es dazu. Was du in der App unter „Sparen"
        einträgst, kommt automatisch obendrauf.</p>
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
    text = `<p class="notgroschen-text gut">Sechs Monate Puffer stehen. Damit bist du wirklich
      unabhängig. Mehr muss auf dem Tagesgeldkonto nicht liegen. Was du ab jetzt zurücklegst,
      darf für dich arbeiten gehen.</p>`;
  } else if (n.dreiGeschafft) {
    text = `<p class="notgroschen-text gut">Drei Monate Puffer stehen, und das schaffen die meisten nie.
      Jetzt läuft es auf sechs Monate zu. Dir fehlen dafür noch <strong>${euro(n.fehlt)}</strong>.</p>`;
  } else {
    text = `<p class="notgroschen-text">Dir fehlen noch <strong>${euro(n.fehlt)}</strong>.
      Das ist kein Luxus, das ist deine Unabhängigkeit. Mit Puffer kannst du kündigen,
      ausziehen oder Nein sagen, ohne vorher rechnen zu müssen.</p>`;
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

/* --- 11i. Archiv der abgeschlossenen Monate --- */
function renderArchiv() {
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

    return `
      <div class="archiv-eintrag">
        <div>
          <div class="archiv-monat">${monatLesbar(m.id)}</div>
          <div class="archiv-detail">Gehalt ${euro(s.gehalt)} · Ausnahmen ${euro(s.nicht)} · gespart ${euro(s.gespart)}</div>
          ${zielMarke}
          ${trend}
        </div>
        <span class="archiv-badge v${v.stufe}">${Math.round(quote)}%</span>
      </div>
    `;
  }).join("");

  ziel.innerHTML = `<h2 class="archiv-titel">Archiv</h2>${eintraege}`;
}

/* --- 11j. Das Willkommens-Fenster beim ersten Besuch --- */
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

    speichern();
    render();
    return;
  }

  // Kontostand am Monatsanfang
  if (e.target.id === "start-guthaben") {
    STATE.currentMonth.startBalance = e.target.value === "" ? 0 : Number(e.target.value);
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

// Klicks: Löschen, Hilfe-Knopf, Willkommens-Fenster schließen
document.addEventListener("click", (e) => {
  const del = e.target.closest("[data-del]");
  if (del) {
    const { cat, id } = del.dataset;
    STATE.currentMonth[cat] = STATE.currentMonth[cat].filter(p => p.id !== id);
    speichern();
    render();
    return;
  }

  if (e.target.closest("#btn-onboarding-fertig")) {
    STATE.onboardingGesehen = true;
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
    posten[kat.schalter.feld] = feld ? feld.checked : !!kat.schalter.standard;
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
    zeigeReaktion(reaktionsText(rechne(STATE.currentMonth), posten));
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
  const z = rechne(monat);

  const bestaetigt = confirm(
    `„${monatLesbar(monat.id)}" abschließen?\n\n` +
    `Er wandert ins Archiv. Fixkosten, Abos und Versicherungen nimmst du in den nächsten Monat mit.\n` +
    `Kontostand ${euro(z.kontostand)} wird als neues Startguthaben übernommen.`
  );
  if (!bestaetigt) return;

  // Schnappschuss + zusammengefasste Zahlen ins Archiv (vorne einfügen = neueste zuerst)
  STATE.archive.unshift({
    id: monat.id,
    summary: {
      gehalt: z.gehalt,
      notwendig: z.notwendigUmlage,
      nicht: z.nichtUmlage,
      gespart: z.gespart,
      kontostand: z.kontostand,
      quoteNicht: z.quoteNicht,
      quoteNotwendig: z.quoteNotwendig,
      quoteSpar: z.quoteSpar,
      regelErreicht: z.regelErreicht,
    },
    snapshot: JSON.parse(JSON.stringify(monat)), // tiefe Kopie, damit spätere Änderungen sie nicht betreffen
  });

  // Neuen Monat bauen: wiederkehrende Posten wandern mit, der Rest startet leer.
  STATE.currentMonth = neuerMonat(naechsterMonat(monat.id), z.kontostand, monat);

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
  renderBericht(rechne(STATE.currentMonth));
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
      ${zeile(`Notwendige Ausgaben (${Math.round(z.quoteNotwendig)}%)`, z.notwendigUmlage)}
      ${zeile(`Ausnahmen (${Math.round(z.quoteNicht)}%)`, z.nichtUmlage, "wert-nicht")}
      ${zeile(`Gespart (${Math.round(z.quoteSpar)}%)`, z.gespart)}
      ${zeile("Noch nicht verplant", z.uebrig)}
      <tr class="summe"><th>Kontostand</th><td>${euro(z.kontostand)}</td></tr>
    </table>

    ${z.hatUmlage
      ? `<p class="bericht-fussnote">Jährliche und vierteljährliche Posten sind auf den Monat
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
render();
