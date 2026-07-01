# 13 - Phase F Capability Evidence Pack

## حالة الوثيقة

هذه وثيقة إغلاق `F-001` من backlog ما بعد Phase E.

الحالة: منفذة ومتحقق منها.

التاريخ: 2026-07-01.

## الهدف

تثبيت أن جعل مسار `صندوق / حملة` هو default لم يحذف القدرات التشغيلية العميقة التي كانت موجودة قبل التبسيط.

هذه الوثيقة ليست خطة منتج جديدة. هي evidence pack يربط القدرات الأساسية بأدلة تحقق من:

- اختبارات backend targeted.
- parity pack المبني على seed stories.
- smoke test لمسار إنشاء صندوق/حملة.
- role surface audit على مستخدمي seed.
- seed validation على قاعدة Docker.
- فحص Browser يدوي خفيف للسطح الواجهي.

القاعدة:

> لا نعتبر التبسيط ناجحا إلا إذا بقي الصندوق قادرا على الوصول إلى العمق الحالي.

## النتيجة التنفيذية

`F-001` مقفل.

لم تظهر فجوة blocking تمنع الانتقال إلى `F-002`.

الملاحظات المتبقية ليست كسر قدرات، بل أعمال تهذيب لاحقة:

- `F-002`: تحسين first-run/setup guidance بعد إنشاء الصندوق.
- `F-004`: تحويل القوالب إلى مصفوفة منتج تفصيلية، لأن التحقق الحالي يثبت صلاحية القوالب وتطبيقها generic، ولا يحول كل قالب إلى قصة UI مستقلة كاملة.

## حدود هذا الدليل

هذا الدليل يثبت حفظ القدرات على ثلاث طبقات:

| الطبقة | ماذا تثبت؟ |
|---|---|
| Backend/service | أن العقود والخدمات الأساسية ما زالت تعمل |
| Seed/runtime data | أن بيانات التشغيل تغطي القدرات والسيناريوهات المطلوبة |
| Frontend smoke/role audit | أن السطح اليومي ومسار الإنشاء يعرضان صندوق/حملة ولا ينهاران |

ما لا يفعله هذا الدليل:

- لا يضيف API جديد.
- لا ينشئ migration.
- لا يعيد تسمية `Entity`.
- لا يضيف `/funds` alias.
- لا يحذف rollback flag.
- لا يحول كل قالب إلى رحلة UI كاملة؛ هذا مؤجل إلى `F-004`.

## أوامر التحقق المنفذة

### Browser smoke

الهدف:

- فتح `/login`.
- استخدام دخول المطورين.
- الوصول إلى `/dashboard`.
- التأكد أن الصفحة ليست فارغة ولا يوجد framework overlay أو console errors.
- التأكد من ظهور لغة `صندوق/حملة` في السطح اليومي.

النتيجة:

- `http://localhost:3333/login` فتح بعنوان `تسجيل الدخول | CollectiveTrustOS`.
- الدخول بـ `seed.ahmed.family` وصل إلى `http://localhost:3333/dashboard`.
- console errors/warnings: `0`.
- السطح عرض نصوص مثل `الصناديق`, `صندوق عائلة الهاشمي`, و`حملة علاج فهد`.
- تم التقاط screenshots عبر Browser runtime كدليل بصري غير ملتزم في git.

ملاحظة:

- محاولة تفاعل داخل dashboard أكدت أن السطح اليومي يختصر التنقل حسب الدور. هذا لا يعد فجوة في F-001 لأن `test:ux:roles` يغطي daily navigation وdirect-route permissions على 18 مستخدم.

### Backend Phase D parity

الأمر:

```bash
npm run test:phase-d:parity
```

النتيجة:

```text
Test Suites: 2 passed, 2 total
Tests: 12 passed, 12 total
```

يغطي:

- إنشاء الصندوق low-level contract.
- تطبيق template كسياسات ومحافظ ومسارات ودفاتر وتدقيق.
- إنشاء حملة مرتبطة بصندوق أب بدون خلطها مع setup template.
- رفض template غير صالح قبل إنشاء الصندوق.
- منع الوصول لغير العضو.
- إرجاع دور العضو في تفاصيل السجل.
- منع تغيير `Entity.type` من update العام.
- تفويض الإعدادات المتقدمة عبر `canManageAdvancedSettings`.
- coverage seed stories للحوكمة، التصويت، اللجان، المال، الصرف، الاشتراكات، النزاعات، الحملات، المحافظ المتعددة، والعلاقات.

