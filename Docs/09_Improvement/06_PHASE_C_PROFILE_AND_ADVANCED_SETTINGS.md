# 06 - Phase C Profile and Advanced Settings Access

## حالة الوثيقة

هذه هي الحزمة التنفيذية الثالثة داخل `Docs/09_Improvement` بعد إغلاق Phase A وPhase B.

الهدف منها ليس بناء شاشة الصندوق الجديدة، بل إزالة آخر ربط خطر بين التصنيف الاجتماعي والسلوك التشغيلي قبل فتح المسار الموازي.

## الهدف

Phase C تغلق طبقة مصدر الحقيقة للتصنيف والإعدادات:

- المستخدم يرى "صندوق" مع وصف اختياري مثل صندوق عائلة أو صندوق حي.
- `Entity.type` يبقى حقل توافق داخلي/قديم، وليس مصدر السلوك الجديد.
- المنفعة المشتركة تقرأ من المحافظ والمسارات، لا من كون الصندوق "عمارة".
- الإعدادات المتقدمة لها صلاحية مستقلة يمكن للمؤسس تفويضها.
- تغييرات policy تصنف حسب خطورتها حتى لا تختلط التغييرات اليومية بالتغييرات الحوكميّة الحساسة.

## الفجوات المغلقة

| الفجوة | الحالة | الإغلاق |
|---|---|---|
| `PG-012` | مغلقة | `WorkSurfaceService` صار يصنف المنفعة المشتركة من `Wallet.benefitType = SHARED` عبر محافظ الصندوق أو اشتراكات العضو، مع بقاء `BUILDING` كـ fallback للبيانات القديمة. |
| `PG-013` | مغلقة كـ preflight | أضيف `Entity.profileKey` و`Entity.profileLabel` كـ profile اختياري للمستخدم. `Entity.type` لم يحذف ولم يعد هو مسار العرض المستقبلي. |
| `PG-014` | مغلقة | أضيف `Membership.canManageAdvancedSettings`، مع endpoint لتفويضه من المؤسس فقط، وظهوره في شاشة الأعضاء. |
| `PG-015` | مغلقة جزئيا | تغييرات policy أصبحت مصنفة في audit وimpact: `ADMINISTRATIVE`, `OPERATIONAL`, `GOVERNANCE_SENSITIVE`. بوابة اعتماد كاملة للحقول الحساسة مؤجلة لمسار حوكمة لاحق. |
| `PG-016` | مغلقة | `UpdateEntityDto` لم يعد يقبل `type`، والخدمة نفسها تحذف `type` إذا وصل باستدعاء مباشر. |
| `PG-024` | محكومة | اختيار نوع المحفظة يبقى داخليا باسم `benefitType`، لكن الواجهة الحالية تعرضه بلغة مستخدم: مصلحة فردية / خدمة مشتركة. المسار الجديد سيستخدم نفس المعنى بدون enum تقني. |
| `PG-025` | مغلقة كصلاحية | محرر القواعد بقي موجودا، لكنه صار أداة إعدادات متقدمة عبر `canManageAdvancedSettings` أو المؤسس، وليس مجرد صلاحية admin عامة. |

## ما تغير في قاعدة البيانات

Migration:

- `backend/prisma/migrations/20260630142000_entity_profile_and_advanced_settings_access/migration.sql`

أضافت:

- `memberships.canManageAdvancedSettings BOOLEAN NOT NULL DEFAULT false`
- `entities.profileKey TEXT`
- `entities.profileLabel TEXT`
- index على `entities.profileKey`

لا يوجد حذف لـ `Entity.type`، ولا كسر للبيانات القديمة.

## ما تغير في الباكند

