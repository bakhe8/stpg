const fs = require('fs');
const path = require('path');

function fixLocale(locale) {
  const auditorPath = path.join(__dirname, '../src/locales', locale, 'auditor.json');
  const adminPath = path.join(__dirname, '../src/locales', locale, 'admin.json');
  const memberPath = path.join(__dirname, '../src/locales', locale, 'member.json');

  if (fs.existsSync(auditorPath)) {
    const auditor = JSON.parse(fs.readFileSync(auditorPath, 'utf8'));
    auditor.visibilityWarning = locale === 'ar' 
      ? "هذه البيانات مرئية للمراجع المالي فقط — لا تظهر لبقية الأعضاء" 
      : "[EN] هذه البيانات مرئية للمراجع المالي فقط — لا تظهر لبقية الأعضاء";
    fs.writeFileSync(auditorPath, JSON.stringify(auditor, null, 2) + '\n');
  }

  if (fs.existsSync(adminPath)) {
    const admin = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
    
    admin.platformAccess = {
      readOnly: locale === 'ar' ? "قراءة عادية" : "[EN] قراءة عادية",
      techSupport: locale === 'ar' ? "دعم فني" : "[EN] دعم فني",
      adminAction: locale === 'ar' ? "إجراء إداري" : "[EN] إجراء إداري",
      emergencyAccess: locale === 'ar' ? "وصول طارئ" : "[EN] وصول طارئ",
      loadError: locale === 'ar' ? "خطأ في تحميل السجل" : "[EN] خطأ في تحميل السجل",
      title: locale === 'ar' ? "وصول فريق المنصة إلى بيانات كيانك" : "[EN] وصول فريق المنصة إلى بيانات كيانك",
      desc1: locale === 'ar' ? "كل وصول من فريق CollectiveTrustOS لبيانات كيانك يُسجَّل هنا بشكل تلقائي." : "[EN] كل وصول من فريق CollectiveTrustOS لبيانات كيانك يُسجَّل هنا بشكل تلقائي.",
      desc2: locale === 'ar' ? "هذا السجل غير قابل للحذف أو التعديل." : "[EN] هذا السجل غير قابل للحذف أو التعديل.",
      loading: locale === 'ar' ? "جاري التحميل..." : "[EN] جاري التحميل...",
      empty: locale === 'ar' ? "لم يصل أحد من فريق المنصة إلى بيانات كيانك حتى الآن." : "[EN] لم يصل أحد من فريق المنصة إلى بيانات كيانك حتى الآن.",
      colMember: locale === 'ar' ? "العضو" : "[EN] العضو",
      colRole: locale === 'ar' ? "الدور" : "[EN] الدور",
      colAccessType: locale === 'ar' ? "نوع الوصول" : "[EN] نوع الوصول",
      colDataAccessed: locale === 'ar' ? "البيانات التي وُصل إليها" : "[EN] البيانات التي وُصل إليها",
      colReason: locale === 'ar' ? "السبب" : "[EN] السبب",
      colTimestamp: locale === 'ar' ? "التوقيت" : "[EN] التوقيت"
    };

    admin.entityTabs = {
      members: locale === 'ar' ? "الأعضاء" : "[EN] الأعضاء",
      reviewCenter: locale === 'ar' ? "مركز المراجعات" : "[EN] مركز المراجعات",
      copied: locale === 'ar' ? "✓ تم النسخ" : "[EN] ✓ تم النسخ"
    };

    admin.reviewCenter = {
      noteRequired: locale === 'ar' ? "ملاحظة مطلوبة..." : "[EN] ملاحظة مطلوبة...",
      confirm: locale === 'ar' ? "تأكيد" : "[EN] تأكيد",
      cancel: locale === 'ar' ? "إلغاء" : "[EN] إلغاء",
      empty: locale === 'ar' ? "لا توجد طلبات انضمام قيد المراجعة" : "[EN] لا توجد طلبات انضمام قيد المراجعة",
      rejectReason: locale === 'ar' ? "سبب رفض طلب الانضمام" : "[EN] سبب رفض طلب الانضمام",
      unknownApplicant: locale === 'ar' ? "متقدم غير معروف" : "[EN] متقدم غير معروف",
      relationship: locale === 'ar' ? "العلاقة: {desc}" : "[EN] العلاقة: {desc}",
      sponsor: locale === 'ar' ? "المعرّف: {name}" : "[EN] المعرّف: {name}"
    };

    fs.writeFileSync(adminPath, JSON.stringify(admin, null, 2) + '\n');
  }

  if (fs.existsSync(memberPath)) {
    const member = JSON.parse(fs.readFileSync(memberPath, 'utf8'));
    
    if (!member.membersPage) member.membersPage = {};
    member.membersPage.statusApproved = locale === 'ar' ? "مقبول" : "[EN] مقبول";
    member.membersPage.statusRejected = locale === 'ar' ? "مرفوض" : "[EN] مرفوض";
    member.membersPage.statusCancelled = locale === 'ar' ? "ملغي" : "[EN] ملغي";
    member.membersPage.timelineDecision = locale === 'ar' ? "القرار" : "[EN] القرار";
    member.membersPage.cancelBtn = locale === 'ar' ? "إلغاء" : "[EN] إلغاء";
    member.membersPage.requestRejected = locale === 'ar' ? "تم رفض الطلب" : "[EN] تم رفض الطلب";

    if (!member.disputes) member.disputes = {};
    member.disputes.howItWorksTitle = locale === 'ar' ? "كيف تعمل آلية الاعتراض؟" : "[EN] كيف تعمل آلية الاعتراض؟";
    member.disputes.howItWorksDesc = locale === 'ar' ? "يمكنك فتح نزاع عند الاعتراض على قرار أو عملية. يُراجع المدير النزاع ويمكنه حله أو تصعيده. مدة الفصل محددة بلوائح الكيان." : "[EN] يمكنك فتح نزاع عند الاعتراض على قرار أو عملية. يُراجع المدير النزاع ويمكنه حله أو تصعيده. مدة الفصل محددة بلوائح الكيان.";

    fs.writeFileSync(memberPath, JSON.stringify(member, null, 2) + '\n');
  }
}

fixLocale('ar');
fixLocale('en');
console.log('Added remaining strings to JSON');
