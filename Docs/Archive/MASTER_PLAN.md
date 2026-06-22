# خطة التنفيذ الكاملة — CollectiveTrustOS / STGP
# Master Implementation Plan

> آخر تحديث: 2026-06-22
> الحالة: قيد التنفيذ — يُحدَّث بعد إنجاز كل بند
> المرجع الأساسي: `Docs/07_Frontend/`, `PLATFORM_LAYER_IMPLEMENTATION.md`, `Docs/IMPLEMENTATION_GAP_MATRIX.md`

---

## الحالة الراهنة — ما اكتمل ✅

| المجال | التفاصيل |
|---|---|
| Schema كامل | Prisma + كل المودلات + PlatformSuspensionAppeal + bankAccount |
| Auth Layer | OTP tenant + email/password platform + JWT مزدوج |
| Platform Layer | Guard + Interceptor + PlatformAccount + AccessLog |
| حالات الكيان | ACTIVE / SUSPENDED / READ_ONLY / PENDING_REVIEW |
| تصدير البيانات | GET /entities/:id/export + زر frontend |
| اعتراض التعليق | POST /entities/:id/platform-appeal + نموذج frontend |
| PlatformStatusBanner | export + appeal + access log |
| Dashboard | Action-Oriented "المطلوب مني الآن" |
| 29 صفحة frontend | كل مسارات (main) + مسارات platform الثلاث |
| Review Center | كيان/[id]/review — 5 تبويبات |
| i18n | ar + en كامل |
| **المرحلة 1** ✅ | Platform Dashboard: Appeals view + nav + pending counter |
| **المرحلة 2** ✅ | ConfirmActionDialog + StatusBadge + AccessReasonPanel + RequestTimeline + VisibilityNotice |
| **المرحلة 3** ✅ | portal (role+status meta) + disbursements (ConfirmDialog) + disbursement-requests (ConfirmDialog) + review (StatusBadge+ConfirmDialog) + wallets (RuleSummaryPanel) + bank fields |
| **المرحلة 4** ✅ | PolicyBuilder component + policy impact endpoint + rules page (tabs) |
| **المرحلة 5** ✅ | صفحة health + 7 مؤشرات + nav link |
| **المرحلة 6** ✅ | closure-checklist + request-closure (backend) + settings page (إعدادات + طلب إغلاق + checklist) |
| **المرحلة 7** ✅ | dashboard timeline للطلبات + join page policy terms + notifications membership icons |
| **المرحلة 9** ✅ | docker-compose.prod.yml + Caddyfile + .env.production.example + backup.sh + GET /health endpoint |

---

## المرحلة 1 — Platform Dashboard: رؤية الاعتراضات
**الوقت المقدر: 2-3 ساعات | الأولوية: عالية | يعتمد على: لا شيء**

### 1.1 صفحة الاعتراضات في لوحة المنصة

**الملف الجديد:** `frontend/src/app/platform/appeals/page.tsx`

ما تعرضه:
- قائمة `PlatformSuspensionAppeal` من `GET /platform/appeals`
- فلتر الحالة: PENDING / REVIEWED / RESOLVED
- لكل اعتراض: اسم المُرسِل، entityId، السبب، التاريخ
- زر "الرد" يفتح textarea + حفظ → `PATCH /platform/appeals/:id/respond`
- رسالة تأكيد بعد الرد

**الملف الجديد:** `frontend/src/app/platform/appeals/appeals.module.css`

**تعديل:** `frontend/src/app/platform/layout.tsx`
- أضف رابط "الاعتراضات" في sidebar المنصة

**تعديل:** `frontend/src/lib/api/platform.ts`
- أضف `getAppeals(status?)`, `respondToAppeal(id, response, status)`

### 1.2 عداد الاعتراضات المعلقة في Platform Dashboard

**تعديل:** `frontend/src/app/platform/page.tsx`
- أضف `pendingAppeals` counter في الهيدر (قيمة من GET /platform/appeals?status=PENDING)

---

