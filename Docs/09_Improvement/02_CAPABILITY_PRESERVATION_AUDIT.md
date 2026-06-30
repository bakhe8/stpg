# 02 - Capability Preservation Audit

## حالة الوثيقة

هذا الملف هو الملحق الأول للخطة الرئيسية `01_FUND_EXPERIENCE_TRANSITION_PLAN.md`.

دوره ليس اقتراح شاشة جديدة، بل تثبيت القدرات التي يجب أن تبقى موجودة بعد تحويل الواجهة إلى "صندوق / حملة".

يعتمد ترتيب التنفيذ الحالي على:

- `00_README.md` كفهرس وحالة تنفيذية.
- `03_PREFLIGHT_GAPS_AND_COMPATIBILITY_AUDIT.md` لتفصيل الفجوات.
- `04_PHASE_A_PREFLIGHT_BACKLOG.md` كأول backlog تنفيذي بعد إغلاق 08.

## الهدف

هذا الملف هو جرد مستقل للقدرات الحالية في CollectiveTrustOS قبل تنفيذ تجربة "الصندوق" الجديدة.

الغرض منه أن يكون مرجعا سريعا للفريق عند تحويل خطة `01_FUND_EXPERIENCE_TRANSITION_PLAN.md` إلى backlog، بدون الرجوع كل مرة إلى الخطة الطويلة أو إلى الكود.

القاعدة الحاكمة:

> تبسيط الواجهة لا يعني حذف أي قدرة. كل قدرة موجودة اليوم يجب أن تبقى متاحة بعد تطبيق تجربة الصندوق الجديدة، حتى لو لم تظهر في شاشة الإنشاء الأولى.

## نطاق الأوديت

هذا الأوديت مبني على قراءة الكود والمخطط الحاليين، وليس على اختبار تشغيل runtime.

تمت مراجعة هذه المصادر:

- Backend modules: `backend/src/app.module.ts`
- Prisma schema: `backend/prisma/schema.prisma`
- Controllers and services under `backend/src`
- Frontend routes under `frontend/src/app/(main)`
- Governance components under `frontend/src/components/Governance`
- Seed/test coverage files:
  - `backend/prisma/seed-stories.ts`
  - `backend/prisma/seed-validate.ts`
  - `backend/prisma/seed-audit.ts`
  - `frontend/scripts/ux-role-audit.spec.cjs`
  - service specs under `backend/src`

## الملخص التنفيذي

النظام الحالي غني بالفعل. القدرات الأساسية موزعة على هذه الطبقات:

- Identity and authentication
- Funds/entities and lifecycle
- Membership, roles, invitations, and applications
- Wallets and wallet policies
- Governance paths and path policies
- Decisions, votes, execution, and appeals
- Rules engine
- Subscriptions, dues, and payment proof workflow
- Ledger, reversals, snapshots, and balance transfers
- Beneficiaries, dependents, spending items, and disbursements
- Committees and households
- Entity and wallet relationships
- Documents, notifications, search, analytics, work surface, auditor view, platform support

الانتقال إلى واجهة "صندوق / حملة" يمكن تنفيذه كطبقة فوقية بدون حذف هذه القدرات.

أهم نقاط الحذر:

- لا نحذف `EntityType` في المرحلة الأولى.
- لا نربط سلوك "الخدمات المشتركة" بنوع اجتماعي مثل `BUILDING`.
- لا نعرض raw enums للمستخدم العادي.
- لا نجعل القوالب تقفل الصندوق داخل نموذج واحد.
- لا نلغي الشاشة القديمة قبل إثبات parity.

## خريطة الموديولات الحالية

الموديولات المفعلة في `AppModule` تشمل:

| المجال | الموديولات |
|---|---|
| الهوية والدخول | `IdentityModule`, `PlatformAuthModule` |
| الصناديق/الكيانات | `EntitiesModule`, `PlatformEntitiesModule` |
| العضويات | `MembershipsModule`, `MembershipApplicationsModule`, `InvitationsModule` |
| المحافظ والمسارات | `WalletsModule`, `GovernancePathsModule` |
| الاشتراكات والدفعات | `SubscriptionsModule`, `PaymentsModule` |
| الدفتر المالي | `LedgerModule`, `BalanceTransferRequestsModule` |
| القرارات والحوكمة | `DecisionsModule`, `RulesModule`, `CommitteesModule`, `HouseholdsModule` |
| الصرف والمستفيدون | `DisbursementRequestsModule`, `BeneficiariesModule`, `SpendingItemsModule` |
| الاعتراضات والنزاعات | `AppealsModule`, `DisputesModule` |
| العلاقات | `EntityRelationshipsModule`, `WalletRelationshipsModule` |
| الوثائق والإشعارات | `DocumentsModule`, `NotificationsModule` |
| الرقابة والتحليلات | `AuditorModule`, `AnalyticsModule`, `SearchModule` |
| التشغيل والدعم | `WorkSurfaceModule`, `PlatformSurfaceModule`, `SupportModule`, `PlatformAccessLogModule` |

