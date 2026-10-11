// POST /api/pay { cvId }  unlocks a CV.
// TEST MODE: payment isn't connected yet, so this marks the CV as paid straight away.
// Before charging real money, set PAYMENT_TEST_MODE=off in Vercel and connect a real payment
// provider whose confirmation (sent server to server) is the only thing that marks a CV as paid.
const { send, fail } = require("./_shared");
const { requireUser } = require("./_auth");
const { getCv, updateCv, view } = require("./_db");

module.exports = async (req, res) => {
  res.lang = (req.headers || {})["x-lang"] === "en" ? "en" : "id";
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });
  try {
    const user = await requireUser(req, null);
    const cv = await getCv(user.id, (req.body || {}).cvId);
    if (!cv) return send(res, 404, { error: "CV not found." });
    if (cv.paid) return send(res, 200, view(cv));
    if (String(process.env.PAYMENT_TEST_MODE || "on").toLowerCase() === "off") return send(res, 403, { error: "Payment isn't available yet." });
    const done = await updateCv(user.id, cv.id, { paid: true, paid_at: new Date().toISOString(), payment_ref: "TEST" });
    return send(res, 200, view(done));
  } catch (e) {
    return fail(res, e);
  }
};
