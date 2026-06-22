# CollectiveTrustOS — دليل المطور

> هذا الملف هو **المرجع الثابت** لأي مطور يلتحق بالمشروع.
> لما هو **متبقٍ للبناء**، انظر: [REMAINING_WORK.md](./REMAINING_WORK.md)
> آخر تحديث: 21 يونيو 2026

---

## 1. فهم المشروع أولاً

CollectiveTrustOS ليس تطبيق صندوق عادي. هو **منصة حوكمة مرنة** للصناديق الاجتماعية
(عائلة، قبيلة، جيران، عمارة، حي). كل التوثيق في `Docs/`.

**القاعدة الذهبية:**
```
العضو ← كيان ← محفظة ← مسار ← اشتراك فعّال ← حقوق والتزامات
```

**أهم ما يجب فهمه:**
- النظام مبني على **محركات** وليس CRUD بسيط
- **مسارات الحوكمة** هي القلب — داخل نفس المحفظة مسارات متعددة بأرصدة مستقلة تماماً
- **لا يجوز** مسار أن يصرف من مال مسار آخر إلا بقرار رسمي موثق
- **لا حذف** للعمليات المالية — الأخطاء تُعالج بعمليات عكسية (reversal)
- كل معلومة لها مستوى ظهور محدد (6 مستويات)

---

## 2. هيكل المشروع

```
STGP/
├── backend/                 ← NestJS + TypeScript (Modular Monolith)
│   ├── prisma/
│   │   ├── schema.prisma    ← مصدر الحقيقة الوحيد لقاعدة البيانات
│   │   └── seed.ts          ← بيانات تجريبية
│   └── src/
│       ├── identity/        ← Auth: OTP + JWT + devLogin
│       ├── prisma/          ← PrismaService
│       ├── entities/        ← CRUD + سياسة + حساب دفتري
│       ├── memberships/     ← انضمام + أدوار + تفضيلات + معالون
│       ├── wallets/         ← محافظ + سياسات + إغلاق
│       ├── governance-paths/ ← مسارات + سياسات + إغلاق
│       ├── spending-items/  ← بنود صرف + شروط + سقوف
│       ├── subscriptions/   ← آلة حالة + توافق + snapshot
│       ├── ledger/          ← محاسبة مزدوجة
│       ├── decisions/       ← قرارات + تصويت + تنفيذ
│       ├── appeals/         ← اعتراضات + تصعيد تلقائي (cron)
│       ├── disputes/        ← نزاعات + وساطة
│       ├── entity-relationships/ ← علاقات بين الكيانات
│       ├── wallet-relationships/ ← علاقات بين المحافظ
│       ├── analytics/       ← صحة الصندوق + تداخل + تقارير
│       ├── notifications/   ← إشعارات
│       ├── documents/       ← مستندات + خصوصية
│       ├── rules/           ← محرك قواعد + قوالب
│       ├── disbursement-requests/ ← طلبات صرف
│       ├── beneficiaries/   ← مستفيدون
│       ├── committees/      ← لجان
│       ├── households/      ← أسر (للتصويت العائلي)
│       ├── auditor/         ← واجهة المراجع (8 تبويبات)
│       └── queue/           ← BullMQ (اختياري)
├── frontend/                ← Next.js 16 + TypeScript (App Router)
│   └── src/
│       ├── app/(main)/      ← 22 صفحة (RTL + CSS Modules)
│       └── lib/api/         ← دوال fetch لكل وحدة
└── Docs/                    ← التوثيق الكامل للمشروع
```

---

## 3. الاستاك التقني (الحالة الحالية)

