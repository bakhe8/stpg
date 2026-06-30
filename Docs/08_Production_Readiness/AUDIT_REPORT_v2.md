# تقرير التدقيق المحدَّث — CollectiveTrustOS
**الإصدار:** 2.0 | **التاريخ:** 2026-06-29
**حالة الوثيقة:** مرجع تاريخي / Superseded by `BACKLOG.md` v2.1 بتاريخ 2026-06-30
**المنهجية:** 3 وكلاء تدقيق متوازيين — Frontend / Backend / Schema+Seed
**المقارنة مع:** التقرير الأول (2026-06-29 — الجلسة السابقة)

---

## تحديث الحالة الواقعية - 2026-06-30

هذا التقرير يعكس حالة تدقيق بتاريخ 2026-06-29، وليس الحالة التشغيلية الحالية بعد إغلاق backlog 08.

المرجع الحالي هو `BACKLOG.md` v2.1:

- كل البنود `BL-001` إلى `BL-042` مغلقة كـ `Fixed / Verified` أو `Verified`.
- البنود التي يذكرها هذا التقرير كمانعة للإطلاق عولجت أو تحققت لاحقا داخل `BACKLOG.md`.
- أي تعارض متبق لا يعاد فتحه هنا؛ يعالج في `Docs/09_Improvement` حسب خطة Phase A وما بعدها.

يحتفظ هذا الملف بقيمته كتقرير تدقيق تاريخي يشرح أصل المشاكل، لكنه ليس مصدر الحقيقة الحالي لحالة المشروع.

---

## 1. ملخص تنفيذي

منذ التدقيق الأول وقع **commit رئيسي ضخم** (`2722770`) يضم 107 ملف و15,543 إضافة. هذا الجهد يعني أن كثيراً من الملاحظات قد عولجت، لكن **الأخطاء الحرجة الأربعة الأصلية لم تُمسَّ** وظهرت ثغرة أمنية خامسة جديدة.

### نظرة سريعة على النتائج

| الفئة | مكتمل ✅ | جزئي ⚠️ | غير مُصلَح ❌ | جديد 🆕 |
|-------|---------|---------|--------------|--------|
| أخطاء حرجة | 0 | 0 | 4 | 1 |
| أمان Backend | 5 | 1 | 10 | 0 |
| Frontend/UX | 3 | 0 | 10 | 3 |
| Schema/DB | 0 | 1 | 8 | 0 |
| بيانات Seed | 5 | 2 | 4 | 0 |

---

## 2. ما تم إصلاحه ✅

