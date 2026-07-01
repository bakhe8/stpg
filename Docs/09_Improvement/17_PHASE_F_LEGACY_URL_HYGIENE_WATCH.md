# Phase F - Legacy and URL Hygiene Watch

## حالة الإغلاق

**البند:** F-005 - Legacy and URL Hygiene Watch  
**الإصدار التشغيلي:** 2.21  
**التاريخ:** 2026-07-01  
**الحالة:** مغلق ومتحقق منه

## القرار المختصر

يبقى مسار `/entities` هو المسار التوافقي القائم للواجهة والروابط والاختبارات. لا نضيف `/funds` alias الآن.

السبب: القيمة المنتجية الحالية جاءت من لغة الواجهة وسؤال الإنشاء وليس من تغيير URL. إضافة alias جزئي الآن ستخلق طبقة مزدوجة تحتاج canonical links، redirects، bookmarks، اختبارات، ومخاطر دعم بدون فائدة تشغيلية واضحة.

## ما يبقى كما هو

| المجال | القرار |
|---|---|
| مسار القائمة والتفاصيل | `/entities`, `/entities/new`, `/entities/:id` تبقى كما هي. |
| API | `POST /entities`, `GET /entities/mine`, `POST /entities/:id/campaigns` تبقى كما هي. |
| المصطلح الداخلي | `Entity`, `EntityType`, `X-Entity-ID` تبقى عقودا داخلية. |
| rollback | `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=false` يبقي النموذج القديم مؤقتا. |
| النص الظاهر للمستخدم | يستمر استخدام صندوق/حملة في labels والنصوص. |
| alias | لا يوجد `/funds` route أو rewrite أو redirect في هذه الحزمة. |

## أدلة الفحص

| الفحص | النتيجة |
|---|---|
| `frontend/next.config.ts` | لا يحتوي `rewrites` أو `redirects`. |
| `frontend/src/app/(main)/funds` و`frontend/src/app/funds` | غير موجودين. |
| بحث `/funds` في كود الواجهة والباكند | لا يوجد route أو `href` أو `router.push` أو redirect إلى `/funds`. |
| `frontend/src/app/(main)/entities/new/page.tsx` | الفلاق يجعل المسار الجديد default ما لم تكن القيمة `false`. |
| `frontend/scripts/phase-d-create-flow-smoke.spec.cjs` | يغطي flag off، flag on، والوضع الافتراضي. |
| `.env.example` و`.env.production.example` | يحتويان `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=true` في جذر المشروع. |
| `frontend/src/locales/ar/common.json` و`frontend/src/locales/en/common.json` | `nav.entities` تعرض "الصناديق" و`Funds`، لا raw `/entities`. |

## أين قد يرى المستخدم `/entities`

| الموضع | هل هو مزعج الآن؟ | المعالجة الحالية |
|---|---|---|
| شريط عنوان المتصفح بعد فتح صندوق أو حملة | منخفض | مقبول حاليا لأن النص داخل الصفحة والقائمة يقول صندوق/حملة. |
| رابط منسوخ من صفحة صندوق أو إعدادات | متوسط إذا أصبح الرابط جزءا من دعم العملاء أو مواد عامة | يسجل كـ watch فقط؛ لا alias الآن. |
| روابط داخلية في `href` للتنقل والبريد/الإشعارات | منخفض | label الظاهر للمستخدم عربي/إنجليزي مناسب، والـ URL داخلي. |
| أدوات المنصة أو support التي تستخدم `/platform/entities` | منخفض | سطح platform تقني/تشغيلي، وليس واجهة مستخدم عادي. |
| API docs أو logs | غير متعلق بالمستخدم العادي | يبقى داخليا. |

لا توجد حاليا شاشة واجهة عادية تفرض على المستخدم قراءة كلمة `entities` كنص ظاهر. المتبقي هو URL نفسه.

## شروط فتح `/funds` لاحقا

لا يفتح alias إلا إذا تحقق واحد من التالي:

- أصبح الرابط نفسه جزءا من تجربة المستخدم أو onboarding أو مواد تسويقية.
- ظهرت شكاوى دعم متكررة بسبب `/entities` في شريط العنوان أو الروابط المنسوخة.
- احتجنا public-facing URLs لصناديق منشورة خارج التطبيق.
- أصبح لدينا وقت لتنفيذ alias كامل لا جزئي.

إذا فُتح لاحقا، يكون العمل additive بهذه الشروط:

- `/entities` يبقى يعمل ولا ينكسر أي bookmark.
- `/funds` يضاف كواجهة route alias فقط، لا كتغيير API ولا schema.
- تحديد canonical واضح: إما redirect من `/funds` إلى `/entities`، أو alias يعرض نفس الصفحات مع اختبار روابط.
- تحديث smoke tests للسيناريوهين.
- فحص كل روابط `href`, `router.push`, notifications, work-surface CTAs, breadcrumbs, global search.
- عدم تغيير `Entity` الداخلي أو `EntityType`.

## معيار الإغلاق

تم إغلاق F-005 لأن:

- rollback flag موجود ويغطيه smoke test.
- `/entities` مستقر ومقصود كمسار توافقي.
- لا يوجد `/funds` route أو redirect أو rewrite غير مقصود.
- الأماكن التي قد يرى فيها المستخدم `/entities` محصورة في URL/links، وليست نصوص واجهة مباشرة.
- قرار `/funds` مؤجل ومقيد بحزمة مستقلة additive إذا ظهر احتياج منتج واضح.

## التحقق

- فحص `frontend/next.config.ts`.
- فحص عدم وجود مجلد route لـ `/funds`.
- بحث focused عن `/funds` في كود الواجهة والباكند.
- فحص متغيرات البيئة في `.env.example` و`.env.production.example`.
- `npm run test:phase-d:create-flow` في frontend: 3 passed.
- `git diff --check`.
