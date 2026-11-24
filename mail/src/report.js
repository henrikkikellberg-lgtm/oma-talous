// Palkkajaksoraportti tiliote-kuittaukseen (v1.27.0).
// Lukee D1:stä (vain luku) ja tuottaa tekstiraportin. Säännöt peilaavat frontendin
// logiikkaa (app/index.html): periodBounds/dashWindow, expandTx, monthSummary,
// wealthChange, tmInvestedFromIncome, staleAccounts. Ei tekoälyä — pelkkää laskentaa.

export const FRESH_DAYS = 5;
const FIXED_HOLIDAYS = ["01-01", "01-06", "05-01", "12-06", "12-24", "12-25", "12-26"];
const FIXED_CATS = ["Asuminen", "Luotot — korko", "Luotot — lyhennys", "Suoratoisto & liittymät", "Vakuutukset"];
const DEFAULTS = {
  salary_day: 27, account_model: "single", bills_account: "Perus", spend_account: "Revolut",
  invest_target: 1000, pockets: {}, recurring: { overrides: {}, manual: [] },
};

// ── Päivämäärät (UTC-keskiyö, ISO yyyy-mm-dd) ────────────────────────────────
const D = (iso) => new Date(iso + "T00:00:00Z");
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (isoStr, n) => { const d = D(isoStr); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((D(b) - D(a)) / 86400000);
const ddmm = (s) => { const p = s.split("-"); return `${+p[2]}.${+p[1]}.`; };
export const todayHelsinki = (now = new Date()) =>
  now.toLocaleString("sv-SE", { timeZone: "Europe/Helsinki" }).slice(0, 10);

function isBankDay(d) {
  const wd = d.getUTCDay();
  if (wd === 0 || wd === 6) return false;
  return !FIXED_HOLIDAYS.includes(iso(d).slice(5));
}
function effectivePayday(y, m0, day) {
  const d = new Date(Date.UTC(y, m0, day));
  while (!isBankDay(d)) d.setUTCDate(d.getUTCDate() - 1);
  return iso(d);
}
// Nyt elettävä palkkajakso: [start, lastDay], endPay = seuraava palkkapäivä.
export function periodWindow(today, salaryDay) {
  const t = D(today);
  let y = t.getUTCFullYear(), m = t.getUTCMonth();
  let start = effectivePayday(y, m, salaryDay);
  if (start > today) { m -= 1; start = effectivePayday(y, m, salaryDay); }
  const endPay = effectivePayday(y, m + 1, salaryDay);
  const lastDay = addDays(endPay, -1);
  const end = today < lastDay ? today : lastDay;
  return {
    start, end, endPay, lastDay,
    periodLen: Math.max(daysBetween(start, endPay), 1),
    daysElapsed: Math.max(daysBetween(start, end) + 1, 1),
    daysLeft: Math.max(daysBetween(end, lastDay), 0),
  };
}

// ── Apurit ───────────────────────────────────────────────────────────────────
const fmt = (n) => (Math.round(n * 100) / 100).toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur = (n) => `${fmt(n)} €`;
const sgn = (n) => (n >= 0 ? "+" : "−") + eur(Math.abs(n));
const sum = (list, f = (t) => t.amount) => list.reduce((s, t) => s + (+f(t) || 0), 0);
const stripIcon = (c) => String(c || "").replace(/^[^\p{L}\d—]+/u, "").trim();
const parseJson = (v, fb) => { try { return v ? JSON.parse(v) : fb; } catch { return fb; } };

function expandTx(t) {
  const splits = parseJson(t.splits, null);
  if (Array.isArray(splits) && splits.length) {
    const sign = t.amount < 0 ? -1 : 1;
    return splits.map((s) => ({ ...t, cat: s.cat, type: s.type, amount: sign * Math.abs(+s.amount || 0), splitLabel: s.label }));
  }
  return [t];
}

async function loadSettings(env) {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings").all();
  const s = { ...DEFAULTS };
  for (const r of results) {
    if (["pockets", "recurring", "nws_own"].includes(r.key)) s[r.key] = parseJson(r.value, DEFAULTS[r.key]);
    else if (r.value !== "" && r.value != null) s[r.key] = isNaN(+r.value) ? r.value : +r.value;
  }
  if (!s.invest_target && s.savings_target) s.invest_target = s.savings_target;
  return s;
}

// ── Tuoreus ──────────────────────────────────────────────────────────────────
// Aktiiviset tilit: ei closed, ei rental (vuokratili on erillään), ei holdissa.
export async function freshness(env, today = todayHelsinki()) {
  const { results } = await env.DB.prepare(
    "SELECT key, label, kind, on_hold, last_import_through FROM accounts ORDER BY sort"
  ).all();
  const active = results.filter((a) => a.kind !== "closed" && a.kind !== "rental" && !a.on_hold);
  const rows = active.map((a) => {
    const age = a.last_import_through ? daysBetween(a.last_import_through, today) : null;
    return { ...a, age, fresh: age !== null && age <= FRESH_DAYS };
  });
  return { rows, ready: rows.length > 0 && rows.every((r) => r.fresh) };
}

export function freshnessLines(f) {
  return f.rows.map((r) => `${r.fresh ? "✓" : "⚠"} ${r.label}: ${r.last_import_through ? ddmm(r.last_import_through) + ` (${r.age} pv)` : "ei tuotu"}`);
}

// ── Raportti (v1.28.0) ───────────────────────────────────────────────────────
// Rakenne tilimallin mukaan: Palkka − Laskut (laskutili) − Sijoitukset tuloista
// − Elämiseen (kulutustili/taskut) − Budjetin ohi (kaikki muu kulutus) = Pohja.
// Pohjan pitää olla ≥ 0 (TALOUS.md tavoite 4). Budjetin ohi = vuoto.

// Rivin näyttönimi: luottokortilla kauppias on selitys-kentässä, tilisiirrossa viesti kertoo enemmän.
const displayName = (t, acc) => {
  if (t.splitLabel) return t.splitLabel;
  if (acc[t.account]?.kind === "credit" && t.selitys) return t.selitys;
  const m = /Viesti:\s*([^\d]{3,40}?)(\s+FI\d|\s+ref=|$)/.exec(t.viesti || "");
  if (t.selitys === "TILISIIRTO" && m) return m[1].trim();
  return String(t.payee || t.cat || "").replace(/^(Paytrail Oyj|PTL\*|MOB\.PAY\*|VFI\*)\s*/i, "")
    .replace(/\s+pankkimaksu$/i, "").replace(/\s+(HELSINKI|RIIHIMAKI|TURKU|KUOPIO|Helsinki)$/, "").trim();
};
const isSpend = (t) => t.type === "needs" || t.type === "wants";
// Maksunsaaja-avain: numeroita sisältävät sanat pois (Spotify P4973CA70F → spotify)
const payeeKey = (p) => String(p || "").toLowerCase().split(/\s+/).filter((w) => w && !/\d/.test(w)).join(" ");

async function loadTx(env, start, end, acc) {
  const { results } = await env.DB.prepare(
    "SELECT id,date,account,payee,selitys,viesti,amount,cat,type,splits FROM transactions WHERE date >= ? AND date <= ? AND coalesce(account,'') <> 'Vuokra'"
  ).bind(start, end).all();
  return {
    raw: results,
    tx: results.flatMap(expandTx).map((t) => ({ ...t, cat: stripIcon(t.cat), kind: acc[t.account]?.kind })),
  };
}

// Laskutilin "laskut": kiinteät kategoriat + maksunsaajat, jotka esiintyivät
// laskutilillä kummassakin kahdessa edellisessä jaksossa.
async function recurringBillKeys(env, S, W) {
  const keys = [];
  let end = addDays(W.start, -1);
  for (let k = 0; k < 2; k++) {
    const pw = periodWindow(end, +S.salary_day || 27);
    const { results } = await env.DB.prepare(
      "SELECT payee FROM transactions WHERE account = ? AND date >= ? AND date <= ? AND type IN ('needs','wants') AND amount < 0"
    ).bind(S.bills_account, pw.start, pw.lastDay).all();
    keys.push(new Set(results.map((r) => payeeKey(r.payee))));
    end = addDays(pw.start, -1);
  }
  return new Set([...keys[0]].filter((k) => keys[1].has(k)));
}

function buckets(tx, S, acc, billKeys) {
  const income = sum(tx.filter((t) => t.type === "income"));
  const spendRows = tx.filter(isSpend);
  const isBill = (t) => t.account === S.bills_account &&
    (FIXED_CATS.includes(t.cat) || t.cat.startsWith("Asuminen") || billKeys.has(payeeKey(t.payee)));
  const split = S.account_model === "split";
  const bills = spendRows.filter((t) => split ? isBill(t) : false);
  const living = spendRows.filter((t) => split ? t.account === S.spend_account : acc[t.account]?.kind === "checking");
  const off = spendRows.filter((t) => !bills.includes(t) && !living.includes(t));
  const investedFromIncome = -sum(tx.filter((t) => t.cat === "Sijoittaminen" && t.kind === "checking"));
  const b = {
    income, investedFromIncome,
    bills: -sum(bills), living: -sum(living), off: -sum(off),
    billRows: bills, livingRows: living, offRows: off,
  };
  b.spend = b.bills + b.living + b.off;
  b.pohja = income - b.spend - investedFromIncome;
  return b;
}

export async function periodReport(env, today = todayHelsinki()) {
  const S = await loadSettings(env);
  const W = periodWindow(today, +S.salary_day || 27);
  const { results: accounts } = await env.DB.prepare("SELECT * FROM accounts ORDER BY sort").all();
  const acc = Object.fromEntries(accounts.map((a) => [a.key, a]));
  const { results: budgets } = await env.DB.prepare("SELECT * FROM budgets ORDER BY sort").all();
  const label = (k) => acc[k]?.label || k;

  const cur = await loadTx(env, W.start, W.end, acc);
  const B = buckets(cur.tx, S, acc, await recurringBillKeys(env, S, W));
  // Edellinen jakso vertailuun (täysi jakso)
  const PW = periodWindow(addDays(W.start, -1), +S.salary_day || 27);
  const prev = await loadTx(env, PW.start, PW.lastDay, acc);
  const PB = buckets(prev.tx, S, acc, await recurringBillKeys(env, S, PW));

  const P = await pockets(env, S, W, acc);
  const pocketBudget = P ? sum(P.list.filter((p) => p.role === "spend"), (p) => p.budget) : 0;

  // Ennuste: muuttuvien menojen tahti (elämiseen + ohi) × jäljellä olevat päivät
  const variable = -sum([...B.livingRows, ...B.offRows].filter((t) => t.amount < 0 && !FIXED_CATS.includes(t.cat)));
  const pace = variable / W.daysElapsed;
  const upcoming = (S.recurring?.manual || []).flatMap((m) => {
    const out = [];
    for (let d = addDays(W.end, 1); d <= W.lastDay; d = addDays(d, 1)) {
      if (+d.slice(8) === +m.day && (!m.start || d >= m.start)) out.push({ label: m.label, amount: +m.amount || 0, due: d });
    }
    return out;
  });
  const forecast = B.pohja - pace * W.daysLeft - sum(upcoming);

  // ── Teksti ──
  const r0 = (n) => { const v = Math.round(n); return (v < 0 ? "−" : "") + Math.abs(v).toLocaleString("fi-FI"); };
  const pad = (s, n) => String(s).padEnd(n);
  const num = (n, w = 7) => r0(n).padStart(w);
  const L = [];
  L.push(`JAKSO ${ddmm(W.start)}–${ddmm(W.lastDay)} · ${W.daysLeft ? `${W.daysLeft} pv jäljellä` : "päättyy tänään"}`);
  L.push(B.pohja >= 0 ? `POHJA KESTÄÄ +${r0(B.pohja)} €` : `POHJA VUOTAA −${r0(-B.pohja)} €`);
  if (W.daysLeft) L.push(`ennuste jakson lopussa ~${forecast >= 0 ? "+" : "−"}${r0(Math.abs(forecast))} €`);
  L.push("");
  L.push(`${pad("", 24)}${"nyt".padStart(7)}${"edell.".padStart(8)}`);
  L.push(`${pad("Palkka", 24)}${num(B.income)}${num(PB.income, 8)}`);
  L.push(`${pad("− Laskut", 24)}${num(B.bills)}${num(PB.bills, 8)}`);
  L.push(`${pad("− Sijoitukset tuloista", 24)}${num(B.investedFromIncome)}${num(PB.investedFromIncome, 8)}   tavoite ${r0(S.invest_target)}`);
  L.push(`${pad("− Elämiseen (taskut)", 24)}${num(B.living)}${num(PB.living, 8)}${pocketBudget ? `   budjetti ${r0(pocketBudget)}` : ""}`);
  L.push(`${pad("− Budjetin ohi", 24)}${num(B.off)}${num(PB.off, 8)}   ← vuoto, tavoite 0`);
  L.push(`${pad("= Pohja", 24)}${num(B.pohja)}${num(PB.pohja, 8)}`);

  if (P) {
    L.push("");
    L.push(`TASKUT · käytetty / budjetti · saldo (ote ${ddmm(P.through)})`);
    for (const p of P.list.filter((p) => p.role === "spend")) {
      const over = p.budget && p.spent > p.budget ? `  ⚠ yli ${r0(p.spent - p.budget)}` : "";
      const fills = p.fillsLeft ? `, tulossa ${p.fillsLeft}×${r0(p.fill)}` : "";
      L.push(`${pad(p.name, 20)}${num(p.spent, 5)} / ${pad(r0(p.budget), 4)} saldo ${r0(p.balance)}${fills}${over}`);
    }
    const mainSpent = B.living - sum(P.list, (p) => p.spent);
    if (Math.abs(mainSpent) >= 1) L.push(`${pad("Päätililtä", 20)}${num(mainSpent, 5)}`);
  }

  // Budjetin ohi eriteltynä tileittäin, isoimmat rivit
  if (B.off > 0.5 || B.offRows.length) {
    L.push("");
    L.push(`BUDJETIN OHI ${r0(B.off)} €`);
    const byAcc = {};
    for (const t of B.offRows) (byAcc[t.account] = byAcc[t.account] || []).push(t);
    for (const [k, rows] of Object.entries(byAcc).sort((a, b) => sum(a[1]) - sum(b[1]))) {
      const items = {};
      for (const t of rows) { const n = displayName(t, acc).slice(0, 24); items[n] = (items[n] || 0) - t.amount; }
      const top = Object.entries(items).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 5)
        .map(([n, v]) => `${n} ${v < 0 ? "−" : ""}${r0(Math.abs(v))}`);
      L.push(`${pad(label(k), 16)}${num(-sum(rows), 5)}  ${top.join(" · ")}`);
    }
  }

  // Palaute: deterministiset havainnot
  const fb = [];
  if (P) for (const p of P.list.filter((p) => p.role === "spend" && p.budget && p.spent > p.budget * 1.05)) {
    fb.push(`${p.name} ylitti budjetin ${r0(p.spent - p.budget)} € (${Math.round((p.spent / p.budget - 1) * 100)} %).`);
  }
  for (const b of budgets) {
    const cats = parseJson(b.cats, []);
    const rows = cur.tx.filter((t) => isSpend(t) && cats.includes(t.cat));
    const total = -sum(rows);
    const pk = P?.list.find((p) => p.name.toLowerCase() === String(b.id).toLowerCase());
    const limit = pk?.budget || b.limit_eur;
    if (total > limit + 1) {
      const outside = -sum(rows.filter((t) => !(pk && String(t.viesti || "").endsWith(` · ${pk.name}`))));
      fb.push(`${b.label} kaikkialta ${r0(total)} € vs raja ${r0(limit)} €${outside > 1 ? `; taskun ulkopuolelta ${r0(outside)} € (kortit, Perus)` : ""}.`);
    }
  }
  const offBig = B.offRows.filter((t) => t.amount <= -50).sort((a, b) => a.amount - b.amount).slice(0, 3);
  if (offBig.length) fb.push(`Varautumatta: ${offBig.map((t) => `${displayName(t, acc).slice(0, 22)} ${r0(-t.amount)}`).join(", ")} — jos toistuvat, ne kuuluvat taskuun tai ennakkovaraukseen.`);
  if (PB.income > 0 && B.living + B.off > PB.living + PB.off + 50) {
    fb.push(`Elämiseen + ohi ${r0(B.living + B.off)} € on ${r0(B.living + B.off - PB.living - PB.off)} € enemmän kuin edellisellä jaksolla.`);
  }
  if (B.investedFromIncome < S.invest_target - 1) fb.push(`Sijoitustavoitteesta jäi ${r0(S.invest_target - B.investedFromIncome)} €.`);
  if (fb.length) { L.push(""); L.push("PALAUTE"); L.push(...fb.map((f) => `• ${f}`)); }

  // Kategoriat yhdelle riville
  const byCat = {};
  for (const t of cur.tx.filter(isSpend)) byCat[t.cat] = (byCat[t.cat] || 0) - t.amount;
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6);
  L.push("");
  L.push(`KATEGORIAT  ${top.map(([c, v]) => `${c.replace(/ — .*/, "")} ${r0(v)}`).join(" · ")}`);

  // Tarkistettavat
  const flagged = cur.raw.filter((t) => t.type === "flag");
  if (flagged.length) L.push(`TARKISTA  ${flagged.length} kategorisoimatonta: ${flagged.slice(0, 3).map((t) => `${ddmm(t.date)} ${t.payee} ${eur(t.amount)}`).join("; ")}`);

  return {
    text: L.join("\n"), window: W, pockets: P,
    numbers: { ...Object.fromEntries(Object.entries(B).filter(([k]) => !k.endsWith("Rows"))), prev: { bills: PB.bills, living: PB.living, off: PB.off, pohja: PB.pohja }, forecast },
  };
}