| الطبقة | التقنية | الحالة |
|---|---|---|
| Backend | NestJS + TypeScript | ✅ 23 وحدة، Build نظيف |
| Database | PostgreSQL 16 (port 5432) | ✅ 13 Migration مطبّقة |
| ORM | Prisma | ✅ Schema كامل |
| Frontend | Next.js 16 (App Router) | ✅ 22 صفحة، Build نظيف |
| Queue/Cache | Redis + BullMQ | ✅ يعمل بـ `ENABLE_QUEUES=true` |
| Auth | OTP جوال + JWT | ✅ كامل — تدفق خطوتين (جوال → OTP) + devLogin للتطوير |
| Token Refresh | Axios interceptor | ✅ تجديد تلقائي على 401 + تنظيف على الفشل |
| Privacy | TransparencyLevel filtering | ✅ `canView` + `assertCanView` مطبّقة |
| SMS | SmsProvider interface | ✅ MockSmsProvider — ينتظر مزود حقيقي (Unifonic/Twilio) |
| Payments | يدوي في MVP | ✅ PaymentDue + PaymentRecord + Disbursement |
| CORS | env-based origins | ✅ يقرأ `ALLOWED_ORIGINS` من البيئة |
| Deploy | Docker Compose | ✅ Backend + Frontend + DB + Redis |
| Mobile | React Native / Expo | ⏳ مرحلة لاحقة |

---

## 4. إعداد بيئة التطوير

### 4.1 المتطلبات
- Node.js 20+
- PostgreSQL 16 (port 5432)
- npm

### 4.2 Backend

```bash
cd backend

# تثبيت الحزم
npm install

# إنشاء .env
cp .env.example .env
# غيّر YOUR_PASSWORD و YOUR_JWT_SECRET في الملف

# إنشاء قاعدة البيانات
psql -U postgres -c "CREATE DATABASE stgp_dev;"

# تشغيل Migrations
npx prisma migrate dev

# بيانات تجريبية (اختياري)
npx prisma db seed

# تشغيل السيرفر
npm run start:dev
```

### 4.3 متغيرات البيئة المطلوبة (`.env`)

```env
DATABASE_URL="postgres://postgres:YOUR_PASSWORD@localhost:5432/stgp_dev?sslmode=disable"
JWT_SECRET="YOUR_VERY_LONG_RANDOM_SECRET_KEY"
JWT_REFRESH_SECRET="YOUR_VERY_LONG_RANDOM_REFRESH_SECRET"
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3
NODE_ENV=development
PORT=3001
SMS_PROVIDER=mock
# ENABLE_QUEUES=true  ← فعّل Redis+BullMQ عند الحاجة
```

### 4.4 Frontend

```bash
cd frontend
npm install
echo 'NEXT_PUBLIC_API_URL=http://localhost:3001' > .env.local
npm run dev
```

### 4.5 Docker (بيئة كاملة)

```bash
cp .env.example .env   # عدّل القيم
docker compose up -d
```

---

## 5. ما تم بناؤه (21 يونيو 2026)

### Backend — 23 وحدة مكتملة

| الوحدة | الوصف |
|---|---|
| `identity` | OTP + JWT + devLogin + send-otp + verify-otp + refresh + logout |
| `entities` | CRUD + EntityPolicy + LedgerAccount تلقائي + EntityTemplate |
| `memberships` | انضمام + موافقة + أدوار + تفضيلات + معالون |
| `wallets` | إنشاء + سياسة + إغلاق بقرار |
| `governance-paths` | إنشاء + سياسة + إغلاق بقرار |
| `spending-items` | CRUD + شروط + سقوف + حذف منطقي |
| `subscriptions` | آلة حالة (INTERESTED→EXITED) + توافق + snapshot + PaymentDue + PaymentRecord |
| `ledger` | محاسبة مزدوجة + recordPayment + recordDisbursement + recordTransfer + reversal |
| `decisions` | CRUD + تصويت + نصاب + نسبة قبول + executionStatus |
| `appeals` | اعتراضات + مراجعة + تصعيد تلقائي (cron + queue) |
| `disputes` | OPEN→ESCALATED/RESOLVED/CLOSED |
| `entity-relationships` | PENDING→ACTIVE/REJECTED + موافقة ثنائية |
| `wallet-relationships` | أنواع SHARED/SUPPORT/REPORT_ONLY |
| `analytics` | صحة الصندوق (7 مؤشرات) + تداخل عضوية + تقارير شهرية + auditor |
| `notifications` | createBulk + قراءة + حذف |
| `documents` | رفع + عرض بصلاحية + حذف |
| `rules` | CRUD + 6 محركات تقييم + قوالب جاهزة |
| `disbursement-requests` | إنشاء + موافقة + رفض + تنفيذ |
| `beneficiaries` | MEMBER/DEPENDENT/EXTERNAL + سقف سنوي |
| `committees` | CRUD + أعضاء + ربط بمسارات |
| `households` | نموذج الأسرة (للتصويت العائلي) |
| `auditor` | 8 تبويبات تدقيق كاملة |
| `queue` | BullMQ jobs (اختياري) |