أي تجربة صندوق جديدة يجب ألا تتجاوز هذه الطبقات أو تجعلها غير قابلة للوصول.

## مصفوفة حفظ القدرات

### 1. إنشاء الصندوق والحملة

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ بعد التجربة الجديدة | ملاحظات |
|---|---|---|---|
| إنشاء كيان/صندوق | `EntitiesService.createEntity`, `CreateEntityDto` | يبقى low-level/internal، وتضاف فوقه طبقة setup جديدة | المستخدم يرى "صندوق"، لا "كيان". |
| القوالب الافتراضية | `EntityTemplate`, `entity-templates` | تتحول إلى قوالب تشغيلية لا تصنيفات اجتماعية | القالب نقطة بداية فقط. |
| إنشاء سياسة ودفتر وعضوية مؤسس | `createEntity` ينشئ `policy`, `ledgerAccount`, founder membership | يجب أن يستمر لكل صندوق جديد | لا صندوق بدون مؤسس وسجل تدقيق. |
| إنشاء محافظ ومسارات من القالب | `defaultWallets`, `defaultPaths` | ينتقل إلى `FundSetupService` أو setup endpoint | يجب ضبط القيم صراحة بدلا من الاعتماد على defaults الغامضة. |
| إنشاء حملة | `createCampaign`, `isCampaign`, `campaignEndsAt` | تبقى مسار مستقل للمستخدم | الحملة ليست مجرد صندوق عادي. |
| أرشفة حملة منتهية | `archiveExpiredCampaigns`, `CAMPAIGN_EXPIRED` | يجب أن تبقى كما هي | لا تخلط مع إغلاق الصندوق الدائم. |
| إغلاق الصندوق | `closureStatus`, `requestClosure`, closure checklist | يبقى في إعدادات الصندوق | لا يظهر في wizard الأول. |

حالة الأوديت:

- `CreateEntityDto` يقبل فقط `name`, `type`, `description`, `logoUrl`, `templateId`.
- الواجهة الحالية ترسل أيضا `defaultGovernanceType` و`allowMultiplePaths` إلى endpoint منخفض المستوى.
- هذا contract drift يجب إصلاحه في setup endpoint الجديد.

### 2. التسمية والملف الاجتماعي

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| `EntityType`: family/tribe/building/neighborhood/community/campaign | Prisma enum | يبقى داخليا في المرحلة الأولى | لا يحذف الآن. |
| تسمية "كيان" في الواجهة | frontend entity pages/locales | تستبدل للمستخدم بـ "صندوق" | backend يظل يستخدم Entity. |
| profile اجتماعي مثل عائلة/عمارة/حي/قبيلة | حاليا `EntityType` | يصبح اختياري أو وصف/profile | لا يقود السلوك التشغيلي. |
| خيار `FRIENDS` في الواجهة | frontend new entity page/list labels | لا يرسل كـ `EntityType` | إما profile اختياري أو يزال من enum-facing flow. |

حالة الأوديت:

- يوجد خيار `FRIENDS` في الواجهة لكنه ليس قيمة في `EntityType`.
- هذا يؤكد ضرورة فصل "profile" الاختياري عن enum الداخلي.

### 3. العضويات والأدوار والتفويض

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| أدوار العضوية | `MemberRole`: founder/admin/treasurer/auditor/committee/member | تبقى كما هي | لا نخلط الأدوار مع صلاحية الإعدادات المتقدمة. |
| دعوة عضو | `InvitationsModule`, `entities/:id/members` | تبقى ضمن الصندوق | الدعوة لا تعتمد على قالب الصندوق. |
| طلب انضمام | `requestToJoin`, `MembershipApplicationsModule` | يبقى | يتأثر بسياسة `allowOpenMembership/requiresMemberApproval`. |
| تغيير دور عضو | `MembershipsModule` | يبقى | منع تحويل founder عبر role update يجب أن يستمر. |
| تفضيلات العضو | `MemberPreference`, accepted governance types | تبقى | مهمة لتوافق العضو مع الحوكمة. |
| المعالون/dependents | `Dependent`, memberships dependents endpoint | يبقون | مهم لصندوق التكافل. |
| تفويض الإعدادات المتقدمة | غير موجود كصلاحية مستقلة حاليا | يحتاج إضافة | لا يكفي دور ADMIN العام إذا نريد تفويض محدود. |