## المرحلة 2 — مكونات UX الأساسية المشتركة
**الوقت المقدر: يوم كامل | الأولوية: عالية | يعتمد على: لا شيء**

هذه مكونات تُستخدم في أكثر من 10 صفحات — تُبنى أولاً ثم تُحقن.

### 2.1 ConfirmActionDialog — نافذة تأكيد القرارات الحساسة

**الملف الجديد:** `frontend/src/components/shared/ConfirmActionDialog.tsx`

```tsx
interface Props {
  title: string;           // "اعتماد صرف 5,000 ريال"
  description: string;     // "سيظهر في التقرير..."
  confirmLabel: string;    // "تأكيد الاعتماد"
  danger?: boolean;        // لون أحمر للإجراءات الخطيرة
  onConfirm: () => void;
  onCancel: () => void;
}
```

يُستخدم في: اعتماد الصرف، رفض العضو، نقل الرصيد، تغيير قاعدة، حل النزاع

**الملف الجديد:** `frontend/src/components/shared/ConfirmActionDialog.module.css`

### 2.2 StatusBadge — شارة الحالة الموحّدة

**الملف الجديد:** `frontend/src/components/shared/StatusBadge.tsx`

```tsx
// يوحّد ألوان الحالات عبر كل الصفحات
type StatusType =
  | 'active' | 'inactive'           // عضوية
  | 'paid' | 'overdue' | 'pending'  // مدفوعات
  | 'approved' | 'rejected'         // قرارات
  | 'open' | 'resolved' | 'closed'  // نزاعات
  | 'suspended' | 'read_only';      // منصة
```

نظام الألوان:
- أخضر: مكتمل / نشط / مدفوع
- أصفر: بانتظار / قيد المراجعة
- أحمر: متأخر / مرفوض / معلق
- رمادي: مغلق / مؤرشف
- أزرق: معلومات / قراءة فقط

### 2.3 AccessReasonPanel — "لماذا لا أستطيع؟"

**الملف الجديد:** `frontend/src/components/shared/AccessReasonPanel.tsx`

```tsx
interface Props {
  reason: string;      // "لا يمكنك التصويت على هذا القرار"
  explanation: string; // "لأنك لست مشتركاً في مسار مجلس الإدارة"
  icon?: string;
}
```

يُستخدم في: portal (عند خطأ 403)، subscriptions، disbursement-requests

**حقن فوري بعد البناء في:**
- `portal/page.tsx` — عند أخطاء API
- `disbursement-requests/page.tsx` — عند رفض الإنشاء
- `subscriptions/page.tsx` — عند خطأ ENTITY_SUSPENDED

### 2.4 TimelineView — سجل زمني مرئي

**الملف الجديد:** `frontend/src/components/shared/TimelineView.tsx`

```tsx
interface TimelineStep {
  label: string;
  at?: string | null;   // ISO date
  done: boolean;
  active?: boolean;
  note?: string;        // ملاحظة اختيارية
}
interface Props {
  steps: TimelineStep[];
}
```

يُستخدم في (حقن فوري):
- `finance/page.tsx` — بناء Timeline للإيصال (موجود جزئياً، يُوحَّد)
- `disbursements/page.tsx` — Timeline لطلب الصرف
- `disputes/[id]/page.tsx` — Timeline النزاع

### 2.5 SensitiveDataMask — إخفاء البيانات الحساسة

**الملف الجديد:** `frontend/src/components/shared/SensitiveDataMask.tsx`

```tsx
interface Props {
  label: string;          // "اسم المستفيد"
  reason: string;         // "مخفي — حالة صحية حساسة"
  visibleTo?: string;     // "مرئي للجنة فقط"
}
// يعرض: 🔒 اسم المستفيد — مخفي | [سبب الإخفاء]
```

يُستخدم في: auditor/page.tsx، disbursements/page.tsx

---

## المرحلة 3 — تحسين صفحات موجودة
**الوقت المقدر: يومان | الأولوية: عالية**

### 3.1 Finance — مطابقة الإيصال (PaymentMatchPanel)

