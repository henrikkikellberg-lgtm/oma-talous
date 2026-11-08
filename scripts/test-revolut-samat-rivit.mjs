// Kaksi identtistä Revolut-riviä samana päivänä (sama saaja + summa) ei saa
// sulautua yhdeksi. Tapaus 7.11.2026: kaksi 58 € siirtoa Ulkona-taskuun.
// Käyttö: node scripts/test-revolut-samat-rivit.mjs   (ei tarvitse tiliotteita)
import fs from 'fs'; import os from 'os'; import path from 'path'; import url from 'url';
const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const tmp = path.join(os.tmpdir(), 'oma-talous-api-samat.mjs');
fs.writeFileSync(tmp, fs.readFileSync(path.join(root, 'api/src/index.js'), 'utf8') + '\nexport {handleCSVImport, parseCSV};\n');
const { handleCSVImport, parseCSV } = await import(tmp);
let fails = 0; const eq = (n, g, w) => { const o = g === w; if (!o) fails++; console.log((o ? '  OK  ' : '  FAIL') + ' ' + n + ': ' + g + (o ? '' : '  (odotettu ' + w + ')')); };

const csv = [
  'Revolut Bank UAB,,,,',
  'Käyttötilit Tapahtumaotteet,,,,',
  'Henkilökohtainen tili (EUR),,,,',
  'Päivämäärä,Kuvaus,Kategoria,Saapuvat/lähtevät varat,Saldo',
  '7.11.2026,Taskuun EUR Ulkona kohteesta EUR,Muut,"-58,00€","200,00€"',
  '7.11.2026,Taskuun EUR Päivittäistavarat kohteesta EUR,Muut,"-88,00€","258,00€"',
  '7.11.2026,Taskuun EUR Ulkona kohteesta EUR,Muut,"-58,00€","346,00€"',
  'Ulkona (EUR),,,,',
  '7.11.2026,Taskuun EUR Ulkona kohteesta EUR,Muut,"58,00€","75,97€"',
  '7.11.2026,Taskuun EUR Ulkona kohteesta EUR,Muut,"58,00€","17,97€"',
].join('\n');

const rows = parseCSV(csv, 'consolidated_statement.csv', null);
eq('rivejä jäsennetty', rows.length, 5);
eq('id:t uniikkeja', new Set(rows.map(r => r.id)).size, 5);
eq('ensimmäinen pitää vanhan id:n', rows[0].id, 'RV_2026-11-07_Taskuun EUR Ulkona kohteesta EUR_-58');
eq('toinen saa _2', rows[2].id, 'RV_2026-11-07_Taskuun EUR Ulkona kohteesta EUR_-58_2');

const run = async existing => {
  let n = 0;
  const env = { DB: { prepare: sql => ({
    all: async () => ({ results: /FROM rules/.test(sql) ? [] : existing }),
    bind: () => ({ run: async () => { if (/INSERT INTO transactions/.test(sql)) n++; } }) }) } };
  await handleCSVImport({ json: async () => ({ csv, filename: 'consolidated_statement.csv' }) }, env);
  return n;
};
const asDb = r => ({ id: r.id, date: r.date, amount: r.amount, payee: r.payee, source: 'csv', account: 'Revolut' });

eq('tyhjään kantaan: kaikki 5', await run([]), 5);
eq('uudelleentuonti: 0', await run(rows.map(asDb)), 0);
// Vanhan bugin jättämä tila: kummastakin parista vain ensimmäinen kannassa
const vanha = rows.filter(r => !/_2$/.test(r.id)).map(asDb);
eq('bugin jäljiltä: puuttuvat 2 lisätään', await run(vanha), 2);

console.log(fails ? `\n${fails} virhettä` : '\nKaikki OK');
process.exit(fails ? 1 : 0);
