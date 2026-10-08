// POST /api/resume — turns the whole chat into a structured resume.
// Body: { messages: [...], profile: { name, nickname, target, city, email, phone, linkedin, lang } }
// Returns: { resume: {...}, demo }

const { isDemo, cleanMessages, callClaude, parseJson, send } = require("./_shared");
const { cleanProfile } = require("./_buddies");

function systemPrompt(language) {
  return `You are an expert resume writer. You will receive an interview transcript between a career coach (assistant) and a job seeker (user).
Turn the user's stories into a sellable, ATS-friendly resume written in ${language}.

Writing rules:
- Start every bullet with a strong action verb (Led, Cut, Grew, Built, Trained...).
- Put results and numbers first where possible: "Cut response time from 24h to 2h (–92%) by ...".
- 2–5 bullets per job, each under 25 words. Most impressive first.
- Summary: 2–3 sentences, third person without pronouns, highlighting years of experience, field and best result.
- Headline: short job title they're targeting or currently hold.
- Use only facts the user actually said. NEVER invent companies, dates, numbers or skills. Leave a field as "" if unknown.
- Turn casual skill mentions into standard names (e.g. "excel" -> "Microsoft Excel").
- Order jobs and education newest first.

Respond ONLY with this JSON (no other text):
{"name":"","headline":"","contact":{"city":"","email":"","phone":"","linkedin":""},"summary":"","experience":[{"role":"","company":"","location":"","start":"","end":"","bullets":[""]}],"education":[{"degree":"","school":"","year":"","notes":""}],"hard_skills":[""],"soft_skills":[""],"certifications":[""],"languages":[""]}`;
}

const DEMO_RESUME = {
  name: "Rina Pratama",
  headline: "Customer Service Lead",
  contact: { city: "Jakarta", email: "rina@example.com", phone: "", linkedin: "" },
  summary: "Customer service lead with 3 years in e-commerce, known for turning slow support into fast, calm service. Cut response time by 92% while coaching a team of 8.",
  experience: [{
    role: "Customer Service Lead", company: "PT Sinar Niaga", location: "Jakarta", start: "2023", end: "Present",
    bullets: [
      "Cut average customer response time from 24 hours to 2 hours (–92%) by introducing reply templates and a redesigned shift schedule",
      "Led and coached a team of 8 customer service agents",
      "Trained every new hire, shortening onboarding for the support team",
    ],
  }],
  education: [{ degree: "Bachelor of Business Management", school: "Universitas Nusa Bangsa", year: "2019", notes: "" }],
  hard_skills: ["Zendesk", "Microsoft Excel", "Google Sheets", "Canva"],
  soft_skills: ["Conflict resolution", "Coaching & onboarding", "Composure under pressure"],
  certifications: [],
  languages: ["Bahasa Indonesia (native)", "English (professional)"],
};

// Name and contact come from the form the user filled in, not from the AI.
function withProfile(r, p) {
  r.name = p.name || r.name || "";
  r.contact = { city: p.city, email: p.email, phone: p.phone, linkedin: p.linkedin };
  if (!r.headline && p.target) r.headline = p.target;
  return r;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });
  try {
    const body = req.body || {};
    const messages = cleanMessages(body.messages || []);
    const profile = cleanProfile(body.profile);
    const language = profile.lang;

    if (messages.filter((m) => m.role === "user").length < 2) {
      return send(res, 400, { error: "Tell your buddy a bit more about yourself first." });
    }
    if (isDemo()) return send(res, 200, { resume: withProfile(JSON.parse(JSON.stringify(DEMO_RESUME)), profile), demo: true });

    const transcript = messages
      .map((m) => (m.role === "user" ? "USER: " : "COACH: ") + m.content)
      .join("\n\n");
    const text = await callClaude({
      system: systemPrompt(language),
      messages: [{ role: "user", content: (profile.target ? "Target job: " + profile.target + "\n\n" : "") + "Interview transcript:\n\n" + transcript }],
      maxTokens: 2500,
    });
    const resume = parseJson(text);
    if (!resume) return send(res, 502, { error: "Couldn't build the resume. Please try again." });
    return send(res, 200, { resume: withProfile(resume, profile) });
  } catch (e) {
    return send(res, e.status || 500, { error: e.message || "Something went wrong" });
  }
};
