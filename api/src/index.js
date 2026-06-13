/**
 * oma-talous Workers API
 * Endpoints: /receipts/parse, /quick/parse, /transactions, /summary, /import/csv, /rules, /settings
 */

// ── CORS ────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function cors(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { ...CORS, 'Content-Type': 'application/json', ...extra } });
}
function ok(data)   { return cors(JSON.stringify(data)); }
function err(msg, status = 400) { return cors(JSON.stringify({ error: msg }), status); }

// ── AUTH ─────────────────────────────────────────────────────────────────────
function auth(req, env) {
  const hdr = req.headers.get('Authorization') || '';
  return hdr === `Bearer ${env.APP_SECRET}`;
}

// ── ROUTER ───────────────────────────────────────────────────────────────────
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (!auth(req, env)) return err('Unauthorized', 401);

    try {
      // AI endpoints
      if (method === 'POST' && path === '/receipts/parse') return handleReceiptParse(req, env);
      if (method === 'POST' && path === '/quick/parse')    return handleQuickParse(req, env);

      // Transactions
      if (path === '/transactions') {
        if (method === 'GET')  return handleTxList(req, env, url);
        if (method === 'POST') return handleTxCreate(req, env);
      }
      const txMatch = path.match(/^\/transactions\/(.+)$/);
      if (txMatch) {
        if (method === 'PUT')    return handleTxUpdate(req, env, txMatch[1]);
        if (method === 'DELETE') return handleTxDelete(req, env, txMatch[1]);
      }

      // Summary
      if (method === 'GET' && path === '/summary') return handleSummary(req, env, url);

      // CSV import
      if (method === 'POST' && path === '/import/csv') return handleCSVImport(req, env);

      // Rules
      if (path === '/rules') {
        if (method === 'GET')  return handleRulesList(env);
        if (method === 'POST') return handleRulesCreate(req, env);
      }
      const ruleMatch = path.match(/^\/rules\/(\d+)$/);
      if (ruleMatch) {
        if (method === 'DELETE') return handleRuleDelete(env, parseInt(ruleMatch[1]));
      }

      // Settings
      if (path === '/settings') {
        if (method === 'GET') return handleSettingsGet(env);
        if (method === 'PUT') return handleSettingsPut(req, env);
      }

      return err('Not found', 404);
    } catch (e) {
      console.error(e);
      return err(e.message || 'Internal error', 500);
    }
  }
};

// ── AI: RECEIPT PARSE ────────────────────────────────────────────────────────
async function handleReceiptParse(req, env) {
  const { image, media_type } = await req.json();
  if (!image) return err('Missing image');

  const today = new Date().toISOString().split('T')[0];
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: `Olet kuittien parsija. Analysoi kuittikuva ja palauta AINOASTAAN yksi JSON-objekti.
Formaatti täsmälleen:
{"merchant":"kauppiaannimi","date":"YYYY-MM-DD","total":12.50,"category":"ravintola","items":[{"name":"tuote","amount":3.50,"category":"ruoka"}]}
Kategoriat: ruoka, ravintola, liikenne, koti, vaatteet, viihde, terveys, alkoholi, muut
Päivämäärä tänään jos ei näy kuitissa: ${today}`,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: media_type || 'image/jpeg', data: image } },
          { type: 'text', text: 'Parsii kuitti. Vastaa vain JSON.' }
        ]
      }]
    })
  });

  if (!res.ok) {
    const e = await res.json().catch(()=>({}));
    return err(e.error?.message || `Claude API ${res.status}`, 502);
  }
  const data = await res.json();
  const raw = data.content?.map(b=>b.text||'').join('') || '';
  return ok(extractJSON(raw));
}

