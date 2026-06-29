# Backlog التنفيذي — CollectiveTrustOS
**الإصدار:** 2.0 | **التاريخ:** 2026-06-29 | **إجمالي المهام:** 42

> **كيف تستخدم هذا الملف:**
> 1. اختر مهمة غير معيَّنة بحسب أولويتها (P0 أولاً)
> 2. اقرأ "الملفات المتأثرة" وافتحها قبل التعديل
> 3. نفّذ "التغيير المطلوب" حرفياً
> 4. تحقق من كل checkbox في "معيار القبول" قبل فتح PR
> 5. PR يذكر رقم المهمة (مثل `fix: BL-004 adjustAggregateBalances`)

---

## الرموز

| الرمز | المعنى |
|-------|--------|
| P0 | حرجة — تمنع الإطلاق |
| P1 | عالية — أمان أو بيانات خاطئة |
| P2 | متوسطة — UX أو Schema |
| P3 | منخفضة — جودة وتحسينات |
| XS | ~2 ساعات | S | ~4 ساعات | M | يوم | L | 2-3 أيام |

---

## المرحلة 0 — قبل الإطلاق (P0) — 5 مهام

---

### BL-001 — إزالة `alert()` من صفحة المالية
**الأولوية:** P0 | **الجهد:** S

**الملفات المتأثرة:**
- `frontend/src/app/(main)/finance/page.tsx` — السطور 663–688

**المشكلة:** بعد الضغط على "دفع إلكتروني" يظهر `alert()` بدائي من المتصفح بدلاً من رد فعل UI.

**التغيير المطلوب:**

1. أضف `state`: `const [paymentMsg, setPaymentMsg] = useState<{text:string;type:'success'|'error'}|null>(null)`
2. في زر Stripe (السطر 661) — استبدل `alert(...)` بـ:
   ```tsx
   setPaymentMsg({ text: `تم إنشاء جلسة الدفع. معرّف الجلسة: ${res.id}`, type: 'success' });
   ```
3. في catch Stripe (السطر 667) — استبدل `alert(...)` بـ:
   ```tsx
   setPaymentMsg({ text: e instanceof Error ? e.message : 'فشل إنشاء الجلسة', type: 'error' });
   ```
4. كرر نفس الشيء لأزرار Moyasar (السطران 679، 682)
5. أضف عنصر العرض فوق الأزرار:
   ```tsx
   {paymentMsg && (
     <div className={paymentMsg.type === 'error' ? styles.errorMsg : styles.successMsg}>
       {paymentMsg.text}
     </div>
   )}
   ```
6. أضف `.errorMsg` و`.successMsg` في `finance/page.module.css`

**معيار القبول:**
- [ ] الضغط على "دفع إلكتروني (Stripe)" يُظهر رسالة داخل الصفحة — لا نافذة `alert()`
- [ ] الضغط على "دفع إلكتروني (Moyasar)" يُظهر رسالة داخل الصفحة — لا نافذة `alert()`
- [ ] خطأ API → رسالة خطأ بلون مختلف داخل الصفحة
- [ ] `grep -rn "alert(" frontend/src/app/` لا يجد شيئاً في هذا الملف
- [ ] `npm run build` يكتمل بلا أخطاء TypeScript

---

### BL-002 — استبدال `prompt()` و`confirm()` في صفحة المنصة
**الأولوية:** P0 | **الجهد:** M

**الملفات المتأثرة:**
- `frontend/src/app/platform/page.tsx` — السطران 100 و112

**التغيير المطلوب:**

1. أضف state:
   ```tsx
   const [suspendDialog, setSuspendDialog] = useState<{entity:PlatformEntity;reason:string}|null>(null);
   const [activateTarget, setActivateTarget] = useState<PlatformEntity|null>(null);
   ```
2. غيّر `handleSuspend` (السطر 99) إلى: `setSuspendDialog({ entity, reason: '' })`
3. غيّر `handleActivate` (السطر 111) إلى: `setActivateTarget(entity)`
4. أضف دالتي التأكيد `confirmSuspend()` و`confirmActivate()` بنفس منطق الكود الحالي
5. أضف Dialog التعليق (textarea للسبب + زر تعليق يتطلب 5 أحرف على الأقل) داخل JSX
6. أضف Dialog التفعيل (رسالة تأكيد + زر نعم/إلغاء) داخل JSX
7. أضف أنماط CSS لـ `modalOverlay`, `modal`, `modalActions`, `textarea`, `dangerBtn`, `cancelBtn` في `page.module.css`

**معيار القبول:**
- [ ] النقر على "تعليق" يفتح modal داخل الصفحة
- [ ] زر التعليق معطَّل إذا كان السبب أقل من 5 أحرف
- [ ] النقر على "تفعيل" يفتح modal تأكيد
- [ ] `grep -rn "prompt\b\|confirm(" frontend/src/app/platform/` لا يجد شيئاً
- [ ] `npm run build` يكتمل

---

### BL-003 — إرسال `governanceType` و`allowMultiplePaths` عند إنشاء الكيان
**الأولوية:** P0 | **الجهد:** S

**الملفات المتأثرة:**
- `frontend/src/lib/api/entities.ts` — السطر 72
- `frontend/src/app/(main)/entities/new/page.tsx` — السطر 105

**التغيير المطلوب:**

**entities.ts السطر 72 — وسّع نوع `createEntity`:**
```typescript
export function createEntity(data: {
  name: string;
  type: string;
  description?: string;
  templateId?: string;
  defaultGovernanceType?: string;   // ← أضف
  allowMultiplePaths?: boolean;     // ← أضف
}) {
  return fetchApi("/entities", { method: "POST", body: JSON.stringify(data) });
}
```

