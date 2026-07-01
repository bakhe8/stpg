# Release Notes - CollectiveTrustOS

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