// ── AI: QUICK PARSE ──────────────────────────────────────────────────────────
async function handleQuickParse(req, env) {
  const { text } = await req.json();
  if (!text) return err('Missing text');

  const today = new Date().toISOString().split('T')[0];
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: `Parsii vapaamuotoinen kulumerkintä JSON-objektiksi. Palauta VAIN JSON.
{"merchant":"nimi","amount":12.50,"category":"ruoka","date":"YYYY-MM-DD"}
Kategoriat: ruoka, ravintola, liikenne, koti, vaatteet, viihde, terveys, alkoholi, muut
Tänään: ${today}`,
      messages: [{ role: 'user', content: text }]
    })
  });

  if (!res.ok) {
    const e = await res.json().catch(()=>({}));
    return err(e.error?.message || `Claude API ${res.status}`, 502);
  }
  const data = await res.json();
  const raw = data.content?.map(b=>b.text||'').join('') || '';
  return ok(extractJSON(raw));
}

// ── TRANSACTIONS ─────────────────────────────────────────────────────────────
async function handleTxList(req, env, url) {
  const month = url.searchParams.get('month');
  const type  = url.searchParams.get('type');
  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];
  if (month) { query += ' AND month = ?'; params.push(month); }
  if (type)  { query += ' AND type = ?';  params.push(type); }
  query += ' ORDER BY date DESC, created_at DESC LIMIT 1000';
  const { results } = await env.DB.prepare(query).bind(...params).all();
  return ok(results);
}

