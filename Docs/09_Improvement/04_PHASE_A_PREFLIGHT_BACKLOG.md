# 04 - Phase A Preflight Backlog

## حالة الوثيقة

هذا هو أول backlog تنفيذي داخل `Docs/09_Improvement` بعد إغلاق backlog الإنتاج 08.

الملف تابع لـ:

- `../REPOSITORY_STATE.md`
- `00_README.md`
- `01_FUND_EXPERIENCE_TRANSITION_PLAN.md`
- `02_CAPABILITY_PRESERVATION_AUDIT.md`
- `03_PREFLIGHT_GAPS_AND_COMPATIBILITY_AUDIT.md`

لا يبني هذا الملف تجربة الصندوق الجديدة. هو فقط يغلق التعارضات التي تمنع بناءها بأمان.

## الهدف

هذه هي حزمة التنفيذ الأولى قبل تطبيق تجربة "الصندوق" الجديدة.

نطاقها محدود عمدا: إصلاح عقود الإنشاء والقيم المشتركة بين الواجهة والباكند حتى لا نبدأ التوحيد فوق أساس متضارب.

هذه الحزمة تغلق فجوات المرحلة A في:

- `Docs/09_Improvement/03_PREFLIGHT_GAPS_AND_COMPATIBILITY_AUDIT.md`
- الفجوات: `PG-001`, `PG-002`, `PG-004`, `PG-005`, `PG-006`, `PG-007`

## علاقة Phase A مع Backlog الإنتاج 08

هذا الملف لا يعيد ترتيب `Docs/08_Production_Readiness/BACKLOG.md`.

الافتراض التشغيلي الآن:

- `Docs/08_Production_Readiness/BACKLOG.md` هو المرجع التشغيلي الأحدث داخل مجلد 08.
- حسب `BACKLOG.md` المحدث، كل البنود `BL-001` إلى `BL-042` أصبحت `Fixed / Verified` أو `Verified`.
- لذلك Phase A تبدأ الآن من baseline إنتاجي مكتمل من ناحية backlog 08، وليست مطالبة بإعادة فتحه.
- `Docs/08_Production_Readiness/AUDIT_REPORT_v2.md` لا يزال يحتوي تقرير تدقيق أقدم يذكر مشاكل كأنها مفتوحة؛ عند التعارض نعتمد `BACKLOG.md` لأنه أحدث وأدق في حالة التنفيذ.

الدين التقني الموروث من `BL-003` لا نرجع لتعديله داخل backlog 08. نعامله كواقع baseline ستعالجه Phase A:

- `BL-003` أدخل إرسال `defaultGovernanceType` و `allowMultiplePaths` من الواجهة.
- الباكند الحالي لا يقبل هذه الحقول في `CreateEntityDto`.
- `ValidationPipe` الحالي يستخدم `forbidNonWhitelisted: true`.
- لذلك `A-002` و `A-004` هما المكان الصحيح لإصلاح هذا التعارض بعد إغلاق backlog 08، وليس تعديل `BACKLOG.md` السابق.

تأثير آخر بنود backlog 08 بعد تحديثها:

| بند 08 | القرار بالنسبة لـ Phase A |
|---|---|
| `BL-039` حذف أو دمج `seed-templates.ts` | لا يتعارض مع Phase A. تم حذف الملف وإزالة script المرتبط به، ومحتواه موجود في `seed.ts`. تطبيع القوالب الحقيقي يبقى Phase B. |
| `BL-040` رفع تحقق الحملة المنتهية إلى error | متوافق مع الخطة الجديدة لأن الحملات لها lifecycle منفصل ويجب أن يكون seed صارما. |
| `BL-041` اختبارات Stripe/Moyasar webhook | لا يتعارض. يزيد ثبات المسار المالي قبل تجربة الصندوق. |
| `BL-042` توثيق env vars | لا يتعارض. مفيد لتشغيل اختبارات Phase A لاحقا. |

## ليست ضمن هذه الحزمة

هذه الأشياء مهمة، لكنها لا تدخل في Phase A:

- تصميم شاشة إنشاء الصندوق الجديدة بالكامل.
- فصل الحملة كواجهة منتج كاملة.
- بناء `TemplateApplier`.
- إضافة `fundProfile` أو `usageProfile`.
- تفويض الإعدادات المتقدمة.
- إعادة تسمية routes من `/entities` إلى `/funds`.
- تنظيف كل ظهور لكلمة "كيان" في الواجهة.

هذه البنود تأتي في Phase B/C/D بعد إغلاق عقود الإنشاء والقيم.

## تعريف الإغلاق

تعتبر Phase A جاهزة عندما يتحقق التالي:

