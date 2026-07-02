#!/usr/bin/env bash
# =============================================================
# backup.sh — نسخ احتياطي يومي لقاعدة البيانات والمرفقات
# الموقع على السيرفر: /opt/collective-trust/backup.sh
# جدولة cron (يومياً الساعة 2 صباحاً):
#   0 2 * * * /opt/collective-trust/backup.sh >> /var/log/stgp-backup.log 2>&1
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
KEEP_DAYS="${KEEP_DAYS:-14}"
DATE=$(date +%Y-%m-%d_%H-%M)
DB_NAME="${DB_NAME:-stgp_prod}"
DB_USER="${DB_USER:-postgres}"

if [ ! -f "${COMPOSE_DIR}/docker-compose.prod.yml" ]; then
  echo "لم يتم العثور على docker-compose.prod.yml في: ${COMPOSE_DIR}" >&2
  exit 1
fi

# تحميل متغيرات البيئة
if [ -f "${ROOT_DIR}/.env" ]; then
  # shellcheck disable=SC1091
  set -o allexport
  source "${ROOT_DIR}/.env"
  set +o allexport
elif [ -f "${COMPOSE_DIR}/.env" ]; then
  # shellcheck disable=SC1091
  set -o allexport
  source "${COMPOSE_DIR}/.env"
  set +o allexport
fi

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "بدء النسخ الاحتياطي — ${DATE}"
log "مسار Docker Compose: ${COMPOSE_DIR}"

cd "${COMPOSE_DIR}"

# ── إنشاء مجلدات النسخ ──────────────────────────────────────
mkdir -p "${BACKUP_DIR}/db"
mkdir -p "${BACKUP_DIR}/uploads"

# ── نسخ احتياطي من PostgreSQL ───────────────────────────────
DB_FILE="${BACKUP_DIR}/db/stgp_${DATE}.sql.gz"
log "نسخ قاعدة البيانات إلى: ${DB_FILE}"

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump --clean --if-exists --no-owner --no-privileges -U "${DB_USER}" "${DB_NAME}" | gzip > "${DB_FILE}"

log "حجم ملف قاعدة البيانات: $(du -sh "${DB_FILE}" | cut -f1)"

# ── نسخ احتياطي من المرفقات ─────────────────────────────────
UPLOADS_FILE="${BACKUP_DIR}/uploads/uploads_${DATE}.tar.gz"
log "ضغط مجلد المرفقات إلى: ${UPLOADS_FILE}"

if [ -d "${UPLOADS_DIR}" ] && [ -n "$(find "${UPLOADS_DIR}" -mindepth 1 -maxdepth 1 -print -quit)" ]; then
  tar -czf "${UPLOADS_FILE}" -C "${UPLOADS_DIR}" .
  log "حجم ملف المرفقات: $(du -sh "${UPLOADS_FILE}" | cut -f1)"
else
  log "مجلد المرفقات فارغ أو غير موجود — تم تخطيه"
fi

# ── حذف النسخ القديمة ───────────────────────────────────────
log "حذف النسخ الأقدم من ${KEEP_DAYS} يوم"
find "${BACKUP_DIR}/db" -name "*.sql.gz" -mtime "+${KEEP_DAYS}" -delete
find "${BACKUP_DIR}/uploads" -name "*.tar.gz" -mtime "+${KEEP_DAYS}" -delete

# ── ملخص ────────────────────────────────────────────────────
log "النسخ الاحتياطية الموجودة:"
log "  قاعدة البيانات: $(ls -1 "${BACKUP_DIR}/db" | wc -l) ملف"
log "  المرفقات:       $(ls -1 "${BACKUP_DIR}/uploads" | wc -l) ملف"
log "انتهى النسخ الاحتياطي بنجاح"
