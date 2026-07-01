# Repository State - CollectiveTrustOS

**الإصدار التشغيلي:** 2.21
**التاريخ:** 2026-07-01
**الحالة:** Production readiness 08 closed; Improvement 09 Phase E closed; Phase F F-005 legacy URL hygiene verified
**سجل الإصدار:** `Docs/RELEASE_NOTES.md`

## الغرض

هذا الملف يثبت الحالة الواقعية للمستودع أثناء تنفيذ `Docs/09_Improvement`.

الهدف أن يكون لدى الفريق مرجع واحد يوضح أين نقف الآن، وما هو الملف المعتمد عند وجود تعارض بين وثائق قديمة وحديثة.

## الحالة الحالية

| المجال | الحالة |
|---|---|
| Production readiness 08 | مغلق تنفيذيا حسب `Docs/08_Production_Readiness/BACKLOG.md` |
| Backlog 08 | كل البنود `BL-001` إلى `BL-042` مغلقة كـ `Fixed / Verified` أو `Verified` |
| Audit report v2 | مرجع تاريخي، وليس حالة المشروع الحالية عند التعارض |
| Improvement 09 | Phase A وB وC منفذة ومثبتة بالتحقق؛ Phase D أغلقت default switch في D-011؛ Phase E نفذت E-001 إلى E-006 وتم التحقق منها؛ F-001 منفذة ومثبتة في `13_PHASE_F_CAPABILITY_EVIDENCE_PACK.md`؛ F-002 منفذة ومثبتة في `14_PHASE_F_FIRST_RUN_SETUP_GUIDANCE.md`؛ F-003 منفذة ومثبتة في `15_PHASE_F_ADVANCED_SETTINGS_ACCESS_AUDIT.md`؛ F-004 منفذة ومثبتة في `16_PHASE_F_TEMPLATE_CAPABILITY_MATRIX.md`؛ F-005 منفذة ومثبتة في `17_PHASE_F_LEGACY_URL_HYGIENE_WATCH.md` |
| تنفيذ 09 | مسار إنشاء صندوق/حملة هو default، وتوجد setup checklist للصناديق وخريطة تشغيل للحملات، وتعرض القوالب كاختيارات تشغيلية مبسطة، وأضيف parity pack للقدرات وUX smoke test للعلمين. E-001 نظفت الواجهة من "كيان" كنص ظاهر، وE-002 جعلت الشاشات المشتركة تفرق بين صندوق وحملة من `isCampaign/type`، وE-003 ثبتت لغة أدوات المنصة على صندوق/حملة مع إبقاء `Entity` داخليا، وE-004 ثبتت نصوص الشروط والخصوصية وإقرار الإنشاء على أن المنصة أداة تنظيمية لا تنشئ جهة قانونية، وفتحت `/terms` و`/privacy` للعامة قبل تسجيل الدخول، وE-005 أغلقت تدقيق الأدوار الواسع على 18 مستخدم seed مع تنظيف بقايا سطح العمل، وE-006 حسمت عدم إضافة `/funds` alias الآن. قيمة `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=false` تبقى rollback مؤقتا. F-001 ثبتت حفظ القدرات بعد default switch؛ F-002 حسنت إرشاد أول تشغيل بعد إنشاء الصندوق؛ F-003 طابقت واجهة القواعد مع صلاحية الإعدادات المتقدمة المستقلة؛ F-004 ثبتت القوالب كنقاط بداية لا تقفل قدرات الصندوق؛ F-005 ثبتت legacy/URL hygiene. Phase F مغلقة. |

## مصادر الحقيقة

| السؤال | المرجع المعتمد |
|---|---|
| هل 08 مغلق؟ | `Docs/08_Production_Readiness/BACKLOG.md` |
| ما حالة تقرير التدقيق v2؟ | `Docs/08_Production_Readiness/AUDIT_REPORT_v2.md` مع ملاحظة أنه superseded |
| ما الخطة التالية؟ | `Docs/09_Improvement/00_README.md` |
| ما آخر حزمة تنفيذية مغلقة؟ | `Docs/09_Improvement/17_PHASE_F_LEGACY_URL_HYGIENE_WATCH.md` |
| ما العمل التالي؟ | لا يوجد بند متبق في Phase F؛ أي عمل تالٍ يحتاج backlog أو قرار منتج جديد |
| ما القدرات التي لا يجوز خسارتها؟ | `Docs/09_Improvement/02_CAPABILITY_PRESERVATION_AUDIT.md` |
| ما دليل حفظ القدرات بعد default switch؟ | `Docs/09_Improvement/13_PHASE_F_CAPABILITY_EVIDENCE_PACK.md` |

## قرار الانتقال إلى 09

نبدأ 09 من حالة baseline إنتاجية مكتملة من ناحية backlog 08.

لا نعيد فتح 08 إلا إذا ظهر bug إنتاجي مستقل. أما التعارضات المعروفة التي ظهرت أثناء تخطيط 09، مثل تعارض payload إنشاء الصندوق، فتعالج داخل Phase A من 09.