async function handleTxCreate(req, env) {
  const tx = await req.json();
  if (!tx.date || tx.amount === undefined || !tx.payee) return err('Missing fields');
  tx.id = tx.id || `manual_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
  tx.month = tx.date.substring(0,7);
  await env.DB.prepare(
    'INSERT OR REPLACE INTO transactions (id,date,payee,selitys,viesti,amount,cat,type,source,month) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).bind(tx.id,tx.date,tx.payee||'',tx.selitys||'',tx.viesti||'',tx.amount,tx.cat||null,tx.type||null,tx.source||'manual',tx.month).run();
  return ok({ id: tx.id });
}

async function handleTxUpdate(req, env, id) {
  const updates = await req.json();
  const fields = ['cat','type','payee','amount','date'].filter(f=>updates[f]!==undefined);
  if (!fields.length) return err('Nothing to update');
  const sets = fields.map(f=>`${f}=?`).join(',');
  const vals = fields.map(f=>updates[f]);
  await env.DB.prepare(`UPDATE transactions SET ${sets} WHERE id=?`).bind(...vals, id).run();
  return ok({ ok: true });
}

async function handleTxDelete(req, env, id) {
  await env.DB.prepare('DELETE FROM transactions WHERE id=?').bind(id).run();
  return ok({ ok: true });
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
async function handleSummary(req, env, url) {
  const month = url.searchParams.get('month');
  if (!month) return err('month param required');
  const { results } = await env.DB.prepare('SELECT type, amount FROM transactions WHERE month=?').bind(month).all();
  const income  = results.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const needs   = results.filter(t=>t.type==='needs'&&t.amount<0).reduce((s,t)=>s+Math.abs(t.amount),0);
  const wants   = results.filter(t=>t.type==='wants'&&t.amount<0).reduce((s,t)=>s+Math.abs(t.amount),0);
  const savings = results.filter(t=>t.type==='savings').reduce((s,t)=>s+Math.abs(t.amount),0);
  const rate    = income>0 ? Math.round(savings/income*100) : 0;
  return ok({ month, income, needs, wants, savings, rate, surplus: income-needs-wants-savings });
}

// ── CSV IMPORT ────────────────────────────────────────────────────────────────
async function handleCSVImport(req, env) {
  const { csv, filename } = await req.json();
  if (!csv) return err('Missing csv');
  const rows = parseCSV(csv, filename || '');
  const { results: existing } = await env.DB.prepare('SELECT id FROM transactions').all();
  const ids = new Set(existing.map(r=>r.id));
  const { results: rulesRows } = await env.DB.prepare('SELECT kw,cat,type FROM rules ORDER BY priority DESC').all();
  let added = 0;
  for (const row of rows) {
    if (ids.has(row.id)) continue;
    const cat = categorize(row, rulesRows);
    row.month = row.date.substring(0,7);
    await env.DB.prepare(
      'INSERT INTO transactions (id,date,payee,selitys,viesti,amount,cat,type,source,month) VALUES (?,?,?,?,?,?,?,?,?,?)'
    ).bind(row.id,row.date,row.payee,row.selitys,row.viesti,row.amount,cat.cat,cat.type,row.source,row.month).run();
    added++;
  }
  return ok({ added, total: rows.length });
}

// ── RULES ─────────────────────────────────────────────────────────────────────
async function handleRulesList(env) {
  const { results } = await env.DB.prepare('SELECT * FROM rules ORDER BY priority DESC, id ASC').all();
  return ok(results);
}

async function handleRulesCreate(req, env) {
  const { kw, cat, type, priority=0 } = await req.json();
  if (!kw||!cat||!type) return err('Missing fields');
  const { meta } = await env.DB.prepare('INSERT INTO rules (kw,cat,type,priority) VALUES (?,?,?,?)').bind(kw,cat,type,priority).run();
  return ok({ id: meta.last_row_id });
}

async function handleRuleDelete(env, id) {
  await env.DB.prepare('DELETE FROM rules WHERE id=?').bind(id).run();
  return ok({ ok: true });
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
async function handleSettingsGet(env) {
  const { results } = await env.DB.prepare('SELECT key,value FROM settings').all();
  return ok(Object.fromEntries(results.map(r=>[r.key,r.value])));
}

async function handleSettingsPut(req, env) {
  const data = await req.json();
  for (const [k,v] of Object.entries(data)) {
    await env.DB.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').bind(k,String(v)).run();
  }
  return ok({ ok: true });
}

// ── CSV PARSER ────────────────────────────────────────────────────────────────
function parseCSV(text, fname) {
  const lines = text.split('\n').filter(l=>l.trim());
  if (!lines.length) return [];
  const isFinnair = lines[0].includes('Maksupäivä');
  const rows = [];
  for (let i=1; i<lines.length; i++) {
    if (isFinnair) {
      const c = splitCSV(lines[i], ',');
      if (c.length<9) continue;
      const amt = parseFloat(c[8]);
      if (isNaN(amt)) continue;
      const payee = c[1].replace(/"/g,'').trim();
      rows.push({id:`FI_${c[0]}_${payee}_${amt}`, date:c[0].trim(), payee, selitys:'Finnair Visa', viesti:'', amount:amt, source:fname||'Finnair Visa'});
    } else {
      const c = lines[i].split(';').map(x=>x.replace(/^"|"$/g,'').trim());
      if (c.length<6) continue;
      const amt = parseFloat((c[2]||'').replace(',','.'));
      if (isNaN(amt)) continue;
      rows.push({id:c[10]||`OP_${c[0]}_${c[5]}_${amt}`, date:c[0], payee:c[5]||'', selitys:c[4]||'', viesti:c[9]||'', amount:amt, source:fname||'OP'});
    }
  }
  return rows;
}

function splitCSV(line, sep) {
  const res=[]; let cur='', inQ=false;
  for (const ch of line) {
    if (ch==='"') inQ=!inQ;
    else if (ch===sep&&!inQ) { res.push(cur); cur=''; }
    else cur+=ch;
  }
  res.push(cur); return res;
}

function categorize(tx, rules) {
  const txt = ((tx.payee||'')+' '+(tx.selitys||'')+' '+(tx.viesti||'')).toLowerCase();
  for (const r of rules) if (txt.includes(r.kw.toLowerCase())) return {cat:r.cat, type:r.type};
  if (tx.amount>0) return {cat:'Palkka ja tulot', type:'income'};
  return {cat:'— Kategorisoimatta', type:'flag'};
}

// ── JSON EXTRACT ─────────────────────────────────────────────────────────────
function extractJSON(text) {
  try { return JSON.parse(text); } catch(_) {}
  const stripped = text.replace(/```(?:json)?/gi,'').trim();
  try { return JSON.parse(stripped); } catch(_) {}
  const m = stripped.match(/\{[\s\S]*\}/);
  if (m) try { return JSON.parse(m[0]); } catch(_) {}
  throw new Error('Could not parse AI response as JSON');
}
