# 10 - Phase D Default Switch

## حالة الوثيقة

هذه وثيقة إغلاق `D-011` داخل Phase D.

الحالة: منفذة ومتحقق منها.

التاريخ: 2026-07-01.

## القرار

اعتماد مسار إنشاء الصندوق/الحملة الجديد كالمسار الافتراضي داخل `/entities/new`.

يبقى النموذج القديم موجودا كمسار rollback فقط عبر:

```env
NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=false
```

أي قيمة أخرى، أو عدم ضبط القيمة، تعني تشغيل المسار الجديد.

## سبب القرار

تم اتخاذ القرار بعد إغلاق البوابات السابقة:

- Phase A أغلقت تعارضات عقود الإنشاء والقيم.
- Phase B ثبتت تطبيق القوالب تشغيليا.
- Phase C أضافت profile اختياري وتفويض الإعدادات المتقدمة.
- D-006 أضافت setup checklist بعد إنشاء الصندوق.
- D-007 أضافت خريطة تشغيل الحملة.
- D-008 بسّطت القوالب كاختيارات تشغيلية.
- D-009 أضافت parity pack backend للقدرات الأساسية.
- D-010 أضافت UX smoke test للعلمين.

## ما تغير

في الواجهة:

- أصبح شرط تشغيل المسار الجديد هو أن قيمة `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW` ليست `false`.
- هذا يجعل المسار الجديد default في بيئات لا تضبط الفلاق صراحة.
- بقيت قيمة `false` تحفظ القدرة على الرجوع إلى legacy flow مؤقتا.

في ملفات البيئة:

- أضيف `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=true` إلى `.env.example`.
- أضيف `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=true` إلى `.env.production.example`.
- حُدّث `frontend/README.md` ليصف `false` كمسار rollback، لا كافتراضي.

في الاختبار:

- توسع `frontend/scripts/phase-d-create-flow-smoke.spec.cjs` ليغطي ثلاث حالات:
  - `false`: legacy flow.
  - `true`: new flow.
  - default/empty value: new flow.

## ما لم يتغير

لا يزال الالتزام الأساسي كما هو:

- لا حذف لـ `/entities/new`.
- لا حذف لـ `EntityType`.
- لا تغيير routes إلى `/funds`.
- لا تغيير backend contract.
- لا تغيير schema.
- لا إنشاء حملة مستقلة بلا صندوق أب.
- لا حذف للقدرات القديمة.

## معنى rollback

إذا ظهر خلل إنتاجي في المسار الجديد، يمكن الرجوع مؤقتا إلى النموذج القديم بإضافة:

```env
NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=false
```

ثم إعادة بناء/نشر الواجهة لأن هذا متغير `NEXT_PUBLIC` يؤثر على bundle الواجهة.

الرجوع لا يحتاج هجرة قاعدة بيانات لأنه:

- النموذج القديم لم يُحذف.
- endpoint إنشاء الصندوق القديم لا يزال موجودا.
- `EntityType` لا يزال موجودا للتوافق.
- مسار الحملة القديم في backend لا يزال كما هو.

## التحقق المطلوب

لإغلاق D-011 يجب تشغيل:

```bash
npm run test:phase-d:create-flow
npm run lint
NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=false npm run build
NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=true npm run build
```

ويجب أن يبقى المستودع نظيفا بعد commit.

## الأثر على المنتج

ابتداء من هذا القرار، تجربة المستخدم الطبيعية في إنشاء مساحة جديدة تصبح:

1. اختيار `صندوق` أو `حملة`.
2. في الصندوق: بدء فارغ أو قالب تشغيلي.
3. في الحملة: اختيار صندوق أب وفهم خريطة تشغيل الحملة.
4. بعد الإنشاء: استكمال المحافظ والمسارات والإعدادات من داخل الصندوق.

هذا يحقق هدف 09:

> تبسيط الواجهة بدون حذف العمق التشغيلي.

## المتبقي بعد D-011

Phase D مغلقة من ناحية default switch.

أي عمل لاحق يجب أن يكون في backlog جديد منفصل، مثل:

- تنظيف مصطلح "كيان" من الواجهة العادية تدريجيا.
- تحسين نصوص onboarding بعد الإنشاء.
- إضافة فحوصات visual regression أوسع للتدفق الجديد.