الفجوة:

- `MANAGE_ADVANCED_SETTINGS` أو ما يعادله غير موجود كإذن مستقل.
- التنفيذ الحالي يعتمد غالبا على founder/admin في السياسات والإعدادات.

### 4. السياسات والإعدادات المتقدمة

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| عضوية مفتوحة أو بموافقة | `EntityPolicy.allowOpenMembership`, `requiresMemberApproval` | تبقى في إعدادات متقدمة | يمكن أن يحددها القالب مبدئيا. |
| تعدد المسارات | `allowMultiplePaths` | يبقى قابل للتعديل | ليس سؤالا أساسيا في wizard. |
| الكيانات الفرعية | `allowSubEntities` | تبقى في advanced | لا تظهر للمستخدم العادي مبكرا. |
| علاقات الصناديق | `allowEntityRelations` | تبقى | مهمة للدعم والتقارير والدمج. |
| أنواع الحوكمة المسموحة | `allowedGovernanceTypes` | تبقى | يجب ألا تقفلها القوالب نهائيا. |
| التصويت الافتراضي | `defaultVoteType` | يبقى | frontend الحالي لا يعرض كل enum بشكل صحيح. |
| النصاب | `decisionQuorumPercent` | يبقى | يظهر في advanced/policy. |
| الشفافية | `defaultTransparency` | تبقى | مهمة للخصوصية. |
| الاعتراضات | `allowAppeals`, `appealTimeoutDays` | تبقى | مهمة للثقة والحوكمة. |
| سجل نسخة السياسة | `PolicyVersion` | يبقى | كل تعديل يجب أن يسجل snapshot. |
| impact preview | `getPolicyImpact`, `PolicyBuilder` | يبقى | يجب توسيعه لاحقا لقوالب setup. |

فجوات:

- `allowedGovernanceTypes` لا يظهر له default واضح في schema/migration؛ setup الجديد يجب أن يكتب `[]` أو قائمة صريحة.
- `PolicyBuilder` يعرض `UNANIMOUS` و`WEIGHTED`، بينما `VoteType` الحالي لا يحتويهما. يجب تصحيح واجهة السياسة قبل تعميم الإعدادات المتقدمة.

### 5. المحافظ والسياسات المالية للمحفظة

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| إنشاء محفظة | `WalletsModule`, `entities/:entityId/wallets` | يبقى بعد إنشاء الصندوق | لا نحتاج قالب "متعدد المحافظ". |
| نوع المنفعة | `WalletBenefitType`: `SEPARABLE`, `SHARED` | يصبح مصدر سلوك الخدمات المشتركة | لا يعتمد على `EntityType.BUILDING`. |
| سياسة المحفظة | `WalletPolicy` | تبقى | الاشتراك، فترة السماح، الأهلية، الاسترداد، الشفافية. |
| إغلاق محفظة | `wallets/:id/close` | يبقى | لا يظهر في wizard. |
| ملكية المحفظة | `WalletOwnership` | تبقى | مهمة للتوسع والحوكمة. |

ملاحظة تنفيذية:

- "صندوق خدمات مشتركة" يجب أن ينشئ محفظة `SHARED`.
- أي صندوق آخر يمكن لاحقا إضافة محفظة `SHARED` أو `SEPARABLE`.

