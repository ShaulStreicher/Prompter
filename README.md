# Prompter — AI Prompt Builder

A wizard-style prompt builder for Claude, GPT-4, Gemini, Llama, and Mistral. Build structured, high-quality prompts through guided steps, save them locally with full version history, and collaborate in real time with teammates.

**Live app:** [shaulstreicher.github.io/Prompter](https://shaulstreicher.github.io/Prompter)

---

## Features

- **11-step wizard** — Role, Context, Objective, Rules, Constraints, Tone, Format, Few-shot examples, Chain of thought, Fallback behavior, Target model
- **Live preview** — Syntax-highlighted prompt updates as you type, with token/char count
- **Facts page** — Separate knowledge base with Key Facts, Reference Docs, Persona, and Glossary tabs
- **Version control** — Every save creates a snapshot; browse and restore any previous version with optional notes
- **Save / Export / Import** — Named saves in localStorage, JSON export/import, .txt download
- **Live collaboration** — Real-time multi-user editing via WebSocket (requires your own server — see below)

---

## Running locally

No build step required — it's plain HTML, CSS, and JS.

```bash
# Clone the repo
git clone https://github.com/ShaulStreicher/Prompter.git
cd Prompter

# Open in browser (macOS)
open index.html

# Or serve with any static server
npx serve .
```

---

## Collaboration

The collaboration feature requires a personal WebSocket server. It is **not shared** — each team deploys their own so rooms are private.

### Deploy to Render (free tier)

1. Fork this repo to your GitHub account
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your forked repo — Render auto-detects `render.yaml`
4. Click **Deploy** — takes ~2 minutes
5. Copy your service URL (e.g. `https://my-prompter.onrender.com`)

### Connect the app to your server

1. Open the Prompter app
2. Click **🔗 Collaborate** in the header
3. Paste your server URL (the app converts `https://` to `wss://` automatically)
4. Click **Save & continue** — the URL is stored in your browser's localStorage

Your teammates do the same setup with the same server URL, then you share room codes to collaborate.

> **Free tier note:** Render free services sleep after 15 minutes of inactivity. The first connection after a period of inactivity may take ~30 seconds. The app auto-reconnects with exponential backoff so you don't have to do anything.

### Other hosting options

| Platform | Free tier | Notes |
|----------|-----------|-------|
| [Railway](https://railway.app) | $5 credit/mo | No sleep, faster cold start |
| [Fly.io](https://fly.io) | 3 shared VMs free | `fly launch` from repo root |
| [Glitch](https://glitch.com) | Free | Sleeps after 5 min inactivity |
| Self-hosted VPS | — | `npm install && npm start` |

---

## Project structure

```
index.html      Wizard page
facts.html      Facts & knowledge base page
style.css       Shared styles (both pages)
app.js          Wizard logic, version control, collaboration client
facts.js        Facts page logic
server.js       Node.js WebSocket collaboration server
render.yaml     One-click Render deployment config
package.json    Node dependencies (ws ^8.18.0)
```

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save prompt |
| `Ctrl/Cmd + Shift + C` | Copy prompt |
| `Alt + →` | Next step |
| `Alt + ←` | Previous step |
