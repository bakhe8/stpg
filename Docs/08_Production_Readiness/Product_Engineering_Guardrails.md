# Product & Engineering Guardrails

هذه guardrails تحول نقاط القوة الحالية في CollectiveTrustOS إلى قواعد حماية لا تضيع مع التطوير.

## G-001 Ledger First

لا يتم تعديل الأرصدة المالية مباشرة خارج LedgerService والقيود المزدوجة.

اختبار الحماية:

- `backend/src/ledger/ledger.service.spec.ts`
- `backend/src/financial-boundaries.spec.ts` إن وجد في الجولة الحالية
- أي مسار صرف يجب أن يربط القرار، المسار، الحساب، وسجل التدقيق.

## G-002 Governance Before Money

أي صرف أو نقل رصيد يجب أن يتحقق من القرار الحوكمي الصحيح قبل الرصيد.

اختبار الحماية:

- اختبار "validates the governance decision before reporting insufficient balance".
- Playwright focused على Review Center وDisbursement Requests عند تغيير واجهات الصرف.

## G-003 Rights Are Relationship-Based

لا تعرض واجهة العضو الحقوق كعضوية عامة فقط. العلاقة الأساسية هي:

```text
عضو -> كيان -> محفظة -> مسار حوكمة -> اشتراك فعال -> حقوق والتزامات
```

اختبار الحماية:

- Dashboard / Entities / Entity Detail / Wallet Detail / Path Detail / Portal / Subscriptions.
- حسابات: active, conditional, supporter-only, suspended, multi-entity.

## G-004 Seed Stories, Not Random Rows

بيانات الاختبار يجب أن تحكي قصص تشغيل:

- عائلة بسيطة.
- عائلة معقدة.
- عمارة shared benefit مع free-riders.
- حملة مؤقتة.
- كيان فارغ day-one.
- عضو متعدد الكيانات.
- نزاع واعتراض timeline.

اختبار الحماية:

- `backend/prisma/seed-stories.ts`
- `npm run seed:validate:docker`
- Playwright role audit.

## G-005 Role Coverage Must Stay 18/18

لا يغلق بند صلاحيات إذا فشل أحد حسابات UX role audit.

اختبار الحماية:

```powershell
cd frontend
npm run test:ux:roles
```

معيار النجاح: 18/18، 0 issues، وdesktop/mobile.

## G-006 Audit Log Is A Timeline

Audit Log يجب أن يبقى قابلاً للقراءة كـ timeline، لا raw table.

يجب أن يحتوي:

- actor.
- context.
- effect.
- severity.
- linked records.
- before/after.
- failure events المهمة.

اختبار الحماية:

- `backend/src/auditor/auditor.service.spec.ts`
- فحص Playwright لصفحة Auditor tab Audit Logs.

## G-007 Permission Filtering After Search

OpenSearch ليس مصدر ثقة للصلاحيات. يجب فلترة النتائج بعد البحث حسب عضويات المستخدم.

اختبار الحماية:

- `backend/src/search/search.service.spec.ts`
- API search لحساب متعدد الكيانات يجب ألا يعيد كياناً خارج عضوياته.

## G-008 Provider Mock Is Not Production

أي mock payment provider أو dev login أو test throttle profile يجب ألا يعتبر جاهزية إنتاج.

اختبار الحماية:

- production smoke يتأكد من تعطيل Developer Login.
- اختبار provider live/sandbox قبل الإنتاج العام.
- توثيق known limitations في Deployment Decisions.

## G-009 UX Evidence Is Required

الـ build لا يكفي لإغلاق أي تغيير واجهة.

يجب توفير واحد على الأقل:

- Playwright screenshot.
- console health.
- mobile overflow check.
- interaction proof.

مرجع التشغيل: `Docs/08_Production_Readiness/Test_Runbook.md`.

## G-010 Complexity Stays Behind The System

CollectiveTrustOS ليس Excel بواجهة أجمل. أي واجهة يومية يجب أن تعرض نتيجة عمل النظام، لا بنية النظام الداخلية.

هذا ليس مشروع إعادة تسمية أو إضافة شرح. تغيير `Entity` إلى "صندوق" أو `Wallet` إلى "مساهمة" لا يحقق هذا الـ guardrail إذا بقيت نفس بنية النظام ظاهرة للمستخدم.

القاعدة الحاكمة:

```text
أي معلومة لا تساعد المستخدم على قرار أو إجراء الآن
لا تظهر في الواجهة الأساسية.
```

تطبيق الحماية:

- العضو العادي لا يرى Audit / Finance / Governance / Wallets / Paths كواجهة يومية.
- المدير يرى الاستثناءات التي تحتاج تدخلًا، لا كل تفاصيل التشغيل.
- أمين الصندوق يرى المطابقة والفشل والتنفيذ المالي المطلوب، لا كل ledger افتراضياً.
- المدقق يرى المخاطر والتسلسل عند الحاجة، لا raw logs كجدول يومي.
- الباك إند يجب أن ينتج سطح عمل حسب الدور والحالة بدلاً من ترك الواجهة تجمع أجزاء النظام وتفسرها.
- الأدوات العميقة تُخفى افتراضياً وتظهر حسب الدور أو الحاجة أو الاستثناء أو الوضع المتقدم.
- أي تغيير يضيف Tooltips أو بطاقات أو أسماء ألطف مع إبقاء نفس الزحمة يعتبر غير مطابق لهذا guardrail.

اختبار الحماية:

- Dashboard يجب أن يجيب: ماذا علي؟ ماذا أستفيد؟ هل يوجد مطلوب؟ ماذا حدث ويهمني؟
- فحص UX role audit يجب أن يتحقق أن كل دور يرى ما يحتاجه فقط.
- أي رابط عميق يجب أن يكون أداة متقدمة حسب الدور أو يظهر بسبب حاجة واضحة.
- مراجعة PR يجب أن تسأل: ما الذي اختفى من الواجهة اليومية؟ وما القرار الذي صار النظام يحسمه بدلاً من المستخدم؟

المراجع التفصيلية:

- `Docs/04_User_Interfaces/Product_Experience_Principles.md`
- `Docs/04_User_Interfaces/Surface_Implementation_Spec.md`
