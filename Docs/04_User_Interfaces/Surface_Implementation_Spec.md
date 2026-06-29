# مواصفة تنفيذ Surfaces في CollectiveTrustOS

هذه الوثيقة تحول مبادئ تجربة المنتج إلى مواصفة تنفيذ قابلة للبناء والاختبار.

المرجع الحاكم:

```text
Docs/04_User_Interfaces/Product_Experience_Principles.md
```

الخريطة التشغيلية للحسابات والـ Slices:

```text
Docs/04_User_Interfaces/Role_Surface_Map_And_Slice_Plan.md
```

## 1. الهدف

الهدف ليس بناء صفحة جديدة، ولا إعادة تسمية الصفحات الحالية، ولا إضافة شرح فوق النظام.

الهدف هو بناء طبقة Surface تجعل CollectiveTrustOS يعمل كمساعد تشغيل آلي:

```text
النظام يجمع ويفهم ويصنف.
الواجهة تعرض المطلوب فقط.
```

Surface يعني: نتيجة تشغيلية جاهزة لشخص محدد في لحظة محددة.

مثال:

```text
لا يوجد مطلوب منك الآن.
دفعت اشتراك هذا الشهر.
أنت مغطى في صندوق الطوارئ.
يوجد قرار واحد يحتاج صوتك.
```

وليس:

```text
هذه كياناتك، وهذه محافظك، وهذه مساراتك، وهذه قراراتك، فافهمها بنفسك.
```

## 2. غير الأهداف

لا يعتبر هذا التنفيذ ناجحاً إذا اقتصر على:

- تغيير `Entity` إلى "صندوق".
- تغيير `Wallet` إلى "مساهمة".
- تغيير `Dashboard` إلى "حالتك".
- إضافة Tooltips.
- إضافة بطاقات أكثر.
- إخفاء الروابط بالـ CSS فقط.
- جلب نفس البيانات الخام في الواجهة ثم إعادة ترتيبها.

كل ذلك قد يكون مفيداً لاحقاً، لكنه ليس تطبيقاً لفلسفة Surfaces.

## 3. التعريف التنفيذي للـ Surface

Surface ليس route.
Surface ليس module.
Surface ليس sidebar.
Surface ليس dashboard باسم جديد.

Surface هو عقد بين الباك إند والواجهة:

```text
من هذا المستخدم؟
ما دوره الفعلي الآن؟
ما المطلوب منه؟
ما الفائدة أو الحالة التي تهمه؟
ما الاستثناءات التي تحتاج تدخله؟
ما الذي لا يحق له فعله ولماذا؟
ما الروابط العميقة المسموحة فقط عند الحاجة؟
```

## 4. نقطة البداية

أول تنفيذ يجب أن يكون:

```http
GET /api/work-surface/me
```

هذا endpoint هو المصدر الأساسي للصفحة اليومية بعد تسجيل الدخول.

لا تستبدله الواجهة بتجميع endpoints مثل:

- `/entities/mine`
- `/subscriptions`
- `/decisions`
- `/notifications`
- `/disbursement-requests`
- `/finance`

يمكن للباك إند استخدام هذه الجداول داخلياً، لكن الواجهة لا تجمعها لتستنتج المعنى.

## 5. مبدأ البيانات الخارجة من API

الـ API لا يرجع بنية النظام الداخلية كمدخل للواجهة اليومية.

يرجع:

- عبارات تشغيلية جاهزة.
- إجراءات مطلوبة.
- تحديثات هادئة.
- ملخص دفع.
- ملخص استفادة.
- أسباب منع.
- روابط متقدمة حسب الدور.

ولا يرجع افتراضياً:

- قوائم كل الكيانات.
- قوائم كل المحافظ.
- قوائم كل المسارات.
- كل القرارات.
- كل ledger entries.
- raw audit logs.

إذا احتاجت أداة متقدمة هذه البيانات، يكون لها endpoint منفصل وصلاحيات واضحة.

## 6. عقد الاستجابة المقترح

