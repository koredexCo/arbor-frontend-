# Arbor frontend: rules for AI coding agents

Read this whole file before every task. It applies to Claude Code, Google Antigravity, Arbor itself and any other agent working in this repo.

**What this repo is:** the Arbor web UI (React 19 + Vite + TypeScript + Tailwind, Supabase auth, TanStack Query, Zustand). Users approve risky AI actions here, so what the UI shows must match the backend exactly.

## Repo facts

- Windows + PowerShell. Repo: `D:\arbor-working\arbor-frontend`, default branch `main`.
- Commands: `npm run dev`, `npm run build` (runs `tsc -b`, must pass with no errors), `npm run lint` (must pass).
- Ignore and do not edit the old helper scripts in the root (`deep_fix_colors.py`, `final_fix.py`, `replace_colors.py`) unless asked.

## Frontend-specific rules

- Never show an approval, risk level or result the backend did not return. If a field is missing, hide it; never guess or default to "safe" or "verified".
- High-risk approvals keep the typed-request-id confirmation. Never add a shortcut that skips it.
- Read mission data from the backend's GET mission status; do not invent client-side state for approvals or seals.
- No secrets or service keys in frontend code; only the public Supabase anon key from env.
- Keep components small, typed (no `any` unless explained), and reuse existing components and styles.
- Before done: `npm run build` and `npm run lint` pass, and you checked the changed screen in the browser (describe or screenshot it in the report).

## How to work (every task)

1. **Understand before changing.** Read the files you will touch and the code that calls them. Find the existing pattern for this kind of change and follow it. Do not guess an API, a function name, or a file path: open the file and check.
2. **Plan first for anything bigger than a one-line fix.** Write a short plan: goal, files to change, how you will test it, what could break. For new features, write `docs/design/<NAME>.md` first and commit it on its own.
3. **Make the smallest change that fully solves the task.** No drive-by refactors, no renaming, no reformatting of code you were not asked to touch.
4. **Test it for real.** Run the tests that cover what you changed, and add tests for new behaviour (the normal case, one edge case, one failure case). "It should work" is not done.
5. **Double-check before you say done.** Run the self-review checklist below, fix what it finds, and run the tests again.
6. **Report honestly.** Say what you ran, what passed, what you could not run and why. Never write "verified" for something you did not run. "Skipped" and "unverified" are valid answers.

## Self-review checklist (run it before every "done")

Re-read your own diff (`git diff`) as a strict reviewer who wants to reject it:

- [ ] **Correct:** does it do exactly what was asked, including edge cases (empty input, missing file, timeout, None/null, duplicate call)?
- [ ] **Fails closed:** on any error, does it deny, stop or ask a human, never silently continue or approve?
- [ ] **No invented code:** every import, function and field you used exists in this repo or its installed packages. Check by opening the file or searching.
- [ ] **No secrets:** nothing reads, prints, logs or commits `.env`, keys, tokens or passwords.
- [ ] **Tests:** new behaviour has tests; you did not delete, skip or weaken an existing test or assertion to make things pass.
- [ ] **Readable:** every new public function/class has a docstring that says in plain English what it does and why; names say what things are; a non-programmer could follow the comments.
- [ ] **Small:** functions about 40 lines or less, files about 400 or less; split if you went past it. No copy-pasted blocks: reuse a helper.
- [ ] **Efficient:** no repeated work in loops, no unbounded reads or outputs, no extra model/network calls, timeouts on anything that can hang.
- [ ] **Fits the architecture:** lower layers do not import higher ones (policy, approval, verification, router and capabilities code must not import API endpoints or mission code).
- [ ] **Clean:** LF line endings, no debug prints, no scratch files, no commented-out code left behind.
- [ ] **Before/after:** you ran the relevant test suite before and after, and the set of failing test IDs did not grow.

If any box is unchecked, fix it first, or say plainly in your report why you could not.

## Git rules

- Never commit to `main`/`master`. Branch as `feat/<topic>-YYYYMMDD` or `fix/<topic>-YYYYMMDD`. Abhinav merges PRs himself.
- One logical change per commit; design doc and code in separate commits. Clear commit messages that say what and why.
- New behaviour goes behind an `ARBOR_*` flag that defaults to off; off must behave exactly like before. Unknown flag values fall back to off.

## Never do these

- Edit sealed files (listed in this repo's section below, if any).
- Print, display, copy or commit the contents of `.env`, `backend/.env`, `.env.bak`, `.qa_creds.json`, node keys or API keys. Letting the app or tests load `backend/.env` through code is fine; never show its values or paste them anywhere.
- Change the demo scripts or demo settings, turn flags on in the demo environment, or apply migrations to the demo database.
- Change another Arbor repo (backend, agent, frontend) unless the task says so; if you must, list it in the report.
- Install new dependencies without saying why in the report.

## Report format (end every task with this)

```
Task: <name>   Branch: <branch>   Commits: <shas>
What changed: <file> - <one line> (one per file)
Tests: new <n> (pass/fail), suite before <failed/passed>, after <failed/passed>, failing-ID diff <none / list>
Self-review: <all boxes checked / which not and why>
Not verified: <what you could not run and why>
Needs from Abhinav: <decision, real-environment run, or nothing>
```