**entities/new/page.tsx السطر 105 — أضف الحقلين:**
```typescript
const result = await createEntity({
  name: state.name.trim(),
  type: state.type,
  description: state.description.trim() || undefined,
  templateId: state.templateId || undefined,
  defaultGovernanceType: state.governanceType || undefined,    // ← أضف
  allowMultiplePaths: state.allowMultiplePaths ?? false,       // ← أضف
}) as { id: string };
```

تأكد أن `state` الأولي يحتوي `governanceType: ''` و`allowMultiplePaths: false`.

**معيار القبول:**
- [ ] إنشاء كيان بنوع FAMILY واختيار BOARD → DevTools Network يُظهر `defaultGovernanceType: "BOARD"` في body
- [ ] الكيان المُنشأ يملك مسار حوكمة من النوع المختار
- [ ] `npm run build` يكتمل بلا أخطاء TypeScript

---

### BL-004 — إصلاح `adjustAggregateBalances()` في LedgerService
**الأولوية:** P0 | **الجهد:** S

**الملفات المتأثرة:**
- `backend/src/ledger/ledger.service.ts` — السطور 1084–1098

**التغيير المطلوب:**

استبدل السطور 1091–1097 بالآتي:
```typescript
// تحديث الحساب الإجمالي للكيان فقط — لا المحافظ ولا المسارات ولا البنود
await tx.ledgerAccount.updateMany({
  where: {
    entityId,
    walletId: null,
    governancePathId: null,
    spendingItemId: null,
  },
  data: {
    balance:
      amount >= 0 ? { increment: amount } : { decrement: Math.abs(amount) },
  },
});
```

**بعد الإصلاح — تحقق من سلامة الأرصدة:**
```sql
-- يجب أن تكون النتيجة: مجموع أرصدة المحافظ = رصيد الحساب الإجمالي
SELECT
  e.id,
  SUM(la_wallet.balance) AS wallets_total,
  la_entity.balance AS entity_aggregate
FROM entities e
JOIN ledger_accounts la_entity ON la_entity.entity_id = e.id AND la_entity.wallet_id IS NULL
JOIN ledger_accounts la_wallet ON la_wallet.entity_id = e.id AND la_wallet.wallet_id IS NOT NULL
GROUP BY e.id, la_entity.balance
HAVING ABS(SUM(la_wallet.balance) - la_entity.balance) > 0.01;
-- يجب أن يعيد 0 صفوف
```

**معيار القبول:**
- [ ] تسجيل دفعة جديدة: رصيد المحفظة المعنية + الحساب الإجمالي للكيان يزيدان
- [ ] أرصدة محافظ أخرى في نفس الكيان لا تتغير
- [ ] استعلام التحقق أعلاه يُعيد 0 صفوف
- [ ] `npm run test -- financial-boundaries.spec` يمر

---

### BL-005 — التحقق من توقيع Moyasar Webhook
**الأولوية:** P0 | **الجهد:** S

**الملفات المتأثرة:**
- `backend/src/payments/payments.controller.ts` — السطر 43
- `backend/.env.example`

**التغيير المطلوب:**

```typescript
import { createHmac, timingSafeEqual } from 'crypto';
import { RawBody } from '@nestjs/common'; // أو طريقة الـ raw body المستخدمة في المشروع

@Post('webhook/moyasar')
async moyasarWebhook(
  @Headers('x-moyasar-signature') signature: string,
  @Body() body: unknown,
  @Req() req: Request & { rawBody?: Buffer },
) {
  const secret = this.configService.getOrThrow<string>('MOYASAR_WEBHOOK_SECRET');
  const rawBody = req.rawBody;
  if (!rawBody) throw new InternalServerErrorException('Raw body not available');

  const expected = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (!signature || !timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )) {
    throw new UnauthorizedException('Invalid Moyasar webhook signature');
  }

  return this.paymentsService.handleMoyasarWebhook(body);
}
```

أضف في `.env.example`:
```env
MOYASAR_WEBHOOK_SECRET=your_moyasar_webhook_secret_here
```

**معيار القبول:**
- [ ] طلب بدون `x-moyasar-signature` → 401
- [ ] طلب بتوقيع خاطئ → 401
- [ ] طلب بتوقيع HMAC-SHA256 صحيح → 200
- [ ] `MOYASAR_WEBHOOK_SECRET` موجود في `.env.example`

---

## المرحلة 1 — أمان وصلاحيات (P1) — 8 مهام

---

### BL-006 — عزل `dev-login` عن الإنتاج
**الأولوية:** P1 | **الجهد:** XS

**الملفات المتأثرة:**
- `backend/src/identity/auth/auth.service.ts` — السطر 79
- `backend/.env.example`

**التغيير المطلوب:**
```typescript
// بدلاً من: if (process.env.NODE_ENV !== 'development') throw ...
if (process.env.ENABLE_DEV_LOGIN !== 'true') {
  throw new ForbiddenException('الدخول التطويري غير متاح');
}
```

في `.env.example`:
```env
# تحذير: لا تفعّل هذا في الإنتاج أبداً
ENABLE_DEV_LOGIN=true
```

**معيار القبول:**
- [ ] بدون `ENABLE_DEV_LOGIN=true`: `POST /api/auth/dev-login` → 403
- [ ] مع `ENABLE_DEV_LOGIN=true`: الدخول يعمل
- [ ] `grep -rn "NODE_ENV.*development" backend/src/identity/auth/` لا يجد هذا الفحص

---

