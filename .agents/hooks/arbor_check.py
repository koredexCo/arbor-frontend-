"""Arbor edit hook for Google Antigravity.

What it does, in plain English:
- Before the agent edits a file (PreToolUse): blocks edits to secret files and Arbor's
  sealed files, so the agent cannot change them even by mistake.
- After every edit (PostToolUse): remembers which file changed and runs a quick check on it
  (Python: syntax check + ruff if installed; JS/TS: eslint if installed; any file: secrets
  pattern, Windows line endings).
- When the agent tries to finish (Stop): re-checks every edited file. If something still
  fails, it tells the agent what failed and makes it keep working (at most 3 times).
  If everything passes, it asks the agent once to run the arbor-review skill before stopping.

Uses only the Python standard library. Never prints secrets: it reports file names and
check messages only. Any internal error lets the agent continue normally (it never blocks
work because the hook itself broke), except the secret/sealed-file guard, which denies.
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]          # repo root (.agents/hooks/ -> repo)
STATE_DIR = Path(__file__).resolve().parent / "state"
MAX_CONTINUES = 3
CHECK_TIMEOUT = 25

SECRET_NAMES = re.compile(r"(^|[\\/])(\.env(\..*)?|\.qa_creds\.json|node_key\..*|.*\.pem|.*\.key)$", re.I)
SEALED = {
    "backend/app/main.py",
    "backend/app/services/approval/service.py",
}
SECRET_TEXT = re.compile(
    r"(sk-[A-Za-z0-9]{20,}|nvapi-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|"
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----|eyJhbGciOi[A-Za-z0-9_-]{40,})"
)


def read_event() -> dict:
    """Read the JSON event Antigravity sends on stdin; empty dict if unreadable."""
    try:
        return json.loads(sys.stdin.read() or "{}")
    except (ValueError, OSError):
        return {}


def reply(obj: dict) -> None:
    """Send the hook's answer back to Antigravity as JSON on stdout."""
    sys.stdout.write(json.dumps(obj))
    sys.stdout.flush()


def rel_path(target: str) -> str:
    """Path of the edited file relative to the repo root, with forward slashes."""
    p = Path(target)
    if not p.is_absolute():
        p = ROOT / p
    try:
        return p.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return p.as_posix()


def state_file(event: dict) -> Path:
    """One small state file per conversation, kept out of git."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    gi = STATE_DIR / ".gitignore"
    if not gi.exists():
        gi.write_text("*\n", encoding="utf-8")
    conv = re.sub(r"[^A-Za-z0-9_-]", "", str(event.get("conversationId", "default")))[:64] or "default"
    return STATE_DIR / f"{conv}.json"


def load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"files": [], "continues": 0, "reviewed_prompted": False}


def save(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=1), encoding="utf-8")


def run(cmd: list) -> tuple:
    """Run a check command with a timeout; returns (ok, short output)."""
    try:
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=CHECK_TIMEOUT)
    except subprocess.TimeoutExpired:
        return True, "timed out (not counted as a failure)"
    except OSError as exc:
        return True, f"could not run ({exc.__class__.__name__})"
    out = (r.stdout + r.stderr).strip()
    return r.returncode == 0, out[-1500:]


def tool(name: str) -> str:
    """Find a tool on PATH or in the repo's node_modules/.bin; '' if missing."""
    found = shutil.which(name)
    if found:
        return found
    for suffix in (".cmd", ""):
        local = ROOT / "node_modules" / ".bin" / (name + suffix)
        if local.exists():
            return str(local)
    return ""


def check_file(rel: str) -> list:
    """Quick checks for one file. Returns a list of problem strings (empty = OK)."""
    path = ROOT / rel
    if not path.exists():
        return []
    problems = []
    try:
        raw = path.read_bytes()
    except OSError:
        return []
    if path.suffix in {".py", ".ts", ".tsx", ".js", ".jsx", ".md", ".sql", ".json"} and b"\r\n" in raw:
        problems.append(f"{rel}: has Windows (CRLF) line endings; use LF")
    if SECRET_TEXT.search(raw.decode("utf-8", errors="ignore")):
        problems.append(f"{rel}: looks like it contains an API key, token or private key; remove it")
    if path.suffix == ".py":
        try:  # compile in memory: no __pycache__ files left in the repo
            compile(raw.decode("utf-8", errors="replace"), rel, "exec")
            ok, out = True, ""
        except SyntaxError as exc:
            ok, out = False, f"line {exc.lineno}: {exc.msg}"
        if not ok:
            problems.append(f"{rel}: Python syntax error:\n{out}")
        ruff = tool("ruff")
        if ruff and ok:
            ok2, out2 = run([ruff, "check", "--quiet", str(path)])
            if not ok2:
                problems.append(f"{rel}: ruff found issues:\n{out2}")
    elif path.suffix in {".ts", ".tsx", ".js", ".jsx"}:
        eslint = tool("eslint")
        if eslint:
            ok, out = run([eslint, "--no-warn-ignored", str(path)])
            if not ok:
                problems.append(f"{rel}: eslint found issues:\n{out}")
    return problems


def on_pre(event: dict) -> None:
    args = (event.get("toolCall") or {}).get("args") or {}
    target = str(args.get("TargetFile") or "")
    rel = rel_path(target) if target else ""
    if rel and SECRET_NAMES.search(rel):
        reply({"decision": "deny", "reason": f"Arbor rule: never edit secret files ({rel})."})
    elif rel in SEALED:
        reply({"decision": "deny", "reason": f"Arbor rule: {rel} is a sealed file and must never be edited. Find another way or ask the user."})
    else:
        reply({"decision": "allow"})


def on_post(event: dict) -> None:
    call = event.get("toolCall") or {}
    target = str((call.get("args") or {}).get("TargetFile") or "")
    if target and not event.get("error"):
        sf = state_file(event)
        data = load(sf)
        rel = rel_path(target)
        if rel not in data["files"]:
            data["files"].append(rel)
        save(sf, data)
    reply({})


def on_stop(event: dict) -> None:
    sf = state_file(event)
    data = load(sf)
    if not data["files"]:
        reply({})
        return
    problems = [p for rel in data["files"] for p in check_file(rel)]
    if problems and data["continues"] < MAX_CONTINUES:
        data["continues"] += 1
        save(sf, data)
        reply({"decision": "continue", "reason": (
            "Automatic Arbor checks failed on files you edited. Fix these before finishing, "
            "then run the relevant tests:\n- " + "\n- ".join(problems))})
        return
    if not problems and not data["reviewed_prompted"]:
        data["reviewed_prompted"] = True
        save(sf, data)
        reply({"decision": "continue", "reason": (
            f"Quick checks passed on {len(data['files'])} edited file(s). Before finishing, run the "
            "arbor-review skill (full self-review, tests before/after) and end with the AGENTS.md report.")})
        return
    if problems:
        reply({"decision": "continue", "reason": (
            "Checks still failing after 3 attempts. Stop and report these to the user honestly "
            "instead of claiming the task is done:\n- " + "\n- ".join(problems))}) if not data.get("final_reported") else reply({})
        data["final_reported"] = True
        save(sf, data)
        return
    sf.unlink(missing_ok=True)
    reply({})


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    event = read_event()
    try:
        {"pre": on_pre, "post": on_post, "stop": on_stop}[mode](event)
    except Exception:  # the hook itself broke: never block the agent because of that
        reply({"decision": "allow"} if mode == "pre" else {})


if __name__ == "__main__":
    main()
