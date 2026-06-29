# دليل المطوّر — CollectiveTrustOS

> **اقرأ هذا الملف أولاً قبل أي شيء آخر.**
> يمنحك هذا الدليل صورة كاملة عن المشروع وحالته وكيفية المشاركة.

---

## ما هو CollectiveTrustOS؟

منصة حوكمة مفتوحة للصناديق الاجتماعية الجماعية — عائلية، جيران، قبيلة، عمارة، طارئة. تُتيح للمجموعات إدارة المال بشفافية وحوكمة رقمية كاملة: اشتراكات، صرف، تصويت، مراجعة، نزاعات، وإشعارات.

**القاعدة الذهبية:**
```
العضو ← كيان ← محفظة ← مسار ← اشتراك فعّال ← حقوق والتزامات
```

---

## المتطلبات الأساسية

| الأداة | الإصدار المطلوب |
|--------|----------------|
| Node.js | 20+ |
| PostgreSQL | 16+ |
| Docker + Docker Compose | أحدث إصدار مستقر |
| pnpm أو npm | 9+ |

---

## إعداد بيئة التطوير

### 1. استنساخ المشروع

```bash
git clone <repo-url>
cd CollectiveTrustOS/STGP
```

### 2. تشغيل قاعدة البيانات

```bash
docker compose up -d db
```

### 3. Backend

```bash
cd backend
cp .env.example .env          # عدّل القيم حسب بيئتك
npm install
npx prisma migrate deploy     # طبّق الترحيلات
npx prisma db seed            # زرع البيانات التجريبية
npm run start:dev             # يبدأ على http://localhost:3001
```

**متغيرات بيئة أساسية في `.env`:**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/collectivetrustos
JWT_SECRET=your-secret-here
ENABLE_DEV_LOGIN=true         # للتطوير فقط — لا تفعّل في الإنتاج
```

### 4. Frontend

```bash
cd ../frontend
cp .env.local.example .env.local   # أو أنشئ الملف يدوياً
npm install
npm run dev                        # يبدأ على http://localhost:3000
```

**متغيرات بيئة Frontend:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_ENABLE_DEV_LOGIN=true
```

### 5. التحقق من الإعداد

```bash
# Backend
curl http://localhost:3001/api/health

# تسجيل دخول تجريبي (يتطلب ENABLE_DEV_LOGIN=true)
curl -X POST http://localhost:3001/api/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"username": "ahmed_family"}'
```

---

## هيكل المشروع

```
STGP/
├── backend/                    ← NestJS API
│   ├── src/
│   │   ├── identity/          ← مصادقة، أشخاص، SMS/OTP
│   │   ├── entities/          ← كيانات وحوكمة
│   │   ├── ledger/            ← محاسبة مزدوجة ← الأهم
│   │   ├── decisions/         ← قرارات وتصويت
│   │   ├── disbursement-requests/  ← طلبات الصرف
│   │   ├── subscriptions/     ← اشتراكات الأعضاء
│   │   ├── appeals/           ← اعتراضات
│   │   ├── disputes/          ← نزاعات
│   │   ├── payments/          ← Stripe + Moyasar
│   │   ├── notifications/     ← إشعارات Push
│   │   └── platform/          ← إدارة المنصة (admin فقط)
│   ├── prisma/
│   │   ├── schema.prisma      ← 42 نموذج، 1920 سطر
│   │   ├── seed.ts            ← بيانات تجريبية (11721 سطر)
│   │   ├── seed-validate.ts   ← 61+ قاعدة تحقق
│   │   ├── seed-stories.ts    ← 14 قصة مستخدم
│   │   └── seed-runtime.ts    ← بروفايلات البيانات
│   └── AGENTS.md              ← تعليمات خاصة بـ Backend
│
├── frontend/                   ← Next.js App Router
│   ├── src/app/
│   │   ├── (main)/            ← 22+ صفحة مُحمية
│   │   │   ├── dashboard/     ← لوحة التحكم بحسب الدور
│   │   │   ├── finance/       ← المدفوعات والصرف
│   │   │   ├── decisions/     ← القرارات والتصويت
│   │   │   ├── auditor/       ← واجهة المراجع
│   │   │   ├── entities/      ← إدارة الكيانات
│   │   │   └── paths/         ← مسارات الحوكمة
│   │   ├── platform/          ← واجهة إدارة المنصة
│   │   ├── login/             ← تسجيل الدخول
│   │   └── join/[token]/      ← قبول الدعوات
│   ├── src/lib/api/           ← وحدات استدعاء API
│   └── AGENTS.md              ← تعليمات خاصة بـ Frontend
│
└── Docs/                       ← توثيق المشروع الكامل
    ├── 01_Overview/           ← رؤية المشروع والمفاهيم
    ├── 02_Architecture/       ← المعمارية
    ├── 03_Data_Model/         ← نموذج البيانات
    ├── 05_Rules_and_Governance/ ← قواعد الحوكمة
    └── 08_Production_Readiness/ ← تقارير الجاهزية والـ Backlog
```

