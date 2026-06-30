# STGP Frontend

واجهة Next.js App Router عربية باتجاه RTL لنظام CollectiveTrustOS.

## التشغيل

```bash
npm install
npm run dev
```

تعمل الواجهة على `http://localhost:3000` وتتصل افتراضياً بالخلفية على
`http://localhost:3001`.

ملف البيئة المحلي:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_ENABLE_DEV_LOGIN=true
NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=false
```

اجعل `NEXT_PUBLIC_ENABLE_DEV_LOGIN=false` خارج بيئة التطوير. تسجيل الدخول
الأساسي يستخدم OTP، وتوجد آلية تلقائية لتجديد access token عبر refresh token.

فعّل `NEXT_PUBLIC_ENABLE_FUND_CREATE_FLOW=true` لاختبار مسار إنشاء الصندوق/الحملة الجديد. عند تعطيله تبقى شاشة الإنشاء القديمة هي الافتراضية.

## التحقق

```bash
npm run lint
npm run build
```

التطبيق يستخدم Tajawal، ويحافظ على RTL في `src/app/layout.tsx`. طبقة عقود API
موجودة في `src/lib/api/`، ونقطة حماية المسارات في `src/proxy.ts`.
