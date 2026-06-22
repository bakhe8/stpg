# Open Technical Decisions

> هذا الملف يوثّق القرارات التقنية المفتوحة للمشروع — ما تم اتخاذه وما تم تأجيله ولماذا.
> آخر تحديث: 21 يونيو 2026

---

## ملخص القرارات

| القرار | الحالة الحالية | ما تبقى |
| القرار | الحالة الحالية | ما تبقى |
|---|---|---|
| المصادقة | ✅ JWT + تجهيز OAuth + إشعارات التطبيق (Push) | الربط النهائي لمعرفات OAuth |
| مزود SMS | ❌ أُلغي الاعتماد على SMS تماماً | لا شيء — تم استبداله بـ Push Notifications |
| الدفع | ✅ ميسر (Moyasar) مجهز بالكامل برمجياً | الربط الفعلي للـ API Keys في الإنتاج |
| الموبايل | ✅ Responsive Web App مكتمل (22 صفحة) | PWA / React Native مؤجل |
| اللغة | ✅ ثنائية اللغة (عربي + إنجليزي) | لا شيء — الثنائية اللغوية أساسية للـ MVP |
| Multi-tenancy | ✅ قاعدة بيانات واحدة + RLS مفعل من اليوم الأول | لا شيء — RLS متطلب أساسي |

---

## 1. المصادقة (Authentication)

### القرار

```
MVP:   Push Notifications + JWT (Access Token + Refresh Token)
MVP:   تجهيز هيكل تسجيل الدخول الاجتماعي (OAuth — Google / Apple)
```

### المبرر

طبيعة المشروع اجتماعية محلية (عائلة، عمارة، جيران، حي). أهم معرّف للمستخدم هو:
- رقم الجوال
- الاسم
- الانتماء للكيان

وليس البريد الإلكتروني. المصادقة بالجوال أنسب للبيئة السعودية والخليجية، وأسهل للآباء وكبار السن.

### التصميم

```
Login Flow:
  1. المستخدم يُدخل رقم الجوال
  2. النظام يُرسل OTP
  3. المستخدم يُدخل OTP
  4. النظام يُصدر: JWT Access Token + Refresh Token
```

### ملاحظة تقنية

Auth.js يدعم مزودي OAuth وكذلك نماذج تسجيل دخول مخصصة — مما يعني إمكانية إضافة Google / Apple لاحقاً دون إعادة بناء طبقة المصادقة.

---

### 1.1 مزود SMS — مُلغى تماماً

#### القرار

```
MVP:         إلغاء الاعتماد على SMS بالكامل.
Primary:     الاعتماد على إشعارات التطبيق (Push Notifications).
Fallback:    تم إلغاء فكرة الـ Fallback SMS.
```

#### المبرر

تم اتخاذ قرار سيادي بإلغاء الرسائل النصية القصيرة (SMS) كلياً من النظام لتقليل التكاليف الخارجية والاعتمادية على مزودين محليين/عالميين. النظام سيعتمد حصراً على Push Notifications للتبليغ والتواصل داخل التطبيق.

---

## 2. الدفع (Payments)

### القرار

```
MVP:   تجهيز بنية ميسر (Moyasar) بالكامل برمجياً للإنتاج
Pending: الربط الفعلي وإدخال الـ API Keys مؤجل للتشغيل الفعلي.
Later: Stripe — فقط عند الحاجة للتوسع الدولي
```

### المبرر

تم اتخاذ القرار بتجهيز البنية التحتية لبوابة الدفع (ميسر) كمتطلب أساسي للـ MVP، بينما الدفع اليدوي سيبقى متوفراً لكن الأساس هو الدفع الإلكتروني. فقط الإدراج الفعلي لمفاتيح الـ API هو المؤجل.

### تدفق الدفع اليدوي

```
العضو يدفع خارج النظام (تحويل بنكي)
  → يرفع إيصال / صورة إثبات
  → أمين الصندوق يراجع ويؤكد
  → النظام يُسجّل العملية في الدفتر المالي
```

### لماذا Moyasar وليس Stripe في V2؟

Moyasar مصمم للسوق السعودي ويدعم: مدى، Apple Pay، STC Pay، Samsung Pay.
Stripe قوي عالمياً، لكن ليس الخيار الأمثل لمشروع سعودي محلي ما لم تكن هناك حاجة دولية واضحة.

