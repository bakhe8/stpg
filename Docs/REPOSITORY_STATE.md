# Repository State - CollectiveTrustOS

**الإصدار التشغيلي:** 2.8
**التاريخ:** 2026-07-01
**الحالة:** Production readiness 08 closed; Improvement 09 Phase D UX smoke tests added before default switch
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
| Improvement 09 | Phase A وB وC منفذة ومثبتة بالتحقق؛ Phase D بدأت وD-006/D-007/D-008/D-009/D-010 منفذة |
| تنفيذ 09 | مسار إنشاء صندوق/حملة جديد موجود خلف feature flag، وتوجد setup checklist للصناديق وخريطة تشغيل للحملات، وتعرض القوالب كاختيارات تشغيلية مبسطة، وأضيف parity pack للقدرات وUX smoke test للعلمين، وليس default بعد |

## مصادر الحقيقة

| السؤال | المرجع المعتمد |
|---|---|
| هل 08 مغلق؟ | `Docs/08_Production_Readiness/BACKLOG.md` |
| ما حالة تقرير التدقيق v2؟ | `Docs/08_Production_Readiness/AUDIT_REPORT_v2.md` مع ملاحظة أنه superseded |
| ما الخطة التالية؟ | `Docs/09_Improvement/00_README.md` |
| ما آخر حزمة تنفيذية مغلقة؟ | `Docs/09_Improvement/09_PHASE_D_UX_SMOKE_TESTS.md` |
| ما العمل التالي؟ | `D-011` قرار default switch داخل Phase D |
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
- لم نجعل المسار الجديد default، ولم نغير routes، ولم نحذف `EntityType`.

## شرط قبل إغلاق Phase D

قبل جعل المسار الجديد default، يجب اعتبار هذه الحالة هي نقطة البداية:

1. 08 مغلق.
2. 09 موثق.
3. Phase A وB وC مغلقة.
4. الشاشة القديمة تبقى موجودة.
5. لا نحذف أي قدرة حالية أثناء التبسيط.
