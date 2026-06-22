التأثير الصحيح على الموقع

سيكون التأثير على 4 مستويات:

1. تأثير على الواجهة

المفروض يكون محدودًا جدًا.

العضو لا يرى ملفات مثل:

سياسة الحساب البنكي
سياسة الفائض والعجز
سياسة الحفظ والأرشفة
سياسة تضارب المصالح
سياسة الإشعارات

هو يرى نتائجها فقط.

مثال:

بدل أن يرى العضو ملفًا اسمه [WITHDRAWAL_AND_REFUND_POLICY.md](./WITHDRAWAL_AND_REFUND_POLICY.md)، يرى عند الانسحاب:

إذا انسحبت الآن:
- يتوقف اشتراكك نهاية هذا الشهر.
- لا تسترد الاشتراكات السابقة.
- تبقى طلباتك المفتوحة قيد المراجعة.
- يمكنك تحميل تقرير نهائي.

إذن السياسة موجودة في الخلف، لكن تظهر للعضو كرسالة واضحة وقت الحاجة.

2. تأثير على قاعدة البيانات

هنا التأثير أكبر.

هذه الملفات ستضيف جداول أو أعمدة مثل:

bank_accounts
custody_transfers
payment_reconciliations
delinquency_rules
refund_policies
notification_logs
document_retention_rules
conflict_of_interest_checks
closure_records

لكن ليس كلها من البداية.

بعضها يمكن أن يكون فقط policies داخل JSONB في البداية، لأن قاعدة البيانات عندك أصلًا مخططة لدعم policies, policy_versions, وrules، وهذا مناسب جدًا لهذه السياسات.

يعني بدل أن تبني 12 نظامًا منفصلًا، تجعلها:

Policy Modules

ثم تفعل ما تحتاجه في كل مرحلة.

3. تأثير على الـ MVP

هنا أهم نقطة.

لو وضعتها كلها داخل MVP، ستثقل المشروع جدًا.

لذلك أرى تقسيمها:

يدخل في MVP لكن بشكل بسيط

هذه تؤثر مباشرة على تشغيل الصندوق من أول يوم:

الملف	تأثيره على MVP
[BANK_ACCOUNT_AND_CUSTODY](./BANK_ACCOUNT_AND_CUSTODY.md)	تحديد أين المال ومن أمين الصندوق
[COLLECTION_AND_DELINQUENCY](./COLLECTION_AND_DELINQUENCY_POLICY.md)	متى العضو متأخر وماذا يحدث
[WITHDRAWAL_AND_REFUND](./WITHDRAWAL_AND_REFUND_POLICY.md)	ماذا يحدث عند الانسحاب
[NOTIFICATION_AND_SERVICE_OF_NOTICE](./NOTIFICATION_AND_SERVICE_OF_NOTICE.md)	متى يعتبر العضو مُبلّغًا
[DOCUMENT_RETENTION_AND_ATTACHMENTS](./DOCUMENT_RETENTION_AND_ATTACHMENTS.md)	حفظ الإيصالات والمرفقات

لكن تكون بنسخة بسيطة جدًا.

مثال:
سياسة التأخر في MVP لا تحتاج تعقيدًا. تكفي:

Grace Period: 15 days
After grace: Suspended
Admin can reactivate after payment
يؤجل لما بعد MVP

هذه مهمة، لكن لا يجب أن تعطل البداية:

الملف	المرحلة
[HOUSEHOLD_AND_REPRESENTATION_MODEL](./HOUSEHOLD_AND_REPRESENTATION_MODEL.md)	قبل صناديق العائلة الكبيرة
[CONFLICT_OF_INTEREST_POLICY](./CONFLICT_OF_INTEREST_POLICY.md)	V2 أو عند إضافة لجنة ومراجع
[SURPLUS_AND_DEFICIT_POLICY](./SURPLUS_AND_DEFICIT_POLICY.md)	V2
[CLOSURE_AND_ARCHIVING_POLICY](./CLOSURE_AND_ARCHIVING_POLICY.md)	V2
[LEGAL_AND_COMPLIANCE_BOUNDARIES](./LEGAL_AND_COMPLIANCE_BOUNDARIES.md)	قبل الإطلاق العام
[ABUSE_PREVENTION_AND_TRUST_SAFETY](./ABUSE_PREVENTION_AND_TRUST_SAFETY.md)	تدريجيًا
[DATA_PROTECTION_POLICY](./DATA_PROTECTION_POLICY.md)	قبل تخزين بيانات حساسة حقيقية
4. تأثير على تجربة المستخدم

لو صُممت خطأ، ستجعل الموقع مخيفًا ومعقدًا.

لكن لو صُممت صح، ستزيد الثقة.

القاعدة:

لا تعرض السياسة كاملة إلا عند الحاجة.
اعرض أثرها بلغة بسيطة.

مثال سيئ:

وفقًا للبند 4.2.1 من سياسة الفائض والعجز...

مثال جيد:

يوجد فائض 1,200 ريال في هذه الحملة.
اختر ما تقترحه:
[إرجاع الفائض للداعمين]
[نقله لمحفظة الطوارئ بعد موافقتهم]
[إبقاؤه للحالة لمدة 30 يومًا]
كيف تظهر هذه السياسات في الموقع؟

