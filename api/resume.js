// POST /api/resume: turns the whole chat into a structured resume.
// Body: { messages: [...], profile: { name, nickname, target, city, email, phone, linkedin, lang } }
// Returns: { resume: {...}, demo }

const { isDemo, cleanMessages, callClaude, send, fail } = require("./_shared");
const { cleanProfile } = require("./_buddies");
const { requireUser } = require("./_auth");
const { getCv, insertCv, updateCv, view } = require("./_db");

// The form the AI fills in for the CV
const str = { type: "string" }, strs = { type: "array", items: { type: "string" } };
const TOOL = {
  name: "write_cv",
  description: "Save the finished CV.",
  input_schema: {
    type: "object",
    properties: {
      summary: str,
      experience: { type: "array", items: { type: "object", properties: {
        company: str, location: str,
        roles: { type: "array", items: { type: "object", properties: {
          title: str, start: str, end: str,
          groups: { type: "array", items: { type: "object", properties: {
            label: str,
            bullets: { type: "array", items: { type: "object", properties: { text: str, sub: strs }, required: ["text"] } },
          }, required: ["label", "bullets"] } },
        }, required: ["title", "start", "end", "groups"] } },
      }, required: ["company", "location", "roles"] } },
      education: { type: "array", items: { type: "object", properties: {
        school: str, location: str, start: str, end: str, degree: str, activities: strs,
      }, required: ["school"] } },
      skills: strs, languages: strs, certifications: strs,
    },
    required: ["summary", "experience", "education", "skills", "languages", "certifications"],
  },
};

function systemPrompt(language) {
  const id = language !== "English";
  return `You are an expert CV writer. You will receive a casual chat between a career buddy (COACH) and a job seeker (USER).
Turn the user's stories into a clean, one-page, ATS-friendly CV written in ${language}.

STYLE (follow closely)
- Simple and scannable: work experience first, then education, then a short additional information section.
- Summary: leave it "" for most people. Only write one (1 to 2 short lines, no pronouns) when the user has under about 1 year of work experience or is switching careers, pointing them at their target job.
- Group roles under one company when they held several roles there (a promotion), newest role first.
- Bullets: start with a strong action verb, one line each (max about 20 words), no "I", no filler adjectives like "hardworking" or "passionate". Soft skills must show through results, never as a list.
- Put a number in every bullet where the user gave one: amounts, counts, percentages, time ("within 2 years"), before and after ("from 50 to 120 orders a day"). Never make numbers up.
- ${id ? "Use standard, professional Indonesian with simple words (this is a CV, no slang). Start bullets with me-/ber- verbs (Melayani, Mengelola, Meningkatkan, Melatih)." : "Past tense for finished work (Served, Trained, Cut). For duties still going on in the current job, the -ing form is fine (Supporting, Managing)."}
- The current or latest role gets the most bullets (3 to 6). Older roles get 2 to 3.
- When one big win has supporting details, put up to 3 short details in "sub" under it.
- Only if the latest role has 6 or more bullets that split naturally, group them with short labels in "groups" (for example ${id ? '"Tanggung jawab utama" and "Pencapaian"' : '"Key responsibilities" and "Key results"'}); otherwise use a single group with label "".
- Dates as "Mon YYYY" (${id ? "Jan, Feb, Mar, Apr, Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des; current job ends with 'Sekarang'" : "Jan to Dec; current job ends with 'Present'"}). Use just the year if the month is unknown, "" if unknown.
- Education: school, city, years, degree or major (for high school, e.g. ${id ? '"SMK, Tata Boga"' : '"Vocational High School, Culinary"'}). Activities (committees, organisations, competitions, events, projects) as short bullets.
- Additional information: technical skills (tools, machines, equipment, software, using standard names, e.g. "excel" to "Microsoft Excel"), languages with level, certifications (include driving licences like SIM C and trainings like K3).
- Order everything newest first.
- Privacy: never include religion, ethnicity, health, disability, marital or family status, age or date of birth, ID card or bank numbers, salary, political views or criminal records, even if the user mentioned them.
- Use ONLY facts the user said. NEVER invent companies, dates, numbers, cities or skills. Use "" or [] when unknown.
- Never use em dashes or en dashes. Use commas, periods or colons. A plain hyphen is only for date ranges.

Always reply in the required JSON format.`;
}

