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

// ── Raportti ─────────────────────────────────────────────────────────────────
export async function periodReport(env, today = todayHelsinki()) {
  const S = await loadSettings(env);
  const W = periodWindow(today, +S.salary_day || 27);
  const { results: accounts } = await env.DB.prepare("SELECT * FROM accounts ORDER BY sort").all();
  const acc = Object.fromEntries(accounts.map((a) => [a.key, a]));
  const { results: raw } = await env.DB.prepare(
    "SELECT id,date,account,payee,selitys,viesti,amount,cat,type,splits FROM transactions WHERE date >= ? AND date <= ? AND coalesce(account,'') <> 'Vuokra'"
  ).bind(W.start, W.end).all();
  const { results: budgets } = await env.DB.prepare("SELECT * FROM budgets ORDER BY sort").all();

  const tx = raw.flatMap(expandTx).map((t) => ({ ...t, cat: stripIcon(t.cat), kind: acc[t.account]?.kind }));
  const of = (type) => tx.filter((t) => t.type === type);

  // Tulot ja kulutus (netto: palautukset samalla tyypillä vähentävät)
  const income = sum(of("income"));
  const needs = -sum(of("needs"));
  const wants = -sum(of("wants"));
  const spend = needs + wants;
  const kept = income - spend;

  // Sijoitukset: kategoria ratkaisee, tyypistä riippumatta (wealthChange)
  const inv = tx.filter((t) => t.cat === "Sijoittaminen");
  const invested = -sum(inv);
  const investedFromIncome = -sum(inv.filter((t) => t.kind === "checking"));

  // Saldomuutokset tilityypeittäin (avaus + tapahtumat, kuten computeBalances)
  const balAt = async (key, isoDate) => {
    const a = acc[key];
    const r = await env.DB.prepare(
      "SELECT coalesce(sum(amount),0) s FROM transactions WHERE account = ? AND date > ? AND date <= ?"
    ).bind(key, a.opening_date, isoDate).first();
    return a.opening_balance + (r?.s || 0);
  };
  const delta = {};
  for (const a of accounts.filter((a) => !["closed", "rental"].includes(a.kind))) {
    const d = (await balAt(a.key, W.end)) - (await balAt(a.key, addDays(W.start, -1)));
    delta[a.kind] = (delta[a.kind] || 0) + d;
    a._delta = d;
    a._now = await balAt(a.key, W.end);
  }
  const creditDelta = delta.credit || 0; // + = velka pieneni

  // Palkan ulkopuoliset sisäänvirrat: käteistalletukset (splitattu osa mukaan)
  // Vain neutraali osa: splitattu takaisinmaksu (esim. Teijan 150 €) on jo netotettu kulutukseen.
  const cash = raw.filter((t) => t.amount > 0 && /TALLETUSAUTOM|Käteistalletus/i.test(`${t.selitys} ${t.viesti}`));
  const cashSum = sum(cash.flatMap(expandTx).filter((t) => t.type === "neutral"));
  const fromSavingsInv = invested - investedFromIncome; // säästötilin kautta kulkeneet

  // Kulutus tileittäin
  const byAcc = {};
  for (const t of tx.filter((t) => t.type === "needs" || t.type === "wants")) {
    const k = t.account || "?";
    byAcc[k] = byAcc[k] || { needs: 0, wants: 0 };
    byAcc[k][t.type] -= t.amount;
  }

  // Kategoriat top 8
  const byCat = {};
  for (const t of tx.filter((t) => t.type === "needs" || t.type === "wants")) byCat[t.cat] = (byCat[t.cat] || 0) - t.amount;
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Budjetit
  const budgetLines = budgets.map((b) => {
    const cats = parseJson(b.cats, []);
    const used = -sum(tx.filter((t) => cats.includes(t.cat) && (t.type === "needs" || t.type === "wants")));
    const left = b.limit_eur - used;
    const perDay = W.daysLeft > 0 ? left / W.daysLeft : left;
    return `${b.label}: ${eur(used)} / ${eur(b.limit_eur)} → jäljellä ${sgn(left)}${W.daysLeft > 0 ? ` (${eur(perDay)}/pv)` : ""}`;
  });

  // Taskut (Revolut · <tasku>)
  const pocketLines = Object.entries(S.pockets || {}).map(([name, p]) => {
    const used = -sum(tx.filter((t) => (t.type === "needs" || t.type === "wants") && String(t.viesti || "").startsWith(`Revolut · ${name}`)));
    const fill = p.cadence === "week" ? (+p.fill || 0) * W.periodLen / 7 : (+p.fill || 0);
    return `${name}: ${eur(used)} / ~${eur(fill)}${p.cadence === "week" ? " (viikkotäyttö)" : ""}`;
  });

  // Poikkeamat
  const flags = [];
  const lineOf = (t) => `${ddmm(t.date)} ${t.account} ${(t.selitys && t.kind === "credit" ? t.selitys : t.payee) || t.selitys} ${eur(-t.amount)}`;
  const spendRows = raw.filter((t) => t.amount < 0).flatMap(expandTx).filter((t) => t.type === "needs" || t.type === "wants");
  const onSavings = spendRows.filter((t) => acc[t.account]?.kind === "savings");
  if (onSavings.length) flags.push(`Kulutusta säästötileiltä ${eur(-sum(onSavings))}: ${onSavings.map(lineOf).join("; ")}`);
  const onHeld = spendRows.filter((t) => acc[t.account]?.on_hold && !/korko|tilinhoito/i.test(`${t.cat} ${t.payee}`));
  if (onHeld.length) flags.push(`Ostoja holdissa olevalla kortilla ${eur(-sum(onHeld))}: ${onHeld.map(lineOf).join("; ")}`);
  if (S.account_model === "split") {
    const onBills = spendRows.filter((t) => t.account === S.bills_account && t.type === "wants");
    if (onBills.length) flags.push(`Harkinnanvaraista laskutililtä (${S.bills_account}) ${eur(-sum(onBills))}, ${onBills.length} riviä`);
  }
  const flagged = raw.filter((t) => t.type === "flag");
  if (flagged.length) flags.push(`Tarkistamatta ${flagged.length} riviä: ${flagged.slice(0, 5).map((t) => `${ddmm(t.date)} ${t.payee} ${eur(t.amount)}`).join("; ")}`);

  // Ennuste: muuttuvien menojen tahti × jäljellä olevat päivät + käsin lisätyt tulevat erät
  const variable = -sum(tx.filter((t) => (t.type === "needs" || t.type === "wants") && !FIXED_CATS.includes(t.cat) && !t.cat.startsWith("Asuminen") && t.amount < 0));
  const pace = variable / W.daysElapsed;
  const upcoming = (S.recurring?.manual || []).flatMap((m) => {
    const day = +m.day; if (!day) return [];
    const out = [];
    for (let d = addDays(W.end, 1); d <= W.lastDay; d = addDays(d, 1)) {
      if (+d.slice(8) === day && (!m.start || d >= m.start)) out.push({ label: m.label, amount: +m.amount || 0, due: d });
    }
    return out;
  });
  const upcomingSum = sum(upcoming);
  const forecastKept = kept - pace * W.daysLeft - upcomingSum;

  // ── Teksti ──
  const L = [];
  L.push(`PALKKAJAKSO ${ddmm(W.start)}–${ddmm(W.lastDay)} · päivä ${W.daysElapsed}/${W.periodLen}, jäljellä ${W.daysLeft} pv`);
  L.push("");
  L.push("YHTEENVETO");
  L.push(`Tulot             ${eur(income)}`);
  L.push(`Kulutus           ${eur(spend)}  (välttämätön ${eur(needs)} · harkinnanv. ${eur(wants)})`);
  L.push(`Tuloista jäi      ${sgn(kept)}${income > 0 ? `  (${Math.round(kept / income * 100)} %)` : ""}`);
  L.push(`Sijoitettu        ${eur(invested)}  (tuloista ${eur(investedFromIncome)} / tavoite ${eur(S.invest_target)}${Math.abs(fromSavingsInv) > 0.005 ? `; säästöjen kautta ${sgn(fromSavingsInv)}` : ""})`);
  L.push(`Luottovelka       ${creditDelta >= 0 ? "pieneni" : "kasvoi"} ${eur(Math.abs(creditDelta))}`);
  const net = kept - invested - creditDelta;
  L.push(`Netto             ${sgn(net)}  (tuloista jäi − sijoitukset − velan nettolyhennys)`);
  if (cashSum) L.push(`Käteistalletukset ${eur(cashSum)}  (palkan ulkopuolista rahaa, ei mukana netossa)`);
  L.push("");
  L.push("TILIT (muutos jaksolla → saldo)");
  for (const a of accounts.filter((a) => a._delta !== undefined)) L.push(`${a.label}: ${sgn(a._delta)} → ${eur(a._now)}${a.on_hold ? " (hold)" : ""}`);
  L.push("");
  L.push("KULUTUS TILEITTÄIN (välttämätön / harkinnanv.)");
  for (const [k, v] of Object.entries(byAcc).sort((a, b) => (b[1].needs + b[1].wants) - (a[1].needs + a[1].wants))) {
    L.push(`${acc[k]?.label || k}: ${eur(v.needs)} / ${eur(v.wants)}`);
  }
  L.push("");
  L.push("KATEGORIAT (top 8)");
  for (const [c, v] of topCats) L.push(`${c}: ${eur(v)}`);
  if (budgetLines.length) { L.push(""); L.push("BUDJETIT"); L.push(...budgetLines); }
  if (pocketLines.length) { L.push(""); L.push("TASKUT (käytetty / täyttö jaksolle)"); L.push(...pocketLines); }
  L.push("");
  L.push("POIKKEAMAT");
  L.push(...(flags.length ? flags.map((f, i) => `${i + 1}. ${f}`) : ["– ei poikkeamia"]));
  L.push("");
  L.push("ENNUSTE JAKSON LOPPUUN (karkea)");
  L.push(`Muuttuvat menot ${eur(pace)}/pv × ${W.daysLeft} pv = ${eur(pace * W.daysLeft)}`);
  if (upcoming.length) L.push(`Tulossa: ${upcoming.map((u) => `${u.label} ${eur(u.amount)} ${ddmm(u.due)}`).join(", ")}`);
  L.push(`Tuloista jää jakson lopussa ~${sgn(forecastKept)}`);
  return { text: L.join("\n"), window: W, numbers: { income, needs, wants, kept, invested, investedFromIncome, creditDelta, cashSum, forecastKept } };
}