| # | المشكلة السابقة | التفاصيل |
|---|----------------|----------|
| 1 | القرارات المغلقة لا تعرض النتيجة | `effectPanel` يعرض النتيجة دائماً |
| 2 | `Breadcrumbs.tsx` غير موجود | مكتمل ومستخدم في dashboard, finance, settings, members, auditor |
| 3 | لا كيانات فرعية (`parentEntityId`) | `family_youth` كيان فرعي من `family_core` |
| 4 | لا اشتراك بحالة `INTERESTED` | `yousef_family` وآخرون |
| 5 | `referenceDate` متحرك | `seed-runtime.ts` يثبّته عبر `--reference-date` أو env |
| 6 | فجوة `TWO_THIRDS_VOTE` | 9 قرارات بهذا النوع |
| 7 | لا نظام مدفوعات إلكترونية | وحدة `src/payments/` كاملة — Stripe + Moyasar + webhooks |
| 8 | `PaymentRecord` بلا حقول بوابة | `paymentMethod` + `gatewayTransactionId` + حالة `PROCESSING` |
| 9 | لا ربط بين النزاع وطلب الصرف | ترحيل `20260628193000` + `@relation` صحيح |
| 10 | لا حقول إغلاق الكيان | `closureStatus/closureRequestedAt/closureReason` في Entity |
| 11 | الاعتراضات لا تتصاعد تلقائياً | `@Cron(EVERY_DAY_AT_MIDNIGHT)` في `appeals.service.ts` |
| 12 | RLS ضعيف | ترحيل `20260627160000`: 6 دوال سياق + سياسات على 4 جداول |
| 13 | `confirm()` في `/wallets/[id]` و `/settings` | يستخدمان `ConfirmActionDialog` الآن |
| 14 | لوحة التحكم بلا تخصيص للدور | Work Surface مخصص لكل دور (ADMIN/TREASURER/AUDITOR/MEMBER) |
| 15 | لا `RequestTimeline` ولا `PaymentMatchPanel` | مكوّنان مشتركان مكتملان |
| 16 | `/portal` بلا تصنيف للتأخر | 3 مراحل: فترة سماح / متأخرة / حرجة |
| 17 | لا تصدير CSV في المدقق | كل تبويبات المدقق تدعم CSV |
| 18 | لا شريط فلترة في المدقق | بحث + تاريخ + حالة |
| 19 | لا اختبارات حدود مالية | `financial-boundaries.spec.ts` — يمنع تعديل الأرصدة خارج LedgerService |
| 20 | لا اختبار دخان لتسجيل الدخول | `seed-login-smoke.ts` — يختبر كل الحسابات عبر HTTP |
| 21 | `DecisionExecutionStatus` غير موجود | enum كامل: NOT_STARTED, PARTIAL, COMPLETED, REVERSED, FAILED |
| 22 | لا إشعارات للصرف والسياسات | `notifyPaymentDue`, `notifyAppealFiled`, `notifyGovernanceChanged`... |
| 23 | لا بنية SMS | Twilio + Unifonic + Mock provider — جاهزة (غير موصولة) |
| 24 | `seed-validate.ts` محدود | 15+ قاعدة جديدة: IBAN، PROCESSING، جلسات دعم، صحة الصندوق... |
| 25 | `dev-login` كان يعتمد على `NODE_ENV=development` | أصبح محمياً بعلم صريح `ENABLE_DEV_LOGIN=true`، والإنتاج يصرّح `false` |
| 26 | Refresh Token لا يدور عند التجديد | أصبح refresh يبطل الرمز القديم فوراً، ينشئ رمزاً جديداً، ويرفض إعادة استخدام القديم |
| 27 | Treasurer كان يستطيع إنشاء/إغلاق القرارات | أصبح إنشاء وإغلاق القرارات مقتصراً على ADMIN/FOUNDER، مع بقاء تنفيذ القرار المعتمد متاحاً لـ TREASURER |
| 28 | نفس الشخص يعتمد وينفّذ طلب الصرف | أصبح التنفيذ ممنوعاً إذا كان المنفذ هو نفس `reviewedById`، وتُسجل المحاولة الفاشلة في AuditLog |
| 29 | العضو موضوع قرار الطرد يصوّت على طرد نفسه | أصبح `castVote()` يمنع عضوية الشخص المستهدف من التصويت على قرار `EXPEL_MEMBER` |

---

## 3. الأخطاء الحرجة — لا تزال تمنع الإطلاق ❌

### [C-001] `alert()` في صفحة المالية
**الملف:** [frontend/src/app/(main)/finance/page.tsx](../../frontend/src/app/(main)/finance/page.tsx) — السطور 664، 667، 679، 682

```typescript
// السطر 664 — الكود الحالي:
alert(`تم تحويلك افتراضياً لبوابة الدفع (Stripe). الجلسة: ${res.id}`);

// السطر 667:
alert(`Error: ${e instanceof Error ? e.message : 'Failed'}`);

// السطر 679:
alert(`تم تحويلك افتراضياً لبوابة الدفع (Moyasar). الجلسة: ${res.id}`);

// السطر 682:
alert(`Error: ${e instanceof Error ? e.message : 'Failed'}`);
```

**الأثر:** بعد الضغط على "دفع إلكتروني" تظهر نافذة متصفح بدائية — تجربة مستخدم كارثية.
**الإصلاح:** راجع [BACKLOG.md](BACKLOG.md) — المهمة BL-001.

---

