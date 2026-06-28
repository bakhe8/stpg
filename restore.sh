#!/usr/bin/env bash
# =============================================================
# restore.sh — استعادة قاعدة البيانات والمرفقات من نسخة احتياطية
#
# استخدام آمن على السيرفر:
#   CONFIRM_RESTORE=stgp_prod /opt/collective-trust/restore.sh latest latest
#
# الوسيط الأول: ملف قاعدة البيانات أو latest
# الوسيط الثاني: ملف المرفقات أو latest أو skip
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

ROOT_DIR="${ROOT_DIR:-/opt/collective-trust}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
UPLOADS_DIR="${UPLOADS_DIR:-${ROOT_DIR}/uploads}"
DB_NAME="${DB_NAME:-stgp_prod}"
DB_USER="${DB_USER:-postgres}"
DB_BACKUP="${1:-latest}"
UPLOADS_BACKUP="${2:-skip}"

if [ "${CONFIRM_RESTORE:-}" != "${DB_NAME}" ]; then
  echo "رفض الاستعادة: اضبط CONFIRM_RESTORE=${DB_NAME} لتأكيد العملية." >&2
  exit 2
fi

if [ -f "${ROOT_DIR}/.env" ]; then
  set -o allexport
  # shellcheck disable=SC1090
  source "${ROOT_DIR}/.env"
  set +o allexport
fi

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

latest_file() {
  local dir="$1"
  local pattern="$2"
  find "${dir}" -type f -name "${pattern}" -printf '%T@ %p\n' \
    | sort -nr \
    | head -n 1 \
    | cut -d' ' -f2-
}

if [ "${DB_BACKUP}" = "latest" ]; then
  DB_BACKUP="$(latest_file "${BACKUP_DIR}/db" '*.sql.gz')"
fi

if [ -z "${DB_BACKUP}" ] || [ ! -f "${DB_BACKUP}" ]; then
  echo "لم يتم العثور على نسخة قاعدة البيانات: ${DB_BACKUP}" >&2
  exit 1
fi

if [ "${UPLOADS_BACKUP}" = "latest" ]; then
  UPLOADS_BACKUP="$(latest_file "${BACKUP_DIR}/uploads" '*.tar.gz')"
fi

cd "${COMPOSE_DIR}"

log "بدء الاستعادة من قاعدة البيانات: ${DB_BACKUP}"
log "إيقاف خدمات التطبيق مؤقتاً"
docker compose -f docker-compose.prod.yml stop backend frontend caddy

log "إعادة ضبط schema public"
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 <<SQL
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SQL

log "استعادة قاعدة البيانات"
gunzip -c "${DB_BACKUP}" | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1

log "إعادة تطبيق صلاحيات مستخدم التطبيق"
docker compose -f docker-compose.prod.yml run --rm db-init

if [ "${UPLOADS_BACKUP}" != "skip" ]; then
  if [ -z "${UPLOADS_BACKUP}" ] || [ ! -f "${UPLOADS_BACKUP}" ]; then
    echo "لم يتم العثور على نسخة المرفقات: ${UPLOADS_BACKUP}" >&2
    exit 1
  fi

  log "استعادة المرفقات من: ${UPLOADS_BACKUP}"
  mkdir -p "${UPLOADS_DIR}"
  find "${UPLOADS_DIR}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  tar -xzf "${UPLOADS_BACKUP}" -C "${UPLOADS_DIR}"
fi

log "إعادة تشغيل الخدمات"
docker compose -f docker-compose.prod.yml up -d backend frontend caddy

log "انتهت الاستعادة بنجاح"
