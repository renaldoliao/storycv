// POST /api/chat  — the interview bot ("Kira").
// Body: { messages: [{role:"user"|"assistant", content:"..."}] }
// Returns: { reply, covered: {...}, ready, demo }

const { isDemo, cleanMessages, callClaude, parseJson, send } = require("./_shared");

const SYSTEM = `You are Kira, a warm, encouraging career coach inside an app called StoryCV.
Your job is to INTERVIEW the user like a friendly chat, so we can later write a strong, ATS-friendly resume from their answers. You do NOT write the resume yourself.

Cover these areas, in a natural order:
1. experience: each job — role, company, rough dates, team size, what they did day to day.
2. achievements: for each job, at least one thing they improved, fixed, built, sold or saved. Dig for numbers (how many, how much, how fast, before vs after, % change). If they don't know exact numbers, ask for a rough estimate.
3. education: school/university, major, year finished (and notable results if any).
4. hard_skills: tools, software, languages, certifications.
5. soft_skills: draw these out from stories ("what do teammates come to you for?").
6. contact: full name, city, email, phone (ask near the end; optional, they may skip).

Rules:
- Ask ONE short question at a time (max 2 sentences). Be warm and casual, never like a form.
- Briefly acknowledge what they said before asking the next thing.
- Reply in the same language the user writes in (e.g. Bahasa Indonesia or English).
- Never invent facts. If something is vague, ask a follow-up.
- If the user is a fresh graduate with no jobs, cover internships, campus organisations, projects and volunteering as experience instead.
- When every area is covered well enough, tell them they can tap "Create my resume" (or keep adding more).

Respond ONLY with a JSON object, no other text:
{"reply":"<your message to the user>","covered":{"experience":true|false,"achievements":true|false,"education":true|false,"hard_skills":true|false,"soft_skills":true|false,"contact":true|false},"ready":true|false}`;

const DEMO_QUESTIONS = [
  "Hi, I'm Kira (demo mode). What's your current or most recent job? Tell it however you like.",
  "Nice! What's one thing you improved there? Rough numbers are fine.",
  "Great. Where did you study, and when did you finish?",
  "Which tools or software do you use day to day?",
  "How would your teammates describe you?",
  "Last one: your full name, city and email, so I can put them on top.",
  "That's everything! Tap “Create my resume” whenever you're ready.",
];
const KEYS = ["experience", "achievements", "education", "hard_skills", "soft_skills", "contact"];

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });
  try {
    const messages = cleanMessages((req.body || {}).messages || []);

    if (isDemo()) {
      const n = messages.filter((m) => m.role === "user").length;
      const covered = Object.fromEntries(KEYS.map((k, i) => [k, i < n]));
      return send(res, 200, {
        reply: DEMO_QUESTIONS[Math.min(n, DEMO_QUESTIONS.length - 1)],
        covered,
        ready: n >= KEYS.length,
        demo: true,
      });
    }

    // The very first call has no messages yet: ask the bot to open the chat.
    const convo = messages.length ? messages : [{ role: "user", content: "(The user just opened the app. Greet them and ask your first question.)" }];
    // The AI's earlier turns were stored as plain text; make sure the convo starts with a user turn.
    if (convo[0].role !== "user") convo.unshift({ role: "user", content: "(Start of chat.)" });

    const text = await callClaude({ system: SYSTEM, messages: convo, maxTokens: 500 });
    const data = parseJson(text) || { reply: text, covered: {}, ready: false };
    return send(res, 200, {
      reply: String(data.reply || "Sorry, could you say that again?"),
      covered: Object.fromEntries(KEYS.map((k) => [k, !!(data.covered || {})[k]])),
      ready: !!data.ready,
    });
  } catch (e) {
    return send(res, e.status || 500, { error: e.message || "Something went wrong" });
  }
};
