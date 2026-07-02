# 09 Improvement - Fund Experience Transition

## الغرض

هذا المجلد هو مرجع خطة تحويل تجربة المستخدم من مفهوم "كيان" إلى "صندوق / حملة"، مع الحفاظ على العمق التشغيلي الحالي في الباكند وقاعدة البيانات.

القاعدة الأساسية:

> نبسط الواجهة ولا نحذف القدرات.

## الحالة الحالية

- الحالة العامة للمستودع مثبتة في `Docs/REPOSITORY_STATE.md` كإصدار تشغيلي `2.31`.
- `Docs/08_Production_Readiness/BACKLOG.md` هو مرجع حالة الإنتاج الحالي.
- حسب قراءة 08 بعد تحديثه، البنود `BL-001` إلى `BL-042` مغلقة كـ `Fixed / Verified` أو `Verified`.
- `Docs/08_Production_Readiness/AUDIT_REPORT_v2.md` يحتوي حالة تدقيق أقدم. عند التعارض، نعتمد `BACKLOG.md` لأنه أحدث.
- خطة 09 تبدأ بعد إغلاق 08، ولا تعيد فتح backlog 08.
- الدين المتبقي من baseline 08 يعالج داخل Phase A، خصوصا تعارض إنشاء الصندوق بين الواجهة والباكند.

## ترتيب القراءة

| الترتيب | الملف | الدور |
|---:|---|---|
| - | `../REPOSITORY_STATE.md` | حالة المستودع ونقطة بداية 09 |
| 0 | `00_README.md` | فهرس وحالة تنفيذية للمجلد |
| 1 | `01_FUND_EXPERIENCE_TRANSITION_PLAN.md` | خطة المنتج والهندسة الرئيسية |
| 2 | `02_CAPABILITY_PRESERVATION_AUDIT.md` | جرد القدرات التي يجب ألا نخسرها |
| 3 | `03_PREFLIGHT_GAPS_AND_COMPATIBILITY_AUDIT.md` | فجوات ما قبل التنفيذ ومخاطر التوافق |
| 4 | `04_PHASE_A_PREFLIGHT_BACKLOG.md` | أول backlog تنفيذي بعد 08 |
| 5 | `05_PHASE_B_TEMPLATE_NORMALIZATION.md` | تطبيع القوالب وتطبيقها التشغيلي |
| 6 | `06_PHASE_C_PROFILE_AND_ADVANCED_SETTINGS.md` | مصدر profile الاختياري وتفويض الإعدادات المتقدمة |
| 7 | `07_PHASE_D_PARALLEL_CREATE_FLOW.md` | المسار الموازي لإنشاء صندوق/حملة خلف feature flag |
| 8 | `08_PHASE_D_PARITY_PACK.md` | حزمة parity قبل جعل المسار الجديد default |
| 9 | `09_PHASE_D_UX_SMOKE_TESTS.md` | اختبار دخان واجهي للعلمين قبل قرار default switch |
| 10 | `10_PHASE_D_DEFAULT_SWITCH.md` | قرار جعل المسار الجديد default مع rollback للفلاق |
| 11 | `11_PHASE_E_UI_TERMINOLOGY_CLEANUP.md` | تنظيف لغة الواجهة من "كيان" إلى صندوق/حملة |
| 12 | `12_POST_PHASE_E_NEXT_BACKLOG.md` | الترشيح التنفيذي الصغير بعد إغلاق Phase E |
| 13 | `13_PHASE_F_CAPABILITY_EVIDENCE_PACK.md` | دليل F-001 لحفظ القدرات بعد default switch |
| 14 | `14_PHASE_F_FIRST_RUN_SETUP_GUIDANCE.md` | إغلاق F-002: إرشاد أول تشغيل بعد إنشاء الصندوق |
| 15 | `15_PHASE_F_ADVANCED_SETTINGS_ACCESS_AUDIT.md` | إغلاق F-003: تدقيق وصول الإعدادات المتقدمة |
| 16 | `16_PHASE_F_TEMPLATE_CAPABILITY_MATRIX.md` | إغلاق F-004: مصفوفة قدرات القوالب |
| 17 | `17_PHASE_F_LEGACY_URL_HYGIENE_WATCH.md` | إغلاق F-005: مراقبة legacy وURL hygiene |
| 18 | `18_PHASE_G_PRODUCT_ACCEPTANCE_BACKLOG.md` | فتح Phase G: قبول المنتج وقرار release candidate |
| 19 | `19_PHASE_G_PRODUCT_ACCEPTANCE_REPORT.md` | إغلاق Phase G: تقرير قبول المنتج وقرار `RC_READY_WITH_POLISH` |
| 20 | `20_POST_PHASE_G_POLISH_BACKLOG.md` | backlog polish بعد Phase G: `PGP-001` إلى `PGP-006` مغلقة؛ `/entities` watch/no-action |
| 21 | `21_RC_ACCEPTANCE_RUNBOOK.md` | runbook إعادة تشغيل قبول RC |
| 22 | `22_RC_ACCEPTANCE_RUN_20260702.md` | جولة قبول RC النظيفة وقرار `v0.1.0-rc.1` |

