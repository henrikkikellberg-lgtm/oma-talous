// v1.26.0 tilimalli: laskutili + kulutustili (taskut), toistuvat maksut, palkkapäivän jako.
// Data mallinnettu 12.11.2026 tilanteesta (Perus tuotu 10.11., Revolut 11.11.).
// Aja: node scripts/test-tilimalli.js
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('app/index.html','utf8');
const body=html.match(/<script>([\s\S]*)<\/script>/)[1];
const FIXED=new Date('2026-11-12T12:00:00+02:00').getTime();
class FakeDate extends Date{constructor(...a){if(a.length===0)super(FIXED);else super(...a);}static now(){return FIXED;}}
const store={};const ctx2d=new Proxy({},{get:()=>function(){return ctx2d;},set:()=>true});
const els={};
const mk=()=>new Proxy({innerHTML:'',value:'',textContent:''},{get:(t,k)=>{if(k in t)return t[k];if(k==='style')return{};if(k==='classList')return{add(){},remove(){},toggle(){}};if(k==='getContext')return()=>ctx2d;if(k==='toDataURL')return()=>'data:,';if(['appendChild','removeChild','addEventListener','focus','click'].includes(k))return()=>{};return '';},set:(t,k,v)=>{t[k]=v;return true}});
const sandbox={localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}},
document:{getElementById:id=>(els[id]=els[id]||mk()),querySelectorAll:()=>[],querySelector:()=>mk(),addEventListener(){},createElement:()=>mk(),body:mk(),visibilityState:'hidden'},
window:{addEventListener(){},fetch:()=>Promise.reject(new Error('no net')),location:{href:''}},navigator:{onLine:true},fetch:()=>Promise.reject(new Error('no net')),
setTimeout,clearTimeout,setInterval,clearInterval,console,Date:FakeDate,Math,JSON,Intl};
sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(body,sandbox);
const run=c=>vm.runInContext(c,sandbox);
const J=c=>JSON.parse(run('JSON.stringify('+c+')'));
let fails=0;
const eq=(n,a,b,tol=0.01)=>{const ok=typeof b==='number'?Math.abs(a-b)<tol:a===b;console.log((ok?'OK  ':'FAIL')+' '+n+': '+JSON.stringify(a)+(ok?'':' != '+JSON.stringify(b)));if(!ok)fails++;};
const has=(n,s,re)=>{const ok=re.test(s);console.log((ok?'OK  ':'FAIL')+' '+n);if(!ok)fails++;};

