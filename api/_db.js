// Saved CVs in Supabase. Only the server touches this table (with the secret key),
// so nobody can mark their own CV as paid from the browser.
const { URL_ } = require("./_auth");
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function headers(extra) {
  const h = { apikey: SERVICE, "content-type": "application/json", ...(extra || {}) };
  if (SERVICE.startsWith("eyJ")) h.Authorization = "Bearer " + SERVICE;
  return h;
}
const isId = (v) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

async function call(path, opts) {
  const r = await fetch(URL_ + "/rest/v1/" + path, opts);
  if (!r.ok) {
    console.error("db error", r.status, await r.text());
    const e = new Error("Couldn't save your CV. Please try again.");
    e.status = 500;
    throw e;
  }
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

// One CV that belongs to this user, or null
async function getCv(userId, id) {
  if (!isId(id)) return null;
  const rows = await call(`cvs?id=eq.${id}&user_id=eq.${userId}&select=*`, { headers: headers() });
  return rows && rows[0] ? rows[0] : null;
}
// The user's most recent CV, or null
async function latestCv(userId) {
  const rows = await call(`cvs?user_id=eq.${userId}&select=*&order=updated_at.desc&limit=1`, { headers: headers() });
  return rows && rows[0] ? rows[0] : null;
}
async function insertCv(row) {
  const rows = await call("cvs", { method: "POST", headers: headers({ Prefer: "return=representation" }), body: JSON.stringify(row) });
  return rows[0];
}
async function updateCv(userId, id, patch) {
  const rows = await call(`cvs?id=eq.${id}&user_id=eq.${userId}`, {
    method: "PATCH", headers: headers({ Prefer: "return=representation" }), body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  return rows && rows[0] ? rows[0] : null;
}

// Before paying, the browser only gets a look-alike: name, contact and summary are real,
// everything else is scrambled letters (it's shown blurred anyway), so the CV can't be copied for free.
function scramble(s) {
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  return String(s).replace(/[a-z]/g, () => pick("abcdefghijklmnopqrstuvwxyz")).replace(/[A-Z]/g, () => pick("ABCDEFGHIJKLMNOPQRSTUVWXYZ")).replace(/[0-9]/g, () => pick("0123456789"));
}
function deep(v) {
  if (typeof v === "string") return scramble(v);
  if (Array.isArray(v)) return v.map(deep);
  if (v && typeof v === "object") { const o = {}; for (const k in v) o[k] = deep(v[k]); return o; }
  return v;
}
function preview(resume) {
  if (!resume) return resume;
  const keep = { name: resume.name, contact: resume.contact, headline: resume.headline, summary: resume.summary };
  return { ...deep(resume), ...keep, locked: true };
}
// What the browser is allowed to see
function view(cv) {
  return { cvId: cv.id, paid: !!cv.paid, resume: cv.paid ? cv.resume : preview(cv.resume), profile: cv.profile, buddy: cv.buddy, messages: cv.messages || [] };
}

module.exports = { isId, getCv, latestCv, insertCv, updateCv, view };
