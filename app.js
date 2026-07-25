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
   Jede Kategorie ist eine Liste von Posten. Das "typ"-Feld sagt,
   wie der Posten in die Rechnung eingeht:
     positiv   = Geld kommt rein (Gehalt)
     notwendig = musst du ausgeben (Miete, Essen)
     nicht     = brauchst du nicht wirklich (Sushi, Klamotten)
     abo       = jeder Posten entscheidet selbst (Schalter "notwendig?")
     sparen    = zur Seite gelegt (wird positiv bewertet)
   ------------------------------------------------------------ */
const KATEGORIEN = [
  { key: "income",       titel: "1 · Einnahmen (Gehalt)",         typ: "positiv",   platzhalter: "z.B. Gehalt" },
  { key: "fixkosten",    titel: "2 · Notwendige Ausgaben",        typ: "notwendig", platzhalter: "z.B. Miete" },
  { key: "abos",         titel: "3 · Abos",                       typ: "abo",       platzhalter: "z.B. Netflix" },
  { key: "lebensmittel", titel: "4a · Einkauf — Lebensmittel",    typ: "notwendig", platzhalter: "z.B. Wocheneinkauf" },
  { key: "luxus",        titel: "4b · Einkauf — Luxus & Snacks",  typ: "nicht",     platzhalter: "z.B. Sushi" },
  { key: "konsum",       titel: "5 · Konsum",                     typ: "nicht",     platzhalter: "z.B. Klamotten" },
  { key: "sparen",       titel: "6 · Sparen",                     typ: "sparen",    platzhalter: "z.B. Rücklage" },
];

/* ------------------------------------------------------------
   2. KONSUMOPFER-SKALA — die frechen Sprüche.
   "grenze" ist die Obergrenze (in %) für diese Stufe.
   Du darfst hier gern deinen eigenen Ton reinschreiben.
   ------------------------------------------------------------ */
const VERDIKTE = [
  { grenze: 10,       stufe: 0, spruch: "Spar-Königin 👑 — du hast das Spiel verstanden." },
  { grenze: 20,       stufe: 1, spruch: "Solide. Fast langweilig solide. Weiter so." },
  { grenze: 35,       stufe: 2, spruch: "Geht noch — aber das Sushi zählt mit." },
  { grenze: 50,       stufe: 3, spruch: "Grauzone. Die Snacks summieren sich, Schatz." },
  { grenze: 70,       stufe: 4, spruch: "Konsumopfer. Über die Hälfte fürs Unnötige." },
  { grenze: 100,      stufe: 5, spruch: "Totales Konsumopfer 💀 — das ist kein Budget, das ist ein Hilferuf." },
  { grenze: Infinity, stufe: 6, spruch: "Insolvenz-Vibes. Du gibst mehr aus als reinkommt." },
];

const SPEICHER_SCHLUESSEL = "girlmath.v1"; // Name der "Schublade" im Browser

/* ------------------------------------------------------------
   3. KLEINE HELFER
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

// "2026-07" hübsch anzeigen als "Juli 2026".
const MONATSNAMEN = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
function monatLesbar(id) {
  const [jahr, monat] = id.split("-").map(Number);
  return MONATSNAMEN[monat - 1] + " " + jahr;
}

// Eine Zahl als Euro anzeigen, z.B. 1234.5 -> "1.234,50 €".
function euro(n) {
  return (n || 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

// Die Beträge einer Postenliste zusammenzählen.
function summe(liste) {
  return liste.reduce((s, posten) => s + (Number(posten.amount) || 0), 0);
}

/* ------------------------------------------------------------
   4. NEUEN, LEEREN MONAT bauen.
   Fixkosten und Abos kann man als Vorlage übergeben, weil die
   meist jeden Monat gleich sind. Der Rest startet leer.
   ------------------------------------------------------------ */
function neuerMonat(id, startguthaben, fixkostenVorlage, abosVorlage) {
  return {
    id: id,
    startBalance: startguthaben || 0,
    income:       [],
    fixkosten:    (fixkostenVorlage || []).map(p => ({ ...p, id: neueId() })),
    abos:         (abosVorlage || []).map(p => ({ ...p, id: neueId() })),
    lebensmittel: [],
    luxus:        [],
    konsum:       [],
    sparen:       [],
  };
}

/* ------------------------------------------------------------
   5. STATE laden & speichern
   ------------------------------------------------------------ */
let STATE = laden();

function laden() {
  try {
    const roh = localStorage.getItem(SPEICHER_SCHLUESSEL);
    if (roh) return JSON.parse(roh); // gespeicherten Stand zurückgeben
  } catch (e) {
    console.warn("Konnte gespeicherten Stand nicht lesen:", e);
  }
  // Nichts gespeichert -> frischer Start mit dem aktuellen Monat.
  return {
    version: 1,
    currentMonth: neuerMonat(monatsId(new Date()), 0, [], []),
    archive: [],
  };
}

