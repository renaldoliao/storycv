// GET /api/cv?id=...  one saved CV of the logged-in user
// GET /api/cv         the user's most recent CV (to bring it back on a new phone)
// Unpaid CVs come back as a scrambled preview; the full text only after payment.
const { send, fail } = require("./_shared");
const { requireUser, authConfigured } = require("./_auth");
const { getCv, latestCv, view } = require("./_db");

module.exports = async (req, res) => {
  res.lang = (req.headers || {})["x-lang"] === "en" ? "en" : "id";
  if (req.method !== "GET") return send(res, 405, { error: "Use GET" });
  try {
    if (!authConfigured()) return send(res, 200, { cv: null });
    const user = await requireUser(req, null);
    const id = (req.query || {}).id;
    const cv = id ? await getCv(user.id, id) : await latestCv(user.id);
    if (id && !cv) return send(res, 404, { error: "CV not found." });
    return send(res, 200, { cv: cv ? view(cv) : null });
  } catch (e) {
    return fail(res, e);
  }
};
