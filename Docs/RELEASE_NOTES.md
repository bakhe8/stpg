# Release Notes - CollectiveTrustOS

## 2.31 - 2026-07-02

**النوع:** RC acceptance run
**الحالة:** `v0.1.0-rc.1` جاهز كمرشح إصدار

### ما تغير

- أضيف `Docs/09_Improvement/22_RC_ACCEPTANCE_RUN_20260702.md`.
- تم تشغيل جولة RC نظيفة بعد `seed:reset:docker`.
- تم تثبيت القرار النهائي للجولة كـ `RC_READY`.
- تم اعتماد وسم الإصدار المرشح `v0.1.0-rc.1`.
- تم تحديث `Docs/09_Improvement/00_README.md`, `Docs/README.md`, و`Docs/REPOSITORY_STATE.md` إلى الإصدار التشغيلي `2.31`.

### المعنى العملي

المستودع جاهز كأول Release Candidate بعد إغلاق 08 و09. هذا ليس production deployment تلقائيا؛ النشر الفعلي يحتاج قرار بيئة نشر وخطة تشغيل مستقلة.

### التحقق

- `npm run seed:reset:docker`: passed، وبدأت الجولة من `runtimeCreatedEntities = 0`.
- `npm run acceptance:phase-g:hygiene` قبل الجولة: passed، `candidateCount = 0`.
- `npm run seed:validate:boundary` قبل وبعد الجولة: passed.
- `npm run seed:validate:docker` قبل وبعد الجولة: passed.
- `npm run acceptance:phase-g`: passed.
- `npm run test:phase-d:parity`: passed، 2 suites / 12 tests.
- `npm run build` في backend: passed.
- `npm run test:phase-d:create-flow`: passed، 3 tests.
- `npm run test:ux:roles`: passed، مع readiness تلقائي.
- `npm run build` في frontend: passed.
- `npm run acceptance:phase-g:hygiene` بعد الجولة: passed، `candidateCount = 6`.

## 2.30 - 2026-07-02

**النوع:** PGP-006 route alias watch/no-action
**الحالة:** مغلقة ومتحقق منها

### ما تغير

- تم إغلاق `PGP-006` كـ `Watch / No Action`.
- تم تثبيت أن `/entities` هو المسار التوافقي/canonical الحالي للواجهة والروابط والاختبارات.
- لم تتم إضافة `/funds` كـ alias أو redirect أو rewrite.
- تم إغلاق `20_POST_PHASE_G_POLISH_BACKLOG.md` بعد اكتمال `PGP-001` إلى `PGP-006`.
- تم تحديث `Docs/09_Improvement/00_README.md`, `Docs/README.md`, و`Docs/REPOSITORY_STATE.md` إلى الإصدار التشغيلي `2.30`.

### المعنى العملي

لا يوجد بند مفتوح في post Phase G polish backlog. إعادة قبول المنتج تتم من `21_RC_ACCEPTANCE_RUNBOOK.md`. قرار `/funds` لا يفتح إلا كقرار منتج جديد وبحزمة additive مستقلة.

### التحقق

- `frontend/next.config.ts`: لا `rewrites` ولا `redirects`.
- لا توجد route directories لـ `/funds`.
- بحث focused في `frontend` و`backend` عن `/funds`, `funds/`, `redirects(`, و`rewrites(`: لا نتائج.
- `git diff --check`.

## 2.29 - 2026-07-02

**النوع:** PGP-005 RC acceptance runbook
**الحالة:** منفذة ومتحقق منها

### ما تغير

- أضيف `Docs/09_Improvement/21_RC_ACCEPTANCE_RUNBOOK.md`.
- يوضح runbook طريقة إعادة تشغيل قبول RC من الوثائق فقط.
- يغطي تشغيل Docker stack، backend health، frontend readiness، acceptance harness، create-flow smoke، UX role audit، seed validation، وbackend parity عند الحاجة.
- يوضح أين تحفظ أدلة التشغيل المؤقتة خارج المستودع.
- يوضح متى نعيد `seed:reset:docker` ومتى نكتفي بالتحقق.
- تم تحديث `Docs/09_Improvement/20_POST_PHASE_G_POLISH_BACKLOG.md`, `Docs/09_Improvement/00_README.md`, `Docs/REPOSITORY_STATE.md`, و`Docs/README.md` إلى الإصدار التشغيلي `2.29`.

### المعنى العملي

إعادة قبول المنتج لم تعد تعتمد على المحادثة أو تقرير Phase G الطويل. عضو جديد في الفريق يستطيع تشغيل الجولة من runbook واحد. العمل التالي هو `PGP-006`: Route Alias Watch.

### التحقق

- تمت مراجعة أوامر runbook مقابل `backend/package.json` و`frontend/package.json`.
- `git diff --check`.

## 2.28 - 2026-07-02

**النوع:** PGP-004 Docker frontend readiness
**الحالة:** منفذة ومتحقق منها

### ما تغير

- أضيف `frontend/scripts/docker-frontend-readiness.cjs`.
- أضيف أمر `npm run readiness:frontend` في `frontend/package.json`.
- أضيف `pretest:ux:roles` حتى يفشل UX role audit مبكرا إذا لم ترد الواجهة.
- أضيف healthcheck لخدمة `frontend` في `docker-compose.yml`.
- يستخدم healthcheck داخل الحاوية `http://127.0.0.1:3000/login` لتفادي رفض الاتصال عبر `localhost` في Alpine.
- بقي `frontend/Dockerfile` مثبتا على `HOSTNAME=0.0.0.0`.
- تم تحديث `Docs/09_Improvement/20_POST_PHASE_G_POLISH_BACKLOG.md`, `Docs/09_Improvement/00_README.md`, `Docs/REPOSITORY_STATE.md`, و`Docs/README.md` إلى الإصدار التشغيلي `2.28`.

