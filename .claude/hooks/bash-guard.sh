#!/usr/bin/env bash
# PreToolUse hook for Bash. Denies staging everything at once, because other
# sessions edit this checkout and a sweep commits their work. Asks before a
# command that matches a destructive or deploy pattern. Prints nothing
# otherwise, including on unreadable input: an explicit "allow" would skip
# Claude Code's normal permission checks.
set -euo pipefail

HOOK_INPUT=$(cat) python3 - <<'PY'
import json
import os
import re
import shlex

DENY_REASON = (
    "Stage explicit paths: git add <file>... then git commit. Other sessions edit this "
    "checkout, so commit -a/--all and add -A/-u/. can sweep in their changes."
)

ASK_PATTERNS = [
    "git push --force", "git push -f ", "git reset --hard", "rm -rf",
    "npm run deploy", "npm publish", "firebase deploy", "vercel --prod",
    "aws s3 sync", "aws s3 rm", "aws cloudfront", "aws route53", "aws acm",
    "terraform apply", "terraform destroy", "cdk deploy", "cdk destroy",
]

GIT_OPTIONS_WITH_VALUE = {"-C", "-c", "--git-dir", "--work-tree", "--namespace"}
COMMIT_SHORT_OPTIONS_WITH_VALUE = set("mFCct")
COMMIT_SHORT_OPTIONS_WITH_ATTACHED_VALUE = set("uS")
COMMIT_LONG_OPTIONS_WITH_VALUE = {"--message", "--file", "--reuse-message", "--reedit-message", "--template", "--author", "--date", "--cleanup", "--fixup", "--squash", "--trailer"}
WHOLE_TREE_PATHS = {".", "./", ":/", "-A", "--all", "-u", "--update", "--no-ignore-removal"}


def decide(decision, reason):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": decision,
        "permissionDecisionReason": reason,
    }}))


def segments(command):
    unnested = re.sub(r"\$\(|[()`]", " ; ", command)
    lexer = shlex.shlex(unnested, posix=True, punctuation_chars=";&|")
    lexer.whitespace_split = True
    current = []
    for token in lexer:
        if token and set(token) <= set(";&|"):
            if current:
                yield current
            current = []
        else:
            current.append(token)
    if current:
        yield current


def git_subcommand(words):
    if not words or os.path.basename(words[0]) != "git":
        return None, []
    index = 1
    while index < len(words) and words[index].startswith("-"):
        option = words[index].split("=", 1)[0]
        index += 2 if option in GIT_OPTIONS_WITH_VALUE and "=" not in words[index] else 1
    if index >= len(words):
        return None, []
    return words[index], words[index + 1:]


def commit_stages_everything(args):
    index = 0
    while index < len(args):
        arg = args[index]
        if arg == "--":
            return False
        if arg.startswith("--"):
            name = arg.split("=", 1)[0]
            if name == "--all":
                return True
            if name in COMMIT_LONG_OPTIONS_WITH_VALUE and "=" not in arg:
                index += 1
        elif arg.startswith("-") and len(arg) > 1:
            for position, flag in enumerate(arg[1:], start=1):
                if flag == "a":
                    return True
                if flag in COMMIT_SHORT_OPTIONS_WITH_VALUE:
                    if position == len(arg) - 1:
                        index += 1
                    break
                if flag in COMMIT_SHORT_OPTIONS_WITH_ATTACHED_VALUE:
                    break
        index += 1
    return False


def add_stages_everything(args):
    for arg in args:
        if arg in WHOLE_TREE_PATHS:
            return True
        if re.fullmatch(r"-[A-Za-z]*[Au][A-Za-z]*", arg):
            return True
    return False


def stages_everything(command):
    for words in segments(command):
        subcommand, args = git_subcommand(words)
        if subcommand == "commit" and commit_stages_everything(args):
            return True
        if subcommand == "add" and add_stages_everything(args):
            return True
    return False


try:
    command = str(json.loads(os.environ.get("HOOK_INPUT", "")).get("tool_input", {}).get("command", ""))
except (ValueError, AttributeError):
    command = ""

try:
    sweeps = stages_everything(command)
except ValueError:
    sweeps = False

if sweeps:
    decide("deny", DENY_REASON)
else:
    lowered = command.lower()
    match = next((pattern for pattern in ASK_PATTERNS if pattern.lower() in lowered), None)
    if match:
        decide("ask", f"Matches destructive pattern '{match}'. Confirm before running.")
PY
