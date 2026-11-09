// Sähkövaraus: 25 €/kk Perus → Säästötili kirjataan kuluksi (Asuminen/needs)
// kuukausittain, ja neljännesvuosittainen Caruna-lasku on silloin neutral.
// Säästötilin puolen siirrot eivät saa vaikuttaa kulutukseen.
// Käyttö: node scripts/test-sahkovaraus.mjs
import fs from 'fs'; import os from 'os'; import path from 'path'; import url from 'url';
const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const tmp = path.join(os.tmpdir(), 'oma-talous-api-sahko.mjs');
fs.writeFileSync(tmp, fs.readFileSync(path.join(root, 'api/src/index.js'), 'utf8') + '\nexport {categorize};\n');
const { categorize } = await import(tmp);
let fails = 0; const eq = (n, g, w) => { const o = g === w; if (!o) fails++; console.log((o ? '  OK  ' : '  FAIL') + ' ' + n + ': ' + g + (o ? '' : '  (odotettu ' + w + ')')); };

// Sama järjestys kuin kannasta: ORDER BY priority DESC
const rules = [
  { kw: 'sähkövaraus', cat: 'Asuminen', type: 'needs', priority: 30 },
  { kw: 'caruna', cat: 'Asuminen', type: 'neutral', priority: 30 },
  { kw: 'säästötavoitteeseen', cat: 'Säästölipas', type: 'savings', priority: 0 },
  { kw: 'kellberg henrikki', cat: 'MobilePay & siirrot', type: 'neutral', priority: 0 },
  { kw: 'sähkö', cat: 'Asuminen', type: 'needs', priority: 0 },
];
const t = (account, amount, payee, viesti) => categorize({ account, amount, payee, selitys: 'TILISIIRTO', viesti }, rules);

const varaus = 'Viesti: Sähkövaraus FI3550680620097574';
eq('Perus −25 varaus → needs', t('Perus', -25, 'KELLBERG HENRIKKI', varaus).type, 'needs');
eq('Perus −25 varaus → Asuminen', t('Perus', -25, 'KELLBERG HENRIKKI', varaus).cat, 'Asuminen');
eq('Säästötili +25 varaus → neutral', t('Saasto', 25, 'KELLBERG HENRIKKI', varaus).type, 'neutral');
eq('Säästötili −75 purku → neutral', t('Saasto', -75, 'KELLBERG HENRIKKI', varaus).type, 'neutral');
eq('Perus +75 purku → neutral', t('Perus', 75, 'KELLBERG HENRIKKI', varaus).type, 'neutral');
eq('Caruna-lasku Perukselta → neutral', t('Perus', -70.82, 'Caruna Oy', 'ref=323816864514414781').type, 'neutral');
// Ennallaan pysyvät
eq('lipas-pyöristys Perus → savings', t('Perus', -24, 'KELLBERG HENRIKKI', 'Säästölipas, siirto säästötavoitteeseen').type, 'savings');
eq('lipas-pyöristys Lipas → neutral', t('Lipas', 24, 'KELLBERG HENRIKKI', 'Siirto säästötavoitteeseen').type, 'neutral');
eq('säästötililtä maksettu lasku pysyy kuluna', t('Saasto', -40, 'Fortum Oy', 'sähkö').type, 'needs');

console.log(fails ? `\n${fails} virhettä` : '\nKaikki OK');
process.exit(fails ? 1 : 0);