**تعديل:** `frontend/src/app/(main)/finance/page.tsx`

في شاشة مراجعة الإيصال (دور أمين الصندوق) أضف مقارنة واضحة:
```text
المبلغ المطلوب حسب القاعدة: 100 ريال
المبلغ المرفوع: 100 ريال  ✓ مطابق
العضو: أحمد محمد
المحفظة: الاشتراكات العامة
الفترة: يونيو 2026
```
- اجلب `subscription.amount` من API وقارنه بـ `paymentRecord.amount`
- أضف شارة "✓ مطابق" أو "⚠ فرق: X ريال"

### 3.2 Portal — بوابة العضو الحقيقية

**تعديل:** `frontend/src/app/(main)/portal/page.tsx`

أضف قسم "محافظي" بدل قائمة الفواتير الجافة:
```text
محفظة الاشتراكات العامة
  دورك: عضو فعال
  حالتك: منتظم ✓
  آخر دفع: يونيو 2026 — 100 ريال
  [عرض التفاصيل]
```
- اجلب `getWallets()` للكيانات التي العضو فيها
- اعرض role (عضو / لجنة / مستفيد) من membership + path

### 3.3 Disbursement Requests — نافذة تأكيد + Timeline

**تعديل:** `frontend/src/app/(main)/disbursement-requests/page.tsx`

- أضف `ConfirmActionDialog` قبل رفع طلب صرف جديد
- أضف `TimelineView` في تفاصيل الطلب:
  ```
  1. رُفع الطلب ✓
  2. قيد مراجعة اللجنة (نشط)
  3. النتيجة
  ```

### 3.4 Disbursements — نافذة تأكيد القبول/الرفض

**تعديل:** `frontend/src/app/(main)/disbursements/page.tsx`

- غلّف كل زر "اعتماد" و"رفض" بـ `ConfirmActionDialog`
- نص الاعتماد: "أنت على وشك اعتماد صرف {amount} ريال من محفظة {wallet}. سيظهر في التقرير المالي ولا يمكن التراجع."
- نص الرفض: "هل تريد رفض هذا الطلب؟ سيُشعَر مقدمه."

### 3.5 Review Center — تأكيدات وشارات موحّدة

**تعديل:** `frontend/src/app/(main)/entities/[id]/review/page.tsx`

- استبدل ألوان الحالات المشتتة بـ `<StatusBadge>`
- غلّف أزرار الموافقة/الرفض بـ `ConfirmActionDialog`
- في MembershipApplicationsTab: أضف Timeline لمسار الاعتماد

### 3.6 Wallets — صفحة سياق المحفظة

**تعديل:** `frontend/src/app/(main)/wallets/[id]/page.tsx`

أضف في أعلى الصفحة قسم "قواعد هذه المحفظة":
```text
من يساهم؟    كل أعضاء الكيان
من يستفيد؟   بحسب بنود الصرف
من يوافق؟    لجنة من 3 أعضاء
من يرى؟      المشتركون (بدون أسماء المستفيدين الحساسة)
```
- اجلب `getPolicy()` وترجم حقول الشفافية لجمل عربية

### 3.7 Entities Detail — إضافة زر نسخ الحساب البنكي

**تعديل:** `backend/src/entities/entities.service.ts` + Schema

- أضف حقل `bankAccountNumber String?` و `bankName String?` لـ Entity
- تشغيل `prisma db push`
- أضف في `GET /entities/:id` هذين الحقلين
- في `frontend/src/app/(main)/entities/[id]/page.tsx`:
  - أضف قسم "للتحويل البنكي" مع زر نسخ `navigator.clipboard.writeText()`

---

## المرحلة 4 — Rule Builder الكامل
**الوقت المقدر: يومان | الأولوية: عالية | يعتمد على: لا شيء**

> الفلسفة: "مصمم القواعد ليس إعدادات تقنية، بل حوار: من يساهم؟ من يستفيد؟ من يوافق؟"

### 4.1 تحسين صفحة Rules الموجودة

**تعديل:** `frontend/src/app/(main)/rules/page.tsx`

