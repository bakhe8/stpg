const fs = require('fs');
const path = require('path');

function updateLocales() {
  const arPath = path.join(__dirname, '../src/locales/ar/admin.json');
  const enPath = path.join(__dirname, '../src/locales/en/admin.json');

  const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

  if (!ar.rules.designer) ar.rules.designer = {};
  if (!en.rules.designer) en.rules.designer = {};

  const arDesigner = {
    advancedMode: "استخدام المحرر المتقدم (JSON)",
    visualMode: "استخدام المصمم المرئي",
    maxAmount: "الحد الأقصى للمبلغ (ر.س)",
    requireDocs: "إلزام المتقدم بإرفاق مستندات",
    minQuorum: "نسبة النصاب المطلوبة (%)",
    minApproval: "نسبة الإقرار المطلوبة (%)",
    allowedVoteTypes: "أنواع التصويت المسموحة للقرار",
    voteType_SIMPLE_MAJORITY: "الأغلبية البسيطة",
    voteType_TWO_THIRDS: "أغلبية الثلثين",
    voteType_UNANIMOUS: "الإجماع",
    allowTransfer: "السماح بالتحويلات",
    sameWalletOnly: "التحويل داخل نفس المحفظة فقط",
    minAgreedAmount: "الحد الأدنى للاشتراك المتفق عليه (ر.س)",
    requiresAppealsEnabled: "يتطلب تفعيل آلية الاستئناف للكيان",
    allowedPathTypes: "أنواع المسارات المسموحة",
    pathType_COMMITTEE: "لجان",
    pathType_SUBSCRIPTION: "اشتراكات",
    pathType_EMERGENCY: "طوارئ",
    invalidJsonSwitch: "صيغة JSON غير صالحة. يرجى إصلاحها قبل التبديل للمصمم المرئي."
  };

  const enDesigner = {
    advancedMode: "[EN] استخدام المحرر المتقدم (JSON)",
    visualMode: "[EN] استخدام المصمم المرئي",
    maxAmount: "[EN] الحد الأقصى للمبلغ (ر.س)",
    requireDocs: "[EN] إلزام المتقدم بإرفاق مستندات",
    minQuorum: "[EN] نسبة النصاب المطلوبة (%)",
    minApproval: "[EN] نسبة الإقرار المطلوبة (%)",
    allowedVoteTypes: "[EN] أنواع التصويت المسموحة للقرار",
    voteType_SIMPLE_MAJORITY: "[EN] الأغلبية البسيطة",
    voteType_TWO_THIRDS: "[EN] أغلبية الثلثين",
    voteType_UNANIMOUS: "[EN] الإجماع",
    allowTransfer: "[EN] السماح بالتحويلات",
    sameWalletOnly: "[EN] التحويل داخل نفس المحفظة فقط",
    minAgreedAmount: "[EN] الحد الأدنى للاشتراك المتفق عليه (ر.س)",
    requiresAppealsEnabled: "[EN] يتطلب تفعيل آلية الاستئناف للكيان",
    allowedPathTypes: "[EN] أنواع المسارات المسموحة",
    pathType_COMMITTEE: "[EN] لجان",
    pathType_SUBSCRIPTION: "[EN] اشتراكات",
    pathType_EMERGENCY: "[EN] طوارئ",
    invalidJsonSwitch: "[EN] صيغة JSON غير صالحة. يرجى إصلاحها قبل التبديل للمصمم المرئي."
  };

  Object.assign(ar.rules.designer, arDesigner);
  Object.assign(en.rules.designer, enDesigner);

  fs.writeFileSync(arPath, JSON.stringify(ar, null, 2) + '\n');
  fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
}

updateLocales();
console.log('Added Rule Designer translations');
