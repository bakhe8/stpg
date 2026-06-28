# تقرير تنفيذ تدقيق منطق العمل وجاهزية الإنتاج

**التاريخ:** 2026-06-27  
**آخر تحديث:** 2026-06-28
**النطاق:** `C:\Users\Bakheet\Projects\CollectiveTrustOS\STGP` على `main`  
**حالة مجلد hotfix:** تم حذف `STGP-v1-hotfix` ولم يعد مرجع عمل.  
**الغرض:** دمج تقريري التدقيق السابقين في سجل تنفيذ واحد، ثم توثيق ما تم إغلاقه وما بقي كتشغيل إنتاجي خارجي.

---

## 1. الخلاصة التنفيذية

تم تنفيذ كل بنود الكود الحرجة والعالية والمتوسطة التي وردت في تقريري التدقيق:

1. تم إلغاء مسار `/transfers` العام الذي كان يحرك أرصدة مالية خارج الدفتر الرسمي.
2. تم تشديد TenantContext و RLS ضد حقن SQL، وضد اختيار كيان من العميل بلا عضوية.
3. تم فصل مستخدم التطبيق في الإنتاج عن مستخدم `postgres` صاحب الصلاحيات العليا.
4. تم تحويل OAuth من ثقة في body إلى تحقق ID token حقيقي لـ Google و Apple.
5. تم تحويل Stripe/Moyasar من mock إنتاجي خطير إلى تكامل حقيقي عند وجود الأسرار، مع رفض mock في production.
6. تم تأمين support sessions و auditor و search و generate-dues.
7. تم تشديد balance transfer requests وربط التنفيذ بقرار موثق و `LedgerService`.
8. تم جعل entity support يتطلب قراراً واتجاهاً صحيحاً لعلاقة الدعم المالي.
9. تم تنظيف lint للواجهة والخلفية، وإضافة اختبارات regression و E2E للمخاطر الأمنية.
10. تم تحديث Docker/Caddy/TLS وإضافة OpenSearch و Temporal وسكربتات restore و production smoke.
11. تم تشغيل تجربة حسابات seed حسب الأدوار، وإغلاق تعارضين ظهرا أثناء الاختبار:
    - `SuspendedEntityGuard` كان لا يطبق حالة `READ_ONLY/SUSPENDED` على مسارات تبدأ بـ `/api`.
    - الواجهة كانت تعرض صفحة auditor لأمين الصندوق رغم أن API auditor يرفضه.

**القرار النهائي:** من ناحية الكود والإعدادات، بنود التقرير مغلقة. من ناحية الإنتاج الفعلي، لا يزال يلزم إدخال أسرار الإنتاج وتشغيل اختبارات live مع Stripe/Moyasar و OAuth/DNS/TLS، ثم تشغيل smoke الإنتاجي بعد النشر قبل فتح النظام للعامة.

---

## 2. ملخص الحالة حسب الأولوية

