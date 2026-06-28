# خطة تنفيذ تقرير التدقيق العميق

**المصدر:** `Docs/08_Production_Readiness/DEEP_PRODUCT_OPERABILITY_AUDIT.md`
**التاريخ:** 2026-06-28
**النطاق:** `C:\Users\Bakheet\Projects\CollectiveTrustOS\STGP`
**الغرض:** تحويل تقرير التدقيق العميق من تحليل إلى Backlog تنفيذي شامل، قابل للتنفيذ والاختبار، دون إسقاط أي ملاحظة.

---

## قواعد العمل

1. كل بيانات النظام الحالية Seed/Demo/Test ومسموح تعديلها أو إعادة توليدها أثناء التطوير.
2. هذا المستند لا يبدأ الإصلاح، بل يحول التقرير إلى خطة عمل رسمية.
3. أي ملاحظة مكررة لا تحذف؛ تدمج في بند واحد مع ذكر أنها وردت أكثر من مرة.
4. لا يعتبر تقرير التدقيق مغلقاً حتى تنفذ معايير الإغلاق في آخر المستند.
5. الأولوية هنا تشغيلية: المال والحوكمة والثقة في الاختبارات قبل تجميل الواجهات.

---

## Full Audit Findings Inventory

| ID | النص المختصر للملاحظة | القسم الذي وردت فيه | التصنيف | الأولوية | مكررة؟ | كود؟ | Seed؟ | واجهة؟ | اختبار؟ | مانعة للتجريبي؟ |
|---|---|---|---|---|---|---|---|---|---|---|
| F-001 | اعتماد طلب صرف نهائي بدون قرار حوكمي صالح | الملخص، الرحلات، الواجهات، الصلاحيات، المال، قائمة المشاكل، الخطة | Bug / Finance / Governance | Critical | نعم | نعم | نعم | نعم | نعم | نعم |
| F-002 | طلب صرف يبقى `APPROVED` عالقاً بلا `decisionId` ولا `transactionId` | المال، قائمة المشاكل | Bug / Finance | Critical | نعم | نعم | نعم | نعم | نعم | نعم |
| F-003 | رسالة تنفيذ مضللة: رصيد غير كاف رغم أن الرصيد كاف | الملخص، المال، قائمة المشاكل | Bug / UX / Finance | Critical | نعم | نعم | لا | نعم | نعم | نعم |
| F-004 | مقارنة Decimal محتملة الخطأ في فحص الرصيد | المال، قائمة المشاكل، الخطة العاجلة | Bug / Backend / Finance | Critical | نعم | نعم | لا | لا | نعم | نعم |
| F-005 | ترتيب الفحوص خطأ: فحص الرصيد قبل فحص القرار | المال، قائمة المشاكل، الخطة العاجلة | Bug / Backend / Finance | Critical | نعم | نعم | لا | لا | نعم | نعم |
| F-006 | زر موافقة الصرف في Review Center يستدعي الموافقة بلا قرار | الملخص، الواجهات، قائمة المشاكل | Bug / Frontend / Governance | Critical | نعم | نعم | لا | نعم | نعم | نعم |
| F-007 | صفحة Disbursement Requests تجعل اختيار القرار اختيارياً | الواجهات، قائمة المشاكل | Bug / Frontend / Governance | Critical | نعم | نعم | لا | نعم | نعم | نعم |
| F-008 | الحاجة لتسجيل محاولات الفشل المهمة في Audit Log | سجل التدقيق، Phase 0 المطلوب | Audit / Backend | High | نعم | نعم | لا | لا | نعم | نعم |
| F-009 | `seed:validate` من host قد يفحص قاعدة غير قاعدة التطبيق | الملخص، قائمة المشاكل، الخطة العاجلة | DevOps / Testing / Database | High | نعم | نعم | لا | لا | نعم | نعم |
| F-010 | أدوات الفحص لا تطبع DB identity بشكل يمنع الثقة الكاذبة | قائمة المشاكل، الخطة العاجلة | DevOps / Testing | High | نعم | نعم | لا | لا | نعم | نعم |
| F-011 | الحاجة لتشغيل validation داخل Docker أو شبكة صحيحة | قائمة المشاكل، الخطة العاجلة | DevOps / Documentation | High | نعم | نعم | لا | لا | نعم | نعم |
| F-012 | فحص UX الكامل يتوقف بسبب 429 على `/api/entities/mine` | الملخص، الرحلات، الصلاحيات، قائمة المشاكل | Testing / DevOps / Backend | High | نعم | نعم | لا | لا | نعم | نعم |
| F-013 | لا يجوز إغلاق بند الصلاحيات قبل نجاح 18/18 | الرحلات، الصلاحيات، الخطة العاجلة | Permission / Testing | High | نعم | لا | لا | لا | نعم | نعم |
| F-014 | Playwright يحتاج تقرير فشل واضح ويجب ألا يخفي آخر الحسابات | قائمة المشاكل، مطلوب المستخدم | Testing | High | لا | نعم | لا | لا | نعم | نعم |
| F-015 | الـ 11 حساباً الأصلية لا تكفي لكل السيناريوهات | الملخص، قائمة المشاكل، Seed | Data / Testing | High | نعم | نعم | نعم | لا | نعم | نعم |
| F-016 | نقص قصة كيان جديد فارغ بالكامل مع founder day-one | Seed، الرحلات، الحالات الفارغة | Data / UX | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-017 | المشاركة المشروطة موجودة كبيانات لا كرحلة مفهومة | الملخص، Seed، الرحلات، الحوكمة | Data / UX / Governance | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-018 | المصلحة المشتركة `SHARED` لا تمثل free-riders والعجز بوضوح | الملخص، Seed، الرحلات، الواجهات، قائمة المشاكل | Data / UX / Finance | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-019 | محفظة متعددة المسارات تحتاج أرصدة وحقوق وقرارات مستقلة | الملخص، Seed، الرحلات، Wallet Detail | Data / Governance / Finance | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-020 | سيناريو الرفض يحتاج سبباً وخطوة تالية مفهومة | Seed، UX، Small items | UX / Data | Medium | نعم | نعم | نعم | نعم | نعم | لا |
| F-021 | الاعتراض يحتاج رحلة كاملة من القرار إلى الرد والأثر | Seed، الرحلات، الحوكمة | Governance / UX / Audit | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-022 | سجل التدقيق غني لكنه raw ويحتاج timeline قابل للقراءة | الملخص، Seed، الرحلات، Auditor، سجل التدقيق، قائمة المشاكل | Audit / UX | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-023 | `SUPPORTER_ONLY` موجود كحالة لكنه غير مفهوم كحق بلا استفادة | Seed، الحوكمة، المصطلحات | Data / UX / Governance | Medium | نعم | نعم | نعم | نعم | نعم | لا |
| F-024 | تعدد الكيانات يعرض أسماء فقط ولا يعرض الالتزامات والحقوق | الملخص، الرحلات، Entities، قائمة المشاكل | UX / Data | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-025 | حملة علاج مؤقتة تحتاج قصة انتهاء/READ_ONLY/إغلاق | Seed، البيانات المقترحة | Data / UX | Medium | لا | نعم | نعم | نعم | نعم | لا |
| F-026 | قبيلة/صندوق واسع يحتاج دعم وفاة/وقف/تبرع/لجنة/اعتراض | Seed، البيانات المقترحة | Data / Governance | Medium | لا | نعم | نعم | نعم | نعم | لا |
| F-027 | كيان PENDING_REVIEW يحتاج واجهة انتظار وماذا ينقص | Seed، البيانات المقترحة | UX / Data | Medium | لا | نعم | نعم | نعم | نعم | لا |
| F-028 | علاقات كيانات ومحافظ مشتركة مع رقابة دون تصويت غير كافية | السيناريوهات غير المغطاة، لاحقاً | Data / Governance | Medium | نعم | نعم | نعم | نعم | نعم | لا |
| F-029 | البيانات أحياناً أرقام وسجلات لا قصص تشغيلية | ما غير الواقعي | Data / UX | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-030 | المحافظ/المسارات دون اشتراكات تحتاج empty states أفضل | ما غير الواقعي، قائمة المشاكل | UX / Data | Medium | نعم | نعم | نعم | نعم | نعم | لا |
| F-031 | Founder onboarding غير كاف بعد إنشاء كيان/محفظة/مسار | الرحلات، قبل التجريبي | UX / Frontend | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-032 | Dashboard لا يشرح لماذا يظهر المستحق وما أثره والخطوة التالية | Dashboard، UX | UX | Medium | نعم | نعم | لا | نعم | نعم | لا |
| F-033 | Dashboard وقائمة المستحقات كثيفة وتحتاج تجميعاً | Low، Dashboard | UX | Low | نعم | نعم | لا | نعم | نعم | لا |
| F-034 | بطاقة Entity يجب أن تعرض دور/مستحقات/محافظ/قرارات/حالة منصة | Entities، قائمة المشاكل | UX | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-035 | Entity Detail يحتاج خريطة العلاقة: كيان/محفظة/مسار/اشتراك/حقوق | Entity Detail، الحكم النهائي | UX / Governance | High | نعم | نعم | لا | نعم | نعم | نعم |
| F-036 | Entity Settings تحتاج أثر الإعداد قبل الحفظ | Entity Settings | UX / Governance | Medium | لا | نعم | لا | نعم | نعم | لا |
| F-037 | Members يحتاج ربط الدور بالاشتراكات والديون وحقوق الاستفادة | Members | UX / Permission | Medium | لا | نعم | لا | نعم | نعم | لا |
| F-038 | Wallets لا تشرح الفرق بين `SEPARABLE` و `SHARED` | Wallets، المصطلحات | UX / Finance | Medium | نعم | نعم | لا | نعم | نعم | لا |
| F-039 | Wallet Detail يحتاج Matrix للمسارات داخل المحفظة | Wallet Detail، الرحلات، Phase 4 | UX / Governance / Finance | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-040 | Path Detail يعرض enum ولا يترجمه إلى قاعدة بشرية | Path Detail، الحوكمة | UX / Governance | Medium | نعم | نعم | لا | نعم | نعم | لا |
| F-041 | Portal/Subscriptions يحتاج بطاقة اشتراك موحدة للحقوق والالتزامات | Portal، Phase 3 | UX / Governance | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-042 | Finance يجب أن يعرض المصدر والهدف والقرار والأثر قبل كل إجراء | Finance، الصلاحيات، المال | Finance / UX | High | نعم | نعم | لا | نعم | نعم | نعم |
| F-043 | Decisions تحتاج Decision Effect Panel بعد الإغلاق وقبل التصويت | Decisions، الرحلات، الحوكمة | Governance / UX | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-044 | Disputes يجب أن تبدأ من سياق قرار/صرف/عضو لا صفحة عامة فقط | Disputes، الرحلات | Governance / UX / Audit | Medium | نعم | نعم | نعم | نعم | نعم | لا |
| F-045 | Notifications تحتاج event -> recipient matrix | Notifications، سجل التدقيق | Backend / UX / Audit | Medium | نعم | نعم | لا | نعم | نعم | لا |
| F-046 | Search يجب أن يبقى مرشحاً بالصلاحيات ومغطى باختبار ثابت | Search | Permission / Testing | Medium | لا | نعم | لا | نعم | نعم | لا |
| F-047 | Auditor يحتاج filters/export/before-after/linked records | الصلاحيات، Auditor، سجل التدقيق | Audit / UX | High | نعم | نعم | لا | نعم | نعم | نعم |
| F-048 | Committee Member يحتاج تمثيل أوضح لما يخص لجنته فقط | الصلاحيات | Permission / UX | Medium | لا | نعم | نعم | نعم | نعم | لا |
| F-049 | Member يحتاج تبسيط الفرق بين دفع/اشتراك/استفادة/تصويت/اعتراض | الصلاحيات، الحكم النهائي | UX / Governance | High | نعم | نعم | لا | نعم | نعم | نعم |
| F-050 | مسارات الحوكمة ممثلة بياناتياً لكنها تحتاج شرحاً بشرياً | الحوكمة، Path Detail | Governance / UX | Medium | نعم | نعم | لا | نعم | نعم | لا |
| F-051 | MemberPreference موجود لكن أثره غير ظاهر للمستخدم | الحوكمة، Seed | Governance / UX / Data | Medium | نعم | نعم | نعم | نعم | نعم | لا |
| F-052 | الحقوق والالتزامات غير ظاهرة كعلاقة جوهرية في كل صفحة | الملخص، الحوكمة، الحكم النهائي | UX / Governance | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-053 | التقارير المالية لا تشرح لماذا تغير الرصيد ومن اعتمد | المال، لاحقاً | Finance / UX / Audit | Medium | نعم | نعم | لا | نعم | نعم | لا |
| F-054 | لا يوجد دليل كامل بعد حل 429 على عدم خلط الكيانات | المال، الصلاحيات | Permission / Testing / Finance | High | نعم | لا | لا | لا | نعم | نعم |
| F-055 | عزل المسارات موجود بنيوياً لكن UI لا يشرحه كفاية | المال، الحوكمة | Finance / UX / Governance | High | نعم | نعم | نعم | نعم | نعم | نعم |
| F-056 | Audit Log يحتاج تسجيل failed auth والـ validation failures المالية | سجل التدقيق، Phase 6 | Audit / Backend | High | نعم | نعم | لا | لا | نعم | نعم |
| F-057 | Audit Log يحتاج تسجيل إشعار تم/فشل، تغييرات الدور، فشل تنفيذ الصرف | سجل التدقيق | Audit / Backend | Medium | نعم | نعم | لا | لا | نعم | لا |
| F-058 | رسائل validation التقنية تحتاج تعريباً وطبقة ترجمة | قائمة المشاكل، Phase 8 | UX / Backend / Frontend | Medium | نعم | نعم | لا | نعم | نعم | لا |
| F-059 | أخطاء API مثل 429/403/500 قد تكون صامتة في الواجهة | قائمة المشاكل، Phase 1، Phase 8 | UX / Testing | Medium | نعم | نعم | لا | نعم | نعم | لا |
| F-060 | صفحات الإدارة تحتاج breadcrumbs هرمية | Low، Small items | UX | Low | نعم | نعم | لا | نعم | نعم | لا |
| F-061 | الجوال يجب أن يبقى جزءاً من كل فحص UX | منهجية، Playwright، مطلوب المستخدم | Testing / UX | Medium | نعم | لا | لا | نعم | نعم | لا |
| F-062 | المتصفح الداخلي لم يكن متاحاً ويجب توثيق fallback | منهجية | Testing / Documentation | Low | لا | لا | لا | لا | نعم | لا |
| F-063 | نقاط القوة يجب أن تتحول إلى guardrails لا تضيع | أفضل 5 نقاط قوة | Documentation / Testing | Medium | نعم | نعم | نعم | لا | نعم | لا |