1. لا توجد شاشة frontend ترسل حقولا يرفضها `CreateEntityDto` أو مسار الإنشاء المعتمد.
2. لا ترسل الواجهة `FRIENDS` كـ `EntityType`.
3. لا يوجد `defaultGovernanceType` وهمي غير محفوظ.
4. كل `VoteType` في الواجهة مطابق لقيم الباكند أو له mapping صريح.
5. كل `TransparencyLevel` في الواجهة مطابق لقيم الباكند.
6. `allowedGovernanceTypes` له default واضح في قاعدة البيانات ولا يكسر إنشاء مسار حوكمة.
7. توجد اختبارات regression تثبت النقاط أعلاه.

## حالة التنفيذ - 2026-06-30

**الحالة:** منفذة على الفرع `work/09-phase-a-preflight`.

ما تم:

- `A-001`: أضيفت اختبارات DTO وخدمة الإنشاء وخدمة مسارات الحوكمة.
- `A-002`: لم تعد الواجهة ترسل `defaultGovernanceType` أو `allowMultiplePaths` إلى `POST /entities`.
- `A-003`: أزيل خيار `FRIENDS` من شاشة إنشاء الكيان ومن label قائمة الكيانات.
- `A-004`: أزيلت خطوة الحوكمة الافتراضية من legacy wizard حتى لا يدعي المستخدم حفظ إعداد غير محفوظ.
- `A-005`: استبدلت قيم التصويت غير المدعومة في الواجهة بقيم `VoteType` الفعلية.
- `A-006`: استبدلت `PUBLIC` بـ `PUBLIC_TO_MEMBERS` وأضيف `AGGREGATED_ONLY` في واجهة السياسة.
- `A-007`: أضيف default صريح لـ `allowedGovernanceTypes` في Prisma schema ومigration، مع guard في الخدمة.

التحقق:

- `npm test -- create-entity.dto.spec.ts entities.service.spec.ts governance-paths.service.spec.ts --runInBand` — نجح، 3 suites و11 tests.
- `npx prisma validate` — نجح.
- JSON parse لترجمات `ar/en common/admin` — نجح.
- `npm run build` في `backend` — نجح.
- `npm run build` في `frontend` — نجح.
- `npm run lint` في `frontend` — نجح.
- static search لقيم `FRIENDS`, `UNANIMOUS`, `WEIGHTED`, و`PUBLIC` داخل كود الواجهة والباكند — لا توجد استخدامات مخالفة، باستثناء اختبار DTO الذي يتعمد إرسال `defaultGovernanceType`.

Seed validation:

- أول محاولة لـ `npm run seed:reset:docker` فشلت لأن قاعدة Docker كانت متأخرة عن migrations الحالية، وكان العمود `refresh_tokens.revokedAt` غير موجود.
- تم تطبيق migrations الحالية على قاعدة Docker عبر `prisma migrate deploy`.
- بعد ذلك نجح `npm run seed:reset:docker`.
- ثم نجح `npm run seed:validate:docker` مستقلا، وأصبحت قاعدة `stgp_dev` خضراء.

## ترتيب التنفيذ المقترح

| الترتيب | التذكرة | السبب |
|---:|---|---|
| 1 | A-001 | نثبت contract الفشل الحالي أو السلوك المتوقع قبل التعديل |
| 2 | A-002 | نغلق mismatch إنشاء الصندوق والحقول غير المقبولة |
| 3 | A-003 | نمنع إرسال `FRIENDS` كقيمة غير مدعومة |
| 4 | A-004 | نزيل `defaultGovernanceType` الوهمي أو نحوله لمسار صحيح |
| 5 | A-005 | نوحد `VoteType` في الواجهة |
| 6 | A-006 | نوحد `TransparencyLevel` في الواجهة |
| 7 | A-007 | نضيف migration/default لـ `allowedGovernanceTypes` |
| 8 | A-008 | نربطها باختبار نهائي سريع |

## A-001 - Contract Regression Tests

**يرتبط بـ:** `PG-001`, `PG-002`, `PG-004`

**الهدف:**

نثبت بعينات واضحة أن عقد الإنشاء لا يقبل حقولا غير معروفة ولا يقبل enum غير موجود، ثم نعدل الكود على أساس نتيجة مقصودة.

**الملفات المتوقعة:**

- `backend/src/entities/entities.service.spec.ts`
- أو test controller/e2e مناسب إن كان موجودا
- `frontend` test أو static guard لاحقا ضمن A-008

**المطلوب:**

