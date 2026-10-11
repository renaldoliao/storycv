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

async function callClaude({ system, messages, maxTokens }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Claude API error", res.status, text);
    const err = new Error("The AI is busy right now. Please try again in a moment.");
    err.status = 502;
    throw err;
  }
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
}

// Pull the first {...} JSON object out of the AI's reply.
function parseJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
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
};

function send(res, status, body) {
  if (res.lang !== "en" && body && typeof body.error === "string" && ERR_ID[body.error]) body = { ...body, error: ERR_ID[body.error] };
  body = noDashes(body);
  res.status(status).setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

module.exports = { isDemo, cleanMessages, callClaude, parseJson, send };
