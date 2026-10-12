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
      organizations: { type: "array", items: { type: "object", properties: {
        name: str, role: str, start: str, end: str, bullets: strs,
      }, required: ["name", "role", "start", "end", "bullets"] } },
      skills: strs, soft_skills: strs, languages: strs, certifications: strs,
    },
    required: ["summary", "experience", "education", "organizations", "skills", "soft_skills", "languages", "certifications"],
  },
};

function systemPrompt(language) {
  const id = language !== "English";
  return `You are an expert CV writer. You will receive a casual chat between a career buddy (COACH) and a job seeker (USER).
Turn the user's stories into a clean, one-page, ATS-friendly CV written in ${language}.

GOAL: a well-structured CV that quickly shows experience and achievements, and is RELEVANT to the target job.

TARGET JOB (tailor everything to it when given)
- Within each job, put the bullets most relevant to the target job first.
- Use the normal words of the target job's field where they truthfully describe what the user did (this helps hiring software match keywords).
- In skills, list the most relevant ones first.
- Aim the profile summary at the target job. If it differs from their past jobs, connect their real experience to it (transferable skills).
- Put soft skills that match common job ad wording first when true (for example ${id ? '"Bertanggung jawab", "Mampu bekerja dalam tim", "Teliti", "Mampu bekerja di bawah tekanan"' : '"Responsible", "Team player", "Detail-oriented", "Works well under pressure"'}).
- Never claim experience or skills they didn't mention.

STYLE (follow closely)
- Simple and scannable, like a modern Indonesian CV for this level: short profile, work experience, education, organisation experience (if any), then additional information.
- Summary (profile, ${id ? '"Profil"' : '"Profile"'}): ALWAYS write one, 2 to 3 short sentences, no pronouns: who they are (role and years of experience, or school and major for fresh graduates), their strongest proof (a number or achievement they gave), and what they bring to the target job.
- Group roles under one company when they held several roles there (a promotion), newest role first.
- Each bullet shows action, what, and result or scale ("Melayani 150+ pelanggan per hari..."). Prefer achievements over plain duties.
- Bullets: start with a strong action verb, one line each (max about 20 words), no "I", no filler adjectives like "hardworking" or "passionate". Also weave how they work with people into the bullets where it fits (for example \"Trusted to handle complaints...\").
- Put a number in every bullet where the user gave one: amounts, counts, percentages, time ("within 2 years"), before and after ("from 50 to 120 orders a day"). Never make numbers up.
- ${id ? "Use standard, professional Indonesian with simple words (this is a CV, no slang). Start bullets with me-/ber- verbs (Melayani, Mengelola, Meningkatkan, Melatih)." : "Past tense for finished work (Served, Trained, Cut). For duties still going on in the current job, the -ing form is fine (Supporting, Managing)."}
- The current or latest role gets the most bullets (3 to 6). Older roles get 2 to 3.
- When one big win has supporting details, put up to 3 short details in "sub" under it.
- Only if the latest role has 6 or more bullets that split naturally, group them with short labels in "groups" (for example ${id ? '"Tanggung jawab utama" and "Pencapaian"' : '"Key responsibilities" and "Key results"'}); otherwise use a single group with label "".
- Dates as "Mon YYYY" (${id ? "Jan, Feb, Mar, Apr, Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des; current job ends with 'Sekarang'" : "Jan to Dec; current job ends with 'Present'"}). Use just the year if the month is unknown, "" if unknown.
- Experience also includes internships, PKL (Praktik Kerja Lapangan for SMK students), part-time, freelance and family business work. For fresh graduates these are the main experience.
- Education: the 1 or 2 highest levels only. School, city, years, degree or major (for high school, e.g. ${id ? '"SMK, Tata Boga"' : '"Vocational High School, Culinary"'}). Put academic achievements or competitions as short "activities" bullets.
- Organisations: OSIS, campus organisations, committees, clubs, volunteering or community groups, with role, years and 1 to 2 bullets. Leave [] if none.
- Additional information:
  - skills: technical skills (tools, machines, equipment, software, using standard names, e.g. "excel" to "Microsoft Excel"), most relevant first, max 8.
  - soft_skills: 3 to 4 short soft skills supported by what the user said, max 4.
  - languages with level.
  - certifications: name, issuer and year when known (e.g. ${id ? '"Pelatihan Barista Dasar, LSP Pariwisata (2023)"' : '"Basic Barista Training, LSP Pariwisata (2023)"'}), plus driving licences like SIM C.
- Order everything newest first.
- Personal data: only name, city, phone, email and LinkedIn (already added by the app). Never a full street address.
- Privacy: never include religion, ethnicity, health, disability, marital or family status, age or date of birth, ID card or bank numbers, salary, political views or criminal records, even if the user mentioned them.
- Use ONLY facts the user said. NEVER invent companies, dates, numbers, cities or skills. Use "" or [] when unknown.
- Never use em dashes or en dashes. Use commas, periods or colons. A plain hyphen is only for date ranges.

Always reply in the required JSON format.`;
}

const DEMO_RESUME = {
  summary: "Head Barista with 4 years of coffee bar experience, serving 150+ customers a day during weekend peaks. Promoted within 2 years and trusted to train new baristas. Ready to bring fast, consistent service to a growing coffee team.",
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
  education: [{ school: "SMK Negeri 3", location: "Bekasi", start: "2018", end: "2021", degree: "Vocational High School, Culinary", activities: [] }],
  organizations: [{ name: "OSIS SMK Negeri 3 Bekasi", role: "Event Division Member", start: "2019", end: "2020", bullets: ["Organised the school's yearly food bazaar with 30+ stands"] }],
  skills: ["Espresso machine", "Latte art", "Cash register (POS)", "Microsoft Excel"],
  soft_skills: ["Responsible", "Team player", "Works well under pressure", "Customer service"],
  languages: ["Bahasa Indonesia (native)", "English (basic)"],
  certifications: ["Basic Barista Training, LSP Pariwisata (2023)", "Driving licence C (SIM C)"],
};

const DEMO_RESUME_ID = {
  summary: "Head Barista dengan 4 tahun pengalaman di kedai kopi, melayani 150+ pelanggan per hari saat akhir pekan. Dipromosikan dalam 2 tahun dan dipercaya melatih barista baru. Siap menghadirkan pelayanan cepat dan konsisten untuk tim kopi yang sedang berkembang.",
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
  education: [{ school: "SMK Negeri 3", location: "Bekasi", start: "2018", end: "2021", degree: "SMK, Tata Boga", activities: [] }],
  organizations: [{ name: "OSIS SMK Negeri 3 Bekasi", role: "Anggota Divisi Acara", start: "2019", end: "2020", bullets: ["Menyelenggarakan bazar makanan tahunan sekolah dengan 30+ stan"] }],
  skills: ["Mesin espresso", "Latte art", "Mesin kasir (POS)", "Microsoft Excel"],
  soft_skills: ["Bertanggung jawab", "Mampu bekerja dalam tim", "Mampu bekerja di bawah tekanan", "Pelayanan pelanggan"],
  languages: ["Bahasa Indonesia (penutur asli)", "Bahasa Inggris (dasar)"],
  certifications: ["Pelatihan Barista Dasar, LSP Pariwisata (2023)", "SIM C"],
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
      maxTokens: 8000,
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
