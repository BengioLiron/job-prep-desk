# Job Prep Desk

A single-page tool for preparing for software job interviews. Paste a job posting and it builds a full prep briefing:

- **Job summary and fit score** compared to your own skills
- **Knowledge they want**: must-have and nice-to-have skills, each marked as *You have it*, *Some* or *Gap*
- **Likely interview process** and **technical / personal questions** to prepare
- **LeetCode practice** matched to the job, with a *Find more questions* button
- **Study plan** with an adjustable number of days (1–30) and a *Rebuild plan* button
- **From the company**: paste a recruiter email (Hebrew or English) and the prep is rebuilt around it
- **Tailored CV**: upload your CV as a PDF and get a version tailored to each job, based only on your real experience
- **CV agent**: an AI agent that asks you about unclear points in your CV, writes a draft, checks itself and fixes what fails (see below)
- **Saved analyses**, kept in your browser (`localStorage`)
- **Previous CV**: your old CV teaches the app your preferred format and design, and adds facts about you
- **Job folders**: each job gets its own folder on your computer with the brief, the posting and the tailored CV (standalone version)

## Honest CV tailoring

The tailored CV may only reorder, reword and trim what is already in your CV. On top of the instructions to the model, the page checks the result itself:

- Skills that don't appear in the original CV are removed automatically.
- Every bullet must quote the original CV line it came from. Bullets that can't be matched are flagged with a **check** tag, with one-click removal.
- Contact details not found in the CV are dropped.
- Requirements the CV doesn't cover are listed separately as gaps, never added to the CV.

PDF reading uses [pdf.js](https://mozilla.github.io/pdf.js/) and the PDF export uses [jsPDF](https://github.com/parallax/jsPDF), both loaded from cdnjs and run entirely in the browser.

## The CV agent

The CV agent is a hand-written agent loop (no framework). Each turn, the model receives the goal, the CV, the user's earlier answers, the job, the current draft and the step history, and replies with exactly one action:

```json
{"thought": "why this step", "tool": "write_draft", "args": { ... }}
```

The page runs the tool, records the result, and loops.

| Tool | What it does |
|---|---|
| `ask_user` | Asks up to 3 questions about unclear points (max 2 rounds). Answers are saved and become valid sources of truth. |
| `write_draft` | Writes the full tailored CV. Code checks it immediately and returns an honesty report. |
| `fix_bullet` / `remove_bullet` | Targeted repairs, addressed by bullet id (`section.entry.bullet`). |
| `finish` | Saves the CV. **Refused by code** while any bullet is unverified. |

Design choices:

- **Guardrails in code, not in the prompt.** The honesty check (skills and bullet sources must match the CV or the user's answers) is deterministic. The model cannot talk its way past it.
- **Human in the loop.** The agent asks instead of guessing, and a skipped question means "assume nothing".
- **Step limit (12) and question limit (2)**, so a run can never loop forever.
- **Context management.** Full tool results for the last 3 steps, one-line summaries for older ones.
- **Observability.** Every step (thought, tool, arguments, result, duration) is shown live in a trace panel and saved with the CV.

## Your previous CV

Upload a CV you've used before (Your CV → Previous CV). The page:

- reads its text: everything in it counts as true facts about you, so the honesty check accepts lines based on it;
- learns its **format** (section order and titles, headline and bullet style, length), which the agents follow;
- learns its **design** from an image of page 1 plus font measurements (font family, accent color, single column or sidebar, heading style, bullet style). The preview and the PDF follow it.

The PDF uses standard fonts (a sans-serif or Times), so it gets close to the original design rather than copying it exactly.

## Job folders (standalone version)

Choose a base folder once (Job folders → Choose folder). Each job gets its own folder inside it:

```
Acme Chips - Junior Firmware Engineer (2026-11-23)/
├── job-brief.md          analysis, interview prep, LeetCode, study plan, notes
├── job-posting.txt       the posting you pasted
├── CV - <name> - Acme Chips.pdf
├── cv.txt
└── cv-agent-steps.md     every step the CV agent took
```

With "Save each job automatically" on, folders update after each analysis and each tailored CV. This uses the browser's File System Access API, so it works in **Chrome or Edge**, not inside claude.ai.

## Repository layout

```
index.html            the app: UI, agent loop, tools, guardrails, PDF reading and writing
agents/cv-agent.md    the CV agent's instructions; limits (max_steps, max_questions) in the header
worker/worker.js      tiny server for the standalone version; keeps the API key secret
```

The agent's `.md` file holds the rules; the code fills in the live state (`{{cv}}`, `{{draft}}`, `{{history}}`, …) on every turn. To change how the agent behaves, edit the `.md` file.

## Running it

### On claude.ai

Open the page as a Claude artifact. AI calls go through claude.ai and your Claude plan; nothing to set up. Folder export isn't available there (downloads only).

### Standalone (GitHub Pages)

1. **Get an API key** at console.anthropic.com (API usage is billed separately from a Claude plan; personal use is usually cents a day).
2. **Deploy the server** on Cloudflare (free plan):
   - Cloudflare dashboard → Workers & Pages → Create → Worker → name it (e.g. `job-prep`) → Deploy.
   - Edit code → replace everything with `worker/worker.js` → Deploy.
   - Settings → Variables and Secrets:
     - `ANTHROPIC_API_KEY` (secret): your API key
     - `APP_TOKEN` (secret): any long random string
     - `ALLOWED_ORIGINS` (text): `https://bengioliron.github.io` (add `http://localhost:8000` for local testing)
3. **Open the site** at https://bengioliron.github.io/job-prep-desk/ in Chrome or Edge → Setup → paste the Worker URL and your `APP_TOKEN` → Save and test.

Your data (jobs, CVs, answers) stays in your browser's storage and your chosen folder. The server only forwards prompts to the Claude API.

### Locally

`index.html` loads `agents/cv-agent.md` with `fetch`, which browsers block for `file://` pages, so serve the folder:

```
python3 -m http.server 8000
```

then open http://localhost:8000.

## Tech

Plain HTML, CSS and JavaScript. No build step, no framework. PDF reading: [pdf.js](https://mozilla.github.io/pdf.js/). PDF writing: [jsPDF](https://github.com/parallax/jsPDF).
