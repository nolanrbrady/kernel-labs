#!/usr/bin/env bash
set -euo pipefail

TODO_FILE="${TODO_FILE:-TODO.md}"
AGENT_NAME="${AGENT_NAME:-$(whoami)}"
AGENT_RUN_CMD="${AGENT_RUN_CMD:-codex exec --skip-git-repo-check - < \"\$AGENT_PROMPT_FILE\"}"
LOCK_DIR="${LOCK_DIR:-.ralph_wiggims.lock}"
MAX_ITERS="${MAX_ITERS:-15}"
SLEEP_SEC="${SLEEP_SEC:-2}"
CREDIT_MIN="${CREDIT_MIN:-800}"
STATUS_CMD="${STATUS_CMD:-}"

usage() {
  cat <<'EOF'
Usage:
  scripts/ralph_wiggims_loop.sh status
  scripts/ralph_wiggims_loop.sh claim
  scripts/ralph_wiggims_loop.sh done <TASK_ID>
  scripts/ralph_wiggims_loop.sh release <TASK_ID>
  scripts/ralph_wiggims_loop.sh loop

Notes:
  - Tasks are read from TODO.md in file order (top = highest priority).
  - "loop" runs up to MAX_ITERS iterations (default: 15).
  - "loop" claims one task per iteration and marks done on success; releases on failure.
  - If STATUS_CMD is set, the loop stops when parsed credits drop below CREDIT_MIN (default: 800).
  - "loop" builds an AGENT_PROMPT each iteration to instruct the agent to take the next unfinished TODO task.
  - AGENT_RUN_CMD receives TASK_ID, TASK_LINE, TASK_VERIFY, AGENT_NAME, AGENT_PROMPT, AGENT_PROMPT_FILE.
  - Default AGENT_RUN_CMD uses Codex CLI non-interactive execution with AGENT_PROMPT_FILE.
Environment:
  - MAX_ITERS=15
  - SLEEP_SEC=2
  - CREDIT_MIN=800
  - STATUS_CMD='<command that prints credits, e.g. codex status>'
  - AGENT_RUN_CMD='codex exec --skip-git-repo-check - < "$AGENT_PROMPT_FILE"'
EOF
}

log_status() {
  local ts
  ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "[$ts] $*"
}

ensure_todo_file() {
  if [[ ! -f "$TODO_FILE" ]]; then
    echo "Missing TODO file: $TODO_FILE" >&2
    exit 1
  fi
}

acquire_lock() {
  until mkdir "$LOCK_DIR" 2>/dev/null; do
    sleep 0.2
  done
}

release_lock() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

rewrite_line() {
  local line_no="$1"
  local replacement="$2"
  local tmp
  tmp="$(mktemp)"
  awk -v target="$line_no" -v text="$replacement" '
    NR == target { print text; next }
    { print }
  ' "$TODO_FILE" > "$tmp"
  mv "$tmp" "$TODO_FILE"
}

next_open_entry() {
  local entry
  entry="$(awk '/^- \[ \] P[0-9]+-[0-9]+ \|/ && /blocked_by=none/ { print NR ":" $0; exit }' "$TODO_FILE")"
  if [[ -n "$entry" ]]; then
    printf '%s\n' "$entry"
    return 0
  fi
  grep -nE '^- \[ \] P[0-9]+-[0-9]+' "$TODO_FILE" | head -n 1 || true
}

find_claimed_entry_by_id() {
  local task_id="$1"
  grep -nE "^- \\[~\\] ${task_id} \\|" "$TODO_FILE" | head -n 1 || true
}

claim_next() {
  local entry line_no line task_id ts claimed_line
  entry="$(next_open_entry)"
  if [[ -z "$entry" ]]; then
    return 1
  fi

  line_no="${entry%%:*}"
  line="${entry#*:}"
  task_id="$(printf '%s\n' "$line" | sed -E 's/^- \[[ ~x]\] (P[0-9]+-[0-9]+) \|.*/\1/')"
  ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  claimed_line="$(printf '%s\n' "$line" | sed -E 's/^- \[ \]/- [~]/')"
  claimed_line="${claimed_line} | owner=${AGENT_NAME} | started=${ts}"
  rewrite_line "$line_no" "$claimed_line"

  printf '%s\t%s\n' "$task_id" "$claimed_line"
}