---

## خريطة الأولوية والتنفيذ

### Phase 0 - إصلاحات مانعة فوراً

هذه المرحلة تغلق F-001 إلى F-008، وهي شرط قبل أي فحص UX واسع.

#### Action P0-01 - بوابة قرار حوكمي إلزامية للصرف النهائي

1. **رقم البند:** P0-01
2. **العنوان:** منع تحويل طلب الصرف إلى `APPROVED` نهائياً بدون قرار `DISBURSE_FUNDS` مغلق وموافق.
3. **الأولوية:** Critical
4. **مصدر الملاحظة:** F-001, F-002, F-006, F-007، أقسام الملخص، الرحلات، Review Center، Disbursement Requests، قائمة المشاكل.
5. **المشكلة أو التحسين المطلوب:** `approveDisbursementRequest` يسمح بالاعتماد دون `decisionId`.
6. **سبب أهميته:** يكسر قاعدة الحوكمة قبل المال ويخلق صرفاً عالقاً.
7. **الملفات المتوقع تعديلها:** `backend/src/disbursement-requests/disbursement-requests.service.ts`, `backend/src/disbursement-requests/dto/review-disbursement-request.dto.ts`, `backend/prisma/schema.prisma` عند اعتماد `PRE_APPROVED`, migration جديدة.
8. **خطوات التنفيذ المقترحة:** إضافة حالة `PRE_APPROVED` أو رفض الاعتماد النهائي دون قرار؛ التحقق من أن القرار `DISBURSE_FUNDS`; التحقق من `status=CLOSED` و `result=APPROVED`; التحقق من `governancePathId`, `spendingItemId`, `amount`; منع القرار من مسار آخر.
9. **شروط القبول:** لا يوجد طلب جديد ينتقل إلى `APPROVED` بلا `decisionId`; الرسالة العربية واضحة؛ الطلب المقبول نهائياً قابل للتنفيذ إذا كان الرصيد كافياً.
10. **طريقة الاختبار:** unit/service tests + e2e API: approve بلا قرار -> 400؛ approve بقرار مفتوح -> 400؛ approve بقرار مغلق وموافق -> APPROVED.
11. **Backend:** نعم.
12. **Frontend:** نعم لاحقاً في P0-04/P0-05.
13. **Database/Migration:** نعم إذا أضيف `PRE_APPROVED`.
14. **Seed Data:** نعم لتغطية الحالات.
15. **Test/Playwright:** نعم.
16. **Documentation:** نعم.
17. **المخاطر إن لم ينفذ:** صرف غير متسق وحالة مالية مضللة.
18. **يعتمد على:** لا شيء.

#### Action P0-02 - معالجة حالات `APPROVED` العالقة

1. **رقم البند:** P0-02
2. **العنوان:** ترحيل أو تصحيح طلبات الصرف المعتمدة بلا قرار.
3. **الأولوية:** Critical
4. **مصدر الملاحظة:** F-002، مشكلة الصرف المؤكدة.
5. **المشكلة:** توجد بيانات اختبارية `APPROVED` بلا `decisionId`.
6. **الأهمية:** تمنع التنفيذ وتضلل الواجهة.
7. **الملفات:** migration عند تغيير enum، سكربت seed cleanup أو `seed-reset`, `backend/prisma/seed-validate.ts`.
8. **الخطوات:** تحديد كل `APPROVED` بلا قرار؛ تحويلها إلى `PRE_APPROVED` أو `PENDING_REVIEW`; إضافة finding في validator؛ إزالة/تصحيح السجل التجريبي المعلق عند إعادة seed.
9. **القبول:** استعلام DB يرجع 0 لسجلات `APPROVED` بلا `decisionId`.
10. **الاختبار:** SQL assertion + seed validate + API list.
11. **Backend:** نعم.
12. **Frontend:** لا مباشرة.
13. **Database/Migration:** نعم.
14. **Seed:** نعم.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** حالات stuck تبقى مخفية.
18. **يعتمد على:** P0-01.

#### Action P0-03 - إصلاح ترتيب الفحوص ومقارنة Decimal ورسائل التنفيذ

1. **رقم البند:** P0-03
2. **العنوان:** فحص القرار قبل الرصيد واستخدام Decimal comparison آمن.
3. **الأولوية:** Critical
4. **المصدر:** F-003, F-004, F-005.
5. **المشكلة:** التنفيذ يفحص الرصيد قبل القرار، وربما يقارن Decimal object بشكل خاطئ.
6. **الأهمية:** المستخدم يرى سبب فشل خاطئ، وقد يرفض النظام صرفاً صحيحاً.
7. **الملفات:** `backend/src/disbursement-requests/disbursement-requests.service.ts`, `backend/src/ledger/ledger.service.ts`.
8. **الخطوات:** افحص `decisionId` أولاً؛ استخدم `Decimal` methods أو `Number` محكوم بالدقة؛ أعد رسائل عربية: "لا يمكن التنفيذ لأن الطلب لم يرتبط بقرار صرف معتمد".
9. **القبول:** طلب 25 مع رصيد 17050 لا يفشل بسبب الرصيد؛ طلب بلا قرار يفشل بسبب القرار؛ طلب أكبر من الرصيد يفشل بسبب الرصيد الصحيح.
10. **الاختبار:** service tests بثلاث حالات.
11. **Backend:** نعم.
12. **Frontend:** رسالة الخطأ تعرض عبر banner.
13. **Database:** لا.
14. **Seed:** حالة صرف صغير وحالة رصيد غير كاف.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** ثقة المستخدم في المال تنهار.
18. **يعتمد على:** P0-01.

#### Action P0-04 - إصلاح Review Center للصرف

1. **رقم البند:** P0-04
2. **العنوان:** منع زر "موافقة" للصرف في مركز المراجعة دون قرار.
3. **الأولوية:** Critical
4. **المصدر:** F-006، Review Center.
5. **المشكلة:** الزر يستدعي `approveDisbursementRequest(id)` بلا قرار.
6. **الأهمية:** أسهل طريق لإنتاج الحالة العالقة.
7. **الملفات:** `frontend/src/app/(main)/entities/[id]/review/page.tsx`, `frontend/src/lib/api/review-center.ts`, `frontend/src/lib/api/disbursement-requests.ts`, `frontend/src/locales/ar/reviewCenter.json`.
8. **الخطوات:** عرض حالة "يتطلب قرار صرف"; زر "إنشاء/ربط قرار"; تعطيل الموافقة النهائية حتى قرار صالح؛ إن كان الهدف قبولاً أولياً فسمه "قبول أولي" ويرسل حالة `PRE_APPROVED`.
9. **القبول:** لا يمكن من UI اعتماد صرف نهائي بلا قرار؛ النص يشرح المطلوب؛ يظهر CTA لإنشاء قرار.
10. **الاختبار:** Playwright على review page.
11. **Backend:** يعتمد على P0-01.
12. **Frontend:** نعم.
13. **Database:** لا.
14. **Seed:** طلب صرف PENDING بلا قرار.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** استمرار إنتاج stuck requests.
18. **يعتمد على:** P0-01.

