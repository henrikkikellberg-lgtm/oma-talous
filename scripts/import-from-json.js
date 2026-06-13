#!/usr/bin/env node
/**
 * Muuntaa budjetti-2.html JSON-exportin D1-yhteensopivaksi SQL:ksi
 * Käyttö: node scripts/import-from-json.js <tiedosto.json>
 * Ajaa suoraan: node scripts/import-from-json.js budjetti-2026-06-13.json | wrangler d1 execute oma-talous-db --remote --file=-
 */

const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) { console.error('Anna JSON-tiedosto: node import-from-json.js <tiedosto.json>'); process.exit(1); }

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const txs   = data.txs   || [];
const rules = data.rules || [];

const lines = [];

// Tapahtumat
lines.push('-- Tapahtumat');
for (const tx of txs) {
  if (!tx.id || !tx.date || tx.amount === undefined) continue;
  const month = (tx.date || '').substring(0, 7);
  const esc = s => String(s || '').replace(/'/g, "''");
  lines.push(
    `INSERT OR IGNORE INTO transactions (id,date,payee,selitys,viesti,amount,cat,type,source,month) VALUES ` +
    `('${esc(tx.id)}','${esc(tx.date)}','${esc(tx.payee)}','${esc(tx.selitys)}','${esc(tx.viesti)}',` +
    `${tx.amount},'${esc(tx.cat)}','${esc(tx.type)}','${esc(tx.source || 'csv')}','${esc(month)}');`
  );
}

// Säännöt (lisätään vain jos ei jo ole sama kw)
lines.push('');
lines.push('-- Säännöt');
for (const r of rules) {
  if (!r.kw || !r.cat || !r.type) continue;
  const esc = s => String(s || '').replace(/'/g, "''");
  lines.push(
    `INSERT OR IGNORE INTO rules (kw,cat,type,priority) VALUES ('${esc(r.kw)}','${esc(r.cat)}','${esc(r.type)}',0);`
  );
}

const sql = lines.join('\n');
const outFile = file.replace(/\.json$/, '-import.sql');
fs.writeFileSync(outFile, sql);

console.error(`✓ ${txs.length} tapahtumaa, ${rules.length} sääntöä → ${outFile}`);
console.log(sql);