| الرقم | البند | الحالة | نتيجة التنفيذ |
|---|---|---|---|
| P0-01 | إغلاق `/transfers` العام | منجز | حذف module والملفات، وإضافة E2E يثبت أن المسار 404 |
| P0-02 | إصلاح TenantContext/RLS | منجز | UUID validation، عضوية نشطة، `set_config` آمن، migration RLS، app DB role |
| P0-03 | إصلاح OAuth | منجز | Google/Apple ID token verification، JWKS cache، issuer/audience/exp/signature/email_verified |
| P0-04 | إصلاح payment webhooks | منجز كودياً | Stripe signed webhooks، Moyasar `secret_token`، metadata/amount/currency/idempotency |
| P1-01 | حصر المال في ledger | منجز | اختبار حارس يمنع تحديث `ledgerAccount.balance` أو `ledgerTransaction` خارج `LedgerService` |
| P1-02 | balance-transfer-requests | منجز | JWT guard، enum runtime، decision required، execution عبر ledger |
| P1-03 | entity support | منجز | decision required، قرار مغلق وموافق، مبلغ واتجاه علاقة صحيح |
| P1-04 | اختبارات invariants المالية | منجز | `financial-boundaries.spec.ts` + اختبارات service |
| P2-01 | auditor permissions | منجز | AUDITOR/ADMIN/FOUNDER داخل الكيان فقط |
| P2-02 | support sessions | منجز | إنشاء/إلغاء platform فقط، قراءة بعضوية، audit log |
| P2-03 | search privacy | منجز | فلترة نتائج الكيانات حسب عضويات المستخدم النشطة |
| P2-04 | generate-dues authorization | منجز | ADMIN/TREASURER/FOUNDER فقط داخل كيان الاشتراك |
| P3-01 | AppService tests | منجز | spec محدث وناجح |
| P3-02 | backend lint | منجز | `npm run lint` ينجح |
| P3-03 | frontend lint | منجز | `npm run lint` ينجح |
| P3-04 | docs status | منجز | هذا التقرير و README محدثان |
| P3-05 | TLS/Caddy | منجز إعدادياً | Caddy domain + فتح 80/443 |
| P3-06 | JWT invitation secret | منجز | استخدام `getAccessTokenSecret()` |
| P3-07 | Seed role UI/API smoke | منجز | 11 حساب اختبار، 30 فحص API، و Playwright role smoke بدون أخطاء console/API |
| P3-08 | OpenSearch/Temporal/Restore/Smoke | منجز إعدادياً | خدمات داخلية + سكربت restore + smoke إنتاجي |
| P3-09 | UX/UI rendered audit | منجز | Playwright desktop/mobile، 11 حساب seed، دخول مطورين فعلي، role journeys، وإصلاحات لمس/موبايل |

---

## 3. ما تم بنداً بنداً

### BL-01 - عزل الكيانات و RLS

**الخطر الأصلي:** `x-entity-id` أو `query.entityId` كان يأتي من العميل ويصل إلى SQL عبر `$executeRawUnsafe`، مع اتصال production كمستخدم `postgres`.  
**الحالة:** منجز.

**التنفيذ:**

1. `TenantContextInterceptor` يقبل UUID فقط.
2. لا يسمح بسياق كيان من طلب غير مصادق.
3. يتم التحقق من عضوية tenant النشطة قبل ضبط سياق الكيان.
4. تم استبدال `$executeRawUnsafe` باستدعاءات `$executeRaw` parameterized.
5. تمت إضافة `personId`, `platformAccountId`, `internalAccess` إلى سياق Prisma.
6. تمت إضافة `runInternal` للمهام والحراس التي تحتاج قراءة نظامية مضبوطة.
7. تمت إضافة migration `20260627160000_harden_rls_context` لإزالة سماح السياق الفارغ وتفعيل `FORCE ROW LEVEL SECURITY`.
8. تم تعديل `docker-compose.prod.yml` ليستخدم التطبيق `DB_APP_USER/DB_APP_PASSWORD` بدلاً من `postgres`.
9. تمت إضافة `deploy/postgres/init-app-role.sh` لإنشاء/تحديث مستخدم التطبيق ومنحه الصلاحيات اللازمة.

**التحقق:**

- تم تطبيق migrations من الصفر على PostgreSQL 16 مؤقت.
- بلا سياق: لا تظهر بيانات tenant-scoped.
- بسياق tenant A: تظهر بيانات tenant A فقط.
- بسياق منصة/داخلي: تظهر البيانات المطلوبة للمهام النظامية.

### BL-02 - مسار التحويل المالي العام `/transfers`

**الخطر الأصلي:** endpoint عام بلا guard يخصم ويضيف أرصدة مباشرة وينشئ معاملات بلا ledger entries متوازنة.  
**الحالة:** منجز.

**التنفيذ:**

1. حذف `backend/src/transfers/*`.
2. إزالة `TransfersModule` من `AppModule`.
3. حذف `executeTransfer` من `frontend/src/lib/api/wallets.ts`.
4. إزالة نموذج التحويل المباشر من صفحة المحفظة.
5. إضافة E2E يؤكد أن `POST /transfers` غير موجود.
6. إضافة اختبار مالي يمنع إعادة إدخال module أو تحديث الرصيد خارج `LedgerService`.

**بديل الواجهة الرسمي:**

