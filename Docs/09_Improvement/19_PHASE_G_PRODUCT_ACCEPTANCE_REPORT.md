# Phase G - Product Acceptance Report

## حالة الوثيقة

**الإصدار التشغيلي:** 2.23
**التاريخ:** 2026-07-02
**الحالة:** منفذة ومتحقق منها
**قرار القبول:** `RC_READY_WITH_POLISH`

## الخلاصة

تم تشغيل Phase G كقبول منتج كامل بعد إغلاق Phase F. النتيجة أن تجربة `صندوق / حملة` الافتراضية تقبل المنتج كمرشح إصدار، مع بقاء العمق التشغيلي الموجود: القوالب، المحافظ، المسارات، التصويت، الاشتراكات، المدفوعات، الأدوار، التدقيق، النزاعات، والمستندات.

لا توجد فجوة blocking تمنع اعتبار الحالة release candidate. توجد ملاحظات polish وتشغيل موثقة أدناه.

## ما تم قبوله

| البند | النتيجة | الدليل |
|---|---|---|
| G-001 inventory | `Accepted` | ثبت مستخدمو seed ونقاط البداية وأوامر القبول. |
| G-002 صندوق فارغ | `Accepted` | إنشاء `Phase G Empty Fund 20260702115336` نجح، النوع `COMMUNITY`، وعدد المحافظ `0` كما هو متوقع لصندوق فارغ. |
| G-003 صندوق من قالب | `Accepted` | القوالب الأربعة أنشأت محفظة ومسارا بالقيم المتوقعة. |
| G-004 حملة | `Accepted` | إنشاء `Phase G Campaign 20260702115336` نجح كـ `CAMPAIGN` تحت صندوق أب. |
| G-005 العضو والاشتراك والدفع | `Accepted` | endpoints العضو أرجعت صناديق، اشتراكات، مستحقات، وسجلات دفع لمستخدمي seed. |
| G-006 الأدوار التشغيلية | `Accepted` | `npm run test:ux:roles` نجح على 18 مستخدم seed بعد إصلاح وصول Docker frontend. |
| G-007 الحوكمة والتدقيق والنزاعات | `Accepted` | قرارات، نزاعات، مستندات، audit logs، وقيود 403 المتوقعة للأدوار غير المخولة. |
| G-008 قرار RC | `Accepted with notes` | القرار `RC_READY_WITH_POLISH`. |

## دليل القوالب

تم إنشاء صندوق من كل قالب أساسي على `http://localhost:3001/api` بالمستخدم `seed.ahmed.family`.

| القالب | templateId | النتيجة |
|---|---|---|
| `CUSTOM_FUND` | `fba96d5c-f6b8-52fb-92c9-0659b0e99211` | محفظة واحدة `SEPARABLE` ومسار واحد `BOARD`. |
| `MUTUAL_AID` | `4050dc87-bea3-539d-beb9-09554fb1cf4d` | محفظة واحدة `SEPARABLE` ومسار واحد `COMMITTEE`. |
| `SHARED_SERVICES` | `7e2c14c7-8826-56c2-9849-2702ec0ce7f1` | محفظة واحدة `SHARED` ومسار واحد `COMMITTEE`. |
| `SUPPORTER_ONLY` | `f22aefba-58f1-5879-9a6a-5c64b01920c5` | محفظة واحدة `SEPARABLE` ومسار واحد `DONATION_ONLY`. |

هذا يثبت أن القوالب نقاط بداية تشغيلية وليست قيودا دائمة على قدرات الصندوق.

## دليل العضو والأدوار

تم تشغيل read-only API acceptance على مستخدمين يمثلون المؤسس، المدير، أمين الصندوق، المراجع، اللجنة، العضو العادي، العضو متعدد الصناديق، العضو الموقوف، العضو المشروط، ومدير العمارة.

نتائج عينة:

| المستخدم | النتيجة |
|---|---|
| `seed.ahmed.family` | 15/15 endpoints نجحت؛ تشمل `entities/mine`, `work-surface/me`, الاشتراكات، المستحقات، سجلات الدفع، النزاعات، القرارات، المستندات، تقرير المراجع، وaudit logs. |
| `seed.sara.family` | 15/15 endpoints نجحت. |
| `seed.layan.audit` | تقرير المراجع وaudit logs متاحان، وclosure checklist رجع 403 متوقع لأنه ليس إجراء مراجع. |
| `seed.nasser.family`, `seed.majed.medical`, `seed.noura.social`, `seed.faisal.overlap`, `seed.khaled.suspended`, `seed.amal.conditional` | سطح العضو والاشتراكات والمدفوعات متاحة، وأدوات الإدارة/التدقيق العميقة ترجع 403 متوقعا عند غياب الصلاحية. |
| `seed.mona.building` | 15/15 endpoints نجحت لصندوق العمارة. |