### BL-007 — تفعيل Refresh Token Rotation
**الأولوية:** P1 | **الجهد:** M

**الملفات المتأثرة:**
- `backend/src/identity/auth/auth.service.ts` — السطر 495

**التغيير المطلوب:**
```typescript
async refresh(oldToken: string) {
  const record = await this.prisma.refreshToken.findUnique({ where: { token: oldToken } });
  if (!record || record.isRevoked || record.expiresAt < new Date()) {
    throw new UnauthorizedException('انتهت صلاحية الجلسة');
  }
  // أبطِل القديم فوراً
  await this.prisma.refreshToken.update({
    where: { id: record.id },
    data: { isRevoked: true, revokedAt: new Date() },
  });
  // أنشئ زوجاً جديداً
  const accessToken = this.issueAccessToken(record.personId);
  const newRefreshToken = await this.createRefreshToken(record.personId);
  return { accessToken, refreshToken: newRefreshToken };
}
```

تأكد أن `RefreshToken` يحتوي `isRevoked Boolean @default(false)` و`revokedAt DateTime?`.

**معيار القبول:**
- [ ] refresh ناجح → access token جديد + refresh token جديد مختلف
- [ ] إعادة استخدام نفس refresh token → 401
- [ ] الـ token القديم في DB: `isRevoked = true`

---

### BL-008 — منع Treasurer من إنشاء القرارات
**الأولوية:** P1 | **الجهد:** XS

**الملفات المتأثرة:**
- `backend/src/decisions/decisions.service.ts` — السطر 45 + دوال `closeDecision`, `cancelDecision`

**التغيير المطلوب:**
```typescript
// في createDecision(), closeDecision(), cancelDecision():
// بدلاً من: await this.requireAdminOrTreasurer(entityId, creatorId);
await this.requireAdmin(entityId, creatorId);

// في executeDecision() فقط — ابقِ:
await this.requireAdminOrTreasurer(entityId, executorId);
```

**معيار القبول:**
- [ ] TREASURER → `POST /api/decisions` → 403
- [ ] ADMIN → `POST /api/decisions` → 201
- [ ] TREASURER → `POST /api/decisions/:id/execute` → نجاح (إذا كان القرار APPROVED)

---

### BL-009 — فصل صلاحية الاعتماد عن التنفيذ في الصرف
**الأولوية:** P1 | **الجهد:** S

**الملفات المتأثرة:**
- `backend/src/disbursement-requests/disbursement-requests.service.ts` — دالة `executeRequest()`

**التغيير المطلوب:**
```typescript
// بعد جلب الطلب في executeRequest():
if (req.reviewedById === executorId) {
  throw new ForbiddenException(
    'لا يمكن للشخص ذاته اعتماد طلب الصرف وتنفيذه (مبدأ الفصل بين المهام)'
  );
}
```

**معيار القبول:**
- [ ] من اعتمد الطلب يحاول تنفيذه → 403 برسالة واضحة
- [ ] شخص مختلف ينفّذ الطلب → نجاح

---

### BL-010 — منع المطرود من التصويت على طرد نفسه
**الأولوية:** P1 | **الجهد:** XS

**الملفات المتأثرة:**
- `backend/src/decisions/decisions.service.ts` — دالة `castVote()` أو `isEligibleVoter()`

**التغيير المطلوب:**
```typescript
if (decision.decisionType === DecisionType.EXPEL_MEMBER) {
  const voterMembership = await this.prisma.membership.findFirst({
    where: { entityId: decision.entityId, personId: voterId, isActive: true },
  });
  if (voterMembership?.id === decision.subjectId) {
    throw new ForbiddenException('لا يمكنك التصويت على قرار يمسّك مباشرة — رأيك مجروح');
  }
}
```

**معيار القبول:**
- [ ] العضو موضوع `EXPEL_MEMBER` يحاول التصويت → 403
- [ ] أعضاء آخرون يصوّتون بلا قيود

---

### BL-011 — إضافة فحص `isVerified` قبل التصويت
**الأولوية:** P1 | **الجهد:** XS

**الملفات المتأثرة:**
- `backend/src/decisions/decisions.service.ts` — دالة `castVote()`

**التغيير المطلوب:**
```typescript
const voter = await this.prisma.person.findUnique({ where: { id: voterId } });
if (!voter?.isVerified) {
  throw new ForbiddenException('يجب تأكيد رقم جوالك للتصويت — راجع الإعدادات');
}
```

**ملاحظة:** هذا الفحص يصبح فعّالاً بعد BL-033. حتى ذلك الحين: تأكد من أن بيانات الـ seed تضبط `isVerified = true` لكل الحسابات النشطة.

**معيار القبول:**
- [ ] `isVerified = false` → محاولة تصويت → 403
- [ ] `isVerified = true` → التصويت يمر

---

### BL-012 — منع SUPPORTER_ONLY وغير المشترك من طلب الصرف
**الأولوية:** P1 | **الجهد:** S

**الملفات المتأثرة:**
- `backend/src/disbursement-requests/disbursement-requests.service.ts` — دالة `createRequest()` السطر 44

**التغيير المطلوب:**
```typescript
// بعد التحقق من العضوية:
const activeSubscription = await this.prisma.subscription.findFirst({
  where: {
    membershipId: membership.id,
    governancePathId: dto.governancePathId,
    state: { in: [SubscriptionState.ACTIVE, SubscriptionState.CONDITIONAL] },
  },
});
if (!activeSubscription) {
  throw new ForbiddenException('يتطلب اشتراكاً نشطاً في هذا المسار');
}
if (activeSubscription.memberType === 'SUPPORTER_ONLY') {
  throw new ForbiddenException('المشتركون بصفة "داعم فقط" لا يحق لهم الاستفادة من الصرف');
}
```