mark_done() {
  local task_id="$1"
  local entry line_no line ts done_line
  entry="$(find_claimed_entry_by_id "$task_id")"
  if [[ -z "$entry" ]]; then
    echo "No claimed task found for ID: $task_id" >&2
    exit 1
  fi

  line_no="${entry%%:*}"
  line="${entry#*:}"
  ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  done_line="$(printf '%s\n' "$line" | sed -E 's/^- \[~\]/- [x]/')"
  done_line="${done_line} | completed=${ts}"
  rewrite_line "$line_no" "$done_line"
  echo "Completed: $task_id"
}

release_task() {
  local task_id="$1"
  local entry line_no line released_line
  entry="$(find_claimed_entry_by_id "$task_id")"
  if [[ -z "$entry" ]]; then
    echo "No claimed task found for ID: $task_id" >&2
    exit 1
  fi

  line_no="${entry%%:*}"
  line="${entry#*:}"

  released_line="$(printf '%s\n' "$line" | sed -E 's/^- \[~\]/- [ ]/')"
  released_line="$(printf '%s\n' "$released_line" | sed -E 's/[[:space:]]*\|[[:space:]]*owner=[^|]+//g; s/[[:space:]]*\|[[:space:]]*started=[^|]+//g; s/[[:space:]]*\|[[:space:]]*completed=[^|]+//g')"
  rewrite_line "$line_no" "$released_line"
  echo "Released: $task_id"
}

print_status() {
  local open_count progress_count done_count
  open_count="$(grep -cE '^- \[ \] ' "$TODO_FILE" || true)"
  progress_count="$(grep -cE '^- \[~\] ' "$TODO_FILE" || true)"
  done_count="$(grep -cE '^- \[x\] ' "$TODO_FILE" || true)"

  echo "TODO file: $TODO_FILE"
  echo "Open: $open_count | In progress: $progress_count | Done: $done_count"
  echo
  echo "Next open tasks:"
  grep -E '^- \[ \] ' "$TODO_FILE" | head -n 5 || true
}

extract_verify_cmd() {
  local line="$1"
  local verify_cmd
  verify_cmd="$(printf '%s\n' "$line" | sed -nE 's/.*\|[[:space:]]*verify=([^|]+).*/\1/p' | sed -E 's/[[:space:]]+$//')"
  if [[ -z "$verify_cmd" ]]; then
    verify_cmd="make test;make lint"
  fi
  printf '%s\n' "$verify_cmd"
}

build_agent_prompt() {
  local task_id="$1"
  local task_line="$2"
  local task_verify="$3"
  cat <<EOF
You are implementing DeepML-SR from this repo.

Context files:
- AGENTS.md (engineering standards and workflow rules)
- PRD.md (source of truth for product behavior)
- TODO.md (execution queue)

Assigned task:
- ${task_id}
- ${task_line}

Read AGENTS.md and PRD.md first, then complete ONLY this assigned task from TODO.md.
Run verify commands for this task: ${task_verify}
Return a concise handoff note with files changed, tests added/updated, and risks.
EOF
}

extract_credits() {
  local input="$1"
  # Best-effort parsing for lines like "Credits: 1234" or "credit remaining 950"
  printf '%s\n' "$input" \
    | grep -Eio 'credits?[^0-9]{0,20}[0-9]+' \
    | grep -Eo '[0-9]+' \
    | head -n 1
}