ليست كصفحات كثيرة، بل كـ حواجز ذكية داخل المسار.

عند الدفع

تظهر سياسة التحصيل:

ارفع إيصال التحويل.
سيتم تأكيد الدفع بعد مراجعة أمين الصندوق.
عند التأخر
اشتراكك متأخر 12 يومًا.
بقي 3 أيام قبل تعليق حق التصويت والاستفادة.
عند الانسحاب
انسحابك سيوقف الاستحقاقات الجديدة.
الاشتراكات السابقة غير مستردة حسب سياسة المحفظة.
عند تغيير الحوكمة

وهذا موجود عندك أصلاً في عقد مشاركة العضو:

تم تغيير سياسة المسار.
راجع الشروط الجديدة للاستمرار أو الانسحاب أو الاعتراض.

ملف عقد المشاركة يدعم هذه الفكرة بوضوح لأنه يحفظ Snapshot لشروط العضو ولا يجعله يستمر تلقائيًا إذا تغيرت الحوكمة.

عند رفع مستند
هذا المستند حساس.
سيظهر للجنة والمراجع فقط، ولن يظهر لبقية الأعضاء.

وهذا ينسجم مع قاعدة الخصوصية عندك: “نخفي الإنسان عند الحاجة، ولا نخفي المال”.

التأثير الأكبر سيكون على لوحة المدير

العضو لا يرى التعقيد.
المدير سيرى إعدادات أكثر، لكن يجب أن تكون في معالج إنشاء وليس كلها في شاشة واحدة.

مثلاً عند إنشاء محفظة:

1. معلومات المحفظة
2. الاشتراك والدفع
3. التأخر والتعليق
4. الانسحاب والاسترداد
5. المرفقات المطلوبة
6. الشفافية والخصوصية
7. الاعتراضات

لكن تكون أغلبها بقيم افتراضية جاهزة.

مثال:

قالب محفظة طوارئ عائلية
- فترة سماح: 15 يوم
- الانسحاب: نهاية الشهر
- المستندات: اختيارية
- الخصوصية: اسم المستفيد مخفي
- الاعتراض: خلال 7 أيام

هنا الملفات الـ 12 تتحول إلى قوالب وسياسات جاهزة، لا إلى عبء على المستخدم.

هل ستزيد تكلفة التطوير؟

نعم، إذا بنيتها كلها كنظام عميق من البداية.

لكن إذا تعاملت معها كالتالي، فالزيادة معقولة:

MVP:
سياسات ثابتة + إعدادات محدودة

V2:
سياسات قابلة للتخصيص

V3:
محرك قواعد متقدم + نسخ تاريخية كاملة + تقارير امتثال

وهذا ينسجم مع فلسفة التنفيذ المرحلي عندك: الأساس أولًا، ثم الحوكمة، ثم العلاقات، ثم الذكاء والنضج.

القرار العملي

لا تضف 12 ملف كميزات مستقلة.

أضفها كالتالي:

مجموعة 1: تدخل في النظام كقواعد MVP مبسطة
[BANK_ACCOUNT_AND_CUSTODY](./BANK_ACCOUNT_AND_CUSTODY.md)
[COLLECTION_AND_DELINQUENCY](./COLLECTION_AND_DELINQUENCY_POLICY.md)
[WITHDRAWAL_AND_REFUND](./WITHDRAWAL_AND_REFUND_POLICY.md)
[NOTIFICATION_AND_SERVICE_OF_NOTICE](./NOTIFICATION_AND_SERVICE_OF_NOTICE.md)
[DOCUMENT_RETENTION_AND_ATTACHMENTS](./DOCUMENT_RETENTION_AND_ATTACHMENTS.md)
مجموعة 2: تدخل كقوالب وسياسات V2
[HOUSEHOLD_AND_REPRESENTATION_MODEL](./HOUSEHOLD_AND_REPRESENTATION_MODEL.md)
[CONFLICT_OF_INTEREST_POLICY](./CONFLICT_OF_INTEREST_POLICY.md)
[SURPLUS_AND_DEFICIT_POLICY](./SURPLUS_AND_DEFICIT_POLICY.md)
[CLOSURE_AND_ARCHIVING_POLICY](./CLOSURE_AND_ARCHIVING_POLICY.md)
مجموعة 3: تدخل كإطار حماية قبل الإطلاق العام
[LEGAL_AND_COMPLIANCE_BOUNDARIES](./LEGAL_AND_COMPLIANCE_BOUNDARIES.md)
[ABUSE_PREVENTION_AND_TRUST_SAFETY](./ABUSE_PREVENTION_AND_TRUST_SAFETY.md)
[DATA_PROTECTION_POLICY](./DATA_PROTECTION_POLICY.md)
الخلاصة

تأثير الـ 12 ملف على الموقع يجب أن يكون:

أعمق في الخلفية
أبسط في الواجهة
أقوى في الثقة
أوضح في القرارات
أثقل قليلًا على لوحة المدير
غير ظاهر تقريبًا للعضو إلا وقت الحاجة

وأهم قاعدة:

لا نحول السياسات إلى شاشات كثيرة. نحولها إلى رسائل ذكية، حالات واضحة، وقيم افتراضية داخل معالج الإنشاء.