run(`
settings={salary_day:27,monthly_salary:3267};
accounts=[{key:'Perus',label:'OP Perustili',kind:'checking',opening_balance:2000,opening_date:'2026-05-01',last_import_through:'2026-11-10'},
 {key:'Revolut',label:'Revolut',kind:'checking',opening_balance:0,opening_date:'2026-05-01',last_import_through:'2026-11-11'},
 {key:'OPCredit',label:'OP Visa Credit',kind:'credit',opening_balance:-1300,opening_date:'2026-05-01',on_hold:1}];
let n=0;
const T=(date,account,payee,amount,cat,type,o={})=>txs.push({id:'t'+(n++),date,account,payee,amount,cat,type,month:date.slice(0,7),selitys:'',viesti:'',...o});
txs=[];
const card={viesti:'Viesti: 401046******7016 OSTOPVM 261027MF'};
// Viisi mennyttä jaksoa (27.5.–27.10.)
['2026-05-27','2026-06-26','2026-07-27','2026-08-27','2026-09-25'].forEach(d=>T(d,'Perus','Työnantaja Oy',3267,'Palkka ja tulot','income'));
[6,7,8,9,10].forEach((m,i)=>{
  const d=x=>'2026-'+String(m).padStart(2,'0')+'-'+String(x).padStart(2,'0');
  T(d(5),'Perus','As Oy Havinkartano',-625.90,'Asuminen','needs');
  T(d(4),'Perus','Elisa Oyj',-180.33,'Suoratoisto & liittymät','needs');
  T(d(1),'Perus','Fi65 5600 0580 9057 61',-156,'Luotot — korko','needs');
  T(d(20),'Perus','DNA Oyj',-25.98,'Suoratoisto & liittymät','needs');
  T(d(20),'Perus','Spotify P4'+i+'C599176  Stockholm',-12.99,'Suoratoisto & liittymät','needs',{selitys:'PKORTTIMAKSU'});
  T(d(24),'Perus','APPLE.COM/BILL      ITUNES.COM',-9.99,'Suoratoisto & liittymät','needs');
  T(d(24),'Perus','Fortum Asiakaspalvelu Oy',-12,'Asuminen','needs');
  T(d(7),'Perus','MOB.PAY*KAUPPALEHTI HELSINKI',-35.90,'Kulttuuri ja viihde','wants',card);
  T(d(16),'Perus','SÄÄNN.SÄÄST. OP-Maailma Indeksi A',-50,'Sijoittaminen','savings');
  [2,10,18].forEach(x=>T(d(x),'Perus','Ravintola Obelix Ri Riihimaki',-14,'Ravintolat','wants',card));
});
['2026-05-29','2026-06-29','2026-07-29','2026-08-29','2026-09-29'].forEach(d=>{
  T(d,'Perus','SÄÄNN.SÄÄST. OP-Maailma Indeksi A',-50,'Sijoittaminen','savings');
  T(d,'Perus','SÄÄNN.SÄÄST. OP-Kiina A',-25,'Sijoittaminen','savings');
});
// Nykyinen jakso 27.10.–
T('2026-10-27','Perus','Työnantaja Oy',3267,'Palkka ja tulot','income');
T('2026-10-29','Perus','SÄÄNN.SÄÄST. OP-Maailma Indeksi A',-50,'Sijoittaminen','savings');
T('2026-10-29','Perus','SÄÄNN.SÄÄST. OP-Kiina A',-25,'Sijoittaminen','savings');
T('2026-10-31','Perus','Fi65 5600 0580 9057 61',-158.02,'Luotot — korko','needs');
T('2026-11-02','Perus','As Oy Havinkartano',-625.90,'Asuminen','needs');
T('2026-11-04','Perus','Elisa Oyj',-180.33,'Suoratoisto & liittymät','needs');
T('2026-11-07','Perus','MOB.PAY*KAUPPALEHTI HELSINKI',-35.90,'Kulttuuri ja viihde','wants',card);
[['2026-10-27',-20],['2026-10-27',-3.52],['2026-10-28',-12.3],['2026-10-28',-14],['2026-10-28',-15.36],['2026-10-29',-3.52]]
  .forEach(([d,a])=>T(d,'Perus','K-Market Pelimies 70110',a,'Päivittäistavarat','needs',card));
T('2026-11-02','Perus','OP Vähittäisasiakkaat Oyj',-650,'MobilePay & siirrot','neutral',{viesti:'FI10 5000 0120 3374 71'});
[['2026-10-30',200],['2026-10-30',500],['2026-10-31',550]].forEach(([d,a])=>{
  T(d,'Perus','Kaarlo Henrikki Kellberg',-a,'MobilePay & siirrot','neutral');
  T(d,'Revolut','Avoimen pankkitoiminnan lisämaksu',a,'MobilePay & siirrot','neutral',{viesti:'Revolut'});
});
const pocket=(d,name,a)=>{
  T(d,'Revolut','Taskuun EUR '+name+' kohteesta EUR',-a,'MobilePay & siirrot','neutral',{viesti:'Revolut'});
  T(d,'Revolut','Taskuun EUR '+name+' kohteesta EUR',a,'MobilePay & siirrot','neutral',{viesti:'Revolut · '+name});
};
pocket('2026-10-30','Päivittäistavarat',88); pocket('2026-11-06','Päivittäistavarat',88);
pocket('2026-10-30','Ulkona',232); pocket('2026-10-30','Arki',250); pocket('2026-10-30','Muut ostokset/viihde',60);
const spend=(d,name,payee,a,cat,type)=>T(d,'Revolut',payee,a,cat,type,{viesti:'Revolut · '+name});
spend('2026-10-31','Päivittäistavarat','S-market',-50,'Päivittäistavarat','needs');
spend('2026-11-05','Päivittäistavarat','K-Ruoka',-40,'Päivittäistavarat','needs');
spend('2026-11-10','Päivittäistavarat','K-Ruoka',-20.22,'Päivittäistavarat','needs');
spend('2026-11-01','Ulkona','Riihitahti Bistro',-101.54,'Ravintolat','wants');
spend('2026-11-08','Ulkona','Franssophie Kuopio',-54.49,'Ravintolat','wants');
[-53.9,-60,-48.9,-40].forEach((a,i)=>spend('2026-11-0'+(i+1),'Arki','VR Matkalla',a,'Liikkuminen — arki','needs'));
spend('2026-10-31','Muut ostokset/viihde','Oy U.S Video Ab',-15,'Harrastukset','wants');
spend('2026-11-07','Muut ostokset/viihde','Oy U.S Video Ab',-15,'Harrastukset','wants');
T('2026-10-30','Revolut','Sijoitustilille',-214.77,'Sijoittaminen','savings',{viesti:'Revolut'});
T('2026-11-03','Revolut','Kahvila',-118,'Ravintolat','wants',{viesti:'Revolut'});
`);

