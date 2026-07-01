# CollectiveTrustOS — توثيق المشروع

> **نظام تشغيل للثقة الجماعية**
> منصة حوكمة مرنة للصناديق الاجتماعية

**الحالة الحالية:** الإصدار التشغيلي `2.15` بتاريخ 2026-07-01.
مرجع الحالة الحالي: [REPOSITORY_STATE.md](REPOSITORY_STATE.md).  
سجل الإصدارات: [RELEASE_NOTES.md](RELEASE_NOTES.md).

---

## هيكل التوثيق

### 📋 [01_Overview](01_Overview/) — الرؤية والمفاهيم
| الوثيقة | الوصف |
|---|---|
| [vision.md](01_Overview/vision.md) | رؤية المشروع والمشكلة التي يحلها والمبادئ التأسيسية |
| [core_concepts.md](01_Overview/core_concepts.md) | المفاهيم الستة الأساسية: أشخاص، كيانات، محافظ، مسارات، بنود، علاقات |
| [unit_types_and_hierarchy.md](01_Overview/unit_types_and_hierarchy.md) | أنواع الوحدات والهرمية (كيان، كيان فرعي، محفظة، مسار، حملة، بند) |
| [separable_vs_shared_benefit_units.md](01_Overview/separable_vs_shared_benefit_units.md) | التفريق بين المصالح القابلة للفصل والمصالح المشتركة |
| [implementation_phases.md](01_Overview/implementation_phases.md) | مراحل التنفيذ الأربع: الأساس → الحوكمة → العلاقات → الذكاء |

---

### 🏗️ [02_Architecture](02_Architecture/) — المعمارية والتصميم
| الوثيقة | الوصف |
|---|---|
| [system_architecture.md](02_Architecture/system_architecture.md) | المعمارية العامة: الطبقات الخمس وكيف تترابط |
| [core_engines.md](02_Architecture/core_engines.md) | المحركات الثمانية: التوافق، القواعد، العلاقات، القرارات، الصلاحيات، الشفافية، النزاعات، التحليل |
| [modular_design.md](02_Architecture/modular_design.md) | البنية البرمجية: Modular Monolith، بنية المجلدات، API، محرك القواعد |
| [stack_and_cost.md](02_Architecture/stack_and_cost.md) | الاستاك التقني والتكلفة الاقتصادية |
| [entity_relationship_scenarios.md](02_Architecture/entity_relationship_scenarios.md) | 5 سيناريوهات واقعية لعلاقة العائلة والعمارة |

---

### 💾 [03_Data_Model](03_Data_Model/) — نموذج البيانات
| الوثيقة | الوصف |
|---|---|
| [database_schema.md](03_Data_Model/database_schema.md) | مخطط قاعدة البيانات: 7 مجموعات جداول وعلاقاتها |
| [financial_ledger.md](03_Data_Model/financial_ledger.md) | الدفتر المالي: محاسبة مزدوجة، قواعد حاكمة، سجل تدقيق |
| [money_types.md](03_Data_Model/money_types.md) | 6 أنواع للأموال: اشتراك، تبرع، رسم خدمات، مساهمة مشروع، دعم كيان، تبرع لحالة |

---

### 🖥️ [04_User_Interfaces](04_User_Interfaces/) — واجهات المستخدم
| الوثيقة | الوصف |
|---|---|
| [member_portal.md](04_User_Interfaces/member_portal.md) | بوابة العضو: 9 شاشات + نموذج حالة العضو |
| [admin_dashboard.md](04_User_Interfaces/admin_dashboard.md) | لوحة تحكم المؤسس والمدير: معالج الإنشاء و7 أقسام إدارية |
| [auditor_view.md](04_User_Interfaces/auditor_view.md) | واجهة المراجع: 8 شاشات للتدقيق والرقابة |
| [fund_health_center.md](04_User_Interfaces/fund_health_center.md) | مركز صحة الصندوق: 7 مؤشرات إنذار مبكر |

---

