/* ============================================================
   girl math — die Logik
   ------------------------------------------------------------
   Was diese Datei tut, in einfachen Worten:
   1. Sie hält alle deine Zahlen in einer Variablen namens STATE.
   2. Sie speichert STATE im Browser (localStorage), damit nichts
      verloren geht, wenn du die Seite schließt.
   3. Sie rechnet daraus die Prozente und dein Konsumopfer-Verdikt.
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

     schalter       true = jeder Posten entscheidet selbst per Häkchen,
                    ob er notwendig ist (Abos, Versicherungen)

     schalterStand  Standard-Stellung dieses Häkchens bei neuen Posten
                    (Abos: aus — Versicherungen: an)

     wiederkehrend  true = läuft jeden Monat weiter und wandert beim
                    Monatswechsel automatisch mit. Diese Posten haben
                    zusätzlich einen Rhythmus (monatlich … jährlich).
   ------------------------------------------------------------ */
const KATEGORIEN = [
  { key: "income",         titel: "1 · Einnahmen 💰",              typ: "positiv",   platzhalter: "z.B. Gehalt" },
  { key: "fixkosten",      titel: "2 · Fixkosten 🏠",              typ: "notwendig", wiederkehrend: true, platzhalter: "z.B. Miete" },
  { key: "abos",           titel: "3 · Abos 📺",                   typ: "abo",       wiederkehrend: true, schalter: true, schalterStand: false, platzhalter: "z.B. Netflix" },
  { key: "versicherungen", titel: "4 · Versicherungen 🛡️",         typ: "abo",       wiederkehrend: true, schalter: true, schalterStand: true,  platzhalter: "z.B. Haftpflicht" },
  { key: "lebensmittel",   titel: "5 · Einkauf — Lebensmittel 🥑", typ: "notwendig", platzhalter: "z.B. Wocheneinkauf" },
  { key: "luxus",          titel: "6 · Einkauf — Ausnahmen 🍣",    typ: "nicht",     platzhalter: "z.B. Sushi" },
  { key: "konsum",         titel: "7 · Große Ausnahmen 🛍️",        typ: "nicht",     platzhalter: "z.B. Klamotten" },
  { key: "sparen",         titel: "8 · Sparen 🐖",                 typ: "sparen",    platzhalter: "z.B. Rücklage" },
];

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
   3. KONSUMOPFER-SKALA — die Sprüche deiner besten Freundin.
   "grenze" ist die Obergrenze (in %) für diese Stufe.
   Pro Stufe gibt es mehrere Sprüche; welcher kommt, hängt am
   Monat — so wiederholt sich der Witz nicht jeden Monat.
   Du darfst hier jederzeit deinen eigenen Ton reinschreiben.
   ------------------------------------------------------------ */
const VERDIKTE = [
  {
    grenze: 10, stufe: 0, sprueche: [
      "Spar-Königin 👑 Ich hab nichts zu meckern und weiß gerade nicht, wohin mit mir.",
      "Okay wow. Du hast das Spiel verstanden. Ich bin fast ein bisschen eingeschüchtert.",
      "Unter 10%. Entweder bist du erwachsen geworden oder du warst krank. Ich tippe auf erwachsen.",
    ],
  },
  {
    grenze: 20, stufe: 1, sprueche: [
      "Solide. So richtig unspektakulär solide. Ich hab dir nichts vorzuwerfen, sorry.",
      "Alles im Rahmen. Du darfst dir was gönnen, ich guck dann kurz weg.",
      "Passt. Du darfst dich kurz gut fühlen, aber bitte nicht zu lange.",
    ],
  },
  {
    grenze: 35, stufe: 2, sprueche: [
      "Geht noch. Aber wir beide wissen, was da im Warenkorb liegt.",
      "Ein Drittel für Ausnahmen. Ausnahmen. Hörst du dir eigentlich selber zu?",
      "Noch okay. Der Monat ist aber auch noch nicht rum, Schatz.",
    ],
  },
  {
    grenze: 50, stufe: 3, sprueche: [
      "Grauzone. Du hast dir das schöngerechnet und ich hab's gemerkt.",
      "Alter. Die Snacks summieren sich. Das ist kein Mythos, das steht da oben.",
      "Fast die Hälfte. Jede zweite Buchung war eine „Ausnahme“. Interessante Definition.",
    ],
  },
  {
    grenze: 70, stufe: 4, sprueche: [
      "Konsumopfer. Über die Hälfte weg für Sachen, die keiner gebraucht hat. Nicht mal du.",
      "Dein Ernst? Mehr als die Hälfte. Ich frag gar nicht erst wofür, ich will's nicht wissen.",
      "Das ist kein Budget mehr, das ist eine Shopping-Laune mit Kontoauszug.",
    ],
  },
  {
    grenze: 100, stufe: 5, sprueche: [
      "Totales Konsumopfer 💀 Dein Gehalt war kurz da und hat sich dann verabschiedet.",
      "Spinnst du oder was? Fast alles weg. FAST ALLES.",
      "Ich sag's dir als Freundin, weil's sonst keiner tut: das war ein Amoklauf.",
    ],
  },
  {
    grenze: Infinity, stufe: 6, sprueche: [
      "Insolvenz-Vibes. Du gibst mehr aus, als reinkommt. Das steht da, braun auf weiß.",
      "Du hast Geld ausgegeben, das es gar nicht gibt. Respekt für die Kreativität, aber nein.",
      "Stopp. Sofort. Leg die Karte weg und ruf mich an.",
    ],
  },
];