### 6. مسارات الحوكمة والتصويت

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| أنواع المسارات | `GovernancePathType`: board/committee/individual/public/donation/emergency | تبقى كلها | القوالب تختار defaults فقط. |
| سياسة المسار | `PathPolicy` | تبقى | vote type, documents, quorum, appeals, transfer. |
| default vote type by path | `GovernancePathsService.defaultVoteType` | يبقى | mapping الحالي مهم للتوافق. |
| تصويت كل عضو | `VoteType.ONE_MEMBER_ONE_VOTE` | يبقى | default لكثير من المسارات. |
| تصويت كل أسرة | `ONE_FAMILY_ONE_VOTE`, `Household` | يبقى | لا يحصر في صندوق عائلة فقط. |
| تصويت المشتركين فقط | `SUBSCRIBERS_ONLY`, voters scope | يبقى | مهم للمسارات المدفوعة. |
| التصويت حسب المساهمة | `BY_CONTRIBUTION` | يبقى | advanced/high-risk. |
| التصويت السري | `SECRET` | يبقى | قرارات حساسة. |
| موافقة اللجنة | `COMMITTEE_APPROVAL` | يبقى | لجنة فقط. |
| قرار فردي بسقف | `INDIVIDUAL_WITH_CAP` | يبقى | لا يختفي بالتبسيط. |
| طوارئ ثم مراجعة | `EMERGENCY_THEN_REVIEW` | يبقى | مهم لصناديق التكافل. |
| نطاق المصوتين | `VotersScope`: all/path/committee | يبقى | يجب أن يظهر في advanced. |

مخاطر:

- لا تجعل wizard يخفي هذه الخيارات نهائيا.
- لا تجعل القالب يمنع تغيير مسار الحوكمة لاحقا إلا بقرار واضح من سياسة الصندوق.

### 7. اللجان والتمثيل

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| إنشاء لجنة | `CommitteesModule` | يبقى | مهم لصندوق التكافل والخدمات. |
| أعضاء اللجنة | `CommitteeMembership` | يبقى | صلاحيات لجنة لا تعني صلاحيات مالية عامة. |
| ربط لجنة بمسار | committees path assign/unassign | يبقى | ضروري لمسار committee. |
| الأسر/البيوت | `HouseholdsModule` | يبقى | أساس `ONE_FAMILY_ONE_VOTE`. |
| عضو واحد في أسرة واحدة داخل الصندوق | `HouseholdMembership` unique membership | يبقى | قد يعمم لاحقا إلى representation units. |

توصية لاحقة:

- ندرس تسمية user-facing أوسع من "أسرة" مثل "وحدة تمثيل" مع alias حسب profile، لكن لا نغيرها الآن.

### 8. الاشتراكات والدفعات

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| الاشتراك في مسار | `SubscriptionsModule`, `paths/:pathId/subscribe` | يبقى | post-creation. |
| حالات الاشتراك | `INTERESTED`, `CONDITIONAL`, `ACTIVE`, `SUSPENDED`, `EXITED`, `SUPPORTER_ONLY` | تبقى كلها | مهمة للعمق التشغيلي. |
| توافق الاشتراك | compatibility endpoint/service | يبقى | لا يختفي من واجهة العضو. |
| توليد المستحقات | `generate-dues` | يبقى | مهم للتمويل الدوري. |
| مستحقات العضو | payment dues endpoints | تبقى | finance/dashboard. |
| إثبات الدفع | payment records | يبقى | رفع/اعتماد/رفض/إلغاء. |
| الدفع اليدوي والبوابات | `PaymentMethod`: manual/stripe/moyasar | يبقى | التكاملات الحالية لا تتأثر. |

قاعدة حفظ:

- إنشاء صندوق بسيط لا يعني تعطيل الاشتراكات.
- "ابدأ فارغا" يستطيع تفعيل الاشتراكات لاحقا.

### 9. الدفتر المالي والتحويلات

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| حسابات دفترية | entity/wallet/path/spending/external accounts | تبقى | core financial integrity. |
| أنواع العمليات | subscription/donation/service/project/disbursement/transfer/entity support/adjustment/reversal | تبقى | لا ترتبط بتصنيف اجتماعي. |
| قيود debit/credit | `LedgerEntry` | تبقى | أساس التوازن. |
| عكس عملية | reversal endpoint | يبقى | تصحيح آمن. |
| snapshots | balance snapshots | تبقى | تقارير وتدقيق. |
| تحويلات بين مسارات | `BalanceTransferRequestsModule`, ledger transfer | تبقى | تحتاج قرار/سياسة. |
| دعم من صندوق لصندوق | `ENTITY_SUPPORT`, relationship validation | يبقى | مهم للعلاقات. |

مخاطر:

- لا تسمح القوالب بإنشاء محفظة/مسار دون ledger account.
- setup service يجب أن يمر عبر نفس آليات الدفتر أو helpers الحالية.