console.log('— maksunsaajan avain');
eq('Spotify-viite pois', run(`payeeKey('Spotify P42A1F2DD9  Stockholm')`), 'spotify');
eq('kauppa + kaupunki', run(`payeeKey('SALE RIIHIMAKI KESK RIIHIMAKI')`), 'sale riihimaki kesk');
eq('IBAN-maksunsaaja säilyy', run(`payeeKey('Fi65 5600 0580 9057 61')`), 'fi65 5600 0580 9057 61');
eq('fixedKey käyttää avainta', run(`fixedKey({payee:'Spotify P43B76A29B Stockholm'})`), 'spotify');

console.log('— asetukset');
const ps=J(`tmParseSettings({account_model:'split',invest_target:'1000',pockets:'{"A":{"fill":5}}',buffer:'100',salary_day:'27'})`);
eq('merkkijono', ps.account_model, 'split'); eq('luku', ps.invest_target, 1000); eq('JSON', ps.pockets.A.fill, 5); eq('vieraat avaimet ohi', ps.salary_day, undefined);
eq('oletus single', run(`tmSplit()`), false);

run(`settings.account_model='split'; settings.bills_account='Perus'; settings.spend_account='Revolut';
settings.spend_transfer=1250; settings.spend_invest=200; settings.buffer=100; settings.budget_frame='fire'; settings.invest_target=1000;
settings.pockets={'Päivittäistavarat':{fill:88,cadence:'week',weekday:5},'Ulkona':{fill:232,cadence:'period'},'Arki':{fill:250,cadence:'period'},'Muut ostokset/viihde':{fill:60,cadence:'period'},'Riennot':{cadence:'reserve'}};`);
eq('split päällä', run(`tmSplit()`), true);

console.log('— toistuvat maksut (Perus)');
const rec=J(`detectRecurring(['Perus'])`);
const st=k=>(rec.find(r=>r.key===k)||{}).status;
eq('Spotify tunnistuu', st('spotify'), 'bill');
eq('vastike', st('as oy havinkartano'), 'bill');
eq('korko (IBAN-maksunsaaja)', st('fi65 5600 0580 9057 61'), 'bill');
eq('OP-Maailma 2 krt', (rec.find(r=>r.key==='säänn.sääst. op-maailma indeksi a')||{}).times, 2);
eq('Obelix = toistuva osto', st('ravintola obelix ri'), 'habit');
eq('ei Revolut-rivejä', rec.some(r=>r.account!=='Perus'), false);

console.log('— laskutili');
const B=J(`computeBillsForecast()`);
eq('tulossa: Maailma 50 + DNA + Spotify + Apple + Fortum', B.upSum, 50+25.98+12.99+9.99+12);
eq('5 erää', B.upcoming.length, 5);
eq('OP-Maailman 2. erä 16.11.', (B.upcoming.find(u=>/Maailma/.test(u.label))||{}).due, '2026-11-16');
eq('ennuste = saldo − tulossa', B.projection, run(`balanceOf('Perus')`)-B.upSum);
eq('korttiostot ilman Kauppalehteä', B.card.length, 6);
eq('korttiostojen summa', B.cardSum, 68.70);
eq('tiliote 10.11.', B.through, '2026-11-10');