### المعنى العملي

مشكلة frontend port mapping ستظهر الآن كفشل readiness واضح قبل Playwright، كما أن Docker يعلن حالة الواجهة الصحية. العمل التالي هو `PGP-005`: RC Acceptance Runbook.

### التحقق

- `npm run readiness:frontend` في frontend: passed.
- `docker compose up -d frontend`: frontend `healthy`.
- `npm run test:ux:roles` في frontend: passed مع pre-readiness.
- `git diff --check`.

## 2.27 - 2026-07-02

**النوع:** PGP-003 seed validator runtime boundary
**الحالة:** منفذة ومتحقق منها

### ما تغير

- أضيف `backend/prisma/seed-runtime-boundary.ts`.
- أضيف `backend/prisma/seed-runtime-boundary-check.ts`.
- أضيف أمر `npm run seed:validate:boundary` في `backend/package.json`.
- أصبحت story coverage في `seed-validate` تبنى عبر `buildSeedStoryCoverage(...)` من سجلات UUID v5 الرسمية فقط.
- صار `seed-validate` يعرض `seedEntities` و`runtimeCreatedEntities` في summary.
- بقيت بيانات runtime-created ظاهرة في الإحصاءات والتوزيعات، لكنها لا تدخل في قواعد coverage الرسمية.
- تم تحديث `Docs/09_Improvement/20_POST_PHASE_G_POLISH_BACKLOG.md`, `Docs/09_Improvement/00_README.md`, `Docs/REPOSITORY_STATE.md`, و`Docs/README.md` إلى الإصدار التشغيلي `2.27`.

### المعنى العملي

يمكن تشغيل قبول Phase G عدة مرات بدون أن تتحول بيانات runtime إلى مصدر نجاح أو فشل لقصة seed الرسمية. العمل التالي هو `PGP-004`: Docker Frontend Readiness Check.

### التحقق

- `npm run seed:validate:boundary` في backend: passed.
- `npm run seed:validate:docker` في backend: passed.
- خرج validator الحالي أظهر `seedEntities = 8` و`runtimeCreatedEntities = 20`.
- `git diff --check`.

## 2.26 - 2026-07-02

**النوع:** PGP-002 acceptance data hygiene
**الحالة:** منفذة ومتحقق منها

### ما تغير

- أضيف `scripts/phase-g-acceptance-data-hygiene.ps1`.
- أضيف أمر `npm run acceptance:phase-g:hygiene` في `backend/package.json`.
- صار لدينا dry-run واضح يعرض سجلات acceptance المرشحة فقط من `profileKey=ACCEPTANCE` أو `profileLabel=Acceptance Harness` أو أسماء `Acceptance %`.
- يعرض السكربت JSON فيه `candidateCount`, `candidates`, `relatedCounts`, وقرار السلامة.
- رُفض الحذف الجزئي عبر `-Delete` صراحة لأن علاقات ledger/audit/membership/wallet/path/policy لا تجعل حذف صفوف acceptance فقط خيارا آمنا.
- بقي التنظيف الفعلي الموثوق عبر reset كامل صريح عند الحاجة إلى قاعدة تطوير نظيفة.
- تم تحديث `Docs/09_Improvement/20_POST_PHASE_G_POLISH_BACKLOG.md`, `Docs/09_Improvement/00_README.md`, `Docs/REPOSITORY_STATE.md`, و`Docs/README.md` إلى الإصدار التشغيلي `2.26`.

### المعنى العملي

يمكن للفريق الآن معرفة بيانات قبول Phase G الحالية بدون الرجوع إلى قاعدة البيانات يدويا، وبدون خطر حذف جزئي. العمل التالي هو `PGP-003`: Seed Validator Runtime Boundary.

### التحقق