const SPEICHER_SCHLUESSEL = "girlmath.v1"; // Name der "Schublade" im Browser

/* ------------------------------------------------------------
   4. KLEINE HELFER
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
   5. NEUEN MONAT bauen.
   Alle wiederkehrenden Kategorien (Fixkosten, Abos, Versicherungen)
   werden aus dem Vormonat übernommen — inklusive Rhythmus. Genau
   das ist der Punkt: du tippst deine Miete nur EINMAL ein.
   ------------------------------------------------------------ */
function neuerMonat(id, startguthaben, vorlage) {
  const monat = { id: id, startBalance: startguthaben || 0 };
  KATEGORIEN.forEach(kat => {
    const uebernehmen = kat.wiederkehrend && vorlage && Array.isArray(vorlage[kat.key]);
    monat[kat.key] = uebernehmen
      ? vorlage[kat.key].map(p => ({ ...p, id: neueId() })) // Kopie mit frischer ID
      : [];
  });
  return monat;
}

/* ------------------------------------------------------------
   6. STATE laden, aufräumen & speichern

   Wichtig: ältere Stände (aus der ersten Version der App) kennen
   weder Versicherungen noch Rhythmen. `normalisiereMonat` füllt
   fehlende Felder auf, damit ein alter Stand nicht die Seite
   zerschießt. Metapher: ein alter Zettel wird auf das neue
   Formular übertragen, kein Feld bleibt leer.
   ------------------------------------------------------------ */
let STATE = laden();

