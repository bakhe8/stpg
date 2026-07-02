# RC Acceptance Runbook

## حالة الوثيقة

**الإصدار التشغيلي:** 2.29
**التاريخ:** 2026-07-02
**الحالة:** مرجع تشغيل معتمد لإعادة قبول RC
**يرتبط بـ:** `18_PHASE_G_PRODUCT_ACCEPTANCE_BACKLOG.md`, `19_PHASE_G_PRODUCT_ACCEPTANCE_REPORT.md`, `20_POST_PHASE_G_POLISH_BACKLOG.md`

## الغرض

هذا المستند يحدد طريقة إعادة تشغيل قبول المنتج كمرشح إصدار بدون الرجوع إلى المحادثة أو تقرير Phase G الطويل.

الهدف من الجولة هو إثبات أن تجربة `صندوق / حملة` الافتراضية ما زالت تعمل، وأن القوالب والمحافظ والمسارات والاشتراكات والمدفوعات والأدوار والتدقيق والحوكمة بقيت متاحة بعد تبسيط الواجهة.

## ما لا يفعله هذا runbook

- لا يضيف ميزة جديدة.
- لا يغير schema أو migration.
- لا يضيف `/funds` alias.
- لا يحذف بيانات قبول جزئيا.
- لا يغير قرار المنتج الحالي: `RC_READY_WITH_POLISH` ما لم تظهر نتيجة تشغيل جديدة تغير القرار.

## المتطلبات

- Docker يعمل محليا.
- الأوامر تنفذ من جذر المستودع: `STGP`.
- `backend/package.json` يحتوي:
  - `acceptance:phase-g`
  - `acceptance:phase-g:hygiene`
  - `seed:validate:boundary`
  - `seed:validate:docker`
- `frontend/package.json` يحتوي:
  - `readiness:frontend`
  - `test:phase-d:create-flow`
  - `test:ux:roles`

## تجهيز جولة قبول

يفضل إنشاء مجلد أدلة مؤقت خارج المستودع لكل جولة:

```powershell
$stamp = Get-Date -Format "yyyyMMddHHmmss"
$env:ACCEPTANCE_STAMP = $stamp
$env:ACCEPTANCE_OUT_DIR = Join-Path $env:TEMP "stgp-rc-acceptance-$stamp"
New-Item -ItemType Directory -Force $env:ACCEPTANCE_OUT_DIR | Out-Null
$env:ACCEPTANCE_OUT_DIR
```

أي ملفات summary أو logs أو screenshots مرتبطة بالجولة تحفظ في هذا المجلد أو في `%TEMP%`. لا تحفظ أدلة التشغيل المؤقتة داخل `Docs`.

## تشغيل Docker stack

من جذر المستودع:

```powershell
docker compose up -d postgres backend frontend
docker compose ps
```

معيار النجاح:

- `postgres` يعمل.
- `backend` يعمل.
- `frontend` يعمل ولا يظهر كـ unhealthy.

## فحص backend health

من جذر المستودع:

```powershell
Invoke-RestMethod http://localhost:3001/health
```

معيار النجاح: يرجع backend ردا سليما بدون خطأ اتصال.

إذا فشل الفحص، لا تبدأ قبول RC. أصلح تشغيل backend أو Docker أولا.

## فحص frontend readiness

من مجلد الواجهة:

```powershell
cd frontend
npm run readiness:frontend
cd ..
```

معيار النجاح:

- يطبع السكربت JSON يحتوي `status: "ready"`.
- المسار المفحوص افتراضيا هو `http://localhost:3000/login`.

إذا فشل الفحص، شغل:

```powershell
docker compose up -d frontend
docker inspect -f "{{.State.Health.Status}}" stgp-frontend-1
```

لا تشغل UX role audit قبل نجاح readiness.

## فحص بيانات قبول سابقة

من مجلد backend:

```powershell
cd backend
npm run acceptance:phase-g:hygiene
cd ..
```

هذا فحص dry-run فقط. يوضح سجلات القبول التي أنشأتها جولات سابقة باستخدام:

- `profileKey = ACCEPTANCE`
- `profileLabel = Acceptance Harness`
- أسماء تبدأ بـ `Acceptance`

## متى نعيد seed reset؟

لا نعيد reset في كل جولة.

اكتف بالتحقق بدون reset عندما:

- الهدف هو التأكد أن المنتج ما زال يقبل RC فوق بيانات التطوير الحالية.
- سجلات `ACCEPTANCE` السابقة لا تؤثر على قراءة النتائج.
- تريد التأكد أن `seed:validate:docker` لا ينكسر بعد بيانات runtime.

أعد seed reset عندما:

- تحتاج جولة رسمية نظيفة بأعداد وtimestamps واضحة.
- فشلت جولة سابقة في منتصفها وتركت بيانات قبول جزئية تربك الأدلة.
- تريد مقارنة baseline seed قبل وبعد قبول RC.
- ظهرت نتائج hygiene كثيرة أو غير مفهومة وتريد نقطة بداية نظيفة.

الأمر المعتمد لل reset الكامل:

```powershell
cd backend
npm run seed:reset:docker
cd ..
```

أو من hygiene script مع التصريح الصريح:

```powershell
cd backend
npm run acceptance:phase-g:hygiene -- -ResetSeedData
cd ..
```

لا تستخدم `-Delete`. الحذف الجزئي مرفوض عمدا لأن بيانات القبول ترتبط بمحافظ ومسارات وعضويات ودفاتر وتدقيق.