- `npm run acceptance:phase-g:hygiene` في backend: passed، ووجد `candidateCount = 6`.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\phase-g-acceptance-data-hygiene.ps1 -Delete`: rejected by design.
- `npm run seed:validate:docker` في backend: passed.

## 2.25 - 2026-07-02

**النوع:** PGP-001 acceptance harness
**الحالة:** منفذة ومتحقق منها

### ما تغير

- أضيف `scripts/phase-g-acceptance-harness.mjs`.
- أضيف أمر `npm run acceptance:phase-g` في `backend/package.json`.
- صار قبول API لصندوق فارغ، القوالب الأربعة، والحملة المرتبطة قابلا للإعادة بدون نسخ يدوي.
- يستخدم السكربت أسماء ASCII و`profileKey=ACCEPTANCE` و`profileLabel=Acceptance Harness`.
- يخرج السكربت JSON summary ويحفظ نسخة في temp.
- تم تحديث `Docs/09_Improvement/20_POST_PHASE_G_POLISH_BACKLOG.md`, `Docs/09_Improvement/00_README.md`, `Docs/REPOSITORY_STATE.md`, و`Docs/README.md` إلى الإصدار التشغيلي `2.25`.

### المعنى العملي

لم يعد قبول G-002/G-003/G-004 معتمدا على سكربت PowerShell يدوي. العمل التالي هو `PGP-002`: Acceptance Data Hygiene.

### التحقق

- `npm run acceptance:phase-g` في backend: passed.
- `npm run seed:validate:docker` في backend بعد تشغيل harness: passed.
- `git diff --check`.

## 2.24 - 2026-07-02

**النوع:** Post Phase G polish backlog
**الحالة:** backlog مفتوح للتنفيذ

### ما تغير

- أضيفت وثيقة `Docs/09_Improvement/20_POST_PHASE_G_POLISH_BACKLOG.md`.
- حُولت ملاحظات `RC_READY_WITH_POLISH` إلى backlog صغير مستقل.
- رتب backlog الجديد البنود `PGP-001` إلى `PGP-006`: acceptance harness، data hygiene، seed validator runtime boundary، Docker frontend readiness، RC acceptance runbook، وroute alias watch.
- ثبتت الوثيقة أن هذا العمل tooling/runbook فقط، ولا يفتح schema أو route alias أو ميزة منتج جديدة.
- تم تحديث `Docs/09_Improvement/00_README.md`, `Docs/REPOSITORY_STATE.md`, و`Docs/README.md` إلى الإصدار التشغيلي `2.24`.

### المعنى العملي

قبول Phase G بقي `RC_READY_WITH_POLISH`. العمل التالي ليس ميزة جديدة؛ يبدأ من `PGP-001` لتحويل قبول API اليدوي إلى acceptance harness قابل للإعادة.

### التحقق

- `git diff --check`.

## 2.23 - 2026-07-02

**النوع:** Phase G product acceptance report
**الحالة:** Phase G منفذة؛ القرار `RC_READY_WITH_POLISH`

### ما تغير

- أضيفت وثيقة `Docs/09_Improvement/19_PHASE_G_PRODUCT_ACCEPTANCE_REPORT.md`.
- تم تشغيل قبول المنتج على رحلات: صندوق فارغ، صندوق من القوالب الأربعة، حملة مرتبطة بصندوق أب، العضو والاشتراك والدفع، الأدوار التشغيلية، والحوكمة والتدقيق والنزاعات.
- أُصلح رفض `templateId` من نوع UUID v5 في `CreateEntityDto` باستخدام `@IsUUID('all')` مع اختبار مخصص.
- أُصلح `seed-validate` حتى يميز seed الرسمي ذي UUID v5 عن سجلات قبول runtime، فلا تفشل بوابات seed بسبب صناديق أنشأها التطبيق أثناء القبول.
- أُصلح Docker frontend بإضافة `HOSTNAME=0.0.0.0` حتى يرد Next standalone عبر Docker port mapping على `localhost:3000`.
- تم تحديث `Docs/09_Improvement/00_README.md`, `Docs/09_Improvement/18_PHASE_G_PRODUCT_ACCEPTANCE_BACKLOG.md`, `Docs/REPOSITORY_STATE.md`, و`Docs/README.md` إلى الإصدار التشغيلي `2.23`.

### المعنى العملي

تجربة `صندوق / حملة` الافتراضية أصبحت مقبولة كمرشح إصدار. لا توجد blockers تمنع إنشاء الصندوق أو الحملة أو الوصول للعمق التشغيلي. أي عمل تالٍ يجب أن يكون backlog polish منفصل مبني على تقرير القبول.

### التحقق

- `npm test -- entities/dto/create-entity.dto.spec.ts --runInBand` في backend: 4 passed.
- `npm run test:phase-d:parity` في backend: 12 passed.
- `npm run build` في backend.
- API acceptance لصندوق فارغ، القوالب الأربعة، والحملة.
- API acceptance للعضو والأدوار والحوكمة.
- `docker compose build frontend`، ويتضمن `next build`.
- `npm run test:phase-d:create-flow` في frontend: 3 passed.
- `npm run test:ux:roles` في frontend: 1 passed على 18 مستخدم seed.
- `npm run seed:validate:docker` في backend بعد كل الاختبارات: passed.
- `git diff --check`.

## 2.22 - 2026-07-02

**النوع:** Phase G product acceptance backlog
**الحالة:** Phase G مفتوحة للتنفيذ

### ما تغير

- أضيفت وثيقة `Docs/09_Improvement/18_PHASE_G_PRODUCT_ACCEPTANCE_BACKLOG.md`.
- فتحت الوثيقة مرحلة قبول المنتج كرحلات كاملة قبل أي ميزة جديدة أو route alias.
- رتبت Phase G إلى بنود `G-001` إلى `G-008`: inventory، رحلة المؤسس بصندوق فارغ، رحلة القالب، الحملة، العضو والاشتراك والدفع، الأدوار التشغيلية، الحوكمة والتدقيق والنزاعات، ثم قرار release candidate.
- ثبتت الوثيقة أن Phase G لا تغير schema أو routes أو `Entity` داخليا، ولا تحذف rollback flag.
- تم تحديث `Docs/09_Improvement/00_README.md`, `Docs/REPOSITORY_STATE.md`, و`Docs/README.md` إلى الإصدار التشغيلي `2.22`.

### المعنى العملي

انتهى hardening الحالي، والخطوة التالية صارت قبول المنتج لا بناء ميزة. يبدأ التنفيذ من `G-001` لتجهيز أدلة القبول، ثم تشغيل رحلات المستخدمين والأدوار قبل قرار `RC_READY` أو `RC_BLOCKED`.

### التحقق

- `git diff --check`.

## 2.21 - 2026-07-01

**النوع:** Phase F legacy and URL hygiene watch
**الحالة:** F-005 منفذة ومتحقق منها؛ Phase F مغلقة

### ما تغير

- أضيفت وثيقة `Docs/09_Improvement/17_PHASE_F_LEGACY_URL_HYGIENE_WATCH.md`.
- ثبتت الوثيقة أن `/entities` يبقى المسار التوافقي القائم، وأن `/funds` لا يضاف الآن كـ alias أو redirect أو rewrite.
- ثبتت أن `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=false` يبقى rollback للنموذج القديم.
- سجلت الوثيقة أن ظهور `/entities` المتبقي محصور في URL/links، بينما النص الظاهر للمستخدم يبقى صندوق/حملة.
- تم تحديث `Docs/09_Improvement/12_POST_PHASE_E_NEXT_BACKLOG.md`, `Docs/09_Improvement/00_README.md`, `Docs/REPOSITORY_STATE.md`, و`Docs/README.md` إلى الإصدار التشغيلي `2.21`.

### المعنى العملي

التجربة الجديدة مستقرة كمسار افتراضي، والمسار القديم ما زال قابلًا للرجوع عبر الفلاق. لا يوجد تغيير API أو schema أو route alias. أي `/funds` لاحق يجب أن يكون حزمة مستقلة additive ويحافظ على `/entities`.

### التحقق

- فحص `frontend/next.config.ts`: لا rewrites أو redirects.
- فحص عدم وجود route `/funds`.
- بحث focused عن `/funds` في كود الواجهة والباكند.
- `npm run test:phase-d:create-flow` في frontend: 3 passed.
- `git diff --check`.

## 2.20 - 2026-07-01

**النوع:** Phase F template capability matrix
**الحالة:** F-004 منفذة ومتحقق منها

### ما تغير

- أضيفت وثيقة `Docs/09_Improvement/16_PHASE_F_TEMPLATE_CAPABILITY_MATRIX.md`.
- ثبتت الوثيقة أن القوالب نقاط بداية تشغيلية، وليست قيودا دائمة على قدرات الصندوق.
- غطت المصفوفة `ابدأ فارغا`، صندوق مخصص، صندوق تكافل، صندوق خدمات مشتركة، صندوق داعمين فقط، وحملة مرتبطة بصندوق أب.
- ثبتت الوثيقة أن `templateId` مرجع تاريخي، وأن `profileKey/profileLabel` وصف اختياري، وأن `enabledModules` metadata حاليا لا gate تشغيلي.
- تم تحديث `Docs/09_Improvement/12_POST_PHASE_E_NEXT_BACKLOG.md`, `Docs/09_Improvement/00_README.md`, `Docs/REPOSITORY_STATE.md`, و`Docs/README.md` إلى الإصدار التشغيلي `2.20`.

### المعنى العملي

المؤسس يستطيع البدء فارغا أو من قالب، ثم يوسع الصندوق لاحقا لكل القدرات الموجودة: محافظ متعددة، `SHARED/SEPARABLE`، تصويت، لجان، قواعد، صرف، تدقيق، علاقات، نزاعات، وحملات. الحملة بقيت مسارا منفصلا عن قوالب الصندوق لأنها مرتبطة بصندوق أب ولها lifecycle مؤقت.

### التحقق

- قراءة seed/schema/service المرتبطة بالقوالب والحملات.
- فحص استخدام `enabledModules`: لا يوجد استخدام حالي كقيد تشغيلي.
- `npm run test:phase-d:parity` في backend.
- `npm run seed:validate:docker` في backend.
- `git diff --check`.

## 2.19 - 2026-07-01

**النوع:** Phase F advanced settings access audit
**الحالة:** F-003 منفذة ومتحقق منها

### ما تغير

- أضيفت وثيقة `Docs/09_Improvement/15_PHASE_F_ADVANCED_SETTINGS_ACCESS_AUDIT.md`.
- أصبح `findById` و`findMyEntities` يعيدان `canManageAdvancedSettings` للعضوية الحالية.
- أصبحت صفحة `/rules` تعتمد على صلاحية الإعدادات المتقدمة المستقلة، وليس `ADMIN_ROLES`.
- يستطيع المفوض المتقدم غير المدير الوصول إلى القواعد والسياسة.
- لا يحصل أمين الصندوق أو المراجع أو عضو اللجنة على وصول تلقائي بدون تفويض.
- تم تحديث `Docs/09_Improvement/12_POST_PHASE_E_NEXT_BACKLOG.md`, `Docs/09_Improvement/00_README.md`, `Docs/REPOSITORY_STATE.md`, و`Docs/README.md` إلى الإصدار التشغيلي `2.19`.

### المعنى العملي

صار العمق التشغيلي في القواعد والسياسات متاحا للمؤسس ومن يفوضه فقط. الدور التشغيلي المالي أو الرقابي لا يكفي وحده للوصول إلى سياسة الصندوق أو تعديل القواعد.

### التحقق

- Backend targeted tests: 3 suites، 31 tests passed.
- Frontend rules tests: 1 file، 5 tests passed.
- `npm run lint` في frontend.
- `npm run build` في backend.
- `npm run build` في frontend.
- Browser: المؤسس يرى `/rules`، أمين الصندوق غير المفوض لا يراها، وأمين الصندوق نفسه يراها بعد تفويض مؤقت ثم أُعيد التفويض إلى false.

## 2.18 - 2026-07-01

**النوع:** Phase F first-run setup guidance
**الحالة:** F-002 منفذة ومتحقق منها

### ما تغير

- أضيفت وثيقة `Docs/09_Improvement/14_PHASE_F_FIRST_RUN_SETUP_GUIDANCE.md`.
- بعد إنشاء صندوق من المسار الجديد، ينتقل المستخدم إلى صفحة الصندوق مع `created=1&start=empty|template`.
- أضيفت لوحة `أول تشغيل` داخل صفحة الصندوق لتوضيح أن `ابدأ فارغا` مقصود وليس حالة ناقصة.
- تعرض اللوحة أول بند ناقص في setup checklist كخطوة تالية مقترحة.
- تم تحديث `Docs/09_Improvement/12_POST_PHASE_E_NEXT_BACKLOG.md`, `Docs/09_Improvement/00_README.md`, `Docs/REPOSITORY_STATE.md`, و`Docs/README.md` إلى الإصدار التشغيلي `2.18`.

### المعنى العملي

المؤسس يستطيع البدء بصندوق خفيف بدون فهم كل التفاصيل وقت الإنشاء، ثم يكمل المحافظ والمسارات والقواعد من داخل الصندوق. العمق التشغيلي بقي متاحا ولم يتغير schema أو API أو routes.

### التحقق

- `npm run lint`
- `npm run build`
- `npm run test:phase-d:create-flow`: 3 passed.
- `npm run test:ux:roles`: 1 passed، ويغطي 18 مستخدم seed.
- Browser desktop على first-run empty fund: لوحة أول تشغيل والخطوة التالية ظاهرتان، 0 console errors.
- Browser mobile `390x844`: لوحة أول تشغيل وزر `إنشاء محفظة` ظاهران، 0 console errors.
- `git diff --check`

## 2.17 - 2026-07-01

**النوع:** Phase F capability evidence pack
**الحالة:** F-001 منفذة ومتحقق منها

### ما تغير

- أضيفت وثيقة `Docs/09_Improvement/13_PHASE_F_CAPABILITY_EVIDENCE_PACK.md`.
- ثبتت الوثيقة أدلة حفظ القدرات بعد default switch.
- تم تحديث `Docs/09_Improvement/12_POST_PHASE_E_NEXT_BACKLOG.md` لتعليم F-001 كمغلقة.
- تم تحديث `Docs/09_Improvement/00_README.md`, `Docs/REPOSITORY_STATE.md`, و`Docs/README.md` إلى الإصدار التشغيلي `2.17`.

### المعنى العملي

المسار الافتراضي `صندوق/حملة` لم يحذف قدرات التصويت، اللجان، المحافظ، المسارات، الاشتراكات، الدفع، الصرف، التدقيق، النزاعات، الحملات، العلاقات، أو سطح الأدوار اليومي. لا توجد فجوة blocking، والعمل التالي المرشح هو `F-002`.

### التحقق

- Browser smoke على `/login -> dev login -> /dashboard`: لا توجد console errors.
- `npm run test:phase-d:parity`: 2 suites، 12 tests passed.
- backend targeted tests: 15 suites، 88 tests passed.
- `npm run test:phase-d:create-flow`: 3 passed.
- `npm run test:ux:roles`: 18/18 users، 0 issues.
- `npm run seed:validate:docker`: passed.
- `git diff --check`

## 2.16 - 2026-07-01

**النوع:** Post Phase E recommended backlog
**الحالة:** توثيق ترشيح العمل التالي بعد إغلاق Phase E

### ما تغير

- أضيفت وثيقة `Docs/09_Improvement/12_POST_PHASE_E_NEXT_BACKLOG.md`.
- ثبتت الوثيقة أن العمل التالي المرشح هو Phase F صغيرة بعنوان `Post-default UX and Capability Hardening`.
- أول بند مرشح هو `F-001`: تحويل جرد حفظ القدرات إلى evidence pack عملي بعد default switch.
- تم تحديث `Docs/09_Improvement/00_README.md`, `Docs/REPOSITORY_STATE.md`, و`Docs/README.md` حتى تشير إلى المرجع الجديد.

### المعنى العملي

لا نبدأ بإعادة تسمية داخلية أو `/funds` alias أو migration. نبدأ بتثبيت أن تجربة صندوق/حملة الافتراضية لا تخسر التصويت، اللجان، المحافظ، المسارات، الاشتراكات، الصرف، التدقيق، النزاعات، الحملات، والعلاقات.

### التحقق

- `git diff --check`

## 2.15 - 2026-07-01

**النوع:** Phase E route alias decision
**الحالة:** E-006 منفذة كقرار؛ لا نضيف `/funds` alias الآن، وPhase E مغلقة

### ما تغير

- تم حسم قرار E-006: يبقى `/entities` هو المسار الواجهي/التقني المعتمد حالياً.
- لا تتم إضافة `/funds` كـ rewrite أو redirect في هذه المرحلة.
- تم توثيق معايير إضافة alias لاحقاً إذا أصبح URL نفسه جزءاً مهماً من تجربة المستخدم أو الروابط المنشورة.
- لا يوجد تغيير في الكود أو schema أو API أو bookmarks الحالية.

### المعنى العملي

التبسيط الحالي اكتمل على مستوى النصوص والسطوح المرئية. أما URL alias فليس ضرورياً الآن، لأن إضافته بدون تحويل كل الروابط والاختبارات ستخلق طبقة مزدوجة غير مكتملة. إذا احتجناه لاحقاً، يكون عملاً مستقلاً additive لا يحذف `/entities`.

### التحقق

- جرد `/entities` الحالي أظهر انتشاراً واسعاً في الواجهة والاختبارات وسطح العمل.
- تمت مراجعة قرار PG-018 السابق وتثبيته كقرار E-006.
- `git diff --check`

## 2.14 - 2026-07-01

**النوع:** Phase E wider visual and role audit
**الحالة:** E-005 منفذة؛ تدقيق الأدوار الواسع مرّ على 18 مستخدم seed بدون مشاكل

### ما تغير

- عُزز `frontend/scripts/ux-role-audit.spec.cjs` حتى يستخدم dev-login عبر API مباشرة بدلاً من تفاعل هش مع زر دخول المطورين.
- عُدل فحص framework overlay حتى لا يعتبر زر Next Dev Tools في بيئة التطوير خطأً.
- أضيف فحص دائم لأي ظهور مرئي عربي لـ `كيان/كيانات` داخل audit الأدوار.
- نُظفت بقايا سطح العمل في الباكند:
  - `صحة الكيانات` أصبحت `صحة الصناديق والحملات`.
  - `إنشاء كيانات` أصبحت `إنشاء صناديق أو حملات`.

### المعنى العملي

تدقيق E-005 صار بوابة عملية بعد تنظيف المصطلحات: يفحص سطح العمل اليومي والروابط المتقدمة والـ mobile bottom nav والقيود حسب الدور، ويتأكد أن النص المرئي لا يعيد مصطلح "كيان" للمستخدم.

### التحقق

- `npm run build` في backend
- `npm run lint` في frontend
- `npm run test:ux:roles` على 18 مستخدم seed: 18/18 passed، 0 issues
- Browser check على `/login -> dev user -> /dashboard` بدون console errors
- إعادة بناء وتشغيل حاوية backend حتى يعكس endpoint `/work-surface/me` النصوص الجديدة

## 2.13 - 2026-07-01

**النوع:** Phase E legal/privacy terminology review
**الحالة:** E-004 منفذة؛ نصوص الشروط والخصوصية وإقرار الإنشاء توضّح صندوق/حملة وحدود المسؤولية القانونية

### ما تغير

- عُدّلت صفحة `/terms` لتوضح أن استخدام المنصة لا يعد ترخيصاً أو تأسيساً لجهة قانونية.
- عُدّلت صفحة `/privacy` لتستخدم صياغة `مسؤولو الصندوق أو الحملة` وتربط رؤية البيانات بالدور وسياسة الشفافية.
- أصبحت `/terms` و`/privacy` مسارات عامة في `frontend/src/proxy.ts` حتى تظهر الشروط والخصوصية قبل تسجيل الدخول.
- عُدّل إقرار المسؤولية في معالج إنشاء الصندوق/الحملة بالعربية والإنجليزية حتى لا يوحي بأن المنصة تُصدر ترخيصاً أو تنشئ منظمة قانونية.
- بقيت العقود الداخلية والـ routes و`Entity` بدون تغيير.

### المعنى العملي

النصوص القانونية الظاهرة أصبحت منسجمة مع قرار المنتج: المستخدم يتعامل مع صندوق أو حملة، والمنصة أداة تنظيمية لا تنشئ صفة قانونية ولا تتحمل إدارة العمليات المالية.

### التحقق

- `npm run lint` في frontend
- `NEXT_PUBLIC_API_URL='http://localhost:3001/api' NEXT_PUBLIC_ENABLE_DEV_LOGIN='true' NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW='true' npm run build`
- فحص JSON للترجمات العربية والإنجليزية
- تحقق HTTP من ظهور `/terms` و`/privacy` بدون تحويل إلى `/login`
- جرد نصوص قانونية مستهدف

## 2.12 - 2026-07-01

**النوع:** Phase E platform/operator terminology
**الحالة:** E-003 منفذة؛ أدوات المنصة تستخدم صندوق/حملة في الواجهة وتبقي Entity داخلياً

### ما تغير

- أصبحت لوحة `/platform` تصف الجداول والمراجعات كصناديق وحملات بدلاً من الصناديق فقط.
- أصبحت أزرار ومودالات تعليق/تفعيل السجل تختار `fund/campaign` أو `الصندوق/الحملة` حسب `type`.
- أصبحت صفحة اعتراضات التعليق تستخدم صياغة عامة `الصندوق/الحملة` لأن endpoint الاعتراض لا يرسل نوع السجل.
- نُظفت نصوص `PlatformSurfaceService` القادمة من الباكند من عبارات `جدول الكيانات` وعبارات تفترض أن كل سجل صندوق.
- بقيت أسماء `PlatformEntity`, `Entity`, `/platform/entities`, و`/entities` كما هي داخلياً.

### المعنى العملي

مشرف المنصة يرى نفس لغة المنتج البشرية: صندوق/حملة. أما المصطلحات الداخلية فتظل في الكود والـ API حتى لا نفتح تغييراً جذرياً غير مطلوب.

### التحقق

- `npm run build` في backend
- `npm run lint` في frontend
- `NEXT_PUBLIC_API_URL='http://localhost:3001/api' NEXT_PUBLIC_ENABLE_DEV_LOGIN='true' NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW='true' npm run build`
- Playwright rendered mock للوحة المنصة

## 2.11 - 2026-07-01

**النوع:** Phase E dynamic fund/campaign labels
**الحالة:** E-002 منفذة؛ الشاشات المشتركة تفرق بين الصندوق والحملة من بيانات السجل

### ما تغير

- أضيف helper واجهي لاشتقاق سياق الحملة من `isCampaign` أو `type === "CAMPAIGN"`.
- أصبحت قائمة الصناديق، صفحة تفاصيل الصندوق/الحملة، إعدادات الصندوق/الحملة، وصفحة الاشتراكات تستخدم صياغة ديناميكية بين صندوق وحملة.
- أضيفت مفاتيح ترجمة عربية وإنجليزية للحملة في حالات التشغيل، العلاقة، المعلومات، المحافظ، الإعدادات، والاشتراكات.
- بقيت `Entity`, `/entities`, `EntityType`, `X-Entity-ID`, والـ schema بدون تغيير.

### المعنى العملي

تجربة المستخدم لم تعد تفرض كلمة "صندوق" على حملة فعلية في أهم الشاشات المشتركة. التغيير واجهي فقط ويحافظ على العمق التشغيلي الحالي.

### التحقق

- `npm run lint`
- `NEXT_PUBLIC_API_URL='http://localhost:3001/api' NEXT_PUBLIC_ENABLE_DEV_LOGIN='true' NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW='true' npm run build`
- Playwright rendered mock على `http://localhost:3333/entities` لحملة `isCampaign=true`