### Backend capability targeted tests

الأمر:

```bash
npm test -- decisions/decisions.service.spec.ts rules/rules.service.spec.ts ledger/ledger.service.spec.ts ledger/financial-boundaries.spec.ts subscriptions/subscriptions.service.spec.ts payments/payments.service.spec.ts disbursement-requests/disbursement-requests.service.spec.ts wallets/wallets.service.spec.ts balance-transfer-requests/balance-transfer-requests.service.spec.ts auditor/auditor.service.spec.ts appeals/appeals.service.spec.ts invitations/invitations.service.spec.ts membership-applications/membership-applications.service.spec.ts memberships/memberships.service.spec.ts work-surface/work-surface.service.spec.ts --runInBand
```

النتيجة:

```text
Test Suites: 15 passed, 15 total
Tests: 88 passed, 88 total
```

يغطي:

- القرارات والتصويت.
- القواعد والسياسات.
- الدفتر المالي وحدود التوازن.
- الاشتراكات والدفعات.
- الصرف وطلبات الصرف.
- المحافظ والتحويلات.
- التدقيق.
- الاعتراضات.
- الدعوات وطلبات الانضمام.
- تفويض الإعدادات المتقدمة.
- سطح العمل اليومي.

### Frontend create-flow smoke

الأمر:

```bash
PHASE_D_LEGACY_PORT=3100 PHASE_D_NEW_PORT=3100 PHASE_D_DEFAULT_PORT=3100 API_URL=http://localhost:3001/api npm run test:phase-d:create-flow
```

النتيجة:

```text
3 passed
```

يغطي:

- عند إطفاء flag يظهر legacy wizard.
- عند تفعيل flag يظهر اختيار `صندوق` و`حملة`.
- default value يستخدم شاشة `صندوق/حملة`.
- مسار الصندوق يعرض `ابدأ فارغا` والقوالب التشغيلية.
- مسار الحملة يعرض الصندوق الأب وخريطة تشغيل الحملة.
- لا يوجد framework overlay في نتائج الفحص.

ملاحظة تشغيلية:

- المحاولة الأولى فشلت قبل الاختبار لأن خادم Next قائم على `3333` كان يمنع تشغيل dev server ثان لنفس مجلد frontend.
- تم إيقاف العملية `PID 43168` ثم أعيد الاختبار ونجح.
- أعيد تشغيل frontend بعد ذلك على `3333` لاستخدامه في role audit.
- هذه ملاحظة بيئة، وليست فجوة منتج.

### Frontend role surface audit

الأمر:

```bash
BASE_URL=http://localhost:3333 API_URL=http://localhost:3001/api npm run test:ux:roles
```

النتيجة:

```text
1 passed
18/18 users passed
0 issues
```

مخرجات الأدلة:

```text
C:\Users\Bakheet\AppData\Local\Temp\stgp-ux-role-surface-audit-2026-07-01T19-06-08-148Z
```

أسئلة audit المغطاة:

- `what-now`
- `what-is-required`
- `what-do-i-benefit`
- `what-is-blocked-and-why`
- `entity-mixing`
- `daily-navigation`
- `advanced-tools`
- `direct-route-permission`
- `mobile-dashboard-health`
- `http-health`

الأدوار/الأسطح المغطاة:

- Founder
- Admin
- Treasurer
- Auditor
- Committee member
- Multi-fund member
- Suspended member
- Read-only member
- Exited member
- Conditional member
- Pending-review member

### Seed validation

الأمر:

```bash
npm run seed:validate:docker
```

النتيجة:

```text
Seed validation passed.
```

ملخص التغطية:

| المجال | العدد |
|---|---:|
| seed stories | 14 |
| persons | 84 |
| memberships | 127 |
| member preferences | 127 |
| membership applications | 12 |
| invitations | 9 |
| entities/funds/campaigns | 8 |
| wallets | 14 |
| governance paths | 22 |
| committees | 12 |
| subscriptions | 184 |
| beneficiaries | 19 |
| payment dues | 1270 |
| payment records | 1043 |
| one-family decisions | 5 |
| archived expired campaigns | 1 |
| shared wallets | 3 |
| balance snapshots | 1116 |
| notifications | 407 |
| balanced transactions | 988 |

تغطية حالات الدفع:

| الحالة | العدد |
|---|---:|
| `PAID` | 946 |
| `OVERDUE` | 165 |
| `PENDING` | 35 |
| `WAIVED` | 124 |