## baseline seed validation

من مجلد backend:

```powershell
cd backend
npm run seed:validate:boundary
npm run seed:validate:docker
cd ..
```

معيار النجاح:

- `seed:validate:boundary` يثبت أن coverage الصارم يعتمد على seed الرسمي UUID v5.
- `seed:validate:docker` يطبع هوية قاعدة البيانات الصحيحة ويمر بدون findings حاجبة.

إذا ظهر `DB_IDENTITY_MISMATCH` أو فشل اتصال قاعدة البيانات، لا تعتمد النتيجة.

## تشغيل acceptance harness

من مجلد backend:

```powershell
cd backend
npm run acceptance:phase-g
cd ..
```

معيار النجاح:

- يطبع JSON يحتوي `status: "passed"`.
- ينشئ صندوقا فارغا.
- ينشئ صناديق من القوالب الأربعة.
- ينشئ حملة تحت صندوق أب.
- يحفظ `phase-g-acceptance-summary.json` داخل `ACCEPTANCE_OUT_DIR` أو داخل `%TEMP%\stgp-phase-g-acceptance-<stamp>`.

إذا فشل harness:

1. صنف الفشل: backend، seed data، template، campaign، أو connectivity.
2. لا تعدل المنتج مباشرة من داخل runbook.
3. افتح بطاقة إصلاح صغيرة مرتبطة بالسيناريو.
4. بعد الإصلاح، أعد تشغيل harness ثم البوابات اللاحقة.

## تشغيل create-flow smoke

من مجلد الواجهة:

```powershell
cd frontend
npm run test:phase-d:create-flow
cd ..
```

معيار النجاح:

- Playwright يمر بدون failure.
- لا تظهر شاشة فارغة أو framework overlay.
- مسار إنشاء صندوق/حملة الافتراضي ما زال يعمل.

## تشغيل UX role audit

من مجلد الواجهة:

```powershell
cd frontend
npm run test:ux:roles
cd ..
```

هذا الأمر يشغل `readiness:frontend` تلقائيا قبل audit.

معيار النجاح:

- readiness يمر أولا.
- اختبار UX role audit يمر.
- الاختبار يغطي مستخدمي seed للأدوار اليومية.

## تشغيل backend parity عند الحاجة

هذا الفحص ليس بديلا عن acceptance harness، لكنه مفيد إذا تغير backend أو أردنا جولة RC أشمل:

```powershell
cd backend
npm run test:phase-d:parity
cd ..
```

شغله قبل قرار RC الرسمي إذا كان آخر تغيير مس backend أو القوالب أو المحافظ أو المسارات أو الصلاحيات.

## final seed validation

بعد تشغيل harness واختبارات الواجهة:

```powershell
cd backend
npm run seed:validate:boundary
npm run seed:validate:docker
cd ..
```

معيار النجاح:

- بيانات runtime التي أنشأها acceptance harness لا تكسر seed الرسمي.
- runtime data تظهر في الملخصات، لكنها لا تدخل ضمن coverage الصارم.

## ترتيب التشغيل المختصر

```powershell
docker compose up -d postgres backend frontend
Invoke-RestMethod http://localhost:3001/health

cd frontend
npm run readiness:frontend
cd ..

cd backend
npm run acceptance:phase-g:hygiene
npm run seed:validate:boundary
npm run seed:validate:docker
npm run acceptance:phase-g
cd ..

cd frontend
npm run test:phase-d:create-flow
npm run test:ux:roles
cd ..

cd backend
npm run seed:validate:boundary
npm run seed:validate:docker
cd ..
```

## الأدلة المطلوبة

احتفظ بهذه الأدلة خارج المستودع:

- خرج `docker compose ps`.
- نتيجة backend health.
- خرج `readiness:frontend`.
- خرج `acceptance:phase-g:hygiene`.
- ملف `phase-g-acceptance-summary.json`.
- خرج `test:phase-d:create-flow`.
- خرج `test:ux:roles`.
- خرج `seed:validate:docker` النهائي.

إذا كانت الجولة جزءا من release decision، سجل رابط أو مسار مجلد الأدلة في تقرير القبول أو release note، وليس محتوى الأدلة كاملا.

## تصنيف النتيجة

| النتيجة | متى تستخدم |
|---|---|
| `RC_READY` | كل البوابات مرت ولا توجد ملاحظات polish جديدة. |
| `RC_READY_WITH_POLISH` | كل البوابات مرت، وتوجد ملاحظات لا تمنع الإصدار. |
| `RC_BLOCKED` | فشل سيناريو يمنع إنشاء صندوق/حملة، أو يمنع القوالب، أو يكسر الأدوار، أو يكسر seed الرسمي. |

## قاعدة التعامل مع الفشل

إذا فشلت بوابة:

1. لا توسع نطاق الإصلاح.
2. اربط الفشل بسيناريو Phase G محدد.
3. أصلح أقل مساحة ممكنة.
4. أعد تشغيل البوابة الفاشلة.
5. أعد تشغيل final seed validation.
6. إذا مس الإصلاح الواجهة أو الصلاحيات، أعد `test:ux:roles`.

## مرجع القرار السابق

آخر قرار مثبت في `19_PHASE_G_PRODUCT_ACCEPTANCE_REPORT.md` هو:

```text
RC_READY_WITH_POLISH
```

لا يتغير هذا القرار إلا بجولة قبول جديدة موثقة بهذه الخطوات.