### [C-002] `prompt()` و`confirm()` في صفحة المنصة
**الملف:** [frontend/src/app/platform/page.tsx](../../frontend/src/app/platform/page.tsx) — السطران 100 و112

```typescript
// السطر 100:
const reason = prompt(`سبب تعليق "${entity.name}":`);

// السطر 112:
if (!confirm(`تفعيل "${entity.name}" من جديد؟`)) return;
```

**الأثر:** واجهة التعليق والتفعيل من لوحة المنصة تستخدم نوافذ متصفح بدائية.
**الإصلاح:** راجع [BACKLOG.md](BACKLOG.md) — المهمة BL-002.

---

### [C-003] `governanceType` و`allowMultiplePaths` لا تُرسَل للـ API
**الملفات:**
- [frontend/src/lib/api/entities.ts](../../frontend/src/lib/api/entities.ts) — السطر 72
- [frontend/src/app/(main)/entities/new/page.tsx](../../frontend/src/app/(main)/entities/new/page.tsx) — السطر 105

```typescript
// نوع createEntity الحالي (entities.ts:72) — ناقص:
export function createEntity(data: {
  name: string;
  type: string;
  description?: string;
  templateId?: string;
  // ← مفقود: defaultGovernanceType, allowMultiplePaths
}) { ... }

// الاستدعاء (entities/new/page.tsx:105) — لا يُرسل الحقلين:
const result = await createEntity({
  name: state.name.trim(),
  type: state.type,
  description: state.description.trim() || undefined,
  templateId: state.templateId || undefined,
  // ← state.governanceType و state.allowMultiplePaths لا تُرسَل
});
```

**الأثر:** المستخدم يمر بـ 6 خطوات من معالج إنشاء الكيان (بما فيها خطوتا الحوكمة) لكن النتيجة دائماً نفسها بصرف النظر عن اختياراته.
**الإصلاح:** راجع [BACKLOG.md](BACKLOG.md) — المهمة BL-003.

---

### [C-004] `adjustAggregateBalances()` تُحدَّث جميع حسابات الكيان
**الملف:** [backend/src/ledger/ledger.service.ts](../../backend/src/ledger/ledger.service.ts) — السطور 1084–1098

```typescript
// الكود الحالي — يضرب كل حسابات الكيان:
private async adjustAggregateBalances(tx, walletId, entityId, amount) {
  await this.adjustWalletBalance(tx, walletId, amount);
  await tx.ledgerAccount.updateMany({
    where: { entityId },          // ← يجب تقييده بـ walletId: null
    data: { balance: ... },       //   AND governancePathId: null
  });
}
```

**الأثر:** كل عملية مالية تُضاعف الأرصدة — تحديث واحد يُحرّك المحفظة + كل الحسابات المرتبطة بالكيان. الأرصدة مشوّهة.
**الإصلاح:** راجع [BACKLOG.md](BACKLOG.md) — المهمة BL-004.

---

## 4. ثغرة أمنية جديدة 🆕

### [N-001] Moyasar Webhook لا يتحقق من التوقيع
**الملف:** [backend/src/payments/payments.controller.ts](../../backend/src/payments/payments.controller.ts) — السطر 43

```typescript
// الكود الحالي:
@Post('webhook/moyasar')
async moyasarWebhook(@Body() body: unknown) {
  // ← لا يوجد فحص signature
  return this.paymentsService.handleMoyasarWebhook(body);
}
```

**الأثر:** أي طرف خارجي يستطيع إرسال webhook مزيّف ليؤكد دفعات وهمية.
**الإصلاح:** راجع [BACKLOG.md](BACKLOG.md) — المهمة BL-005.

---

## 5. مشاكل أمان Backend — لا تزال قائمة ❌

