// The user's own data rights (UU PDP):
// GET    /api/account  download everything we keep about you (JSON file)
// DELETE /api/account  delete your account and all your data, right away
const { send, fail } = require("./_shared");
const { requireUser, keyHeaders, fail: makeErr, URL_ } = require("./_auth");
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function rows(path) {
  const r = await fetch(URL_ + "/rest/v1/" + path, { headers: keyHeaders(SERVICE) });
  if (!r.ok) { console.error("export failed", r.status, await r.text()); throw makeErr(500, "Something went wrong"); }
  return r.json();
}

module.exports = async (req, res) => {
  res.lang = (req.headers || {})["x-lang"] === "en" ? "en" : "id";
  try {
    const user = await requireUser(req, null);

    if (req.method === "GET") {
      const [cvs, usage] = await Promise.all([
        rows(`cvs?user_id=eq.${user.id}&select=*&order=created_at.asc`),
        rows(`chat_usage?user_id=eq.${user.id}&select=day,messages,resumes&order=day.asc`),
      ]);
      res.setHeader("content-disposition", 'attachment; filename="ceritain-data-saya.json"');
      return send(res, 200, {
        exported_at: new Date().toISOString(),
        account: { id: user.id, email: user.email, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at, consent: user.user_metadata || {} },
        // All personal data you gave us is included (profile + your chat). For an unpaid CV the
        // AI-written text unlocks after payment, so it's left out here (your own words are all in "messages").
        cvs: cvs.map(({ user_id, ...cv }) => (cv.paid ? cv : { ...cv, resume: null, note: "Unpaid CV: the AI-written text unlocks after payment." })),
        daily_usage: usage,
      });
    }

    if (req.method === "DELETE") {
      // Deleting the login account also deletes its CVs and usage counts (the database links them with "on delete cascade").
      const r = await fetch(URL_ + "/auth/v1/admin/users/" + user.id, { method: "DELETE", headers: keyHeaders(SERVICE) });
      if (!r.ok) { console.error("delete user failed", r.status, await r.text()); throw makeErr(500, "Couldn't delete your account. Please try again."); }
      return send(res, 200, { deleted: true });
    }

    return send(res, 405, { error: "Use GET or DELETE" });
  } catch (e) {
    return fail(res, e);
  }
};
