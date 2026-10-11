// Shared helpers for the two server functions (chat + resume).
// The AI key lives ONLY on the server (Vercel "Environment Variable"), never in the browser.

const MODEL = process.env.STORYCV_MODEL || "claude-sonnet-5-5";
const API_KEY = process.env.ANTHROPIC_API_KEY || "";

// Safety limits so one visitor can't run up a big AI bill.
const LIMITS = {
  maxUserMessages: 30,     // answers per session
  maxCharsPerMessage: 1500,
  maxTotalChars: 40000,
};

function isDemo() {
  return !API_KEY;
}

function cleanMessages(raw) {
  if (!Array.isArray(raw)) throw new Error("Bad request");
  const msgs = raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, LIMITS.maxCharsPerMessage) }));
  const userCount = msgs.filter((m) => m.role === "user").length;
  const total = msgs.reduce((n, m) => n + m.content.length, 0);
  if (userCount > LIMITS.maxUserMessages || total > LIMITS.maxTotalChars) {
    const err = new Error("This chat is too long. Please create your resume now or start over.");
    err.status = 429;
    throw err;
  }
  return msgs;
}

// Prompt caching: the instructions and the chat so far are re-read at about a tenth of the
// normal price on the next turn, which cuts the AI bill for long chats.
function withCache(messages) {
  return messages.map((m, i) => (i === messages.length - 1
    ? { role: m.role, content: [{ type: "text", text: m.content, cache_control: { type: "ephemeral" } }] }
    : m));
}

// With "tool", the AI must answer by filling in a fixed form (a JSON shape we define),
// so it can never reply with loose text, notes to itself, or broken JSON.
async function callClaude({ system, messages, maxTokens, tool }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL, max_tokens: maxTokens,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: withCache(messages),
      ...(tool ? { tools: [tool], tool_choice: { type: "tool", name: tool.name } } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Claude API error", res.status, text);
    const err = new Error("The AI is busy right now. Please try again in a moment.");
    err.status = 502;
    throw err;
  }
  const data = await res.json();
  if (tool) {
    const used = (data.content || []).find((b) => b.type === "tool_use" && b.input && typeof b.input === "object");
    if (used) return used.input;
  }
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return tool ? parseJson(text) : text;
}

// Pull the first {...} JSON object out of the AI's reply.
function parseJson(text) {
  text = String(text || "");
  let found = null;
  for (let i = text.indexOf("{"); i !== -1; i = text.indexOf("{", i + 1)) {
    let depth = 0, inStr = false, esc = false;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) { try { found = JSON.parse(text.slice(i, j + 1)); } catch {} i = j; break; }
    }
  }
  return found;
}

// House style: no em/en dashes anywhere in what users see.
function noDashes(v) {
  if (typeof v === "string") return v.replace(/\s*[—–]\s*(?=\d)/g, "-").replace(/\s*—\s*/g, ", ").replace(/\s*–\s*/g, "-");
  if (Array.isArray(v)) return v.map(noDashes);
  if (v && typeof v === "object") { const o = {}; for (const k in v) o[k] = noDashes(v[k]); return o; }
  return v;
}

// Error messages in Bahasa (the site's main language). Keys are the English messages.
const ERR_ID = {
  "Use POST": "Gunakan POST",
  "Use GET": "Gunakan GET",
  "Bad request": "Permintaan tidak valid",
  "Something went wrong": "Waduh, ada yang error. Coba lagi ya.",
  "This chat is too long. Please create your resume now or start over.": "Obrolannya udah panjang banget. Bikin CV-nya sekarang, atau mulai dari awal ya.",
  "The AI is busy right now. Please try again in a moment.": "AI-nya lagi sibuk. Coba lagi sebentar ya.",
  "Tell your buddy a bit more about yourself first.": "Ceritain sedikit lagi soal kamu ke buddy-mu dulu ya.",
  "Couldn't build the resume. Please try again.": "CV-nya gagal dibuat. Coba lagi ya.",
  "Accounts aren't switched on yet. Please try again later.": "Fitur akun belum aktif. Coba lagi nanti ya.",
  "Please log in first.": "Masuk dulu ya.",
  "Your session has ended. Please log in again.": "Sesi kamu udah habis. Masuk lagi ya.",
  "Please log in again.": "Masuk lagi ya.",
  "Please confirm your email first (check your inbox).": "Konfirmasi email kamu dulu ya (cek kotak masuk).",
  "Couldn't check your usage. Please try again.": "Nggak bisa ngecek pemakaianmu. Coba lagi ya.",
  "You've reached today's CV limit. Please try again tomorrow.": "Jatah bikin CV hari ini udah habis. Coba lagi besok ya.",
  "You've reached today's chat limit. Come back tomorrow!": "Jatah ngobrol hari ini udah habis. Balik lagi besok ya!",
  "Couldn't save your CV. Please try again.": "CV kamu gagal disimpan. Coba lagi ya.",
  "CV not found.": "CV-nya nggak ketemu.",
  "Payment isn't available yet.": "Pembayaran belum tersedia.",
  "Please agree to the privacy policy first.": "Setujui kebijakan privasi dulu ya.",
  "Couldn't delete your account. Please try again.": "Akun kamu gagal dihapus. Coba lagi ya.",
  "Use GET or DELETE": "Gunakan GET atau DELETE",
};

// Errors we wrote ourselves are safe to show; anything unexpected gets a plain message (no internal details).
function fail(res, e) {
  return send(res, e.status || 500, { error: e.status ? e.message : "Something went wrong" });
}

function send(res, status, body) {
  if (res.lang !== "en" && body && typeof body.error === "string" && ERR_ID[body.error]) body = { ...body, error: ERR_ID[body.error] };
  body = noDashes(body);
  res.status(status).setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

module.exports = { isDemo, cleanMessages, callClaude, parseJson, send, fail };