### 10. المستفيدون والصرف وبنود الصرف

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| المستفيدون | `BeneficiaryType`: member/dependent/external | يبقون | صندوق تكافل يعتمد عليهم. |
| المعالون كمستفيدين | `Dependent` link | يبقى | مهم للأسر والتكافل. |
| بنود الصرف | `SpendingItem` | تبقى | تصنيف الإنفاق. |
| طلب صرف | `DisbursementRequest` | يبقى | workflow مستقل. |
| اعتماد/رفض/تنفيذ طلب صرف | disbursement request statuses | تبقى | لا تختصر في wizard. |
| ربط الصرف بالقرار | decisions/ledger/disbursement | يبقى | guardrail مالي. |

قاعدة حفظ:

- "صندوق خدمات مشتركة" قد لا يبدأ بمستفيدين، لكنه يستطيع تفعيلهم لاحقا.
- "صندوق تكافل" يبدأ بمستفيدين وخصوصية أعلى.

### 11. القرارات والتنفيذ

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| أنواع القرارات | create wallet/path, disburse, subscription, governance, transfer, member, dispute, close/freeze/merge | تبقى كلها | لا تختفي خلف القوالب. |
| فتح/إغلاق/استئناف تنفيذ | decisions endpoints | تبقى | important operational flow. |
| تنفيذ القرار | execution status | يبقى | لا يخلط مع نتيجة التصويت. |
| تصويت وحفظ householdId/secret/weight | Vote model/service | يبقى | supports multiple vote models. |
| retry execution | decision retry execution | يبقى | مهم عند فشل تنفيذ مالي. |

مخاطر:

- setup الجديد لا يجب أن ينشئ قرارات تلقائية بلا حاجة.
- تغيير السياسات الثقيلة لاحقا قد يحتاج قرار حوكمي، وهذا قرار منتج لاحق.

### 12. القواعد والقوالب القانونية/التشغيلية

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| أنواع القواعد | spending limit, documents, quorum, transfer, eligibility | تبقى | core advanced control. |
| نطاق القاعدة | entity/wallet/path/spending item/membership | يبقى | يسمح بالتحكم الدقيق. |
| قوالب قواعد جاهزة | `RULE_TEMPLATES` | تبقى وتتوسع | حاليا تركز على الاعتراضات والنزاعات. |
| تقييم قواعد الصرف | `evaluateSpendingRules` | يبقى | documents/limits. |
| تقييم الاشتراك | `evaluateSubscriptionRules` | يبقى | eligibility/path types. |
| تقييم القرار | `evaluateDecisionRules` | يبقى | quorum/vote/decision types. |
| تقييم التحويل | `evaluateTransferRules` | يبقى | transfer policy. |
| تقييم الاعتراض/النزاع/العلاقات | multiple evaluate methods | تبقى | مهمة للحوكمة. |
| واجهة RuleDesigner | frontend governance component | تبقى advanced | لا تعرض raw JSON للمستخدم العادي. |

فجوات:

- rule templates الحالية قليلة، وليست هي نفسها fund setup templates.
- `RuleDesigner` يعرض `UNANIMOUS` في allowed vote types رغم عدم وجوده في `VoteType`.

### 13. الاعتراضات والنزاعات

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| أنواع الاعتراض | clarification/appeal/review/escalation/dispute/policy/legal | تبقى | لا تختصر. |
| حالات الاعتراض | open/under review/closed/escalated | تبقى | workflow مهم. |
| أنواع النزاع | financial/governance/member/policy/unfair/transparency/legal | تبقى | مهمة للثقة. |
| حالة النزاع | open/mediation/escalated/resolved/closed | تبقى | لا تظهر في إنشاء الصندوق. |
| ربط النزاع/الاعتراض بالقرارات والطلبات | services/controllers | يبقى | مهم للتدقيق. |

قاعدة حفظ:

- كل قالب يجب أن يسمح بالاعتراضات إلا إذا قرر المؤسس لاحقا تعطيلها ضمن سياسة واضحة.