console.log('— taskut');
const P=J(`computePockets()`);
const pk=nm=>P.pockets.find(p=>p.name===nm);
eq('kulunut 16 pv', P.elapsed, 16); eq('jäljellä 15 pv', P.daysLeft, 15);
eq('Päivittäistavarat saldo', pk('Päivittäistavarat').balance, 65.78);
eq('Päivittäistavarat täyttöjä jäljellä (pe 13. ja 20.)', pk('Päivittäistavarat').fillsLeft, 2);
eq('Päivittäistavarat budjetti 4 × 88', pk('Päivittäistavarat').budget, 352);
eq('Päivittäistavarat ennuste', pk('Päivittäistavarat').forecast, 65.78+176-110.22/16*15);
eq('Ulkona ennuste', pk('Ulkona').forecast, 75.97-156.03/16*15);
eq('Arki loppuu 15.11.', pk('Arki').runOut, '2026-11-15');
eq('Ulkona loppuu 19.11.', pk('Ulkona').runOut, '2026-11-19');
eq('Riennot kortiton', pk('Riennot').role, 'reserve');
eq('kulutustilin saldo', P.total, 1250-214.77-118-110.22-156.03-202.8-30);
eq('päätili', P.mainBal, 1250-176-232-250-60-214.77-118);
eq('varattu täyttöihin', P.reserved, 176);
eq('taskujen ennuste', P.pocketsForecast, (65.78+176-110.22/16*15)+(75.97-156.03/16*15)+(47.2-202.8/16*15)+(30-30/16*15));
eq('ennuste yht. = taskut + päätilin vapaa', P.forecast, P.pocketsForecast + P.mainFree);
eq('päätilin vapaa', P.mainFree, 1250-176-232-250-60-214.77-118-176);
const mv=J(`tmRebalance(computePockets())`);
eq('tasaus: ensin pienin vaje (Ulkona)', mv[0].to, 'Ulkona'); eq('tasaus: Päivittäistavaroista', mv[0].from, 'Päivittäistavarat'); eq('tasaus: 71 €', mv[0].amount, 71);

console.log('— palkkapäivän jako (27.11.–23.12.)');
const pp=J(`computePaydayPlan()`);
eq('jakso loppuu 23.12. (pyhät)', pp.next.endISO, '2026-12-23');
// Apple ja Fortum (24. pv) eivät osu jaksoon 27.11.–22.12. → seuraavaan jaksoon osuu kaksi
eq('laskut (ilman 24. pv eriä)', pp.billSum, 625.90+180.33+156+25.98+12.99+35.90);
const pp2=J(`(()=>{const b={startISO:'2026-12-23',endISO:'2027-01-27'};return tmDueDates(b,24)})()`);
eq('24. pv kahdesti jaksossa 23.12.–26.1.', pp2.length, 2);
eq('automaattisijoitukset', pp.autoInvSum, 125);
eq('Päivittäistavarat 4 pe', pp.fills.find(f=>f.name==='Päivittäistavarat').amount, 352);
eq('täytöt yht.', pp.fillSum, 352+232+250+60);
eq('päätilille vapaaksi', pp.spendFree, 1250-894-200);
eq('jäännös', pp.remainder, 3267-1037.10-125-100-1250);
eq('sijoitukset palkasta', pp.invested, 125+200+(3267-1037.10-125-100-1250));

console.log('— kassavirta ja rahan reitti');
run(`curMonth=fmtMonthKey(new Date()); viewMode='period'; periodOffset=0;`);
const w=J(`dashWindow()`);
const kv=run(`kassavirtaCardHTML(monthSummary(txsForWindow('${w.start}','${w.end}')), 3267, false, txsForWindow('${w.start}','${w.end}'))`);
has('kulutus tileittäin', kv, /Kulutus tileittäin/);
has('rahan reitti', kv, /Rahan reitti/);
has('Revolut-siirto parittuu', kv, /← OP Perustili/);
has('luottokorttimaksu erikseen', kv, /→ Luottokortit/);
has('FIRE-rivi', kv, /sijoitettu/);
const perusNet=J(`txsForWindow('${w.start}','${w.end}').filter(t=>t.account==='Perus').reduce((s,t)=>s+t.amount,0)`);
has('Perustilin "Jäi" = tilin muutos', kv, new RegExp('Jäi</span><span[^>]*>\\+'+Math.round(perusNet).toLocaleString('fi-FI').replace(/\s/g,'\\s')));

