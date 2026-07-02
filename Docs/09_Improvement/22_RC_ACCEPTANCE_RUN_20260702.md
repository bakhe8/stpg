# RC Acceptance Run - 2026-07-02

## حالة الوثيقة

**الإصدار التشغيلي:** 2.31
**التاريخ:** 2026-07-02
**الحالة:** منفذة ومتحقق منها
**وسم الإصدار المرشح:** `v0.1.0-rc.1`
**قرار الجولة:** `RC_READY`
**مرجع التشغيل:** `21_RC_ACCEPTANCE_RUNBOOK.md`

## الخلاصة

تم تشغيل جولة قبول RC نهائية بعد إغلاق post Phase G polish backlog. بدأت الجولة الرسمية من reset نظيف لقاعدة Docker، ثم شغلت بوابات القبول والبناء والتحقق.

النتيجة: `RC_READY`.

لا توجد blockers جديدة. كل بوابات الصندوق/الحملة، القوالب، الأدوار، seed validation، والبناء مرت.

## الأدلة

| النوع | المسار |
|---|---|
| جولة تمهيدية فوق بيانات التطوير الحالية | `C:\Users\Bakheet\AppData\Local\Temp\stgp-rc-acceptance-20260702133101` |
| جولة RC النظيفة المعتمدة | `C:\Users\Bakheet\AppData\Local\Temp\stgp-rc-acceptance-clean-20260702143351` |

الجولة التمهيدية مرت قبل reset، لكنها ليست الجولة المعتمدة للوسم. الجولة المعتمدة هي `stgp-rc-acceptance-clean-20260702143351`.

## سبب إعادة الجولة النظيفة

قبل الجولة التمهيدية كانت قاعدة التطوير تحتوي بيانات قبول سابقة. هذا مقبول للتطوير، لكنه ليس أفضل baseline لقرار RC رسمي.

لذلك تم تنفيذ:

```powershell
cd backend
npm run seed:reset:docker
```

بعد reset، أظهر seed validator:

- `seedEntities = 8`
- `runtimeCreatedEntities = 0`
- `entities = 8`
- seed validation passed

ثم بدأت جولة RC النهائية.

## نتيجة hygiene

قبل جولة RC النظيفة:

| الفحص | النتيجة |
|---|---|
| `npm run acceptance:phase-g:hygiene` | passed |
| `candidateCount` | `0` |

بعد جولة RC النظيفة:

| الفحص | النتيجة |
|---|---|
| `npm run acceptance:phase-g:hygiene` | passed |
| `candidateCount` | `6` |

هذا متوقع لأن acceptance harness ينشئ:

- صندوق فارغ واحد.
- أربعة صناديق من القوالب الأساسية.
- حملة واحدة مرتبطة بصندوق أب.

## نتيجة acceptance harness

الأمر:

```powershell
cd backend
npm run acceptance:phase-g
```

النتيجة: `passed`.

الملخص محفوظ في:

```text
C:\Users\Bakheet\AppData\Local\Temp\stgp-rc-acceptance-clean-20260702143351\phase-g-acceptance-summary.json
```

ما تم قبوله:

| السيناريو | النتيجة |
|---|---|
| صندوق فارغ | accepted، `walletCount = 0` |
| `CUSTOM_FUND` | accepted، محفظة `SEPARABLE` ومسار `BOARD` |
| `MUTUAL_AID` | accepted، محفظة `SEPARABLE` ومسار `COMMITTEE` |
| `SHARED_SERVICES` | accepted، محفظة `SHARED` ومسار `COMMITTEE` |
| `SUPPORTER_ONLY` | accepted، محفظة `SEPARABLE` ومسار `DONATION_ONLY` |
| حملة | accepted، `type = CAMPAIGN` وتحت صندوق أب |

## بوابات التحقق

| البوابة | النتيجة |
|---|---|
| Docker stack | `backend`, `frontend`, `postgres` healthy |
| Backend health | passed، `status = ok` |
| Frontend readiness | passed، `/login` returned HTTP 200 |
| `npm run acceptance:phase-g:hygiene` قبل الجولة | passed، `candidateCount = 0` |
| `npm run seed:validate:boundary` قبل الجولة | passed |
| `npm run seed:validate:docker` قبل الجولة | passed |
| `npm run acceptance:phase-g` | passed |
| `npm run test:phase-d:parity` | passed، 2 suites / 12 tests |
| `npm run build` في backend | passed |
| `npm run test:phase-d:create-flow` | passed، 3 tests |
| `npm run test:ux:roles` | passed، 1 test مع readiness تلقائي |
| `npm run build` في frontend | passed |
| `npm run seed:validate:boundary` بعد الجولة | passed |
| `npm run seed:validate:docker` بعد الجولة | passed |
| `npm run acceptance:phase-g:hygiene` بعد الجولة | passed، `candidateCount = 6` |

## قرار الإصدار

القرار العملي بعد الجولة النظيفة:

```text
RC_READY
```

الوسم المعتمد لهذه الحالة:

```text
v0.1.0-rc.1
```

هذا يعني أن المستودع جاهز كمرشح إصدار أول. لا يعني ذلك نشر production تلقائيا؛ أي نشر فعلي يحتاج قرارا منفصلا وبيئة نشر محددة.

## ملاحظات تشغيلية

- قاعدة Docker الحالية تحتوي 6 سجلات قبول من الجولة النهائية. هذا متوقع ولا يكسر seed validation.
- إذا احتجنا baseline فارغا لاحقا، يستخدم الأمر `cd backend; npm run seed:reset:docker`.
- ظهرت تحذيرات npm audit/deprecation أثناء أوامر seed داخل Docker، لكنها لم تفشل أي بوابة. هذا يمكن فتحه كتحسين dependency hygiene لاحقا، وليس blocker لـ `v0.1.0-rc.1`.
- بقي قرار `/funds` كما هو: لا alias الآن؛ `/entities` هو المسار التوافقي الحالي.

## النتيجة النهائية

`v0.1.0-rc.1` جاهز كوسم RC بعد إغلاق 08 و09 وتشغيل قبول نظيف.
