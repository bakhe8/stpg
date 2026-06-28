import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'CollectiveTrustOS | نظام تشغيل للثقة الجماعية',
  description:
    'منصة حوكمة ومال للصناديق العائلية، العمائر، الأحياء، القبائل، والحملات المؤقتة، تفصل المال والقرار والحقوق حسب الكيان والمحفظة ومسار الحوكمة.',
};

const RELATIONSHIP_CHAIN = [
  'عضو',
  'كيان',
  'محفظة',
  'مسار حوكمة',
  'اشتراك فعال',
  'حقوق والتزامات',
] as const;

const TRUST_PROBLEMS = [
  'كيف لا تختلط أموال العائلة والعمارة والحي؟',
  'من يحق له التصويت أو الاستفادة من هذه المحفظة؟',
  'ما القرار الذي سمح بالصرف، ومن راجعه؟',
  'كيف يعترض العضو بدون أن يتحول الخلاف إلى قطيعة؟',
] as const;

const OPERATING_LAYERS = [
  {
    label: '01',
    title: 'كيانات ومحافظ قابلة للتكوين',
    desc: 'صندوق عائلة، عمارة، حي، قبيلة، حملة علاج، أو مبادرة مؤقتة. كل كيان له قواعده ومحافظه ونطاقات استفادته.',
  },
  {
    label: '02',
    title: 'مسارات حوكمة داخل المحفظة',
    desc: 'قد يتفق الأعضاء على هدف المحفظة ويختلفون في طريقة الثقة. النظام يفصل المسار والمال والقرار دون كسر الهدف المشترك.',
  },
  {
    label: '03',
    title: 'قرار قبل كل أثر مالي',
    desc: 'الصرف لا يصبح نهائياً بمجرد ضغط زر. يجب أن يرتبط بقرار صالح، أهلية واضحة، ورصيد في الحساب الصحيح.',
  },
  {
    label: '04',
    title: 'اعتراض ونزاع وتدقيق',
    desc: 'كل طلب وقرار واعتراض يظهر كتسلسل مفهوم: من فعل ماذا، متى، على أي محفظة أو مسار، وما الذي تغيّر بعده.',
  },
] as const;

const PRODUCT_STORIES = [
  {
    title: 'صندوق عائلة بسيط',
    context: 'اشتراك شهري، محفظة طوارئ، عضو متأخر، وقرار صرف عادي.',
    outcome: 'المؤسس يرى الالتزامات، أمين الصندوق يرى الأثر المالي، والعضو يعرف ما عليه وما يحق له.',
  },
  {
    title: 'عمارة بخدمة مشتركة',
    context: 'حارس أو مصعد يستفيد منه الجميع، لكن بعض السكان لا يدفعون.',
    outcome: 'تظهر نسبة التغطية والعجز بدون التعامل معها كحالة علاج فردية قابلة للفصل.',
  },
  {
    title: 'حملة علاج مؤقتة',
    context: 'تبرعات داعمين، خصوصية مستفيد، مستندات حساسة، واعتراض محتمل.',
    outcome: 'المال مخصص للحالة، والشفافية تضبط المال دون كشف ما لا يلزم كشفه.',
  },
  {
    title: 'عضو في أكثر من كيان',
    context: 'شخص واحد داخل صندوق عائلة وصندوق عمارة بصلاحيات والتزامات مختلفة.',
    outcome: 'لا تختلط القرارات أو الأموال، ويظهر سبب كل مطالبة أو حق داخل سياقه الصحيح.',
  },
] as const;

const GOVERNANCE_FLOW = [
  'طلب صرف',
  'تحقق أهلية',
  'قرار حوكمي',
  'قيد دفتري',
  'إشعار وتدقيق',
] as const;