## 2.10 - 2026-07-01

**النوع:** Phase E UI terminology cleanup
**الحالة:** E-001 منفذة؛ تنظيف لغة الواجهة مع بقاء الباكند والعقود الداخلية كما هي

### ما تغير

- بدأت Phase E بعد إغلاق D-011.
- استبدلت قيم الترجمة الظاهرة من `كيان/Entity` إلى `صندوق/Fund` أو `صندوق أو حملة` حسب السياق.
- حُدّثت النصوص المباشرة في صفحات الواجهة العامة، الانضمام، المحافظ، الاشتراكات، الاعتراضات، وقواعد المشاركة.
- حُدّثت تسمية التحقق الظاهرة لـ `entityId` إلى `الصندوق`.
- حُدّثت توقعات اختبارات UX smoke وrole audit لتطابق لغة المنتج الجديدة.
- أضيفت وثيقة `Docs/09_Improvement/11_PHASE_E_UI_TERMINOLOGY_CLEANUP.md`.

### المعنى العملي

المستخدم العادي يرى الآن لغة `صندوق/حملة` بدلا من "كيان"، بينما بقيت `Entity`, `/entities`, `EntityType`, `X-Entity-ID`, وقاعدة البيانات بدون تغيير. العمل التالي هو E-002 لجعل الشاشات المشتركة تعرض "حملة" ديناميكيا عندما يكون السجل حملة.

