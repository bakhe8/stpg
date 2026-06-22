# STGP Backend

خلفية NestJS وPrisma لنظام CollectiveTrustOS. مخطط البيانات في
`prisma/schema.prisma`، والمخرجات تحت `generated/prisma/` مولدة ولا تعدل يدوياً.

## التشغيل

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run seed:data
npm run start:dev
```

تعمل الخدمة افتراضياً على `http://localhost:3001`. انسخ `.env.example` إلى
`.env` واضبط قاعدة البيانات وأسرار JWT. مزود `mock` للرسائل مسموح في التطوير
فقط؛ الإنتاج يتطلب مزود SMS حقيقياً.

## مولد بيانات الاختبار

يوفر المشروع مولد بيانات شامل ومترابط عبر:

```bash
npm run seed:data
```

لإنشاء نسخة ظل من البيانات الحالية قبل أي زرع:

```bash
npm run seed:backup
```

لاستعادة أحدث نسخة ظل:

```bash
npm run seed:rollback
```

`seed:rollback` استعادة فعلية وليست مسحاً للجداول. ويمكن تحديد نسخة بعينها:

```bash
npm run seed:restore -- --backup-schema seed_backup_20260622013000
```

لتشغيل المسار الكامل مرة واحدة مع نسخة احتياطية واستعادة تلقائية عند فشل
الزرع أو التحقق:

```bash
npm run seed:fresh -- --profile medium --reference-date 2026-06-22
```

`seed:backup` و`seed:restore` و`seed:reset` آمنة لبيئة التطوير فقط:

- يرفض العمل إذا كان `NODE_ENV=production`
- يرفض العمل على host غير محلي افتراضياً
- يرفض العمل على قاعدة لا يبدو اسمها `dev` أو `test`
- لا يحذف الـ schema أو الـ migrations، بل يفرغ الجداول التطبيقية فقط

يمكن تجاوز الحمايات فقط عند الضرورة القصوى عبر:

```bash
SEED_RESET_ALLOW_NON_LOCAL=true
SEED_RESET_ALLOW_NON_DEV_DB=true
```

يمكن تمرير حجم التوليد وتاريخ مرجعي ثابت:

```bash
npm run seed:data -- --profile medium --reference-date 2026-06-21
```

الأحجام المتاحة:

- `small`: سيناريوهات أساسية مع طبقة سكانية أخف.
- `medium`: الحجم الافتراضي المتوازن للاختبار اليومي.
- `large`: طبقة سكانية واشتراكات أوسع لاختبار القوائم والتحليلات.
- `stress`: حجم مرتفع لاختبار الأداء والسلوك تحت كثافة أعلى.

بعد الزرع، شغّل فاحص السلامة:

```bash
npm run seed:validate -- --profile medium --reference-date 2026-06-21
```

ومع تشغيل الخادم على المنفذ `3001` يمكن اختبار دخول كل شخص فعّال:

```bash
npm run seed:smoke-logins
```

الفاحص يراجع ترابط العضويات واللجان والأسر والاشتراكات والمستفيدين وسجلات
السداد ومحافظ `SHARED` وتغطية الخصوصية والسيناريوهات الأساسية.

المولد يزرع بيانات مترابطة تغطي حساب مالك المنصة وسجلات وصوله وحالات
الكيانات على مستوى المنصة والدعوات وطلبات العضوية، إضافة إلى الأشخاص
والعضويات والأسر والكيانات الفرعية
والمحافظ ومسارات الحوكمة واللجان والاشتراكات والدفعات المستحقة وسجلات
السداد والمستفيدين وطلبات الصرف والتحويلات والقرارات والتصويتات والاعتراضات
والنزاعات والعلاقات بين الكيانات والمحافظ والسجل المالي والوثائق والتنبيهات
وسجل التدقيق، مع الإبقاء على `EntityTemplate` ضمن نفس عملية الزرع.

بيانات دخول مالك المنصة في بيئة البذور:

```text
owner@seed.collectivetrust.local
SeedPlatform2026!
```

يمكن تغيير كلمة المرور قبل الزرع عبر `SEED_PLATFORM_PASSWORD`.

## قوالب القواعد الجاهزة

يوفر النظام قوالب تشغيلية للاعتراضات والنزاعات عبر:

```bash
GET /rules/templates
```

كل عنصر يعيد:

- `code`: معرف القالب.
- `recommendedTargetType`: المستوى المقترح للتطبيق (`ENTITY`/`WALLET`/`PATH`).
- `ruleType` و `ruleData`: القيم الجاهزة لإنشاء قاعدة جديدة عبر `POST /rules`.

الاستخدام المقترح:

1. جلب القالب من `GET /rules/templates`.
2. نسخ `ruleType` و `ruleData` مع `targetType/targetId` المناسبين في بيئتك.
3. إنشاء القاعدة عبر `POST /rules` مع اسم واضح وأولوية (`priority`) مناسبة.

## التحقق

```bash
npm run lint
npm run build
npm run test
npm run test:e2e
npx prisma migrate status
```

التحقق العام للمدخلات مفعل في `src/main.ts` باستخدام whitelist ورفض الحقول
غير المعروفة والتحويل التلقائي. يمكن تفعيل Bull/Redis عبر
`ENABLE_QUEUES=true`.