**معيار القبول:**
- [ ] SUPPORTER_ONLY → `POST /api/disbursement-requests` → 403
- [ ] بلا اشتراك نشط في المسار → 403
- [ ] ACTIVE أو CONDITIONAL بمسار نشط → 201

---

### BL-013 — جعل `JwtGuard` حارساً عاماً
**الأولوية:** P1 | **الجهد:** M

**الملفات المتأثرة:**
- `backend/src/app.module.ts` — السطر 108
- `backend/src/common/decorators/public.decorator.ts` — ملف جديد

**التغيير المطلوب:**

في `app.module.ts`:
```typescript
providers: [
  { provide: APP_GUARD, useClass: ThrottlerGuard },
  { provide: APP_GUARD, useClass: JwtAuthGuard },   // ← أضف
  { provide: APP_GUARD, useClass: SuspendedEntityGuard },
],
```

ملف جديد `src/common/decorators/public.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

عدّل `JwtAuthGuard` ليحترم `@Public()`:
```typescript
canActivate(context: ExecutionContext) {
  const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
    context.getHandler(), context.getClass(),
  ]);
  if (isPublic) return true;
  return super.canActivate(context);
}
```

زيّن بـ `@Public()`: `POST /auth/login`, `/auth/register`, `/auth/refresh`, `/auth/dev-login`, `/auth/send-otp`, `/auth/verify-otp`, `/join/:token/accept`, `/entity-templates`, `/health`

**معيار القبول:**
- [ ] `GET /api/dashboard` بدون token → 401
- [ ] `POST /api/auth/login` بدون token → يعمل
- [ ] controller جديد بدون `@UseGuards()` → محمي تلقائياً

---

## المرحلة 2 — Frontend: توطين وإصلاحات UX (P2) — 13 مهمة

---

### BL-014 — توطين صفحة `/portal` بالكامل
**الأولوية:** P2 | **الجهد:** M

**الملفات المتأثرة:**
- `frontend/src/app/(main)/portal/page.tsx`
- `frontend/src/locales/ar/portal.json` — جديد
- `frontend/src/locales/en/portal.json` — جديد

**التغيير:** أضف `const t = useTranslations('portal')` وانقل كل النصوص العربية المشفرة في JSX إلى `portal.json`.

**معيار القبول:**
- [ ] `grep -n "[؀-ۿ]" frontend/src/app/(main)/portal/page.tsx` لا يجد نصوصاً في JSX
- [ ] الصفحة تعرض نفس النصوص بشكل صحيح
- [ ] `npm run build` يكتمل

---

### BL-015 — توطين صفحة `/settings`
**الأولوية:** P2 | **الجهد:** M

**الملفات المتأثرة:**
- `frontend/src/app/(main)/entities/[id]/settings/page.tsx`
- `frontend/src/locales/ar/entitySettings.json` — جديد

**التغيير:** نفس نمط BL-014.

**معيار القبول:**
- [ ] لا نصوص عربية مشفرة في JSX
- [ ] `npm run build` يكتمل

---

### BL-016 — توطين صفحة `/health`
**الأولوية:** P2 | **الجهد:** S

**الملفات المتأثرة:**
- `frontend/src/app/(main)/health/page.tsx`
- `frontend/src/locales/ar/health.json` — جديد

**معيار القبول:**
- [ ] لا نصوص عربية مشفرة في JSX
- [ ] `npm run build` يكتمل

---

### BL-017 — إصلاح `ENTITY_TYPE_LABELS` في صفحة الانضمام
**الأولوية:** P2 | **الجهد:** XS

**الملفات المتأثرة:**
- `frontend/src/app/join/[token]/page.tsx` — السطر 16

**التغيير:**
```typescript
const ENTITY_TYPE_LABELS: Record<string, string> = {
  FAMILY: "عائلة",
  TRIBE: "قبيلة",
  BUILDING: "عمارة",
  NEIGHBORHOOD: "حي",
  FRIENDS: "أصدقاء",
  COMMUNITY: "مجتمع",
  CAMPAIGN: "حملة",
  // أُزيلت: FUND, COOPERATIVE, ASSOCIATION, COMMITTEE
};
```

**معيار القبول:**
- [ ] كل مفتاح في `ENTITY_TYPE_LABELS` موجود كقيمة في `EntityType` enum بـ schema.prisma
- [ ] رابط دعوة لكيان FAMILY يعرض "عائلة"
- [ ] `npm run build` يكتمل

---

### BL-018 — استبدال حقل UUID اليدوي بـ Wallet Picker
**الأولوية:** P2 | **الجهد:** M

**الملفات المتأثرة:**
- `frontend/src/app/(main)/wallets/[id]/page.tsx` — حوالي السطر 1006

**التغيير:** استبدل `<input>` يطلب UUID بقائمة منسدلة أو `<datalist>` مبنية من `GET /api/entities/:entityId/wallets`.

**معيار القبول:**
- [ ] المستخدم يرى أسماء المحافظ — لا UUID خام
- [ ] الاختيار يُرسِل `walletId` الصحيح للـ API
- [ ] لا حقل يطلب UUID يدوياً

---

### BL-019 — السماح للمراجع برؤية الاشتراكات في `/paths/[id]`
**الأولوية:** P2 | **الجهد:** XS

**الملفات المتأثرة:**
- `frontend/src/app/(main)/paths/[id]/page.tsx` — السطر 134

**التغيير:**
```typescript
const isAuditor = entity?.myRole === 'AUDITOR';
const canViewSubscriptions = canManagePath || isAuditor;
```

**معيار القبول:**
- [ ] AUDITOR يرى قائمة الاشتراكات في صفحة المسار
- [ ] MEMBER عادي لا يراها

---

### BL-020 — إضافة تفاصيل في تبويبَي Exceptions وConflicts
**الأولوية:** P2 | **الجهد:** M

**الملفات المتأثرة:**
- `frontend/src/app/(main)/auditor/page.tsx` — السطران 407 و425

**التغيير:** أضف أعمدة: النوع + الشدة + الوصف + الحالة (للاستثناءات)، والنوع + الأطراف + الحالة (للنزاعات). تأكد أن الـ API يُعيد هذه الحقول.

**معيار القبول:**
- [ ] Exceptions: تعرض النوع + الشدة + الوصف + الحالة
- [ ] Conflicts: تعرض النوع + الأطراف + الحالة
- [ ] البيانات من الـ API

---

### BL-021 — إضافة فلتر وبحث في قائمة الأعضاء
**الأولوية:** P2 | **الجهد:** S

**الملفات المتأثرة:**
- `frontend/src/app/(main)/entities/[id]/members/page.tsx` (أو المسار المقابل)

**التغيير:** أضف `state` للبحث والدور. أضف `<input type="search">` و`<select>` للدور. طبّق الفلترة client-side على مصفوفة الأعضاء.

**معيار القبول:**
- [ ] الكتابة في البحث يفلتر الأعضاء فورياً
- [ ] اختيار دور يقصر القائمة على هذا الدور
- [ ] لا API call إضافية عند الفلترة

---

### BL-022 — توطين نصوص Dashboard الجديد
**الأولوية:** P2 | **الجهد:** S

**الملفات المتأثرة:**
- `frontend/src/app/(main)/dashboard/page.tsx` — السطر 738
- المكوّنات التي تحتوي "المال" / "الاستفادة" / "ما يهمك"

**التغيير:**
- `مرحباً {name}` → `{t('greeting', { name: surface.person.displayName })}`
- `"المال"`, `"الاستفادة"`, `"ما يهمك"`, `"لا يوجد تنبيه"` → مفاتيح ترجمة

**معيار القبول:**
- [ ] `grep -n "مرحباً\|الاستفادة\|ما يهمك\|لا يوجد" frontend/src/app/(main)/dashboard/` لا يجد نتائج في JSX
- [ ] `npm run build` يكتمل

---

### BL-023 — استبدال `confirm()` في صفحة المستندات
**الأولوية:** P2 | **الجهد:** XS

**الملفات المتأثرة:**
- `frontend/src/app/(main)/documents/page.tsx` — السطر 139

**التغيير:** استخدم `ConfirmActionDialog` الموجود في `components/shared/` بدلاً من `confirm(t('deleteConfirm'))`.

**معيار القبول:**
- [ ] حذف مستند يفتح dialog مدمج — لا `confirm()`
- [ ] `grep -n "confirm(" frontend/src/app/(main)/documents/` لا يجد شيئاً

---

### BL-024 — توطين صفحة `/platform`
**الأولوية:** P2 | **الجهد:** M

**الملفات المتأثرة:**
- `frontend/src/app/platform/page.tsx`
- `frontend/src/locales/ar/platform.json` — جديد

**التغيير:** أضف `useTranslations('platform')` وانقل `STATUS_LABELS`, `ENTITY_TYPE_LABELS`, وكل النصوص الثابتة.

**معيار القبول:**
- [ ] لا نصوص عربية مشفرة في JSX
- [ ] `npm run build` يكتمل

---

### BL-025 — توطين Pre-gate إنشاء الكيان
**الأولوية:** P2 | **الجهد:** XS

**الملفات المتأثرة:**
- `frontend/src/app/(main)/entities/new/page.tsx` — السطور 481–531

**التغيير:** انقل نصوص "قبل أن تبدأ" إلى ملف ترجمة.

**معيار القبول:**
- [ ] السطور 481–531 تستخدم `t('...')` فقط
- [ ] `npm run build` يكتمل

---

### BL-026 — توطين نصوص Loading/Error في `/platform`
**الأولوية:** P3 | **الجهد:** XS

**الملفات المتأثرة:**
- `frontend/src/app/platform/page.tsx` — السطور 122–130

**التغيير:** انقل `"جاري تحميل سطح المنصة..."` و`"تعذر تحميل سطح المنصة"` إلى `platform.json`.

**معيار القبول:**
- [ ] لا نصوص عربية مشفرة في قسم loading/error

---

## المرحلة 3 — Schema وقاعدة البيانات (P2–P3) — 6 مهام

---

### BL-027 — إضافة `@relation` لأطراف نموذج `Dispute`
**الأولوية:** P2 | **الجهد:** S

**الملفات المتأثرة:**
- `backend/prisma/schema.prisma` — السطور 831–841

**التغيير:**
```prisma
model Dispute {
  initiatorId  String      @db.Uuid
  initiator    Membership  @relation("DisputeInitiator",  fields: [initiatorId],  references: [id])

  respondentId String?     @db.Uuid
  respondent   Membership? @relation("DisputeRespondent", fields: [respondentId], references: [id])

  arbitratorId String?     @db.Uuid
  arbitrator   Membership? @relation("DisputeArbitrator", fields: [arbitratorId], references: [id])
}
```

أضف العلاقات العكسية في `Membership`:
```prisma
disputesAsInitiator  Dispute[] @relation("DisputeInitiator")
disputesAsRespondent Dispute[] @relation("DisputeRespondent")
disputesAsArbitrator Dispute[] @relation("DisputeArbitrator")
```

ثم: `npx prisma migrate dev --name add_dispute_relations`

**معيار القبول:**
- [ ] `npx prisma validate` يمر
- [ ] `dispute.initiator.person.displayName` يُستعلَم بنجاح
- [ ] FK موجودة: `\d+ disputes` يظهر foreign keys للثلاثة

---

### BL-028 — إضافة `@relation` لـ `PlatformSuspensionAppeal.entityId`
**الأولوية:** P2 | **الجهد:** XS

**الملفات المتأثرة:**
- `backend/prisma/schema.prisma` — السطر 88

**التغيير:**
```prisma
entityId  String @db.Uuid
entity    Entity @relation("PlatformSuspensionAppeals", fields: [entityId], references: [id])
```
أضف في `Entity`:
```prisma
suspensionAppeals PlatformSuspensionAppeal[] @relation("PlatformSuspensionAppeals")
```
ثم migration.

**معيار القبول:**
- [ ] `npx prisma validate` يمر
- [ ] `appeal.entity.name` يُستعلَم

---

### BL-029 — إضافة `@relation` لـ `BalanceSnapshot.accountId`
**الأولوية:** P2 | **الجهد:** XS

**الملفات المتأثرة:**
- `backend/prisma/schema.prisma` — السطر 973

**التغيير:**
```prisma
accountId  String        @db.Uuid
account    LedgerAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
```
أضف في `LedgerAccount`: `snapshots BalanceSnapshot[]`
ثم migration.

**معيار القبول:**
- [ ] `npx prisma validate` يمر
- [ ] `snapshot.account.balance` يُستعلَم

---

### BL-030 — إضافة قيم `AuditAction` المفقودة واستخدامها
**الأولوية:** P2 | **الجهد:** S

**الملفات المتأثرة:**
- `backend/prisma/schema.prisma` — السطر 1825
- `backend/src/ledger/ledger.service.ts`
- `backend/src/entities/entities.service.ts`
- `backend/src/decisions/decisions.service.ts`

**التغيير في schema:**
```prisma
enum AuditAction {
  CREATE  UPDATE  DELETE  APPROVE  REJECT  VOTE  APPEAL  LOGIN  LOGOUT
  DISBURSE    // ← جديد
  TRANSFER    // ← جديد
  SUSPEND     // ← جديد
  REINSTATE   // ← جديد
  EXPEL       // ← جديد
}
```

**في الكود — استخدمها:**
- `recordDisbursement()` → `AuditAction.DISBURSE`
- `recordTransfer()` → `AuditAction.TRANSFER`
- `suspendEntity()` → `AuditAction.SUSPEND`
- `reinstateEntity()` → `AuditAction.REINSTATE`
- تنفيذ `EXPEL_MEMBER` → `AuditAction.EXPEL`

**معيار القبول:**
- [ ] صرف → `AuditLog` يحتوي `action = 'DISBURSE'`
- [ ] تعليق → `action = 'SUSPEND'`
- [ ] طرد → `action = 'EXPEL'`

---

### BL-031 — إضافة `NotificationType` للصرف
**الأولوية:** P2 | **الجهد:** S

**الملفات المتأثرة:**
- `backend/prisma/schema.prisma` — السطر 1786
- `backend/src/disbursement-requests/disbursement-requests.service.ts`

**التغيير في schema:**
```prisma
enum NotificationType {
  // الموجودة...
  DISBURSEMENT_REQUESTED
  DISBURSEMENT_APPROVED
  DISBURSEMENT_REJECTED
  DISBURSEMENT_EXECUTED
}
```

**في Service:** أرسل إشعاراً عند كل حالة (طلب، اعتماد، رفض، تنفيذ).

**معيار القبول:**
- [ ] إنشاء طلب → المدراء يتلقون `DISBURSEMENT_REQUESTED`
- [ ] اعتماد → مقدّمه يتلقى `DISBURSEMENT_APPROVED`
- [ ] تنفيذ → المستفيد يتلقى `DISBURSEMENT_EXECUTED`

---

### BL-032 — إضافة الفهارس المفقودة
**الأولوية:** P3 | **الجهد:** XS

**الملفات المتأثرة:**
- `backend/prisma/schema.prisma`

**التغيير:**
```prisma
// في PaymentRecord:
@@index([paymentDueId, status])