### ⚖️ [05_Rules_and_Governance](05_Rules_and_Governance/) — القواعد والحوكمة
| الوثيقة | الوصف |
|---|---|
| [**platform_vs_tenant_roles.md ⭐**](05_Rules_and_Governance/platform_vs_tenant_roles.md) | **وثيقة استراتيجية:** طبقتا المستخدمين — القائمون على المنصة مقابل مستخدمو الكيان. مرجع لكل قرار في الصلاحيات والواجهة وقاعدة البيانات |
| [governance_paths_and_voting.md](05_Rules_and_Governance/governance_paths_and_voting.md) | القرارات والتصويت: 10 أنواع تصويت، نموذج القرار |
| [governance_path_isolation_rules.md](05_Rules_and_Governance/governance_path_isolation_rules.md) | القاعدة الذهبية للعزل بين مسارات الحوكمة |
| [access_control_and_privacy.md](05_Rules_and_Governance/access_control_and_privacy.md) | الصلاحيات والشفافية والخصوصية: PBAC، 6 مستويات ظهور — داخل الكيان |
| [member_participation_contract.md](05_Rules_and_Governance/member_participation_contract.md) | عقد مشاركة العضو: Snapshotting، Policy Versioning |
| [dispute_management.md](05_Rules_and_Governance/dispute_management.md) | إدارة الاعتراضات والنزاعات: 7 أنواع، دورة حياة كاملة |

---

### 📁 [Archive](Archive/) — الأرشيف
| الملف | الوصف |
|---|---|
| [idea.md](Archive/idea.md) | الحوار الأصلي الذي وُلدت منه فكرة المشروع |

---

### 🚦 [08_Production_Readiness](08_Production_Readiness/) — جاهزية الإنتاج
| الوثيقة | الوصف |
|---|---|
| [Deployment_Decisions.md](08_Production_Readiness/Deployment_Decisions.md) | قرار الاستضافة والتشغيل والنسخ الاحتياطي للإنتاج |
| [BUSINESS_LOGIC_AUDIT_ACTION_PLAN.md](08_Production_Readiness/BUSINESS_LOGIC_AUDIT_ACTION_PLAN.md) | تقرير تنفيذ تدقيق منطق العمل — النسخة الأولى |
| [AUDIT_REPORT_v2.md](08_Production_Readiness/AUDIT_REPORT_v2.md) | تقرير تدقيق تاريخي بتاريخ 2026-06-29؛ superseded عند التعارض |
| [**BACKLOG.md ⭐**](08_Production_Readiness/BACKLOG.md) | **مرجع الإغلاق الحالي:** 42 مهمة مغلقة كـ `Fixed / Verified` أو `Verified` |

---

### 🧭 [09_Improvement](09_Improvement/) — تحسين تجربة الصندوق
| الوثيقة | الوصف |
|---|---|
| [00_README.md](09_Improvement/00_README.md) | فهرس حالة 09 وترتيب القراءة والتنفيذ |
| [01_FUND_EXPERIENCE_TRANSITION_PLAN.md](09_Improvement/01_FUND_EXPERIENCE_TRANSITION_PLAN.md) | الخطة الرئيسية لتحويل واجهة المستخدم إلى صندوق / حملة |
| [02_CAPABILITY_PRESERVATION_AUDIT.md](09_Improvement/02_CAPABILITY_PRESERVATION_AUDIT.md) | جرد القدرات التي يجب حفظها بعد التبسيط |
| [03_PREFLIGHT_GAPS_AND_COMPATIBILITY_AUDIT.md](09_Improvement/03_PREFLIGHT_GAPS_AND_COMPATIBILITY_AUDIT.md) | فجوات ما قبل التنفيذ ومخاطر التوافق |
| [04_PHASE_A_PREFLIGHT_BACKLOG.md](09_Improvement/04_PHASE_A_PREFLIGHT_BACKLOG.md) | أول backlog تنفيذي بعد إغلاق 08 |
| [05_PHASE_B_TEMPLATE_NORMALIZATION.md](09_Improvement/05_PHASE_B_TEMPLATE_NORMALIZATION.md) | تطبيع القوالب وتطبيقها التشغيلي |
| [06_PHASE_C_PROFILE_AND_ADVANCED_SETTINGS.md](09_Improvement/06_PHASE_C_PROFILE_AND_ADVANCED_SETTINGS.md) | مصدر profile الاختياري وتفويض الإعدادات المتقدمة |
| [07_PHASE_D_PARALLEL_CREATE_FLOW.md](09_Improvement/07_PHASE_D_PARALLEL_CREATE_FLOW.md) | المسار الموازي لإنشاء صندوق/حملة خلف feature flag |
| [08_PHASE_D_PARITY_PACK.md](09_Improvement/08_PHASE_D_PARITY_PACK.md) | حزمة parity قبل جعل المسار الجديد default |
| [09_PHASE_D_UX_SMOKE_TESTS.md](09_Improvement/09_PHASE_D_UX_SMOKE_TESTS.md) | اختبار دخان واجهي للعلمين قبل قرار default switch |
| [10_PHASE_D_DEFAULT_SWITCH.md](09_Improvement/10_PHASE_D_DEFAULT_SWITCH.md) | قرار جعل مسار صندوق/حملة default مع rollback للنموذج القديم |
| [11_PHASE_E_UI_TERMINOLOGY_CLEANUP.md](09_Improvement/11_PHASE_E_UI_TERMINOLOGY_CLEANUP.md) | تنظيف لغة الواجهة من "كيان" إلى صندوق/حملة بدون تغيير الباكند |