### Frontend — 22 صفحة

| المجموعة | الصفحات |
|---|---|
| عام | `/login`, `/dashboard`, `/portal` (بوابتي) |
| الكيانات | `/entities`, `/entities/new` (معالج 6 خطوات), `/entities/[id]` (5 تبويبات + تحليل توافق) |
| المحافظ والمسارات | `/wallets/[id]`, `/paths/[id]` |
| المالية | `/finance`, `/disbursements`, `/disbursement-requests`, `/beneficiaries` |
| الحوكمة | `/subscriptions`, `/decisions`, `/rules`, `/committees` |
| الرقابة | `/analytics`, `/auditor`, `/disputes`, `/disputes/[id]` |
| المساعد | `/documents`, `/notifications` |

---

## 6. قواعد البرمجة الإلزامية

### Backend

```typescript
// 1. كل endpoint محمية بـ JwtGuard (ما عدا /auth/*)
@UseGuards(JwtGuard)

// 2. كل عملية تكتب في DB → سجل في audit_logs
await this.prisma.auditLog.create({ data: { action, personId, entityId, ... } });

// 3. كل عملية مالية → تمر من LedgerService حصراً
await this.ledgerService.recordSubscriptionPayment({ ... });

// 4. لا حذف للسجلات المالية أبداً
// ❌ await this.prisma.ledgerTransaction.delete(...)
// ✅ await this.ledgerService.recordReversal(...)

// 5. عند تغيير policy → احفظ نسخة في policy_versions
await this.policyVersionService.snapshot(policyId, changedById, reason);

// 6. كل وحدة جديدة تتبع الهيكل:
src/[module-name]/
├── [module-name].module.ts
├── [module-name].controller.ts
├── [module-name].service.ts
├── dto/
└── [module-name].service.spec.ts
```

### Frontend

```typescript
// 1. كل صفحة تحتاج state → "use client"
// 2. كل طلب API → يستخدم lib/api/*.ts (لا fetch مباشر في Components)
// 3. RTL في كل المكونات
// 4. CSS Modules لكل صفحة — لا Tailwind، لا global styles جديدة
// 5. لا نصوص عربية ثابتة داخل JSX إذا كانت ستُترجَم لاحقاً
```

---

## 7. ترتيب الاستدعاء عند الأحداث الرئيسية

### عند إنشاء كيان جديد
```
EntitiesService.create()
  → prisma.entity.create()
  → prisma.entityPolicy.create()   [إعدادات افتراضية]
  → prisma.ledgerAccount.create()  [type: ENTITY]
  → prisma.auditLog.create()       [AuditAction.CREATE]
  → notificationsService.createBulk()
```

### عند دفع اشتراك
```
SubscriptionsService.recordPayment()
  → التحقق من حالة الاشتراك (ACTIVE | CONDITIONAL)
  → ledgerService.recordSubscriptionPayment()
    → prisma.ledgerTransaction.create()
    → createDoubleEntry(person→path)
    → prisma.ledgerAccount.update()  [تحديث الأرصدة]
  → subscriptionsService.updateState()  [إذا كان SUSPENDED → ACTIVE]
  → prisma.auditLog.create()
  → notificationsService.createBulk()
```

### عند الموافقة على قرار صرف
```
DecisionsService.close(APPROVED)
  → ledgerService.recordDisbursement()
    → prisma.ledgerTransaction.create()
    → createDoubleEntry(path→beneficiary)
  → prisma.auditLog.create()
  → notificationsService.createBulk()
```

### عند تغيير الحوكمة
```
GovernancePathsService.updateType()
  → policyVersionService.snapshot()   [حفظ النسخة القديمة]
  → prisma.governancePath.update()
  → subscriptionsService.onGovernanceChanged()
    → compatibilityEngine.evaluate() على كل عضو فعّال
    → غير المتوافقين → state: SUSPENDED
    → notificationsService.createBulk()
  → prisma.auditLog.create()
```