// في Subscription:
@@index([state])
@@index([governancePathId, state])

// في AuditLog:
@@index([createdAt])
@@index([entityId, createdAt])
```

ثم: `npx prisma migrate dev --name add_missing_indexes`

**معيار القبول:**
- [ ] Migration ينجح
- [ ] `EXPLAIN ANALYZE SELECT ... FROM payment_records WHERE payment_due_id=X AND status=Y` يستخدم index
- [ ] `EXPLAIN ANALYZE SELECT ... FROM audit_logs ORDER BY created_at DESC LIMIT 50` يستخدم index

---

## المرحلة 4 — Backend: ميزات ناقصة (P1–P2) — 4 مهام

---

### BL-033 — توصيل SMS/OTP بمسار المصادقة
**الأولوية:** P1 | **الجهد:** L

**الملفات المتأثرة:**
- `backend/src/identity/auth/auth.service.ts`
- `backend/src/identity/auth/auth.controller.ts`
- `backend/prisma/schema.prisma` — نموذج `OtpCode` جديد

**التغيير:**

في schema — أضف:
```prisma
model OtpCode {
  phoneNumber String   @id
  code        String
  expiresAt   DateTime
  attempts    Int      @default(0)
  createdAt   DateTime @default(now())
}
```

في `auth.service.ts` — أضف:
```typescript
async sendOtp(phoneNumber: string): Promise<void> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await this.prisma.otpCode.upsert({
    where: { phoneNumber },
    create: { phoneNumber, code, expiresAt },
    update: { code, expiresAt, attempts: 0 },
  });
  await this.smsProvider.send(phoneNumber, `رمز التحقق: ${code} (صالح 10 دقائق)`);
}