## ترتيب التنفيذ

لا يبدأ تنفيذ تجربة الصندوق الجديدة مباشرة. الترتيب العملي هو:

1. إغلاق Phase A من `04_PHASE_A_PREFLIGHT_BACKLOG.md`.
2. تطبيع القوالب وكتابة setup/template contract.
3. إضافة مصدر حقيقة اختياري لوصف الصندوق، مثل `fundProfile` أو بديله.
4. بناء مسار إنشاء صندوق/حملة جديد خلف feature flag.
5. تشغيل parity pack قبل جعل المسار الجديد default.
6. تنظيف مصطلح "كيان" من الواجهة العادية بعد استقرار المسار.
7. جعل الشاشات المشتركة واعية بسياق صندوق/حملة ديناميكيا.
8. حسم لغة أدوات المنصة والقائمين عليها بعد فصل لغة المستخدم العادي.
9. تنفيذ backlog صغير بعد Phase E يبدأ بتحقق حفظ القدرات قبل أي تحسين جديد.

## Phase A

Phase A ليست إعادة تصميم. هي تصحيح preflight محدود قبل بناء التجربة الجديدة:

- لا تبني شاشة الصندوق الجديدة.
- لا تضيف `fundProfile`.
- لا تعيد تسمية `Entity` في الكود.
- لا تحذف `EntityType` أو `/entities`.
- تصلح عقود الإنشاء والقيم غير المتطابقة فقط.

## Phase B

Phase B تغلق خطر القوالب قبل بناء تجربة الصندوق:

- تعرف schema داخلي للقوالب.
- تمنع مفاتيح policy القديمة من الوصول إلى Prisma.
- تجعل القالب ينشئ policy وledger وaudit مثل المسار اليدوي.
- تستخدم metadata القوالب في الخدمة والواجهة.
- لا تبني شاشة الصندوق الجديدة ولا تغير routes.

## Phase C

Phase C تغلق مصدر الحقيقة للتصنيف والإعدادات قبل المسار الجديد:

- تضيف profile اختياري للصندوق (`profileKey/profileLabel`).
- تبقي `Entity.type` كحقل توافق داخلي/قديم.
- تجعل المنفعة المشتركة تأتي من `WalletBenefitType.SHARED`.
- تضيف صلاحية مستقلة لتفويض الإعدادات المتقدمة.
- تصنف تغييرات policy حسب الخطورة في audit وimpact.
- لا تبني شاشة الصندوق الجديدة ولا تغير routes.

## Phase D

Phase D بدأت بشرائح صغيرة خلف feature flag:

- العلم: `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW`.
- عند تعطيله، تبقى شاشة الإنشاء القديمة كما هي.
- عند تفعيله، تظهر شاشة اختيار `صندوق` أو `حملة`.
- إنشاء الصندوق الجديد يستخدم `COMMUNITY` داخليا وprofile اختياري.
- إنشاء الحملة يتطلب صندوقا قائما كأب.
- صندوق بلا قالب أو صندوق غير مكتمل يظهر له setup checklist بعد الإنشاء في صفحة الصندوق.
- شاشة الحملة تعرض خريطة تشغيلية للحملة بدون توسيع عقد backend الحالي.
- القوالب تظهر في مسار الصندوق الجديد كاختيارات تشغيلية مفهومة بدلا من تفاصيل تقنية، مع بقاء `templateId` وسلوك Phase B كما هو.
- أضيف parity pack backend يغطي القدرات الأساسية قبل أي default switch.
- أضيف UX smoke test للعلمين يثبت بقاء legacy flow عند تعطيل العلم وظهور صندوق/حملة عند تفعيله.
- أصبح مسار صندوق/حملة هو default. قيمة `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=false` تبقى rollback مؤقتا للنموذج القديم.
- Phase D مغلقة من ناحية default switch.

## Phase E

Phase E بدأت بعد default switch لتنظيف لغة المنتج الظاهرة:

- E-001 نظفت قيم الترجمة والنصوص المباشرة من "كيان" إلى "صندوق/حملة" وتم التحقق منها.
- E-002 جعلت أهم الشاشات المشتركة تعرض "حملة" عندما يكون السجل حملة، و"صندوق" خلاف ذلك.
- E-003 ثبتت لغة أدوات المنصة والقائمين عليها على صندوق/حملة، مع بقاء Entity داخلياً.
- E-004 ثبتت نصوص الشروط والخصوصية وإقرار الإنشاء على أن المنصة أداة تنظيمية لا تنشئ جهة قانونية، وفتحت صفحات الشروط والخصوصية للعامة.
- E-005 شغلت تدقيق الأدوار الواسع على 18 مستخدم seed، ونظفت بقايا سطح العمل من `صحة الكيانات` و`إنشاء كيانات`.
- E-006 حسمت قرار alias: لا نضيف `/funds` الآن، ويبقى `/entities` مساراً توافقياً قائماً إلى أن يوجد سبب منتج واضح لحزمة route alias مستقلة.
- بقي `Entity` و`/entities` و`EntityType` كما هي داخليا.
- لم يتغير schema أو API.
- Phase E مغلقة؛ أي عمل تالٍ يحتاج Phase/Backlog جديد.

## بعد Phase E

الترشيح المعتمد كبداية تالية موثق في `12_POST_PHASE_E_NEXT_BACKLOG.md`.

العمل المقترح ليس refactor جديدا ولا route alias. هو Phase F صغيرة بعنوان:

`Post-default UX and Capability Hardening`.

أول بند كان `F-001`: إثبات حفظ القدرات بعد أن أصبح مسار صندوق/حملة هو default. تم إغلاقه في `13_PHASE_F_CAPABILITY_EVIDENCE_PACK.md`.

تم إغلاق `F-002` في `14_PHASE_F_FIRST_RUN_SETUP_GUIDANCE.md`: تحسين first-run/setup guidance بعد إنشاء الصندوق، خصوصا `ابدأ فارغا`، بدون تغيير schema أو routes.

تم إغلاق `F-003` في `15_PHASE_F_ADVANCED_SETTINGS_ACCESS_AUDIT.md`: مطابقة واجهة `/rules` مع صلاحية الإعدادات المتقدمة المستقلة.

تم إغلاق `F-004` في `16_PHASE_F_TEMPLATE_CAPABILITY_MATRIX.md`: تثبيت أن القوالب نقاط بداية لا تقفل قدرات الصندوق.