const DEMO_RESUME = {
  summary: "",
  experience: [
    { company: "Kopi Senja", location: "Jakarta", roles: [
      { title: "Head Barista", start: "Mar 2024", end: "Present", groups: [{ label: "", bullets: [
        { text: "Leading a bar team of 4 baristas across morning and evening shifts", sub: [] },
        { text: "Served 150+ customers a day during weekend peaks while keeping wait times under 5 minutes", sub: [] },
        { text: "Created 3 seasonal drinks that became bestsellers", sub: ["Palm sugar oat latte sold 900+ cups in its first month", "Reduced syrup waste by 30% by prepping in smaller batches"] },
        { text: "Trained 6 new baristas on espresso, milk texturing and opening routines", sub: [] },
      ] }] },
      { title: "Barista", start: "Jun 2022", end: "Feb 2024", groups: [{ label: "", bullets: [
        { text: "Promoted to Head Barista within 2 years", sub: [] },
        { text: "Handled the cash register and daily cash count with zero shortages", sub: [] },
      ] }] },
    ] },
    { company: "Indomaret", location: "Bekasi", roles: [
      { title: "Store Crew", start: "2021", end: "2022", groups: [{ label: "", bullets: [
        { text: "Served 200+ customers per shift at the cashier", sub: [] },
        { text: "Restocked and arranged 3 aisles every morning before opening", sub: [] },
      ] }] },
    ] },
  ],
  education: [{ school: "SMK Negeri 3", location: "Bekasi", start: "2018", end: "2021", degree: "Vocational High School, Culinary", activities: ["Event committee for the school's yearly food bazaar"] }],
  skills: ["Espresso machine", "Latte art", "Cash register (POS)", "Microsoft Excel"],
  languages: ["Bahasa Indonesia (native)", "English (basic)"],
  certifications: ["Driving licence C (SIM C)", "Basic Barista Training"],
};

const DEMO_RESUME_ID = {
  summary: "",
  experience: [
    { company: "Kopi Senja", location: "Jakarta", roles: [
      { title: "Head Barista", start: "Mar 2024", end: "Sekarang", groups: [{ label: "", bullets: [
        { text: "Memimpin tim bar berisi 4 barista untuk shift pagi dan malam", sub: [] },
        { text: "Melayani 150+ pelanggan per hari saat akhir pekan dengan waktu tunggu di bawah 5 menit", sub: [] },
        { text: "Menciptakan 3 menu musiman yang menjadi menu terlaris", sub: ["Oat latte gula aren terjual 900+ gelas di bulan pertama", "Mengurangi sisa sirup 30% dengan menyiapkan bahan dalam porsi lebih kecil"] },
        { text: "Melatih 6 barista baru dalam espresso, teknik susu, dan persiapan buka toko", sub: [] },
      ] }] },
      { title: "Barista", start: "Jun 2022", end: "Feb 2024", groups: [{ label: "", bullets: [
        { text: "Dipromosikan menjadi Head Barista dalam 2 tahun", sub: [] },
        { text: "Mengelola mesin kasir dan hitung kas harian tanpa selisih", sub: [] },
      ] }] },
    ] },
    { company: "Indomaret", location: "Bekasi", roles: [
      { title: "Store Crew", start: "2021", end: "2022", groups: [{ label: "", bullets: [
        { text: "Melayani 200+ pelanggan per shift di kasir", sub: [] },
        { text: "Menata dan mengisi ulang 3 lorong produk setiap pagi sebelum toko buka", sub: [] },
      ] }] },
    ] },
  ],
  education: [{ school: "SMK Negeri 3", location: "Bekasi", start: "2018", end: "2021", degree: "SMK, Tata Boga", activities: ["Panitia bazar makanan tahunan sekolah"] }],
  skills: ["Mesin espresso", "Latte art", "Mesin kasir (POS)", "Microsoft Excel"],
  languages: ["Bahasa Indonesia (penutur asli)", "Bahasa Inggris (dasar)"],
  certifications: ["SIM C", "Pelatihan Barista Dasar"],
};

// Name and contact come from the form the user filled in, not from the AI.
function withProfile(r, p) {
  r.name = p.name || r.name || "";
  r.contact = { city: p.city, email: p.email, phone: p.phone, linkedin: p.linkedin };
  r.headline = p.target || "";
  return r;
}

module.exports = async (req, res) => {
  res.lang = (req.headers || {})["x-lang"] === "en" ? "en" : "id";
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });
  try {
    const body = req.body || {};
    const messages = cleanMessages(body.messages || []);
    const profile = cleanProfile(body.profile);
    const language = profile.lang;

    if (messages.filter((m) => m.role === "user").length < 2) {
      return send(res, 400, { error: "Tell your buddy a bit more about yourself first." });
    }
    if (isDemo()) return send(res, 200, { resume: withProfile(JSON.parse(JSON.stringify(language === "English" ? DEMO_RESUME : DEMO_RESUME_ID)), profile), demo: true });

    const user = await requireUser(req, "resume");

    const transcript = messages
      .map((m) => (m.role === "user" ? "USER: " : "COACH: ") + m.content)
      .join("\n\n");
    const resume = await callClaude({
      system: systemPrompt(language),
      messages: [{ role: "user", content: (profile.target ? "Target job: " + profile.target + "\n\n" : "") + "Interview transcript:\n\n" + transcript }],
      maxTokens: 3000,
      tool: TOOL,
    });
    if (!resume || resume.plainText) return send(res, 502, { error: "Couldn't build the resume. Please try again." });
    withProfile(resume, profile);

    // Save it to the account. A rewrite of the same CV keeps its paid status,
    // but a different person's name always starts a new (unpaid) CV.
    const row = { buddy: String(body.buddy || "").slice(0, 10), profile, messages, resume };
    const old = await getCv(user.id, body.cvId);
    const cv = old && (old.profile || {}).name === profile.name
      ? await updateCv(user.id, old.id, row)
      : await insertCv({ ...row, user_id: user.id });
    return send(res, 200, view(cv));
  } catch (e) {
    return fail(res, e);
  }
};
