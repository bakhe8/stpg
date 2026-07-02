import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'CollectiveTrustOS | نظام تشغيل للصناديق والحملات',
  description:
    'منصة تشغل الصناديق والحملات بقواعد حوكمة، فصل مالي، صلاحيات دقيقة، وسجل تدقيق يحفظ الثقة بدون تشغيل يدوي مرهق.',
};

const TRUST_SIGNALS = [
  'حوكمة قابلة للتدقيق من أول قرار',
  'فصل مالي بين الصناديق والحملات والمحافظ',
  'صلاحيات دقيقة حسب الدور والسياق',
  'سجل دائم للمدفوعات والقرارات والاعتراضات',
] as const;

const SYSTEM_CAPABILITIES = [
  {
    label: '01',
    title: 'محرك حوكمة',
    desc: 'تصويت، لجان، صلاحيات، اعتراضات، ومسارات قرار تعمل كقواعد واضحة قابلة للتتبع.',
  },
  {
    label: '02',
    title: 'فصل مالي حقيقي',
    desc: 'الصندوق، الحملة، المحفظة، والمسار المالي تبقى منفصلة حتى عندما تتداخل العضويات والمساهمات.',
  },
  {
    label: '03',
    title: 'تشغيل اشتراكات ومدفوعات',
    desc: 'استحقاقات، سجلات دفع، مراجعة مالية، ومتأخرات مرتبطة بالعضوية والمسار الصحيح.',
  },
  {
    label: '04',
    title: 'حملات مرتبطة بالصناديق',
    desc: 'حملات مؤقتة لها مدة وسياق وصرف مستقل، بدون خلطها مع التشغيل الدائم للصندوق.',
  },
] as const;

const SECURITY_PROMISES = [
  {
    label: 'A',
    title: 'الصلاحية لا تعتمد على الثقة الشخصية',
    desc: 'كل قدرة مرتبطة بالدور والعضوية والسياق، فلا يحصل أمين الصندوق أو المدقق أو العضو على أكثر مما يحتاجه.',
  },
  {
    label: 'B',
    title: 'الأثر المالي محفوظ',
    desc: 'كل مدفوع، صرف، تحويل، أو علاقة بين محافظ يترك أثراً يمكن مراجعته بدلاً من الاعتماد على ملفات متفرقة.',
  },
  {
    label: 'C',
    title: 'القرار له مسار واضح',
    desc: 'القواعد تحدد من يصوت، من يراجع، ومن يعتمد، مع سجل يثبت الحالة والنتيجة والتصعيد.',
  },
  {
    label: 'D',
    title: 'حدود قانونية وتشغيلية أوضح',
    desc: 'المنصة تنظم الصندوق أو الحملة ولا تدعي إنشاء صفة قانونية؛ المسؤولية والشفافية تبقى واضحة.',
  },
] as const;

const PLATFORM_LAYERS = [
  ['الصندوق', 'سياسات، أعضاء، اشتراكات، محافظ، ومسارات حوكمة.'],
  ['الحملة', 'تشغيل مؤقت مرتبط بهدف ومدة وسياق صرف مستقل.'],
  ['المحفظة', 'فصل أموال حسب المنفعة، الاستحقاق، والعلاقة.'],
  ['المسار', 'قرار أو لجنة أو تصويت أو صرف بضوابطه الخاصة.'],
  ['التدقيق', 'أحداث، مستندات، قرارات، واعتراضات قابلة للمراجعة.'],
] as const;

const OPERATING_MODES = [
  {
    title: 'صندوق عائلة أو حي',
    context: 'اشتراكات، متأخرات، محافظ منفصلة، وقرارات مشاركة.',
    outcome: 'النظام يربط العضوية والالتزام والاستفادة والقرار في سجل واحد.',
  },
  {
    title: 'صندوق خدمات مشتركة',
    context: 'مصعد، حراسة، صيانة، ومصاريف يستفيد منها الجميع.',
    outcome: 'المنصة تفصل المنفعة المشتركة وتتابع السداد والصرف والاعتراضات.',
  },
  {
    title: 'حملة علاج أو دعم',
    context: 'تبرعات محددة المدة وهدف صرف لا يجب أن يختلط بالصندوق الأب.',
    outcome: 'الحملة تعمل كمسار مستقل مع رقابة وسجل صرف وتاريخ إغلاق.',
  },
  {
    title: 'إدارة ورقابة',
    context: 'مؤسس، مدير، أمين صندوق، مدقق، لجنة، وأعضاء بدخول مختلف.',
    outcome: 'كل دور يحصل على صلاحياته من النظام لا من مشاركة كلمات مرور أو ملفات.',
  },
] as const;