---

## الأدوار في النظام

| الدور | المسؤولية |
|-------|-----------|
| **FOUNDER** | مؤسس الكيان — أعلى صلاحية |
| **ADMIN** | مدير الكيان — إنشاء القرارات، إدارة الأعضاء |
| **TREASURER** | أمين الصندوق — تنفيذ الصرف، تسجيل الدفعات |
| **AUDITOR** | المراجع — قراءة فقط، تقارير كاملة |
| **COMMITTEE_MEMBER** | عضو لجنة — تصويت في القرارات اللجنية |
| **MEMBER** | عضو عادي — دفع، استفادة، تصويت عام |

**قاعدة الفصل المهم:** ADMIN يُنشئ القرارات. TREASURER يُنفّذ الصرف. لا يجوز أن ينشئ TREASURER قراراً.

---

## حالة المشروع الحالية (2026-06-29)

### ✅ مكتمل وجاهز
- المعمارية الأساسية (NestJS + Prisma + Next.js)
- المحاسبة المزدوجة مع حماية overdraft
- 10 أنماط تصويت وإغلاق تلقائي
- بوابات الدفع (Stripe + Moyasar) — البنية التحتية
- نظام SMS (Twilio + Unifonic) — البنية التحتية
- RLS محكم على 4 جداول رئيسية
- 14 قصة مستخدم مرتبطة بتحقق آلي
- Work Surface مخصص لكل دور في Dashboard
- تصدير CSV في واجهة المراجع

### ❌ معلّق (يمنع الإطلاق)
1. **BL-001:** `alert()` في صفحة المالية بعد الدفع الإلكتروني
2. **BL-002:** `prompt()`/`confirm()` في صفحة المنصة
3. **BL-003:** `governanceType` و`allowMultiplePaths` لا تُرسَل للـ API
4. **BL-004:** `adjustAggregateBalances()` تُحدَّث أرصدة خاطئة
5. **BL-005:** Moyasar Webhook لا يتحقق من التوقيع

**→ التفاصيل الكاملة:** [BACKLOG.md](Docs/08_Production_Readiness/BACKLOG.md)

---

## كيف تختار مهمتك

### للمطوّر الجديد — ابدأ هنا
1. اقرأ [AUDIT_REPORT_v2.md](Docs/08_Production_Readiness/AUDIT_REPORT_v2.md) — 15 دقيقة
2. اقرأ [BACKLOG.md](Docs/08_Production_Readiness/BACKLOG.md) — 30 دقيقة
3. اختر مهمة من **المرحلة 1 — أمان** (BL-006 إلى BL-013) أو **المرحلة 2 — Frontend** (BL-014 إلى BL-026)

### ترتيب الأولوية
```
P0 (حرجة)  → BL-001 إلى BL-005    ← يمنع الإطلاق
P1 (عالية)  → BL-006 إلى BL-013    ← أمان
P1 أيضاً   → BL-033               ← OTP (مهم للـ isVerified)
P2 (متوسطة) → BL-014 إلى BL-032   ← UX + Schema
P3 (منخفضة) → BL-037 إلى BL-042   ← جودة وبيانات
```

### قبل العمل على أي مهمة
- تأكد أنها غير مُعيَّنة لشخص آخر
- اقرأ قسم "الملفات المتأثرة" في المهمة بالكامل
- اقرأ الملفات المذكورة محلياً قبل التعديل
- اكتب اختباراً يثبت الإصلاح قبل فتح PR

---

## معايير الكود

### عامة
- TypeScript صارم — لا `any` بدون مبرر موثق
- لا تعليقات تشرح "ماذا" — فقط "لماذا" إذا كان غير واضح
- لا emojis في الكود (في التوثيق: مقبولة)
- التسمية بالإنجليزية في الكود، العربية فقط في نصوص UI

### Backend (NestJS)
- كل Service method تبدأ بالتحقق من الصلاحيات (`requireAdmin`, `requireMember`...)
- كل عملية مالية داخل `prisma.$transaction()`
- كل mutation تُسجَّل في `AuditLog`
- استخدم `LedgerService` فقط للعمليات المالية — لا تُعدَّل `ledger_accounts` مباشرة

