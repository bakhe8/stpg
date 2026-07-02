# Post Phase G - Polish Backlog

## حالة الوثيقة

**الإصدار التشغيلي:** 2.24
**التاريخ:** 2026-07-02
**الحالة:** مفتوحة للتنفيذ
**المرجع السابق:** `19_PHASE_G_PRODUCT_ACCEPTANCE_REPORT.md`

## الهدف

هذه الوثيقة تحول ملاحظات `RC_READY_WITH_POLISH` إلى backlog صغير مستقل. الهدف ليس فتح ميزة جديدة، بل جعل جولات القبول القادمة قابلة للإعادة، أنظف في الأدلة، وأقل اعتمادا على خطوات يدوية.

## القاعدة الحاكمة

يبقى قرار Phase G كما هو: `RC_READY_WITH_POLISH`.

هذا backlog لا يغير قرار القبول ولا يفتح schema أو routes أو مفهوم منتج جديد. أي بند هنا يجب أن يكون polish أو tooling أو runbook، وليس إعادة تصميم.

## خارج النطاق

- لا نضيف `/funds` alias الآن.
- لا نغير `Entity`, `EntityType`, أو `/entities` داخليا.
- لا نغير schema بسبب بيانات قبول مؤقتة.
- لا نحذف سجلات من قاعدة التطوير تلقائيا بدون dry-run واضح.
- لا نضيف ميزة منتج جديدة قبل وجود backlog منتج منفصل.

## ملخص الملاحظات القادمة من Phase G

| المصدر | الملاحظة | التصنيف |
|---|---|---|
| `G-POLISH-001` | PowerShell عرض بعض الأسماء العربية كـ `????` في خرج الطرفية. | tooling polish |
| `G-POLISH-002` | جولة القبول أنشأت سجلات runtime في قاعدة التطوير. | operational hygiene |
| `G-POLISH-003` | `/entities` ما زال route التوافق الظاهر في URL. | accepted product decision |
| `G-OPS-001` | `seed-validate` احتاج فصلا واضحا بين seed الرسمي وruntime-created data. | gate hardening |
| `G-OPS-002` | Docker frontend احتاج `HOSTNAME=0.0.0.0` حتى يرد عبر port mapping. | environment hardening |

## ترتيب التنفيذ المقترح

1. `PGP-001`: تثبيت acceptance harness قابل للإعادة.
2. `PGP-002`: توثيق وتنفيذ hygiene اختياري لبيانات القبول.
3. `PGP-003`: توثيق عقد seed validator بعد الفصل بين seed/runtime.
4. `PGP-004`: إضافة readiness check للـ Docker frontend.
5. `PGP-005`: كتابة runbook قصير لإعادة تشغيل RC acceptance.
6. `PGP-006`: تثبيت قرار `/entities` كـ no-action watch فقط.

## Backlog

### PGP-001 - Acceptance Harness Script

الأولوية: P0.

الهدف: تحويل API acceptance الذي شغلناه يدويا إلى سكربت قابل للإعادة، بدون الاعتماد على قراءة terminal عربية أو نسخ يدوي للنتائج.

النطاق:

- إنشاء سكربت acceptance صغير تحت `scripts/` أو مسار مناسب موجود في المشروع.
- تشغيله ضد local Docker backend على `http://localhost:3001/api`.
- استخدام أسماء ASCII للأدلة، مثل `Acceptance Empty Fund <stamp>`.
- استخدام `profileKey` واضح مثل `ACCEPTANCE` أو قيمة مماثلة متفق عليها للتمييز التشغيلي.
- إنشاء صندوق فارغ.
- إنشاء صندوق من القوالب الأربعة.
- إنشاء حملة مرتبطة بصندوق أب.
- التحقق من عدد المحافظ والمسارات وأنواعها لكل قالب.
- إخراج JSON summary واضح يمكن حفظه في `tmp` أو عرضه في CI لاحقا.
- الخروج بكود فشل عند أي mismatch.

معيار الإغلاق:

- السكربت يعمل من Windows PowerShell بدون تشويه يعيق القراءة.
- السكربت لا يعتمد على أسماء عربية في assertions.
- يعيد نفس أدلة G-002/G-003/G-004 التي وثقها تقرير Phase G.
- `seed:validate:docker` يبقى ناجحا بعد تشغيله.

التحقق:

- تشغيل السكربت على Docker stack المحلي.
- `npm run seed:validate:docker` في backend.
- `git diff --check`.

### PGP-002 - Acceptance Data Hygiene

الأولوية: P1.

الهدف: منع تراكم بيانات قبول غير واضحة في قاعدة التطوير، بدون حذف عشوائي أو كسر أدلة مفيدة.

النطاق:

- اعتماد convention لتسمية بيانات القبول:
  - الاسم يبدأ بـ `Acceptance`.
  - `profileKey` أو `profileLabel` يميز سجلات القبول.
- إضافة خيار cleanup آمن:
  - dry-run افتراضي يعرض السجلات المرشحة.
  - delete صريح فقط عند تمرير flag واضح.
- توثيق متى نستخدم cleanup ومتى نفضل `seed:reset:docker`.
- عدم حذف seed الرسمي أو السجلات غير الموسومة كقبول.