#### Action P0-05 - إصلاح صفحة Disbursement Requests

1. **رقم البند:** P0-05
2. **العنوان:** جعل القرار مطلوباً أو إنشاء قرار تلقائي قبل الاعتماد النهائي.
3. **الأولوية:** Critical
4. **المصدر:** F-007.
5. **المشكلة:** select القرار اختياري، والاعتماد يعمل مع value فارغ.
6. **الأهمية:** يكسر رحلة الصرف كاملة.
7. **الملفات:** `frontend/src/app/(main)/disbursement-requests/page.tsx`, locales الخاصة بها.
8. **الخطوات:** إن لم توجد قرارات معتمدة، اعرض empty state "أنشئ قرار صرف أولاً"; لا تعرض زر الاعتماد النهائي؛ أضف زر "فتح قرار صرف"; عند اختيار قرار تحقق من نوعه ومساره ومبلغه.
9. **القبول:** اختيار القرار إجباري في الاعتماد النهائي؛ لا توجد حالة `APPROVED` بلا قرار من هذه الصفحة.
10. **الاختبار:** Playwright + API mock/real.
11. **Backend:** نعم عبر P0-01.
12. **Frontend:** نعم.
13. **Database:** لا.
14. **Seed:** نعم.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** فشل مالي في التشغيل.
18. **يعتمد على:** P0-01, P0-03.

#### Action P0-06 - Audit للفشل المالي المهم

1. **رقم البند:** P0-06
2. **العنوان:** تسجيل محاولات اعتماد/تنفيذ الصرف الفاشلة المهمة.
3. **الأولوية:** High
4. **المصدر:** F-008, F-056, F-057.
5. **المشكلة:** التقرير طلب تسجيل failed auth والـ validation failures المالية ومحاولات التنفيذ الفاشلة.
6. **الأهمية:** النزاعات المالية تحتاج أثر تدقيق حتى للفشل.
7. **الملفات:** `backend/src/disbursement-requests/disbursement-requests.service.ts`, `backend/src/auditor/auditor.service.ts`, وربما helper مشترك `audit.service`.
8. **الخطوات:** سجل `AuditAction` أو action detail للفشل المالي؛ لا تسجل بيانات حساسة؛ اربط entity/path/request/person; اعرضها في timeline لاحقاً.
9. **القبول:** فشل تنفيذ بلا قرار وفشل رصيد وفشل صلاحية يظهر في audit timeline/raw logs.
10. **الاختبار:** service/e2e مع expected audit rows.
11. **Backend:** نعم.
12. **Frontend:** لاحقاً Phase 6.
13. **Database:** ربما توسيع enum أو target metadata.
14. **Seed:** نعم.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** لا يمكن التحقيق في محاولات مالية فاشلة.
18. **يعتمد على:** P0-01/P0-03.

#### Action P0-07 - اختبارات دورة الصرف

1. **رقم البند:** P0-07
2. **العنوان:** Regression tests لدورة الصرف من الطلب إلى القرار إلى التنفيذ.
3. **الأولوية:** Critical
4. **المصدر:** كل ملاحظات Phase 0.
5. **المشكلة:** لا توجد بوابة تمنع عودة الخلل.
6. **الأهمية:** الصرف هو أخطر مسار مالي.
7. **الملفات:** `backend/src/disbursement-requests/disbursement-requests.service.spec.ts`, e2e tests، `frontend/scripts/ux-role-audit.spec.cjs`.
8. **الخطوات:** أضف حالات: بلا قرار، قرار مفتوح، قرار مرفوض، قرار مسار آخر، مبلغ مختلف، أكبر من الرصيد، تنفيذ صحيح، تنفيذ مكرر.
9. **القبول:** كل الحالات تمر، وتفشل برسائل عربية صحيحة عند المنع.
10. **الاختبار:** `npm test`, `npm run test:e2e`, Playwright focused.
11. **Backend:** نعم.
12. **Frontend:** نعم.
13. **Database:** لا.
14. **Seed:** fixtures.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** regression مالي.
18. **يعتمد على:** P0-01 إلى P0-06.

---

### Phase 1 - إصلاح بيئة الاختبار والثقة في النتائج

#### Action P1-01 - توحيد مصدر حقيقة قاعدة البيانات

1. **رقم البند:** P1-01
2. **العنوان:** ضمان أن `seed:validate` يقيس قاعدة التطبيق نفسها.
3. **الأولوية:** High
4. **المصدر:** F-009, F-010, F-011.
5. **المشكلة:** `localhost:5432` قد يشير إلى Postgres مختلف عن Docker.
6. **الأهمية:** يمنع ثقة كاذبة في seed والاختبارات.
7. **الملفات:** `backend/prisma/seed-runtime.ts`, `backend/prisma/seed-validate.ts`, `docker-compose.yml`, docs.
8. **الخطوات:** أضف `--print-db-identity`; اطبع `inet_server_addr`, `inet_server_port`, `pg_postmaster_start_time`, counts; أضف أمر `seed:validate:docker`; وثق استخدام `127.0.0.1` أو `docker exec`.
9. **القبول:** validator يحذر إذا DB identity لا تطابق expected Docker identity.
10. **الاختبار:** تشغيل validator ضد DB خاطئة يجب أن يظهر تحذير واضح.
11. **Backend:** نعم.
12. **Frontend:** لا.
13. **Database:** لا.
14. **Seed:** لا.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** نتائج تدقيق مضللة.
18. **يعتمد على:** لا شيء.

#### Action P1-02 - Profile مخصص للاختبارات لتجاوز 429 بأمان

1. **رقم البند:** P1-02
2. **العنوان:** إعداد Throttler قابل للضبط في dev/test.
3. **الأولوية:** High
4. **المصدر:** F-012.
5. **المشكلة:** 100 request/min يكسر `test:ux:roles`.
6. **الأهمية:** لا يمكن اعتماد صلاحيات ولا UX قبل مرور 18/18.
7. **الملفات:** `backend/src/app.module.ts`, `.env.example`, `docker-compose.yml`, docs.
8. **الخطوات:** اجعل `THROTTLE_TTL_MS` و`THROTTLE_LIMIT` من env؛ أضف `TEST_THROTTLE_LIMIT=1000` في docker dev؛ لا تغير production default.
9. **القبول:** لا 429 أثناء Playwright dev، بينما production يبقى محمياً.
10. **الاختبار:** run full UX audit.
11. **Backend:** نعم.
12. **Frontend:** لا.
13. **Database:** لا.
14. **Seed:** لا.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** QA لا يكتمل.
18. **يعتمد على:** لا شيء.

#### Action P1-03 - تحسين Playwright role audit

1. **رقم البند:** P1-03
2. **العنوان:** جعل فحص 18 حساباً كاملاً أكثر مقاومة للفشل وأكثر إفادة.
3. **الأولوية:** High
4. **المصدر:** F-013, F-014, F-061.
5. **المشكلة:** الفحص توقف عند حساب واحد ولم يفحص آخر 6.
6. **الأهمية:** يخفي مشاكل صلاحيات وتجارب.
7. **الملفات:** `frontend/scripts/ux-role-audit.spec.cjs`, `frontend/package.json`.
8. **الخطوات:** اجمع النتائج لكل الحسابات ثم fail summary في النهاية؛ أضف retry بسيط لـ 429 بعد backoff؛ أضف JSON summary موحد؛ أضف screenshots index; حافظ على desktop/mobile.
9. **القبول:** عند فشل مستخدم، يستمر الباقي ثم يعرض summary بكل الفشل.
10. **الاختبار:** افتعال 429/403 وتأكيد التقرير.
11. **Backend:** لا.
12. **Frontend:** نعم.
13. **Database:** لا.
14. **Seed:** لا.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** ثغرات دورية مخفية.
18. **يعتمد على:** P1-02.

#### Action P1-04 - إعادة تشغيل فحص 18/18 وإغلاق صلاحيات الأدوار

1. **رقم البند:** P1-04
2. **العنوان:** لا إغلاق للصلاحيات حتى تمر الجولة كاملة.
3. **الأولوية:** High
4. **المصدر:** F-013, F-054.
5. **المشكلة:** التقرير لا يملك دليل كامل بعد 429.
6. **الأهمية:** صلاحيات الأدوار شرط إطلاق.
7. **الملفات:** لا تعديل غالباً؛ نتائج test artifacts خارج repo.
8. **الخطوات:** شغل `npm run test:ux:roles`; راجع API failures؛ أصلح أي 403/500/blank/overflow؛ وثق النتيجة في تقرير readiness.
9. **القبول:** 18/18، صفر failed API غير متوقعة، صفر raw placeholders، صفر overflow، الجوال والديسكتوب.
10. **الاختبار:** Playwright الرسمي.
11. **Backend:** حسب النتائج.
12. **Frontend:** حسب النتائج.
13. **Database:** لا.
14. **Seed:** نعم إن نقصت قصة.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** إطلاق بصلاحيات غير مثبتة.
18. **يعتمد على:** P1-02, P1-03.

---

### Phase 2 - Seed Data قصصي كامل

#### نموذج Seed Stories المطلوب

