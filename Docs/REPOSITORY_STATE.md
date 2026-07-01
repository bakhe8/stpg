# Repository State - CollectiveTrustOS

**الإصدار التشغيلي:** 2.12
**التاريخ:** 2026-07-01
**الحالة:** Production readiness 08 closed; Improvement 09 Phase E terminology cleanup through E-003 verified
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
| Improvement 09 | Phase A وB وC منفذة ومثبتة بالتحقق؛ Phase D أغلقت default switch في D-011؛ Phase E نفذت E-001 وE-002 وE-003 وتم التحقق منها |
| تنفيذ 09 | مسار إنشاء صندوق/حملة هو default، وتوجد setup checklist للصناديق وخريطة تشغيل للحملات، وتعرض القوالب كاختيارات تشغيلية مبسطة، وأضيف parity pack للقدرات وUX smoke test للعلمين. E-001 نظفت الواجهة من "كيان" كنص ظاهر، وE-002 جعلت الشاشات المشتركة تفرق بين صندوق وحملة من `isCampaign/type`، وE-003 ثبتت لغة أدوات المنصة على صندوق/حملة مع إبقاء `Entity` داخليا. قيمة `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=false` تبقى rollback مؤقتا |

## مصادر الحقيقة

| السؤال | المرجع المعتمد |
|---|---|
| هل 08 مغلق؟ | `Docs/08_Production_Readiness/BACKLOG.md` |
| ما حالة تقرير التدقيق v2؟ | `Docs/08_Production_Readiness/AUDIT_REPORT_v2.md` مع ملاحظة أنه superseded |
| ما الخطة التالية؟ | `Docs/09_Improvement/00_README.md` |
| ما آخر حزمة تنفيذية مغلقة؟ | `Docs/09_Improvement/11_PHASE_E_UI_TERMINOLOGY_CLEANUP.md` |
| ما العمل التالي؟ | `E-004` داخل `Docs/09_Improvement/11_PHASE_E_UI_TERMINOLOGY_CLEANUP.md` |
| ما القدرات التي لا يجوز خسارتها؟ | `Docs/09_Improvement/02_CAPABILITY_PRESERVATION_AUDIT.md` |

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
- لم نغير routes، ولم نحذف `EntityType`.

## بوابات أغلقت قبل default switch

قبل جعل المسار الجديد default، يجب اعتبار هذه الحالة هي نقطة البداية:

1. 08 مغلق.
2. 09 موثق.
3. Phase A وB وC مغلقة.
4. الشاشة القديمة تبقى موجودة.
5. لا نحذف أي قدرة حالية أثناء التبسيط.