async verifyOtp(phoneNumber: string, code: string): Promise<void> {
  const record = await this.prisma.otpCode.findUnique({ where: { phoneNumber } });
  if (!record || record.expiresAt < new Date()) throw new BadRequestException('الرمز منتهي');
  if (record.attempts >= 5) throw new BadRequestException('تجاوزت عدد المحاولات');
  if (record.code !== code) {
    await this.prisma.otpCode.update({ where: { phoneNumber }, data: { attempts: { increment: 1 } } });
    throw new BadRequestException('رمز خاطئ');
  }
  await this.prisma.person.updateMany({ where: { phoneNumber }, data: { isVerified: true } });
  await this.prisma.otpCode.delete({ where: { phoneNumber } });
}
```

في `auth.controller.ts` — أضف endpoint-ين `@Public()`:
```typescript
@Public() @Post('send-otp')
async sendOtp(@Body() dto: { phoneNumber: string }) { ... }

@Public() @Post('verify-otp')
async verifyOtp(@Body() dto: { phoneNumber: string; code: string }) { ... }
```

**معيار القبول:**
- [ ] `POST /api/auth/send-otp` → رسالة SMS ترسل (أو تطبع في console في dev)
- [ ] `POST /api/auth/verify-otp` برمز صحيح → `person.isVerified = true`
- [ ] رمز خاطئ → 400 | رمز منتهٍ → 400 | 5 محاولات → 400
- [ ] Frontend تتبع مسار OTP الموثق في `frontend/AGENTS.md`

---

### BL-034 — تنفيذ `MERGE_PATHS` فعلياً
**الأولوية:** P2 | **الجهد:** L

**الملفات المتأثرة:**
- `backend/src/decisions/decisions.service.ts` — `executeDecisionSideEffects()`

**التغيير:** في `case DecisionType.MERGE_PATHS:` أضف:
1. نقل الاشتراكات: `updateMany({ where: { governancePathId: sourcePathId }, data: { governancePathId: targetPathId } })`
2. نقل الرصيد: استدعِ `ledgerService.recordTransfer()`
3. إغلاق المسار المصدر: `update({ where: { id: sourcePathId }, data: { isActive: false, closedAt: now() } })`

**معيار القبول:**
- [ ] قرار `MERGE_PATHS` معتمد → اشتراكات المسار القديم تنتقل
- [ ] رصيد المسار القديم ينتقل
- [ ] المسار القديم: `isActive = false`

---

### BL-035 — إضافة Cron لتوليد `PaymentDue` تلقائياً
**الأولوية:** P2 | **الجهد:** M

**الملفات المتأثرة:**
- `backend/src/temporal/payment-dues.cron.ts` — ملف جديد
- `backend/src/subscriptions/subscriptions.service.ts`

**التغيير:** أنشئ `PaymentDuesCron` بـ `@Cron('0 0 1 * *')` يُولّد `PaymentDue` لكل اشتراك نشط billable، ويُرسِل إشعار `PAYMENT_DUE`. أضف `@Cron('0 1 * * *')` يُحدَّث الدفعات المتأخرة إلى `OVERDUE`.

**معيار القبول:**
- [ ] أول كل شهر: `PaymentDue` يُنشَأ لكل اشتراك نشط
- [ ] إشعار `PAYMENT_DUE` يُرسَل
- [ ] دفعات متأخرة تنتقل لـ `OVERDUE` تلقائياً
- [ ] Endpoint إداري: `POST /api/admin/cron/generate-dues` للاختبار اليدوي

---

### BL-036 — إضافة حد زمني على عكس المعاملات
**الأولوية:** P2 | **الجهد:** XS

**الملفات المتأثرة:**
- `backend/src/ledger/ledger.service.ts` — دالة `recordReversal()`

**التغيير:**
```typescript
import { differenceInDays } from 'date-fns';