- تمت إضافة API frontend لـ `balance-transfer-requests`.
- صفحة المحفظة تعرض الآن نموذج طلب تحويل رسمي.
- الطلب لا يحرك المال مباشرة، بل يدخل دورة request/review/decision/ledger.

### BL-03 - OAuth

**الخطر الأصلي:** `POST /auth/oauth` كان يثق بـ `providerId` و `email` من body ويمكنه إنشاء مستخدم verified.  
**الحالة:** منجز.

**التنفيذ:**

1. DTO أصبح يقبل `provider` و `idToken` فقط مع `name` اختياري.
2. Google و Apple مدعومان عبر ID token.
3. يتم التحقق من:
   - JWT structure.
   - `RS256` و `kid`.
   - issuer.
   - audience/client ID من env.
   - expiration و not-before.
   - signature عبر JWKS.
   - `email_verified` قبل إنشاء أو ربط حساب جديد.
4. لا يتم إنشاء حساب verified من email مرسل في body.
5. تمت إضافة cache لـ JWKS حسب `cache-control`.
6. تمت إضافة متغيرات البيئة:
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `APPLE_OAUTH_CLIENT_ID`
   - بدائل compatibility: `GOOGLE_CLIENT_ID`, `APPLE_CLIENT_ID`, `APPLE_BUNDLE_ID`

**اختبارات مضافة:**

- رفض token بتوقيع غير صحيح.
- رفض audience غير مسموح.
- رفض بريد غير verified.

### BL-04 - الدفع و Webhooks

**الخطر الأصلي:** Stripe/Moyasar كانا mock، و webhook verification كان يقبل payload دون توقيع حقيقي، و createIntent لم يحم ملكية due بما يكفي.  
**الحالة:** منجز كودياً، ويبقى اختبار live مع مزودي الدفع قبل الإنتاج.

**التنفيذ:**

1. `NestFactory.create` يعمل مع `rawBody: true` حتى يتحقق Stripe من التوقيع على النص الأصلي.
2. Stripe:
   - ينشئ PaymentIntent حقيقي عند وجود `STRIPE_SECRET_KEY`.
   - يرسل metadata تشمل `paymentDueId` و `userId`.
   - يستخدم `Idempotency-Key`.
   - يتحقق من `Stripe-Signature` عبر HMAC SHA256 وتسامح 5 دقائق.
   - يرفض mock في production إذا غاب `STRIPE_SECRET_KEY` أو `STRIPE_WEBHOOK_SECRET`.
3. Moyasar:
   - ينشئ invoice حقيقي عبر `/invoices` عند وجود `MOYASAR_SECRET_KEY`.
   - يرسل metadata و callback URL.
   - يتحقق من `secret_token` عبر `MOYASAR_WEBHOOK_SECRET`.
   - يرفض mock في production إذا غابت الأسرار.
4. `PaymentsService`:
   - يتحقق أن `PaymentDue` يخص المستخدم الحالي.
   - ينشئ/يحدث `PaymentRecord` بحالة `PROCESSING`.
   - يطابق webhook مع `gatewayTransactionId`.
   - يطابق `paymentDueId`, `amount`, `currency`.
   - يستخدم `updateMany` بحالة `PROCESSING` لمنع replay وتكرار الأثر.

**ملاحظة إنتاجية:** يلزم في لوحة Stripe و Moyasar ضبط webhooks إلى:

- `/api/payments/webhook/stripe`
- `/api/payments/webhook/moyasar`

ثم تشغيل معاملات live أو sandbox حقيقية للتأكد من تطابق payload النهائي مع مزود الخدمة.

### BL-05 - Auditor

**الخطر الأصلي:** بعض قراءات auditor كانت تعتمد JWT فقط وتقرأ بيانات عامة أو entityId من الرابط دون تحقق دور داخل الكيان.  
**الحالة:** منجز.

**التنفيذ:**

1. كل endpoints تتحقق من دور `AUDITOR`, `ADMIN`, أو `FOUNDER`.
2. `getOperations` أصبح tenant-scoped.
3. التقرير والمستندات والقرارات والسجلات محصورة بالكيان المسموح.

### BL-06 - Support sessions

