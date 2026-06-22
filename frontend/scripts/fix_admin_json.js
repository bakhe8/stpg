const fs = require('fs');
const path = require('path');

function addNamespaces(locale) {
  const filePath = path.join(__dirname, '../src/locales', locale, 'admin.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Ensure these keys aren't mangled in the middle
  if (data.finance && data.finance.notePlaceholder === "disputeDesc") {
    data.finance.notePlaceholder = locale === 'ar' ? "مثال: تم التحويل من تطبيق البنك" : "[EN] مثال: تم التحويل من تطبيق البنك";
    delete data.finance.disputeDesc;
    delete data.finance.submitBtn;
    delete data.finance.submitting;
  }

  // Restore the real dispute keys
  if (!data.disputes) {
    data.disputes = {};
  }
  
  if (locale === 'ar') {
    data.decisions = {
      "reasonEviction": "يُطلب منك التصويت لأنك عضو في مجلس الإدارة — قرار الإخراج يستلزم تصويتاً جماعياً",
      "reasonMembership": "يُطلب منك التصويت لأنك عضو في اللجنة المختصة بقبول العضوية",
      "reasonDisbursement": "يُطلب منك التصويت لأنك عضو في لجنة الموافقة على الصرف",
      "reasonPolicy": "يُطلب منك التصويت لأن تعديل شروط الاشتراك يستلزم موافقة جماعية",
      "reasonGovernance": "يُطلب منك التصويت لأن تغيير آليات الحوكمة يستلزم قراراً جماعياً",
      "reasonDefault": "يُطلب منك التصويت وفق لوائح الكيان",
      "whyVoteTitle": "لماذا يُطلب منك التصويت على هذا القرار؟"
    };
    data.disputes.ruleColumn = "القاعدة";
    data.disputes.timelineOpened = "فُتح النزاع";
    data.disputes.timelineMediation = "قيد الوساطة";
    data.disputes.timelineEscalated = "تم التصعيد";
    data.disputes.timelineClosed = "تم الإغلاق";
    data.analytics = {
      "metricPaymentFatigue": "إرهاق الدفع",
      "metricVotingFatigue": "مشاركة التصويت",
      "metricWeakGovernance": "مسار حوكمة ضعيف",
      "metricDeadWallet": "محفظة شبه ميتة",
      "metricEmergencyWallet": "محفظة طوارئ",
      "metricDisputeRate": "معدل الاعتراضات",
      "metricOffPlatform": "القرارات خارج النظام"
    };
  } else {
    data.decisions = {
      "reasonEviction": "[EN] يُطلب منك التصويت لأنك عضو في مجلس الإدارة — قرار الإخراج يستلزم تصويتاً جماعياً",
      "reasonMembership": "[EN] يُطلب منك التصويت لأنك عضو في اللجنة المختصة بقبول العضوية",
      "reasonDisbursement": "[EN] يُطلب منك التصويت لأنك عضو في لجنة الموافقة على الصرف",
      "reasonPolicy": "[EN] يُطلب منك التصويت لأن تعديل شروط الاشتراك يستلزم موافقة جماعية",
      "reasonGovernance": "[EN] يُطلب منك التصويت لأن تغيير آليات الحوكمة يستلزم قراراً جماعياً",
      "reasonDefault": "[EN] يُطلب منك التصويت وفق لوائح الكيان",
      "whyVoteTitle": "[EN] لماذا يُطلب منك التصويت على هذا القرار؟"
    };
    data.disputes.ruleColumn = "[EN] القاعدة";
    data.disputes.timelineOpened = "[EN] فُتح النزاع";
    data.disputes.timelineMediation = "[EN] قيد الوساطة";
    data.disputes.timelineEscalated = "[EN] تم التصعيد";
    data.disputes.timelineClosed = "[EN] تم الإغلاق";
    data.analytics = {
      "metricPaymentFatigue": "[EN] إرهاق الدفع",
      "metricVotingFatigue": "[EN] مشاركة التصويت",
      "metricWeakGovernance": "[EN] مسار حوكمة ضعيف",
      "metricDeadWallet": "[EN] محفظة شبه ميتة",
      "metricEmergencyWallet": "[EN] محفظة طوارئ",
      "metricDisputeRate": "[EN] معدل الاعتراضات",
      "metricOffPlatform": "[EN] القرارات خارج النظام"
    };
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`Fixed ${locale}/admin.json`);
}

addNamespaces('ar');
addNamespaces('en');