const REVERSAL_WINDOW_DAYS = parseInt(process.env.REVERSAL_WINDOW_DAYS ?? '90', 10);
const daysSince = differenceInDays(new Date(), originalTx.createdAt);
if (daysSince > REVERSAL_WINDOW_DAYS) {
  throw new BadRequestException(
    `لا يمكن عكس معاملة أقدم من ${REVERSAL_WINDOW_DAYS} يوماً (مضى ${daysSince} يوماً)`
  );
}
```

أضف `REVERSAL_WINDOW_DAYS=90` في `.env.example`.

**معيار القبول:**
- [ ] عكس معاملة عمرها 91 يوماً → 400
- [ ] عكس معاملة عمرها 30 يوماً → نجاح
- [ ] `REVERSAL_WINDOW_DAYS` قابل للتكوين

---

## المرحلة 5 — Seed وجودة (P3) — 6 مهام

---

### BL-037 — إضافة دفعة Moyasar مكتملة (CONFIRMED)
**الأولوية:** P3 | **الجهد:** XS

**الملفات المتأثرة:**
- `backend/prisma/seed.ts`

**التغيير:** أضف `PaymentRecord` بـ `paymentMethod: 'MOYASAR', status: 'CONFIRMED', gatewayTransactionId: 'moyasar_ch_demo_confirmed_001'`.

**معيار القبول:**
- [ ] `seed-validate.ts` يجد سجل Moyasar بحالة `CONFIRMED`
- [ ] `npx prisma db seed` يكتمل

---

### BL-038 — إضافة عضو ACTIVE بصفر دفعات
**الأولوية:** P3 | **الجهد:** S

**الملفات المتأثرة:**
- `backend/prisma/seed.ts`
- `backend/prisma/seed-validate.ts`

**التغيير:** أضف عضواً انضم قبل 5 أيام بـ `state: ACTIVE` لكن لا `PaymentDue` مرتبط (سيُولَّد أول الشهر القادم). أضف تحققاً في `seed-validate.ts` يتأكد من وجود هذا السيناريو.

**معيار القبول:**
- [ ] `seed-validate.ts` يجد عضواً ACTIVE بلا PaymentDue
- [ ] `npx prisma db seed` يكتمل

---

### BL-039 — حذف أو دمج `seed-templates.ts`
**الأولوية:** P3 | **الجهد:** XS

**الملفات المتأثرة:**
- `backend/prisma/seed-templates.ts`

**التغيير:**
1. شغّل: `grep -r "seed-templates" backend/` — إذا لا شيء يستورده احذفه
2. أو انقل ما فيه لـ `seed.ts` وأزِل الملف

**معيار القبول:**
- [ ] لا يوجد `seed-templates.ts` (أو تمت إعادة دمجه)
- [ ] `npx prisma db seed` يكتمل

---

### BL-040 — رفع تحقق الحملة المنتهية من `warning` إلى `error`
**الأولوية:** P3 | **الجهد:** XS

**الملفات المتأثرة:**
- `backend/prisma/seed-validate.ts` — السطر 1920

**التغيير:**
```typescript
// بدلاً من pushWarning:
pushError('SEED_CAMPAIGN_EXPIRED_NOT_ARCHIVED',
  'حملة منتهية غير مؤرشفة — يجب أن تكون isActive = false'
);
```

**معيار القبول:**
- [ ] حملة منتهية وغير مؤرشفة → `seed-validate.ts` يُعيد exit code 1

---

### BL-041 — إضافة اختبارات Stripe/Moyasar Webhook
**الأولوية:** P3 | **الجهد:** S

**الملفات المتأثرة:**
- `backend/src/payments/payments.service.spec.ts` — ملف جديد

**التغيير:** اختبارات وحدة لـ:
1. `payment_intent.succeeded` → `PaymentRecord.status = CONFIRMED`
2. `payment_intent.payment_failed` → `status = FAILED`
3. نفس الـ webhook مرتين → لا تأثير مضاعف (idempotency)

**معيار القبول:**
- [ ] `npm run test -- payments.service.spec` يمر بالحالات الثلاث

---

### BL-042 — توثيق المتغيرات البيئية في `.env.example`
**الأولوية:** P3 | **الجهد:** XS

**الملفات المتأثرة:**
- `backend/.env.example`

**التغيير:** أضف كل المتغيرات المستخدمة في الكود والغائبة عن `.env.example`:
```env
ENABLE_DEV_LOGIN=true
REVERSAL_WINDOW_DAYS=90
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MOYASAR_API_KEY=pk_test_...
MOYASAR_WEBHOOK_SECRET=your_secret_here
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
UNIFONIC_APP_SID=
```

**معيار القبول:**
- [ ] كل `process.env.X` في الكود موجود في `.env.example`
- [ ] `grep -rn "process.env\." backend/src/` لا يجد متغيراً غائباً عن `.env.example`

---

## ملخص الـ Backlog

| المرحلة | المهام | P0 | P1 | P2 | P3 | الجهد الكلي |
|---------|--------|----|----|----|----|------------|
| 0 — قبل الإطلاق | BL-001 → BL-005 | 5 | — | — | — | ~3 أيام |
| 1 — أمان | BL-006 → BL-013 | — | 8 | — | — | ~5 أيام |
| 2 — Frontend | BL-014 → BL-026 | — | — | 10 | 3 | ~6 أيام |
| 3 — Schema | BL-027 → BL-032 | — | — | 4 | 2 | ~2 يوم |
| 4 — Backend ميزات | BL-033 → BL-036 | — | 1 | 3 | — | ~5 أيام |
| 5 — Seed/جودة | BL-037 → BL-042 | — | — | — | 6 | ~2 يوم |
| **المجموع** | **42** | **5** | **9** | **17** | **11** | **~23 يوم** |

### ترتيب التنفيذ المقترح

```
الأسبوع 1: BL-001 + BL-002 + BL-003 + BL-004 + BL-005
           → المنتج يصبح آمناً للإطلاق التجريبي

الأسبوع 2: BL-006 إلى BL-013 (أمان)
           + BL-033 (OTP) بالتوازي إذا توفر مطوّر ثانٍ

الأسبوع 3: BL-027 إلى BL-032 (Schema — migration واحد)
           + BL-030, BL-031 (AuditAction + NotificationType)

الأسبوع 4-5: BL-014 إلى BL-026 (Frontend — قابل للتوزيع)

الأسبوع 6: BL-034, BL-035, BL-036 (Backend ميزات)
           + BL-037 إلى BL-042 (Seed + جودة)
```

---

*للتقرير الكامل وتحليل ما تم إصلاحه: [AUDIT_REPORT_v2.md](AUDIT_REPORT_v2.md)*
*لدليل المطوّر: [../../CONTRIBUTING.md](../../CONTRIBUTING.md)*