أعد هيكلة الصفحة لتعرض القواعد كأسئلة:

**القسم أ — العضوية**
- من يحق له الانضمام؟ (يدوي / مفتوح / بدعوة)
- هل يحتاج تزكية؟
- كم مدة التجربة قبل العضوية الكاملة؟

**القسم ب — المساهمات**
- المبلغ الشهري للاشتراك
- هل يُقبل الدفع الجزئي؟
- كم يوم سماح قبل اعتبار العضو متأخراً؟
- هل يوجد إعفاء؟ (ومن يمنحه؟)

**القسم ج — الصرف والحوكمة**
- من يوافق على الصرف؟ (فردي / لجنة / تصويت)
- هل للتصويت نصاب؟ (نسبة مئوية)
- هل يُسمح بالاعتراض؟ كم يوم للاعتراض؟

**القسم د — الشفافية**
- من يرى تفاصيل الصرف؟ (الكل / اللجنة / المراجع)
- هل تُكشف أسماء المستفيدين؟

كل سؤال → يحدّث `PATCH /entities/:id/policy` مباشرة بـ debounce أو زر حفظ واحد في النهاية.

### 4.2 Policy Change Preview

**قبل حفظ أي تعديل على القواعد، أعرض:**
```text
هذا التغيير سيؤثر على:
• 43 عضواً بحاجة مراجعة الشروط الجديدة
• 8 أعضاء اشترطوا لجنة — سيُحتاج إشعارهم
يبدأ التطبيق: فوراً / بعد X يوم

[تطبيق التغيير] [رجوع]
```

**Backend جديد:** `GET /entities/:id/policy/impact?field=X&value=Y`
- يعود بعدد الأعضاء المتأثرين
- يعود بقائمة الحقول التي ستتغير

**ملف جديد:** `backend/src/entities/dto/policy-impact-query.dto.ts`
**تعديل:** `entities.service.ts` + `entities.controller.ts`

---

## المرحلة 5 — Fund Health Center
**الوقت المقدر: يوم ونصف | الأولوية: متوسطة | يعتمد على: analytics endpoint**

### 5.1 صفحة صحة الصندوق (Tenant)

**ملف جديد:** `frontend/src/app/(main)/health/page.tsx`

7 مؤشرات من وثيقة `fund_health_center.md`:
1. **إرهاق الدفع** — نسبة التأخر مقارنة بالأشهر الـ 3 السابقة
2. **إرهاق التصويت** — نسبة المشاركة في التصويتات (تنبيه إذا < 30%)
3. **مسارات الحوكمة الضعيفة** — مسارات بأقل من X أعضاء
4. **محافظ شبه ميتة** — محافظ بدون حركة > 6 أشهر
5. **رصيد دون حد الأمان** — أقل من 3× متوسط طوارئ
6. **كثرة الاعتراضات** — > 5 نزاعات مفتوحة
7. **قرارات خارج النظام** — نسبة تسويات بأثر رجعي

**Backend جديد:** `GET /entities/:id/health`
- ملف: `backend/src/analytics/analytics.controller.ts` (أضف endpoint)
- ملف: `backend/src/analytics/analytics.service.ts` (أضف `getEntityHealth(entityId)`)
- يعود بـ: `{ indicator: string, status: 'good'|'warning'|'critical', value: number, message: string }[]`

**ملف CSS جديد:** `frontend/src/app/(main)/health/health.module.css`

**تعديل:** `frontend/src/app/(main)/layout.tsx`
- أضف رابط "صحة الصندوق" في القائمة الجانبية

### 5.2 صحة الصندوق في Platform Dashboard

**تعديل:** `frontend/src/app/platform/page.tsx`

أضف قسم "إنذارات المنصة":
- كم كيان به مؤشر critical؟
- كم كيان لم يسجّل حركة > 30 يوم؟
- عدد الاعتراضات المعلقة على مستوى المنصة

**Backend جديد:** `GET /platform/health-summary` (في platform-entities.controller.ts)

---