| Story ID | اسم القصة | الهدف | المستخدمون | الكيانات | المحافظ | المسارات | الاشتراكات | المدفوعات | القرارات | الصرف | الاعتراضات/النزاعات | Audit متوقع | الواجهات |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S-01 | صندوق عائلة بسيط | رحلة founder كاملة حتى تقرير شهري | مؤسس، أمين صندوق، 6 أعضاء، عضو متأخر | عائلة صغيرة ACTIVE | طوارئ | BOARD أو PUBLIC_VOTE | active, overdue | مكتملة، متأخرة، جزئية | قرار صرف صغير | طلب PENDING ثم APPROVED/EXECUTED | لا أو اعتراض بسيط | create entity/wallet/path/payment/disbursement | Dashboard, New Entity, Entities, Wallet, Path, Finance |
| S-02 | صندوق عائلة معقد | اختبار تعقيد واقعي | 40 عضو، لجنة علاج، مدقق، داعمون | عائلة كبيرة ACTIVE | طوارئ، علاج، زواج، تعليم | 7 مسارات: لجنة، تصويت، داعم فقط | active, conditional, supporter, suspended | paid, overdue, rejected, cancelled, processing | open, closed, appealed | approved, rejected, executed | اعتراضات علاج | timeline كامل | Dashboard, Members, Decisions, Auditor |
| S-03 | عمارة shared benefit | حارس/مصعد وخدمة تفيد الجميع | 12 ساكن، 8 دافعين، 4 free-riders | عمارة ACTIVE | حارس، مصعد `SHARED` | PUBLIC_VOTE + INDIVIDUAL_WITH_CAP | active + non-paying | تغطية 66%, عجز 400 | قرار رفع مساهمة | صرف خدمة حارس | نزاع free-rider | audit للعجز والتنبيه | Entities, Wallets, Finance, Portal |
| S-04 | حي قيد المراجعة | PENDING_REVIEW | Founder حي، أعضاء انتظار | حي PENDING_REVIEW | مشاريع حي | BOARD | interested | لا توجد أو pending | لا | لا | لا | logs إنشاء وانتظار | Entities, Entity Detail, Empty State |
| S-05 | حملة علاج مؤقتة | انتهاء حملة وREAD_ONLY | مستفيد، داعمون، مدقق | Campaign READ_ONLY بعد انتهاء | علاج حالة | COMMITTEE + DONATION_ONLY | supporter/active سابق | case donations | قرار إغلاق | صرف علاج منفذ | اعتراض خصوصية | audit إغلاق | Campaign, Wallet, Auditor |
| S-06 | قبيلة/صندوق واسع | وفاة/وقف/تبرع | مؤسس، لجنة، أعضاء | قبيلة ACTIVE | وفاة، وقف قديم | DONATION_ONLY + COMMITTEE | active/supporter | مكتملة ومتأخرة | قرار دعم وفاة | executed/rejected | اعتراض رسمي | timeline قرار/اعتراض | Decisions, Disputes, Auditor |
| S-07 | كيان فارغ جديد | first-day founder | مؤسس فقط | عائلة/مجتمع ACTIVE بلا محافظ | لا شيء | لا شيء | لا شيء | لا شيء | لا شيء | لا شيء | لا | create only | New Entity, Dashboard, Empty states |
| S-08 | تعدد كيانات | فرق الالتزامات والحقوق | مستخدم في عائلة/عمارة/حي بأدوار مختلفة | 3 كيانات | محافظ مختلفة | مسارات مختلفة | active/conditional/supporter | due per entity | vote in one not other | لا | لا | login/read access | Entities, Dashboard, Portal |
| S-09 | محفظة متعددة المسارات | عزل المال والقرار والحقوق | Admin، members لكل مسار | عائلة ACTIVE | طوارئ واحدة | لجنة، تصويت، داعم فقط | memberships per path | balances per path | قرارات منفصلة | صرف مسار واحد | اعتراض على مسار | audit shows path id | Wallet Detail, Path Detail |
| S-10 | نزاع كامل timeline | audit readable | عضو، Admin، Auditor | أي كيان ACTIVE | محفظة ذات قرار | مسار قرار | active | لا يلزم | قرار متنازع | صرف مرتبط | dispute open/under/resolved | full before/after | Disputes, Auditor |
| S-11 | عضو مشروط | Conditional rights | عضو مشروط، Admin | عائلة ACTIVE | علاج | COMMITTEE | CONDITIONAL | pending/none | لا يصوت حتى active | لا | appeal optional | audit status changes | Portal, Subscriptions |
| S-12 | داعم فقط | دفع بلا استفادة | Supporter only | حملة/عائلة | علاج/تبرع | DONATION_ONLY | SUPPORTER_ONLY | paid donations | لا تصويت | لا استفادة | لا | audit payments | Portal, Wallet |
| S-13 | عضو موقوف/Exited | حالات عضوية صعبة | suspended/exited members | عائلة/عمارة | طوارئ | BOARD | SUSPENDED/EXITED | overdue/cancelled | no vote | no benefits | appeal possible | audit suspension | Dashboard, Portal |
| S-14 | علاقات كيانات/محافظ | دعم ورقابة دون تصويت | كيان داعم، كيان مستفيد | عائلة + حملة | مشتركة أو دعم | oversight only | supporter | entity support | decision support | transfer/support | dispute possible | relationship audit | Relationships, Finance |

#### Action P2-01 - إعادة هيكلة seed إلى قصص مسماة

1. **رقم البند:** P2-01
2. **العنوان:** تحويل seed من أرقام إلى قصص تشغيلية موثقة.
3. **الأولوية:** High
4. **المصدر:** F-015 إلى F-031.
5. **المشكلة:** البيانات غنية لكنها لا تحكي كل القصص.
6. **الأهمية:** بدون قصص لا نرى الاحتكاك الحقيقي.
7. **الملفات:** `backend/prisma/seed.ts`, `seed-operational-history.ts`, `seed-validate.ts`, `seed-login-smoke.ts`.
8. **الخطوات:** إنشاء builders لكل قصة؛ أسماء users ثابتة؛ تعليقات موجزة؛ IDs أو slugs يمكن للاختبارات استخدامها؛ توثيق story matrix.
9. **القبول:** validator يعرض story coverage وليس counts فقط.
10. **الاختبار:** seed reset + validate + smoke logins + UX roles.
11. **Backend:** نعم.
12. **Frontend:** لا مباشرة.
13. **Database:** لا غالباً.
14. **Seed:** نعم.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** نستمر في اختبار demo غير واقعي.
18. **يعتمد على:** P1-01.

#### Action P2-02 - Seed validation coverage gates

1. **رقم البند:** P2-02
2. **العنوان:** تحويل seed validator إلى بوابة تغطية سيناريوهات.
3. **الأولوية:** High
4. **المصدر:** F-015, F-063.
5. **المشكلة:** validator الحالي يثبت counts أكثر من القصص.
6. **الأهمية:** يمنع نسيان حالات مثل conditional/free-rider/empty.
7. **الملفات:** `backend/prisma/seed-validate.ts`.
8. **الخطوات:** أضف checks: empty entity, shared free-rider, conditional, supporter-only, exited, pending review, read-only campaign, multi-path wallet, dispute timeline, all payment states.
9. **القبول:** validator يفشل إذا غابت قصة مطلوبة.
10. **الاختبار:** حذف قصة مؤقتاً يجب أن يفشل validator.
11. **Backend:** نعم.
12. **Frontend:** لا.
13. **Database:** لا.
14. **Seed:** نعم.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** regression في البيانات.
18. **يعتمد على:** P2-01.

---

### Phase 3 - تحسين تجربة العضو والحقوق والالتزامات

#### Action P3-01 - Relationship Summary Component

1. **رقم البند:** P3-01
2. **العنوان:** مكون موحد يشرح العلاقة الجوهرية.
3. **الأولوية:** High
4. **المصدر:** F-035, F-041, F-049, F-052.
5. **المشكلة:** العضو لا يرى العلاقة: عضو -> كيان -> محفظة -> مسار -> اشتراك -> حقوق.
6. **الأهمية:** هذه فلسفة المنتج الأساسية.
7. **الملفات:** `frontend/src/components` إن وجد أو مكون جديد، صفحات Dashboard, Entity Detail, Wallet Detail, Path Detail, Portal, Subscriptions, Profile.
8. **الخطوات:** API يزود relationship summary؛ الواجهة تعرض: "أنت مشترك في X عبر Y"; "عليك دفع Z"; "يحق لك"; "لا يحق لك"; "سبب الظهور".
9. **القبول:** كل صفحة رئيسية تعرض سبب العلاقة والحقوق بشكل مباشر.
10. **الاختبار:** Playwright لكل roles مع assertions على النص.
11. **Backend:** ربما endpoint summary.
12. **Frontend:** نعم.
13. **Database:** لا.
14. **Seed:** نعم.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** يبقى المنتج غير مفهوم للمستخدم العادي.
18. **يعتمد على:** P2 stories.

#### Action P3-02 - Dashboard operational grouping

1. **رقم البند:** P3-02
2. **العنوان:** تجميع Dashboard حسب كيان/محفظة/مسار مع أثر وخطوة تالية.
3. **الأولوية:** Medium
4. **المصدر:** F-032, F-033.
5. **المشكلة:** قائمة المستحقات كثيفة ولا تشرح الأثر.
6. **الأهمية:** Dashboard هو أول قرار للمستخدم.
7. **الملفات:** `frontend/src/app/(main)/dashboard/page.tsx`, `dashboard.module.css`, locales.
8. **الخطوات:** group by entity/wallet/path; card لكل due: السبب، مبلغ، تاريخ، أثر التأخر، CTA، حالة.
9. **القبول:** يرى العضو سبب كل بند والخطوة التالية.
10. **الاختبار:** Playwright dashboard لكل member/treasurer/founder.
11. **Backend:** ربما تحسين response.
12. **Frontend:** نعم.
13. **Database:** لا.
14. **Seed:** نعم.
15. **Test:** نعم.
16. **Documentation:** لا.
17. **المخاطر:** المستخدم يدفع دون فهم.
18. **يعتمد على:** P3-01.

#### Action P3-03 - Entities operational cards

1. **رقم البند:** P3-03
2. **العنوان:** بطاقة الكيان تعرض الدور والمستحقات والمحافظ والقرارات والتنبيهات.
3. **الأولوية:** High
4. **المصدر:** F-024, F-034.
5. **المشكلة:** مستخدم متعدد الكيانات يرى أسماء فقط.
6. **الأهمية:** تعدد العلاقات جوهر النظام.
7. **الملفات:** `frontend/src/app/(main)/entities/page.tsx`, `entities.module.css`, `frontend/src/lib/api/entities.ts`.
8. **الخطوات:** أضف summary لكل entity؛ active wallets count؛ due total؛ votes pending؛ platform status؛ last alert؛ CTA.
9. **القبول:** `seed.faisal.overlap` يرى الفرق العملي بين العائلة والعمارة.
10. **الاختبار:** Playwright على multi-entity users.
11. **Backend:** نعم إذا summary غير متوفر.
12. **Frontend:** نعم.
13. **Database:** لا.
14. **Seed:** نعم.
15. **Test:** نعم.
16. **Documentation:** لا.
17. **المخاطر:** ارتباك تعدد الكيانات.
18. **يعتمد على:** P2-08, P3-01.

#### Action P3-04 - Subscription/Portal rights card

1. **رقم البند:** P3-04
2. **العنوان:** بطاقة اشتراك موحدة: أدفع، أشارك، أستفيد، أصوت، أعترض.
3. **الأولوية:** High
4. **المصدر:** F-041, F-049, F-052.
5. **المشكلة:** الفرق بين الاشتراك والدفع والاستفادة والتصويت غير واضح.
6. **الأهمية:** العضو العادي يحتاج تشغيل بلا شرح خارجي.
7. **الملفات:** `frontend/src/app/(main)/portal/page.tsx`, `subscriptions/page.tsx`, API subscriptions.
8. **الخطوات:** أضف حقول eligibility: canBenefit, canVote, canAppeal, supporterOnly, conditionalReason, nextDue.
9. **القبول:** تظهر النصوص المطلوبة: "أنت داعم فقط"; "مشارك بشرط"; "لا يحق لك التصويت لأنك خارج المسار".
10. **الاختبار:** Playwright لحالات active/conditional/supporter/exited/suspended.
11. **Backend:** نعم.
12. **Frontend:** نعم.
13. **Database:** لا.
14. **Seed:** نعم.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** سوء فهم الحقوق.
18. **يعتمد على:** P2-01, P3-01.