console.log('— renderöinti');
run(`renderRunwayCard()`); const rc=run(`document.getElementById('runwayCard').innerHTML`);
has('laskutilikortti', rc, /Laskutili · OP Perustili/); has('kulutustilikortti', rc, /Kulutustili · Revolut/);
run(`tmCollapse={bills:false}; renderRunwayCard()`); has('korttiostovaroitus', run(`document.getElementById('runwayCard').innerHTML`), /6 ostoa/);
run(`renderTaskut()`); has('Taskut-välilehti', run(`document.getElementById('taskutContent').innerHTML`), /Tasaa ennen palkkaa/);
run(`renderRecModal()`); has('toistuvat-modaali', run(`document.getElementById('recBody').innerHTML`), /Spotify/);
run(`renderPayModal()`); has('palkkapäivä-modaali', run(`document.getElementById('payBody').innerHTML`), /4 pe/);
run(`renderTmModal()`); has('asetusmodaali', run(`document.getElementById('tmBody').innerHTML`), /Muut ostokset\/viihde/);
run(`document.getElementById('fitAmount').value='50'; renderFitResult()`); has('Mahtuuko taskuittain', run(`document.getElementById('fitBreakdown').innerHTML`), /Taskuittain/);

console.log('— yksitilimalli');
run(`settings.account_model='single'`);
const r=J(`computeRunway()`);
eq('saldo = Perus + Revolut', r.checking, run(`balanceOf('Perus')+balanceOf('Revolut')`));
eq('tahti ilman kiinteitä laskuja', r.spentSoFar, 68.70+35.90+110.22+156.03+202.8+30+118);
eq('tulossa olevat laskut', r.upSum, 50+25.98+12.99+9.99+12);
eq('ennuste', r.projection, r.checking-r.upSum-r.avgDaily*r.daysLeft);
run(`renderRunwayCard()`); has('yksitilikortti', run(`document.getElementById('runwayCard').innerHTML`), /Laskuja tulossa/);

console.log('— v1.26.2: jakson ennuste, netto, FIRE tuloista, vanhat otteet');
run(`settings.account_model='split';
accounts.push({key:'Saasto',label:'OP Säästötili',kind:'savings',opening_balance:5000,opening_date:'2026-05-01',last_import_through:'2026-11-12'});
T('2026-11-02','OPCredit','Suoritus',650,'MobilePay & siirrot','neutral');
T('2026-11-11','Saasto','NORDNET BANK AB',-650,'Sijoittaminen','neutral');
T('2026-11-12','Saasto','Kaarlo Henrikki Kellberg',616.75,'Sijoittaminen','savings');`);
const L=`txsForWindow('${w.start}','${w.end}')`;
eq('sijoitettu tuloista (Perus 75 + Revolut 214,77)', J(`tmInvestedFromIncome(${L})`), 289.77);
eq('säästötilin kautta netto', J(`tmInvested(${L}) - tmInvestedFromIncome(${L})`), 650-616.75);
const S=J(`monthSummary(${L})`);
const fc=J(`tmPeriodForecast(dashWindow(), monthSummary(${L}), 3267)`);
const P2=J(`computePockets()`);
eq('ennuste: taskujen tahti loppujaksolle', fc.spend, P2.pockets.filter(p=>p.role==='spend').reduce((a,p)=>a+p.pace*P2.daysLeft,0));
eq('ennuste: tulossa olevat laskut (ilman sijoituksia)', fc.bills, 25.98+12.99+9.99+12);
eq('ennuste: tulossa oleva sijoituserä säästöön', fc.billSav, 50);
eq('ennuste: kulutus', fc.kulutus, S.needs+S.wants+fc.spend+fc.bills);
eq('ennuste: säästöaste', fc.rate, (fc.income-fc.kulutus)/fc.income*100);
eq('ennuste vain kesken olevalle jaksolle', J(`tmPeriodForecast({mode:'period',isCurrent:false}, {}, 0)`), null);
const kv2=run(`kassavirtaCardHTML(monthSummary(${L}), 3267, false, ${L})`);
has('netto: kortit −650', kv2, /kortit −650,00/);
has('ennustelaatikko', kv2, /Ennuste jakson lopussa/);
has('FIRE tuloista + säästöistä', kv2, /sijoitettu tuloista <b[^>]*>290 \/ 1000 €<\/b> <span[^>]*>· säästöistä \+33 €/);
eq('ei vanhoja otteita 12.11.', J(`tmStaleChecking()`).length, 0);
run(`accountByKey('Revolut').last_import_through='2026-11-07'`);
eq('Revolut 7.11. → vanha', J(`tmStaleChecking()`)[0], 'Revolut 7.11.');
has('kassavirta kertoo vanhasta otteesta', run(`kassavirtaCardHTML(monthSummary(${L}), 3267, false, ${L})`), /Tiliote tuotu vain Revolut 7\.11\. asti/);

console.log(fails ? `\n${fails} FAIL` : '\nKaikki OK');
process.exitCode = fails ? 1 : 0;