## المرحلة 6 — الإغلاق والأرشفة
**الوقت المقدر: يوم | الأولوية: متوسطة | يعتمد على: لا شيء**

### 6.1 Backend — Closure Workflow

**تعديل Schema:**
- حقل `closureStatus String? @default(null)` في Entity: `PENDING_CLOSURE | CLOSED | ARCHIVED`
- `closureRequestedAt DateTime?`
- `closureReason String?`
- أضف `closeEntity(entityId, requesterId, reason)` في `entities.service.ts`
- Checklist قبل الإغلاق: لا طلبات صرف مفتوحة، لا نزاعات حرجة، الرصيد صفر أو منقول

**Backend جديد:**
- `POST /entities/:id/request-closure` — مؤسس يطلب إغلاق
- `GET /entities/:id/closure-checklist` — يعود بالشروط: ✓/✗

### 6.2 Frontend — شاشة طلب الإغلاق

**ملف جديد:** `frontend/src/app/(main)/entities/[id]/settings/page.tsx`

يحتوي على:
- إعدادات الكيان الحالية (اسم، وصف، شعار)
- قسم "إغلاق الكيان" — يظهر فقط للمؤسس
- Checklist تفاعلي: ✓ لا طلبات مفتوحة، ✓ رصيد صفر، ✓ تم الإشعار
- زر "طلب الإغلاق" يُفعَّل بعد اكتمال الـ Checklist

---

## المرحلة 7 — رحلة الانضمام المحسّنة
**الوقت المقدر: يوم | الأولوية: متوسطة**

> الهدف: مسار الانضمام يعكس الحوكمة الاجتماعية — طلب ينتظر اعتماداً، لا مجرد تسجيل.

### 7.1 شاشة حالة الطلب (للطالب)

**تعديل:** `frontend/src/app/(main)/dashboard/page.tsx`

الـ Dashboard يعرض طلبات الانضمام المعلقة مع مسار الاعتماد:
```text
طلبك للانضمام لصندوق عائلة آل X
──────────────────────────────
✓ تم تقديم الطلب
⏳ مراجعة المدير (ينتظر)
○ تفعيل العضوية

[عرض التفاصيل]
```
هذا موجود جزئياً — أضف `TimelineView` للمسار

### 7.2 إشعار فوري عند قبول/رفض الطلب

**تعديل:** `frontend/src/app/(main)/notifications/page.tsx`

- أضف أيقونة + لون مميز لإشعارات العضوية
- رابط يذهب مباشرة للكيان إذا قُبل، أو لإعادة التقديم إذا رُفض

### 7.3 شاشة دعوة محسّنة (للمدعو)

**تعديل:** `frontend/src/app/join/[token]/page.tsx` (إذا وجد)

- أضف عرض "شروط المحفظة" قبل الموافقة على الانضمام
- أضف Snapshot الشروط وقت قبول الدعوة

---

## المرحلة 8 — مزود SMS الحقيقي
**الوقت المقدر: نصف يوم | الأولوية: عالية قبل الإنتاج**

### 8.1 تكوين مزود SMS

**الملف الموجود:** `backend/src/identity/auth/auth.service.ts`

استبدل `console.log(otp)` بـ:
```typescript
// Unifonic أو Twilio — حسب API key المتوفر
await this.smsProvider.send(phoneNumber, `رمز التحقق: ${otp}`);
```

**ملف جديد:** `backend/src/common/sms/sms.service.ts`

```typescript
// SmsProvider abstraction
interface SmsProvider {
  send(to: string, message: string): Promise<void>;
}

// Implementations:
class UnifonicProvider implements SmsProvider { ... }
class TwilioProvider implements SmsProvider { ... }
class MockProvider implements SmsProvider { ... } // للتطوير
```

**متغيرات البيئة المطلوبة:**
```env
SMS_PROVIDER=unifonic   # unifonic | twilio | mock
UNIFONIC_API_KEY=xxx
UNIFONIC_SENDER_ID=CollectiveTrust
```

---

