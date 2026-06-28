# Test Runbook

هذا المستند يحدد طريقة تشغيل اختبارات الجودة المحلية/staging قبل اعتبار أي بند في خطة الجاهزية مغلقاً.

## قاعدة البيانات الصحيحة

1. عند تشغيل Docker محلياً، قاعدة التطبيق هي `stgp_dev` داخل حاوية Postgres.
2. أي فحص Seed أو SQL يجب أن يطبع أو يتحقق من هوية قاعدة البيانات قبل الاعتماد على النتيجة.
3. عند الشك، استخدم:

```powershell
docker compose exec -T postgres psql -U postgres -d stgp_dev -c "select current_database(), now();"
```

## UX Role Audit

يشغل من مجلد الواجهة:

```powershell
cd frontend
npm run test:ux:roles
```

معيار النجاح:

- 18/18 حساباً يمرون.
- لا توجد أخطاء console مهمة.
- لا توجد API failures غير مفسرة.
- desktop وmobile ضمن الفحص.
- أي screenshot أو summary يبقى خارج repo، مثل `%TEMP%`.

## Browser Fallback Policy

المسار المفضل عند اختبار واجهة مرئية هو المتصفح الداخلي داخل Codex إذا كان متاحاً.

خطوات القرار:

1. حاول الاتصال بالمتصفح الداخلي حسب تعليمات Browser skill.
2. إذا نجح الاتصال، استخدمه للفحص المرئي والـ DOM والـ console.
3. إذا فشل الاتصال، اقرأ تشخيص المتصفح ثم استخدم Playwright العادي.
4. يجب توثيق سبب fallback في Evidence الخاص بالبند.

الحالة المرصودة في هذه الجلسة بتاريخ 2026-06-28:

```text
Browser runtime listed the Codex In-app Browser, but documentation bootstrap failed:
browser.documentation is not a function
```

لذلك تم استخدام Playwright كبديل مع حفظ لقطات التحقق في `%TEMP%`.

## Focused Playwright Checks

عند تعديل صفحة محددة:

1. سجّل الدخول بحساب seed مناسب للدور.
2. افتح الصفحة المستهدفة.
3. تحقق من:
   - page identity.
   - عدم وجود blank page أو framework overlay.
   - console errors = 0.
   - عدم وجود horizontal overflow على desktop/mobile.
   - ظهور النص/الحالة/الإجراء الذي تم تعديله.
4. احفظ screenshot خارج repo.

## متى يعاد التدقيق الكامل؟

يعاد `npm run test:ux:roles` بعد أي تغيير يمس:

- الصلاحيات أو navigation.
- Entity/Wallet/Path relationship.
- المال والمدفوعات والصرف.
- القرارات والتصويت والاعتراضات.
- Seed data أو rate limit أو auth.

لا يغلق بند UX أو Permission بدون دليل Playwright أو API واضح.