---

### 👩‍💻 للمطوّرين — ابدأ هنا

| الملف | الوصف |
|---|---|
| [**../CONTRIBUTING.md ⭐**](../CONTRIBUTING.md) | **دليل المطوّر:** إعداد البيئة + هيكل المشروع + كيف تختار مهمتك |
| [REPOSITORY_STATE.md](REPOSITORY_STATE.md) | الحالة التشغيلية الحالية ونقطة البداية قبل 09 |
| [RELEASE_NOTES.md](RELEASE_NOTES.md) | سجل الإصدارات التشغيلية للمستودع |
| [08_Production_Readiness/BACKLOG.md](08_Production_Readiness/BACKLOG.md) | مرجع إغلاق 08 |
| [09_Improvement/11_PHASE_E_UI_TERMINOLOGY_CLEANUP.md](09_Improvement/11_PHASE_E_UI_TERMINOLOGY_CLEANUP.md) | backlog الحالي بعد default switch |

---

## الاستاك التقني

| الطبقة | التقنية |
|---|---|
| Frontend Web | Next.js 16 (App Router) + TypeScript |
| Mobile | مؤجل — Responsive Web App أولاً |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Queue/Cache | Redis + BullMQ (اختياري عبر `ENABLE_QUEUES`) |
| Deploy | Docker Compose |

> للتفاصيل الكاملة، انظر: [stack_and_cost.md](02_Architecture/stack_and_cost.md)

---

## حالة التنفيذ الحالية (1 يوليو 2026)

| المكوّن | الحالة |
|---|---|
| Production Readiness 08 | مغلق حسب `BACKLOG.md` v2.1 |
| Backlog 08 | كل البنود `BL-001` إلى `BL-042` مغلقة كـ `Fixed / Verified` أو `Verified` |
| Audit Report v2 | مرجع تاريخي، وليس حالة المشروع الحالية عند التعارض |
| Improvement 09 | Phase A وB وC منفذة؛ Phase D أغلقت default switch في D-011؛ Phase E أغلقت E-001 إلى E-006 |
| أول عمل مفتوح | لا يوجد بند مفتوح داخل Phase E |
| قاعدة التنفيذ | مسار صندوق/حملة هو default؛ `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=false` rollback مؤقت |

> للتفصيل الحالي: [REPOSITORY_STATE.md](REPOSITORY_STATE.md)

---

## القواعد الذهبية

**داخل الكيان:**
> الحقوق والالتزامات لا تُبنى على وجود العضو في الكيان فقط، بل على اشتراكه الفعّال في المسار المناسب داخل المحفظة المناسبة.

```
العضو ← كيان ← محفظة ← مسار ← اشتراك فعّال ← حقوق والتزامات
```

**بين المنصة والكيان:**
> القائم على المنصة لا يعدّل سجلاً مالياً داخل أي كيان. مستخدم الكيان لا يرى كياناً آخر ولا بنية المنصة.

```
Platform Layer  ──[read-only + logged]──►  Tenant Layer
Tenant Layer    ──[no access]────────────►  Platform Layer
```

> للتفصيل: [platform_vs_tenant_roles.md](05_Rules_and_Governance/platform_vs_tenant_roles.md)