function leererStand() {
  return {
    version: 2,
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

  return {
    version: 2,
    currentMonth: normalisiereMonat(daten.currentMonth, heute),
    archive: archive,
    onboardingGesehen: daten.onboardingGesehen === true,
  };
}

// Einen Monat auf Vollständigkeit bringen: alle Kategorien vorhanden,
// alle Posten mit ID, Rhythmus und Fälligkeit versehen.
function normalisiereMonat(monat, ersatzId) {
  const roh = (monat && typeof monat === "object") ? monat : {};
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
    posten.notwendig = typeof p.notwendig === "boolean" ? p.notwendig : !!kat.schalterStand;
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
   7. RECHNEN — das Herz der App.

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
    gehalt: 0, gespart: 0,
    notwendigUmlage: 0, nichtUmlage: 0,   // auf den Monat verteilt
    notwendigReal: 0,   nichtReal: 0,     // was wirklich abgeht
    faelligJetzt: [],                     // große Brocken DIESEN Monat
    faelligBald: [],                      // … und in den nächsten zwei
  };

  KATEGORIEN.forEach(kat => {
    (monat[kat.key] || []).forEach(posten => {
      const betrag = Number(posten.amount) || 0;

      if (kat.typ === "positiv") { z.gehalt += betrag;  return; }
      if (kat.typ === "sparen")  { z.gespart += betrag; return; }

      // Notwendig oder Ausnahme? Bei Abos/Versicherungen entscheidet das Häkchen.
      const istNotwendig = kat.schalter ? !!posten.notwendig : (kat.typ === "notwendig");

      // Rhythmus nur bei wiederkehrenden Kategorien, sonst schlicht monatlich.
      const intervall = kat.wiederkehrend ? (INTERVALL[posten.rhythmus] || 1) : 1;
      const umlage = betrag / intervall;
      const gehtDiesenMonatAb = intervall === 1 || istFaelligIn(posten, monatNr, intervall);
      const real = gehtDiesenMonatAb ? betrag : 0;

      if (istNotwendig) { z.notwendigUmlage += umlage; z.notwendigReal += real; }
      else              { z.nichtUmlage     += umlage; z.nichtReal     += real; }

      // Nur nicht-monatliche Posten sind eine Warnung wert.
      if (intervall > 1 && betrag > 0) {
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

  return z;
}

// Zum Prozentsatz die passende Verdikt-Stufe finden.
function verdiktFuer(quoteNicht) {
  return VERDIKTE.find(v => quoteNicht <= v.grenze) || VERDIKTE[VERDIKTE.length - 1];
}

// Einen der Sprüche dieser Stufe wählen — stabil pro Monat und Stufe.
function spruchFuer(verdikt, monatId) {
  const index = textZuZahl(monatId + "|" + verdikt.stufe) % verdikt.sprueche.length;
  return verdikt.sprueche[index];
}

/* ============================================================
   8. ZEICHNEN (render) — STATE als Seite darstellen.
   render() ruft alle Teil-Zeichner auf und wird nach jeder
   Änderung erneut ausgeführt.
   ============================================================ */
function render() {
  const z = rechne(STATE.currentMonth); // "z" = Zahlen
  renderKopf(z);
  renderKategorien();
  renderFaellig(z);
  renderKonto(z);
  renderUebersicht(z);
  renderArchiv();
  renderModal();
}

/* --- 8a. Kopf mit großem Konsumopfer-Banner --- */
function renderKopf(z) {
  // Ohne Gehalt gibt es kein Urteil — sonst stünde bei 500 € Sushi
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
    banner = `
      <div class="verdikt v${v.stufe}">
        <p class="prozent">${Math.round(z.quoteNicht)}%<small> deines Gehalts für Ausnahmen</small></p>
        <p class="spruch">${spruchFuer(v, STATE.currentMonth.id)}</p>
      </div>`;
  }

  document.getElementById("kopf").innerHTML = `
    <div class="kopf-zeile">
      <h1 class="marke">girl <span>math</span></h1>
      <button id="btn-hilfe" class="hilfe-knopf" title="Wie geht das nochmal?">?</button>
    </div>
    <p class="monat-zeile">${monatLesbar(STATE.currentMonth.id)}</p>
    ${banner}
  `;
}

/* --- 8b. Alle Eingabe-Kategorien --- */
function renderKategorien() {
  document.getElementById("kategorien").innerHTML = KATEGORIEN.map(kategorieHtml).join("");
}

// HTML für eine einzelne Kategorie-Karte bauen.
function kategorieHtml(kat) {
  // Angezeigt wird nach Betrag sortiert (höchster oben), gespeichert
  // bleibt die ursprüngliche Reihenfolge.
  const liste = sortiertNachBetrag(STATE.currentMonth[kat.key]);

  // Summe farblich passend zeigen
  let summenKlasse = "";
  if (kat.typ === "positiv" || kat.typ === "sparen") summenKlasse = "summe-positiv";
  if (kat.typ === "nicht") summenKlasse = "summe-nicht";

  const zeilen = liste.length === 0
    ? `<p class="leer-hinweis">Noch nichts eingetragen.</p>`
    : liste.map(p => postenHtml(kat, p)).join("");

  // Zweite Zeile im Hinzufügen-Formular: Häkchen und/oder Rhythmus.
  const extras = [];
  if (kat.schalter) {
    extras.push(`<label class="schalter">
      <input type="checkbox" data-add-notwendig ${kat.schalterStand ? "checked" : ""}> notwendig?
    </label>`);
  }
  if (kat.wiederkehrend) {
    extras.push(rhythmusAuswahl("monatlich", "data-add-rhythmus"));
  }
  const extraZeile = extras.length ? `<div class="form-extras">${extras.join("")}</div>` : "";

  // Bei wiederkehrenden Kategorien sagen wir dazu, dass sie mitwandern.
  const hinweis = kat.wiederkehrend
    ? `<p class="kat-hinweis">Läuft automatisch in den nächsten Monat weiter.</p>`
    : "";

  return `
    <div class="karte">
      <div class="karte-kopf">
        <h2 class="karte-titel">${kat.titel}</h2>
        <span class="karte-summe ${summenKlasse}">${euro(summe(liste))}</span>
      </div>
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

// Das Auswahlfeld für den Fälligkeits-Monat (nur bei nicht-monatlich).
function faelligAuswahl(posten, kat) {
  const optionen = MONATE_KURZ.map((name, i) =>
    `<option value="${i + 1}" ${(i + 1) === posten.faellig ? "selected" : ""}>${name}</option>`
  ).join("");
  return `<label class="mini-label">fällig ab
    <select class="mini-auswahl" data-field="faellig" data-cat="${kat.key}" data-id="${posten.id}">${optionen}</select>
  </label>`;
}

// HTML für eine einzelne Posten-Zeile.
function postenHtml(kat, p) {
  // Alles, was unter die Betrags-Zeile gehört (Häkchen, Rhythmus, Umlage-Hinweis).
  const meta = [];

  if (kat.schalter) {
    meta.push(`<label class="schalter">
      <input type="checkbox" data-field="notwendig" data-cat="${kat.key}" data-id="${p.id}" ${p.notwendig ? "checked" : ""}>
      notwendig?
    </label>`);
  }

  if (kat.wiederkehrend) {
    const intervall = INTERVALL[p.rhythmus] || 1;
    meta.push(rhythmusAuswahl(p.rhythmus, `data-field="rhythmus" data-cat="${kat.key}" data-id="${p.id}"`));
    if (intervall > 1) {
      meta.push(faelligAuswahl(p, kat));
      // Der Satz, der den Schock nimmt: was das pro Monat bedeutet.
      meta.push(`<span class="umlage-hinweis">= ${euro((Number(p.amount) || 0) / intervall)} / Monat</span>`);
    }
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

/* --- 8c. Die Fälligkeits-Warnung — das „hab ich gar nicht auf dem Schirm"-Feature --- */
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
      <h3 class="faellig-titel">⚡ Diesen Monat geht zusätzlich ab</h3>
      <p class="faellig-unter">Kein monatlicher Posten — der schlägt jetzt komplett zu.</p>
      ${z.faelligJetzt.map(e => zeile(e)).join("")}
      <div class="faellig-summe">zusammen ${euro(z.faelligJetzt.reduce((s, e) => s + e.betrag, 0))}</div>
    </div>` : "";

  const bald = z.faelligBald.length ? `
    <div class="karte faellig-karte bald">
      <h3 class="faellig-titel">👀 Kommt bald auf dich zu</h3>
      <p class="faellig-unter">Damit es dich nicht aus dem Nichts trifft.</p>
      ${z.faelligBald.map(e => zeile(e, " · im " + MONATSNAMEN[e.monatNr - 1])).join("")}
    </div>` : "";

  ziel.innerHTML = jetzt + bald;
}

/* --- 8d. Kontostand-Bereich (echtes Geld, keine Umlage) --- */
function renderKonto(z) {
  const negativ = z.kontostand < 0 ? "negativ" : "";

  // Nur zeigen, wenn Umlage und echte Abbuchung auseinandergehen.
  const echtZeile = z.hatUmlage
    ? `<p class="konto-fussnote">Diesen Monat wirklich abgebucht: <strong>${euro(z.ausgegebenReal)}</strong>
         — in der Übersicht unten rechnen wir mit ${euro(z.ausgegebenUmlage)} umgelegt.</p>`
    : "";

  document.getElementById("konto").innerHTML = `
    <h2 class="nr-titel">9 · Kontostand</h2>
    <div class="karte konto-karte">
      <div class="konto-block">
        <div class="beschriftung">Startguthaben Monatsbeginn</div>
        <input id="start-guthaben" type="number" step="0.01" inputmode="decimal"
               value="${STATE.currentMonth.startBalance ?? 0}" />
      </div>
      <div class="konto-block rechts">
        <div class="beschriftung">Aktueller Kontostand</div>
        <div class="konto-stand ${negativ}">${euro(z.kontostand)}</div>
      </div>
      ${echtZeile}
    </div>
  `;
}

/* --- 8e. Monats-Übersicht mit Kreisdiagramm, Zahlen und 50/30/20 --- */
function renderUebersicht(z) {
  // Ein 50/30/20-Balken: Ist-Wert als Füllung, Ziel als senkrechter Strich.
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

      <div class="regel-titel">Realitäts-Check: 50 / 30 / 20-Regel</div>
      ${balken("Notwendig", z.quoteNotwendig, 50, "fuell-notwendig")}
      ${balken("Ausnahmen", z.quoteNicht, 30, "fuell-nicht")}
      ${balken("Sparen", z.quoteSpar, 20, "fuell-sparen")}
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

/* --- 8f. Archiv der abgeschlossenen Monate --- */
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

    return `
      <div class="archiv-eintrag">
        <div>
          <div class="archiv-monat">${monatLesbar(m.id)}</div>
          <div class="archiv-detail">Gehalt ${euro(s.gehalt)} · Ausnahmen ${euro(s.nicht)} · gespart ${euro(s.gespart)}</div>
          ${trend}
        </div>
        <span class="archiv-badge v${v.stufe}">${Math.round(quote)}%</span>
      </div>
    `;
  }).join("");

  ziel.innerHTML = `<h2 class="archiv-titel">Archiv</h2>${eintraege}`;
}

/* --- 8g. Das Willkommens-Fenster beim ersten Besuch --- */
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
          <li><strong>Gehalt eintragen.</strong> Ohne das rede ich nicht mit dir.</li>
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

/* ============================================================
   9. EREIGNISSE — auf Klicks und Eingaben reagieren.
   Wir hängen die Zuhörer EINMAL an das ganze Dokument (statt an
   jedes einzelne Feld). Das nennt man "Event-Delegation": ein
   Türsteher am Eingang statt einer pro Zimmer.
   ============================================================ */

// (a) Ein bestehender Posten wurde geändert (Text, Betrag, Häkchen, Rhythmus, Fälligkeit)
document.addEventListener("change", (e) => {
  const feld = e.target.closest("[data-field]");
  if (feld) {
    const { cat, id, field } = feld.dataset;
    const liste = STATE.currentMonth[cat];
    if (!liste) return;
    const posten = liste.find(p => p.id === id);
    if (!posten) return;

    if (field === "amount")    posten.amount    = e.target.value === "" ? 0 : Number(e.target.value);
    if (field === "label")     posten.label     = e.target.value;
    if (field === "notwendig") posten.notwendig = e.target.checked;
    if (field === "rhythmus")  posten.rhythmus  = INTERVALL[e.target.value] ? e.target.value : "monatlich";
    if (field === "faellig")   posten.faellig   = Number(e.target.value) || 1;

    speichern();
    render();
    return;
  }

  // Startguthaben geändert
  if (e.target.id === "start-guthaben") {
    STATE.currentMonth.startBalance = e.target.value === "" ? 0 : Number(e.target.value);
    speichern();
    render();
    return;
  }

  // Import-Datei ausgewählt
  if (e.target.id === "import-datei") {
    importDatei(e.target.files[0]);
  }
});

// (b) Klicks: Löschen, Hilfe-Knopf, Willkommens-Fenster schließen
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

// (c) Neuen Posten hinzufügen (Formular abgeschickt)
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
    const feld = form.querySelector("[data-add-notwendig]");
    posten.notwendig = feld ? feld.checked : !!kat.schalterStand;
  }
  if (kat.wiederkehrend) {
    const feld = form.querySelector("[data-add-rhythmus]");
    posten.rhythmus = (feld && INTERVALL[feld.value]) ? feld.value : "monatlich";
    // Erste Fälligkeit ist standardmäßig der laufende Monat — im Posten änderbar.
    posten.faellig = monatsNummer(STATE.currentMonth.id);
  }

  STATE.currentMonth[katKey].push(posten);
  speichern();
  render();
});