function speichern() {
  localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(STATE));
}

/* ------------------------------------------------------------
   6. RECHNEN — das Herz der App.
   Nimmt einen Monat und gibt alle abgeleiteten Zahlen zurück.
   ------------------------------------------------------------ */
function rechne(monat) {
  const gehalt = summe(monat.income);

  // Abos aufteilen: notwendige (Zugticket) vs. nicht notwendige (Netflix)
  const abosNotwendig = summe(monat.abos.filter(a => a.notwendig));
  const abosNicht     = summe(monat.abos.filter(a => !a.notwendig));

  const notwendig = summe(monat.fixkosten) + summe(monat.lebensmittel) + abosNotwendig;
  const nicht     = summe(monat.luxus) + summe(monat.konsum) + abosNicht;
  const gespart   = summe(monat.sparen);

  const ausgegeben = notwendig + nicht;
  const uebrig     = gehalt - ausgegeben - gespart;           // noch nicht verplant
  const kontostand = monat.startBalance + gehalt - ausgegeben - gespart;

  // Prozente vom Gehalt (nur sinnvoll, wenn es ein Gehalt gibt)
  const anteil = (wert) => (gehalt > 0 ? (wert / gehalt) * 100 : 0);

  return {
    gehalt, notwendig, nicht, gespart, ausgegeben, uebrig, kontostand,
    quoteNotwendig: anteil(notwendig),
    quoteNicht:     anteil(nicht),   // <- das ist der Konsumopfer-Wert
    quoteSpar:      anteil(gespart),
  };
}

// Zum Prozentsatz das passende Verdikt (Stufe + Spruch) finden.
function verdiktFuer(quoteNicht) {
  return VERDIKTE.find(v => quoteNicht <= v.grenze) || VERDIKTE[VERDIKTE.length - 1];
}

/* ============================================================
   7. ZEICHNEN (render) — STATE als Seite darstellen.
   render() ruft alle Teil-Zeichner auf und wird nach jeder
   Änderung erneut ausgeführt.
   ============================================================ */
function render() {
  const z = rechne(STATE.currentMonth); // "z" = Zahlen
  renderKopf(z);
  renderKategorien();
  renderKonto(z);
  renderUebersicht(z);
  renderArchiv();
}

/* --- 7a. Kopf mit großem Konsumopfer-Banner --- */
function renderKopf(z) {
  const v = verdiktFuer(z.quoteNicht);
  document.getElementById("kopf").innerHTML = `
    <h1 class="marke">girl <span>math</span></h1>
    <p class="monat-zeile">${monatLesbar(STATE.currentMonth.id)}</p>
    <div class="verdikt v${v.stufe}">
      <p class="prozent">${Math.round(z.quoteNicht)}%<small> deines Gehalts fürs Unnötige</small></p>
      <p class="spruch">${v.spruch}</p>
    </div>
  `;
}

/* --- 7b. Alle Eingabe-Kategorien --- */
function renderKategorien() {
  const ziel = document.getElementById("kategorien");
  ziel.innerHTML = KATEGORIEN.map(kategorieHtml).join("");
}

// HTML für eine einzelne Kategorie-Karte bauen.
function kategorieHtml(kat) {
  const liste = STATE.currentMonth[kat.key];
  const hatSchalter = kat.typ === "abo";

  // Summe farblich passend zeigen
  let summenKlasse = "";
  if (kat.typ === "positiv" || kat.typ === "sparen") summenKlasse = "summe-positiv";
  if (kat.typ === "nicht") summenKlasse = "summe-nicht";

  // Die Zeilen der schon eingetragenen Posten
  const zeilen = liste.length === 0
    ? `<p class="leer-hinweis">Noch nichts eingetragen.</p>`
    : liste.map(p => postenHtml(kat, p, hatSchalter)).join("");

  // Das Formular zum Hinzufügen
  const schalterFeld = hatSchalter
    ? `<label class="schalter"><input type="checkbox" data-add-notwendig> notwendig?</label>`
    : "";

  return `
    <div class="karte">
      <div class="karte-kopf">
        <h2 class="karte-titel">${kat.titel}</h2>
        <span class="karte-summe ${summenKlasse}">${euro(summe(liste))}</span>
      </div>

      <div class="posten-liste">${zeilen}</div>

      <form class="hinzufuegen ${hatSchalter ? "hat-schalter" : ""}" data-add="${kat.key}">
        <input type="text" data-add-label placeholder="${kat.platzhalter}" />
        <input type="number" data-add-amount placeholder="0" step="0.01" inputmode="decimal" />
        ${schalterFeld}
        <button type="submit" class="btn btn-plus">＋</button>
      </form>
    </div>
  `;
}

