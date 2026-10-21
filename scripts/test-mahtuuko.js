const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('app/index.html','utf8');
const body=html.match(/<script>([\s\S]*)<\/script>/)[1];
const FIXED=new Date('2026-10-21T21:00:00+03:00').getTime();
class FakeDate extends Date{constructor(...a){if(a.length===0)super(FIXED);else super(...a);}static now(){return FIXED;}}
const store={};const ctx2d=new Proxy({},{get:()=>function(){return ctx2d;},set:()=>true});
const els={};
const mk=()=>new Proxy({innerHTML:'',value:''},{get:(t,k)=>{if(k in t)return t[k];if(k==='style')return{};if(k==='classList')return{add(){},remove(){},toggle(){}};if(k==='getContext')return()=>ctx2d;if(k==='toDataURL')return()=>'data:,';if(['appendChild','removeChild','addEventListener','focus','click'].includes(k))return()=>{};return '';},set:(t,k,v)=>{t[k]=v;return true}});
const sandbox={localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}},
document:{getElementById:id=>(els[id]=els[id]||mk()),querySelectorAll:()=>[],querySelector:()=>mk(),addEventListener(){},createElement:()=>mk(),body:mk(),visibilityState:'hidden'},
window:{addEventListener(){},fetch:()=>Promise.reject(new Error('no net')),location:{href:''}},navigator:{onLine:true},fetch:()=>Promise.reject(new Error('no net')),
setTimeout,clearTimeout,setInterval,clearInterval,console,Date:FakeDate,Math,JSON,Intl};
sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(body,sandbox);
const run=c=>vm.runInContext(c,sandbox);
run(`
settings={salary_day:27,monthly_salary:3267};
accounts=[{key:'Perus',label:'OP Perustili',kind:'checking',opening_balance:1000,opening_date:'2026-01-01',last_import_through:'2026-10-20'},
 {key:'OPCredit',label:'OP Visa Credit',kind:'credit',opening_balance:-2000,opening_date:'2026-01-01',monthly_target:150},
 {key:'Finnair',label:'Finnair Visa',kind:'credit',opening_balance:0,opening_date:'2026-01-01'}];
const T=(id,date,payee,amount,cat,type,o={})=>({id,date,payee,amount,cat,type,account:'Perus',month:date.slice(0,7),selitys:'',viesti:'',...o});
txs=[];
// 3 menneet jaksoa: palkka, säästö 600, vastike 626, Elisa 180, ruoka 400, remontti 700 (P8)
[['2026-06-26','2026-07-01'],['2026-07-27','2026-08-01'],['2026-08-27','2026-09-01']].forEach(([pd,d],i)=>{
  txs.push(T('inc'+i,pd,'Työnantaja',3267,'Palkka ja tulot','income'));
  txs.push(T('sav'+i,d,'Kellberg',-600,'Sijoittaminen','savings'));
  txs.push(T('rnd'+i,d,'KELLBERG HENRIKKI',-40,'Säästölipas','savings',{viesti:'Siirto säästötavoitteeseen. 10 korttimaksua'}));
  txs.push(T('vas'+i,d,'As Oy Havinkartano',-626,'Asuminen','needs'));
  txs.push(T('food'+i,d,'Prisma',-400,'Päivittäistavarat','needs'));
});
txs.push(T('rem','2026-08-05','K-Rauta',-700,'Asuminen — remontti','needs'));
txs.push(T('eli','2026-09-04','Elisa Oyj',-180,'Suoratoisto & liittymät','needs'));
txs.push(T('fin','2026-09-11','Within limit interest',-30,'Luotot — korko','needs',{account:'Finnair'}));
txs.push(T('kit','2026-09-17','OP Yrityspankki Oyj',-281.81,'Luotot — lyhennys','needs'));
// nykyinen jakso 25.9.–26.10.
txs.push(T('incC','2026-09-25','Työnantaja',3267,'Palkka ja tulot','income'));
txs.push(T('vasC','2026-10-05','AS OY HAVINKARTANO',-626,'Asuminen','needs'));
txs.push(T('savC','2026-10-01','Kellberg',-300,'Sijoittaminen','savings'));
txs.push(T('kitC','2026-10-20','OP Yrityspankki Oyj',-1582,'MobilePay & siirrot','neutral',{account:'Saasto'}));
txs.push(T('opc','2026-09-25','Suoritus',100,'MobilePay & siirrot','neutral',{account:'OPCredit'}));
txs.push(T('finpay','2026-10-20','KELLBERG HEN',30,'MobilePay & siirrot','neutral',{account:'Finnair'}));
txs.push(T('rest','2026-10-02','Ravintola',-500,'Ravintolat','wants'));
txs.push(T('trip','2026-10-12','Hotel',-400,'Matkailu — harrastus','wants',{trip_id:'t1'}));
txs.push(T('foodC','2026-10-03','Prisma',-300,'Päivittäistavarat','needs'));
`);
const f=JSON.parse(run('JSON.stringify(computeFreeSpend())'));
const eq=(n,a,b)=>{const ok=Math.abs(a-b)<0.01;console.log((ok?'OK  ':'FAIL')+' '+n+': '+a+(ok?'':' != '+b));if(!ok)process.exitCode=1;};
eq('jakso alkaa',f.cur.startISO==='2026-09-25'?1:0,1);
eq('jakso loppuu',f.cur.endISO==='2026-10-27'?1:0,1);
eq('daysLeft',f.daysLeft,6);
eq('tulot',f.income,3267);
eq('säästötavoite = 3 jakson ka',f.savTarget,640);
eq('lipas-pyöristys ka',f.roundupAvg,40);
eq('säästö tehty',f.savDone,300);
eq('kiinteät maksettu',f.fixedPaid,626);
eq('tulossa: Elisa (ei Finnair 0-saldolla, ei keittiö loppumaksun jälkeen)',f.fixedLeft,180);
eq('OP Visa tavoite jäljellä',f.creditLeftSum,50);
eq('käytetty',f.spent,1200);
eq('matkoja',f.tripSpent,400);
eq('arki/pv ilman remonttia',f.dailyEveryday,1200/91);
const exp=3267-640-626-180-50-1200-1200/91*6;
eq('vapaa',f.free,exp);
run(`document.getElementById('fitAmount').value='100'; renderFitResult();`);
const v=run(`document.getElementById('fitVerdict').innerHTML`);
console.log(/Mahtuu|Ei mahdu/.test(v)?'OK   verdict renderöityy':'FAIL verdict'); 
run('curMonth=fmtMonthKey(new Date()); renderRunwayCard()'); console.log(/Mahtuuko ostos/.test(run(`document.getElementById('runwayCard').innerHTML`))?'OK   runway-kortissa linkki':'FAIL runway');
run(`settings.savings_target=900`); eq('asetettu säästötavoite',JSON.parse(run('JSON.stringify(computeFreeSpend())')).savTarget,900);