معيار الإغلاق:

- توجد طريقة واضحة لمعرفة سجلات القبول.
- يمكن للفريق تنظيف بيانات acceptance بثقة عند الحاجة.
- لا يوجد حذف تلقائي ضمن فحوص القبول نفسها.

التحقق:

- dry-run يعرض سجلات acceptance فقط.
- cleanup الصريح لا يعمل بدون flag.
- `npm run seed:validate:docker` بعد cleanup أو بعد إبقاء البيانات.

### PGP-003 - Seed Validator Runtime Boundary

الأولوية: P1.

الهدف: تثبيت القرار الذي نتج من G-OPS-001: validator يختبر seed الرسمي بقوة، لكنه لا يفشل بسبب سجلات runtime أنشأها التطبيق.

النطاق:

- توثيق معيار seed الرسمي: UUID v5 المستقر.
- إضافة اختبار أو فحص targeted إن كان مناسبا يثبت أن runtime-created entity لا يكسر فحوص seed-only.
- إبقاء runtime data ظاهرة في جداول الإحصاء، لكنها لا تدخل في قواعد seed coverage الصارمة.
- مراجعة أسماء رسائل validator حتى توضح الفرق بين `seeded` و`runtime-created` عند الحاجة.

معيار الإغلاق:

- الفريق يفهم لماذا لا يفشل validator بسبب سجلات القبول.
- لا نفقد قوة فحص seed الرسمي.
- لا توجد قاعدة seed coverage تستخدم كل `entities` أو كل `memberships` عندما يكون المقصود seed الرسمي فقط.

التحقق:

- `npm run seed:validate:docker`.
- targeted test أو review موثق للفصل بين seed/runtime.
- `git diff --check`.

### PGP-004 - Docker Frontend Readiness Check

الأولوية: P1.

الهدف: منع عودة مشكلة `ERR_EMPTY_RESPONSE` قبل تشغيل `test:ux:roles`.

النطاق:

- إضافة فحص readiness صغير للواجهة:
  - `http://localhost:3000/login` أو مسار مناسب.
  - يتأكد أن الاستجابة HTTP وليست connection close.
- توثيق أن Docker frontend يجب أن يعمل بـ `HOSTNAME=0.0.0.0`.
- إن كان مناسبا، إضافة healthcheck للـ frontend في `docker-compose.yml`.

معيار الإغلاق:

- فشل frontend port mapping يظهر مبكرا كرسالة واضحة.
- `test:ux:roles` لا يبدأ إذا كانت الواجهة لا ترد.
- لا تتغير تجربة المنتج.

التحقق:

- `docker compose up -d frontend`.
- readiness check ينجح.
- `npm run test:ux:roles` في frontend.

### PGP-005 - RC Acceptance Runbook

الأولوية: P2.

الهدف: جعل إعادة قبول المنتج عملية واضحة للفريق بدون الرجوع إلى محادثة أو تقرير طويل.

النطاق:

- إنشاء runbook قصير أو قسم داخل هذه الوثيقة يحدد:
  - تشغيل Docker stack.
  - فحص backend health.
  - تشغيل acceptance harness.
  - تشغيل create-flow smoke.
  - تشغيل UX roles.
  - تشغيل seed validation.
  - أين تحفظ الأدلة المؤقتة.
- ربط runbook بتقرير Phase G.

معيار الإغلاق:

- عضو جديد في الفريق يستطيع إعادة RC acceptance من الوثائق فقط.
- runbook لا يحتوي خطوات منتج غير منفذة.
- runbook يوضح متى نعيد seed reset ومتى نكتفي بالتحقق.

التحقق:

- review للخطوات مقابل أوامر `package.json` الحالية.
- `git diff --check`.

### PGP-006 - Route Alias Watch

الأولوية: P3.

الهدف: تثبيت أن `/entities` ليس فجوة polish حاليا، بل قرار منتج مقبول حتى يوجد سبب واضح لـ `/funds`.

النطاق:

- لا تنفيذ الآن.
- لا route alias.
- لا redirect.
- لا rewrite.
- لا تغيير tests أو bookmarks.
- فقط نحافظ على القرار في الوثائق ونفتحه لاحقا إذا صار URL نفسه جزءا من تجربة مستخدم منشورة.

معيار الإغلاق:

- هذا البند يعتبر `Watch / No Action`.
- لا يدخل ضمن sprint إلا إذا ظهر قرار منتج جديد.

## قرارات لا تحتاج موافقة الآن

لا أحتاج قرارا إداريا جديدا لتنفيذ `PGP-001` إلى `PGP-005` لأنها tooling/runbook فقط.

القرار الوحيد المؤجل: هل نضيف `/funds` كـ alias عام. القرار الحالي: لا.

## بوابة إغلاق هذا backlog

نغلق هذا backlog عندما:

- توجد طريقة قابلة للإعادة لتشغيل قبول الصندوق/القالب/الحملة.
- توجد طريقة آمنة للتعامل مع بيانات القبول.
- frontend readiness واضح قبل UX role audit.
- runbook يكفي لإعادة RC acceptance.
- يبقى قرار `/entities` موثقا كـ no-action watch.