/* ------------------------------------------------------------
   10. MONAT ABSCHLIESSEN
   Den aktuellen Monat als Schnappschuss ins Archiv legen und
   einen neuen Monat starten. Alle wiederkehrenden Kategorien
   (Fixkosten, Abos, Versicherungen) kommen automatisch mit.
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
    },
    snapshot: JSON.parse(JSON.stringify(monat)), // tiefe Kopie, damit spätere Änderungen sie nicht betreffen
  });

  // Neuen Monat bauen: wiederkehrende Posten wandern mit, der Rest startet leer.
  STATE.currentMonth = neuerMonat(naechsterMonat(monat.id), z.kontostand, monat);

  speichern();
  render();
});

/* ------------------------------------------------------------
   11. SICHERN (Export) & LADEN (Import)
   Als JSON-Datei, damit du deinen Stand sichern oder auf ein
   anderes Gerät mitnehmen kannst.
   ------------------------------------------------------------ */
document.getElementById("btn-export").addEventListener("click", () => {
  const text = JSON.stringify(STATE, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "girl-math-" + STATE.currentMonth.id + ".json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("btn-import").addEventListener("click", () => {
  document.getElementById("import-datei").click(); // versteckte Dateiauswahl öffnen
});

function importDatei(datei) {
  if (!datei) return;
  const leser = new FileReader();
  leser.onload = () => {
    try {
      // Auch importierte Dateien laufen durch die Migration — dann funktionieren
      // alte Backups aus der ersten Version weiterhin.
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
   12. LOSLEGEN — einmal beim Laden der Seite alles zeichnen.
   ------------------------------------------------------------ */
render();