### التحقق

- `npm run test:phase-d:create-flow`
- `npm run lint`
- `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=false npm run build`
- `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=true npm run build`

## 2.9 - 2026-07-01

**النوع:** Phase D default switch
**الحالة:** D-011 منفذة؛ مسار صندوق/حملة أصبح default مع rollback للفلاق

### ما تغير

- أصبح مسار إنشاء صندوق/حملة هو الافتراضي داخل `/entities/new`.
- أصبحت قيمة `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=false` هي مسار rollback المؤقت للنموذج القديم.
- أضيف `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=true` إلى `.env.example` و`.env.production.example`.
- حُدّث `frontend/README.md` ليصف الفلاق كسلوك rollback.
- توسع اختبار `npm run test:phase-d:create-flow` ليغطي default/empty value بالإضافة إلى `true` و`false`.
- أضيفت وثيقة `Docs/09_Improvement/10_PHASE_D_DEFAULT_SWITCH.md`.

### المعنى العملي

تجربة المستخدم الطبيعية أصبحت تبدأ بسؤال صندوق أو حملة، مع بقاء النموذج القديم متاحا عند الحاجة عبر `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=false`. لم يتغير الباكند أو قاعدة البيانات أو routes في هذا الإصدار.

## 2.8 - 2026-07-01

