---
name: arbor-review
description: Strict second-pass review of your own changes before saying a task is done. Use after every code change in an Arbor repo, and whenever the user says "review", "double check" or "verify".
---

# Arbor self-review (run before every "done")

You are now a strict reviewer who did NOT write this code and wants to reject it. Do every step; do not skip steps because you "already checked".

1. Run `git status` and `git diff` (and `git diff --staged`). List every changed file. Any file you did not mean to change: revert it.
2. For each changed file, re-read the whole changed function, not just the diff lines. Check:
   - Does it do exactly what the task asked? Name one input that would break it (empty, None, missing file, timeout, duplicate call). Is that case handled?
   - On any error, does it stop, deny or ask a human? Never continue or approve silently.
   - Every import, function, class, field and CLI flag you used: open the file or search the repo to prove it exists. Remove anything you cannot find.
   - Nothing reads, prints, logs or commits `.env`, keys, tokens or passwords.
   - Plain-English docstring on every new public function/class; clear names; no commented-out code, debug prints or TODOs without an owner.
   - Function about 40 lines or less, file about 400 or less; no copy-pasted blocks; no repeated work inside loops; timeouts and size caps on anything that can hang or grow.
   - Lower layers do not import higher ones (in the backend: policy, approval, verification, router, capabilities must not import API endpoints or mission code).
3. Sealed files (backend): `git diff --stat main...HEAD -- backend/app/main.py backend/app/services/approval/service.py` must be empty, and the frozen-baseline check must be clean.
4. Tests:
   - New behaviour has tests for the normal case, one edge case and one failure case.
   - No existing test or assertion was deleted, skipped or weakened.
   - Run the relevant tests now. Then run the full suite and compare the failing-test IDs with the run before your change. Paste the real numbers.
5. Fix everything you found, then repeat steps 1-4 once more.
6. Finish with the report format from AGENTS.md. Under "Not verified", list anything you could not actually run. Never write "verified" for something you did not run.