---

### Phase 4 - تحسين الحوكمة

هذه الصفوف Subtasks تفصيلية تابعة لمهمة Backlog الرسمية `BLK-P4-001`. لا تغني عن شروط القبول في الـ Backlog، لكنها تمنع ضياع الملاحظات الصغيرة داخل الحوكمة.

| Subtask | الأولوية | المطلوب | الملفات | القبول | الاختبار | يعتمد على |
|---|---|---|---|---|---|---|
| P4-01 Human governance labels | Medium | تحويل BOARD/COMMITTEE وغيرها إلى جمل تشغيلية | locales, Path Detail, Decisions | لا يظهر enum خام كشرح وحيد | UI assertions | P3-01 |
| P4-02 Conditional participation workflow | High | عرض الشرط، المراجع، الأثر، وخطوة Active | subscriptions, memberships, backend eligibility | عضو conditional يرى ما يحق/لا يحق له | Seed + Playwright | P2-11 |
| P4-03 Eligibility engine surface | High | عرض أهلية التصويت والاستفادة وسبب عدم الأهلية | decisions, portal, path detail | كل زر تصويت/استفادة يشرح السبب | API + UI | P3-04 |
| P4-04 Decision Effect Panel | High | قبل/بعد القرار، من يتأثر، ما الإجراء التالي | decisions page, decision API | كل قرار له أثر مفهوم | Playwright | P2 stories |
| P4-05 Contextual appeals/disputes | Medium | أزرار اعتراض/نزاع داخل القرار/الصرف | decisions, disbursement, disputes | نموذج يملأ السياق تلقائياً | UI + API | P6 timeline |
| P4-06 Path matrix isolation | High | مصفوفة مسارات داخل المحفظة: رصيد/مشتركين/قرارات/حقوق | wallet detail | عزل المال والقرار واضح | UI + API | P2-09 |
| P4-07 Prevent cross-path decision use | Critical | لا يستخدم قرار مسار لصرف مسار آخر | backend disbursement/ledger | 400 برسالة عربية | service/e2e | P0-01 |

---

### Phase 5 - تحسين المال والأرصدة

هذه الصفوف Subtasks تفصيلية تابعة لمهمة Backlog الرسمية `BLK-P5-001`.

| Subtask | الأولوية | المطلوب | الملفات | Acceptance Criteria | طريقة الاختبار |
|---|---|---|---|---|---|
| P5-01 Financial action preview | High | قبل أي اعتماد/تنفيذ مالي اعرض المصدر والهدف والقرار والأثر | finance, disbursements, review center | المستخدم يرى الحسابات والأثر قبل الحفظ | Playwright + API |
| P5-02 Balance explanation report | Medium | لماذا تغير الرصيد؟ العملية، القرار، من اعتمد | finance, ledger summary, auditor | كل حركة مالية لها سبب ورابط | API + UI |
| P5-03 Entity/wallet/path balance clarity | High | عرض الرصيد على المستويات الثلاثة دون خلط | wallets, wallet detail, path detail | لا يختلط رصيد المسار بالمحفظة | UI tests |
| P5-04 Negative/double-click guards | High | منع الدفعات السالبة، الضغط المزدوج، التنفيذ المكرر | backend DTOs, buttons | double click لا ينشئ قيدين | unit + Playwright |
| P5-05 Over-balance disbursement test | High | صرف أكبر من الرصيد يفشل بوضوح | disbursement service | رسالة صحيحة ولا transaction | service/e2e |
| P5-06 Refresh/back after financial action | Medium | تحديث الصفحة بعد إجراء مهم لا يعيد التنفيذ ولا يضيع الحالة | frontend pages | الحالة مستقرة بعد refresh/back | Playwright |
| P5-07 No entity/path mixing suite | High | اختبارات عدم خلط كيان/محفظة/مسار | backend e2e, Playwright | member لا يرى أو ينفذ خارج النطاق | e2e |

---

### Phase 6 - تحسين سجل التدقيق

#### متطلبات Audit Timeline

| المتطلب | التفاصيل | المصدر |
|---|---|---|
| Actor | اسم الشخص/الدور لا `personId` فقط | F-047 |
| Context | كيان/محفظة/مسار/طلب/قرار | F-022, F-056 |
| Before/After | قيمة قبل وبعد بشكل مفهوم | F-047 |
| Effect | ماذا تغير عملياً؟ | F-043, F-053 |
| Linked records | روابط للقرار/الصرف/الاعتراض/النزاع/المستند | F-047 |
| Failure events | failed auth, validation failures, failed disbursement execution | F-056 |
| Notifications | تم الإرسال/فشل الإرسال والمستلم | F-045, F-057 |
| Role changes | تغيير دور أو حالة عضوية | F-057 |
| Filters | user, entity, type, date, severity | F-047 |
| Export | تصدير تقرير تدقيق | F-047 |

#### Action P6-01 - Audit Timeline API

1. **رقم البند:** P6-01
2. **العنوان:** Endpoint يعيد timeline غني بدلاً من raw logs فقط.
3. **الأولوية:** High
4. **المصدر:** F-022, F-047, F-056, F-057.
5. **المشكلة:** raw log غير كاف للمراجعة والنزاع.
6. **الأهمية:** audit هو ذاكرة الثقة في المنتج.
7. **الملفات:** `backend/src/auditor/auditor.service.ts`, `auditor.controller.ts`, ربما `audit-log-presenter`.
8. **الخطوات:** join actors/entities; map actions to human text; include links; filters; severity.
9. **القبول:** المدقق يرى "سارة اعتمدت طلب صرف X بعد قرار Y" لا targetId فقط.
10. **الاختبار:** service tests + API snapshots.
11. **Backend:** نعم.
12. **Frontend:** نعم في P6-02.
13. **Database:** ربما لا.
14. **Seed:** نعم لقصة timeline.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** سجل لا يفيد في النزاع.
18. **يعتمد على:** P0 audit events.

#### Action P6-02 - Auditor Timeline UI

1. **رقم البند:** P6-02
2. **العنوان:** واجهة مدقق timeline مع فلاتر وروابط.
3. **الأولوية:** High
4. **المصدر:** F-022, F-047.
5. **المشكلة:** Auditor يشاهد raw data.
6. **الأهمية:** المدقق يحتاج قصة قابلة للقراءة.
7. **الملفات:** `frontend/src/app/(main)/auditor/page.tsx`, `auditor.module.css`, locales.
8. **الخطوات:** timeline grouped by day; filters; linked records; before/after panel; export CTA.
9. **القبول:** قصة النزاع S-10 مقروءة من البداية للنهاية.
10. **الاختبار:** Playwright auditor role.
11. **Backend:** P6-01.
12. **Frontend:** نعم.
13. **Database:** لا.
14. **Seed:** نعم.
15. **Test:** نعم.
16. **Documentation:** نعم.
17. **المخاطر:** تجربة المدقق شكلية.
18. **يعتمد على:** P6-01.

---

### Phase 7 - تحسين الواجهات صفحة بصفحة

| الواجهة | المشكلة الحالية | المطلوب تحسينه | نصوص/رسائل مقترحة | أزرار مطلوبة | Empty states | نجاح/فشل | اختبارات | علاقة الحقوق |
|---|---|---|---|---|---|---|---|---|
| Dashboard | كثافة، لا يشرح السبب والأثر | تجميع حسب كيان/محفظة/مسار | "ظهر هذا لأنك مشترك في..." | ادفع، متابعة، عرض السبب | لا مستحقات: "لا توجد التزامات حالية" | banner 429/403/500 | member/founder/mobile | يعرض الالتزامات |
| Entities | بطاقات تعريفية فقط | بطاقة operational | "عليك X في هذا الكيان" | متابعة، إنشاء كيان | كيان فارغ: setup wizard | لا صلاحية/معلق | multi-entity | يفرق الحقوق لكل كيان |
| Entity Detail | لا relationship map | خريطة كيان/محفظة/مسار | "هذه المحافظ التي تخصك" | إدارة، دعوة، إنشاء محفظة | لا محافظ: "ابدأ بأول محفظة" | حفظ/فشل | founder/member | يشرح النطاق |
| Entity Settings | مصطلحات ثقيلة | أثر الإعداد قبل الحفظ | "هذا يعني أن..." | معاينة الأثر، حفظ | لا سياسات | نجاح مع ما تغير | admin/founder | يوضح التصويت والاعتراض |
| Members | لا يربط role بالديون والحقوق | بطاقة عضو شاملة | "له حق استفادة/لا" | تغيير دور، تعليق، عرض الاشتراكات | لا أعضاء | role change success/fail | admin/auditor | يوضح أهلية العضو |
| Wallets | SEPARABLE/SHARED غير واضح | لغة بشرية ونوع منفعة | "مصلحة فردية" / "خدمة مشتركة" | فتح، إنشاء | لا محافظ | 403/empty | member/founder | يشرح الاستفادة |
| Wallet Detail | لا matrix كافية | جدول مسارات | "رصيد هذا المسار مستقل" | فتح مسار، إنشاء مسار | لا مسارات | فشل API banner | multi-path | عزل الحقوق |
| Path Detail | enum غير بشري | شرح قواعد المسار | "هذا المسار يحتاج موافقة..." | تصويت، طلب صرف، اعتراض | لا بنود صرف | لا أهلية للتصويت | committee/member | يشرح السبب |
| Portal/Subscriptions | لا يوضح الفرق بين دفع/اشتراك/استفادة | بطاقة اشتراك موحدة | "أنت داعم فقط" | دفع، اعتراض، تفاصيل | لا اشتراكات | فشل دفع/نجاح | member states | جوهر الحقوق |
| Finance | أرقام دون أثر كاف | source/target/decision preview | "سيخصم من..." | اعتماد، رفض، تصدير | لا دفعات | منع double click | treasurer | أثر مالي |
| Review Center | اعتماد صرف بلا قرار | قرار إلزامي/قبول أولي | "يتطلب قرار صرف" | إنشاء/ربط قرار، قبول أولي | لا طلبات | رفض سبب واضح | admin/founder | يحمي الحوكمة |
| Disbursement Requests | قرار اختياري | gate واضح | "اختر قرار صرف معتمد" | فتح قرار، اعتماد، تنفيذ | لا طلبات | تنفيذ/فشل مفسر | e2e | صرف مرتبط بحق |
| Decisions | أثر القرار غير واضح | Decision Effect Panel | "إذا اعتمد، سيحدث..." | تصويت، اعتراض | لا قرارات | vote duplicate | member/admin | أهلية التصويت |
| Disputes | صفحة عامة لا سياقية | فتح من قرار/صرف | "تعترض على القرار..." | فتح نزاع، رد، حل | لا نزاعات | timeline status | member/admin/auditor | حق الاعتراض |
| Auditor | raw log | timeline/filter/export | "من فعل ماذا" | فلترة، تصدير | لا أحداث | API fail banner | auditor | رقابة |
| Notifications | لا matrix مثبتة | event-recipient clarity | "تم اعتماد طلبك" | فتح السجل | لا إشعارات | read/fail | all roles | يوجه المستخدم |
| Search | يحتاج استمرار فلترة الصلاحيات | نتائج بصلاحية وسياق | "ضمن كياناتك" | فتح النتيجة | لا نتائج | search API failure | permission tests | يمنع التسريب |

