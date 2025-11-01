#!/usr/bin/env bash
set -euo pipefail

# =========================
# StoryClip Filters E2E Quick Test
# =========================
# Requisitos: curl, jq
# Uso:
#   chmod +x scripts/run_filters_e2e_quick.sh
#   API_BASE="https://story.creatorsflow.app" \
#   API_KEY="sk_xxx_tu_api_key" \
#   INPUT_URL="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4" \
#   scripts/run_filters_e2e_quick.sh

API_BASE="${API_BASE:-https://story.creatorsflow.app}"
API_KEY="${API_KEY:?Falta API_KEY}"
INPUT_URL="${INPUT_URL:?Falta INPUT_URL}"

POLL_INTERVAL="${POLL_INTERVAL:-2}"    # seg
POLL_TIMEOUT="${POLL_TIMEOUT:-480}"    # seg (8 min)

need() { command -v "$1" >/dev/null 2>&1 || { echo "❌ Requiere $1"; exit 1; }; }
need curl; need jq

section() { echo -e "\n\033[1;36m# $*\033[0m"; }
ok() { echo -e "✅ $*"; }
warn() { echo -e "⚠️  $*"; }
fail() { echo -e "❌ $*" >&2; exit 1; }

health_check() {
  section "Health check"
  curl -fsS "$API_BASE/api/health" || fail "Health endpoint no accesible"
  ok "Health OK"
}

create_job() {
  local body="$1"
  local resp
  resp=$(curl -fsS -X POST "$API_BASE/api/render" \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$body")

  echo "$resp" | jq -e '.jobId' >/dev/null || { echo "$resp"; fail "Respuesta inválida al crear job"; }
  echo "$resp" | jq -r '.jobId'
}

poll_job() {
  local job_id="$1"
  local elapsed=0
  while true; do
    local js
    js=$(curl -fsS "$API_BASE/api/render/$job_id" -H "X-API-Key: $API_KEY")
    local st; st=$(echo "$js" | jq -r '.status')
    if [[ "$st" == "completed" ]]; then
      echo "$js"
      return 0
    elif [[ "$st" == "failed" || "$st" == "error" ]]; then
      echo "$js"
      return 2
    fi
    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
    if (( elapsed >= POLL_TIMEOUT )); then
      echo "$js"
      return 3
    fi
  done
}

run_case_quick() {
  local name="$1" body="$2"

  section "Creando job: $name"
  local job_id; job_id=$(create_job "$body")
  ok "jobId: $job_id"

  section "Polling: $name"
  set +e
  local polled; polled=$(poll_job "$job_id")
  local rc=$?
  set -e
  if (( rc == 2 )); then
    echo "$polled" | jq .
    fail "Job $name falló"
  elif (( rc == 3 )); then
    echo "$polled" | jq .
    fail "Job $name TIMEOUT"
  fi

  local out_url; out_url=$(echo "$polled" | jq -r '.outputs[0].url')
  [[ "$out_url" =~ ^http ]] || fail "Sin output.url en respuesta"
  ok "Job $name completado con URL: $out_url"
}

health_check

BODY_A=$(jq -n --arg in "$INPUT_URL" '{
  preset: "storyclip_social_916",
  inputs: [
    {
      src: $in,
      type: "video"
    }
  ],
  overlays: [
    {
      src: "https://dummyimage.com/220x80/000000/ffffff.png&text=StoryClip",
      position: "top-right",
      opacity: 0.8
    }
  ],
  output: {
    format: "mp4",
    quality: "high"
  },
  metadata: {
    title: "PRUEBA_A_filters_basic_quick",
    description: "Test video with filters"
  }
}')
run_case_quick "PRUEBA_A_filters_basic_quick" "$BODY_A"

BODY_B=$(jq -n --arg in "$INPUT_URL" '{
  preset: "storyclip_quality",
  inputs: [
    {
      src: $in,
      type: "video"
    }
  ],
  overlays: [
    {
      src: "https://dummyimage.com/220x80/000000/ffffff.png&text=StoryClip",
      position: "top-right",
      opacity: 0.8
    }
  ],
  output: {
    format: "mp4",
    quality: "high"
  },
  metadata: {
    title: "PRUEBA_B_quality_quick",
    description: "Test video with quality preset"
  }
}')
run_case_quick "PRUEBA_B_quality_quick" "$BODY_B"

BODY_C=$(jq -n --arg in "$INPUT_URL" '{
  preset: "storyclip_av1",
  inputs: [
    {
      src: $in,
      type: "video"
    }
  ],
  overlays: [
    {
      src: "https://dummyimage.com/220x80/000000/ffffff.png&text=StoryClip",
      position: "top-right",
      opacity: 0.8
    }
  ],
  output: {
    format: "mp4",
    quality: "high"
  },
  metadata: {
    title: "PRUEBA_C_av1_quick",
    description: "Test video with AV1 preset"
  }
}')
run_case_quick "PRUEBA_C_av1_quick" "$BODY_C"

ok "E2E Quick Test completado."