| الكود | المشكلة | الملف | المهمة |
|-------|---------|-------|--------|
| H-006 | لا فحص `isVerified` قبل التصويت | `decisions.service.ts` | BL-011 |
| H-007 | `SUPPORTER_ONLY` يقدّم طلب صرف | `disbursement-requests.service.ts:44` | BL-012 |
| H-008 | بلا اشتراك نشط → يقدّم طلب صرف | `disbursement-requests.service.ts:44` | BL-012 |
| H-009 | `JwtGuard` ليس Guard عاماً | `app.module.ts:108` | BL-013 |
| H-010 | `MERGE_PATHS` بدون تنفيذ فعلي | `decisions.service.ts` — executeDecisionSideEffects | BL-034 |
| H-011 | لا Cron لتوليد `PaymentDue` | `subscriptions.service.ts` | BL-035 |
| H-012 | لا حد زمني على عكس المعاملات | `ledger.service.ts` — recordReversal | BL-036 |
| H-013 | `AuditLog` بلا DISBURSE/TRANSFER/SUSPEND | `schema.prisma:1825` | BL-030 |
| H-014 | SMS/OTP جاهز لكن غير موصول | `auth.service.ts` — لا sendOtp/verifyOtp | BL-033 |
| H-015 | `isVerified` يبقى `false` للأبد | مرتبط بـ BL-033 | BL-033 |

---

## 6. مشاكل Frontend — لا تزال قائمة ❌

| الكود | المشكلة | الملف | المهمة |
|-------|---------|-------|--------|
| F-001 | `/portal` — لا `useTranslations()` | `portal/page.tsx` | BL-014 |
| F-002 | `/settings` — نصوص مشفرة | `entities/[id]/settings/page.tsx` | BL-015 |
| F-003 | `/health` — لا `useTranslations()` | `health/page.tsx` | BL-016 |
| F-004 | `ENTITY_TYPE_LABELS` أنواع وهمية | `join/[token]/page.tsx:16` | BL-017 |
| F-005 | علاقة المحفظة تتطلب UUID يدوياً | `wallets/[id]/page.tsx:1006` | BL-018 |
| F-006 | المراجع لا يرى الاشتراكات | `paths/[id]/page.tsx:134` | BL-019 |
| F-007 | Exceptions/Conflicts: ID+تاريخ فقط | `auditor/page.tsx:407` | BL-020 |
| F-008 | لا فلتر في قائمة الأعضاء | `entities/[id]/members/` | BL-021 |
| F-009 | Dashboard: نصوص مشفرة ("مرحباً"...) | `dashboard/page.tsx:738` | BL-022 |
| F-010 | `confirm()` في `/documents` | `documents/page.tsx:139` | BL-023 |
| F-011 | `/platform` — لا i18n | `platform/page.tsx` | BL-024 |
| F-012 | Pre-gate entities/new — مشفر | `entities/new/page.tsx:481` | BL-025 |
| F-013 | Loading states — مشفرة عربياً | `platform/page.tsx:122` | BL-026 |

---

## 7. مشاكل Schema — لا تزال قائمة ❌

| الكود | المشكلة | الموقع | المهمة |
|-------|---------|--------|--------|
| S-001 | `Dispute.initiatorId/respondentId/arbitratorId` — لا `@relation` | `schema.prisma:831` | BL-027 |
| S-002 | `PlatformSuspensionAppeal.entityId` — لا `@relation` | `schema.prisma:88` | BL-028 |
| S-003 | `BalanceSnapshot.accountId` — لا `@relation` | `schema.prisma:973` | BL-029 |
| S-004 | `AuditAction` — لا DISBURSE/TRANSFER/SUSPEND | `schema.prisma:1825` | BL-030 |
| S-005 | `NotificationType` — لا DISBURSEMENT_* | `schema.prisma:1786` | BL-031 |
| S-006 | لا فهرس على `(paymentDueId, status)` | `schema.prisma — PaymentRecord` | BL-032 |
| S-007 | لا فهرس على `Subscription.state` | `schema.prisma — Subscription` | BL-032 |
| S-008 | لا فهرس على `AuditLog.createdAt` | `schema.prisma — AuditLog` | BL-032 |

---

## 8. مشاكل Seed — لا تزال قائمة ❌