---

### Phase 8 - المصطلحات والرسائل

| المصطلح | يبقى؟ | الشرح المقترح | أين يظهر؟ | Tooltip؟ | Empty State؟ | مثال؟ |
|---|---|---|---|---|---|---|
| كيان | نعم | التجمع الأساسي مثل عائلة أو عمارة أو حي | Entities, Entity Detail | نعم | نعم | "صندوق عائلة الهاشمي" |
| محفظة | نعم | وعاء مالي له هدف محدد داخل الكيان | Wallets | نعم | نعم | "محفظة الطوارئ" |
| مسار | نعم مع شرح | طريقة الحوكمة والحقوق داخل المحفظة | Path Detail, Wallet Detail | نعم | نعم | "مسار لجنة العلاج" |
| اشتراك | نعم | التزام دوري يعطي حقوقاً محددة | Portal | نعم | نعم | "اشتراك شهري 250" |
| مساهمة | نعم | دفع لمشروع أو خدمة قد لا يعطي نفس حقوق الاشتراك | Finance/Portal | نعم | لا | "مساهمة مصعد" |
| طلب صرف | نعم | طلب استخدام مال من مسار محدد | Disbursement | نعم | نعم | "طلب علاج عاجل" |
| قرار | نعم | موافقة حوكمة على إجراء له أثر | Decisions | نعم | نعم | "قرار صرف" |
| تصويت | نعم | مشاركة مؤهلة في قرار | Decisions | نعم | لا | "صوتك مطلوب" |
| اعتراض | نعم | طلب مراجعة قرار يمس حقك | Decisions/Appeals | نعم | نعم | "اعترض على الرفض" |
| نزاع | نعم | خلاف رسمي يحتاج تسلسل مراجعة | Disputes | نعم | نعم | "نزاع مالي" |
| تدقيق | نعم | سجل رقابي للأحداث والتغييرات | Auditor | نعم | نعم | "من فعل ماذا" |
| نطاق استفادة | نعم مع شرح قوي | من يحق له الاستفادة من المحفظة أو المسار | Portal/Wallet | نعم | لا | "للمشتركين فقط" |
| داعم فقط | نعم | يدفع للدعم ولا يملك حق استفادة تلقائي | Portal | نعم | نعم | "أنت داعم فقط" |
| عضو مشروط | نعم | لم يصبح Active حتى تحقق شرطه | Portal/Subscriptions | نعم | نعم | "بانتظار مراجعة شرطك" |
| عضو نشط | نعم | يملك حقوقه ويلتزم بدفعه | Members/Portal | نعم | لا | "نشط" |
| عضو موقوف | نعم | حقوقه محدودة بسبب حالة عضوية أو تأخر | Members/Portal | نعم | نعم | "موقوف بسبب متأخرات" |

#### رسائل أخطاء يجب تعريبها

| الحالة | الرسالة التقنية الحالية/المحتملة | الرسالة العربية المطلوبة |
|---|---|---|
| اسم محفظة قصير | `name must be longer than or equal to 2 characters` | "اكتب اسماً واضحاً للمحفظة من حرفين على الأقل." |
| صرف بلا قرار | BadRequest عام | "لا يمكن تنفيذ الصرف قبل ربطه بقرار صرف معتمد." |
| رصيد غير كاف | رسالة قد تكون مضللة | "الرصيد المتاح في هذا المسار لا يغطي مبلغ الصرف." |
| 429 | Failed to load resource | "تم إرسال طلبات كثيرة بسرعة. انتظر لحظة ثم حاول مرة أخرى." |
| 403 | Forbidden | "لا تملك صلاحية تنفيذ هذا الإجراء في هذا الكيان أو المسار." |
| 500 | Internal error | "حدث خطأ غير متوقع. لم يتم حفظ الإجراء. حاول لاحقاً أو راجع المسؤول." |

---

### Phase 9 - الحالات السلبية والخطرة كاختبارات

| الحالة | Expected behavior | Actual معروف من التقرير | نوع الاختبار | Banner؟ | Audit؟ | منع؟ | تراجع؟ |
|---|---|---|---|---|---|---|---|
| عضو عادي يدخل إدارة | 403/صفحة منع واضحة | عينات API جيدة | Playwright + API | نعم | نعم للفشل المهم | نعم | لا |
| مدقق يعدل بيانات | 403 | عينات API جيدة | API/e2e | نعم | نعم | نعم | لا |
| صرف أكبر من الرصيد | 400 برسالة رصيد صحيحة | يحتاج اختبار | service/e2e | نعم | نعم | نعم | لا |
| محفظة بلا اسم | 400 عربي | حالياً إنجليزي | API/UI | نعم | لا غالباً | نعم | نعم |
| دفعة سالبة | 400 عربي | غير معروف | API/unit | نعم | نعم إذا مالي | نعم | لا |
| حذف كيان له بيانات | رفض أو soft closure | غير معروف | API/e2e | نعم | نعم | نعم | workflow |
| تصويت مرتين | 409 عربي | يعمل | API/UI | نعم | نعم | نعم | لا |
| اعتماد صرف بدون صلاحية | 403 | غير مكتمل بسبب 429 | API/UI | نعم | نعم | نعم | لا |
| رؤية بيانات عضو آخر | 403/filtered | يحتاج فحص كامل | API/e2e | نعم | نعم | نعم | لا |
| خلط أموال محفظتين | منع عبر ledger/path | يحتاج test | service/e2e | نعم | نعم | نعم | reversal فقط |
| رابط مباشر بدون صلاحية | منع واضح | يحتاج 18/18 | Playwright | نعم | نعم | نعم | لا |
| الجوال | لا overflow ولا controls مخفية | كان جيداً قبل 429 | Playwright mobile | نعم | لا | لا | لا |
| تحديث بعد إجراء مالي | لا تكرار ولا فقد حالة | غير مختبر | Playwright | إن فشل | نعم | منع التكرار | لا |
| رجوع للخلف بعد الحفظ | لا تنفيذ مكرر | غير مختبر | Playwright | إن فشل | نعم مالي | منع | لا |
| ضغط مزدوج حفظ | idempotency/disabled button | غير مختبر | Playwright/unit | نعم | نعم مالي | منع | لا |
| انقطاع اتصال | لا حفظ كاذب، retry واضح | غير مختبر | Playwright route abort | نعم | حسب الحدث | لا حفظ | retry |
| نفس الحساب من جلستين | حالة متسقة | غير مختبر | e2e/browser contexts | نعم عند conflict | نعم مالي | منع التعارض | لا |
| ظهور 429 | banner واضح/retry | صامت في لقطة | Playwright | نعم | لا غالباً | لا | retry |
| ظهور 403 | منع مفهوم | بعض المسارات جيدة | Playwright/API | نعم | نعم للفشل الحساس | نعم | لا |
| ظهور 500 | رسالة لا توحي بالحفظ | غير معروف | fault injection | نعم | نعم | لا حفظ | retry |
| فشل API صامت | global banner | موجود كمشكلة | Playwright | نعم | لا | لا | retry |

---

### Phase 10 - التوثيق والتشغيل

| Doc ID | الوثيقة | المحتوى المطلوب | الملفات المقترحة |
|---|---|---|---|
| D-01 | فلسفة المنتج | لماذا العلاقة عضو/كيان/محفظة/مسار هي الأساس | `Docs/01_Product/CollectiveTrustOS_Principles.md` |
| D-02 | Entity/Wallet/Path | الفرق العملي مع أمثلة | `Docs/02_Domain/Entity_Wallet_Path.md` |
| D-03 | Separable vs Shared | علاج فردي مقابل حارس/مصعد | `Docs/02_Domain/Benefit_Types.md` |
| D-04 | Governance paths | BOARD/COMMITTEE/PUBLIC_VOTE... بلغة بشرية | `Docs/02_Domain/Governance_Paths.md` |
| D-05 | Membership states | Active/Conditional/Supporter/Suspended/Exited | `Docs/02_Domain/Membership_States.md` |
| D-06 | Disbursement lifecycle | Request -> Decision -> Approval -> Ledger | `Docs/03_Workflows/Disbursement_Lifecycle.md` |
| D-07 | Seed stories | قصص seed والحسابات | `Docs/08_Production_Readiness/Seed_Stories.md` |
| D-08 | Test operations | تشغيل seed validate وPlaywright 18/18 | `Docs/08_Production_Readiness/Test_Runbook.md` |
| D-09 | DB identity | كيف تتأكد من قاعدة البيانات الصحيحة | `Docs/08_Production_Readiness/Database_Identity_Runbook.md` |
| D-10 | Known limitations | ما تبقى بعد كل مرحلة | `Docs/08_Production_Readiness/Known_Limitations.md` |
| D-11 | Test accounts | حسابات الاختبار والأدوار والقصص | `Docs/08_Production_Readiness/Test_Accounts.md` |
| D-12 | Audit timeline | كيف يقرأ المدقق السجل | `Docs/03_Workflows/Audit_Timeline.md` |

---

## Product/Engineering Backlog

## Guardrails من نقاط القوة

هذه ليست مشاكل، لكنها نقاط قوة وردت في التقرير ويجب تحويلها إلى حواجز منع regression:

| Guardrail ID | القوة الحالية | كيف نحافظ عليها؟ | اختبار الحماية |
|---|---|---|---|
| G-001 | البيانات ليست سطحية وتغطي كيانات ومحافظ وقرارات ونزاعات | لا تقبل Seed reset يقلل التغطية دون تحديث validator | `seed:validate` story coverage |
| G-002 | الدفتر المالي متوازن | أي عملية مالية تمر عبر `LedgerService` وتنتج entries متوازنة | financial-boundaries + ledger balance check |
| G-003 | الأدوار الأساسية ممثلة | كل دور يبقى له حساب seed ومسار Playwright | `npm run test:ux:roles` |
| G-004 | حالات الدفع متنوعة | validator يفشل إذا غابت paid/overdue/pending/waived أو record statuses | seed validator |
| G-005 | Playwright audit موجود ومفيد | لا يلغى السكربت، بل يطور ويشغل بعد كل phase مؤثرة | CI/local QA runbook |

### Task ID: BLK-P0-001

### Title:
Disbursement final approval must require a valid governance decision.