## حالة تنفيذ 09

- Phase A أغلقت تعارضات عقود الإنشاء والقيم.
- Phase B طبعت القوالب وجعلتها تنشئ بنية تشغيلية.
- Phase C أضافت profile اختياري للصندوق وتفويض الإعدادات المتقدمة.
- Phase D بدأت بشاشة اختيار صندوق/حملة خلف `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW`.
- D-006 أضافت checklist تشغيل بعد إنشاء الصندوق لعرض نقص الوصف، البنك، المحفظة، المسار، والأعضاء.
- D-007 أضافت خريطة تشغيل للحملة تعرض الصندوق الأب، المدة، جاهزية البنك، وخطوة تجهيز محفظة/مسار الحملة.
- D-008 بسّطت عرض قوالب الصندوق في المسار الجديد إلى اختيارات تشغيلية مع بقاء `templateId` وسلوك Phase B كما هو.
- D-009 أضافت parity pack backend يغطي القدرات الأساسية قبل أي default switch.
- D-010 أضافت UX smoke test للعلمين يثبت بقاء legacy flow عند تعطيل العلم وظهور صندوق/حملة عند تفعيله.
- D-011 جعلت مسار صندوق/حملة هو default، مع بقاء `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=false` كمسار rollback.
- E-001 نظفت النصوص الظاهرة في الواجهة والترجمات من مصطلح "كيان" لصالح "صندوق/حملة"، بدون تغيير `Entity` أو routes أو schema.
- E-002 جعلت أهم الشاشات المشتركة تختار صياغة صندوق/حملة ديناميكيا من `isCampaign` أو `type === "CAMPAIGN"`، بدون تغيير الباكند أو schema.
- E-003 طبقت نفس القرار على أدوات المنصة ونصوص `PlatformSurfaceService`، مع إبقاء `PlatformEntity` و`Entity` كعقود داخلية.
- E-004 ثبتت نصوص الشروط والخصوصية وإقرار المسؤولية عند إنشاء صندوق/حملة، مع توضيح أن المنصة لا تنشئ جهة قانونية ولا تصدر ترخيصا، وفتحت صفحات الشروط والخصوصية للعامة.
- E-005 عززت تدقيق الأدوار الواجهية، ونظفت بقايا `صحة الكيانات` و`إنشاء كيانات` من سطح العمل، وشغلت `test:ux:roles` على 18 مستخدم seed بنجاح.
- E-006 حسمت قرار route alias: لا نضيف `/funds` الآن؛ يبقى `/entities` مساراً توافقياً قائماً، وأي alias لاحق يكون additive وبحزمة مستقلة.
- لم نغير routes، ولم نحذف `EntityType`.
- بعد Phase E أضيف ترشيح Phase F في `12_POST_PHASE_E_NEXT_BACKLOG.md`: نبدأ بـ F-001 كتحقق حفظ قدرات بعد default switch، وليس route alias أو إعادة تسمية داخلية.
- F-001 أغلقت evidence pack لحفظ القدرات: backend targeted tests، create-flow smoke، UX role audit، seed validation، وفحص Browser smoke. لا توجد فجوة blocking؛ التالي F-002.
- F-002 أغلقت first-run setup guidance: بعد إنشاء الصندوق يمرر المسار `created=1&start=empty|template`، وتظهر لوحة أول تشغيل مع أول خطوة ناقصة في checklist. تم التحقق عبر lint وbuild وcreate-flow smoke وUX role audit وفحص Browser desktop/mobile. لا يوجد تغيير schema أو API؛ التالي F-003.
- F-003 أغلقت تدقيق وصول الإعدادات المتقدمة: `findMyEntities/findById` يعيدان `canManageAdvancedSettings`، و`/rules` تعتمد على صلاحية الإعدادات المتقدمة لا `ADMIN_ROLES`. تم التحقق باختبارات backend/frontend وفحص Browser للمؤسس، وغير المفوض، والمفوض مؤقتا. لا يوجد schema جديد؛ التالي F-004.
- F-004 أغلقت مصفوفة قدرات القوالب: `ابدأ فارغا` والقوالب الأربعة والحملة المرتبطة موثقة كنقاط بداية، مع تثبيت أن القالب لا يقفل قدرات الصندوق وأن `enabledModules` metadata فقط حاليا. لا يوجد schema أو API أو route جديد؛ التالي F-005.
- F-005 أغلقت legacy/URL hygiene watch: rollback flag مثبت، `/entities` مستقر، لا يوجد `/funds` alias أو redirect أو rewrite، ومكان ظهور `/entities` المتبقي هو URL/links لا نص واجهة مباشر. Phase F مغلقة.

## بوابات أغلقت قبل default switch

قبل جعل المسار الجديد default، يجب اعتبار هذه الحالة هي نقطة البداية:

1. 08 مغلق.
2. 09 موثق.
3. Phase A وB وC مغلقة.
4. الشاشة القديمة تبقى موجودة.
5. لا نحذف أي قدرة حالية أثناء التبسيط.
