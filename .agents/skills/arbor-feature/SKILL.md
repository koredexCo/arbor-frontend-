---
name: arbor-feature
description: Step-by-step process for building any new Arbor feature or behaviour change safely (design doc, flag, tests, review, report). Use when the user asks to add, build or implement something in an Arbor repo.
---

# Building a feature in Arbor

Follow these steps in order. Stop and ask the user if a step reveals an open decision.

1. **Branch.** `git switch -c feat/<topic>-YYYYMMDD` from the base the user named (never work on `main`/`master`).
2. **Investigate.** Read the files involved and their callers. Find the closest existing feature that works the same way and copy its pattern (flag handling, tests, docs). Write down what you found.
3. **Design doc.** Write `docs/design/<NAME>.md`: goal, how it works, files to change, the flag, failure behaviour (must fail closed), tests, known limitations. Commit it on its own: `design: <topic>`. Show the user the plan before coding if anything is uncertain.
4. **Flag.** Put new behaviour behind `ARBOR_<NAME>=off|on` (or named modes), default off, read fresh per call, unknown values fall back to off. With the flag off, behaviour must be byte-identical to before.
5. **Baseline.** Run the full test suite before changing code and save the list of failing test IDs.
6. **Implement** the smallest change that fully solves it. Follow AGENTS.md (no sealed files, no secrets, plain-English docstrings, small functions).
7. **Tests.** Hermetic unit tests for the logic; DB-backed tests in the style of `tests/test_sec04_seal_binding.py` for anything that approves, dispatches or seals. Include a flag-off test proving nothing changed.
8. **Review.** Run the `arbor-review` skill and fix everything it finds.
9. **Commit** code separately from the design doc (`feat: <topic>`), LF line endings, no scratch files.
10. **Report** using the AGENTS.md report format, including what was not verified and what you need from the user (for example a real-environment run).