**النوع:** Phase D UX smoke tests
**الحالة:** D-010 منفذة؛ المسار الجديد لا يزال خلف feature flag وليس default

### ما تغير

- أضيف اختبار `frontend/scripts/phase-d-create-flow-smoke.spec.cjs`.
- أضيف script باسم `npm run test:phase-d:create-flow` في frontend.
- الاختبار يشغل Next dev server مؤقتا بحالتين: flag off وflag on.
- أضيفت وثيقة `Docs/09_Improvement/09_PHASE_D_UX_SMOKE_TESTS.md`.

### المعنى العملي

أصبح لدينا UX smoke gate قابل للإعادة قبل قرار default switch. الاختبار يثبت أن إطفاء العلم يبقي شاشة الإنشاء القديمة، وأن تفعيله يظهر صندوق/حملة مع بقاء زر الرجوع للنموذج القديم، ويثبت عرض بدء الصندوق وخريطة تشغيل الحملة. المتبقي في Phase D: قرار المنتج `D-011`.

## 2.7 - 2026-07-01

**النوع:** Phase D parity pack
**الحالة:** D-009 منفذة؛ المسار الجديد لا يزال خلف feature flag وليس default

### ما تغير

- أضيف اختبار `backend/src/entities/phase-d-parity.spec.ts`.
- أضيف script باسم `npm run test:phase-d:parity` في backend.
- توسع اختبار `EntitiesService` ليثبت إنشاء الحملة كـ `CAMPAIGN` مرتبطة بصندوق أب، بدون المرور بمنطق القوالب.
- أضيفت وثيقة `Docs/09_Improvement/08_PHASE_D_PARITY_PACK.md`.

