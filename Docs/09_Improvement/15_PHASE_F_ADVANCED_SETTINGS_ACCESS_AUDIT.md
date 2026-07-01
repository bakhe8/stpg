# 15 - Phase F Advanced Settings Access Audit

## حالة الوثيقة

الحالة: F-003 منفذة ومتحقق منها.

التاريخ: 2026-07-01.

الإصدار التشغيلي: 2.19.

## الهدف

تأكيد أن العمق التشغيلي موجود، لكنه لا يظهر لكل دور تشغيلي تلقائيا.

القاعدة:

> الإعدادات المتقدمة ليست امتدادا تلقائيا لدور أمين الصندوق أو المراجع أو عضو اللجنة. هي صلاحية مستقلة يملكها المؤسس ضمنيا ويمكنه تفويضها.

## الفجوة التي وُجدت

الباكند كان يحمي تعديل السياسة والقواعد بشكل صحيح عبر:

- `role = FOUNDER`
- أو `canManageAdvancedSettings = true`

لكن صفحة `/rules` في الواجهة كانت ترشح الصناديق عبر `ADMIN_ROLES` فقط.

الأثر:

- المفوض المتقدم غير المدير لا يرى أداة القواعد رغم أن الباكند يسمح له.
- المدير العادي قد يرى واجهة القواعد حتى لو لم يكن مفوضا، ثم يفشل عند الحفظ.
- الأدوار التشغيلية غير المفوضة كانت محكومة جزئيا، لكن معيار الواجهة لم يكن مطابقا لمعيار الباكند.

## ما تغير

### الباكند

الملف:

- `backend/src/entities/entities.service.ts`

أصبح `findById` و`findMyEntities` يعيدان:

- `canManageAdvancedSettings`

ضمن العضوية الحالية للمستخدم.

القيمة لا تعني أن الدور تغير. هي فقط تعرض الصلاحية المستقلة للواجهة حتى تطابق قرار الباكند.

### الواجهة

الملفات:

- `frontend/src/lib/api/entities.ts`
- `frontend/src/lib/access.ts`
- `frontend/src/app/(main)/rules/page.tsx`

أضيف helper:

- `hasAdvancedSettingsAccess(entity)`
- `filterEntitiesByAdvancedSettingsAccess(entities)`

المعيار الآن:

- الصندوق operational.
- و`myRole === FOUNDER` أو `canManageAdvancedSettings === true`.

صفحة `/rules` لم تعد تعتمد على `ADMIN_ROLES`.

## ما بقي كما هو

- المؤسس يملك الإعدادات المتقدمة ضمنيا.
- التفويض يتم من شاشة الأعضاء بواسطة المؤسس فقط.
- أمين الصندوق والمراجع وعضو اللجنة لا يحصلون على policy/rules access تلقائيا.
- حماية الباكند على `updatePolicy`, `getPolicyImpact`, `createRule`, و`updateRule` بقيت كما هي.
- لا يوجد schema أو migration جديد.
- لا توجد إعادة تسمية داخلية أو route جديد.

## أثر المنتج

### قبل F-003

الواجهة والباكند لم يكونا متطابقين تماما:

- التفويض المستقل يعمل في الباكند.
- لكن صفحة `/rules` قد لا تظهر للمفوّض إذا لم يكن Admin.

### بعد F-003

التجربة صارت مطابقة للقرار المنتج:

- المؤسس يرى القواعد والسياسة.
- العضو المفوض يرى القواعد والسياسة حتى لو كان دوره التشغيلي Treasurer مثلا.
- الدور التشغيلي غير المفوض لا يرى الصفحة.

## التحقق

### اختبارات آلية

تم تشغيل:

- `npm test -- entities.service.spec.ts rules.service.spec.ts memberships.service.spec.ts --runInBand` في backend: 3 suites، 31 tests passed.
- `npm test -- rules/page.test.tsx` في frontend: 1 file، 5 tests passed.
- `npm run lint` في frontend: passed.
- `npm run build` في backend: passed.
- `npm run build` في frontend: passed.
- `git diff --check`: passed قبل التوثيق.

### فحص Browser

تم تشغيل backend محلي على `http://localhost:3002` بالكود الجديد مع `ENABLE_DEV_LOGIN=true`، وتشغيل frontend على:

`http://localhost:3333`

مع:

`NEXT_PUBLIC_API_URL=http://localhost:3002/api`

تم فحص:

1. المؤسس `seed.ahmed.family`:
   - `/rules` تظهر.
   - tab `قواعد المسار` ظاهر.
   - tab `مصمم السياسة` ظاهر.
   - لا توجد console errors.

2. أمين الصندوق غير المفوض `seed.nasser.family`:
   - `/rules` لا تعرض اختيارات الصندوق أو مصمم السياسة.
   - تظهر صفحة منع صلاحية.
   - لا توجد console errors.

3. أمين الصندوق نفسه بعد تفويض مؤقت:
   - تم تفويض عضويته مؤقتا عبر API من المؤسس.
   - ظهرت `/rules`.
   - ظهر صندوق `صندوق عائلة الهاشمي`.
   - ظهر tab `قواعد المسار` و`مصمم السياسة`.
   - لا توجد console errors.
   - تم إرجاع التفويض إلى `false` بعد الفحص والتحقق من API.

## نتيجة الإغلاق

F-003 مغلقة.

العمل التالي المرشح هو F-004:

`Template Capability Matrix`

الهدف التالي هو تثبيت أن القوالب نقاط بداية فقط، وأن كل قالب لا يحجب قدرات الصندوق لاحقا.