تم إغلاق `F-005` في `17_PHASE_F_LEGACY_URL_HYGIENE_WATCH.md`: تثبيت rollback وقرار إبقاء `/entities` بدون `/funds` alias الآن.

Phase F مغلقة.

تم فتح Phase G في `18_PHASE_G_PRODUCT_ACCEPTANCE_BACKLOG.md`: قبول المنتج كرحلات كاملة قبل أي ميزة جديدة أو route alias.

تم إغلاق Phase G في `19_PHASE_G_PRODUCT_ACCEPTANCE_REPORT.md` بقرار `RC_READY_WITH_POLISH`: لا توجد blockers، والقوالب والحملة والعضو والأدوار والحوكمة قبلت المنتج مع ملاحظات polish تشغيلية.

تم فتح backlog polish مستقل في `20_POST_PHASE_G_POLISH_BACKLOG.md`.

تم إغلاق `PGP-001`: تحويل قبول API اليدوي إلى acceptance harness قابل للإعادة.

تم إغلاق `PGP-002`: إضافة dry-run hygiene لبيانات القبول، مع رفض الحذف الجزئي وتوثيق reset الكامل كخيار صريح.

تم إغلاق `PGP-003`: تثبيت عقد seed validator بحيث تستخدم story coverage سجلات UUID v5 الرسمية فقط، مع بقاء runtime ظاهرا في الإحصاءات.

تم إغلاق `PGP-004`: إضافة readiness check للواجهة قبل UX role audit، وhealthcheck للـ Docker frontend.

تم إغلاق `PGP-005`: إضافة runbook مستقل لإعادة تشغيل قبول RC.

تم إغلاق `PGP-006`: تثبيت قرار route alias كـ `Watch / No Action` بدون إضافة `/funds`.

تم تشغيل جولة RC نظيفة بعد reset وتوثيقها في `22_RC_ACCEPTANCE_RUN_20260702.md`. القرار: `RC_READY`، والوسم المعتمد: `v0.1.0-rc.1`.

لا يوجد بند مفتوح في post Phase G polish backlog. العمل القادم يكون إما نشر/اختبار `v0.1.0-rc.1` في بيئة محددة، أو فتح قرار منتج جديد إذا احتجنا `/funds` لاحقا.

## قواعد الحماية

أثناء تنفيذ 09:

- الصندوق الجديد يجب أن يستطيع لاحقا الوصول إلى كل القدرات الموجودة حاليا.
- التصنيف الاجتماعي مثل عائلة/حي/عمارة/قبيلة يصبح اختياريا أو profile، وليس مصدر السلوك التشغيلي.
- الحملة تبقى مسارا منفصلا عن الصندوق بسبب lifecycle مختلف.
- القوالب نقطة بداية، وليست قيودا على قدرات الصندوق.
- الشاشة القديمة تبقى موجودة كـ rollback مؤقت إلى أن يثبت المسار الجديد أكثر.
- أي تغيير حساس في السياسة أو الصلاحيات يجب أن يكون له audit واختبار واضح.

## بوابة الإغلاق قبل المسار الجديد

قبل فتح مسار إنشاء الصندوق الجديد للمستخدمين، يجب إغلاق التالي:

- Phase A كاملة.
- فجوات القوالب `PG-008` إلى `PG-010`.
- Phase C كاملة: مصدر profile الاختياري وتفويض الإعدادات المتقدمة.
- feature flag ومسار رجوع.
- parity pack يغطي التصويت، اللجان، المال، التدقيق، الصرف، الاشتراكات، النزاعات، الحملات، والمحافظ المتعددة.
- UX smoke test للفلاق صراحة وللوضع الافتراضي.
- قرار default switch مع rollback واضح.
- تنظيف لغة الواجهة العادية من "كيان" إلى صندوق/حملة.
- labels ديناميكية بين صندوق/حملة في الشاشات المشتركة الأساسية.
- لغة أدوات المنصة والقائمين عليها متوافقة مع صندوق/حملة.
