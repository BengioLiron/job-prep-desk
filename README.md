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

## Running it

It's one self-contained file: `index.html`.

The AI features use the Claude artifact runtime (`window.claude.use("sample")` and `window.claude.use("downloads")`), so **analysis, tailoring and PDF download only work when the page is opened as an artifact on claude.ai**. Opened anywhere else (locally or on GitHub Pages), the page loads and shows the example briefing, but the buttons that call Claude are disabled.

To run it outside claude.ai, replace the `sample.json(prompt)` calls with calls to your own backend or the Claude API, and replace `downloadsNS.save(...)` with a normal browser download.

## Tech

Plain HTML, CSS and JavaScript. No build step, no framework.
