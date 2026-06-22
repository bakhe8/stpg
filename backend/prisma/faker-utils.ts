import { fakerAR } from '@faker-js/faker';

// Fix the seed for deterministic generation across runs
fakerAR.seed(12345);

export const generateArabicName = (familyName?: string) => {
  const gender = fakerAR.person.sexType();
  const firstName = fakerAR.person.firstName(gender);
  const lastName = familyName || fakerAR.person.lastName();
  return `${firstName} ${lastName}`;
};

export const generateSaudiPhone = (base: number, order: number) => {
  // Saudi phone format: +966 5X XXX XXXX
  // We use the provided logic from seed.ts but slightly randomize if we want, or stick to the reproducible ones
  return `+9665${String(base + order).padStart(8, '0')}`;
};

export const generateAvatarUrl = (gender: 'male' | 'female', id: string) => {
  // Use UI Avatars or dicebear for realistic generic avatars if needed
  // But for the seed environment, they use: https://seed.collectivetrust.local/avatars/{key}.png
  // To avoid changing their local domains, let's keep the format
  return `https://seed.collectivetrust.local/avatars/${id}.png`;
};

export const generateDependantNotes = () => {
  const noteTypes = [
    'يحتاج متابعة علاجية دورية.',
    'مستفيد من دعم التعليم.',
    'يشارك في الأنشطة المجتمعية.',
    'طلب دعم تعليمي محتمل للفصل القادم.',
    'مدرج في ملف الدعم الاجتماعي.',
    'يحتاج أدوية شهرية منتظمة.',
    'مرشح لمنحة تدريب مبكر.',
    'يحتاج مستلزمات تأهيلية دورية.',
    'مشارك في ملف دخل الأسرة.',
    'مرفق في ملف الاحتياج الأسري.'
  ];
  return fakerAR.helpers.arrayElement(noteTypes);
};

export const generateDateBetween = (startDaysAgo: number, endDaysAgo: number) => {
  const start = new Date();
  start.setDate(start.getDate() - startDaysAgo);
  
  const end = new Date();
  end.setDate(end.getDate() - endDaysAgo);
  
  return fakerAR.date.between({ from: start, to: end });
};

export const faker = fakerAR;