**الخطر الأصلي:** support endpoints كانت عامة، والواجهة ترسل `platformAccountId: "ADMIN"`.  
**الحالة:** منجز.

**التنفيذ:**

1. إنشاء وإلغاء الجلسات يتطلب `JwtGuard` و `PlatformGuard`.
2. `platformAccountId` يؤخذ من حساب المنصة المصادق، لا من body.
3. قراءة الجلسات تتطلب JWT، وتسمح لمنصة أو عضو tenant نشط في الكيان.
4. create/revoke يكتبان audit log.
5. تمت إزالة أزرار create/revoke من واجهة tenant.

### BL-07 - Balance transfer requests

**الخطر الأصلي:** controller بلا `JwtGuard`، و `status` يقبل أي string، والتنفيذ قد يتجاوز decision موثق.  
**الحالة:** منجز.

**التنفيذ:**

1. إضافة `JwtGuard`.
2. `ReviewTransferDto.status` أصبح enum runtime.
3. اعتماد `INDIVIDUAL_WITH_CAP` ينشئ قرار `TRANSFER_BALANCE` مغلقاً وموافقاً فقط داخل السقف.
4. سياسات التصويت تنشئ قراراً مفتوحاً ولا يسمح التنفيذ حتى يغلق ويوافق.
5. التنفيذ يرفض أي طلب بلا `decisionId`.
6. التنفيذ يستدعي `LedgerService.recordTransfer` ولا يغير الأرصدة مباشرة.
7. الاعتماد والرفض والتنفيذ تكتب audit logs.

### BL-08 - Entity support

**الخطر الأصلي:** دعم كيان لكيان آخر كان يقبل `decisionId` اختيارياً واتجاه علاقة معكوسة.  
**الحالة:** منجز.

**التنفيذ:**

1. `decisionId` أصبح مطلوباً.
2. القرار يجب أن يكون مغلقاً وموافقاً.
3. القرار يجب أن يطابق الكيان/المسار المصدر.
4. إذا كان للقرار مبلغ، يجب أن يطابق مبلغ الدعم.
5. علاقة `FINANCIAL_SUPPORT` أصبحت اتجاهية ولا تقبل العكس.

### BL-09 - Search

**الخطر الأصلي:** search قد يعيد نتائج كيانات لا ينتمي لها المستخدم.  
**الحالة:** منجز.

**التنفيذ:**

1. البحث عن الكيانات يجلب عضويات المستخدم النشطة.
2. OpenSearch filter يستخدم الكيانات المسموحة فقط.
3. تم تقليل حقول الفهرسة الحساسة، ومنها عدم تمرير `nationalId`.

### BL-10 - Generate dues

**الخطر الأصلي:** endpoint له side effect على مستحقات اشتراك دون صلاحية كافية.  
**الحالة:** منجز.

**التنفيذ:**

1. controller يمرر المستخدم الحالي.
2. service يتحقق من `ADMIN`, `TREASURER`, أو `FOUNDER` داخل كيان الاشتراك.
3. helper الداخلي بقي متاحاً للمهام المجدولة عبر سياق داخلي مضبوط.

### BL-11 - الجودة والاختبارات

**الخطر الأصلي:** build كان ينجح لكن lint والاختبارات لم تكن تغطي ثغرات الأمان والمال.  
**الحالة:** منجز.

**التنفيذ:**

1. backend lint ينجح.
2. frontend lint ينجح.
3. backend build ينجح.
4. frontend build ينجح.
5. app e2e يغطي routes المحمية والثغرات المغلقة.
6. تمت إضافة اختبارات OAuth، payments، financial boundaries، balance transfer.

### BL-12 - JWT الدعوات

**الخطر الأصلي:** دعوات الانضمام كانت تستخدم fallback secret مختلفاً عن `JwtStrategy`.  
**الحالة:** منجز.

**التنفيذ:**

1. `InvitationsModule` يستخدم `getAccessTokenSecret()`.
2. لا يوجد divergence بين token الدعوة و strategy في التطوير.

### BL-13 - TLS/Caddy

**الخطر الأصلي:** Caddy كان على `:80` فقط رغم وعد TLS، و compose يفتح 3080 بدلاً من 80/443.  
**الحالة:** منجز إعدادياً.