### Priority:
Critical

### Type:
Bug / Finance / Governance / Backend

### Description:
في `approveDisbursementRequest` لا تسمح بتحويل الطلب إلى `APPROVED` إلا بوجود `decisionId` مرتبط بقرار `DISBURSE_FUNDS` حالته `CLOSED` ونتيجته `APPROVED` ويطابق المسار والبند والمبلغ.

### Why it matters:
هذا يغلق أكبر ثغرة منطق تشغيل في التقرير: المال لا يتحرك ولا يعتمد دون حوكمة.

### Scope:
Service validation, DTO behavior, audit log on failure, tests.

### Out of scope:
تصميم كامل لشاشة القرار، لكنه يعتمد عليه لاحقاً.

### Files likely affected:
`backend/src/disbursement-requests/disbursement-requests.service.ts`, `dto/review-disbursement-request.dto.ts`, `decisions.service.ts`, tests.

### Dependencies:
لا شيء.

### Acceptance Criteria:
- approve بلا decisionId يرجع 400 عربي.
- approve بقرار غير مغلق يرجع 400.
- approve بقرار مرفوض يرجع 400.
- approve بقرار مسار آخر يرجع 400.
- approve بقرار صحيح يحول إلى `APPROVED`.

### Test Cases:
Unit + e2e لكل الحالات أعلاه.

### Risk if skipped:
حالة مالية خاطئة وثقة مكسورة.

### Task ID: BLK-P0-002

### Title:
Introduce or enforce a non-final pre-approval state for disbursement review.

### Priority:
Critical

### Type:
Feature / Backend / Database / Frontend

### Description:
إذا احتاجت الإدارة إلى قبول أولي قبل القرار، أضف حالة `PRE_APPROVED` أو ما يعادلها. لا تستخدم `APPROVED` إلا للقرار النهائي المرتبط بقرار حوكمي.

### Why it matters:
يحافظ على الفرق بين موافقة إدارية أولية واعتماد حوكمي نهائي.

### Scope:
Prisma enum migration, service state machine, UI labels.

### Out of scope:
تغيير كل نماذج الحوكمة.

### Files likely affected:
`backend/prisma/schema.prisma`, migrations, `disbursement-requests.service.ts`, frontend review pages.

### Dependencies:
BLK-P0-001.

### Acceptance Criteria:
- لا توجد `APPROVED` بلا قرار.
- `PRE_APPROVED` لا يسمح بالتنفيذ.
- الواجهة تسمي الحالة "قبول أولي" لا "موافقة نهائية".

### Test Cases:
Migration test, API state transition tests, Playwright.

### Risk if skipped:
استمرار stuck approvals.

### Task ID: BLK-P0-003

### Title:
Fix Decimal balance comparison and validation order in disbursement execution.

### Priority:
Critical

### Type:
Bug / Backend / Finance

### Description:
نفذ فحص القرار قبل الرصيد، واستخدم مقارنة Decimal صحيحة. لا تعد رسالة رصيد غير كاف إذا كانت المشكلة قراراً مفقوداً.

### Why it matters:
رسالة خاطئة في المال تجعل المستخدم لا يثق بالنظام.

### Scope:
Execution path and tests.

### Out of scope:
إعادة تصميم ledger.

### Files likely affected:
`backend/src/disbursement-requests/disbursement-requests.service.ts`, `backend/src/ledger/ledger.service.ts`.

### Dependencies:
BLK-P0-001.

### Acceptance Criteria:
- طلب بلا قرار يفشل بسبب القرار.
- طلب أكبر من الرصيد يفشل بسبب الرصيد.
- طلب صحيح ينفذ.

### Test Cases:
3 service tests + e2e.

### Risk if skipped:
فشل صرف صحيح أو تشخيص خاطئ.

### Task ID: BLK-P0-004

### Title:
Fix Review Center disbursement approval UI.

### Priority:
Critical

### Type:
Bug / Frontend / UX

### Description:
أزل زر الموافقة النهائي المباشر للصرف أو عطله حتى يوجد قرار حوكمي صالح. أضف زر "إنشاء/ربط قرار صرف".

### Why it matters:
هذه الصفحة هي الطريق الأسهل لإنتاج طلب عالق.

### Scope:
Review Center disbursement cards.

### Out of scope:
إعادة تصميم مركز المراجعات بالكامل.

### Files likely affected:
`frontend/src/app/(main)/entities/[id]/review/page.tsx`, `reviewCenter.json`, API client.

### Dependencies:
BLK-P0-001.

### Acceptance Criteria:
- لا request approve بلا `decisionId`.
- UI يشرح لماذا الزر معطل.
- يوجد مسار واضح لإنشاء/ربط القرار.

### Test Cases:
Playwright focused on entity review page.

### Risk if skipped:
استمرار خلل الصرف من الواجهة.

### Task ID: BLK-P0-005

### Title:
Fix Disbursement Requests approval UI and execution messages.

### Priority:
Critical

### Type:
Bug / Frontend / UX / Finance

### Description:
اجعل قرار الصرف مطلوباً للاعتماد النهائي، واعرض رسالة تنفيذ واضحة عند نقص القرار أو الرصيد.

### Why it matters:
هذه الصفحة هي أداة التشغيل اليومية لطلبات الصرف.

### Scope:
Decision select, empty approved decisions, execute panel, messages.

### Out of scope:
تصميم Decision module الكامل.

### Files likely affected:
`frontend/src/app/(main)/disbursement-requests/page.tsx`, CSS, locales.

### Dependencies:
BLK-P0-001, BLK-P0-003.

### Acceptance Criteria:
- لا اعتماد نهائي بدون قرار.
- عند عدم وجود قرار تظهر empty state مفيدة.
- أخطاء التنفيذ تظهر في banner واضح.

### Test Cases:
Playwright + API.

### Risk if skipped:
فشل رحلة الصرف.

### Task ID: BLK-P1-001

### Title:
Make seed validation prove the target DB identity.

### Priority:
High

### Type:
DevOps / Test / Database

### Description:
أضف طباعة وتحذير DB identity في seed validator، ووثق تشغيله على قاعدة Docker الصحيحة.

### Why it matters:
يمنع أن يصدق الفريق نتائج فحص قاعدة أخرى.

### Scope:
seed runtime, validator, scripts, docs.

### Out of scope:
تغيير بنية Postgres الإنتاجية.

### Files likely affected:
`backend/prisma/seed-runtime.ts`, `seed-validate.ts`, `package.json`, docs.

### Dependencies:
لا شيء.

### Acceptance Criteria:
- validator يطبع DB address/port/start time.
- docs تحدد Docker source of truth.
- تحذير عند mismatch.

### Test Cases:
تشغيل ضد host DB وضد Docker DB.

### Risk if skipped:
ثقة كاذبة في نتائج الفحص.

### Task ID: BLK-P1-002

### Title:
Make UX role audit pass 18/18 without 429.

### Priority:
High

### Type:
Test / DevOps / Backend

### Description:
اضبط throttling في dev/test، وحسن Playwright ليستمر بعد فشل مستخدم ويخرج summary كامل.

### Why it matters:
لا يمكن إغلاق صلاحيات الأدوار دون الجولة الكاملة.

### Scope:
Throttler env, Playwright script, docs.

### Out of scope:
تخفيف throttling في production.

### Files likely affected:
`backend/src/app.module.ts`, `.env.example`, `frontend/scripts/ux-role-audit.spec.cjs`.

### Dependencies:
لا شيء.

### Acceptance Criteria:
- `npm run test:ux:roles` يمر 18/18.
- لا 429 في dev.
- failure summary شامل إن حدث فشل.

### Test Cases:
Run full role audit.

### Risk if skipped:
صلاحيات وتجارب غير مثبتة.

### Task ID: BLK-P2-001

### Title:
Implement named operational seed stories.

### Priority:
High

### Type:
Seed / Test / Documentation

### Description:
أنشئ قصص seed S-01 إلى S-14 كما في الجدول، مع users ثابتين وسيناريوهات مالية وحوكمية مترابطة.

### Why it matters:
البيانات الحالية واسعة لكنها لا تغطي كل القصص الواقعية.

### Scope:
Seed builders, validator, account docs.

### Out of scope:
استبدال كل أسماء seed الحالية إذا لم يلزم.

### Files likely affected:
`backend/prisma/seed.ts`, `seed-operational-history.ts`, `seed-validate.ts`, docs.

### Dependencies:
P1 DB identity.

### Acceptance Criteria:
- كل قصة تظهر في validator.
- كل قصة لها حساب أو أكثر.
- Playwright يستطيع الوصول إلى صفحاتها.

### Test Cases:
seed reset + validate + smoke logins + UX audit.

### Risk if skipped:
لا نرى المشاكل الواقعية قبل التجريبي.

### Task ID: BLK-P3-001

### Title:
Expose rights and obligations across core member surfaces.

### Priority:
High

### Type:
Feature / UX / Frontend / Backend

### Description:
أضف Relationship Summary في Dashboard, Entities, Entity Detail, Wallet Detail, Path Detail, Portal/Subscriptions, Profile, Payment Due, Decision, Disbursement Request.

### Why it matters:
هذه هي فلسفة CollectiveTrustOS الأساسية.

### Scope:
API summary + reusable UI component + text.

### Out of scope:
إعادة تصميم كل الصفحات بصرياً.

### Files likely affected:
Frontend pages listed above, `subscriptions.service.ts`, `entities.service`, `wallets.service` حسب الحاجة.

### Dependencies:
Seed stories for states.

### Acceptance Criteria:
- النصوص المحددة في طلب المستخدم تظهر للحالات المناسبة.
- member يعرف لماذا يرى/لا يرى القرار أو الطلب.

### Test Cases:
Playwright for active, conditional, supporter-only, suspended, multi-entity.

### Risk if skipped:
يبقى المنتج غير مفهوم.

### Task ID: BLK-P4-001

### Title:
Add governance explanation and decision effect panels.

### Priority:
High

### Type:
Feature / Governance / UX

### Description:
حول مسارات الحوكمة من enum إلى شرح، وأضف Decision Effect Panel يشرح الأثر قبل وبعد القرار.

### Why it matters:
القرار بلا أثر مفهوم يصبح تصويتاً شكلياً.

### Scope:
Decisions, Path Detail, Wallet Detail.

### Out of scope:
محرك قواعد كامل جديد.

### Files likely affected:
`frontend/src/app/(main)/decisions/page.tsx`, `paths/[id]`, `wallets/[id]`, locales, backend decision DTO/response.

### Dependencies:
P3 summary, Seed stories.

### Acceptance Criteria:
- كل قرار يعرض ما سيتغير.
- كل مسار يعرض قواعده بلغة بشرية.

### Test Cases:
Playwright + API response tests.

### Risk if skipped:
التصويت والحوكمة غير مفهومين.

### Task ID: BLK-P5-001

