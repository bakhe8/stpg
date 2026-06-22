# المعمارية العامة (System Architecture)

## الوصف التقني المختصر
نظام متعدد الكيانات يدير محافظ اجتماعية قابلة للتخصيص، ويدعم مسارات حوكمة متعددة داخل المحفظة الواحدة، ويربط حقوق العضو والتزاماته بدرجة توافق شروطه مع خصائص الكيان والمحفظة والمسار وبند الصرف، مع دفتر مالي مستقل لكل مسار، وتصويت ومراجعة واعتراض وسجل تدقيق وشفافية قابلة للضبط.

## التصنيف المعماري
```
Rule-Based Multi-Entity Governance Platform
منصة حوكمة مرنة مبنية على القواعد والعلاقات والمسارات
```

النظام ليس CRUD عادياً، بل مبني على **محرك قواعد** يفهم خصائص العضو، الكيان، المحفظة، المسار، بند الصرف، والعلاقات بينها.

---

## طبقات النظام

> النظام يعمل على محورين: **Platform Layer** (القائمون على المنصة) و**Tenant Layer** (مستخدمو الكيانات).
> للاستراتيجية الكاملة لهذا الفصل: [platform_vs_tenant_roles.md](../05_Rules_and_Governance/platform_vs_tenant_roles.md)

### الطبقة 0: المنصة (Platform Layer) — فوق كل الطبقات

| المكوّن | الدور |
|---|---|
| `PlatformAccount` | حسابات القائمين على المنصة (مالك، مشرف، دعم، محلل) |
| `PlatformRole` | أدوار المنصة: owner / super_admin / support / analyst |
| `PlatformAccessLog` | سجل كل وصول من المنصة لبيانات أي كيان — مرئي لمدير الكيان |
| `PlatformSubscription` | اشتراك الكيان في المنصة (الخطة والحدود) |

> قاعدة بيانات MVP: جداول Platform منفصلة منطقياً في نفس PostgreSQL — لا `entity_id` فيها.

---

## الطبقات الخمس للنظام (Tenant Layer)

### الطبقة 1: الهوية والعضويات (Identity & Membership)
تدير الأشخاص والانتماءات.

| المكون | الدور |
|---|---|
| `Person` | الشخص الحقيقي — حساب واحد لكل إنسان |
| `Membership` | عضويته داخل كيان معين (الشخص قد يملك عدة عضويات) |
| `MemberProfile` | بيانات العضو الشخصية |
| `MemberPreferences` | تفضيلات وشروط العضو |
| `Dependents` | المعالون التابعون للعضو |
| `Roles` | الأدوار داخل الكيان (مدير، عضو، مراجع) |

### الطبقة 2: الكيانات (Entities)
تدير الجماعات وسياساتها.

| المكون | الدور |
|---|---|
| `Entity` | الكيان نفسه (عائلة، عمارة، حي) |
| `EntityType` | نوع الكيان |
| `EntityPolicy` | سياسات الكيان (قبول العضوية، الشفافية، التصويت) |
| `EntityRoles` | الأدوار المتاحة في الكيان |
| `EntityGovernanceRules` | قواعد الحوكمة العامة للكيان |

### الطبقة 3: المحافظ (Wallets)
تدير الأغراض المالية.

| المكون | الدور |
|---|---|
| `Wallet` | المحفظة — الوعاء المالي لهدف محدد |
| `WalletPolicy` | سياسات المحفظة |
| `WalletEligibility` | قواعد الأهلية للاشتراك والاستفادة |
| `WalletContributionRule` | قواعد الاشتراك والدفع |
| `WalletTransparencyRule` | قواعد الشفافية |
| `WalletExitRule` | قواعد الانسحاب |

### الطبقة 4: مسارات الحوكمة (Governance Paths)
أهم طبقة في النظام — تفصل طريقة الثقة داخل المحفظة.

| المكون | الدور |
|---|---|
| `GovernancePath` | المسار نفسه (مجلس إدارة، قرار فردي، تصويت عام) |
| `PathPolicy` | سياسات المسار |
| `PathMembers` | المشتركون في المسار |
| `PathLedger` | الرصيد الدفتري المستقل للمسار |
| `PathDecisionRules` | قواعد اتخاذ القرار |
| `PathAppealRules` | قواعد الاعتراض |

> كل مسار مستقل مالياً وقرارياً. لا يجوز لمسار الصرف من مال مسار آخر بدون إجراء رسمي.

### الطبقة 5: بنود الصرف (Spending Items)
تفاصيل أوجه الصرف.

| المكون | الدور |
|---|---|
| `SpendingItem` | البند (علاج عاجل، حارس، صيانة) |
| `SpendingItemPolicy` | سياسات البند |
| `RequiredDocuments` | المستندات المطلوبة |
| `ApprovalRule` | قواعد الموافقة |
| `PrivacyLevel` | مستوى الخصوصية |
| `SpendingLimit` | سقف الصرف |
| `ExceptionRule` | قواعد الاستثناء |

---

## كيف تترابط الطبقات — مثال واقعي

```
محمد (Person)
├── عضوية في كيان العائلة (Membership)
│   └── محفظة الطوارئ (Wallet)
│       ├── مسار مجلس الإدارة (GovernancePath) ← مشترك فعال
│       │   ├── رصيده: 500 ريال
│       │   └── بنود: علاج عاجل، وفاة
│       └── مسار القرار الفردي (GovernancePath) ← غير مشترك
│
└── عضوية في كيان العمارة (Membership)
    └── محفظة الخدمات (Wallet)
        └── بنود: حارس، صيانة مصعد
```

---

## مطابقة المفاهيم للتقنية

| ما ناقشناه | التقنية التي تضمنه |
|---|---|
| تعدد الكيانات | Entity + Membership |
| عضو في أكثر من كيان | Multi-Membership |
| محفظة داخل كيان | Wallet |
| أكثر من حوكمة داخل محفظة | Governance Paths |
| بنود صرف متعددة | Spending Items |
| شروط العضو | Member Preferences |
| توافق العضو مع المسار | Compatibility Engine |
| لا دفع بلا توافق | Subscription State Machine |
| لا استفادة بلا دفع وشروط | Eligibility Engine |
| علاقات بين كيانات | Entity Relationship Engine |
| محفظة مشتركة | Shared Wallet Model |
| دعم من كيان لآخر | Inter-Entity Contribution |
| تصويت متعدد الأنواع | Decision & Voting Engine |
| الاعتراض والمساءلة | Appeal Engine |
| الشفافية | Transparency Engine |
| الخصوصية | Privacy Rules |
| منع خلط الأموال | Ledger Segmentation |
| منع الحذف والتلاعب | Audit Trail |
| تحليل المطلوب والمرفوض | Analytics Engine |
| عدم إغراق المستخدم | Progressive UI + Templates |

> لتفاصيل كل محرك، انظر: [core_engines.md](core_engines.md)
>
> لبنية الوحدات البرمجية، انظر: [modular_design.md](modular_design.md)
>
> للاستاك التقني والتكلفة، انظر: [stack_and_cost.md](stack_and_cost.md)
