import { parseCSV, accountFromFilename, categorize } from '../api/src/index.mjs';
import fs from 'fs';
const D=process.argv[2] || process.env.HOME + '/Downloads/tilit/';
// Edustava otos oikeista säännöistä (ne jotka voivat osua näihin tiedostoihin)
const R = [
 ['nordnet','Sijoittaminen','savings',20],['arvopaperi','Sijoittaminen','savings',20],
 ['op-amerikka','Sijoittaminen','savings',20],['op-maailma','Sijoittaminen','savings',20],
 ['op-eurooppa','Sijoittaminen','savings',20],['sijoitustilille','Sijoittaminen','savings',20],
 ['robo portfolio','Sijoittaminen','savings',20],['kellberg digital','MobilePay & siirrot','neutral',20],
 ['yrityksen perustaminen','MobilePay & siirrot','neutral',20],['talletuskorko','Palkka ja tulot','income',20],
 ['lähdevero','Muut välttämättömyydet','needs',20],['pohjola vakuutus','Vakuutukset','needs',20],
 ['revpoints','Muut','wants',20],['tilinhoitomaksu','Luotot — korko','needs',20],
 ['rahanlisäys','MobilePay & siirrot','neutral',20],['avoimen pankkitoiminnan','MobilePay & siirrot','neutral',20],
 ['palvelumaksu','Muut välttämättömyydet','needs',15],
 ['säästötavoitteeseen','Säästölipas','savings',0],['säänn.sääst','Sijoittaminen','savings',0],
 ['kellberg hen','MobilePay & siirrot','neutral',0],['kaarlo henri','MobilePay & siirrot','neutral',0],
 ['kellberg henrikki','MobilePay & siirrot','neutral',0],
 ['wolt','Ravintolat','wants',0],['s-market','Päivittäistavarat','needs',0],
 ['mob.pay*vr','Liikkuminen — arki','needs',0],
 ['korko','Luotot — korko','needs',5],
 ['booking.com','Matkailu — harrastus','wants',10],['bomba','Matkailu — harrastus','wants',10],
 ['billnas chocolate','Kahvilat','wants',10],['avecra','Ravintolat','wants',10],
 ['vr matkalla','Liikkuminen — arki','needs',10],['kortin toimitusmaksu','Muut välttämättömyydet','needs',10],
 ['revolut digital assets','Sijoittaminen','savings',10],
].map(([kw,cat,type,priority])=>({kw,cat,type,priority,splits:null})).sort((a,b)=>b.priority-a.priority);

const all=fs.readdirSync(D);
const find=re=>all.find(f=>re.test(f.normalize('NFC')));
let fails=0;
const eq=(n,g,w)=>{const ok=(typeof w==='number')?Math.abs(g-w)<0.005:g===w;if(!ok)fails++;console.log((ok?'  OK  ':'  FAIL')+' '+n+': '+g+(ok?'':'  (odotettu '+w+')'));};

for (const f of [find(/OP_credit/i), find(/tili_tapahtumat/i), find(/lipas/i), find(/accountstatement/i)]) {
  const acct=accountFromFilename(f);
  const rows=parseCSV(fs.readFileSync(D+f,'utf8'), f, acct).map(r=>({...r,...categorize(r,R)}));
  const byType={};
  rows.forEach(r=>{byType[r.type]=(byType[r.type]||0)+r.amount;});
  console.log(`\n--- ${acct}  (${rows.length} riviä)`);
  Object.entries(byType).sort().forEach(([t,v])=>console.log(`    ${t.padEnd(10)} ${v.toFixed(2).padStart(11)}`));
  const flagged=rows.filter(r=>r.type==='flag');
  if(flagged.length) console.log('    tarkistettavaa:', flagged.map(r=>`${r.date} ${r.payee} ${r.amount}`).join(' | '));
}

console.log('\n=== KRIITTISET VÄITTEET ===');
const sim=f=>{const a=accountFromFilename(f);return parseCSV(fs.readFileSync(D+f,'utf8'),f,a).map(r=>({...r,...categorize(r,R)}));};
const saasto=sim(find(/tili_tapahtumat/i)), lipas=sim(find(/lipas/i)), credit=sim(find(/OP_credit/i)), rev=sim(find(/accountstatement/i));

eq('säästötili: ei valetuloja (paitsi talletuskorko)',
   saasto.filter(r=>r.type==='income').map(r=>r.payee+r.selitys).join(','), 'TALLETUSKORKO');
eq('säästötili: 26 118,75 PANO on neutral',
   saasto.find(r=>r.amount>26000).type, 'neutral');
eq('lipas: ei yhtään tuloa', lipas.filter(r=>r.type==='income').length, 0);
eq('lipas: ei yhtään savings-riviä (ei tuplalaskentaa)', lipas.filter(r=>r.type==='savings').length, 0);
eq('säästötili: Nordnet-siirto neutral, ei savings',
   saasto.find(r=>/nordnet/i.test(r.payee))?.type, 'neutral');
eq('säästötili: yritysvirrat neutral',
   saasto.filter(r=>/kellberg digital|yrityksen perustaminen/i.test(r.payee+r.viesti)).every(r=>r.type==='neutral'), true);
eq('säästötili: vakuutus needs', saasto.find(r=>/pohjola/i.test(r.payee))?.type, 'needs');
eq('OP credit: kaikki Suoritukset neutral',
   credit.filter(r=>/suoritus/i.test(r.selitys)).every(r=>r.type==='neutral'), true);
eq('OP credit: korot needs', credit.filter(r=>r.selitys==='Korko').every(r=>r.type==='needs'), true);
eq('OP credit: ei yhtään tarkistettavaa', credit.filter(r=>r.type==='flag').length, 0);
eq('Revolut: ei yhtään tarkistettavaa', rev.filter(r=>r.type==='flag').length, 0);
eq('säästötili: talletuskorko voittaa korko-säännön', saasto.find(r=>/talletuskorko/i.test(r.selitys)).type, 'income');
eq('Revolut: ei valetuloja', rev.filter(r=>r.type==='income').length, 0);
eq('Revolut: Wolt on ravintola', rev.find(r=>/wolt/i.test(r.payee))?.type, 'wants');
eq('Revolut: sijoitussiirrot savings', rev.filter(r=>/sijoitustilille|robo/i.test(r.payee)).every(r=>r.type==='savings'), true);

console.log(fails?`\n${fails} EPAONNISTUI`:'\nKAIKKI VÄITTEET LÄPI');
process.exit(fails?1:0);