تغطية سجلات الدفع:

| الحالة | العدد |
|---|---:|
| `CONFIRMED` | 946 |
| `SUBMITTED` | 20 |
| `CANCELLED` | 11 |
| `REJECTED` | 65 |
| `PROCESSING` | 1 |

تغطية خصوصية المستندات:

| المستوى | العدد |
|---|---:|
| `HIDDEN_SENSITIVE` | 133 |
| `VISIBLE_TO_COMMITTEE` | 23 |
| `PUBLIC_TO_MEMBERS` | 4 |
| `AGGREGATED_ONLY` | 1 |
| `VISIBLE_TO_AUDITOR` | 14 |
| `VISIBLE_TO_PARTICIPANTS` | 1 |

ملاحظة:

- تشغيل validation داخل Docker نفذ تثبيت dependencies مؤقت داخل الحاوية وظهر معه npm audit output عن vulnerabilities. هذا لا يغير نتيجة seed validation، لكنه يبقى دينا أمنيا عاما خارج نطاق F-001.

## مصفوفة حفظ القدرات

| القدرة من F-001 | الدليل | النتيجة | ملاحظات |
|---|---|---|---|
| إنشاء صندوق من template | `EntitiesService` template test + seed template normalization | محفوظ | `F-004` سيحول القوالب إلى مصفوفة تفصيلية لكل قالب |
| إنشاء صندوق فارغ | create-flow smoke يعرض `ابدأ فارغا` + low-level create test | محفوظ | تحسين first-run في `F-002` |
| إنشاء حملة من صندوق أب | `EntitiesService.createCampaign` test + create-flow campaign form | محفوظ | الحملة تبقى lifecycle مستقل |
| إضافة محفظة بعد الإنشاء | `wallets.service.spec.ts` + seed wallets coverage | محفوظ | لا يعتمد على سؤال في شاشة الإنشاء |
| إضافة مسار حوكمة | `governancePathTypes` parity + decisions/rules tests | محفوظ | كل الأنواع الأساسية ما زالت مغطاة |
| دعوة عضو أو طلب انضمام | invitations + membership applications tests | محفوظ | role audit يغطي surface حسب الدور |
| الاشتراكات والمستحقات والدفع | subscriptions + payments tests + seed validation | محفوظ | حالات due/payment record مغطاة |
| القرارات والتصويت والتنفيذ | decisions tests + parity + seed validation | محفوظ | يشمل نماذج التصويت الأساسية |
| اللجان وربطها بالمسارات | parity + seed validation + role audit committee surfaces | محفوظ | surfaced للمستخدم المناسب |
| الاعتراضات والنزاعات | appeals tests + parity dispute statuses | محفوظ | ليست في wizard الأول، وهذا مقصود |
| التدقيق وسطح العمل وصحة الصندوق | auditor + work-surface tests + role audit | محفوظ | المصطلحات أصبحت صندوق/حملة |
| العلاقات والمحافظ المتعددة | parity relationship coverage + balance transfer tests | محفوظ | ليست سؤالا وقت الإنشاء |
| platform suspension/read-only/pending-review | seed validation + role audit + suspended guard coverage من parity السابق | محفوظ | يظهر كقيود سطحية لا ككسر |

## الفجوات والمخاطر

لا توجد فجوة blocking في F-001.

الفجوات المؤجلة عمدا:

| البند | السبب | أين يعالج؟ |
|---|---|---|
| رحلة UI كاملة لكل قالب | evidence الحالي يثبت schema/generic service وظهور الخيارات، لا story UI كاملة لكل قالب | `F-004` |
| تهذيب checklist بعد الإنشاء | لم يكن هدف F-001 تعديل first-run | `F-002` |
| قرار حذف rollback | ما زال مبكرا | قرار منتج لاحق |
| `/funds` alias | لا توجد حاجة منتج الآن | `F-005` watch فقط |

## قرار الإغلاق

نعتبر `F-001` مغلقا لأن:

- كل gates المنفذة نجحت.
- لا توجد أخطاء في role audit.
- seed validation مر على قاعدة Docker الحالية.
- backend targeted tests تغطي القدرات التشغيلية الأساسية.
- create-flow smoke أثبت بقاء legacy rollback وdefault صندوق/حملة.
- لا يوجد تغيير schema أو API أو route.

الخطوة التالية المرشحة:

`F-002 - First-run Setup Guidance Polish`.