```ts
type SurfaceKind =
  | "MEMBER"
  | "CONDITIONAL_MEMBER"
  | "SUSPENDED_MEMBER"
  | "EXITED_MEMBER"
  | "SUPPORTER_ONLY"
  | "MULTI_ENTITY_MEMBER"
  | "FOUNDER"
  | "ADMIN"
  | "TREASURER"
  | "COMMITTEE_MEMBER"
  | "AUDITOR"
  | "PLATFORM_OPERATOR";

type SurfacePriority = "critical" | "urgent" | "normal" | "info";

type SurfaceActionKind =
  | "PAYMENT_DUE"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_PROOF_REJECTED"
  | "PAYMENT_PROOF_PENDING"
  | "VOTE_REQUIRED"
  | "DISBURSEMENT_REQUEST_STATUS"
  | "MEMBERSHIP_APPLICATION_STATUS"
  | "MEMBERSHIP_FIX_REQUIRED"
  | "OPERATOR_REVIEW_REQUIRED"
  | "TREASURER_MATCH_REQUIRED"
  | "AUDIT_RISK_REVIEW"
  | "COMMITTEE_REVIEW_REQUIRED"
  | "PLATFORM_REVIEW_REQUIRED";

interface WorkSurfaceResponse {
  generatedAt: string;
  person: PersonSurfaceSummary;
  surfaceKind: SurfaceKind;
  activeContexts: SurfaceContext[];
  primaryMessage: SurfaceMessage;
  requiredActions: SurfaceAction[];
  quietUpdates: SurfaceUpdate[];
  moneySummary?: MoneySurfaceSummary;
  benefitSummary?: BenefitSurfaceSummary;
  blockedCapabilities: BlockedCapability[];
  exceptions: SurfaceException[];
  advancedTools: AdvancedToolLink[];
  emptyState?: SurfaceEmptyState;
  diagnostics?: SurfaceDiagnostics;
}
```

## 7. الحقول الأساسية

### `person`

```ts
interface PersonSurfaceSummary {
  id: string;
  displayName: string;
  accountState: "OK" | "UNVERIFIED" | "READ_ONLY" | "BLOCKED";
  accountMessage?: string;
}
```

الغرض: عرض هوية بسيطة وحالة حساب لا تحتاج مصطلحات داخلية.

### `activeContexts`

```ts
interface SurfaceContext {
  id: string;
  kind: "ENTITY" | "CAMPAIGN" | "SHARED_BENEFIT" | "PLATFORM";
  label: string;
  roleLabel: string;
  stateLabel: string;
  isOperational: boolean;
}
```

الغرض: سياق مختصر عند الحاجة، وليس مدخل navigation.

مثال:

```json
{
  "label": "صندوق عائلة الهاشمي",
  "roleLabel": "عضو",
  "stateLabel": "نشط",
  "isOperational": true
}
```

### `primaryMessage`

```ts
interface SurfaceMessage {
  tone: "positive" | "attention" | "blocked" | "neutral";
  title: string;
  body?: string;
  nextStep?: string;
}
```

أمثلة:

```text
لا يوجد مطلوب منك الآن.
عليك 100 ريال لهذا الشهر.
عضويتك معلقة. سدّد المتأخرات لاستعادة الاستفادة.
يوجد 3 دفعات تحتاج مطابقة.
```

### `requiredActions`

```ts
interface SurfaceAction {
  id: string;
  kind: SurfaceActionKind;
  priority: SurfacePriority;
  title: string;
  body: string;
  contextLabel?: string;
  amount?: number;
  dueDate?: string;
  cta: SurfaceCta;
  secondaryCta?: SurfaceCta;
  reason?: string;
  expectedAfterAction?: string;
}
```

قاعدة مهمة:

```text
لا يظهر action إلا إذا كان فعلاً يحتاج المستخدم الآن.
```

مثال:

```json
{
  "kind": "PAYMENT_DUE",
  "title": "عليك 100 ريال",
  "body": "اشتراك شهر يونيو مستحق الآن.",
  "contextLabel": "صندوق عائلة الهاشمي",
  "cta": { "label": "سدّد الآن", "href": "/portal/payments/due-123" },
  "expectedAfterAction": "بعد رفع الدفع سيظهر كقيد المراجعة حتى يؤكده أمين الصندوق."
}
```

### `quietUpdates`

```ts
interface SurfaceUpdate {
  id: string;
  title: string;
  body: string;
  contextLabel?: string;
  occurredAt?: string;
  href?: string;
}
```

هذه ليست مهام. تظهر بشكل مختصر كي يشعر المستخدم أن النظام يعمل.

مثال:

```text
تم اعتماد صرف حالة علاجية هذا الأسبوع.
```

