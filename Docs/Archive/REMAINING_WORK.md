# خطة إتمام النواقص — CollectiveTrustOS / STGP
> آخر تحديث: 2026-06-22
> الحالة: 2 بنود متبقية فقط قبل الإطلاق

---

## الوضع الراهن (بعد فحص الكود الفعلي)

| البند | الحالة |
|---|---|
| CI/CD (.github/workflows/ci-cd.yml) | ✅ مكتمل |
| Docker prod (docker-compose.prod.yml + Caddyfile) | ✅ مكتمل |
| Backup script (backup.sh) | ✅ مكتمل |
| RLS / TenantContext (AsyncLocalStorage + Proxy + SET LOCAL) | ✅ مكتمل |
| Support View Backend (SupportService + SupportController + API client) | ✅ مكتمل |
| **SMS Real Provider** | ✅ مكتمل |
| **PlatformSupportBanner — التركيب** | ✅ مكتمل |

---

## البند 1 — SMS Real Provider

### الهدف
تشغيل OTP حقيقي عبر Unifonic (أو Twilio) بدل `MockSmsProvider` الذي يكتفي بـ `logger.log`.

### الوضع الحالي
- `backend/src/identity/sms/sms-provider.interface.ts` ✅ موجود — interface + injection token
- `backend/src/identity/sms/mock-sms.provider.ts` ✅ موجود
- `backend/src/identity/sms/sms.module.ts` ✅ موجود — يقرأ `SMS_PROVIDER` من env
- **المشكلة:** `sms.module.ts` يرمي `Error` إذا كان `SMS_PROVIDER` غير `'mock'` لأنه لا يوجد case آخر

### الخطوات

#### 1.1 — إنشاء `unifonic.provider.ts`
**الملف الجديد:** `backend/src/identity/sms/providers/unifonic.provider.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import type { SmsProvider, SmsSendResult } from '../sms-provider.interface';

@Injectable()
export class UnifonicProvider implements SmsProvider {
  private readonly logger = new Logger(UnifonicProvider.name);
  private readonly apiKey = process.env.UNIFONIC_API_KEY!;
  private readonly senderId = process.env.UNIFONIC_SENDER_ID ?? 'CollectiveTrust';
  private readonly baseUrl = 'https://el.cloud.unifonic.com/rest/SMS/messages';

  async sendOtp(phoneNumber: string, otp: string): Promise<SmsSendResult> {
    const body = new URLSearchParams({
      AppSid: this.apiKey,
      SenderID: this.senderId,
      Body: `رمز التحقق الخاص بك: ${otp}`,
      Recipient: phoneNumber,
    });

    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const json = await res.json();
    if (json.Success === 'True') {
      return { success: true, messageId: json.data?.MessageID };
    }
    this.logger.error(`Unifonic error: ${JSON.stringify(json)}`);
    return { success: false, error: json.Message ?? 'Unknown error' };
  }
}
```

#### 1.2 — إنشاء `twilio.provider.ts` (بديل)
**الملف الجديد:** `backend/src/identity/sms/providers/twilio.provider.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import type { SmsProvider, SmsSendResult } from '../sms-provider.interface';

@Injectable()
export class TwilioProvider implements SmsProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  private readonly accountSid = process.env.TWILIO_ACCOUNT_SID!;
  private readonly authToken = process.env.TWILIO_AUTH_TOKEN!;
  private readonly fromNumber = process.env.TWILIO_FROM_NUMBER!;

  async sendOtp(phoneNumber: string, otp: string): Promise<SmsSendResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: this.fromNumber,
      To: phoneNumber,
      Body: `Your verification code: ${otp}`,
    });

    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const json = await res.json();
    if (res.ok) {
      return { success: true, messageId: json.sid };
    }
    this.logger.error(`Twilio error: ${JSON.stringify(json)}`);
    return { success: false, error: json.message ?? 'Unknown error' };
  }
}
```

#### 1.3 — تحديث `sms.module.ts`
**الملف:** `backend/src/identity/sms/sms.module.ts`

استبدل المحتوى بالكامل:

```typescript
import { Module } from '@nestjs/common';
import { MockSmsProvider } from './mock-sms.provider';
import { UnifonicProvider } from './providers/unifonic.provider';
import { TwilioProvider } from './providers/twilio.provider';
import { SMS_PROVIDER } from './sms-provider.interface';

@Module({
  providers: [
    {
      provide: SMS_PROVIDER,
      useFactory: (): InstanceType<typeof MockSmsProvider | typeof UnifonicProvider | typeof TwilioProvider> => {
        const provider = process.env.SMS_PROVIDER ?? 'mock';
        if (provider === 'unifonic') return new UnifonicProvider();
        if (provider === 'twilio') return new TwilioProvider();
        if (provider === 'mock') return new MockSmsProvider();
        throw new Error(`SMS_PROVIDER "${provider}" غير مدعوم. القيم المقبولة: mock | unifonic | twilio`);
      },
    },
  ],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}
```

#### 1.4 — متغيرات البيئة
أضف إلى `.env.production.example` و `.env`:

```env
# SMS Provider: mock | unifonic | twilio
SMS_PROVIDER=unifonic

# Unifonic (إذا SMS_PROVIDER=unifonic)
UNIFONIC_API_KEY=your-api-key-here
UNIFONIC_SENDER_ID=CollectiveTrust

# Twilio (إذا SMS_PROVIDER=twilio)
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_AUTH_TOKEN=your-auth-token
# TWILIO_FROM_NUMBER=+1234567890
```

#### 1.5 — التحقق
```bash
cd backend
npx tsc --noEmit
# SMS_PROVIDER=unifonic UNIFONIC_API_KEY=xxx npm run start:dev
# ثم اختبر OTP — يصل SMS حقيقي
```

---

## البند 2 — PlatformSupportBanner التركيب

### الهدف
إظهار شريط تحذيري لأعضاء الكيان عندما يكون هناك فني دعم يصل لبياناتهم (جلسة دعم نشطة).

### الوضع الحالي
- `frontend/src/components/platform/PlatformSupportBanner.tsx` ✅ Component موجود
- `frontend/src/lib/api/support.ts` ✅ `getActiveSessions(entityId)` موجودة
- `frontend/src/app/(main)/entities/[id]/page.tsx` ✅ يجلب `supportSessions` لكن **فقط عند فتح تبويب الدعم (lazy load)**
- **المشكلة:** البانر لا يظهر أبداً لأنه غير مُستورَد في أي صفحة

### الخطوات

#### 2.1 — تعديل `entities/[id]/page.tsx`

**التغيير 1 — أضف import للـ Banner (بعد imports الموجودة، حوالي السطر 13):**
```tsx
import PlatformSupportBanner from '../../../../components/platform/PlatformSupportBanner';
```

**التغيير 2 — اجعل تحميل الجلسات يحدث عند تحميل الصفحة (eager load):**

في `useEffect` الرئيسي (الذي يُشغَّل عند تحميل `id`) أضف استدعاء `getActiveSessions`:

```tsx
useEffect(() => {
  if (!id) return;
  loadData();
  // تحميل جلسات الدعم عند تحميل الصفحة (ليس فقط عند فتح التبويب)
  getActiveSessions(id as string)
    .then(setSupportSessions)
    .catch(() => {/* صامت — البانر لن يظهر فقط */});
}, [id]);
```

**التغيير 3 — أضف البانر في أعلى JSX (قبل الـ header مباشرة):**

```tsx
return (
  <div className={styles.page}>
    {/* بانر جلسة الدعم — يظهر فقط عند وجود جلسة نشطة */}
    {supportSessions.length > 0 && (
      <PlatformSupportBanner
        operatorName={supportSessions[0].platformAccount?.name ?? 'فريق الدعم'}
        operatorRole="دعم فني"
      />
    )}

    {/* ... باقي الـ JSX كما هو ... */}
```

#### 2.2 — التحقق من الترجمة
تأكد أن مفتاح `platformSupportBanner.supportModeMessage` موجود في:
- `frontend/src/locales/ar/common.json`
- `frontend/src/locales/en/common.json`

إذا لم يكن موجوداً أضفه:
```json
// ar/common.json
"platformSupportBanner": {
  "supportModeMessage": "تنبيه: {operatorName} ({operatorRole}) يصل حالياً لبيانات هذا الكيان"
}

// en/common.json
"platformSupportBanner": {
  "supportModeMessage": "Notice: {operatorName} ({operatorRole}) is currently accessing this entity's data"
}
```

#### 2.3 — التحقق النهائي
```bash
cd frontend
npx tsc --noEmit
# افتح entities/[id] لكيان عليه جلسة دعم نشطة
# يجب أن يظهر البانر الأصفر في الأعلى
```

---

## Checklist الإطلاق (من MASTER_PLAN.md)

بعد إتمام البندين أعلاه، تحقق من كل هذا قبل الإطلاق:

```
□ tsc --noEmit → صفر أخطاء في backend و frontend
□ npm run build → ينجح كلاهما
□ Docker Compose يعمل محلياً (docker-compose up)
□ docker-compose.prod.yml يعمل على السيرفر
□ Caddy يعيد التوجيه صحيحاً (HTTP → HTTPS)
□ HTTPS يعمل على الدومين
□ سكريبت الباكاب يعمل: bash backup.sh
□ SMS_PROVIDER=unifonic → OTP يصل على الجوال
□ /platform/login يعمل بمستخدم منصة
□ PlatformStatusBanner يظهر في كيان معلق
□ Export يُحمِّل ملف JSON (GET /entities/:id/export)
□ الاعتراض على التعليق يُرسَل ويظهر في لوحة المنصة
□ Fund Health يعرض 7 مؤشرات
□ PlatformSupportBanner يظهر عند وجود جلسة دعم نشطة
□ الواجهة مقروءة على شاشة جوال 375px
```

---

## ترتيب التنفيذ المقترح

```
اليوم 1:
  → البند 2 (PlatformSupportBanner) — ساعة واحدة فقط
    - إضافة import
    - eager load في useEffect
    - إضافة JSX في أعلى الصفحة
    - التحقق من مفاتيح الترجمة
    - tsc --noEmit

اليوم 2:
  → البند 1 (SMS) — نصف يوم
    - إنشاء providers/unifonic.provider.ts
    - تحديث sms.module.ts
    - إضافة env vars
    - اختبار إرسال OTP حقيقي

اليوم 3:
  → Checklist الإطلاق كاملاً
```
