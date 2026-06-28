#!/usr/bin/env bash
# =============================================================
# production-smoke.sh — فحص سريع بعد النشر
#
# أمثلة:
#   /opt/collective-trust/production-smoke.sh
#   BASE_URL=https://stpg.wbgl.tech /opt/collective-trust/production-smoke.sh
# =============================================================

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/docker-compose.prod.yml" ]; then
  COMPOSE_DIR="${COMPOSE_DIR:-${SCRIPT_DIR}}"
elif [ -f "${SCRIPT_DIR}/repo/docker-compose.prod.yml" ]; then
  COMPOSE_DIR="${COMPOSE_DIR:-${SCRIPT_DIR}/repo}"
else
  COMPOSE_DIR="${COMPOSE_DIR:-/opt/collective-trust/repo}"
fi

BASE_URL="${BASE_URL:-https://stpg.wbgl.tech}"
API_URL="${API_URL:-${BASE_URL}/api}"
INTERNAL_BACKEND_URL="${INTERNAL_BACKEND_URL:-http://localhost:3001}"
EXPECT_DEV_LOGIN_DISABLED="${EXPECT_DEV_LOGIN_DISABLED:-true}"
COMPOSE_ENV_ARGS=()
if [ -f "${COMPOSE_DIR}/.env" ]; then
  COMPOSE_ENV_ARGS+=(--env-file "${COMPOSE_DIR}/.env")
elif [ -f "${SCRIPT_DIR}/.env" ]; then
  COMPOSE_ENV_ARGS+=(--env-file "${SCRIPT_DIR}/.env")
elif [ -f "${COMPOSE_DIR}/.env.production.example" ]; then
  COMPOSE_ENV_ARGS+=(--env-file "${COMPOSE_DIR}/.env.production.example")
fi

failures=0

pass() { printf 'PASS  %s\n' "$1"; }
fail() {
  printf 'FAIL  %s\n' "$1" >&2
  failures=$((failures + 1))
}

check_url() {
  local label="$1"
  local url="$2"
  if curl -fsS --max-time 20 "${url}" >/dev/null; then
    pass "${label}"
  else
    fail "${label} (${url})"
  fi
}

check_status() {
  local label="$1"
  local expected="$2"
  local method="$3"
  local url="$4"
  local data="${5:-}"
  local status

  if [ -n "${data}" ]; then
    status="$(curl -sS --max-time 20 -o /tmp/stgp-smoke-response.txt -w '%{http_code}' \
      -X "${method}" -H 'Content-Type: application/json' --data "${data}" "${url}" || true)"
  else
    status="$(curl -sS --max-time 20 -o /tmp/stgp-smoke-response.txt -w '%{http_code}' \
      -X "${method}" "${url}" || true)"
  fi

  if [ "${status}" = "${expected}" ]; then
    pass "${label}"
  else
    fail "${label} expected ${expected}, got ${status}"
  fi
}

printf 'CollectiveTrustOS production smoke\n'
printf 'BASE_URL=%s\n' "${BASE_URL}"

check_url "frontend public page" "${BASE_URL}/"
check_url "public backend health via Caddy" "${BASE_URL}/health"
check_url "internal backend health" "${INTERNAL_BACKEND_URL}/health"
check_url "Swagger JSON" "${API_URL}/docs-json"

if [ "${EXPECT_DEV_LOGIN_DISABLED}" = "true" ]; then
  check_status "developer login disabled in production" "403" "POST" \
    "${API_URL}/auth/dev-login" '{"username":"seed.ahmed.family"}'
fi

if command -v docker >/dev/null && [ -f "${COMPOSE_DIR}/docker-compose.prod.yml" ]; then
  if docker compose "${COMPOSE_ENV_ARGS[@]}" -f "${COMPOSE_DIR}/docker-compose.prod.yml" ps --services --filter status=running | grep -qx opensearch; then
    if docker compose "${COMPOSE_ENV_ARGS[@]}" -f "${COMPOSE_DIR}/docker-compose.prod.yml" exec -T opensearch \
      curl -fsS 'http://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=5s' >/dev/null; then
      pass "OpenSearch internal health"
    else
      fail "OpenSearch internal health"
    fi
  else
    fail "OpenSearch service is not running"
  fi

  if docker compose "${COMPOSE_ENV_ARGS[@]}" -f "${COMPOSE_DIR}/docker-compose.prod.yml" ps --services --filter status=running | grep -qx temporal; then
    if docker compose "${COMPOSE_ENV_ARGS[@]}" -f "${COMPOSE_DIR}/docker-compose.prod.yml" exec -T temporal \
      temporal operator cluster health --address temporal:7233 >/dev/null 2>&1; then
      pass "Temporal internal health"
    else
      fail "Temporal internal health"
    fi
  else
    fail "Temporal service is not running"
  fi
fi

if [ "${failures}" -gt 0 ]; then
  printf '\nSmoke failed: %s check(s)\n' "${failures}" >&2
  exit 1
fi

printf '\nSmoke passed.\n'