لا نعرض تفاصيل القرار والتصويت والدفتر المالي إلا عند الحاجة أو الصلاحية.

### `moneySummary`

```ts
interface MoneySurfaceSummary {
  dueNow: number;
  overdue: number;
  paidThisPeriod: number;
  pendingProofs: number;
  rejectedProofs: number;
  displayText: string;
}
```

للمستخدم العادي:

```text
دفعت هذا الشهر. لا توجد متأخرات.
```

لأمين الصندوق:

```text
7 دفعات تحتاج مطابقة. يوجد صرفان معتمدان ينتظران التنفيذ.
```

### `benefitSummary`

```ts
interface BenefitSurfaceSummary {
  title: string;
  items: BenefitItem[];
}

interface BenefitItem {
  id: string;
  title: string;
  state: "AVAILABLE" | "SUPPORT_ONLY" | "CONDITIONAL" | "SUSPENDED" | "READ_ONLY";
  body: string;
  contextLabel?: string;
}
```

أمثلة:

```text
أنت مغطى في صندوق الطوارئ.
أنت داعم فقط في حملة العلاج، ولا يظهر لك طلب استفادة من هذه الحملة.
هذه الحملة قراءة فقط، ويمكنك متابعة الحالة دون إنشاء طلب جديد.
```

### `blockedCapabilities`

```ts
interface BlockedCapability {
  id: string;
  title: string;
  reason: string;
  contextLabel?: string;
  canFix: boolean;
  fixCta?: SurfaceCta;
}
```

تظهر فقط إذا حاول المستخدم فعل شيء أو كانت الحالة مهمة.

مثال:

```text
لا يمكنك اعتماد الصرف لأن دورك عضو فقط.
```

وليس:

```text
ليس لديك MemberRole.ADMIN على Entity كذا.
```

### `exceptions`

```ts
interface SurfaceException {
  id: string;
  title: string;
  body: string;
  ownerRole: "FOUNDER" | "ADMIN" | "TREASURER" | "AUDITOR" | "COMMITTEE" | "PLATFORM";
  severity: SurfacePriority;
  cta: SurfaceCta;
}
```

هذه هي قلب أسطح المشغلين:

- طلب يحتاج موافقة.
- دفعة تحتاج مطابقة.
- صرف معتمد ينتظر تنفيذ.
- نزاع مفتوح.
- تغيير صلاحيات حساس.
- فشل إشعار أو محاولة وصول.

### `advancedTools`

```ts
interface AdvancedToolLink {
  href: string;
  label: string;
  reason: string;
  requiredRole: string;
}
```

الأدوات المتقدمة لا تظهر كواجهة يومية. تظهر عند:

- الدور يسمح.
- يوجد سبب.
- المستخدم فتح "أدوات متقدمة".

مثال:

```text
الدفتر المالي: للمطابقة والتدقيق، وليس للاستخدام اليومي.
```

## 8. منطق اختيار Surface

المستخدم قد يملك أكثر من دور في أكثر من كيان.

لا نعطيه واجهة مزدحمة بكل الأدوار مرة واحدة.

الترتيب:

1. إذا كان هناك `critical/urgent requiredActions`، فهي تظهر أولاً بغض النظر عن الدور.
2. إذا كان المستخدم عضوًا عاديًا فقط، surfaceKind يكون `MEMBER` أو حالة عضو خاصة.
3. إذا كان له دور تشغيل في كيان، تظهر الاستثناءات التشغيلية بعد المطلوب الشخصي.
4. إذا كان له أدوار متعددة، تقسم الواجهة إلى:
   - مطلوب منك شخصيًا.
   - يحتاج تدخلك كمسؤول/مالي/مدقق.
5. لا تُخلط الأموال أو القرارات بين الكيانات. كل action يحمل `contextLabel`.

مثال فيصل، عضو في العائلة والعمارة:

```text
المطلوب منك:
- عليك 100 ريال في صندوق عائلة الهاشمي.
- لا يوجد مطلوب في عمارة النخيل.

استفادتك:
- صندوق الطوارئ.
- خدمة الحارس في العمارة.
```

لا يرى:

```text
قائمة كيانات ثم محافظ ثم مسارات.
```

## 9. مصادر البيانات في الباك إند

الـ `WorkSurfaceService` يستخدم داخلياً:

- `Person`
- `Membership`
- `Subscription`
- `PaymentDue`
- `PaymentRecord`
- `Decision`
- `Vote`
- `DisbursementRequest`
- `Notification`
- `Dispute`
- `AuditLog`
- `Entity.platformStatus`
- `Wallet.benefitType`
- `GovernancePath`
- `CommitteeMembership`
- `PlatformAccessLog`
- `SupportSession`

لكن الاستجابة لا تعكس هذه الجداول مباشرة.

## 10. قواعد التحويل من البيانات إلى Surface

### الدفع

| الحالة الداخلية | الجملة التشغيلية |
|---|---|
| `PaymentDue.PENDING` | عليك X ريال لهذا الشهر. |
| `PaymentDue.OVERDUE` | لديك متأخر X ريال. |
| `PaymentRecord.SUBMITTED` | دفعتك وصلت وتنتظر التأكيد. |
| `PaymentRecord.REJECTED` | دفعتك لم تُعتمد، والسبب كذا. |
| `PaymentDue.PAID` | دفعت هذا الشهر. |

### الاشتراك

| الحالة الداخلية | الجملة التشغيلية |
|---|---|
| `ACTIVE` | أنت مغطى/مشترك. |
| `CONDITIONAL` | عضويتك مشروطة، ينقص كذا إن توفر السبب. |
| `SUSPENDED` | عضويتك معلقة، وهذا أثرها. |
| `SUPPORTER_ONLY` | أنت داعم فقط. |
| `EXITED` | أنت خارج هذا الصندوق. |

### القرار

| الحالة الداخلية | الجملة التشغيلية |
|---|---|
| open + canVote + not voted | يوجد قرار يحتاج صوتك. |
| open + cannot vote | لا يظهر كإجراء، وقد يظهر سبب المنع فقط عند محاولة الوصول. |
| closed approved | تحديث هادئ إذا كان مؤثرًا للمستخدم. |
| closed rejected | تحديث هادئ عند علاقته بطلب المستخدم. |

### الصرف

| الحالة الداخلية | الجملة التشغيلية |
|---|---|
| requested by user + PENDING | طلبك تحت المراجعة. |
| requested by user + APPROVED | طلبك معتمد وينتظر التنفيذ. |
| requested by user + REJECTED | طلبك لم يُقبل، والسبب كذا. |
| admin/treasurer + PENDING | طلب صرف يحتاج مراجعة. |
| treasurer + APPROVED | صرف معتمد ينتظر التنفيذ. |

### النزاع والتدقيق

| الحالة الداخلية | الجملة التشغيلية |
|---|---|
| open dispute for admin | نزاع يحتاج متابعة. |
| audit high severity | حدث حساس يحتاج مراجعة. |
| failed financial action | محاولة مالية فشلت وتحتاج تدقيق. |

## 11. واجهة المستخدم اليومية

الصفحة اليومية لا تبدأ بـ navigation modules.

الترتيب المقترح:

1. `primaryMessage`
2. `requiredActions`
3. `moneySummary`
4. `benefitSummary`
5. `quietUpdates`
6. `exceptions` حسب الدور
7. `advancedTools` مطوية أو مخفية

## 12. سياسة التنقل

### العضو العادي

يرى افتراضياً:

- الرئيسية
- السداد أو مدفوعاتي
- طلباتي
- التنبيهات

ولا يرى افتراضياً:

- الكيانات
- المحافظ
- المسارات
- التدقيق
- المالية
- النزاعات
- إعدادات الصندوق

### المسؤول

يرى:

- الرئيسية
- ما يحتاج قرارك
- الأعضاء عند وجود طلبات أو من وضع متقدم
- أدوات متقدمة

### أمين الصندوق

يرى:

- الرئيسية
- المطابقة
- الصرف المعتمد
- التقرير المالي المختصر

### المدقق

يرى:

- الرئيسية
- المخاطر
- Timeline
- التقارير الرقابية

## 13. قواعد الحماية

إخفاء الروابط لا يكفي.

كل endpoint عميق يجب أن يبقى محمياً:

- العضو لا يستطيع الوصول المباشر لبيانات إدارية.
- المدقق لا يستطيع التعديل.
- أمين الصندوق لا يستطيع حوكمة لا تخص دوره.
- عضو اللجنة لا يرى خارج نطاقه.
- منصة الدعم لا تدخل بلا جلسة ونطاق وسبب.