---

## 8. الأخطاء الشائعة

| الخطأ | الصواب |
|---|---|
| حذف عملية مالية | أنشئ `REVERSAL` transaction |
| تطبيق القواعد في Frontend | كل القواعد في Backend |
| صلاحية Role-Based فقط | استخدم السياق الكامل (membership + path + document) |
| ربط مباشر بمزود SMS واحد | استخدم `SmsProvider` interface |
| قراءة السياسة الحالية في نزاع | اقرأ `policy_versions` وقت القرار |
| تغيير حوكمة بدون إشعار الأعضاء | استدعِ `onGovernanceChanged()` |
| مسار يصرف من مال مسار آخر | أنشئ `TRANSFER_BALANCE` decision أولاً |
| تجاوز `benefitType=SHARED` | محافظ SHARED تقبل مساراً واحداً فقط |

---

## 9. الحالة الحالية والخطوة التالية

الكود قابل للتشغيل والاختبار. للتشغيل الفوري:

```bash
# Backend
cd backend && npm run start:dev

# Frontend (terminal منفصل)
cd frontend && npm run dev

# أو Docker
docker compose up -d
```

**ما يعمل الآن:**
- تسجيل دخول بـ OTP خطوتين (جوال → رمز) + devLogin للتطوير
- تجديد token تلقائي على انتهاء الصلاحية
- إنشاء كيانات، محافظ، مسارات، اشتراكات
- دفع الاشتراكات، طلبات الصرف، القرارات، التصويت
- تصويت أسري (ONE_FAMILY_ONE_VOTE) مع constraint منع التكرار
- أرشفة الحملات المنتهية تلقائياً (cron كل ساعة)
- فلترة المستندات بـ TransparencyLevel
- تحليل الصحة، تقارير التدقيق، إشعارات، لوحة المراجع

**ما تبقى:**
- مزود SMS حقيقي (MockSmsProvider يكفي للتطوير)
- المحفظة المشتركة الحقيقية (تتطلب Schema جديد)
- الدعم المالي بين الكيانات

للتفاصيل الكاملة → **[REMAINING_WORK.md](./REMAINING_WORK.md)**

---

## 10. مراجع سريعة

| الموضوع | الملف |
|---|---|
| رؤية المشروع | [Docs/01_Overview/vision.md](Docs/01_Overview/vision.md) |
| المفاهيم الأساسية الستة | [Docs/01_Overview/core_concepts.md](Docs/01_Overview/core_concepts.md) |
| المحركات الثمانية | [Docs/02_Architecture/core_engines.md](Docs/02_Architecture/core_engines.md) |
| مخطط قاعدة البيانات | [Docs/03_Data_Model/database_schema.md](Docs/03_Data_Model/database_schema.md) |
| قاعدة العزل بين المسارات | [Docs/05_Rules_and_Governance/governance_path_isolation_rules.md](Docs/05_Rules_and_Governance/governance_path_isolation_rules.md) |
| عقد المشاركة وSnapshotting | [Docs/05_Rules_and_Governance/member_participation_contract.md](Docs/05_Rules_and_Governance/member_participation_contract.md) |
| الدفتر المالي | [Docs/03_Data_Model/financial_ledger.md](Docs/03_Data_Model/financial_ledger.md) |
| PBAC والشفافية | [Docs/05_Rules_and_Governance/access_control_and_privacy.md](Docs/05_Rules_and_Governance/access_control_and_privacy.md) |
| القرارات والتصويت | [Docs/05_Rules_and_Governance/governance_paths_and_voting.md](Docs/05_Rules_and_Governance/governance_paths_and_voting.md) |
| تغطية التنفيذ الكاملة | [Docs/IMPLEMENTATION_COVERAGE_PHASES_1_3.md](Docs/IMPLEMENTATION_COVERAGE_PHASES_1_3.md) |
| ما تبقى للبناء | [REMAINING_WORK.md](./REMAINING_WORK.md) |