## المرحلة 9 — استعداد الإنتاج (Production Readiness)
**الوقت المقدر: يومان | الأولوية: حرجة قبل أي نشر**

### 9.1 Docker Compose

**ملف جديد:** `docker-compose.yml` في جذر المشروع

خدمات:
```yaml
services:
  frontend:    # Next.js — المنفذ 3000
  backend:     # NestJS — المنفذ 3001
  postgres:    # PostgreSQL 16 — المنفذ 5432 (داخلي فقط)
  redis:       # Redis 7 — المنفذ 6379 (داخلي فقط)
  caddy:       # Reverse Proxy — المنفذان 80 و 443
```

### 9.2 Caddy Configuration

**ملف جديد:** `Caddyfile`

```
stgp.domain.com {
  handle /api/* {
    reverse_proxy backend:3001
  }
  handle {
    reverse_proxy frontend:3000
  }
}

platform.stgp.domain.com {
  reverse_proxy frontend:3000
}
```

### 9.3 Environment Variables

**ملف جديد:** `.env.production.example`

```env
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/stgp_prod

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
PLATFORM_JWT_SECRET=

# SMS
SMS_PROVIDER=unifonic
UNIFONIC_API_KEY=
UNIFONIC_SENDER_ID=CollectiveTrust

# App
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://stgp.domain.com/api
```

### 9.4 سكريبت النسخ الاحتياطي اليومي

**ملف جديد:** `scripts/backup.sh`

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/collective-trust/backups

# Postgres dump
docker exec postgres pg_dump -U user stgp_prod \
  | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Uploads backup
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" \
  /opt/collective-trust/uploads

# احتفظ بآخر 7 نسخ فقط
ls -t "$BACKUP_DIR"/db_*.sql.gz | tail -n +8 | xargs rm -f
ls -t "$BACKUP_DIR"/uploads_*.tar.gz | tail -n +8 | xargs rm -f
```

**ملف جديد:** `scripts/crontab.txt`

```
0 2 * * * /opt/collective-trust/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### 9.5 Health Check Endpoint

**تعديل:** `backend/src/app.module.ts` أو controller مستقل

```typescript
@Get('/health')
health() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

في `docker-compose.yml`:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### 9.6 Dockerfiles

**ملف جديد:** `backend/Dockerfile`
**ملف جديد:** `frontend/Dockerfile`

Backend:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/main"]
```

