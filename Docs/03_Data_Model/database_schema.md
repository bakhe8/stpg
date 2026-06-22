# مخطط قاعدة البيانات (Database Schema)

## المبدأ العام
قاعدة البيانات هي **المصدر الحقيقي** لكل شيء. كل عملية مهمة تمر من Backend وتُسجل في قاعدة البيانات. لا تعتمد على الواجهة لتطبيق القواعد المالية.

## قاعدة البيانات المختارة
**PostgreSQL** — لأن العلاقات والمال والتدقيق تحتاج صرامة. يدعم:
- معاملات ACID
- Row-Level Security للصلاحيات
- JSONB للسياسات المرنة
- Full Text Search للبحث

---

## الجداول الأساسية

### مجموعة 1: الهوية والعضويات
```sql
persons              -- الأشخاص الحقيقيون
memberships          -- العضويات (شخص ↔ كيان)
member_preferences   -- تفضيلات وشروط كل عضو
```

### مجموعة 2: الكيانات
```sql
entities             -- الكيانات (عائلة، عمارة، حي)
entity_types         -- أنواع الكيانات
entity_policies      -- سياسات الكيان (دستوره)
entity_roles         -- الأدوار المتاحة
```

### مجموعة 3: المحافظ والحوكمة
```sql
wallets              -- المحافظ المالية
wallet_policies      -- سياسات المحفظة
governance_paths     -- مسارات الحوكمة
path_policies        -- سياسات المسار
spending_items       -- بنود الصرف
subscriptions        -- اشتراكات الأعضاء في المسارات
```

### مجموعة 4: العلاقات
```sql
entity_relationships -- العلاقات بين الكيانات
wallet_relationships -- العلاقات بين المحافظ (مشتركة، دعم)
```

### مجموعة 5: القرارات والتصويت
```sql
decisions            -- القرارات المطروحة
votes                -- أصوات الأعضاء
appeals              -- الاعتراضات
disputes             -- النزاعات
```

### مجموعة 6: الدفتر المالي
```sql
ledger_accounts      -- حسابات دفترية (لكل كيان/محفظة/مسار/بند)
ledger_transactions  -- العمليات المالية
ledger_entries       -- قيود الحسابات (مدين/دائن)
balance_snapshots    -- لقطات الأرصدة
```

### مجموعة 7: الدعم والتدقيق
```sql
documents            -- المرفقات والمستندات
audit_logs           -- سجل التدقيق (غير قابل للحذف)
notifications        -- الإشعارات
policies             -- السياسات العامة
policy_versions      -- النسخ التاريخية للسياسات
rules                -- القواعد القابلة للتكوين
```

---

## العلاقات الرئيسية

```
persons ──1:N──→ memberships ──N:1──→ entities
                                        │
                                    1:N │
                                        ↓
                                     wallets
                                        │
                                    1:N │
                                        ↓
                                governance_paths ──1:N──→ subscriptions ──N:1──→ memberships
                                        │
                                    1:N │
                                        ↓
                                 spending_items
```

---

## مرونة السياسات

بسبب تنوع السياسات والقواعد، نستخدم أحد الأسلوبين:

### الأسلوب 1: أعمدة JSONB
```sql
ALTER TABLE entities ADD COLUMN governance_rules JSONB;
ALTER TABLE wallets ADD COLUMN contribution_rules JSONB;
ALTER TABLE governance_paths ADD COLUMN decision_rules JSONB;
```

### الأسلوب 2: جداول Policy/Rule منظمة
```sql
CREATE TABLE policies (
  id UUID PRIMARY KEY,
  target_type VARCHAR(50),   -- 'entity', 'wallet', 'path', 'item'
  target_id UUID,
  policy_type VARCHAR(100),
  policy_data JSONB,
  version INT,
  created_at TIMESTAMP
);
```

**التوصية:** مزيج بين الاثنين — JSONB للسياسات البسيطة، وجداول منظمة للقواعد المعقدة التي تحتاج استعلامات.

> لتفاصيل الدفتر المالي، انظر: [financial_ledger.md](financial_ledger.md)
>
> لأنواع الأموال، انظر: [money_types.md](money_types.md)
