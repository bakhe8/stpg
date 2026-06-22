#!/bin/bash
# deploy.sh — سكريبت النشر على Hostinger VPS (Ubuntu 24.04)
# التشغيل: bash deploy.sh
# يُشغَّل هذا السكريبت على السيرفر مباشرة كمستخدم root

set -e

APP_DIR="/opt/collective-trust"
REPO_URL="https://github.com/bakhe8/stpg.git"   # ← غيّر هذا
BRANCH="main"

echo "═══════════════════════════════════════"
echo "  CollectiveTrustOS — Deploy Script"
echo "═══════════════════════════════════════"

# ── 1. تثبيت Docker إذا لم يكن موجوداً ────────────────────
if ! command -v docker &> /dev/null; then
  echo "▶ تثبيت Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "✓ Docker مثبت"
else
  echo "✓ Docker موجود: $(docker --version)"
fi

# ── 2. إنشاء مجلدات النظام ─────────────────────────────────
echo "▶ إنشاء مجلدات النظام..."
mkdir -p "$APP_DIR/uploads"
mkdir -p "$APP_DIR/backups"
chmod 755 "$APP_DIR/uploads"
echo "✓ المجلدات جاهزة"

# ── 3. نسخ/تحديث الكود ─────────────────────────────────────
if [ -d "$APP_DIR/repo/.git" ]; then
  echo "▶ تحديث الكود من git..."
  cd "$APP_DIR/repo"
  git pull origin "$BRANCH"
else
  echo "▶ استنساخ المستودع..."
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR/repo"
  cd "$APP_DIR/repo"
fi
echo "✓ الكود محدث"

# ── 4. التحقق من ملف البيئة ────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  echo ""
  echo "⚠ ملف .env غير موجود!"
  echo "أنشئ الملف بتشغيل:"
  echo "  cp $APP_DIR/repo/.env.production.example $APP_DIR/.env"
  echo "  nano $APP_DIR/.env"
  echo ""
  echo "ثم أعد تشغيل السكريبت."
  exit 1
fi

# نسخ ملف البيئة لمجلد الكود (docker compose يقرأه من نفس المجلد)
cp "$APP_DIR/.env" "$APP_DIR/repo/.env"
echo "✓ ملف .env جاهز"

# ── 5. بناء وتشغيل الحاويات ────────────────────────────────
cd "$APP_DIR/repo"
echo "▶ بناء صور Docker (قد يأخذ 5-10 دقائق)..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "▶ تشغيل الخدمات..."
docker compose -f docker-compose.prod.yml up -d

echo "▶ انتظار جاهزية الخدمات..."
sleep 15

# ── 6. التحقق من حالة الخدمات ──────────────────────────────
echo ""
echo "═══════════════════════════════════════"
echo "  حالة الخدمات:"
echo "═══════════════════════════════════════"
docker compose -f docker-compose.prod.yml ps

# ── 7. اختبار Health Check ─────────────────────────────────
echo ""
echo "▶ اختبار الاتصال بالباكند..."
if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
  echo "✓ الباكند يعمل"
else
  echo "⚠ الباكند لم يستجب بعد — قد يحتاج وقتاً أطول"
  echo "  تحقق بـ: docker compose -f docker-compose.prod.yml logs backend"
fi

echo ""
echo "═══════════════════════════════════════"
echo "  ✓ اكتمل النشر!"
echo ""
echo "  الموقع: https://stpg.wbgl.tech"
echo "  API:    https://stpg.wbgl.tech/api"
echo "  Docs:   https://stpg.wbgl.tech/api/docs"
echo ""
echo "  لمتابعة السجلات:"
echo "  docker compose -f docker-compose.prod.yml logs -f"
echo "═══════════════════════════════════════"