// HTML für eine einzelne Posten-Zeile.
function postenHtml(kat, p, hatSchalter) {
  const schalter = hatSchalter
    ? `<label class="schalter">
         <input type="checkbox" data-field="notwendig" data-cat="${kat.key}" data-id="${p.id}" ${p.notwendig ? "checked" : ""}>
         notwendig?
       </label>`
    : "";
  return `
    <div class="posten ${hatSchalter ? "hat-schalter" : ""}">
      <input type="text" value="${escapeAttr(p.label || "")}"
             data-field="label" data-cat="${kat.key}" data-id="${p.id}" />
      <input type="number" value="${p.amount ?? ""}" step="0.01" inputmode="decimal"
             data-field="amount" data-cat="${kat.key}" data-id="${p.id}" />
      ${schalter}
      <button class="del" data-del data-cat="${kat.key}" data-id="${p.id}" title="löschen">✕</button>
    </div>
  `;
}

/* --- 7c. Kontostand-Bereich --- */
function renderKonto(z) {
  const negativ = z.kontostand < 0 ? "negativ" : "";
  document.getElementById("konto").innerHTML = `
    <h2 class="nr-titel">7 · Kontostand</h2>
    <div class="karte konto-karte">
      <div class="konto-block">
        <div class="beschriftung">Startguthaben Monatsbeginn</div>
        <input id="start-guthaben" type="number" step="0.01" inputmode="decimal"
               value="${STATE.currentMonth.startBalance ?? 0}" />
      </div>
      <div class="konto-block" style="text-align:right">
        <div class="beschriftung">Aktueller Kontostand</div>
        <div class="konto-stand ${negativ}">${euro(z.kontostand)}</div>
      </div>
    </div>
  `;
}

/* --- 7d. Monats-Übersicht mit Prozenten und 50/30/20 --- */
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

  document.getElementById("uebersicht").innerHTML = `
    <h2 class="nr-titel">Monats-Übersicht</h2>
    <div class="karte uebersicht-karte">
      <div class="zahlenzeile"><span>Gehalt gesamt</span><span class="wert-positiv">${euro(z.gehalt)}</span></div>
      <div class="zahlenzeile"><span>Notwendige Ausgaben (${Math.round(z.quoteNotwendig)}%)</span><span>${euro(z.notwendig)}</span></div>
      <div class="zahlenzeile"><span>Nicht notwendige Ausgaben (${Math.round(z.quoteNicht)}%)</span><span class="wert-nicht">${euro(z.nicht)}</span></div>
      <div class="zahlenzeile"><span>Gespart (${Math.round(z.quoteSpar)}%)</span><span class="wert-positiv">${euro(z.gespart)}</span></div>
      <div class="zahlenzeile dick"><span><strong>Noch nicht verplant</strong></span><span><strong>${euro(z.uebrig)}</strong></span></div>

      <div class="regel-titel">Realitäts-Check: 50 / 30 / 20-Regel</div>
      ${balken("Notwendig", z.quoteNotwendig, 50, "fuell-notwendig")}
      ${balken("Nicht notwendig", z.quoteNicht, 30, "fuell-nicht")}
      ${balken("Sparen", z.quoteSpar, 20, "fuell-sparen")}
    </div>
  `;
}

/* --- 7e. Archiv der abgeschlossenen Monate --- */
function renderArchiv() {
  const ziel = document.getElementById("archiv");
  if (STATE.archive.length === 0) {
    ziel.innerHTML = `
      <h2 class="archiv-titel">Archiv</h2>
      <p class="leer-hinweis">Noch kein Monat abgeschlossen. Am Monatsende auf „Monat abschließen" tippen.</p>
    `;
    return;
  }

  const eintraege = STATE.archive.map((m, i) => {
    const v = verdiktFuer(m.summary.quoteNicht);
    // Trend im Vergleich zum davor abgeschlossenen Monat (der steht im Array dahinter).
    let trend = "";
    const vorher = STATE.archive[i + 1];
    if (vorher) {
      const diff = Math.round(m.summary.quoteNicht - vorher.summary.quoteNicht);
      if (diff < 0) trend = `<div class="trend trend-besser">▼ ${Math.abs(diff)}%-Punkte besser als davor</div>`;
      else if (diff > 0) trend = `<div class="trend trend-schlechter">▲ ${diff}%-Punkte schlechter als davor</div>`;
      else trend = `<div class="trend">gleich geblieben</div>`;
    }
    // Farbe des Badges an die Verdikt-Stufe koppeln (wir nutzen dieselben v-Klassen als Hintergrund).
    return `
      <div class="archiv-eintrag">
        <div>
          <div class="archiv-monat">${monatLesbar(m.id)}</div>
          <div class="archiv-detail">Gehalt ${euro(m.summary.gehalt)} · unnötig ${euro(m.summary.nicht)} · gespart ${euro(m.summary.gespart)}</div>
          ${trend}
        </div>
        <span class="archiv-badge v${v.stufe}">${Math.round(m.summary.quoteNicht)}%</span>
      </div>
    `;
  }).join("");

  ziel.innerHTML = `<h2 class="archiv-titel">Archiv</h2>${eintraege}`;
}

