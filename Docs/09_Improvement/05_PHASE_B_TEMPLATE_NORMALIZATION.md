# 05 - Phase B Template Normalization

## حالة الوثيقة

هذه هي الحزمة التنفيذية الثانية داخل `Docs/09_Improvement` بعد إغلاق Phase A.

الملف تابع لـ:

- `00_README.md`
- `01_FUND_EXPERIENCE_TRANSITION_PLAN.md`
- `02_CAPABILITY_PRESERVATION_AUDIT.md`
- `03_PREFLIGHT_GAPS_AND_COMPATIBILITY_AUDIT.md`
- `04_PHASE_A_PREFLIGHT_BACKLOG.md`

## الهدف

تطبيع قوالب إنشاء الصندوق قبل استخدامها في تجربة "الصندوق" الجديدة.

الهدف ليس بناء شاشة الصندوق النهائية، ولا حذف النظام القديم. الهدف هو جعل القالب نقطة بداية تشغيلية صحيحة:

- لا يمرر JSON خام إلى Prisma.
- لا يحتوي مفاتيح policy قديمة.
- ينشئ نفس البنية التي ينشئها المسار اليدوي: policy وledger وaudit.
- يبقى قابلا للتوسعة لاحقا، ولا يقفل الصندوق داخل نموذج واحد.

## الفجوات المغلقة

| الفجوة | الحالة | الإغلاق |
|---|---|---|
| `PG-008` | مغلقة | أضيف schema داخلي للقالب يرفض مفاتيح `defaultPolicy` القديمة مثل `requireApproval` و`minApprovalPercentage`. |
| `PG-009` | مغلقة | أصبح تطبيق القالب ينشئ `WalletPolicy`, wallet ledger, `PathPolicy`, path ledger, spending item ledger عند وجود بنود صرف، وaudit logs. |
| `PG-010` | مغلقة | خدمة القوالب ترجع النشط فقط بترتيب `sortOrder`، والواجهة تعرض icon/summary/metadata. |

## Contract القالب

القالب التشغيلي المقبول يتكون من:

- `defaultPolicy`: مفاتيح `EntityPolicy` الفعلية فقط.
- `defaultWallets`: قائمة محافظ باسم، وصف اختياري، `benefitType`, عملة اختيارية، و`policy` اختياري.
- `defaultPaths`: قائمة مسارات باسم، `type`, ربط بمحفظة عبر `walletTempId`, و`policy` اختياري.
- `rules` داخل المسار لا يرميه النظام؛ يحفظ داخل `PathPolicy.extraRules.templateRules` إلى أن يصمم محرك قواعد صرف متخصص.
- `spendingItems` اختيارية، وعند وجودها تنشئ `SpendingItem` مع `LedgerAccount`.
- `enabledModules`, `suggestedGoals`, `icon`, `sortOrder`, و`isActive` تستخدم للعرض والتوجيه، وليست قيودا على قدرات الصندوق.

أي مفتاح غير معروف يعتبر خطأ في القالب ويوقف الإنشاء أو seed validation.

## ما تغير في الباكند

- أضيف `backend/src/entities/entity-template-schema.ts`.
- `EntitiesService.createEntity` لم يعد يمرر `template.defaultPolicy` مباشرة إلى Prisma.
- عند اختيار قالب:
  - يحفظ `templateId` على الصندوق.
  - ينسخ `enabledModules`.
  - يطبع policy القالب قبل الإنشاء.
  - ينشئ المحافظ مع `WalletPolicy` وledger.
  - ينشئ المسارات مع `PathPolicy` وledger.
  - ينشئ بنود الصرف الاختيارية مع ledger.
  - يسجل audit logs للمحافظ والمسارات وبنود الصرف.
- `EntityTemplatesService.findAll` يعرض فقط `isActive = true` ويرتب بـ `sortOrder`.

## ما تغير في seed

تم تحويل القوالب إلى قوالب تشغيلية:

1. `صندوق مخصص`
2. `صندوق تكافل`
3. `صندوق خدمات مشتركة`
4. `صندوق داعمين فقط`

خيار `بدون قالب` في الواجهة يبقى هو "ابدأ فارغا"، وليس قالبا داخل قاعدة البيانات.

## ما تغير في seed validation

`backend/prisma/seed-validate.ts` يقرأ `EntityTemplate` ويطبق نفس schema الداخلي.

إذا رجع مفتاح قديم أو مسار غير مربوط بمحفظة أو نوع enum غير صالح، يفشل seed validation بالكود:

- `ENTITY_TEMPLATE_SCHEMA_INVALID`

تم تحديث سكربتات Docker للـ seed حتى تنسخ helper القالب المستخدم في التحقق.

## ما تغير في الواجهة

شاشة الإنشاء القديمة بقيت موجودة.

تغيير الواجهة محدود إلى بطاقة القالب:

- تعرض أيقونة القالب.
- تعرض وصف القالب.
- تعرض عدد المحافظ والمسارات والوحدات التي يبدأ بها القالب.
- تعرض الأهداف المقترحة عند وجودها.

لا يوجد تغيير في route أو اسم `Entity` الداخلي، ولا يوجد مسار `/funds` جديد في هذه المرحلة.

## ما لم ندخله في Phase B

- لم نبن شاشة الصندوق الجديدة.
- لم نضف `fundProfile` أو `profileKey`.
- لم ننقل عائلة/عمارة/حي/قبيلة إلى إعدادات.
- لم نغير lifecycle الحملة.
- لم نحذف `/entities` أو `EntityType`.
- لم نحول القالب إلى قيد يمنع التوسعة اللاحقة.

## ضمان عدم خسارة القدرات

بعد إنشاء صندوق من قالب، يبقى المؤسس قادرا لاحقا على استخدام القدرات الحالية:

- إضافة محافظ أخرى.
- إضافة مسارات حوكمة أخرى إذا سمحت policy.
- تعديل سياسات المحفظة والمسار عبر الإعدادات الحالية.
- استخدام أنواع الحوكمة الموجودة: مجلس، لجنة، فردي بسقف، تصويت عام، تبرع فقط، عاجل ثم مراجعة.
- إنشاء بنود صرف.
- استخدام التصويت والاعتراضات والنزاعات والتدقيق والعلاقات المالية.

القالب يختصر البداية، لكنه لا يختصر الباكند ولا يحذف الأدوات.

## التحقق المنفذ

- `npm test -- entity-template-schema.spec.ts entity-templates.service.spec.ts entities.service.spec.ts --runInBand`
- `npm run build` في `backend`
- `npx prisma validate`
- JSON parse لترجمات `ar/en admin`
- `npm run build` في `frontend`
- `npm run lint` في `frontend`
- `npm run seed:reset:docker`
- `npm run seed:validate:docker`

كلها نجحت بعد إغلاق Phase B.

## ملاحظات لاحقة

- يمكن لاحقا توسيع schema القالب ببنود setup أكثر، لكن يجب أن تبقى مفاتيحه معروفة ومختبرة.
- إذا أضفنا `fundProfile` في Phase C، يجب ألا يصبح مصدر السلوك المالي أو الحوكمي. السلوك يبقى في policy/wallet/path.
- إذا تحول `rules` إلى محرك قواعد مستقل، يجب عمل migration من `PathPolicy.extraRules.templateRules` أو تركه كأثر توثيقي للقالب.
