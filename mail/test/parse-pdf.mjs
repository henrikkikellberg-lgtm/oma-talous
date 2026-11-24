// Käyttö: npm test -- "/polku/Tiliote Oma käyttötili.pdf"
// Tulostaa tunnistetun tilin, saldotäsmäytyksen ja rivit. Ei kirjoita kantaan.
import fs from "fs";
import { parseOpPdf } from "../src/op-pdf.js";

const file = process.argv[2];
if (!file) { console.error("Anna PDF:n polku"); process.exit(1); }
const r = await parseOpPdf(fs.readFileSync(file));
console.log({ iban: r.iban, opening: r.opening, closing: r.closing, sum: r.sum, reconciled: r.reconciled, rows: r.txs.length });
for (const t of r.txs) console.log(t.id.padEnd(24), t.date, String(t.amount).padStart(10), t.selitys.padEnd(15), t.payee);
process.exit(r.reconciled ? 0 : 2);
