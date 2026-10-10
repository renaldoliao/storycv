# StoryCV

A website that introduces StoryCV and its three career buddies (Kira the Cat, Kopi the Owl, Tobi the Dino), plus the tool itself: people sign up, pick a buddy, chat about their work life, and get an ATS-friendly CV they can unlock and download as a PDF. Payment is in **test mode** for now.

## Pages

| Address | What it is |
|---|---|
| `/` | Home: what StoryCV is, 3 steps, buddies, price. |
| `/why-ats` | Why an ATS-friendly CV matters, with sourced statistics. |
| `/buddies` | Meet Kira, Kopi and Tobi in detail. |
| `/pricing` | Pricing and all FAQs. |
| `/app` | The tool. Sign up / log in, pick a buddy, chat, get the CV. |

## What's inside

| File | What it does |
|---|---|
| `index.html` | Home page. |
| `why-ats.html`, `buddies.html`, `pricing.html` | The other pages. |
| `lib/site.css`, `lib/site.js` | Shared look, menu and footer for the other pages. |
| `app.html` | The tool (sign up, chat, CV, payment popup, PDF). |
| `lib/buddies.js` | The buddies' drawings, colors and fonts (used by both pages). |
| `lib/jspdf.umd.min.js` | A free tool that creates the PDF file. |
| `api/chat.js` | Talks to the AI during the chat. |
| `api/resume.js` | Asks the AI to write the final CV. |
| `api/_buddies.js` | Each buddy's personality and way of asking questions. |
| `api/_auth.js` | Checks the visitor is logged in and within their daily limit. |
| `api/config.js` | Tells the app how to reach the login service. |
| `api/_shared.js` | Shared settings and chat-length limits. |
| `supabase-setup.sql` | One-time setup for the usage counter (see below). |
| `vercel.json` | Lets `/app` work without typing `.html`. |

## How the protection works

- The real AI only answers people who are **logged in with a confirmed email**.
- Each account gets a **daily limit**: 80 chat messages and 5 CVs by default.
- Without accounts set up, the AI stays locked (the site shows a polite message).
- Demo mode (no AI key) costs nothing, so it works without logging in.

## Setup

### 1. Accounts (Supabase, free)
1. Go to **supabase.com**, sign up, and click **New project**. Pick the **Singapore** region and save the database password somewhere safe.
2. Open **SQL Editor → New query**, paste everything from `supabase-setup.sql`, and click **Run**.
3. Open **Authentication → URL Configuration**:
   - **Site URL:** your site address, e.g. `https://storycv-two.vercel.app`
   - **Redirect URLs:** add `https://storycv-two.vercel.app/app`
4. Open **Project Settings → API Keys** (or **API**) and copy three things: the **Project URL**, the **anon / publishable** key, and the **service_role / secret** key. The secret one is like a master password: never share it or put it in the website files.

### 2. Vercel
In your Vercel project, open **Settings → Environment Variables** and add:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your AI key |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role / secret key |

Optional: `DAILY_MESSAGE_LIMIT`, `DAILY_RESUME_LIMIT` (numbers), and `STORYCV_MODEL` = `claude-haiku-4-5-20251001` for the cheaper AI.

Then go to **Deployments**, click the three dots on the newest one, and choose **Redeploy**.

### 3. Before a real launch
- Supabase's built-in email can only send a few emails per hour. Connect your own email sender (Supabase → Authentication → Emails → SMTP, e.g. with Resend) before many people sign up.
- Replace `startPayment()` in `app.html` with Midtrans or Xendit, and confirm payments on the server before giving the PDF.

## Easy changes
- **Price:** find `PRICE_IDR` in both `index.html` and `app.html`.
- **Buddies' look:** `lib/buddies.js`.
- **Buddies' personalities:** `api/_buddies.js`.
- **Landing page text:** `index.html`.
- **How the CV is written:** `api/resume.js`.