### Frontend (Next.js)
- كل صفحة تفاعلية: `"use client"` في الأعلى
- كل صفحة لها CSS Module خاص بها — لا Tailwind
- كل API call عبر `src/lib/api/` — لا `fetch` مباشر في Pages
- كل نص مرئي للمستخدم عبر `useTranslations()` — لا نص عربي مشفر في JSX

### قواعد أمان لا تُكسَر
- لا `alert()` أو `prompt()` أو `confirm()` في Frontend
- لا استعلامات DB مباشرة خارج `prisma.$queryRaw` في حالات استثنائية موثقة
- لا JWT Secret في الكود — من `process.env` دائماً
- كل endpoint خاص يحتاج `@UseGuards(JwtAuthGuard)` (أو يصبح عاماً بعد BL-013 بـ `@Public()`)

---

## كيفية الاختبار

### Backend
```bash
cd backend

# اختبارات الوحدة
npm run test

# اختبارات حدود مالية (مهمة جداً)
npm run test -- financial-boundaries.spec

# اختبارات E2E
npm run test:e2e

# التحقق من صحة بيانات الـ seed
npx ts-node prisma/seed-validate.ts

# اختبار دخان تسجيل الدخول
SEED_SMOKE_API_URL=http://localhost:3001/api npx ts-node prisma/seed-login-smoke.ts
```

### Frontend
```bash
cd frontend

# بناء + TypeScript check
npm run build

# Lint
npm run lint

# اختبارات
npm run test
```

### قبل كل PR
```bash
# Backend:
npm run build && npm run lint && npm run test

# Frontend:
npm run build && npm run lint
```

---

## عملية Pull Request

1. **فرع جديد:** `fix/BL-XXX-short-description` أو `feat/BL-XXX-short-description`
2. **وصف PR** يجب أن يذكر:
   - رقم المهمة من الـ Backlog (مثل `BL-004`)
   - ما الذي تغيّر وكيف
   - كيف تم الاختبار
   - أي جوانب لم تُختبر
3. **معيار القبول:** كل checkbox في مهمة الـ Backlog يجب أن يكون ✅
4. **مراجعة:** PR يحتاج موافقة مطوّر واحد على الأقل

---

## أين تجد المزيد

| الملف | ماذا ستجد |
|-------|-----------|
| [Docs/README.md](Docs/README.md) | فهرس كامل لكل التوثيق |
| [Docs/08_Production_Readiness/AUDIT_REPORT_v2.md](Docs/08_Production_Readiness/AUDIT_REPORT_v2.md) | تقرير التدقيق المحدَّث (2026-06-29) |
| [Docs/08_Production_Readiness/BACKLOG.md](Docs/08_Production_Readiness/BACKLOG.md) | الـ Backlog التنفيذي الكامل (42 مهمة) |
| [Docs/05_Rules_and_Governance/platform_vs_tenant_roles.md](Docs/05_Rules_and_Governance/platform_vs_tenant_roles.md) | وثيقة استراتيجية: طبقتا المستخدمين |
| [Docs/03_Data_Model/financial_ledger.md](Docs/03_Data_Model/financial_ledger.md) | المحاسبة المزدوجة وقواعدها |
| [backend/AGENTS.md](backend/AGENTS.md) | تعليمات Backend للمطوّرين والـ AI |
| [frontend/AGENTS.md](frontend/AGENTS.md) | تعليمات Frontend للمطوّرين والـ AI |

---

## أسئلة شائعة

**س: من أين أبدأ لفهم نموذج البيانات؟**
ج: اقرأ [Docs/03_Data_Model/database_schema.md](Docs/03_Data_Model/database_schema.md) ثم افتح `backend/prisma/schema.prisma`.

**س: كيف أختبر صفحة معيّنة محلياً؟**
ج: بعد `npx prisma db seed`، سجّل دخول بـ `POST /api/auth/dev-login { "username": "ahmed_family" }` ثم استخدم الـ token.

**س: ما الفرق بين Platform وTenant؟**
ج: Platform = القائمون على المنصة (لا يرون بيانات الكيانات). Tenant = مستخدمو كيان بعينه (لا يرون كيانات أخرى). التفاصيل: [platform_vs_tenant_roles.md](Docs/05_Rules_and_Governance/platform_vs_tenant_roles.md).

**س: لماذا لا يُرسَل `governanceType` للـ API؟**
ج: هذا خطأ BL-003 في الـ Backlog. غير مُصلَح حتى الآن.

**س: هل يمكنني تعديل `ledger_accounts` مباشرة؟**
ج: لا. استخدم `LedgerService` حصراً. راجع `backend/src/ledger/` وقرأ `financial-boundaries.spec.ts`.

---

*آخر تحديث: 2026-06-29*