- `CreateEntityDto` و`UpdateEntityDto` يقبلان `profileKey` و`profileLabel`.
- `UpdateEntityDto` لم يعد يقبل `type`.
- `EntitiesService.updateEntity` يحذف `type` دفاعيا حتى لو وصل خارج validation pipe.
- `EntitiesService.updatePolicy` و`getPolicyImpact` يستخدمان صلاحية الإعدادات المتقدمة بدلا من `ADMIN`.
- `EntitiesService.updatePolicy` يكتب `changeRisk` في audit.
- `RulesService.createRule` و`updateRule` صارا يحتاجان مؤسسا أو تفويض إعدادات متقدمة.
- `MembershipsService` أضاف `updateAdvancedSettingsAccess`.
- `MembershipsController` أضاف:
  - `PATCH /memberships/:id/advanced-settings-access`
- `WorkSurfaceService`:
  - يقرأ محافظ الصندوق النشطة.
  - يصنف `SHARED_BENEFIT` من `WalletBenefitType.SHARED`.
  - يعرض أداة القواعد لمن لديه `canManageAdvancedSettings`.

## ما تغير في seed والتحقق

- `seed.ts` يملأ `profileKey/profileLabel` من `Entity.type` كـ backfill للبيانات التجريبية.
- `seed-validate.ts` يفشل إذا كان صندوق seed نشط بلا profile اختياري.

ملاحظة تشغيلية:

- أول محاولة Docker seed فشلت لأن قاعدة Docker لم تكن مطبق عليها migration الجديدة.
- تم تشغيل `prisma migrate deploy` داخل نفس Docker network.
- بعد ذلك نجح `seed:reset:docker` و`seed:validate:docker`.

## ما تغير في الواجهة

- `frontend/src/lib/api/entities.ts` أصبح يعرف `profileKey/profileLabel` و`canManageAdvancedSettings`.
- أضيف client API:
  - `updateAdvancedSettingsAccess(membershipId, canManageAdvancedSettings)`
- شاشة أعضاء الصندوق تعرض شارة "إعدادات متقدمة" لمن تم تفويضه.
- المؤسس فقط يرى زر تفويض/سحب تفويض الإعدادات المتقدمة.
- لم نغير routes، ولم نبن شاشة إنشاء الصندوق الجديدة.

## حدود Phase C

لم نفعل التالي عمدا:

- لم نحذف `EntityType`.
- لم ننقل `/entities` إلى `/funds`.
- لم نغير lifecycle الحملات.
- لم نبن feature flag أو wizard جديد.
- لم نمنع كل تغيير حوكمي حساس بقرار فعلي؛ أضفنا التصنيف والـ audit كمرحلة preflight.
- لم نخفض قدرات القواعد أو المحافظ أو التصويت.

## ضمان عدم خسارة القدرات

بعد Phase C، يبقى المؤسس أو المفوض المتقدم قادرا على:

- تعديل سياسات الصندوق.
- إدارة القواعد.
- إنشاء محافظ ومسارات وبنود صرف.
- استخدام القوالب التي أنشأتها Phase B.
- توسيع الصندوق إلى محافظ متعددة بعد الإنشاء.
- الاستفادة من التصويت واللجان والتدقيق والنزاعات والاعتراضات كما كانت.

التغيير الأساسي أن التصنيف الظاهر لم يعد مطلوبا كي تعمل هذه القدرات.

## التحقق المنفذ

- `npm test -- update-entity.dto.spec.ts entities.service.spec.ts memberships.service.spec.ts rules.service.spec.ts work-surface.service.spec.ts --runInBand`
- `npm run build` في `backend`
- `npx prisma validate`
- `npm run build` في `frontend`
- `npm run lint` في `frontend`
- `npm run seed:reset:docker`
- `npm run seed:validate:docker`

كلها نجحت بعد تطبيق migration داخل Docker network.

## التالي بعد Phase C

المرحلة التالية هي Phase D:

- feature flag لمسار إنشاء الصندوق الجديد.
- فصل خيار "صندوق" و"حملة" في التجربة.
- إبقاء legacy flow.
- بناء parity pack قبل جعل المسار الجديد default.
