import { parseCSV, accountFromFilename } from '../api/src/index.mjs';
import fs from 'fs';
const D=process.argv[2] || process.env.HOME + '/Downloads/tilit/';
let fails=0;
const eq=(n,g,w)=>{const ok=(typeof w==='number')?Math.abs(g-w)<0.005:g===w;if(!ok)fails++;console.log((ok?'  OK  ':'  FAIL')+' '+n+': '+g+(ok?'':'  (odotettu '+w+')'));};

const all=fs.readdirSync(D);
const find=(re)=>all.find(f=>re.test(f.normalize('NFC')));
const cases=[
 [find(/OP_credit/i),'OPCredit',25, 469.35],
 [find(/tili_tapahtumat/i),'Saasto',27, 12312.91],
 [find(/lipas/i),'Lipas',61, 2839.00],
 [find(/accountstatement/i),'Revolut',22, 6.86],
];
for (const [f,acct,n,summa] of cases) {
  const txt=fs.readFileSync(D+f,'utf8');
  const guess=accountFromFilename(f);
  const rows=parseCSV(txt,f,guess);
  const tot=rows.reduce((s,r)=>s+r.amount,0);
  console.log(`\n--- ${f}`);
  eq('tilin päättely', guess, acct);
  if(n) eq('rivimäärä', rows.length, n);
  eq('summa', Math.round(tot*100)/100, summa);
  eq('kaikilla tili', rows.every(r=>r.account===acct), true);
  eq('kaikilla pvm', rows.every(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)), true);
  eq('id:t uniikkeja', new Set(rows.map(r=>r.id)).size, rows.length);
}
console.log(fails?`\n${fails} EPAONNISTUI`:'\nKAIKKI LAPI');
process.exit(fails?1:0);
