import { parseCSV, accountFromFilename, findExistingDuplicate } from '../api/src/index.mjs';
import fs from 'fs';
const D=(process.argv[2] || process.env.HOME + '/Downloads/tilit/'), all=fs.readdirSync(D), find=re=>all.find(f=>re.test(f.normalize('NFC')));
let fails=0;
const eq=(n,g,w)=>{const ok=g===w;if(!ok)fails++;console.log((ok?'  OK  ':'  FAIL')+' '+n+': '+g+(ok?'':'  (odotettu '+w+')'));};

const lipasF=find(/lipas/i), saastoF=find(/tili_tapahtumat/i);
const lipas=parseCSV(fs.readFileSync(D+lipasF,'utf8'), lipasF, 'Lipas');
const saasto=parseCSV(fs.readFileSync(D+saastoF,'utf8'), saastoF, 'Saasto');

// Simuloi kanta jossa käyttötilillä on siirtojen TOINEN puoli samalla
// arkistointitunnuksella ja vastakkaisella merkillä (juuri se mikä esti tuonnin)
const existing = lipas.concat(saasto).map(r => ({
  id: r.id.replace(/^(Lipas|Saasto)_/,''), date:r.date, amount:-r.amount,
  payee:r.payee, source:'tapahtumat.csv', account:'Perus'
}));
const ids = new Set(existing.map(e=>e.id));

const tuodut = arr => arr.filter(r => !ids.has(r.id) && !findExistingDuplicate(r, existing));

console.log('\n— Tuonti kun käyttötilillä on siirron toinen puoli —');
eq('säästölipas: kaikki 61 riviä menevät läpi', tuodut(lipas).length, 61);
eq('säästötili: kaikki 27 riviä menevät läpi', tuodut(saasto).length, 27);
eq('lippaan tunnisteet erottuvat käyttötilistä', lipas.every(r=>r.id.startsWith('Lipas_')), true);
eq('perustilin tunniste säilyy paljaana',
   parseCSV(fs.readFileSync(D+lipasF,'utf8'), 'tapahtumat.csv', 'Perus')[0].id.startsWith('Lipas_'), false);

console.log('\n— Aito duplikaatti saman tilin sisällä torjutaan yhä —');
const sama = [{...lipas[0], id:'muu_id'}];
eq('sama tili + sama pvm + sama summa = duplikaatti',
   findExistingDuplicate(sama[0], [{...lipas[0], account:'Lipas', source:'x'}]), true);
eq('eri tili = ei duplikaatti',
   findExistingDuplicate(sama[0], [{...lipas[0], account:'Perus', source:'x'}]), false);

console.log(fails?`\n${fails} EPAONNISTUI`:'\nKAIKKI LAPI');
process.exit(fails?1:0);
