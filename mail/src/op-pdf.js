// OP:n mobiilisovelluksen PDF-tiliote -> tapahtumarivit + OP:n CSV-muotoinen teksti.
// Tuotettu CSV syötetään oma-talous-api:n /import/csv:hen, jolloin tunnisteet
// (arkistointitunnus), OSTOPVM-päivä, tuplien karsinta ja luokittelu toimivat
// täsmälleen kuten verkkopankin CSV-tuonnissa.
import { getDocumentProxy } from "unpdf";

const FOOTER = new Set(["Jatkuu", "Laatija"]);
const DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
const AMT_RE = /^[+\-−]?\d{1,3}(?: \d{3})*,\d{2}$/;

const num = (s) => parseFloat(s.replace(/−/g, "-").replace(/\s/g, "").replace(",", "."));
const iso = (d) => {
  const m = d.match(DATE_RE);
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};

async function pageLines(pdf) {
  const out = { lines: [], iban: null };
  for (let p = 1; p <= pdf.numPages; p++) {
    const items = (await (await pdf.getPage(p)).getTextContent()).items
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({ s: it.str.trim(), x: it.transform[4], y: it.transform[5] }));
    const find = (s) => items.find((i) => i.s === s);
    const hdr = find("Arkistointitunnus"), sel = find("Selitys"), vii = find("Viite"), arv = find("Arvopäivä");
    const tn = items.findIndex((i) => i.s === "Tilinumero");
    if (tn >= 0 && !out.iban) out.iban = items[tn + 1]?.s.replace(/\s/g, "");
    if (!hdr || !sel || !vii || !arv) continue;
    const top = arv.y - 2;
    const stop = Math.max(-1, ...items.filter((i) => FOOTER.has(i.s) && i.y < top).map((i) => i.y));
    const body = items.filter((i) => i.y < top && i.y > stop + 1);
    const rows = [];
    for (const it of body.sort((a, b) => b.y - a.y || a.x - b.x)) {
      let r = rows.find((r) => Math.abs(r.y - it.y) < 2);
      if (!r) rows.push((r = { y: it.y, L: [], M: [], V: [], R: [] }));
      const col = it.x < sel.x - 5 ? "L" : it.x < vii.x - 5 ? "M" : it.x < hdr.x - 5 ? "V" : "R";
      r[col].push(it.s);
    }
    out.lines.push(...rows);
  }
  return out;
}

export async function parseOpPdf(bytes) {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { lines, iban } = await pageLines(pdf);
  const txs = [];
  let opening = null, closing = null, cur = null;
  for (const ln of lines) {
    const left = ln.L.join(" ");
    const mid = ln.M.join(" ");
    const parts = ln.L;
    const date = parts.find((s) => DATE_RE.test(s));
    const amt = parts.find((s) => AMT_RE.test(s.replace(/\s+/g, " ")));
    if (date && amt) {
      const arch = (ln.R[0] || "").split(" ")[0];
      cur = {
        date: iso(date), amount: num(amt), selitys: mid,
        viite: ln.V.join(" "), archive: arch, mid: [], right: [],
      };
      txs.push(cur);
      continue;
    }
    if (!date && amt && /^Saldo \d/.test(mid)) {
      if (opening === null && !txs.length) opening = num(amt); else closing = num(amt);
      cur = null;
      continue;
    }
    if (/yhteensä/.test(mid)) { cur = null; continue; }
    if (!cur || left) continue;
    if (mid) cur.mid.push(mid);
    if (ln.R.length) cur.right.push(ln.R.join(" "));
  }
  for (const t of txs) {
    t.payee = t.mid[0] || "";
    t.viestiLines = t.mid.slice(1).filter((s) => s !== "VIESTI");
    t.iban = (t.right[0] || "").replace(/\s/g, "");
    t.bic = t.right[1] || "";
    const a = t.archive;
    t.id = /^\d{8}\w{12}$/.test(a) ? `${a.slice(0, 8)}/${a.slice(8, 14)}/${a.slice(14)}` : "";
  }
  const sum = Math.round(txs.reduce((s, t) => s + t.amount, 0) * 100) / 100;
  const reconciled = opening !== null && closing !== null &&
    Math.abs(Math.round((opening + sum) * 100) / 100 - closing) < 0.005;
  return { iban, opening, closing, sum, reconciled, txs };
}

const HEADER = "Kirjauspäivä;Arvopäivä;Määrä EUROA;Laji;Selitys;Saaja/Maksaja;Saajan tilinumero;Saajan pankin BIC;Viite;Viesti;Arkistointitunnus";
// /import/csv tunnistaa Revolut-tiedoston pelkästä merkkijonosta "Revolut"/"Tapahtumaote",
// joten ne neutraloidaan, ettei OP-rivi päädy väärään parseriin.
const clean = (s) => String(s || "").replace(/[;\r\n"]/g, " ").replace(/Revolut/g, "REVOLUT").replace(/Tapahtumaote/g, "TAPAHTUMAOTE").replace(/\s+/g, " ").trim();

export function toOpCsv(txs) {
  const rows = txs.map((t) => {
    const ref = t.viite && t.selitys !== "PKORTTIMAKSU" ? `ref=${t.viite}` : "";
    const amount = t.amount.toFixed(2).replace(".", ",");
    return [t.date, t.date, amount, "", t.selitys, t.payee, t.iban, t.bic, ref, t.viestiLines.join(" "), t.id].map(clean).join(";");
  });
  return [HEADER, ...rows].join("\n");
}