### Title:
Improve financial action clarity and safety.

### Priority:
High

### Type:
Finance / UX / Backend / Test

### Description:
كل إجراء مالي يعرض مصدر المال ووجهته والقرار والأثر المتوقع، ويمنع التكرار والدفعات السالبة والصرف فوق الرصيد.

### Why it matters:
المال هو أعلى منطقة حساسية بعد الصلاحيات.

### Scope:
Finance, disbursement, ledger, payment records.

### Out of scope:
تكامل دفع خارجي جديد.

### Files likely affected:
`finance/page.tsx`, `disbursement-requests`, `ledger.service.ts`, `subscriptions.service.ts`.

### Dependencies:
P0 disbursement fixes.

### Acceptance Criteria:
- preview قبل الحفظ.
- double click لا ينشئ قيداً مكرراً.
- رسائل مالية واضحة.

### Test Cases:
Unit/e2e/Playwright negative cases.

### Risk if skipped:
سوء فهم أو خطأ مالي.

### Task ID: BLK-P6-001

### Title:
Convert audit logs into a readable timeline.

### Priority:
High

### Type:
Audit / Feature / UX / Backend

### Description:
أنشئ API وواجهة timeline تعرض من فعل ماذا ومتى وعلى أي سجل، مع before/after وروابط وفلاتر وتصدير.

### Why it matters:
المدقق والنزاعات يحتاجون قصة لا raw IDs.

### Scope:
Auditor API/UI, audit event enrichment, seed timeline.

### Out of scope:
نظام BI كامل.

### Files likely affected:
`backend/src/auditor/*`, `frontend/src/app/(main)/auditor/*`, docs.

### Dependencies:
P0 audit events, seed dispute timeline.

### Acceptance Criteria:
- قصة نزاع كاملة قابلة للقراءة.
- فلاتر user/entity/type/date/severity.
- export basic.

### Test Cases:
API snapshots + Playwright auditor.

### Risk if skipped:
التدقيق غير عملي.

### Task ID: BLK-P7-001

### Title:
Page-by-page UX pass for all audited interfaces.

### Priority:
Medium

### Type:
UX / Frontend / Test

### Description:
نفذ جدول Phase 7 لكل صفحة: Dashboard, Entities, Entity Detail, Entity Settings, Members, Wallets, Wallet Detail, Path Detail, Portal/Subscriptions, Finance, Review Center, Disbursement Requests, Decisions, Disputes, Auditor, Notifications, Search.

### Why it matters:
التقرير ذكر ملاحظات صغيرة على كل واجهة لا يجوز إسقاطها.

### Scope:
Visible text, CTAs, empty states, success/failure, mobile.

### Out of scope:
إعادة تصميم هوية كاملة.

### Files likely affected:
All listed frontend pages and locales.

### Dependencies:
P0/P3/P4/P5/P6.

### Acceptance Criteria:
- لا raw enum كشرح وحيد.
- لا empty state مبهم.
- كل صفحة تملك CTA أساسي وخطوة تالية.

### Test Cases:
Playwright role audit + focused specs.

### Risk if skipped:
تجربة متقطعة رغم إصلاح المنطق.

### Task ID: BLK-P8-001

### Title:
Arabic domain glossary, tooltips, and validation error translation.

### Priority:
Medium

### Type:
UX / Documentation / Frontend / Backend

### Description:
أضف مصطلحات وشروحات قصيرة ورسائل أخطاء عربية موحدة، خصوصاً للـ validation errors.

### Why it matters:
المستخدم العادي لا يجب أن يرى رسائل تقنية أو مصطلحات بلا سياق.

### Scope:
Glossary, tooltip copy, backend exception filter or frontend error mapper.

### Out of scope:
دليل تدريبي طويل داخل التطبيق.

### Files likely affected:
locales, API fetch wrapper, backend validation pipe/exception filter.

### Dependencies:
لا شيء.

### Acceptance Criteria:
- رسالة اسم المحفظة بالعربية.
- 429/403/500 بالعربية.
- المصطلحات الأساسية لها tooltip أو help text.

### Test Cases:
Unit error mapper + Playwright invalid forms.

### Risk if skipped:
احتكاك وفهم ضعيف.

### Task ID: BLK-P9-001

### Title:
Negative and dangerous scenario test suite.

### Priority:
High

### Type:
Test / Security / Finance / Permission

### Description:
حول جدول Phase 9 إلى اختبارات API وPlaywright تغطي الصلاحيات، المال، الروابط المباشرة، الجوال، الضغط المزدوج، انقطاع الاتصال، 429/403/500.

### Why it matters:
السيناريوهات السلبية تكشف العيوب الحقيقية.

### Scope:
Backend e2e, frontend Playwright, fault injection where practical.

### Out of scope:
اختبارات أداء واسعة.

### Files likely affected:
backend test/e2e, frontend scripts/tests.

### Dependencies:
P1 throttle, P2 seed stories.

### Acceptance Criteria:
- كل حالة في Phase 9 لها test أو documented manual test.
- فشل API لا يكون صامتاً.

### Test Cases:
كما في جدول Phase 9.

### Risk if skipped:
ثغرات تظهر بعد التجريبي.

### Task ID: BLK-P10-001

### Title:
Production readiness documentation updates.

### Priority:
Medium

### Type:
Documentation

### Description:
أنشئ أو حدّث وثائق فلسفة المنتج، المصطلحات، workflow الصرف، seed stories، تشغيل الاختبارات، DB identity، حسابات الاختبار، Audit Timeline.

### Why it matters:
المطور أو Agent التالي يحتاج مرجعاً لا يعتمد على الذاكرة.

### Scope:
Docs listed in Phase 10.

### Out of scope:
موقع توثيق عام.

### Files likely affected:
`Docs/01_Product`, `Docs/02_Domain`, `Docs/03_Workflows`, `Docs/08_Production_Readiness`.

### Dependencies:
بعد تنفيذ أو أثناء تنفيذ المراحل.

### Acceptance Criteria:
- كل قرار/سلوك مهم موثق.
- known limitations محدثة.
- test runbook واضح.

### Test Cases:
Docs review checklist.

### Risk if skipped:
تكرار الأسئلة والقرارات المتضاربة.

---

## Small But Important Items

- تعريب رسائل validation التقنية مثل `name must be longer than or equal to 2 characters`.
- Tooltips للمصطلحات: كيان، محفظة، مسار، نطاق استفادة، داعم فقط، عضو مشروط.
- Empty states للكيان الجديد، المحفظة بلا مشتركين، المسار بلا اشتراكات، لا قرارات، لا نزاعات.
- Breadcrumbs هرمية: كيان / محفظة / مسار / بند.
- Global error banner لـ 429/403/500 وفشل API الصامت.
- أسماء بشرية بدل enum في الواجهة.
- before/after في audit timeline.
- روابط للسجلات المرتبطة: decision, disbursement, appeal, dispute, document.
- نصوص "لماذا يظهر لك هذا؟" في dashboard/path/decision/payment.
- تجميع Dashboard حسب كيان/محفظة/مسار.
- عرض الخطوة التالية بعد النجاح.
- حماية من الضغط المزدوج على أزرار الحفظ/الاعتماد/التنفيذ.
- توضيح أثر التأخر في الدفع على الاستفادة والتصويت.
- توضيح سبب رفض الطلب وخطوة العضو التالية.
- توضيح سبب عدم الأهلية للتصويت أو الاستفادة.
- استمرار mobile UX كجزء من كل فحص.
- تثبيت search permission filtering باختبار regression.
- Notifications matrix لكل event مهم.
- تسجيل failed notification logging.
- تسجيل failed authorization للأحداث الحساسة.
- تسجيل validation failures المالية.
- التأكد أن كل قرار مالي يربط المسار والبند والمبلغ.
- لا تعرض زر مالي إن لم تكتمل شروطه.
- توثيق fallback عندما لا يتاح المتصفح الداخلي واستخدام Playwright.
- تحويل نقاط القوة إلى guardrails: ledger balanced, roles represented, payment states covered, Playwright audit available.

---

## ترتيب التنفيذ المقترح

### ماذا ننفذ أولاً؟

1. Phase 0 بالكامل: الصرف والقرار والرسائل والحالات العالقة والاختبارات.
2. Phase 1: DB identity و429 وPlaywright 18/18.
3. Phase 2: Seed stories الأساسية التي تحتاجها اختبارات Phase 3-9.

### ماذا لا يجوز تأجيله؟

- كل Critical.
- `seed:validate`/DB identity mismatch.
- 429 الذي يمنع فحص الأدوار.
- حقوق/التزامات العضو الأساسية.
- Audit للأحداث المالية الفاشلة.

### ماذا يمكن تأجيله؟

- export المتقدم للمدقق بعد وجود timeline أساسي.
- علاقات كيانات معقدة جداً بعد قصص seed الأساسية.
- تحسينات تجميلية لا تغير فهم الحق/الالتزام.
- توثيق موسع غير مانع، بشرط وجود runbooks الأساسية.

### ماذا يجب اختباره بعد كل مرحلة؟

- بعد Phase 0: backend unit/e2e للصرف + Playwright focused Review Center/Disbursement Requests.
- بعد Phase 1: `npm run seed:validate` على DB الصحيحة + `npm run test:ux:roles` 18/18.
- بعد Phase 2: seed reset + validate coverage + smoke logins.
- بعد Phase 3/4: Playwright لكل حالات العضوية والحوكمة.
- بعد Phase 5: اختبارات مالية سلبية وإيجابية.
- بعد Phase 6: audit timeline scenario.
- بعد Phase 7/8: role audit desktop/mobile.
- بعد Phase 9: negative scenario suite.
- بعد Phase 10: docs review checklist.

### متى نعيد تشغيل التدقيق الكامل؟

بعد Phase 0 وPhase 1 مباشرة للتأكد من أن قاعدة الاختبار سليمة، ثم مرة ثانية بعد Phase 2 وPhase 3 لأن seed وتجربة العضو ستتغير جذرياً، ثم تدقيق كامل أخير بعد Phase 9.

### متى نعتبر التقرير مغلقاً؟

لا يعتبر تقرير التدقيق مغلقاً إلا إذا:

- تم إصلاح كل Critical.
- تم إصلاح كل High أو توثيق سبب تأجيله بقرار واضح.
- تم إنشاء Seed قصصي يغطي السيناريوهات الأساسية.
- مر فحص الأدوار كاملاً 18/18.
- أصبحت رحلة الصرف مرتبطة بقرار حوكمي صحيح.
- ظهرت الحقوق والالتزامات بوضوح للمستخدم.
- أصبح Audit Log قابلاً للقراءة كـ Timeline.
- تمت إضافة اختبارات للحالات السلبية والخطرة.
- تمت مراجعة الواجهات الأساسية صفحة بصفحة.
- تمت معالجة الملاحظات الصغيرة أو إدراجها في Backlog واضح.
