// Runs once a day (Vercel Cron, see vercel.json) to delete data we no longer need,
// as promised in the privacy policy:
//   - unpaid CVs (and their chats) not changed for 90 days
//   - daily usage counts older than 90 days
// Vercel calls this with the CRON_SECRET you set in Settings -> Environment Variables.
const { send, fail } = require("./_shared");
const { keyHeaders, authConfigured, URL_ } = require("./_auth");
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const DAYS = 90;

module.exports = async (req, res) => {
  try {
    const secret = process.env.CRON_SECRET || "";
    if (!secret || (req.headers || {}).authorization !== "Bearer " + secret) return send(res, 401, { error: "Not allowed" });
    if (!authConfigured()) return send(res, 200, { skipped: true });
    const cutoff = new Date(Date.now() - DAYS * 864e5);
    const del = async (path) => {
      const r = await fetch(URL_ + "/rest/v1/" + path, { method: "DELETE", headers: { ...keyHeaders(SERVICE), Prefer: "return=representation" } });
      if (!r.ok) throw new Error("cleanup failed " + r.status + " " + (await r.text()));
      return (await r.json()).length;
    };
    const cvs = await del(`cvs?paid=eq.false&updated_at=lt.${cutoff.toISOString()}`);
    const usage = await del(`chat_usage?day=lt.${cutoff.toISOString().slice(0, 10)}`);
    return send(res, 200, { deleted_unpaid_cvs: cvs, deleted_usage_rows: usage });
  } catch (e) {
    console.error(e);
    return fail(res, e);
  }
};
