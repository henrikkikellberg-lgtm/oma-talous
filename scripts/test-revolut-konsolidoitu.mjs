// v1.25.0: Revolutin konsolidoitu ote (taskut, Robo-/krypto-osiot, päiväsiirtymä).
// Käyttö: node scripts/test-revolut-konsolidoitu.mjs [polku/consolidated_statement.csv]
// Oletus: Tiliote/-kansion uusin revolut-consolidated*.csv (gitignoressa).
import fs from 'fs'; import os from 'os'; import path from 'path'; import url from 'url';
const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const tmp = path.join(os.tmpdir(), 'oma-talous-api-test.mjs');
fs.writeFileSync(tmp, fs.readFileSync(path.join(root, 'api/src/index.js'), 'utf8') + '\nexport {handleCSVImport, parseCSV};\n');
const { handleCSVImport, parseCSV } = await import(tmp);
globalThis.ok = x => x;
const dir = path.join(root, 'Tiliote');
const f = process.argv[2] || path.join(dir, fs.readdirSync(dir).filter(n => /consolidated/i.test(n)).sort().pop());
const csv = fs.readFileSync(f, 'utf8');
let fails = 0; const eq = (n, g, w) => { const o = Math.abs(g - w) < 0.005; if (!o) fails++; console.log((o ? '  OK  ' : '  FAIL') + ' ' + n + ': ' + g + (o ? '' : '  (odotettu ' + w + ')')); };

// Odotetut saldot otteen omista "Yhteensä"-riveistä käyttötilien tapahtumaosiossa
const L = csv.split('\n'); let inTx = false, sec = null; const want = {};
for (const l of L) { const c0 = l.split(',')[0].replace(/"/g, '');
  if (/(Tapahtumaotteet|Yhteenvedot)$/.test(c0)) { inTx = c0 === 'Käyttötilit Tapahtumaotteet'; continue; }
  const h = inTx && c0.match(/^(.+) \(EUR\)$/); if (h) { sec = h[1] === 'Henkilökohtainen tili' ? null : h[1]; continue; }
  if (inTx && c0 === 'Yhteensä') want[sec || '(päätili)'] = parseFloat(l.match(/"(-?[\d\s]+,\d\d)€"/)[1].replace(/\s/g, '').replace(',', '.')); }

const rows = parseCSV(csv, 'consolidated_statement.csv', 'Perus');
eq('kaikki rivit Revolut-tilille', rows.filter(r => r.account !== 'Revolut').length, 0);
eq('ei Robo-/krypto-rivejä (osuusmäärä euroina)', rows.filter(r => Math.abs(r.amount) < 0.1 && !/revpoints/i.test(r.payee)).length, 0);
for (const [k, v] of Object.entries(want)) {
  const s = rows.filter(r => (k === '(päätili)' ? r.viesti === 'Revolut' : r.viesti === 'Revolut · ' + k)).reduce((a, r) => a + r.amount, 0);
  eq('saldo ' + k, s, v);
}
// Idempotenssi: sama ote uudelleen ei lisää mitään
const existing = rows.map(r => ({ ...r, source: 'csv' }));
let n = 0; const env = { DB: { prepare: sql => ({ all: async () => ({ results: /FROM rules/.test(sql) ? [] : existing }), bind: () => ({ run: async () => { if (/INSERT INTO transactions/.test(sql)) n++; } }) }) } };
await handleCSVImport({ json: async () => ({ csv, filename: 'consolidated_statement.csv' }) }, env);
eq('uudelleentuonti lisää 0 riviä', n, 0);
// Päiväsiirtymä: aloituspäivämuodon rivit 1–4 pv aiemmin → ei tuplia
const shifted = rows.filter(r => r.viesti === 'Revolut' && /kauppias/i.test(r.selitys)).map((r, i) => {
  const d = new Date(r.date); d.setDate(d.getDate() - (i % 4) - 1); return { ...r, id: 'S' + i, date: d.toISOString().slice(0, 10), source: 'aloitus.csv' }; });
const shiftedIds = new Set(shifted.map(s => s.id)); n = 0;
const env2 = { DB: { prepare: sql => ({ all: async () => ({ results: /FROM rules/.test(sql) ? [] : shifted }), bind: (...v) => ({ run: async () => { if (/INSERT INTO transactions/.test(sql) && /kauppias/i.test(v[3]) && v[4] === 'Revolut') n++; } }) }) } };
await handleCSVImport({ json: async () => ({ csv, filename: 'consolidated_statement.csv' }) }, env2);
eq('siirtyneet ostorivit eivät tuplaannu', n, 0);
console.log(fails ? `\n${fails} FAIL` : '\nKaikki OK'); process.exit(fails ? 1 : 0);