Surface يحسن التجربة، لكنه لا يستبدل authorization.

## 14. خطة الملفات المتوقعة لأول Slice

### Backend

```text
backend/src/work-surface/work-surface.module.ts
backend/src/work-surface/work-surface.controller.ts
backend/src/work-surface/work-surface.service.ts
backend/src/work-surface/dto/work-surface.dto.ts
backend/src/work-surface/work-surface.service.spec.ts
backend/src/app.module.ts
```

### Frontend

```text
frontend/src/lib/api/work-surface.ts
frontend/src/app/(main)/dashboard/page.tsx
frontend/src/app/(main)/dashboard/dashboard.module.css
frontend/src/components/layout/AppShell.tsx
frontend/src/components/layout/BottomNav.tsx
frontend/src/components/work-surface/PrimaryMessage.tsx
frontend/src/components/work-surface/RequiredActions.tsx
frontend/src/components/work-surface/MoneySummary.tsx
frontend/src/components/work-surface/BenefitSummary.tsx
frontend/src/components/work-surface/QuietUpdates.tsx
frontend/src/components/work-surface/AdvancedTools.tsx
```

### Tests

```text
backend/src/work-surface/work-surface.service.spec.ts
frontend/scripts/ux-role-audit.spec.cjs
frontend/src/app/(main)/dashboard/*.test.tsx
```

لا نحتاج migration في أول Slice إلا إذا قررنا تخزين نوع surface أو تفضيلات متقدمة.

## 15. أول Slice مطلوب

### SLC-00: العقد والباك إند الأولي

ينتج:

- `GET /api/work-surface/me`
- DTO واضح.
- تصنيف actions.
- تصنيف benefits.
- advanced tools حسب الدور.
- اختبارات service لحسابات seed الأساسية.

لا يغيّر كل الواجهة بعد.

### SLC-01: Dashboard العضو

ينتج:

- Dashboard يستخدم `work-surface/me`.
- يخفي modules القديمة عن العضو العادي.
- يعرض المطلوب والمدفوع والاستفادة والتحديثات.
- لا يعرض Entities/Wallets/Finance/Audit كمدخل يومي.

## 16. أمثلة Surface

### عضو لا يوجد عليه شيء

```json
{
  "surfaceKind": "MEMBER",
  "primaryMessage": {
    "tone": "positive",
    "title": "لا يوجد مطلوب منك الآن",
    "body": "دفعت هذا الشهر ولا توجد متأخرات."
  },
  "requiredActions": [],
  "moneySummary": {
    "dueNow": 0,
    "overdue": 0,
    "paidThisPeriod": 100,
    "pendingProofs": 0,
    "rejectedProofs": 0,
    "displayText": "دفعت هذا الشهر."
  },
  "benefitSummary": {
    "title": "استفادتك",
    "items": [
      {
        "id": "benefit-emergency",
        "title": "أنت مغطى في صندوق الطوارئ",
        "state": "AVAILABLE",
        "body": "يمكنك تقديم طلب عند الحاجة."
      }
    ]
  },
  "advancedTools": []
}
```

### عضو عليه دفعة

```json
{
  "surfaceKind": "MEMBER",
  "primaryMessage": {
    "tone": "attention",
    "title": "عليك 100 ريال",
    "nextStep": "سدّد الآن أو ارفع إثبات الدفع."
  },
  "requiredActions": [
    {
      "kind": "PAYMENT_DUE",
      "priority": "normal",
      "title": "عليك 100 ريال",
      "body": "اشتراك شهر يونيو مستحق الآن.",
      "contextLabel": "صندوق عائلة الهاشمي",
      "cta": { "label": "سدّد الآن", "href": "/portal" }
    }
  ]
}
```

### أمين صندوق

```json
{
  "surfaceKind": "TREASURER",
  "primaryMessage": {
    "tone": "attention",
    "title": "لديك 7 دفعات تحتاج مطابقة"
  },
  "exceptions": [
    {
      "title": "7 دفعات تحتاج مطابقة",
      "ownerRole": "TREASURER",
      "severity": "normal",
      "cta": { "label": "طابق الدفعات", "href": "/finance" }
    },
    {
      "title": "صرف معتمد ينتظر التنفيذ",
      "ownerRole": "TREASURER",
      "severity": "urgent",
      "cta": { "label": "نفّذ الصرف", "href": "/disbursement-requests" }
    }
  ]
}
```