**التنفيذ:**

1. `Caddyfile` يستخدم الدومين الإنتاجي.
2. `docker-compose.prod.yml` يفتح `80:80`, `443:443`, و `443:443/udp`.
3. `NEXT_PUBLIC_API_URL` و `FRONTEND_PUBLIC_URL` موجودان في إعدادات الإنتاج.
4. `/health` العام يمر عبر Caddy إلى الباك إند لا إلى الواجهة.

### BL-14 - تجربة حسابات الاختبار حسب الصلاحيات

**الهدف:** التحقق من أن الواجهات والمسارات تتغير حسب الدور ونوع الكيان وحالة الاشتراك والمنصة.
**الحالة:** منجز.

**ما ظهر أثناء الاختبار وتم إصلاحه:**

1. `SuspendedEntityGuard` كان يعتمد على أول جزء من `originalUrl` لتحديد المورد. مع `app.setGlobalPrefix('api')` أصبح أول جزء هو `api` لا `entities` أو `wallets`، فكانت محاولة كتابة على كيان `READ_ONLY` تصل إلى DTO validation وتعود 400 بدلاً من 403. تم تطبيع المسار بإزالة `/api` قبل resolution، وأضيف اختبار regression.
2. `OVERSIGHT_ROLES` في الواجهة كان يشمل `TREASURER` ويستخدم أيضاً لصفحة auditor. هذا أظهر رابط auditor لناصر، بينما backend auditor يسمح فقط لـ `AUDITOR`, `ADMIN`, `FOUNDER`. تم إضافة `AUDITOR_ROLES` واستخدامه في AppShell وصفحة auditor، مع بقاء treasurer في analytics/finance.
3. بيانات خالد ليست عضوية معلقة؛ عضويته نشطة، لكن لديه subscription بحالة `SUSPENDED` في مسار `مجلس طوارئ الأسرة`. لذلك يظهر له تنبيه الاشتراك المعلق في Dashboard كما هو متوقع.

**نتيجة الاختبار:**

1. دخول المطورين عبر `/login` نجح لحساب أحمد الهاشمي.
2. كل الحسابات الـ 11 نجحت في `/dashboard` و `/entities`.
3. API role smoke: 30/30.
4. Playwright role smoke:
   - 11/11 nav checks حسب الدور.
   - لا توجد console errors.
   - لا توجد failed API responses غير متوقعة.
   - desktop screenshots للحالات المميزة.
   - mobile smoke لأحمد وفيصل.

### BL-15 - OpenSearch و Temporal و Restore/Smoke

**الهدف:** إكمال بنية التشغيل المطلوبة حول البحث وسير العمل، وإضافة مسار استعادة وفحص إنتاجي قابل للتكرار.
**الحالة:** منجز إعدادياً.

**التنفيذ:**

1. تمت إضافة `opensearch` إلى `docker-compose.yml` و `docker-compose.prod.yml`.
2. تمت إضافة `temporal` إلى `docker-compose.yml` و `docker-compose.prod.yml` باستخدام PostgreSQL persistence.
3. تم تمرير `OPENSEARCH_NODE` و `TEMPORAL_ADDRESS` إلى الباك إند.
4. تم إضافة dynamic config لـ Temporal في `deploy/temporal/dynamicconfig/development-sql.yaml`.
5. تم تحديث `.env.example` و `.env.production.example` بقيم البحث وسير العمل.
6. تم تحديث `backup.sh` ليولد dump قابل للاستعادة بـ `--clean --if-exists --no-owner --no-privileges`.
7. تمت إضافة `restore.sh` مع حماية `CONFIRM_RESTORE=stgp_prod` قبل أي عملية هدم/استعادة.
8. تمت إضافة `production-smoke.sh` لفحص الواجهة، health، docs-json، تعطيل dev-login، OpenSearch، و Temporal.
9. تم تحديث `deploy.sh` لتثبيت سكربتات backup/restore/smoke وتشغيل smoke بعد النشر.
10. تم ضبط OpenSearch بـ `DISABLE_SECURITY_PLUGIN=true` حتى لا يفشل installer في OpenSearch 2.17 بسبب غياب كلمة مرور admin داخل خدمة داخلية غير مكشوفة للعامة.
11. تم ضبط فحص Temporal على `temporal:7233` لأن الخدمة تستمع داخل الحاوية على عنوان الحاوية لا `localhost`.

