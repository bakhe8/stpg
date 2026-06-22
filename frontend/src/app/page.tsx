import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import styles from './page.module.css';

const FEATURES = [
  { icon: '◎', title: 'دفعات منظّمة', desc: 'تتبّع كل دفعة وتأخير ورصيد في مكان واحد.' },
  { icon: '✓', title: 'قرارات شفافة', desc: 'تصويت ونصاب وموافقات محفوظة وموثّقة.' },
  { icon: '◇', title: 'أدوار وصلاحيات', desc: 'كل عضو يرى ما يخص دوره وعلاقته بالكيان.' },
  { icon: '↗', title: 'انضمام مباشر', desc: 'دعوات واضحة تُدخل الأعضاء إلى الكيان المناسب.' },
] as const;

export default async function Home() {
  const cookieStore = await cookies();
  if (cookieStore.get('accessToken')?.value) {
    redirect('/dashboard');
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>◇</span>
          <span>CollectiveTrustOS</span>
        </div>
        <Link href="/login" className={styles.loginLink}>دخول</Link>
      </header>

      <section className={styles.hero}>
        <h1>
          نظّم صندوقك الجماعي <span className={styles.highlight}>بوضوح وثقة</span>
        </h1>
        <p>
          اجمع الأعضاء، تتبّع المدفوعات، واتخذ القرارات بشفافية، سواء كان
          صندوقاً عائلياً أو تعاونية أو مجموعة أصدقاء.
        </p>
        <div className={styles.actions}>
          <Link href="/login" className={styles.primaryLink}>ابدأ الآن</Link>
          <Link href="/join" className={styles.secondaryLink}>لديّ رابط دعوة</Link>
        </div>
      </section>

      <section className={styles.features}>
        {FEATURES.map((feature) => (
          <article key={feature.title} className={styles.feature}>
            <span className={styles.featureIcon}>{feature.icon}</span>
            <strong>{feature.title}</strong>
            <p>{feature.desc}</p>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        CollectiveTrustOS · {new Date().getFullYear()}
      </footer>
    </main>
  );
}