### المعنى العملي

أصبح لدينا parity gate واضح قبل أي قرار default switch. الحزمة تثبت تغطية التصويت، اللجان، المال، الصرف، الاشتراكات، النزاعات، الحملات، المحافظ المتعددة، والعلاقات. المتبقي في Phase D: UX smoke tests للعلمين ثم قرار المنتج.

## 2.6 - 2026-06-30

**النوع:** Phase D fund template choice simplification
**الحالة:** D-008 منفذة؛ المسار الجديد لا يزال خلف feature flag وليس default

### ما تغير

- استبدل مسار إنشاء الصندوق الجديد عرض القوالب التقنية بخيارات تشغيلية مفهومة للمؤسس.
- الخيارات المعروضة الآن: ابدأ فارغاً، صندوق مرن، تكافل ومساعدات، خدمات مشتركة، دعم وتبرعات.
- بقي `templateId` وسلوك تطبيق القوالب كما هو؛ التغيير واجهي فقط.
- لم يتغير backend ولا seed القوالب ولا المسار القديم.

### المعنى العملي

القوالب لم تعد تبدو كإعداد تقني داخل إنشاء الصندوق الجديد، لكنها ما زالت نقطة بداية تنشئ نفس المحافظ والمسارات التي ثبتها Phase B. المتبقي في Phase D: parity pack وUX smoke tests قبل أي default switch.

## 2.5 - 2026-06-30

**النوع:** Phase D campaign operating map
**الحالة:** D-007 منفذة؛ المسار الجديد لا يزال خلف feature flag وليس default

### ما تغير

