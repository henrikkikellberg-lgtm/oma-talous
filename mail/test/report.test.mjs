// Käyttö: npm run test:report  (Node 22+, node:sqlite)
// Synteettinen kanta: tarkistaa jakson rajauksen, splitit, netotuksen, sijoitukset,
// luottovelan muutoksen, poikkeamat ja tuoreusportin. Ei koske tuotantokantaan.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { periodWindow, periodReport, freshness } from "../src/report.js";

function fakeEnv(db) {
  return {
    DB: {
      prepare(sql) {
        let args = [];
        const st = {
          bind: (...a) => { args = a; return st; },
          all: async () => ({ results: db.prepare(sql).all(...args) }),
          first: async () => db.prepare(sql).get(...args) ?? null,
        };
        return st;
      },
    },
  };
}

const db = new DatabaseSync(":memory:");
db.exec(`
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE accounts (key TEXT PRIMARY KEY, label TEXT, kind TEXT, opening_balance REAL, opening_date TEXT,
  credit_limit REAL, sort INTEGER, on_hold INTEGER DEFAULT 0, last_import_through TEXT);
CREATE TABLE budgets (id TEXT, label TEXT, cats TEXT, limit_eur REAL, sort INTEGER);
CREATE TABLE transactions (id TEXT, date TEXT, account TEXT, payee TEXT, selitys TEXT, viesti TEXT,
  amount REAL, cat TEXT, type TEXT, splits TEXT);
INSERT INTO settings VALUES ('salary_day','27'),('account_model','split'),('savings_target','1000'),
  ('pockets','{"Ulkona":{"fill":232},"Päivittäistavarat":{"fill":88,"cadence":"week"}}'),
  ('recurring','{"overrides":{},"manual":[{"id":"m1","label":"OP-asuntolaina","amount":505,"day":30,"start":"2026-11-30"}]}');
INSERT INTO accounts VALUES
  ('Perus','OP Perustili','checking',1000,'2025-12-31',NULL,1,0,'2026-11-22'),
  ('Saasto','OP Säästötili','savings',10000,'2025-12-31',NULL,2,0,'2026-11-23'),
  ('OPCredit','OP Visa Credit','credit',-2000,'2025-12-31',8000,3,1,'2026-11-21'),
  ('Revolut','Revolut','checking',0,'2026-04-25',NULL,4,0,'2026-11-23'),
  ('Vuokra','OP Vuokratili','rental',2000,'2020-05-18',NULL,8,0,'2026-11-01');
INSERT INTO budgets VALUES ('ulkona','Ulkona','["Ravintolat","Baarit"]',550,1);
INSERT INTO transactions VALUES
  ('old','2026-10-26','Perus','X','','',-500,'Ravintolat','wants',NULL),            -- edellinen jakso
  ('sal','2026-10-27','Perus','Palkka','PALKKA','',3000,'Palkka ja tulot','income',NULL),
  ('cash','2026-10-28','Perus','KELLBERG','TALLETUSAUTOM.','Käteistalletus',225,'Matkailu — harrastus','wants',
     '[{"label":"Teija","cat":"Matkailu — harrastus","type":"wants","amount":150},{"label":"Oma","cat":"MobilePay & siirrot","type":"neutral","amount":75}]'),
  ('inv1','2026-10-31','Perus','Saxo','','',-575,'Sijoittaminen','savings',NULL),
  ('inv2','2026-11-12','Saasto','Saxo','','',616.75,'Sijoittaminen','savings',NULL),
  ('inv3','2026-11-16','Saasto','NORDNET','','',-650,'Sijoittaminen','neutral',NULL),
  ('vr','2026-11-21','Saasto','VR','','',-122,'Liikkuminen — arki','needs',NULL),
  ('pay','2026-11-02','OPCredit','Suoritus','','',650,'MobilePay & siirrot','neutral',NULL),
  ('payP','2026-11-02','Perus','OP Vähittäis','','',-650,'MobilePay & siirrot','neutral',NULL),
  ('cc1','2026-11-21','OPCredit','KELLBERG HENRIKKI','Pueblo','',-81.8,'Ravintolat','wants',NULL),
  ('int','2026-11-09','OPCredit','Korko','Korko','',-19.58,'Luotot — korko','needs',NULL),
  ('r1','2026-11-17','Revolut','Smartum','','Revolut · Ulkona',-34.12,'Ravintolat','wants',NULL),
  ('r2','2026-11-16','Revolut','Apple Pay','','Revolut',16.9,'Ravintolat','wants',NULL),
  ('rin','2026-10-30','Revolut','Avoimen pankkitoiminnan lisämaksu','','Revolut',500,'MobilePay & siirrot','neutral',NULL),
  ('pu1','2026-10-30','Revolut','Taskuun EUR Ulkona','','Revolut',-232,'MobilePay & siirrot','neutral',NULL),
  ('pu2','2026-10-30','Revolut','Taskuun EUR Ulkona','','Revolut · Ulkona',232,'MobilePay & siirrot','neutral',NULL),
  ('pp1','2026-11-06','Revolut','Taskuun EUR Päivittäistavarat','','Revolut',-88,'MobilePay & siirrot','neutral',NULL),
  ('pp2','2026-11-06','Revolut','Taskuun EUR Päivittäistavarat','','Revolut · Päivittäistavarat',88,'MobilePay & siirrot','neutral',NULL),
  ('r3','2026-11-18','Revolut','S-market','','Revolut · Päivittäistavarat',-40,'Päivittäistavarat','needs',NULL),
  ('vu','2026-11-05','Vuokra','Vastike','','',-300,'Vuokra — vastikkeet','neutral',NULL),
  ('kl0','2026-09-07','Perus','MOB.PAY*KAUPPALEHTI HELSINKI','PKORTTIMAKSU','',-35.9,'Kulttuuri ja viihde','wants',NULL),
  ('kl1','2026-10-07','Perus','MOB.PAY*KAUPPALEHTI HELSINKI','PKORTTIMAKSU','',-35.9,'Kulttuuri ja viihde','wants',NULL),
  ('kl2','2026-11-07','Perus','MOB.PAY*KAUPPALEHTI HELSINKI','PKORTTIMAKSU','',-35.9,'Kulttuuri ja viihde','wants',NULL),
  ('el','2026-11-02','Perus','Elisa Oyj','','',-180.33,'Suoratoisto & liittymät','needs',NULL),
  ('sh','2026-11-13','Perus','ESKO HONKANEN','','Showhat liput',-104,'Kulttuuri ja viihde','wants',NULL),
  ('fl','2026-11-20','Revolut','?','','Revolut',-5,'— Kategorisoimatta','flag',NULL);
`);
const env = fakeEnv(db);