### BL-16 - مراجعة الواجهات وتجربة المستخدم

**الهدف:** فحص الواجهة كمنتج مستخدم فعلياً، وليس فقط كـ API أو build.
**الحالة:** منجز.

**التنفيذ:**

1. تم تشغيل فحص Playwright على `/login` ثم دخول المطورين بحساب أحمد الهاشمي.
2. تم فحص 22 حالة واجهة عبر desktop و mobile للحسابات: أحمد، ليان، خالد، فيصل.
3. شمل الفحص صفحات: dashboard, entities, finance, review-center, auditor, analytics.
4. تم التحقق من عدم وجود blank pages أو Next.js error overlay أو failed API responses أو horizontal overflow.
5. تم إصلاح إظهار زر `دخول المطورين` محلياً في Docker، مع بقاء الإنتاج معطلاً.
6. تم تحسين قراءة عنوان الشريط العلوي على mobile.
7. تم تكبير أهداف اللمس الصغيرة في AppShell وروابط dashboard/login.
8. تم تهدئة الزخرفة داخل بطاقة الدخول حتى لا تزاحم العنوان.
9. تم تنفيذ جولة UX أعمق على مسارات تشغيلية فعلية: إنشاء كيان، الدفع/إثبات السداد، مركز المراجعات، صفحة أعضاء الكيان، طلبات الصرف، البحث العام، وحالات العضو المعلّق ومتعدد الكيانات.
10. تم إصلاح صفحة إنشاء الكيان على الجوال؛ كانت خطوة "قبل أن تبدأ" تجعل زر البدء ملاصقاً لشريط التنقل السفلي، فأضيفت مساحة أمان وتخفيض كثافة البطاقة على الشاشات الصغيرة.
11. تم تكبير روابط التنبيه في dashboard مثل `عرض الاشتراكات` و`الاشتراكات` من روابط نصية قصيرة إلى أهداف لمس بارتفاع 40px.
12. تم تكبير أزرار بنر حالة المنصة، وأزرار صفحة أعضاء الكيان، وأزرار طلبات الصرف إلى أهداف لمس لا تقل عن 40-44px.
13. تم إصلاح خطأ ترجمة مفقود في صفحة أعضاء الكيان: `entities.membersPage.timelineDecision`.
14. تم إصلاح نص عربي في صفحة المالية كان يحتوي حرفاً غير عربي داخل رسالة الدفع الإلكتروني.
15. تم إصلاح البحث العام: الواجهة كانت تتوقع مصفوفة بينما API يرجع كائناً مجمعاً `{ entities }`، فتم تطبيع الاستجابة وإضافة حالة `لا توجد نتائج مطابقة`.
16. تم جعل نتائج البحث أزراراً قابلة للوصول بالكيبورد بدلاً من `div` قابلة للنقر فقط.
17. تم إضافة fallback في backend search إلى Prisma عند فراغ/تعطل OpenSearch، مع بقاء فلترة العضوية النشطة قبل البحث.
18. تم ترجمة نتيجة البحث من أكواد مثل `FAMILY · ACTIVE` إلى نص واجهة مثل `عائلة · نشط`.
19. تم تنفيذ جولة role-based UX كاملة على 11 حساب seed عبر API والواجهة:
    - أحمد: `FOUNDER` على صندوق العائلة والحملة والمبادرة.
    - سارة: `ADMIN` على صندوق العائلة والمبادرة.
    - ناصر: `TREASURER` مع عضوية `MEMBER` إضافية في صندوق قبيلة السهم.
    - ليان: `AUDITOR`.
    - د. ماجد ونورة: `COMMITTEE_MEMBER` مع حالات تعدد كيان مختلفة.
    - فيصل: `MEMBER` في كيانين لاختبار التداخل.
    - خالد: `MEMBER` مع حالة اشتراك تحتاج انتباه في البوابة.
    - عبدالله: `FOUNDER` لكيانات العمارة.
    - يحيى: `FOUNDER` لكيان حي مع عضويات إضافية.
    - فهد: `MEMBER` في حملة علاج بحالة `READ_ONLY`.