// ── Taskut ───────────────────────────────────────────────────────────────────
const countWeekday = (fromISO, toISO, wd) => {
  let n = 0;
  for (let d = fromISO; d < toISO; d = addDays(d, 1)) if (D(d).getUTCDay() === wd) n++;
  return n;
};
async function pockets(env, S, W, acc) {
  const key = S.spend_account;
  if (S.account_model !== "split" || !acc[key]) return null;
  const today = W.end;
  const th = acc[key].last_import_through;
  const through = th && th < today ? th : today;
  const elapsed = Math.max(daysBetween(W.start, through) + 1, 1);
  const daysLeft = Math.max(daysBetween(through, W.endPay) - 1, 0);
  const { results: rows } = await env.DB.prepare(
    "SELECT date, viesti, amount, type, splits FROM transactions WHERE account = ? AND date > ?"
  ).bind(key, acc[key].opening_date).all();
  const nameOf = (t) => { const v = t.viesti || "", i = v.indexOf(" · "); return i > 0 ? v.slice(i + 3) : null; };
  const cfg = S.pockets || {};
  const names = new Set(Object.keys(cfg));
  rows.forEach((t) => { const n = nameOf(t); if (n) names.add(n); });
  const list = [...names].map((name) => {
    const c = cfg[name] || {};
    const pr = rows.filter((t) => nameOf(t) === name);
    const balance = sum(pr);
    const spent = -sum(pr.flatMap(expandTx).filter((t) => t.date >= W.start && t.date <= through && ["needs", "wants", "financing"].includes(t.type)));
    const role = c.cadence === "reserve" ? "reserve" : "spend";
    const cadence = c.cadence || "period", wd = c.weekday ?? 5, fill = +c.fill || 0;
    const week = cadence === "week";
    const fillsLeft = week ? countWeekday(addDays(through, 1), W.endPay, wd) : 0;
    const budget = fill * (week ? countWeekday(W.start, W.endPay, wd) : cadence === "period" ? 1 : 0);
    const upcoming = fill * fillsLeft;
    const pace = role === "spend" ? Math.max(spent, 0) / elapsed : 0;
    const forecast = balance + upcoming - pace * daysLeft;
    return { name, role, cadence, fill, balance, spent, budget, fillsLeft, upcoming, pace, forecast };
  }).sort((a, b) => (a.role === b.role ? a.forecast - b.forecast : a.role === "spend" ? -1 : 1));
  const total = (+acc[key].opening_balance || 0) + sum(rows);
  const inPockets = sum(list, (p) => p.balance);
  const reserved = sum(list, (p) => p.upcoming);
  const mainBal = total - inPockets;
  const mainFree = mainBal - reserved;
  const forecast = sum(list.filter((p) => p.role === "spend"), (p) => p.forecast) + mainFree;
  return { label: acc[key].label, through, daysLeft, list, total, mainBal, reserved, mainFree, forecast };
}