### 14. العلاقات بين الصناديق والمحافظ

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| تداخل عضوية | `MEMBERSHIP_OVERLAP` | يبقى | مهم لمستخدم متعدد الصناديق. |
| دعم مالي | `FINANCIAL_SUPPORT` | يبقى | صندوق يدعم صندوق آخر. |
| محفظة مشتركة | `SHARED_WALLET` | يبقى | لا يختلط مع `WalletBenefitType.SHARED`. |
| تفويض إدارة | `MANAGEMENT_DELEGATION` | يبقى | مهم مستقبلا للإدارة. |
| دمج | `MERGER` | يبقى | advanced. |
| تمويل بلا تصويت | `CONTRIBUTION_NO_VOTE` | يبقى | supporter/oversight cases. |
| تمويل مع رقابة | `CONTRIBUTION_WITH_OVERSIGHT` | يبقى | مهم للشفافية. |
| مشاركة تقارير | `REPORT_SHARING` | يبقى | تقارير فقط. |
| علاقات محافظ | shared/support/report-only | تبقى | wallet-level relationships. |

مخاطر:

- لا تجعل "صندوق خدمات مشتركة" هو المسار الوحيد للمنفعة المشتركة.
- لا تجعل العلاقات تظهر في wizard الأول؛ مكانها advanced/relationships.

### 15. الوثائق والإشعارات والبحث

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| الوثائق | `DocumentsModule`, privacy level | تبقى | مهمة للصرف والاعتراضات. |
| الإشعارات | `NotificationsModule`, notification matrix | تبقى | vote/payment/appeal/policy/campaign/disbursement. |
| push subscriptions | notification subscribe/unsubscribe | تبقى | لا تتأثر بالواجهة الجديدة. |
| البحث | `SearchModule`, frontend global search | يبقى | labels تتحول إلى صندوق/حملة. |
| دعوات الانضمام | invitation preview/join | تبقى | preview يجب أن يقول صندوق/حملة لا كيان. |

### 16. الرقابة والتحليلات وسطح العمل

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| صحة الصندوق | `analytics/fund-health` | تبقى | المصطلح مناسب. |
| صحة كيان/صندوق معين | `analytics/entities/:entityId/health` | يبقى API داخلي، UI يسميه صندوق | لا ضرورة لتغيير route في البداية. |
| auditor overview/report/logs | `AuditorModule` | يبقى | مهم للتدقيق. |
| work surface | `WorkSurfaceModule` | يبقى | يجب تحديث labels لا القدرات. |
| platform surface | `PlatformSurfaceModule` | يبقى | platform/admin قد يرى entity internally. |
| platform suspension/read-only/pending review | `PlatformEntitiesModule`, guards | يبقى | لا يختفي بالتجربة الجديدة. |
| support sessions | `SupportModule` | تبقى | دعم منصة مقيد ومؤرخ. |

فجوة مهمة:

- `WorkSurfaceService.buildContexts` يحدد `SHARED_BENEFIT` عندما `entity.type === 'BUILDING'`.
- هذا يجب أن ينتقل إلى إشارات تشغيلية مثل وجود محفظة `WalletBenefitType.SHARED` أو template/profile metadata.

### 17. المنصة، الحماية، والحالة التشغيلية

| القدرة الحالية | المصدر الحالي | قاعدة الحفظ | ملاحظات |
|---|---|---|---|
| حالة المنصة للصندوق | `ACTIVE`, `SUSPENDED`, `READ_ONLY`, `PENDING_REVIEW` | تبقى | تؤثر على الأفعال والسطح. |
| حارس التعليق | `SuspendedEntityGuard` | يبقى | لا يضعف مع routes جديدة. |
| platform access logs | `PlatformAccessLogModule` | يبقى | دعم/دخول منصة. |
| appeals على تعليق المنصة | platform appeals | تبقى | لا تخلط مع appeals العادية. |

## خريطة الواجهة الحالية

الصفحات الرئيسية الموجودة تحت `frontend/src/app/(main)`:

- `dashboard`
- `portal`
- `entities`
- `wallets`
- `paths`
- `subscriptions`
- `finance`
- `decisions`
- `disbursement-requests`
- `disbursements`
- `beneficiaries`
- `committees`
- `documents`
- `disputes`
- `rules`
- `auditor`
- `analytics`
- `health`
- `notifications`
- `review-center`
- `profile`

قاعدة الحفظ:

- تجربة الصندوق الجديدة لا تلغي هذه الصفحات.
- يتم تغيير المصطلحات والمسارات الظاهرة تدريجيا.
- صفحات advanced تبقى للمؤسس أو المفوض أو الدور المناسب.

## Coverage and Test Anchors

ملفات التغطية الحالية التي يجب الاستفادة منها:

| النوع | الملفات |
|---|---|
| Seed stories | `backend/prisma/seed-stories.ts` |
| Seed validation | `backend/prisma/seed-validate.ts`, `backend/prisma/seed-audit.ts` |
| UX role audit | `frontend/scripts/ux-role-audit.spec.cjs` |
| Decisions tests | `backend/src/decisions/decisions.service.spec.ts` |
| Rules tests | `backend/src/rules/rules.service.spec.ts`, `frontend/src/app/(main)/rules/page.test.tsx` |
| Ledger tests | `backend/src/ledger/ledger.service.spec.ts`, `backend/src/ledger/financial-boundaries.spec.ts` |
| Subscriptions tests | `backend/src/subscriptions/subscriptions.service.spec.ts` |
| Disbursement tests | `backend/src/disbursement-requests/disbursement-requests.service.spec.ts` |
| Wallet tests | `backend/src/wallets/wallets.service.spec.ts` |
| Transfer tests | `backend/src/balance-transfer-requests/balance-transfer-requests.service.spec.ts` |
| Auditor tests | `backend/src/auditor/auditor.service.spec.ts` |
| Auth/invitations/applications tests | `backend/src/identity/auth`, `backend/src/invitations`, `backend/src/membership-applications` specs |
| Search tests | `backend/src/search/search.service.spec.ts` |

Backlog rule:

- كل قالب setup جديد يحتاج اختبار إنشاء + اختبار وصول للقدرات الأساسية بعد الإنشاء.

## Gaps Found During Audit

هذه ليست كلها bugs منفصلة، لكنها مخاطر يجب حلها قبل أو أثناء بناء التجربة الجديدة:

المرجع التفصيلي للفجوات هو `03_PREFLIGHT_GAPS_AND_COMPATIBILITY_AUDIT.md`. البنود المرتبطة بالعقود والقيم تحولت إلى `04_PHASE_A_PREFLIGHT_BACKLOG.md`.

1. **Create contract drift**
   - frontend يرسل `defaultGovernanceType` و`allowMultiplePaths`.
   - `CreateEntityDto` لا يقبل هذه الحقول.
   - مع `ValidationPipe` و`forbidNonWhitelisted`، هذا مرشح للفشل.
   - الحل: setup endpoint جديد أو توسيع DTO بشكل مقصود.

2. **Frontend-only `FRIENDS` type**
   - الواجهة تعرض `FRIENDS`.
   - `EntityType` لا يحتوي `FRIENDS`.
   - الحل: social `profileKey` اختياري، وليس `EntityType`.

3. **Vote type mismatch in UI**
   - `PolicyBuilder` و`RuleDesigner` يعرضان `UNANIMOUS` و`WEIGHTED/UNANIMOUS`.
   - schema لا يحتوي هذه القيم.
   - الحل: توحيد واجهة التصويت مع `VoteType` أو إضافة values بقرار منتج لاحق.

4. **Shared benefit currently tied partly to building**
   - Work surface يصنف `BUILDING` كـ `SHARED_BENEFIT`.
   - السلوك الصحيح يجب أن يستند إلى `WalletBenefitType.SHARED` أو template metadata.

5. **Advanced settings delegation not modeled**
   - المؤسس يستطيع الإدارة، admin غالبا يستطيع، لكن لا يوجد permission مستقل مثل `MANAGE_ADVANCED_SETTINGS`.
   - الحل: إضافة إذن/صلاحية مستقلة لاحقا.

6. **Setup templates and rule templates are different concepts**
   - `EntityTemplate` ينشئ سياسة/محافظ/مسارات.
   - `RULE_TEMPLATES` ينشئ قواعد تشغيلية.
   - يجب ألا نخلطهما في UX أو backend.

7. **Start empty needs setup map**
   - إنشاء صندوق بدون template قد ينتج صندوقا بلا محافظ/مسارات.
   - هذا مقبول فقط إذا ظهرت خريطة إعداد بعد الإنشاء.

8. **Potential ambiguity in `allowedGovernanceTypes` default**
   - الحقل ليس له default واضح في schema.
   - setup service يجب أن يكتب قيمة صريحة.

## Required Preservation Checks Before Retiring Legacy Flow

قبل جعل تجربة الصندوق الجديدة هي default الوحيد، يجب إثبات الآتي:

