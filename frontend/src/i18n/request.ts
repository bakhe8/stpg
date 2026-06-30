import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'ar';

  // Fallback to 'ar' if locale is unsupported
  const validLocale = ['ar', 'en'].includes(locale) ? locale : 'ar';

  return {
    locale: validLocale,
    messages: {
      ...(await import(`../locales/${validLocale}/common.json`)).default,
      ...(await import(`../locales/${validLocale}/auth.json`)).default,
      ...(await import(`../locales/${validLocale}/member.json`)).default,
      ...(await import(`../locales/${validLocale}/admin.json`)).default,
      ...(await import(`../locales/${validLocale}/auditor.json`)).default,
      ...(await import(`../locales/${validLocale}/analytics.json`)).default,
      ...(await import(`../locales/${validLocale}/dashboard.json`)).default,
      ...(await import(`../locales/${validLocale}/reviewCenter.json`)).default,
      ...(await import(`../locales/${validLocale}/entitySettings.json`)).default,
      ...(await import(`../locales/${validLocale}/health.json`)).default,
      ...(await import(`../locales/${validLocale}/platform.json`)).default,
    }
  };
});