// Kleiner Schutz, damit Anführungszeichen in Bezeichnungen das HTML nicht zerschießen.
function escapeAttr(text) {
  return String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/* ============================================================
   8. EREIGNISSE — auf Klicks und Eingaben reagieren.
   Wir hängen die Zuhörer EINMAL an das ganze Dokument (statt an
   jedes einzelne Feld). Das nennt man "Event-Delegation": ein
   Türsteher am Eingang statt einer pro Zimmer.
   ============================================================ */

// (a) Betrag/Bezeichnung/Schalter eines bestehenden Postens geändert
document.addEventListener("change", (e) => {
  const feld = e.target.closest("[data-field]");
  if (feld) {
    const { cat, id, field } = feld.dataset;
    const posten = STATE.currentMonth[cat].find(p => p.id === id);
    if (!posten) return;
    if (field === "amount")    posten.amount = e.target.value === "" ? 0 : Number(e.target.value);
    if (field === "label")     posten.label = e.target.value;
    if (field === "notwendig") posten.notwendig = e.target.checked;
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

// (b) Löschen-Knopf geklickt
document.addEventListener("click", (e) => {
  const del = e.target.closest("[data-del]");
  if (del) {
    const { cat, id } = del.dataset;
    STATE.currentMonth[cat] = STATE.currentMonth[cat].filter(p => p.id !== id);
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
  const labelFeld = form.querySelector("[data-add-label]");
  const amountFeld = form.querySelector("[data-add-amount]");
  const notwendigFeld = form.querySelector("[data-add-notwendig]");

  const label = labelFeld.value.trim();
  const amount = amountFeld.value === "" ? 0 : Number(amountFeld.value);

  // Leere Einträge (kein Text UND kein Betrag) ignorieren wir.
  if (label === "" && amount === 0) return;

  const posten = { id: neueId(), label: label || "(ohne Namen)", amount };
  if (katKey === "abos") posten.notwendig = notwendigFeld ? notwendigFeld.checked : false;

  STATE.currentMonth[katKey].push(posten);
  speichern();
  render();
});

/* ------------------------------------------------------------
   9. MONAT ABSCHLIESSEN
   Den aktuellen Monat als Schnappschuss ins Archiv legen und
   einen neuen Monat starten (Fixkosten + Abos übernehmen).
   ------------------------------------------------------------ */
document.getElementById("btn-monat-abschliessen").addEventListener("click", () => {
  const monat = STATE.currentMonth;
  const z = rechne(monat);

  const bestaetigt = confirm(
    `„${monatLesbar(monat.id)}" abschließen?\n\n` +
    `Er wandert ins Archiv, und der nächste Monat startet mit deinen Fixkosten und Abos.\n` +
    `Kontostand ${euro(z.kontostand)} wird als neues Startguthaben übernommen.`
  );
  if (!bestaetigt) return;

  // Schnappschuss + zusammengefasste Zahlen ins Archiv (vorne einfügen = neueste zuerst)
  STATE.archive.unshift({
    id: monat.id,
    summary: {
      gehalt: z.gehalt, notwendig: z.notwendig, nicht: z.nicht,
      gespart: z.gespart, kontostand: z.kontostand,
      quoteNicht: z.quoteNicht, quoteNotwendig: z.quoteNotwendig, quoteSpar: z.quoteSpar,
    },
    snapshot: JSON.parse(JSON.stringify(monat)), // tiefe Kopie, damit spätere Änderungen sie nicht betreffen
  });

  // Neuen Monat bauen: Fixkosten + Abos als Vorlage mitnehmen, Rest leer.
  STATE.currentMonth = neuerMonat(
    naechsterMonat(monat.id),
    z.kontostand,
    monat.fixkosten.map(p => ({ label: p.label, amount: p.amount })),
    monat.abos.map(p => ({ label: p.label, amount: p.amount, notwendig: p.notwendig })),
  );

  speichern();
  render();
});

/* ------------------------------------------------------------
   10. SICHERN (Export) & LADEN (Import)
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
      const geladen = JSON.parse(leser.result);
      if (!geladen.currentMonth) throw new Error("Keine gültige girl-math-Datei.");
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
   11. LOSLEGEN — einmal beim Laden der Seite alles zeichnen.
   ------------------------------------------------------------ */
render();