1. يمكن إنشاء صندوق من كل قالب.
2. يمكن لكل صندوق إضافة محفظة جديدة.
3. يمكن لكل صندوق إضافة مسار حوكمة جديد، حسب سياسة الصندوق.
4. يمكن تغيير/عرض سياسة الصندوق مع impact preview.
5. يمكن استخدام كل `GovernancePathType` الحالي.
6. يمكن استخدام كل `VoteType` الحالي من advanced settings أو API.
7. يمكن إنشاء لجنة وربطها بمسار.
8. يمكن إنشاء households واستخدام `ONE_FAMILY_ONE_VOTE`.
9. يمكن إنشاء اشتراك، توليد مستحق، ورفع إثبات دفع.
10. يمكن اعتماد/رفض/إلغاء إثبات الدفع.
11. يمكن إنشاء مستفيد عضو/معال/خارجي.
12. يمكن إنشاء بند صرف وطلب صرف.
13. يمكن إنشاء قرار صرف وتنفيذه عبر الدفتر.
14. يمكن فتح اعتراض ونزاع.
15. يمكن إنشاء قاعدة تشغيلية وتطبيقها.
16. يمكن إنشاء علاقة بين صندوقين وعلاقة بين محفظتين.
17. يمكن تنفيذ دعم مالي أو تحويل مرخص.
18. يمكن إنشاء حملة وأرشفتها يدويا أو تلقائيا.
19. تظهر الإشعارات المناسبة.
20. يعمل البحث والسطح والتدقيق وصحة الصندوق.
21. تبقى platform suspension/read-only/pending-review فعالة.
22. لا تظهر كلمة "كيان" للمستخدم العادي في المسار الجديد.

## Backlog Slices Recommended From This Audit

هذه الشرائح تحولت إلى ترتيب 09 الحالي:

| الشريحة | الوثيقة التنفيذية أو المرجعية |
|---|---|
| Slice A: Language and Contract Safety | يبدأ منها `04_PHASE_A_PREFLIGHT_BACKLOG.md`، ثم تستكمل لغة الواجهة في Phase E |
| Slice B: Setup Endpoint | بعد Phase A، ضمن تنفيذ تجربة الصندوق |
| Slice C: Operational Templates | بعد تطبيع القوالب في فجوات `PG-008` إلى `PG-010` |
| Slice D: Shared Benefit Decoupling | قبل جعل المسار الجديد default |
| Slice E: Advanced Settings Permission | قبل نقل الإعدادات المتقدمة للمستخدم أو المفوض |
| Slice F: Parity Test Pack | شرط قبل تقاعد legacy flow |

### Slice A: Language and Contract Safety

- استبدال user-facing "كيان" بـ "صندوق" في الواجهة العادية.
- عدم تغيير DB.
- إصلاح أو تجميد create wizard القديم إذا كان يرسل حقولا غير مقبولة.
- توثيق legacy/internal wording.

### Slice B: Setup Endpoint

- إنشاء setup DTO جديد.
- إنشاء service يترجم templateKey إلى existing models.
- كتابة defaults صريحة للسياسات.
- تسجيل audit log.
- إبقاء `EntitiesService.createEntity` كمسار منخفض المستوى.

### Slice C: Operational Templates

- `CUSTOM_FUND`
- `MUTUAL_AID_FUND`
- `SHARED_SERVICES_FUND`
- `EMPTY_FUND`
- `CAMPAIGN`

كل قالب يجب أن يكون نقطة بداية قابلة للتوسع.

### Slice D: Shared Benefit Decoupling

- نقل أي تصنيف `BUILDING -> SHARED_BENEFIT` إلى منطق يعتمد على `WalletBenefitType.SHARED` أو setup metadata.
- الحفاظ على fallback للبيانات القديمة.

### Slice E: Advanced Settings Permission

- تصميم وإضافة إذن `MANAGE_ADVANCED_SETTINGS` أو بديل مناسب.
- فصله عن treasurer/auditor/committee roles.
- إضافة audit logs.

### Slice F: Parity Test Pack

- tests لكل قالب.
- tests لإضافة capabilities بعد الإنشاء.
- update UX role audit بعد استقرار التسميات.

## القرار العملي من الأوديت

يمكن تنفيذ تجربة الصندوق الجديدة بأمان إذا التزمنا بهذه القاعدة:

> المسار الجديد ينشئ إعدادات أولية فقط. لا يحدد سقف قدرات الصندوق.

أي صندوق، بغض النظر عن قالب البداية، يجب أن يستطيع لاحقا الوصول إلى كل القدرات التشغيلية الحالية إذا امتلك المؤسس أو المفوض الصلاحية المناسبة.