- أضيفت خريطة تشغيلية داخل شاشة إنشاء الحملة في المسار الجديد.
- الخريطة تعرض الصندوق الأب، مدة الحملة، جاهزية بيانات بنك الصندوق الأب، وطريقة تجهيز الحملة بعد الإنشاء.
- أضيف منع واجهي لاختيار تاريخ نهاية حملة في الماضي.
- لا يوجد تغيير backend في هذه الشريحة؛ إنشاء الحملة ما زال يرسل فقط `name` و`description` و`campaignEndsAt`.

### المعنى العملي

الحملة صارت أوضح للمؤسس قبل الإنشاء بدون إيهام المستخدم بأن محفظة أو هدفا ماليا أُنشئ تلقائيا. المتبقي في Phase D: تبسيط عرض القوالب، parity pack، وUX smoke tests.

## 2.4 - 2026-06-30

**النوع:** Phase D setup checklist
**الحالة:** D-006 منفذة؛ المسار الجديد لا يزال خلف feature flag وليس default

### ما تغير

- أضيف setup checklist في صفحة الصندوق للمؤسس/المدير عندما يكون الصندوق غير مكتمل التشغيل.
- checklist تظهر نقص الوصف، البنك، المحفظة، مسار الحوكمة، والأعضاء.
- أزرار checklist تقود إلى الإعدادات، إنشاء المحفظة، مراجعة المسار، أو نسخ رابط الدعوة.
- لا يوجد تغيير backend في هذه الشريحة؛ القائمة محسوبة من endpoints موجودة.

### المعنى العملي

نموذج إنشاء الصندوق يبقى بسيطا، والتخصيص ينتقل إلى ما بعد الإنشاء بدون حذف القدرات الحالية. المتبقي في Phase D: تحسين الحملة، تبسيط عرض القوالب، ثم parity pack وUX smoke tests.

## 2.3 - 2026-06-30

**النوع:** Phase D start / feature-flagged frontend flow
**الحالة:** مسار إنشاء صندوق/حملة جديد خلف feature flag، وليس default بعد

### ما تغير

- أضيف `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW` للواجهة.
- عند تفعيل العلم، تعرض `/entities/new` شاشة اختيار بين `صندوق` و`حملة`.
- إنشاء الصندوق من المسار الجديد يستخدم `type = COMMUNITY` داخليا ويحفظ `profileKey/profileLabel` اختياريا.
- إنشاء الحملة يستخدم endpoint الحالي `POST /entities/:id/campaigns` ويتطلب صندوقا قائما.
- بقي النموذج القديم متاحا بزر رجوع وكسلوك default عند تعطيل flag.
- أضيفت وثيقة `Docs/09_Improvement/07_PHASE_D_PARALLEL_CREATE_FLOW.md`.

### المعنى العملي

بدأ Phase D بدون كسر المسار القديم. المتبقي قبل جعل المسار الجديد default: تبسيط عرض القوالب، parity pack، وUX smoke tests للعلمين.

## 2.2 - 2026-06-30

**النوع:** 09 Improvement preflight implementation
**الحالة:** Phase A وB وC منفذة؛ التالي Phase D

### ما تغير

- Phase A: إغلاق تعارضات عقود الإنشاء وقيم enum بين الواجهة والباكند.
- Phase B: تطبيع القوالب حتى تنشئ policy وwallets وpaths وledgers وaudit.
- Phase C: إضافة `profileKey/profileLabel` للصندوق، وإضافة `canManageAdvancedSettings` للعضويات.
- نقل صلاحية قواعد وسياسات الصندوق إلى مؤسس أو مفوض إعدادات متقدمة.
- منع تغيير `Entity.type` من API العام، مع إبقائه حقل توافق داخلي.
- تصنيف تغييرات policy حسب الخطورة داخل audit وpolicy impact.
- تحديث seed وseed validation لتغطية profile الاختياري.

### التحقق

- backend targeted tests
- backend build
- Prisma validate
- frontend build
- frontend lint
- Docker seed reset
- Docker seed validate

### المعنى العملي

الآن يمكن بدء Phase D لبناء مسار إنشاء الصندوق/الحملة الجديد خلف feature flag، مع بقاء legacy flow وكل القدرات الحالية.

## 2.1 - 2026-06-30

**النوع:** Repository state / documentation baseline  
**الحالة:** جاهز لبدء `Docs/09_Improvement` من Phase A

### ما تغير

- تثبيت حالة المستودع الحالية في `Docs/REPOSITORY_STATE.md`.
- تحديث `Docs/README.md` ليعرض الإصدار التشغيلي `2.1`.
- تحديث `Docs/08_Production_Readiness/BACKLOG.md` من `2.0` إلى `2.1` كمرجع إغلاق 08.
- تعليم `Docs/08_Production_Readiness/AUDIT_REPORT_v2.md` كوثيقة تاريخية superseded عند التعارض.
- ترتيب `Docs/09_Improvement` كحزمة تنفيذية تبدأ من `00_README.md` وتنتهي بـ Phase A backlog.

### المعنى العملي

- Production readiness 08 مغلق من ناحية backlog.
- `AUDIT_REPORT_v2.md` لا يستخدم كحالة حالية للمشروع.
- أول عمل مفتوح بعد 08 هو `Docs/09_Improvement/04_PHASE_A_PREFLIGHT_BACKLOG.md`.
- تنفيذ 09 لم يبدأ بعد.
- لا توجد هجرة schema أو تعديل runtime ضمن هذا الإصدار؛ هذا إصدار تثبيت حالة قبل التنفيذ.

### ملاحظات

لم يتم رفع نسخ `backend/package.json` أو `frontend/package.json` في هذا الإصدار، لأن المشروع لا يملك حتى الآن سياسة إصدار منتج موحدة في الجذر. الإصدار `2.1` هنا هو إصدار تشغيلي لتوثيق حالة المستودع.
