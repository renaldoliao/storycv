// Login check + daily limits for the AI chat.
// Accounts live in Supabase (free). Set these in Vercel → Settings → Environment Variables:
//   SUPABASE_URL, SUPABASE_ANON_KEY (the "anon"/"publishable" key), SUPABASE_SERVICE_ROLE_KEY (the "service_role"/"secret" key)
// Optional: DAILY_MESSAGE_LIMIT (default 80), DAILY_RESUME_LIMIT (default 5)

const URL_ = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const LIMITS = {
  message: parseInt(process.env.DAILY_MESSAGE_LIMIT, 10) || 80,
  resume: parseInt(process.env.DAILY_RESUME_LIMIT, 10) || 5,
};

function authConfigured() {
  return !!(URL_ && ANON && SERVICE);
}

function fail(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// Older Supabase keys are JWTs ("eyJ..."); newer ones ("sb_...") go only in the apikey header.
function keyHeaders(key) {
  const h = { apikey: key };
  if (key.startsWith("eyJ")) h.Authorization = "Bearer " + key;
  return h;
}

// Checks the visitor is logged in with a confirmed email, then counts this use.
// kind: "message" (one chat reply) or "resume" (one CV write-up).
async function requireUser(req, kind) {
  if (!authConfigured()) throw fail(503, "Accounts aren't switched on yet. Please try again later.");

  const header = req.headers.authorization || req.headers.Authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw fail(401, "Please log in first.");

  const r = await fetch(URL_ + "/auth/v1/user", { headers: { apikey: ANON, Authorization: "Bearer " + token } });
  if (!r.ok) throw fail(401, "Your session has ended. Please log in again.");
  const user = await r.json();
  if (!user || !user.id) throw fail(401, "Please log in again.");
  if (!user.email_confirmed_at && !user.confirmed_at) throw fail(403, "Please confirm your email first (check your inbox).");

  const u = await fetch(URL_ + "/rest/v1/rpc/bump_usage", {
    method: "POST",
    headers: { ...keyHeaders(SERVICE), "content-type": "application/json" },
    body: JSON.stringify({ p_user: user.id, p_kind: kind }),
  });
  if (!u.ok) {
    console.error("bump_usage failed", u.status, await u.text());
    throw fail(500, "Couldn't check your usage. Please try again.");
  }
  const rows = await u.json();
  const row = Array.isArray(rows) ? rows[0] : rows;
  const used = kind === "resume" ? row.resumes : row.messages;
  if (used > LIMITS[kind]) {
    throw fail(429, kind === "resume"
      ? "You've reached today's CV limit. Please try again tomorrow."
      : "You've reached today's chat limit. Come back tomorrow!");
  }
  return user;
}

module.exports = { authConfigured, requireUser, URL_, ANON };