credit_check_passes() {
  local status_output credits
  if [[ -z "$STATUS_CMD" ]]; then
    log_status "Credit check skipped: STATUS_CMD is not set."
    return 0
  fi

  status_output="$(bash -lc "$STATUS_CMD" 2>/dev/null || true)"
  if [[ -z "$status_output" ]]; then
    log_status "STATUS_CMD produced no output; skipping credit threshold check."
    return 0
  fi

  credits="$(extract_credits "$status_output")"
  if [[ -z "${credits:-}" ]]; then
    log_status "Could not parse credits from STATUS_CMD output; skipping credit threshold check."
    return 0
  fi

  if (( credits < CREDIT_MIN )); then
    log_status "Stopping loop: credits (${credits}) are below CREDIT_MIN (${CREDIT_MIN})."
    return 1
  fi

  log_status "Credit check passed: ${credits} >= ${CREDIT_MIN}"
  return 0
}

run_loop() {
  local i
  log_status "Starting loop: max_iters=${MAX_ITERS}, sleep_sec=${SLEEP_SEC}, todo_file=${TODO_FILE}, agent=${AGENT_NAME}"
  for ((i = 1; i <= MAX_ITERS; i++)); do
    local claim_result task_id task_line task_verify prompt prompt_file

    log_status "Iteration ${i}/${MAX_ITERS}: checking credits."
    if ! credit_check_passes; then
      break
    fi

    log_status "Iteration ${i}/${MAX_ITERS}: claiming next task."
    claim_result="$(claim_next || true)"
    if [[ -z "$claim_result" ]]; then
      log_status "No open TODOs left. Ralph loop complete."
      break
    fi

    task_id="${claim_result%%$'\t'*}"
    task_line="${claim_result#*$'\t'}"
    task_verify="$(extract_verify_cmd "$task_line")"
    log_status "Iteration ${i}/${MAX_ITERS}: claimed ${task_id}; verify='${task_verify}'."
    prompt="$(build_agent_prompt "$task_id" "$task_line" "$task_verify")"
    prompt_file="$(mktemp)"
    printf '%s\n' "$prompt" > "$prompt_file"

    log_status "Iteration ${i}/${MAX_ITERS}: prompt prepared at ${prompt_file}."
    echo "Claimed: $task_id"
    echo "$task_line"

    if [[ -z "$AGENT_RUN_CMD" ]]; then
      echo
      echo "Agent prompt:"
      cat "$prompt_file"
      echo
      log_status "No AGENT_RUN_CMD set; stopping for manual execution."
      rm -f "$prompt_file"
      break
    fi

    log_status "Iteration ${i}/${MAX_ITERS}: running agent command for ${task_id}."
    if TASK_ID="$task_id" TASK_LINE="$task_line" TASK_VERIFY="$task_verify" AGENT_NAME="$AGENT_NAME" AGENT_PROMPT="$prompt" AGENT_PROMPT_FILE="$prompt_file" bash -lc "$AGENT_RUN_CMD"; then
      log_status "Iteration ${i}/${MAX_ITERS}: agent command succeeded for ${task_id}; marking done."
      mark_done "$task_id"
    else
      log_status "Iteration ${i}/${MAX_ITERS}: AGENT_RUN_CMD failed; releasing ${task_id}."
      release_task "$task_id"
      rm -f "$prompt_file"
      exit 1
    fi

    rm -f "$prompt_file"
    log_status "Iteration ${i}/${MAX_ITERS}: cleaned temporary prompt file."

    if (( i < MAX_ITERS )) && (( SLEEP_SEC > 0 )); then
      log_status "Iteration ${i}/${MAX_ITERS}: sleeping ${SLEEP_SEC}s before next task."
      sleep "$SLEEP_SEC"
    fi
  done
  log_status "Loop finished."
}

main() {
  local cmd="${1:-status}"
  ensure_todo_file
  acquire_lock
  trap release_lock EXIT

  case "$cmd" in
    status)
      print_status
      ;;
    claim)
      if claim_next; then
        :
      else
        echo "No open TODOs left."
        exit 1
      fi
      ;;
    done)
      [[ $# -eq 2 ]] || { usage; exit 1; }
      mark_done "$2"
      ;;
    release)
      [[ $# -eq 2 ]] || { usage; exit 1; }
      release_task "$2"
      ;;
    loop)
      run_loop
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