## الإصلاحات التي نتجت من القبول

### G-BLOCKER-001 - رفض UUID v5 للقوالب

أثناء إنشاء صندوق من قالب، رفض `CreateEntityDto.templateId` معرفات القوالب المستقرة من نوع UUID v5 برسالة `templateId must be a UUID`.

الإصلاح:

- `backend/src/entities/dto/create-entity.dto.ts`: أصبح `templateId` يستخدم `@IsUUID('all')`.
- `backend/src/entities/dto/create-entity.dto.spec.ts`: أضيف اختبار يقبل معرف قالب v5 من seed.

النتيجة: إنشاء الصندوق من القوالب الأربعة نجح.

### G-OPS-001 - seed validator كان يخلط بيانات القبول مع seed الرسمي

بعد إنشاء صناديق قبول runtime، فشل `seed:validate:docker` لأنه عامل الصناديق الجديدة كأنها seed رسمي، فطالبها بحسابات بنكية وتفضيلات واشتراكات.

الإصلاح:

- `backend/prisma/seed-validate.ts`: فحوص seed coverage الصارمة صارت تعمل على UUID v5 المستقرة فقط، وهي طريقة seed الرسمي في المشروع.
- بيانات runtime-created تبقى ظاهرة في التقارير، لكنها لا تكسر صحة seed الرسمي.

النتيجة: `npm run seed:validate:docker` نجح بعد تشغيل القبول واختبارات الواجهة.

### G-OPS-002 - Docker frontend لا يرد عبر port mapping

فشل `test:ux:roles` أول مرة لأن `localhost:3000` كان يغلق الاتصال. ثبت أن Next standalone داخل الحاوية كان يستمع على hostname الحاوية وليس `0.0.0.0`.

الإصلاح:

- `frontend/Dockerfile`: إضافة `ENV HOSTNAME=0.0.0.0`.

النتيجة: Docker frontend صار يرد عبر `localhost:3000`، و`npm run test:ux:roles` نجح.

## أوامر التحقق

| الأمر | النتيجة |
|---|---|
| `npm test -- entities/dto/create-entity.dto.spec.ts --runInBand` في backend | 1 suite, 4 tests passed. |
| `npm run test:phase-d:parity` في backend | 2 suites, 12 tests passed. |
| `npm run build` في backend | passed. |
| API acceptance لصندوق فارغ وقوالب وحملة | passed. |
| API acceptance للعضو والأدوار والحوكمة | passed مع 403 متوقعة للأدوار غير المخولة. |
| `docker compose build frontend` | passed، وتضمن `next build`. |
| `npm run test:phase-d:create-flow` في frontend | 3 passed. |
| `npm run test:ux:roles` في frontend | 1 passed، يغطي 18 مستخدم seed. |
| `npm run seed:validate:docker` في backend بعد كل الاختبارات | passed. |

## ملاحظات polish

| الملاحظة | التصنيف | الإجراء المقترح |
|---|---|---|
| PowerShell يعرض بعض الأسماء العربية التي أنشئت أثناء القبول كـ `????` في خرج الطرفية. | polish / tooling | استخدام أسماء ASCII في بيانات قبول آلية أو ضبط UTF-8 في سكربتات القبول. لا يؤثر على المنتج. |
| قاعدة التطوير تحتوي سجلات قبول Phase G runtime. | operational note | مقبول في بيئة التطوير. عند الحاجة لنقطة بداية نظيفة، شغل seed reset قبل جولة قبول جديدة. |
| `/entities` ما زال route التوافقي الظاهر في URL. | accepted product decision | لا يضاف `/funds` الآن؛ أي alias لاحق يكون additive وبحزمة مستقلة. |

## قرار Release Candidate

القرار: `RC_READY_WITH_POLISH`.

الأسباب:

- مسار إنشاء صندوق/حملة الافتراضي يعمل.
- القوالب الأربعة تعمل وتنتج البنية المتوقعة.
- الصندوق الفارغ لا يكسر التشغيل، ويترك الإكمال لما بعد الإنشاء.
- الحملة منفصلة كـ `CAMPAIGN` ومرتبطة بصندوق أب.
- العضو والأدوار التشغيلية والحوكمة والتدقيق والنزاعات بقيت متاحة بعد التبسيط.
- لا توجد قدرة من القدرات التي بنيناها في 08/09 أصبحت غير قابلة للوصول.

لا يبدأ عمل ميزة جديدة قبل تحويل ملاحظات polish إلى backlog منفصل عند الحاجة.
