export const ar = {
  common: {
    loading: 'جاري التحميل...',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    approve: 'اعتماد',
    reject: 'رفض',
    success: 'تمت العملية بنجاح',
    error: 'حدث خطأ',
    actions: 'الإجراءات',
  },
  entities: {
    title: 'الكيانات',
    newEntity: 'كيان جديد',
    subEntities: 'الكيانات الفرعية',
    policies: 'السياسات',
    members: 'الأعضاء',
  },
  wallets: {
    title: 'المحافظ',
    balance: 'الرصيد',
    relationships: 'الارتباطات',
    sharedWallet: 'محفظة مشتركة',
  },
  analytics: {
    title: 'تحليلات الصندوق',
    totalBalance: 'إجمالي الأرصدة المجمعة',
    subEntitiesCount: 'عدد الكيانات التابعة',
    walletDistribution: 'توزيع الأرصدة على الكيانات',
    noData: 'لا توجد بيانات متاحة',
  },
};

export type TranslationKey = keyof typeof ar;

export function useTranslation() {
  return {
    t: (section: TranslationKey, key: string) => {
      // @ts-expect-error simple dict
      return ar[section]?.[key] || key;
    },
  };
}