export default async function Home() {
  const cookieStore = await cookies();
  if (cookieStore.get('accessToken')?.value) {
    redirect('/dashboard');
  }

  return (
    <main className={styles.root}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand} aria-label="CollectiveTrustOS">
            <span className={styles.brandMark}>CT</span>
            <span>CollectiveTrustOS</span>
          </Link>
          <nav className={styles.navLinks} aria-label="روابط صفحة الهبوط">
            <a href="#capabilities" className={styles.navLink}>القدرات</a>
            <a href="#operations" className={styles.navLink}>التشغيل</a>
            <a href="#security" className={styles.navLink}>الأمان</a>
            <Link href="/login" className={styles.navCta}>تسجيل الدخول</Link>
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroBackdrop} aria-hidden="true">
          <div className={styles.productMap}>
            <div className={styles.mapHeader}>
              <span>منظومة الثقة</span>
              <strong>تشغيل مضبوط لا يعتمد على الذاكرة</strong>
            </div>
            <div className={styles.mapGrid}>
              <div className={styles.mapPanel}>
                <span className={styles.panelLabel}>حوكمة</span>
                <strong>تصويت، لجان، اعتراضات</strong>
                <small>قرارات لها قواعد وحالة وسجل مراجعة.</small>
              </div>
              <div className={styles.mapPanel}>
                <span className={styles.panelLabel}>مال</span>
                <strong>محافظ ومسارات منفصلة</strong>
                <small>لا يختلط صندوق دائم بحملة مؤقتة أو صرف محدد.</small>
              </div>
              <div className={styles.mapPanel}>
                <span className={styles.panelLabel}>أمان</span>
                <strong>صلاحيات حسب الدور</strong>
                <small>كل إجراء محكوم بعضوية وسياق وقدرة محددة.</small>
              </div>
              <div className={styles.mapPanel}>
                <span className={styles.panelLabel}>تشغيل</span>
                <strong>صناديق وحملات من نفس النظام</strong>
                <small>قوالب بداية لا تقفل القدرات لاحقاً.</small>
              </div>
            </div>
            <div className={styles.mapLedger}>
              <span>المحرك</span>
              <strong>قواعد وسياسات</strong>
              <span>الدليل</span>
              <strong>تدقيق دائم</strong>
            </div>
          </div>
        </div>

        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>CollectiveTrustOS</h1>
          <p className={styles.heroLead}>
            نظام تشغيل للصناديق والحملات الجماعية. يدير القواعد، المال، الصلاحيات،
            القرارات، الاعتراضات، والتدقيق في طبقة واحدة حتى تعمل المجموعة بثقة
            بدون ملفات متفرقة أو متابعة يدوية.
          </p>
          <div className={styles.heroActions}>
            <Link href="/login" className={styles.primaryAction}>الدخول للنظام</Link>
            <Link href="/join" className={styles.secondaryAction}>إنشاء حساب</Link>
          </div>
          <dl className={styles.heroSignals} aria-label="قوة النظام">
            <div>
              <dt>حوكمة</dt>
              <dd>مسارات قرار وتصويت ولجان قابلة للتتبع.</dd>
            </div>
            <div>
              <dt>أمان</dt>
              <dd>صلاحيات دقيقة وسجل أحداث لا يعتمد على الذاكرة.</dd>
            </div>
            <div>
              <dt>تشغيل</dt>
              <dd>صناديق، حملات، محافظ، ومدفوعات من نفس المنظومة.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={styles.trustStrip} aria-label="إشارات الثقة">
        {TRUST_SIGNALS.map((signal) => (
          <span key={signal}>{signal}</span>
        ))}
      </section>

      <section className={styles.layersSection} id="capabilities">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionKicker}>القدرات</p>
          <h2>منصة واحدة تشغل الصندوق كاملاً.</h2>
          <p>
            CollectiveTrustOS ليس صفحة عضوية أو جدول مدفوعات فقط. هو طبقة تشغيل
            كاملة تجمع الحوكمة والمال والصلاحيات والتدقيق في نموذج واحد.
          </p>
        </div>
        <div className={styles.layersGrid}>
          {SYSTEM_CAPABILITIES.map((item) => (
            <article key={item.title} className={styles.layerCard}>
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.storiesSection} id="operations">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionKicker}>طريقة التشغيل</p>
          <h2>مصمم للصناديق التي تتحول من اتفاق شفهي إلى نظام موثوق.</h2>
        </div>
        <div className={styles.storyGrid}>
          {OPERATING_MODES.map((story) => (
            <article key={story.title} className={styles.storyCard}>
              <h3>{story.title}</h3>
              <p>{story.context}</p>
              <strong>{story.outcome}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.governanceSection} id="security">
        <div className={styles.governanceCopy}>
          <p className={styles.sectionKicker}>الأمان والثقة</p>
          <h2>الأمان هنا ليس تسجيل دخول فقط.</h2>
          <p>
            الثقة في الصندوق تأتي من فصل الأموال، وضوح الصلاحيات، قابلية القرار للتدقيق،
            وحفظ الأثر المالي والتشغيلي. لذلك صمم النظام ليمنع الخلط قبل أن يحدث.
          </p>
        </div>
        <div className={styles.layersGrid}>
          {SECURITY_PROMISES.map((item) => (
            <article key={item.title} className={styles.layerCard}>
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.rolesSection}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionKicker}>طبقات النظام</p>
          <h2>القوة في النموذج: صندوق، حملة، محفظة، مسار، وتدقيق.</h2>
        </div>
        <div className={styles.rolesList}>
          {PLATFORM_LAYERS.map(([role, promise]) => (
            <div key={role} className={styles.roleRow}>
              <strong>{role}</strong>
              <span>{promise}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.sectionKicker}>جاهزية تشغيلية</p>
          <h2>نظام واحد يجمع الحوكمة والمال والأمان بدل تشغيل الصندوق عبر ملفات ومحادثات.</h2>
        </div>
        <div className={styles.finalActions}>
          <Link href="/login" className={styles.primaryAction}>الدخول للنظام</Link>
          <Link href="/join" className={styles.secondaryAction}>إنشاء حساب</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <span className={styles.brandMark}>CT</span>
          <span>CollectiveTrustOS</span>
        </div>
        <div className={styles.footerLinks}>
          <Link href="/privacy">سياسة الخصوصية</Link>
          <Link href="/terms">شروط الاستخدام</Link>
        </div>
        <p>© {new Date().getFullYear()} CollectiveTrustOS</p>
      </footer>
    </main>
  );
}