- اختبار إنشاء entity ببيانات صالحة.
- اختبار أن payload فيه `defaultGovernanceType` و `allowMultiplePaths` لا يستخدم إلا إذا صار جزءا رسميا من DTO.
- اختبار أن `FRIENDS` لا يقبل كـ `EntityType`.

**قرار التنفيذ:**

نفضل أن تكون النتيجة النهائية واحدة من خيارين فقط:

| الخيار | متى نستخدمه |
|---|---|
| frontend لا يرسل الحقول غير المقبولة | أسرع وأقل مخاطرة للـ legacy flow |
| backend يضيف DTO لمسار setup جديد | إذا بدأنا فعلا ببناء endpoint جديد للإنشاء |

في Phase A، التوصية العملية هي الخيار الأول: نوقف الإرسال الوهمي ونؤجل endpoint setup الجديد لمرحلة تنفيذ تجربة الصندوق.

**قبول التذكرة:**

- tests تفشل قبل الإصلاح أو توثق السلوك الحالي بوضوح.
- tests تنجح بعد إغلاق A-002/A-003/A-004.

## A-002 - Align Create Entity Payload

**يرتبط بـ:** `PG-001`

**المشكلة:**

الواجهة الحالية ترسل:

- `defaultGovernanceType`
- `allowMultiplePaths`

بينما `CreateEntityDto` لا يقبل هذه الحقول، و `ValidationPipe` يمنع الحقول غير المدرجة.

**الملفات المتوقعة:**

- `frontend/src/app/(main)/entities/new/page.tsx`
- `frontend/src/lib/api/entities.ts`
- `backend/src/entities/dto/create-entity.dto.ts`
- `backend/src/entities/entities.service.ts`

**المطلوب في Phase A:**

إغلاق التناقض بدون بناء تجربة جديدة:

1. إما إزالة الحقول من `createEntity` في frontend type والpayload.
2. أو إن قررنا إبقاء `allowMultiplePaths` في الإنشاء، نضيفه رسميا إلى DTO ونحفظه في `EntityPolicy`.

**التوصية:**

- احذف `defaultGovernanceType` من `createEntity` لأنه لا يملك مكانا صحيحا في `EntityPolicy`.
- احسم `allowMultiplePaths` كأحد خيارين:
  - الخيار الأسرع: لا يرسل في الإنشاء، ويعدل لاحقا من policy settings.
  - الخيار الأفضل إذا بسيط: يقبل في DTO ويحفظ في `policy.create`.

**قبول التذكرة:**

- لا يوجد payload من الواجهة يسبب `forbidNonWhitelisted`.
- `frontend/src/lib/api/entities.ts` يطابق DTO الفعلي.
- إنشاء صندوق legacy لا يفشل بسبب حقول زائدة.

## A-003 - Remove Frontend-Only Entity Type `FRIENDS`

**يرتبط بـ:** `PG-002`

**المشكلة:**

`FRIENDS` موجود في شاشة الإنشاء وبعض labels، لكنه غير موجود في `EntityType`.

**الملفات المتوقعة:**

- `frontend/src/app/(main)/entities/new/page.tsx`
- `frontend/src/app/(main)/entities/page.tsx`
- `frontend/src/locales/ar/admin.json`
- `frontend/src/locales/en/admin.json`
- `frontend/src/lib/enum-labels.ts` عند الحاجة

**المطلوب في Phase A:**

- لا ترسل الواجهة `FRIENDS`.
- لا تضيف `FRIENDS` إلى `EntityType` الآن.
- إذا بقي النص في الترجمة فلا يظهر كاختيار إنشاء.

**التوصية:**

في legacy wizard، احذف خيار "أصدقاء" مؤقتا أو اربطه بـ `COMMUNITY` فقط إذا كان mapping واضحا ومخفيا عن المستخدم. الأفضل في Phase A: حذفه من الاختيارات إلى أن ننشئ `fundProfile`.

**قبول التذكرة:**

- بحث `FRIENDS` لا يظهر في خيارات إنشاء entity.
- لا توجد طريقة UI ترسل `type: "FRIENDS"`.
- لا نعدل schema لإضافة enum جديد.

## A-004 - Resolve `defaultGovernanceType`

**يرتبط بـ:** `PG-004`

**المشكلة:**

الواجهة تسأل عن حوكمة افتراضية وترسل `defaultGovernanceType`، لكن الباكند لا يحفظ هذا المفهوم. الحوكمة الفعلية يجب أن تكون `GovernancePath.type` مع `PathPolicy`.

**الملفات المتوقعة:**

- `frontend/src/app/(main)/entities/new/page.tsx`
- `frontend/src/lib/api/entities.ts`
- `backend/src/entities/entities.service.ts`
- لاحقا في Phase B: template/path creation

