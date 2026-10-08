# StoryCV

People pick a career buddy (Kira the Cat, Kopi the Owl or Tobi the Dino). Each buddy has its own way of talking and its own color theme for the whole site, fill in their basic details, then chat with that buddy about their work life. The AI turns that chat into an ATS-friendly resume. They pay to unlock and download it as a PDF. Payment is in **test mode** for now.

## What's inside

| File | What it does |
|---|---|
| `index.html` | The whole website people see: the chat, the resume preview, the payment popup, and the PDF download. |
| `api/chat.js` | Talks to the AI during the chat. |
| `api/resume.js` | Asks the AI to write the final resume from the chat. |
| `api/_shared.js` | Settings shared by both, including the safety limits on chat length. |
| `api/_buddies.js` | Each buddy's personality, which the AI plays during the chat. |
| `lib/jspdf.umd.min.js` | A free tool that creates the PDF file. |

## Put it online (Vercel)

1. Upload this folder to a new GitHub repository.
2. In Vercel, click **Add New → Project**, choose that repository, then click **Deploy**.
3. The site now works in **demo mode**: the chat is scripted and it shows a sample resume.

## Turn on the real AI

1. Get an API key (a secret password for the AI service) at **console.anthropic.com**, then add some credit there.
2. In Vercel, open the project and go to **Settings → Environment Variables**. Add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key
3. Go to **Deployments**, click the three dots on the newest one, and choose **Redeploy**.

Optional: to use the cheaper AI model, add `STORYCV_MODEL` with the value `claude-haiku-4-5-20251001`.

## Easy changes

- **Price:** in `index.html`, find `PRICE_IDR`.
- **Buddies' names, colors, fonts, drawings:** in `index.html`, find `const BUDDIES` and `const DRAW`.
- **Buddies' personalities and how they ask questions:** `api/_buddies.js`.
- **What the bot asks and how it talks:** the text block at the top of `api/chat.js`.
- **How the resume is written:** the text block in `api/resume.js`.

## Before taking real money

- Replace `startPayment()` in `index.html` with Midtrans Snap or Xendit.
- Check the payment on the server before giving the PDF. Right now, a tech-savvy person could skip the payment, which is fine for testing only.
- Add a login (email or Google) to limit free chats per person.
