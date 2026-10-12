// GET /api/cv?id=...  one saved CV of the logged-in user
// GET /api/cv         the user's most recent CV (to bring it back on a new phone)
// POST /api/cv { cvId, resume }  save the user's own edits to a PAID CV
// Unpaid CVs come back as a scrambled preview; the full text only after payment.
const { send, fail } = require("./_shared");
const { requireUser, authConfigured } = require("./_auth");
const { getCv, latestCv, updateCv, view } = require("./_db");

// Keep only text in the shapes we know, so edits can't add anything strange
const txt = (v, n = 400) => (typeof v === "string" ? v.replace(/[\u2013\u2014]/g, "-").trim().slice(0, n) : "");
const arr = (v, f, n = 30) => (Array.isArray(v) ? v.slice(0, n).map(f) : []);
function cleanResume(r, keep) {
  r = r || {};
  return {
    name: keep.name, contact: keep.contact, headline: keep.headline,
    summary: txt(r.summary, 800),
    experience: arr(r.experience, (j) => ({ company: txt(j.company), location: txt(j.location),
      roles: arr(j.roles, (ro) => ({ title: txt(ro.title), start: txt(ro.start, 30), end: txt(ro.end, 30),
        groups: arr(ro.groups, (g) => ({ label: txt(g.label), bullets: arr(g.bullets, (b) => ({ text: txt(b && b.text), sub: arr(b && b.sub, (x) => txt(x)).filter(Boolean) })).filter((b) => b.text) })) })) })),
    education: arr(r.education, (e) => ({ school: txt(e.school), location: txt(e.location), start: txt(e.start, 30), end: txt(e.end, 30), degree: txt(e.degree), activities: arr(e.activities, (x) => txt(x)).filter(Boolean) })),
    organizations: arr(r.organizations, (o) => ({ name: txt(o.name), role: txt(o.role), start: txt(o.start, 30), end: txt(o.end, 30), bullets: arr(o.bullets, (x) => txt(x)).filter(Boolean) })),
    skills: arr(r.skills, (x) => txt(x, 80)).filter(Boolean), soft_skills: arr(r.soft_skills, (x) => txt(x, 80)).filter(Boolean),
    languages: arr(r.languages, (x) => txt(x, 80)).filter(Boolean), certifications: arr(r.certifications, (x) => txt(x, 160)).filter(Boolean),
  };
}

module.exports = async (req, res) => {
  res.lang = (req.headers || {})["x-lang"] === "en" ? "en" : "id";
  try {
    if (req.method === "POST") {
      const user = await requireUser(req, null);
      const body = req.body || {};
      if (JSON.stringify(body.resume || {}).length > 60000) return send(res, 400, { error: "Bad request" });
      const cv = await getCv(user.id, body.cvId);
      if (!cv) return send(res, 404, { error: "CV not found." });
      if (!cv.paid) return send(res, 403, { error: "Unlock the CV first to edit it." });
      // Name and contact always come from the account's details, so a paid CV can't be turned into someone else's
      const old = cv.resume || {};
      const done = await updateCv(user.id, cv.id, { resume: cleanResume(body.resume, { name: old.name, contact: old.contact, headline: old.headline }) });
      return send(res, 200, view(done));
    }
    if (req.method !== "GET") return send(res, 405, { error: "Use GET" });
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