const ROLE_PROMISES = [
  ['المؤسس', 'يبني القواعد ويرى الصورة الكاملة.'],
  ['المسؤول', 'يدير الأعضاء والطلبات اليومية.'],
  ['أمين الصندوق', 'يرى المدفوعات والأرصدة وأثر الاعتماد.'],
  ['المدقق', 'يراجع التسلسل دون صلاحية تعديل.'],
  ['العضو', 'يفهم حقوقه والتزاماته وسبب كل قرار.'],
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
            <a href="#model" className={styles.navLink}>النموذج</a>
            <a href="#stories" className={styles.navLink}>السيناريوهات</a>
            <a href="#governance" className={styles.navLink}>الحوكمة</a>
            <Link href="/login" className={styles.navCta}>تسجيل الدخول</Link>
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroBackdrop} aria-hidden="true">
          <div className={styles.productMap}>
            <div className={styles.mapHeader}>
              <span>صندوق عائلة الهاشمي</span>
              <strong>تشغيل موثّق</strong>
            </div>
            <div className={styles.mapGrid}>
              <div className={styles.mapPanel}>
                <span className={styles.panelLabel}>المحفظة</span>
                <strong>طوارئ العائلة</strong>
                <small>رصيد مفصول عن محفظة العمارة</small>
              </div>
              <div className={styles.mapPanel}>
                <span className={styles.panelLabel}>المسار</span>
                <strong>لجنة + تصويت</strong>
                <small>أهلية التصويت حسب الاشتراك الفعال</small>
              </div>
              <div className={styles.mapPanel}>
                <span className={styles.panelLabel}>طلب الصرف</span>
                <strong>مراجعة علاج عاجل</strong>
                <small>قرار قبل القيد الدفتري</small>
              </div>
              <div className={styles.mapPanel}>
                <span className={styles.panelLabel}>التدقيق</span>
                <strong>Timeline كامل</strong>
                <small>actor, before, after, linked records</small>
              </div>
            </div>
            <div className={styles.mapLedger}>
              <span>مدفوعات هذا الشهر</span>
              <strong>88%</strong>
              <span>عجز متوقع</span>
              <strong>1,200 ر.س</strong>
            </div>
          </div>
        </div>

        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>نظام تشغيل للثقة الجماعية</p>
          <h1 className={styles.heroTitle}>CollectiveTrustOS</h1>
          <p className={styles.heroLead}>
            منصة حوكمة ومال للصناديق الاجتماعية تجعل كل علاقة واضحة:
            العضو، الكيان، المحفظة، مسار الحوكمة، الاشتراك، ثم الحقوق والالتزامات.
          </p>
          <div className={styles.heroActions}>
            <Link href="/join" className={styles.primaryAction}>إنشاء حساب والبدء</Link>
            <Link href="/login" className={styles.secondaryAction}>الدخول للتجربة</Link>
          </div>
          <dl className={styles.heroSignals} aria-label="ما الذي يحميه النظام">
            <div>
              <dt>لا صرف بلا قرار</dt>
              <dd>الحوكمة تسبق المال.</dd>
            </div>
            <div>
              <dt>لا خلط أموال</dt>
              <dd>الكيان والمحفظة والمسار مفصولون.</dd>
            </div>
            <div>
              <dt>لا غموض للعضو</dt>
              <dd>يعرف لماذا يدفع أو يصوت أو لا يستفيد.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={styles.trustStrip} aria-label="أسئلة الثقة التي يعالجها النظام">
        {TRUST_PROBLEMS.map((problem) => (
          <span key={problem}>{problem}</span>
        ))}
      </section>

      <section className={styles.relationshipSection} id="model">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionKicker}>الفكرة الأساسية</p>
          <h2>الحقوق لا تأتي من العضوية العامة فقط.</h2>
          <p>
            CollectiveTrustOS يبني التجربة حول العلاقة الحقيقية بين الشخص والمال والقرار.
            لذلك يرى كل عضو ما يخصه، وتبقى كل مطالبة أو صلاحية مرتبطة بسياقها.
          </p>
        </div>
        <ol className={styles.chain} aria-label="سلسلة الحقوق والالتزامات">
          {RELATIONSHIP_CHAIN.map((item, index) => (
            <li key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.layersSection}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionKicker}>ما الذي يديره المنتج؟</p>
          <h2>ليس صندوقاً واحداً. بل نموذج تشغيل كامل.</h2>
        </div>
        <div className={styles.layersGrid}>
          {OPERATING_LAYERS.map((layer) => (
            <article key={layer.title} className={styles.layerCard}>
              <span>{layer.label}</span>
              <h3>{layer.title}</h3>
              <p>{layer.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.storiesSection} id="stories">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionKicker}>سيناريوهات من الواقع</p>
          <h2>مصمم للعائلات والعمائر والأحياء والحملات المؤقتة.</h2>
          <p>
            الصفحة لا تعرض أرقاماً تجميلية فقط. هذه هي القصص التي يجب أن يستطيع المنتج تشغيلها
            من البداية إلى النهاية.
          </p>
        </div>
        <div className={styles.storyGrid}>
          {PRODUCT_STORIES.map((story) => (
            <article key={story.title} className={styles.storyCard}>
              <h3>{story.title}</h3>
              <p>{story.context}</p>
              <strong>{story.outcome}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.governanceSection} id="governance">
        <div className={styles.governanceCopy}>
          <p className={styles.sectionKicker}>حوكمة قبل الأثر المالي</p>
          <h2>رحلة الصرف يجب أن تكون مفهومة قبل أن تكون سريعة.</h2>
          <p>
            عندما يضغط المستخدم على اعتماد، يجب أن يعرف من يملك القرار، ومن يحق له الاعتراض،
            وأي رصيد سيتغير، وأين سيظهر ذلك في سجل التدقيق.
          </p>
        </div>
        <ol className={styles.flow}>
          {GOVERNANCE_FLOW.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.rolesSection}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionKicker}>تجربة مختلفة لكل دور</p>
          <h2>كل مستخدم يرى ما يساعده على القرار، لا كل ما في النظام.</h2>
        </div>
        <div className={styles.rolesList}>
          {ROLE_PROMISES.map(([role, promise]) => (
            <div key={role} className={styles.roleRow}>
              <strong>{role}</strong>
              <span>{promise}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.sectionKicker}>ابدأ من صندوق بسيط ثم افتح التعقيد عند الحاجة.</p>
          <h2>حوّل الاتفاقات الاجتماعية والمالية إلى تشغيل واضح قابل للمراجعة.</h2>
        </div>
        <div className={styles.finalActions}>
          <Link href="/join" className={styles.primaryAction}>إنشاء حساب</Link>
          <Link href="/login" className={styles.secondaryAction}>تسجيل الدخول</Link>
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
