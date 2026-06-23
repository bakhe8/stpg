import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import styles from './page.module.css';

const ENTITY_TYPES = [
  { icon: '🏠', label: 'الصناديق العائلية' },
  { icon: '🏕️', label: 'القبائل والعشائر' },
  { icon: '🤝', label: 'التعاونيات' },
  { icon: '🏛️', label: 'الجمعيات' },
  { icon: '👥', label: 'اللجان' },
  { icon: '🏘️', label: 'أحياء السكن' },
] as const;

const STEPS = [
  {
    n: '١',
    title: 'أنشئ كيانك',
    desc: 'حدّد النوع، ضع القواعد والأدوار، وامنح كل عضو صلاحياته الدقيقة.',
  },
  {
    n: '٢',
    title: 'ادعُ الأعضاء',
    desc: 'شارك رابط دعوة واحداً. الأعضاء يتقدّمون والإدارة توافق بنقرة.',
  },
  {
    n: '٣',
    title: 'أدِر وتتبّع',
    desc: 'اشتراكات، قرارات، صرف، تدقيق — كل شيء موثّق وشفاف في مكان واحد.',
  },
] as const;

const FEATURES = [
  {
    icon: '◎',
    title: 'إدارة الأعضاء والأدوار',
    desc: 'مؤسس، مدير، مدقق، عضو، داعم — كل دور يرى ما يخصّه فقط. طلبات الانضمام تمر بمسار موافقة قابل للضبط.',
  },
  {
    icon: '💳',
    title: 'تتبّع الاشتراكات والمدفوعات',
    desc: 'سجّل كل دفعة، تتبّع التأخير، وراقب رصيد كل عضو لحظةً بلحظة. تقارير شاملة للحالة المالية.',
  },
  {
    icon: '✓',
    title: 'قرارات شفافة وموثّقة',
    desc: 'كل قرار له تصويت، نصاب، وسجل لا يُمحى. القرارات تُرفق بالمستندات وتخضع للطعن والاستئناف.',
  },
  {
    icon: '🔗',
    title: 'دعوات بسيطة وفعّالة',
    desc: 'رابط دعوة واحد يُرسَل لأي شخص. العضو الجديد يرى تفاصيل الكيان وشروط الانضمام قبل التقديم.',
  },
  {
    icon: '📋',
    title: 'سجل تدقيق كامل',
    desc: 'كل حدث في المنصة مسجّل: من فعل ماذا ومتى. لجان التدقيق تملك صلاحية الاطلاع الكاملة.',
  },
  {
    icon: '🏦',
    title: 'صرف الدعم والمستفيدون',
    desc: 'أدِر طلبات الصرف، حدّد المستفيدين، وتتبّع حالة كل طلب من التقديم حتى التحويل.',
  },
] as const;