### مدقق

```json
{
  "surfaceKind": "AUDITOR",
  "primaryMessage": {
    "tone": "attention",
    "title": "يوجد حدث حساس يحتاج مراجعة"
  },
  "exceptions": [
    {
      "title": "تغيير صلاحية عضو",
      "body": "تم تغيير دور عضو إلى أمين صندوق.",
      "ownerRole": "AUDITOR",
      "severity": "urgent",
      "cta": { "label": "راجع التسلسل", "href": "/auditor" }
    }
  ]
}
```

## 17. معايير القبول

أي Surface لا يقبل إلا إذا:

- يقلل ما يراه المستخدم العادي.
- لا يطلب من المستخدم فهم الكيان/المحفظة/المسار كمدخل يومي.
- يعرض المطلوب والفائدة والمنع بجمل تشغيلية.
- يعرض السبب عند المنع أو الرفض.
- يظهر advanced tools فقط حسب الدور أو الحاجة.
- لا يكسر direct-route authorization.
- يعمل على الجوال.
- يمر حسابات UX الأساسية 18/18 بعد تحديث الاختبار.

## 18. اختبارات مطلوبة

### Backend unit tests

اختبر:

- عضو عادي بلا مطلوب.
- عضو عليه دفعة.
- عضو عليه متأخر.
- عضو suspended.
- عضو conditional.
- supporter only.
- multi-entity member.
- treasurer له دفعات مطابقة.
- admin له طلبات مراجعة.
- auditor له أحداث حساسة.
- committee member له تصويت لجنة.

### Frontend tests

اختبر:

- لا تظهر روابط Audit/Finance/Governance للعضو.
- تظهر رسالة "لا يوجد مطلوب منك الآن" للحالة النظيفة.
- تظهر payment action عند وجود دفعة.
- تظهر blocked reason عند حالة موقوفة.
- لا يوجد overflow على mobile.

### Playwright UX role audit

التحديث المطلوب:

- لا يقيس نجاح العضو بقدرته على فتح كل route.
- يقيس أنه يرى ما يخصه فقط.
- يفشل إذا ظهرت له أدوات داخلية لا يحتاجها.
- يفشل إذا لم يعرف المطلوب من الشاشة الأولى.

## 19. قواعد فشل صريحة

التنفيذ فاشل إذا:

- زادت الصفحة اليومية بطاقات أكثر دون إخفاء شيء.
- بقيت القائمة تعرض modules للجميع.
- الواجهة ما زالت تجمع raw lists وتستنتج المعنى.
- المستخدم يحتاج فتح كيانات/محافظ/مسارات ليعرف كم عليه.
- العضو يرى Audit أو Ledger كجزء يومي.
- المدير يرى كل شيء بدل الاستثناءات.
- أمين الصندوق يرى حوكمة لا تخص عمله اليومي.
- المدقق يملك أزرار تعديل.
- direct route يعطي بيانات بلا صلاحية.

## 20. ترتيب التنفيذ العملي

1. تثبيت DTO وعقد `GET /api/work-surface/me`.
2. بناء `WorkSurfaceService` للعضو الأساسي فقط.
3. إضافة حالات الدفع والاشتراك.
4. ربط Dashboard بالـ API الجديد.
5. إخفاء navigation العميق للعضو.
6. إضافة treasurer/admin exceptions.
7. إضافة auditor/committee surfaces.
8. تحديث UX role audit.
9. تشغيل 18/18.

## 21. معيار الإغلاق

لا نعتبر Surface Implementation مغلقاً إلا إذا:

- أول شاشة بعد الدخول لا تعرض بنية النظام للعضو.
- العضو يعرف كم عليه وماذا يستفيد وهل يوجد مطلوب خلال ثوان.
- الباك إند يصنف المطلوب والاستثناءات.
- الأدوات العميقة تظهر فقط حسب الدور أو الحاجة.
- كل دور من 18/18 يرى ما يحتاجه فقط.
- توجد اختبارات تثبت ذلك.

## 22. الجملة التنفيذية الحاكمة

```text
لا نسأل: ما الصفحات التي نعرضها لهذا الدور؟
نسأل: ما العمل الذي يجب أن ينجزه النظام عن هذا الدور، وما الاستثناء الذي يحتاج تدخله فقط؟
```
