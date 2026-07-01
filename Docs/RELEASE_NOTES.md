# Release Notes - CollectiveTrustOS

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
