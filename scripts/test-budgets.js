const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('app/index.html','utf8');
const body = html.match(/<script>([\s\S]*)<\/script>/)[1];

// Kiinnitetty nykyhetki: to 27.8.2026 (palkkapaiva, jakson 0 ensimmainen paiva).
// Ilman tata viikkotestit muuttuisivat joka paiva.
const FIXED = new Date('2026-08-27T09:00:00+03:00').getTime();
class FakeDate extends Date {
  constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); }
  static now() { return FIXED; }
}

const store = {};
const ctx2d = new Proxy({}, { get:()=>function(){ return ctx2d; }, set:()=>true });
const el = new Proxy({}, { get:(t,k)=>{
  if (k==='style') return {};
  if (k==='classList') return {add(){},remove(){},toggle(){}};
  if (k==='getContext') return ()=>ctx2d;
  if (k==='toDataURL') return ()=>'data:,';
  if (['appendChild','removeChild','addEventListener','focus','click'].includes(k)) return ()=>{};
  return '';
}, set:()=>true });

const sandbox = {
  localStorage:{ getItem:k=>store[k]??null, setItem:(k,v)=>{store[k]=v}, removeItem:k=>{delete store[k]} },
  document:{ getElementById:()=>el, querySelectorAll:()=>[], querySelector:()=>el, addEventListener(){}, createElement:()=>el, body:el, visibilityState:'hidden' },
  window:{ addEventListener(){}, fetch:()=>Promise.reject(new Error('no net')), location:{href:''} },
  navigator:{ onLine:true }, fetch:()=>Promise.reject(new Error('no net')),
  setTimeout, clearTimeout, setInterval, clearInterval, console, Date: FakeDate, Math, JSON, Intl,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(body, sandbox, {filename:'index.html'});
const run = code => vm.runInContext(code, sandbox);

// let-sidokset eivat nay sandbox-objektissa -> asetetaan kontekstin sisalla
run(`
settings = { salary_day:27, monthly_salary:3267 };
viewMode = 'period';
txs = [
  // edellinen jakso 27.6.-26.7.: 574,69 (yli 550 rajan -> carry 24,69)
  {id:'a',date:'2026-06-30',cat:'Ravintolat',type:'wants',amount:-300},
  {id:'b',date:'2026-07-10',cat:'Baarit',type:'wants',amount:-274.69},
  // analysoitu jakso 27.7.-26.8.: 904,06 netto (sis. 3 EUR palautus)
  {id:'c',date:'2026-07-28',cat:'Ravintolat',type:'wants',amount:-500},
  {id:'d',date:'2026-08-15',cat:'Ravintolat',type:'wants',amount:-407.06},
  {id:'e',date:'2026-08-16',cat:'Ravintolat',type:'wants',amount:3},
  {id:'f',date:'2026-08-20',cat:'Päivittäistavarat',type:'needs',amount:-283.25},
  {id:'g',date:'2026-07-27',cat:'Palkka ja tulot',type:'income',amount:3267.05},
];
B  = { id:'ulkona', label:'Ulkona', cats:['Ravintolat','Baarit','Kahvilat','Lounas','Alkoholi'], limit_eur:550, rollover:true };
BUUSI = { ...B, id:'uusi', created_at:'2026-08-27 09:00:00' };   // luotu tanaan
B2 = { ...B, rollover:false };
BASU = { id:'asu', label:'Asuminen', cats:['Asuminen'], limit_eur:400, rollover:false };
`);

let fails = 0;
function eq(nimi, got, want, tol=0.005) {
  const ok = (typeof want === 'number') ? Math.abs(got-want) < tol : got === want;
  if (!ok) fails++;
  console.log((ok?'  OK  ':'  FAIL') + ' ' + nimi + ': ' + got + (ok?'':'  (odotettu '+want+')'));
}

console.log('\n— Palkkajakson rajat —');
eq('jakson -1 alku',  run(`isoLocal(periodBounds(-1).startPay)`), '2026-07-27');
eq('jakson -1 loppu', run(`isoLocal(periodBounds(-1).endPay)`),   '2026-08-27');
eq('jakson 0 alku',   run(`isoLocal(periodBounds(0).startPay)`),  '2026-08-27');
eq('jakson tunniste', run(`periodIdFor(-1)`), '2026-P07');

console.log('\n— Toteuma ja frekvenssi —');
eq('toteuma (palautus vahennetty)', run(`budgetSpent(B,-1)`), 904.06);
eq('ostosten lkm (palautus ei laske)', run(`budgetCount(B,-1)`), 2);
eq('eri kategoria ei vuoda budjettiin', run(`budgetSpent(BASU,-1)`), 0);

console.log('\n— Rollover: ylityksella on seuraus —');
eq('edellisen jakson ylitys', run(`budgetStatus(B,-1).carry`), 24.69);
eq('efektiivinen raja',       run(`budgetStatus(B,-1).effLimit`), 525.31);
eq('jaljella (negatiivinen)', run(`budgetStatus(B,-1).remaining`), -378.75);
eq('yli-lippu',               run(`budgetStatus(B,-1).over`), true);
eq('ilman rolloveria raja ei kutistu', run(`budgetStatus(B2,-1).effLimit`), 550);

console.log('\n— Budjetti kayttaa palkkajaksoa myos kalenterinakymassa —');
eq('budgetOffset 2026-08', run(`viewMode='calendar'; curMonth='2026-08'; budgetOffset()`), 0);
eq('budgetOffset 2026-07', run(`curMonth='2026-07'; budgetOffset()`), -1);
run(`viewMode='period'`);

console.log('\n— Splitit purkautuvat oikein —');
run(`txs.push({id:'h',date:'2026-08-05',cat:'Asuminen',type:'needs',amount:-625.90,payee:'As Oy Havinkartano',
  splits:[{label:'Vastike',cat:'Asuminen',type:'needs',amount:289.80},
          {label:'Vesi',cat:'Asuminen',type:'needs',amount:40},
          {label:'Rahoitusvastike',cat:'Luotot — lyhennys',type:'needs',amount:296.10}]})`);
eq('split ei vuoda ulkona-budjettiin', run(`budgetSpent(B,-1)`), 904.06);
eq('asumisbudjettiin vain vastike+vesi', run(`budgetSpent(BASU,-1)`), 329.80);
eq('lyhennysbudjettiin vain rahoitusvastike',
   run(`budgetSpent({id:'l',label:'L',cats:['Luotot — lyhennys'],limit_eur:400,rollover:false},-1)`), 296.10);

console.log('\n— Emoji-etuliite ei riko kategoriavertailua —');
eq('emojilla varustettu kategoria osuu',
   run(`budgetSpent({id:'x',label:'X',cats:['🍽️ Ravintolat'],limit_eur:100,rollover:false},-1)`), 904.06-274.69*0);


console.log('\n— Rollover ei ulotu budjettia edeltaviin jaksoihin —');
eq('vanha budjetti (ei created_at) perii ylityksen', run(`budgetStatus(B,0).carry`), 354.06);
eq('tanaan luotu budjetti aloittaa puhtaalta poydalta', run(`budgetStatus(BUUSI,0).carry`), 0);
eq('...ja saa tayden rajan', run(`budgetStatus(BUUSI,0).effLimit`), 550);

console.log('\n— Viikkopalaute (tanaan to 27.8.2026) —');
// Jakso 0: 27.8. -> 25.9. Huom: 27.9.2026 on sunnuntai, joten palkkapaiva
// siirtyy pe 25.9:aan -> jakso on 29 pv, ei 31. Juuri tama on syy siihen etta
// viikkotahti lasketaan todellisista paivista eika oleteta "noin kuukausi".
eq('jakson 0 loppu = pe 25.9. (27.9. on su)', run(`isoLocal(periodBounds(0).endPay)`), '2026-09-25');

// Puhdas tahti ilman rolloveria
run(`W = weekStatus(B2, 0)`);
eq('viikko on kaynnissa', run(`W.isCurrent`), true);
eq('viikkoa jaljella 4 pv (to,pe,la,su)', run(`W.daysLeftWeek`), 4);
eq('jaksoa jaljella 29 pv', run(`W.daysLeftPeriod`), 29);
eq('paivatahti = 550/29', run(`W.perDay`), 550/29);
eq('viikon liikkumavara = 4 x paivatahti', run(`W.allowance`), 550/29*4);
eq('viikolla kaytetty viela 0', run(`W.spent`), 0);

// Ylitys alkuviikosta kutistaa loppujakson tahtia ITSESTAAN — ei erillista
// viikkorolloveria. Kiintea 550/4,43 nayttaisi yha saman luvun.
run(`txs.push({id:'w1',date:'2026-08-27',cat:'Ravintolat',type:'wants',amount:-200}); W2 = weekStatus(B2,0)`);
eq('viikolla kaytetty 200', run(`W2.spent`), 200);
eq('viikon ostosten lkm', run(`W2.count`), 1);
eq('paivatahti putosi 350/29:aan', run(`W2.perDay`), 350/29);
eq('viikon liikkumavara kutistui', run(`W2.allowance`), 350/29*4);

// Jakson ylitys nakyy viikkotasolla negatiivisena
run(`txs.push({id:'w2',date:'2026-08-28',cat:'Ravintolat',type:'wants',amount:-600}); W3 = weekStatus(B2,0)`);
eq('yli jaksobudjetin', run(`W3.over`), true);
eq('liikkumavara negatiivinen', run(`W3.allowance < 0`), true);

// Rollover kutistaa myos viikkotahtia: edellisen jakson ylitys 904,06-550
run(`W5 = weekStatus(B, 0)`);
eq('rollover-carry edellisesta jaksosta', run(`budgetStatus(B,0).carry`), 354.06);
eq('rollover nakyy viikkotahdissa', run(`W5.perDay < weekStatus(B2,0).perDay`), true);

// Paattynyt jakso: viikkotahti ei tarkoita mitaan, mutta edellinen viikko on
run(`W4 = weekStatus(B,-1)`);
eq('paattyneelle jaksolle ei viikkotahtia', run(`W4.daysLeftWeek`), 0);
eq('edellinen viikko laskettu', run(`W4.prev !== null`), true);
eq('edellisen viikon vertailuosuus on paivasuhteinen', run(`W4.prev.share > 0 && W4.prev.share < 550`), true);


console.log('\n— Eramaksujen ristiriitatarkistus (tanaan 27.8.2026) —');
// Kynnys: yksi era. Laskutettu mutta maksamaton era saa erottaa saldon ja
// paattymiskuukauden ilman etta varoitus laukeaa.
const L=(nimi,balance,era,end,apr=null)=>`loanDrift({name:'${nimi}',balance:${balance},monthly_payment:${era},end_month:'${end}',apr:${apr}})`;
eq('iPhone VANHA saldo 242,76 -> varoitus',      run(`${L('iPhone',242.76,34.68,'2027-01')} !== null`), true);
eq('iPhone vanha: 2 eraa liikaa',                run(`${L('iPhone',242.76,34.68,'2027-01')}.eria`), 2);
eq('iPhone KORJATTU 138,72 -> ei varoitusta',    run(`${L('iPhone',138.72,34.68,'2027-01')}`), null);
eq('Huawei VANHA 94,99 -> varoitus',             run(`${L('Huawei',94.99,4.13,'2028-05')} !== null`), true);
eq('Huawei KORJATTU 82,60 -> ei varoitusta',     run(`${L('Huawei',82.60,4.13,'2028-05')}`), null);
eq('Keittiolaina VANHA 2 684,54 -> varoitus',    run(`${L('Keittio',2684.54,281.81,'2027-03')} !== null`), true);
eq('Keittiolaina KORJATTU 1 839,11 -> ei varoitusta', run(`${L('Keittio',1839.11,281.81,'2027-03')}`), null);
eq('Roborock 540,60 -> ei varoitusta',           run(`${L('Roborock',540.60,54.06,'2027-07')}`), null);
eq('MacBook 2 973,64 -> ei varoitusta',          run(`${L('MacBook',2973.64,87.46,'2029-07')}`), null);
eq('korollista lainaa (yli 2 %) ei tarkisteta',  run(`${L('Asuntolaina',56940,158,'2056-04',3.3)}`), null);
// Keittiolaina on 1,5 %:n myyntirahoitus jossa erasta 6 EUR on kasittelymaksua:
// tarkistus toimii yha, mutta valjemmalla toleranssilla.
eq('keittiolaina laskun mukaan -> ei varoitusta', run(`${L('Keittio',1574.26,281.81,'2027-02',1.5)}`), null);
eq('keittiolaina 3 eraa vanhentuneena -> varoitus', run(`${L('Keittio',2419.69,281.81,'2027-02',1.5)} !== null`), true);


console.log('\n— Erien vapautumisaikataulu —');
run(`
loans = [
  {id:'a',name:'Keittiölaina',balance:1839.11,monthly_payment:281.81,end_month:'2027-03',apr:null,included_in_tx:1},
  {id:'b',name:'iPhone-erämaksu',balance:138.72,monthly_payment:34.68,end_month:'2027-01',apr:null,included_in_tx:1,lender:'Elisa'},
  {id:'c',name:'Huawei mesh-reititin',balance:82.60,monthly_payment:4.13,end_month:'2028-05',apr:null,included_in_tx:1,lender:'Elisa'},
  {id:'d',name:'Roborock',balance:540.60,monthly_payment:54.06,end_month:'2027-07',apr:null,included_in_tx:1,lender:'Elisa'},
  {id:'e',name:'MacBook Pro M5 Pro',balance:2973.64,monthly_payment:87.46,end_month:'2029-07',apr:null,included_in_tx:1,lender:'Elisa'},
];
accounts = [
  {key:'OPCredit',kind:'credit',monthly_target:150},
  {key:'Finnair', kind:'credit',monthly_target:150},
  {key:'Perus',   kind:'checking'},
];
RS = releaseSchedule();
`);
eq('kiinteat erat nyt', run(`RS.alku`), 762.14);
eq('lattia = korttien tavoitelyhennykset', run(`RS.floor`), 300);
eq('vapautumisia 5 kpl', run(`RS.rows.length`), 5);
eq('1. tammikuu 2027 (iPhone)', run(`RS.rows[0].month`), '2027-01');
eq('   ...jaljelle jaa', run(`RS.rows[0].jaljella`), 727.46);
eq('2. maaliskuu 2027 (keittiolaina)', run(`RS.rows[1].month`), '2027-03');
eq('   ...jaljelle jaa', run(`RS.rows[1].jaljella`), 445.65);
eq('3. heinakuu 2027 (Roborock)', run(`RS.rows[2].jaljella`), 391.59);
eq('4. toukokuu 2028 (Huawei)', run(`RS.rows[3].jaljella`), 387.46);
eq('5. heinakuu 2029 (MacBook) -> lattia', run(`RS.rows[4].jaljella`), 300);
eq('Elisa-ryhma: 4 sopimusta', run(`loans.filter(l=>l.lender==='Elisa').length`), 4);
eq('Elisa-ryhma: yhteissaldo', run(`loans.filter(l=>l.lender==='Elisa').reduce((s,l)=>s+l.balance,0)`), 3735.56);
eq('Elisa-ryhma: yhteiserä = laskun summa', run(`loans.filter(l=>l.lender==='Elisa').reduce((s,l)=>s+l.monthly_payment,0)`), 180.33);
eq('samaan kuukauteen paattyvat niputetaan',
   run(`loans.push({id:'f',name:'Testi',balance:100,monthly_payment:50,end_month:'2027-01',apr:null}); releaseSchedule().rows[0].nimet.length`), 2);

console.log(fails ? `\n${fails} TESTIA EPAONNISTUI` : '\nKAIKKI TESTIT LAPI');
process.exit(fails?1:0);