**المطلوب في Phase A:**

اختيار واحد واضح:

| الخيار | الوصف | التوصية |
|---|---|---|
| إزالة السؤال من payload | يبقى السؤال خارج الإنشاء ولا يرسل | نعم |
| إنشاء path فعلي بعد entity | يحتاج wallet/path setup واضح | ليس الآن |
| إضافة field جديد في EntityPolicy | غير صحيح لأنه ليس نوع تصويت ولا سياسة عامة فقط | لا |

**قبول التذكرة:**

- `defaultGovernanceType` لا يرسل في `createEntity`.
- إن بقيت الخطوة في UI مؤقتا، لا تدعي أن الخيار محفوظ.
- لا توجد ترجمة أو review row تقول إن الحوكمة تطبقت إذا لم تتطبق.

## A-005 - Align Frontend Vote Types

**يرتبط بـ:** `PG-005`

**المشكلة:**

الواجهة تعرض `UNANIMOUS` و `WEIGHTED`، لكن `VoteType` في الباكند لا يحتويهما.

**القيم الفعلية في الباكند:**

- `ONE_MEMBER_ONE_VOTE`
- `ONE_FAMILY_ONE_VOTE`
- `SUBSCRIBERS_ONLY`
- `BY_CONTRIBUTION`
- `SIMPLE_MAJORITY`
- `TWO_THIRDS`
- `SECRET`
- `COMMITTEE_APPROVAL`
- `INDIVIDUAL_WITH_CAP`
- `EMERGENCY_THEN_REVIEW`

**الملفات المتوقعة:**

- `frontend/src/components/Governance/PolicyBuilder.tsx`
- `frontend/src/components/Governance/RuleDesigner.tsx`
- `frontend/src/locales/ar/admin.json`
- `frontend/src/locales/en/admin.json`
- ربما ملف ثابت جديد مثل `frontend/src/lib/domain-options.ts`

**المطلوب:**

- حذف `UNANIMOUS` من الواجهة أو تحويله إلى قاعدة منفصلة لاحقا.
- تحويل معنى "weighted" إلى `BY_CONTRIBUTION` إذا كان المقصود وزن التصويت بالمساهمة.
- عدم عرض كل القيم لكل سياق إذا كان بعضها متقدم جدا، لكن أي قيمة معروضة يجب أن تكون صحيحة.

**قبول التذكرة:**

- لا يوجد `UNANIMOUS` أو `WEIGHTED` كقيمة مرسلة للباكند.
- labels تعرض القيم الفعلية أو mapping مصرح.
- rule designer لا ينتج `allowedVoteTypes` غير مدعومة.

## A-006 - Align Frontend Transparency Levels

**يرتبط بـ:** `PG-006`

**المشكلة:**

`PolicyBuilder` يستخدم `PUBLIC`، بينما enum الفعلي لا يحتوي هذه القيمة.

**القيم الفعلية في الباكند:**

- `PUBLIC_TO_MEMBERS`
- `VISIBLE_TO_PARTICIPANTS`
- `VISIBLE_TO_COMMITTEE`
- `VISIBLE_TO_AUDITOR`
- `HIDDEN_SENSITIVE`
- `AGGREGATED_ONLY`

**الملفات المتوقعة:**

- `frontend/src/components/Governance/PolicyBuilder.tsx`
- `frontend/src/app/(main)/documents/page.tsx`
- `frontend/src/locales/ar/admin.json`
- `frontend/src/locales/en/admin.json`
- `frontend/src/locales/ar/common.json`
- `frontend/src/locales/en/common.json`

**المطلوب:**

- استبدال `PUBLIC` بـ `PUBLIC_TO_MEMBERS`.
- إضافة `AGGREGATED_ONLY` إذا كانت شاشة السياسة تحتاجها.
- التأكد أن docs/documents screens تستخدم نفس labels.

**قبول التذكرة:**

- لا يوجد option value باسم `PUBLIC` ضمن إعدادات السياسة.
- تحديث policy transparency من الواجهة لا يفشل validation.
- labels عربية/إنجليزية مفهومة للمستخدم.

## A-007 - Add DB Default for `allowedGovernanceTypes`

**يرتبط بـ:** `PG-007`

**المشكلة:**

`EntityPolicy.allowedGovernanceTypes` array بدون default واضح في schema/migration، والخدمة تستخدم `.length` مباشرة.

**الملفات المتوقعة:**

- `backend/prisma/schema.prisma`
- migration جديدة تحت `backend/prisma/migrations`
- `backend/src/governance-paths/governance-paths.service.ts`
- test في `backend/src/governance-paths`