// Jakso: 27.10.2026 on tiistai → alku 27.10.; 27.11.2026 on perjantai → viimeinen päivä 26.11.
const W = periodWindow("2026-11-24", 27);
assert.equal(W.start, "2026-10-27");
assert.equal(W.lastDay, "2026-11-26");
assert.equal(W.periodLen, 31);
assert.equal(W.daysLeft, 2);
// Viikonloppu: 27.6.2026 on lauantai → palkkapäivä pe 26.6.
assert.equal(periodWindow("2026-06-26", 27).start, "2026-06-26");
assert.equal(periodWindow("2026-06-25", 27).lastDay, "2026-06-25");

const R = await periodReport(env, "2026-11-24");
const n = R.numbers;
const close = (a, b) => assert.ok(Math.abs(a - b) < 0.005, `${a} ≠ ${b}`);
close(n.income, 3000);
close(n.bills, 180.33 + 35.9);                          // Elisa (kiinteä kat.) + Kauppalehti (toistuva)
close(n.living, 34.12 + 40 - 16.9);                     // Revolut, palautus netotettu
close(n.off, 122 + 81.8 + 19.58 + 104 - 150);           // Säästö, Credit, Showhat, Teijan palautus
close(n.investedFromIncome, 575);
close(n.pohja, 3000 - n.bills - n.living - n.off - 575);
close(n.prev.off, 500 + 35.9);                          // edellisellä jaksolla Kauppalehti ei vielä toistuva (1 aiempi jakso)
close(n.prev.bills, 0);
assert.ok(!R.text.includes("Vastike"), "vuokratili ei saa näkyä");
assert.match(R.text, /POHJA KESTÄÄ/);
assert.match(R.text, /BUDJETIN OHI/);
assert.match(R.text, /OP Säästötili +122/);
assert.match(R.text, /PALAUTE/);
assert.match(R.text, /TARKISTA  1 kategorisoimatonta/);

// Taskut: saldo koko historiasta, tulevat viikkotäytöt (pe) jakson loppuun
const pk = (r, name) => r.pockets.list.find((p) => p.name === name);
close(pk(R, "Ulkona").balance, 232 - 34.12);
close(pk(R, "Päivittäistavarat").balance, 88 - 40);
close(pk(R, "Päivittäistavarat").budget, 4 * 88);          // pe 30.10., 6.11., 13.11., 20.11.
assert.equal(pk(R, "Päivittäistavarat").fillsLeft, 0);      // 27.11. aloittaa seuraavan jakson
const R2 = await periodReport(env, "2026-11-10");
assert.equal(pk(R2, "Päivittäistavarat").fillsLeft, 2);     // 13.11. ja 20.11.
close(R2.pockets.reserved, 176);
close(R.pockets.mainBal, 500 - 232 - 88 + 16.9 - 5);

// Tuoreusportti: holdissa oleva ja vuokratili eivät estä
const f = await freshness(env, "2026-11-24");
assert.deepEqual(f.rows.map((r) => r.key), ["Perus", "Saasto", "Revolut"]);
assert.equal(f.ready, true);
assert.equal((await freshness(env, "2026-11-28")).ready, false); // Perus 6 pv

console.log(R.text);
console.log("\n✓ report-testit ok");