Frontend:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
CMD ["npm", "start"]
```

---

## المرحلة 10 — تلميع وتوحيد UX (Mobile + Microcopy)
**الوقت المقدر: يوم | الأولوية: قبل إطلاق المستخدمين**

### 10.1 الاستجابة للجوال

**تعديل:** `frontend/src/app/(main)/layout.tsx`

- أضف Bottom Navigation للجوال (< 768px):
  ```
  [الرئيسية] [كياناتي] [المراجعات] [إشعارات] [الملف]
  ```
- الجداول الكبيرة → تحوّل لبطاقات في الجوال

**تعديل شامل لملفات CSS:**
- `dashboard.module.css`: responsive grid للمهام
- `entities.module.css`: بطاقات بدل جدول في الجوال
- `finance.module.css`: قائمة رأسية بدل جدول
- `review-center.module.css`: بطاقات قابلة للنقر

### 10.2 Microcopy العربي — المصطلحات

أضف ملف مرجع وحدّث i18n:

| مصطلح تقني | البديل العربي |
|---|---|
| Submit | إرسال الطلب |
| Approve | اعتماد |
| Reject | رفض مع توضيح |
| Pending | بانتظار المراجعة |
| Eligibility Rule | شروط الاستفادة |
| Governance Path | مسار الحوكمة |
| Quorum | نصاب التصويت |

**تعديل:** `frontend/src/locales/ar/*.json` — مراجعة شاملة للمصطلحات

### 10.3 Empty States محسّنة

في كل صفحة تظهر فارغة، بدل نص جاف:
```text
لا توجد مراجعات معلقة
✓ كل الإيصالات وطلبات الصرف تمت مراجعتها
آخر مراجعة: [التاريخ]
```

**الصفحات المستهدفة:**
- `review/page.tsx` — كل تبويب
- `disbursements/page.tsx`
- `disputes/page.tsx`
- `notifications/page.tsx`

---

## ترتيب التنفيذ المقترح

```
الأسبوع 1:
  ├── المرحلة 1: Platform Appeals View         [2-3 ساعات]
  ├── المرحلة 2: المكونات المشتركة             [يوم]
  └── المرحلة 3.4: Disbursements تأكيدات      [ساعة]

الأسبوع 2:
  ├── المرحلة 3 (باقيها): Finance + Portal + Wallets
  └── المرحلة 4: Rule Builder الكامل          [يومان]

الأسبوع 3:
  ├── المرحلة 5: Fund Health Center           [يوم ونصف]
  ├── المرحلة 6: إغلاق وأرشفة                [يوم]
  └── المرحلة 7: رحلة الانضمام               [يوم]

الأسبوع 4:
  ├── المرحلة 8: SMS Provider                [نصف يوم]
  ├── المرحلة 9: Production Readiness        [يومان]
  └── المرحلة 10: Mobile + Microcopy         [يوم]
```

---

## الملفات الجديدة الكاملة — فهرس

### Frontend — ملفات جديدة
```
frontend/src/app/platform/appeals/
  page.tsx
  appeals.module.css

frontend/src/app/(main)/health/
  page.tsx
  health.module.css

frontend/src/app/(main)/entities/[id]/settings/
  page.tsx
  settings.module.css

frontend/src/components/shared/
  ConfirmActionDialog.tsx
  ConfirmActionDialog.module.css
  StatusBadge.tsx
  StatusBadge.module.css
  AccessReasonPanel.tsx
  AccessReasonPanel.module.css
  TimelineView.tsx
  TimelineView.module.css
  SensitiveDataMask.tsx
  SensitiveDataMask.module.css
```

### Backend — ملفات جديدة
```
backend/src/common/sms/
  sms.module.ts
  sms.service.ts
  providers/unifonic.provider.ts
  providers/twilio.provider.ts
  providers/mock.provider.ts

backend/src/entities/dto/
  policy-impact-query.dto.ts
```

### Infrastructure — ملفات جديدة
```
docker-compose.yml
Caddyfile
.env.production.example
backend/Dockerfile
frontend/Dockerfile
scripts/backup.sh
scripts/crontab.txt
```

---

## بنود مؤجلة — خارج النطاق الحالي

| البند | السبب |
|---|---|
| React Native / تطبيق جوال | Web أولاً، mobile لاحقاً |
| WhatsApp API | ليس ضرورياً في MVP |
| OpenSearch | يُفعَّل عند الحاجة لبحث نص كامل |
| Temporal Workflow Engine | يُضاف عند تعقيد الـ Workflows |
| RLS على PostgreSQL | PBAC في التطبيق كافٍ لـ MVP |
| Managed Database | VPS واحد — القرار نهائي |
| Kubernetes | مستبعد بقرار استراتيجي |
| محلل (Analyst Role) | مالك المنصة يغطي هذا في MVP |
| Time-boxed Support Access | يُبنى مع نمو فريق الدعم |

---

## نقاط التحقق قبل الإطلاق

```
□ tsc --noEmit → صفر أخطاء في backend و frontend
□ npm run build → ينجح كلاهما
□ seed:smoke-logins → كل المستخدمين يدخلون
□ Docker Compose يعمل محلياً
□ Caddy يعيد التوجيه صحيحاً
□ HTTPS يعمل على الدومين
□ سكريبت الباكاب يعمل ويحفظ نسخة
□ SMS يرسل OTP حقيقي
□ /platform/login يعمل
□ PlatformStatusBanner يظهر في كيان معلق
□ Export يُحمِّل ملف JSON
□ الاعتراض على التعليق يُرسَل ويظهر في لوحة المنصة
□ Fund Health يعرض 7 مؤشرات
□ الواجهة مقروءة على شاشة جوال 375px
```