**المطلوب:**

1. تحديث Prisma schema:

```prisma
allowedGovernanceTypes GovernancePathType[] @default([])
```

2. migration SQL تقريبي:

```sql
UPDATE "entity_policies"
SET "allowedGovernanceTypes" = ARRAY[]::governance_path_type[]
WHERE "allowedGovernanceTypes" IS NULL;

ALTER TABLE "entity_policies"
ALTER COLUMN "allowedGovernanceTypes"
SET DEFAULT ARRAY[]::governance_path_type[];
```

3. إن كان العمود nullable في DB، ندرس جعله `NOT NULL` بعد backfill.

4. دفاع إضافي في الخدمة إن كان ضروريا:

```ts
const allowed = entityPolicy.allowedGovernanceTypes ?? [];
```

**قبول التذكرة:**

- إنشاء `EntityPolicy` فارغة يعطي `allowedGovernanceTypes = []`.
- إنشاء governance path لا يفشل بسبب `.length`.
- migration قابلة للتطبيق على DB موجودة.

## A-008 - Phase A Verification Pack

**يرتبط بـ:** كل فجوات Phase A

**المطلوب:**

تشغيل حزمة تحقق صغيرة بعد إغلاق A-002 إلى A-007.

**التحقق المقترح:**

Backend:

- `npm test -- entities`
- `npm test -- governance-paths`
- أو الأوامر الفعلية الموجودة في المشروع بعد مراجعة `package.json`.

Frontend:

- typecheck/lint إن كانت مفعلة.
- test أو script صغير يبحث عن القيم غير المدعومة:
  - `FRIENDS` في create entity options.
  - `UNANIMOUS` و `WEIGHTED` في vote options.
  - `PUBLIC` في transparency options.

Seed/DB:

- تشغيل seed validation إذا كانت البيئة جاهزة:
  - `npx ts-node prisma/seed-validate.ts`

**قبول التذكرة:**

- تقرير مختصر يثبت أن Phase A مغلقة.
- أي test لم يتم تشغيله يسجل سبب عدم تشغيله.

## قائمة الملفات ذات الأولوية

| المجال | الملفات |
|---|---|
| إنشاء الصندوق | `frontend/src/app/(main)/entities/new/page.tsx`, `frontend/src/lib/api/entities.ts`, `backend/src/entities/dto/create-entity.dto.ts`, `backend/src/entities/entities.service.ts` |
| التصنيفات | `backend/prisma/schema.prisma`, `frontend/src/lib/enum-labels.ts`, `frontend/src/locales/*/admin.json` |
| التصويت | `frontend/src/components/Governance/PolicyBuilder.tsx`, `frontend/src/components/Governance/RuleDesigner.tsx`, `backend/prisma/schema.prisma` |
| الشفافية | `frontend/src/components/Governance/PolicyBuilder.tsx`, `frontend/src/app/(main)/documents/page.tsx`, `backend/prisma/schema.prisma` |
| قاعدة البيانات | `backend/prisma/schema.prisma`, `backend/prisma/migrations/*`, `backend/src/governance-paths/governance-paths.service.ts` |

## مخاطر التنفيذ

| الخطر | المعالجة |
|---|---|
| إزالة `defaultGovernanceType` تكشف أن خطوة الحوكمة الحالية غير مؤثرة | نعرضها كإعداد لاحق أو نخفيها مؤقتا في legacy flow |
| حذف `FRIENDS` يضيق خيارات المستخدم مؤقتا | سيعود كـ profile اختياري في Phase C وليس enum |
| تغيير vote labels يربك seed/tests القديمة | نحدث tests لتستخدم enum الفعلي |
| migration للـ array default تختلف حسب Postgres/Prisma | نختبرها على DB dev قبل اعتمادها |
| تنظيف `PUBLIC` قد يؤثر على documents labels | نميز بين مصطلح "ظاهر للأعضاء" وقيمة enum الفعلية |

## قرار جاهزية التنفيذ

هذه الحزمة جاهزة للتحويل إلى تذاكر وتنفيذها بدون قرارات منتج إضافية، بشرط قبول الافتراضات التالية:

1. Phase A لا تبني شاشة الصندوق الجديدة.
2. Phase A لا تضيف `fundProfile`.
3. Phase A لا تعيد تسمية `Entity` في الكود.
4. Phase A تصلح التناقضات الحالية فقط وتترك العمق التشغيلي كما هو.

إذا ظهرت حاجة لإضافة endpoint جديد أثناء A-002 أو A-004، يجب إيقاف التوسع ونقلها إلى Phase D الخاصة بمسار الإنشاء الجديد.