export default async function Home() {
  const cookieStore = await cookies();
  if (cookieStore.get('accessToken')?.value) {
    redirect('/dashboard');
  }

  return (
    <div className={styles.root}>

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>◇</span>
            <span>CollectiveTrustOS</span>
          </div>
          <nav className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>الميزات</a>
            <a href="#how" className={styles.navLink}>كيف يعمل</a>
            <Link href="/login" className={styles.navCta}>دخول</Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>منصة حوكمة الصناديق الجماعية</div>
          <h1 className={styles.heroTitle}>
            أدِر صندوقك الجماعي<br />
            <span className={styles.heroAccent}>بوضوح وثقة</span>
          </h1>
          <p className={styles.heroDesc}>
            منصة متكاملة تجمع الأعضاء، تتبّع المدفوعات، وتوثّق القرارات —
            سواء كنت تدير صندوقاً عائلياً أو قبلياً أو تعاونية أو جمعية.
          </p>
          <div className={styles.heroActions}>
            <Link href="/join" className={styles.heroPrimary}>ابدأ مجاناً</Link>
            <Link href="/login" className={styles.heroSecondary}>لديّ حساب</Link>
          </div>
        </div>

        {/* معاينة المنتج */}
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.mockWindow}>
            <div className={styles.mockBar}>
              <span className={styles.mockDot} />
              <span className={styles.mockDot} />
              <span className={styles.mockDot} />
            </div>
            <div className={styles.mockBody}>
              <div className={styles.mockSidebar}>
                {['الرئيسية', 'الأعضاء', 'المالية', 'القرارات', 'التدقيق'].map(item => (
                  <div key={item} className={styles.mockSideItem}>{item}</div>
                ))}
              </div>
              <div className={styles.mockMain}>
                <div className={styles.mockRow}>
                  {['الرصيد الكلي', 'الأعضاء النشطون', 'القرارات'].map((label, i) => (
                    <div key={label} className={`${styles.mockCard} ${i === 0 ? styles.mockCardAccent : ''}`}>
                      <div className={styles.mockCardLabel}>{label}</div>
                      <div className={styles.mockCardVal}>{['٢٤٥,٠٠٠', '٣٢', '١٢'][i]}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.mockTable}>
                  {[
                    ['أحمد الهاشمي', 'مدفوع', '+'],
                    ['سارة العتيبي', 'مدفوع', '+'],
                    ['ناصر القحطاني', 'متأخر', '!'],
                    ['ليان الدوسري', 'مدفوع', '+'],
                  ].map(([name, status, icon]) => (
                    <div key={name} className={styles.mockTableRow}>
                      <span className={styles.mockAvatar}>{icon}</span>
                      <span className={styles.mockName}>{name}</span>
                      <span className={`${styles.mockStatus} ${status === 'متأخر' ? styles.mockStatusLate : styles.mockStatusOk}`}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Entity types ───────────────────────────────────────────── */}
      <section className={styles.entities}>
        <p className={styles.entitiesLabel}>مصمَّم لإدارة</p>
        <div className={styles.entitiesGrid}>
          {ENTITY_TYPES.map(({ icon, label }) => (
            <div key={label} className={styles.entityChip}>
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section className={styles.how} id="how">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>كيف يعمل؟</h2>
          <p className={styles.sectionSub}>ثلاث خطوات تكفي لتشغيل صندوقك كاملاً</p>
          <div className={styles.steps}>
            {STEPS.map((step, i) => (
              <div key={step.n} className={styles.step}>
                <div className={styles.stepNum}>{step.n}</div>
                {i < STEPS.length - 1 && <div className={styles.stepLine} />}
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className={styles.features} id="features">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>كل ما تحتاجه في مكان واحد</h2>
          <p className={styles.sectionSub}>أدوات متكاملة تغطّي دورة الحياة الكاملة لصندوقك</p>
          <div className={styles.featuresGrid}>
            {FEATURES.map(({ icon, title, desc }) => (
              <article key={title} className={styles.featureCard}>
                <span className={styles.featureIcon}>{icon}</span>
                <h3 className={styles.featureTitle}>{title}</h3>
                <p className={styles.featureDesc}>{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>جاهز لبدء تنظيم صندوقك؟</h2>
          <p className={styles.ctaDesc}>
            أنشئ كيانك في دقائق، وادعُ أعضاءك برابط واحد.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/join" className={styles.ctaPrimary}>أنشئ كيانك الآن</Link>
            <Link href="/login" className={styles.ctaSecondary}>تسجيل الدخول</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.brandMark}>◇</span>
            <span>CollectiveTrustOS</span>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/privacy" className={styles.footerLink}>سياسة الخصوصية</Link>
            <span className={styles.footerDot}>·</span>
            <Link href="/terms" className={styles.footerLink}>شروط الاستخدام</Link>
          </div>
          <p className={styles.footerCopy}>© {new Date().getFullYear()} جميع الحقوق محفوظة</p>
        </div>
      </footer>

    </div>
  );
}
