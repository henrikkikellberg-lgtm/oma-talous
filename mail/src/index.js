// oma-talous-mail: tiliote@fuseapt.com -> oma-talous-api /import/csv
//  - OP:n PDF-tiliote: luetaan, täsmäytetään saldoon, muunnetaan OP-CSV:ksi
//  - Revolutin / Finnairin CSV: välitetään sellaisenaan
// Tuplien karsinta ja luokittelu tehdään API:ssa, kuten sovelluksen CSV-tuonnissa.
import PostalMime from "postal-mime";
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";
import { parseOpPdf, toOpCsv } from "./op-pdf.js";

// OP-tilien IBAN -> oma-talous accounts.key. Lisää/korvaa settings-taulun
// avaimella `import_ibans` (JSON-objekti), ei vaadi deployta.
const DEFAULT_IBANS = {
  FI3550680620097574: "Perus",
  FI0250680620258218: "Lipas",
  FI5150682350036608: "Saasto",
};

const fmt = (n) => n.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function ibanMap(env) {
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'import_ibans'").first();
    return { ...DEFAULT_IBANS, ...(row ? JSON.parse(row.value) : {}) };
  } catch {
    return DEFAULT_IBANS;
  }
}

async function importCsv(env, csv, filename, account) {
  const res = await env.API.fetch("https://oma-talous-api/import/csv", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.APP_SECRET}` },
    body: JSON.stringify({ csv, filename, account }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `API ${res.status}`);
  return body; // { added, total, skippedDuplicates }
}

async function handleAttachment(env, att, ibans) {
  const name = att.filename || "liite";
  const isPdf = att.mimeType === "application/pdf" || /\.pdf$/i.test(name);
  const isCsv = /csv/i.test(att.mimeType || "") || /\.csv$/i.test(name);

  if (isPdf) {
    const st = await parseOpPdf(att.content);
    if (!st.txs.length) return `✗ ${name}: ei tunnistettu OP:n tiliotteeksi`;
    const account = ibans[st.iban];
    if (!account) return `✗ ${name}: tuntematon tili ${st.iban} – lisää se settings.import_ibans-avaimeen`;
    if (!st.reconciled) {
      return `✗ ${name}: saldot eivät täsmää (alku ${st.opening}, tapahtumat ${st.sum}, loppu ${st.closing}) – ei tuotu`;
    }
    const r = await importCsv(env, toOpCsv(st.txs), name, account);
    return `✓ ${name} → ${account}: ${r.added} uutta / ${r.total} riviä (tuplia ${r.skippedDuplicates}); saldo ${fmt(st.closing)} € täsmää`;
  }

  if (isCsv) {
    const csv = new TextDecoder("utf-8").decode(att.content).replace(/^﻿/, "");
    const isRevolut = csv.includes("Revolut") || csv.includes("Tapahtumaote") || csv.split("\n")[0].includes("Aloituspäivä");
    const isFinnair = csv.split("\n")[0].includes("Maksupäivä");
    if (!isRevolut && !isFinnair) return `✗ ${name}: tuntematon CSV (vain Revolut/Finnair; OP:lta lähetä PDF)`;
    const r = await importCsv(env, csv, name, null);
    return `✓ ${name} → ${isFinnair ? "Finnair" : "Revolut"}: ${r.added} uutta / ${r.total} riviä (tuplia ${r.skippedDuplicates})`;
  }

  return `– ${name}: ohitettu (${att.mimeType || "tuntematon tyyppi"})`;
}

function authFailed(message) {
  const h = [message.headers.get("authentication-results"), message.headers.get("arc-authentication-results")]
    .filter(Boolean).join(" ").toLowerCase();
  return /dmarc=fail/.test(h) || (/spf=fail/.test(h) && /dkim=fail/.test(h));
}

async function reply(env, message, subject, lines) {
  try {
    const msg = createMimeMessage();
    msg.setSender({ name: "Oma-talous", addr: env.MAIL_FROM });
    msg.setRecipient(message.from);
    msg.setSubject(`Re: ${subject || "tiliote"}`);
    const mid = message.headers.get("Message-ID");
    if (mid) msg.setHeader("In-Reply-To", mid);
    msg.addMessage({ contentType: "text/plain", data: lines.join("\n") });
    await message.reply(new EmailMessage(env.MAIL_FROM, message.from, msg.asRaw()));
  } catch (e) {
    console.log("reply failed", e.message);
  }
}

export default {
  async email(message, env) {
    const allowed = env.ALLOWED_SENDERS.split(",").map((s) => s.trim().toLowerCase());
    if (!allowed.includes(message.from.toLowerCase()) || authFailed(message)) {
      console.log("rejected", message.from);
      message.setReject("Sender not allowed");
      return;
    }
    const email = await PostalMime.parse(message.raw);
    const atts = (email.attachments || []).filter((a) => a.content && a.content.byteLength);
    const ibans = await ibanMap(env);
    const lines = [];
    for (const att of atts) {
      try {
        lines.push(await handleAttachment(env, att, ibans));
      } catch (e) {
        lines.push(`✗ ${att.filename}: virhe – ${e.message}`);
      }
    }
    if (!lines.length) lines.push("Viestissä ei ollut liitteitä.");
    console.log(lines.join(" | "));
    await reply(env, message, email.subject, lines);
  },
};