20. تم فحص المسارات المحمية مقابل الدور:
    - `/review-center`, `/rules`, `/health` مسموحة فقط لـ `FOUNDER/ADMIN`.
    - `/analytics` مسموحة لـ `FOUNDER/ADMIN/TREASURER/AUDITOR`.
    - `/auditor` مسموحة لـ `FOUNDER/ADMIN/AUDITOR`.
    - `/committees` مسموحة لـ `FOUNDER/ADMIN/COMMITTEE_MEMBER`.
    - `/beneficiaries` مسموحة لـ `FOUNDER/ADMIN/TREASURER/AUDITOR/COMMITTEE_MEMBER`.
    - `/disbursements` مسموحة لـ `FOUNDER/ADMIN/TREASURER`.
21. نتيجة role-based UX: الأدوار غير المصرح لها تظهر لها رسالة منع واضحة، ولا تظهر صفحات الإدارة كواجهة قابلة للتشغيل.
22. تم فحص `/entities/:id/members` لكل فئة؛ غير الإداريين لا تظهر لهم أدوات تغيير الدور أو إزالة العضوية.
23. تم إصلاح أهداف لمس صغيرة إضافية في `/rules`:
    - tabs مثل `قواعد المسار` و`مصمم السياسة`.
    - أزرار القوالب مثل `إنشاء مباشر`, `تطبيق على النموذج`, `نسخة معدلة`.
    - أزرار النماذج داخل modal ومصمم السياسة.
24. تم إصلاح هدف لمس صغير في `/health` لقائمة اختيار الكيان.
25. تم تشغيل دخول مطورين حقيقي من `/login` على الجوال، وليس فقط حقن جلسة عبر API.
26. تم فحص الجوال بعرض 390px للحسابات: أحمد، ناصر، ليان، ماجد، فيصل، خالد، فهد، عبر `/dashboard`, `/portal`, `/review-center`, `/rules`, `/auditor`.
27. نتيجة فحص الجوال: لا horizontal overflow، لا Next.js overlay، لا small visible interactive targets، وحالات المنع تظهر في المسارات المحمية.
28. التحذير الوحيد المتبقي في console أثناء الجوال هو preload warning من Next.js لملف CSS، ولم يظهر معه فشل API أو كسر رحلة مستخدم.

---

## 4. الواجهة بعد إغلاق التحويل المباشر

تم استبدال تجربة التحويل الخطر بتجربة طلب رسمي:

1. صفحة المحفظة تحتوي نموذج طلب تحويل بين مسارين.
2. الطلب يرسل إلى `/balance-transfer-requests` مع `X-Entity-ID`.
3. الصفحة تعرض طلبات التحويل المرتبطة بالمسار المحدد.
4. لا توجد عملية في الواجهة تغير الرصيد مباشرة.

---

## 5. سجل التحقق

تم تشغيل هذه الفحوص أثناء التنفيذ:

```text
backend npm run lint                                                PASS
backend npm run build                                               PASS
backend npm test -- --runInBand                                     PASS - 21 suites / 75 tests
backend npm run test:e2e                                            PASS - 43 tests
backend npx prisma validate                                         PASS
frontend npm run lint                                               PASS
frontend npm run build                                              PASS
backend npm test -- --runInBand common/guards/suspended-entity.guard.spec.ts PASS - 2 tests
Seed API role smoke                                                  PASS - 30/30
Seed Playwright role smoke                                           PASS - 11/11 nav, 0 console errors, 0 failed API
docker compose config --quiet                                       PASS
docker compose -f docker-compose.prod.yml config --quiet             PASS
docker compose up -d --build                                        PASS
GET http://localhost:3001/health                                    PASS - 200
GET http://localhost:3000/                                          PASS - 200
POST http://localhost:3001/api/transfers                            PASS - 404
POST http://localhost:3001/api/support/entities/:id/sessions        PASS - 401
POST http://localhost:3001/api/balance-transfer-requests            PASS - 401
POST http://localhost:3001/api/ledger/transfers                     PASS - 401
GET http://localhost:3001/api/docs-json                             PASS - 200
RLS migration runtime smoke on PostgreSQL 16                         PASS
docker compose config --quiet after OpenSearch/Temporal              PASS
docker compose --env-file .env.production.example -f docker-compose.prod.yml config --quiet PASS
Git Bash bash -n backup.sh restore.sh production-smoke.sh deploy.sh   PASS
git diff --check                                                     PASS
production-smoke.sh public frontend/health/docs/dev-login             PASS
production-smoke.sh full local/public                                 PASS - frontend, health, docs, dev-login, OpenSearch, Temporal
docker compose ps                                                     PASS - backend/frontend/postgres/redis/opensearch/temporal healthy/up
OpenSearch cluster health                                             PASS - yellow/green مقبول لعقدة واحدة
Temporal cluster health                                               PASS - SERVING
UX Playwright rendered audit                                           PASS - 22 states, desktop/mobile, 0 failed API
UX final spot check after fixes                                        PASS - no console errors, no overlay, no overflow, no small targets
UX deep route audit                                                     PASS - 44 states then 7 focused post-fix routes, desktop/mobile
UX interaction audit                                                    PASS - wizard, portal/payment, review center, members, disbursement, search
Search API fallback                                                     PASS - `الهاشمي` returns allowed seeded entity without OpenSearch reindex
Search UI translated result                                             PASS - `صندوق عائلة الهاشمي` shows `عائلة · نشط`
Git Bash production-smoke.sh local stack                                PASS - frontend, health, docs-json, OpenSearch, Temporal
UX role-based seed audit                                                 PASS - 11 accounts, protected-route matrix, members controls, no permission leakage found
UX rules/health touch target retest                                      PASS - 8 focused checks, no small targets, no overflow
UX mobile login and role audit                                           PASS - real /login dev flow + 7 accounts x 5 routes, no overlay/overflow/small targets
```

---

## 6. المتبقي قبل الإنتاج الحقيقي

هذه ليست ثغرات كود مفتوحة من التقرير، بل خطوات تشغيلية يجب تنفيذها قبل إطلاق عام:

1. تعبئة أسرار الإنتاج:
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `DB_PASSWORD`
   - `DB_APP_PASSWORD`
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `APPLE_OAUTH_CLIENT_ID`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `MOYASAR_SECRET_KEY`
   - `MOYASAR_WEBHOOK_SECRET`
   - `PAYMENT_CALLBACK_URL`
   - `FRONTEND_PUBLIC_URL`
2. ضبط DNS للدومين الإنتاجي على خادم Caddy.
3. تشغيل `docker compose -f docker-compose.prod.yml config --quiet` بقيم production حقيقية.
4. تشغيل `prisma migrate deploy` على قاعدة staging.
5. تنفيذ اختبار OAuth حقيقي من Google و Apple.
6. تنفيذ اختبار Stripe webhook حقيقي أو sandbox بتوقيع provider.
7. تنفيذ اختبار Moyasar invoice/webhook حقيقي أو sandbox.
8. تشغيل smoke test بعد النشر:
   - health.
   - login.
   - tenant isolation.
   - create balance transfer request.
   - approve/reject path.
   - payment intent.
   - signed webhook.
9. متابعة نتائج `npm audit` كمسار صيانة مستقل عن ثغرات منطق العمل المغلقة هنا.

---

## 7. قاعدة عدم الرجوع

أي تعديل لاحق يجب ألا يعيد:

1. وحدة `/transfers` العامة.
2. تحديث `ledgerAccount.balance` خارج `LedgerService`.
3. إنشاء `ledgerTransaction` خارج `LedgerService`.
4. `$executeRawUnsafe` لسياق tenant.
5. OAuth يثق بـ email/providerId من body.
6. Payment webhook يقبل payload دون توقيع أو secret.
7. support session من مستخدم tenant.
8. auditor/search بلا membership/role filter.

هذه الحدود مغطاة الآن باختبارات أو بتصميم service/controller، ويجب اعتبارها خطوطاً حمراء للنسخ القادمة.
