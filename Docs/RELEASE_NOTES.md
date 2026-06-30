# Release Notes - CollectiveTrustOS

## 2.3 - 2026-06-30

**النوع:** Phase D start / feature-flagged frontend flow
**الحالة:** مسار إنشاء صندوق/حملة جديد خلف feature flag، وليس default بعد

### ما تغير

- أضيف `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW` للواجهة.
- عند تفعيل العلم، تعرض `/entities/new` شاشة اختيار بين `صندوق` و`حملة`.
- إنشاء الصندوق من المسار الجديد يستخدم `type = COMMUNITY` داخليا ويحفظ `profileKey/profileLabel` اختياريا.
- إنشاء الحملة يستخدم endpoint الحالي `POST /entities/:id/campaigns` ويتطلب صندوقا قائما.
- بقي النموذج القديم متاحا بزر رجوع وكسلوك default عند تعطيل flag.
- أضيفت وثيقة `Docs/09_Improvement/07_PHASE_D_PARALLEL_CREATE_FLOW.md`.

### المعنى العملي

بدأ Phase D بدون كسر المسار القديم. المتبقي قبل جعل المسار الجديد default: setup checklist، parity pack، وUX smoke tests للعلمين.

## 2.2 - 2026-06-30

**النوع:** 09 Improvement preflight implementation
**الحالة:** Phase A وB وC منفذة؛ التالي Phase D

### ما تغير

- Phase A: إغلاق تعارضات عقود الإنشاء وقيم enum بين الواجهة والباكند.
- Phase B: تطبيع القوالب حتى تنشئ policy وwallets وpaths وledgers وaudit.
- Phase C: إضافة `profileKey/profileLabel` للصندوق، وإضافة `canManageAdvancedSettings` للعضويات.
- نقل صلاحية قواعد وسياسات الصندوق إلى مؤسس أو مفوض إعدادات متقدمة.
- منع تغيير `Entity.type` من API العام، مع إبقائه حقل توافق داخلي.
- تصنيف تغييرات policy حسب الخطورة داخل audit وpolicy impact.
- تحديث seed وseed validation لتغطية profile الاختياري.

### التحقق

- backend targeted tests
- backend build
- Prisma validate
- frontend build
- frontend lint
- Docker seed reset
- Docker seed validate

### المعنى العملي

الآن يمكن بدء Phase D لبناء مسار إنشاء الصندوق/الحملة الجديد خلف feature flag، مع بقاء legacy flow وكل القدرات الحالية.

## 2.1 - 2026-06-30

**النوع:** Repository state / documentation baseline  
**الحالة:** جاهز لبدء `Docs/09_Improvement` من Phase A

### ما تغير

- تثبيت حالة المستودع الحالية في `Docs/REPOSITORY_STATE.md`.
- تحديث `Docs/README.md` ليعرض الإصدار التشغيلي `2.1`.
- تحديث `Docs/08_Production_Readiness/BACKLOG.md` من `2.0` إلى `2.1` كمرجع إغلاق 08.
- تعليم `Docs/08_Production_Readiness/AUDIT_REPORT_v2.md` كوثيقة تاريخية superseded عند التعارض.
- ترتيب `Docs/09_Improvement` كحزمة تنفيذية تبدأ من `00_README.md` وتنتهي بـ Phase A backlog.

### المعنى العملي

- Production readiness 08 مغلق من ناحية backlog.
- `AUDIT_REPORT_v2.md` لا يستخدم كحالة حالية للمشروع.
- أول عمل مفتوح بعد 08 هو `Docs/09_Improvement/04_PHASE_A_PREFLIGHT_BACKLOG.md`.
- تنفيذ 09 لم يبدأ بعد.
- لا توجد هجرة schema أو تعديل runtime ضمن هذا الإصدار؛ هذا إصدار تثبيت حالة قبل التنفيذ.

### ملاحظات

لم يتم رفع نسخ `backend/package.json` أو `frontend/package.json` في هذا الإصدار، لأن المشروع لا يملك حتى الآن سياسة إصدار منتج موحدة في الجذر. الإصدار `2.1` هنا هو إصدار تشغيلي لتوثيق حالة المستودع.