| الكود | المشكلة | المهمة |
|-------|---------|--------|
| D-001 | لا دفعة Moyasar بحالة `CONFIRMED` | BL-037 |
| D-002 | لا عضو ACTIVE بصفر `PaymentDue` | BL-038 |
| D-003 | `seed-templates.ts` ملف ميت غير مُستدعى | BL-039 |
| D-004 | تحقق الحملة المنتهية: `warning` بدل `error` | BL-040 |

---

## 9. التغييرات الإيجابية الكبرى (ملاحظات معمارية)

### أ) نظام مدفوعات متكامل (جديد تماماً)
```
src/payments/
├── payments.controller.ts     ← endpoints: /intent, /webhook/stripe, /webhook/moyasar
├── payments.service.ts        ← يُنشئ PaymentRecord + يعالج webhooks
├── providers/
│   ├── stripe.provider.ts     ← Stripe Checkout Session
│   └── moyasar.provider.ts    ← Moyasar Payment
└── payments.module.ts
```

### ب) تشديد RLS (ترحيل 20260627160000)
```sql
-- 6 دوال سياق جديدة:
app_current_entity_id()    -- معرّف الكيان من JWT context
app_current_person_id()    -- معرّف الشخص
app_is_platform()          -- هل المستخدم من طبقة المنصة؟
app_internal_access()      -- هل طلب داخلي؟
app_is_entity_member()     -- هل عضو في الكيان؟
app_has_entity_role()      -- هل يملك دوراً بعينه؟

-- سياسات RLS على: entities, wallets, memberships, membership_applications
```

### ج) Work Surface Dashboard (جديد)
- لوحة مخصصة لكل دور
- ADMIN: طلبات الصرف المعلقة + القرارات النشطة
- TREASURER: الدفعات المتأخرة + طلبات التنفيذ
- AUDITOR: استثناءات صحة الصندوق + تقارير سريعة
- MEMBER: اشتراكاتي + دفعاتي القادمة

### د) بنية SMS جاهزة للتوصيل
```
src/identity/sms/
├── sms-provider.interface.ts  ← ISmsProvider { send(to, body) }
├── providers/
│   ├── twilio.provider.ts
│   └── unifonic.provider.ts
├── mock-sms.provider.ts       ← يطبع للـ console في dev
└── sms.module.ts
```
**ملاحظة:** البنية موجودة لكن لا `sendOtp()` ولا `verifyOtp()` في `auth.service.ts` → BL-033.

### هـ) ربط الترحيلات الجديدة
| الترحيل | ما يضيفه |
|---------|---------|
| 20260627160000 | تشديد RLS بـ 4 جداول |
| 20260627193000 | حقول إغلاق الكيان |
| 20260627194000 | PaymentMethod enum + gateway fields |
| 20260627195000 | حالة PROCESSING في PaymentRecordStatus |
| 20260628193000 | ربط Dispute بـ DisbursementRequest |

---

## 10. الحكم النهائي

### النقاط الإيجابية
- بنية معمارية ممتازة (NestJS Modular + Prisma + Double-Entry Ledger)
- RLS قوي وشامل
- نظام دفع جاهز للتوصيل بـ Stripe/Moyasar
- أتمتة الاعتراضات والإشعارات
- seed data غني مع 61+ قاعدة تحقق آلية

### ما يمنع الإطلاق
الأخطاء الخمسة التالية يجب أن تُغلَق قبل أي إطلاق تجريبي:

| # | المهمة | الخطورة | الجهد |
|---|--------|---------|-------|
| 1 | BL-001: إزالة `alert()` | حرجة | نصف يوم |
| 2 | BL-002: استبدال `prompt()`/`confirm()` | حرجة | يوم |
| 3 | BL-003: إرسال `governanceType` | حرجة | نصف يوم |
| 4 | BL-004: إصلاح `adjustAggregateBalances` | حرجة | نصف يوم |
| 5 | BL-005: توقيع Moyasar Webhook | أمان حرج | نصف يوم |

**المجموع: يومان → يصبح المنتج آمناً للإطلاق التجريبي المحدود.**

---

*التقرير الكامل بمعايير القبول لكل إصلاح: [BACKLOG.md](BACKLOG.md)*