---

## 3. الموبايل (Mobile)

### القرار

```
MVP:   Responsive Web App — Mobile-first UI
V2:    PWA improvements (offline, install prompt)
V3:    React Native / Expo — فقط إذا أثبت الاستخدام حاجة للتطبيق الأصيل
```

### المبرر

بناء تطبيق React Native من البداية يعني مشروعاً إضافياً يشمل:
- نشر في App Store و Google Play
- صلاحيات وإشعارات
- اختبارات أجهزة
- تحديثات منفصلة

Web App متجاوب يعطي سرعة بناء وتجربة أولية ممتازة، وكافٍ لإثبات الفكرة.

### توزيع الاستخدام المتوقع في MVP

```
العضو العادي:    جوال — Web App متجاوب
مدير الكيان:    جوال أو جهاز — Web Dashboard
المراجع:        جهاز — Web Dashboard
```

### الإشعارات في MVP

```
المرحلة الأولى: Push Notifications داخل التطبيق (الاعتماد الأساسي الوحيد)
تم الإلغاء:     SMS أو WhatsApp
```

---

## 4. اللغة والاتجاه (Language & RTL)

### القرار

```
MVP:          Arabic + English (Bilingual from Day 1)
Architecture: i18n-ready من أول يوم 
```

### المبرر

الجمهور الأساسي عربي والمصطلحات اجتماعية عربية بطبيعتها:
عائلة، قبيلة، محفظة، مسار، اعتراض، لائحة، تكافل.

البدء بثنائية اللغة من أول يوم يزيد التكلفة والارتباك.
لكن عدم تجهيز i18n من البداية سيُكلّف ثمناً باهظاً لاحقاً.

### التطبيق العملي

```
✅ استخدام مفاتيح ترجمة:
   common.wallet
   common.governancePath
   decision.approve
   appeal.submit

❌ لا تكتب مباشرة في الكود:
   "محفظة"
   "مسار حوكمة"
```

### التصميم

```
- RTL native من أول يوم في كل مكونات الواجهة
- لا hardcoded labels في أي مكوّن
- ملفات ترجمة: /locales/ar/common.json
```

---

## 5. Multi-tenancy

### القرار

```
MVP:        Single PostgreSQL database — Shared schema + PostgreSQL RLS مفعل أساسياً
Security:   Application-level PBAC + RLS للجداول الحساسة معتمد من اليوم الأول
Enterprise: Dedicated database — عند طلب الجهات الكبيرة للعزل الكامل
```

### المبرر

المشروع يعتمد أصلاً على:
- عضو في أكثر من كيان
- علاقات بين كيانين
- محفظة مشتركة بين كيانين
- دعم مالي من كيان لآخر
- تحليل التداخل والتكرار
- إجمالي التزامات العضو عبر كل الكيانات

قاعدة بيانات منفصلة لكل كيان **تُعطّل أهم ميزة في المشروع**: محرك العلاقات والتداخل.

### التصميم

```sql
-- كل جدول حساس يحتوي السياق المناسب:
entity_id          -- لتحديد الكيان
wallet_id          -- لتحديد المحفظة
governance_path_id -- لتحديد المسار
membership_id      -- لتحديد العضوية

-- جداول العلاقات العابرة:
entity_relationships
wallet_relationships
```

### متى يُحتاج قاعدة منفصلة؟

```
Enterprise / Private Deployment:
  - كيان ضخم يطلب عزلاً قانونياً أو تعاقدياً
  - مؤسسة تريد: Dedicated DB + Dedicated Storage + Dedicated Domain
```

---

## صياغة قصيرة للمرجع

```markdown
## Authentication
MVP uses Push Notifications and JWT tokens. OAuth providers (Google, Apple) are prepared structurally in the MVP.
SMS authentication is completely cancelled.

## Payments
MVP fully prepares Moyasar integration in code. Only actual API key linking is deferred.

## Mobile
MVP is a responsive, mobile-first web application. React Native / Expo is deferred.

## Language & RTL
The MVP is fully bilingual (Arabic + English) from day one.

## Multi-tenancy
The MVP uses a single PostgreSQL database with shared schema. PostgreSQL RLS (Row Level Security) is fully enabled from day one alongside Application-level PBAC.
```
