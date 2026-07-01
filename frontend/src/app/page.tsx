import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'CollectiveTrustOS | كل دور يرى ما يهمه فقط',
  description:
    'منصة تختصر إدارة الصناديق الجماعية: العضو يرى المطلوب منه وما يحق له، والإدارة ترى الاستثناءات، والنظام يتولى القواعد والحوكمة والتدقيق في الخلفية.',
};

const MEMBER_QUESTIONS = [
  'كم مطلوب مني هذا الشهر؟',
  'هل يحق لي الاستفادة من هذه المحفظة؟',
  'هل يوجد قرار يهمني فعلاً؟',
  'ما آخر شيء حدث في الصندوق بدون تفاصيل مرهقة؟',
] as const;

const MEMBER_VIEW = [
  {
    label: '01',
    title: 'المطلوب منك الآن',
    desc: 'مستحقاتك، آخر موعد، وطريقة الدفع. لا قوائم مالية طويلة ولا مصطلحات داخلية.',
  },
  {
    label: '02',
    title: 'ما يحق لك',
    desc: 'هل أنت مؤهل للاستفادة؟ هل أنت داعم فقط؟ هل عضويتك معلقة؟ تظهر النتيجة مباشرة بلغة مفهومة.',
  },
  {
    label: '03',
    title: 'ما يحدث في الصندوق',
    desc: 'ملخص قصير للقرارات والأحداث المهمة فقط، مع إمكانية فتح التفاصيل عند الحاجة.',
  },
  {
    label: '04',
    title: 'تنبيه عند وجود إجراء',
    desc: 'لا يدخل العضو ليبحث وسط الصفحات. النظام يبرز له ما ينتظر موافقته أو دفعه أو مراجعته.',
  },
] as const;

const AUTOMATION_PROMISES = [
  {
    label: 'A',
    title: 'القواعد تعمل خلف الكواليس',
    desc: 'النظام يحسب الأهلية والالتزامات حسب العلاقة الصحيحة، لكن لا يجبر العضو على فهم كل قاعدة.',
  },
  {
    label: 'B',
    title: 'المال لا يختلط',
    desc: 'فصل الصناديق والمحافظ والمسارات يحدث آلياً، ويظهر للمستخدم فقط الأثر الذي يخصه.',
  },
  {
    label: 'C',
    title: 'الاستثناءات تصل لصاحب الدور',
    desc: 'المدير يرى ما يحتاج قراراً، أمين الصندوق يرى ما يحتاج اعتماداً، والمدقق يرى ما يحتاج مراجعة.',
  },
  {
    label: 'D',
    title: 'التفاصيل موجودة وليست مزعجة',
    desc: 'السجل والتدقيق والقرارات محفوظة، لكنها لا تزاحم الواجهة اليومية لمن لا يحتاجها.',
  },
] as const;

const ROLE_VIEWS = [
  ['العضو', 'يدفع، يعرف حقه، ويتابع ملخص الصندوق.'],
  ['المسؤول', 'يرى الطلبات والاستثناءات بدل تصفح كل البيانات.'],
  ['أمين الصندوق', 'يراجع المدفوعات التي تحتاج إجراء والأثر المالي قبل الاعتماد.'],
  ['المدقق', 'يرى التسلسل والمخاطر بدون صلاحية تعديل.'],
  ['المؤسس', 'يضبط القواعد ويتابع صحة الصندوق لا كل حركة صغيرة.'],
] as const;

const REAL_SCENARIOS = [
  {
    title: 'عضو في جمعية',
    context: 'لا يريد رؤية audit أو finance أو كل القرارات.',
    outcome: 'يرى: عليك 100 ر.س، يحق لك الاستفادة من الطوارئ، ولا يوجد تصويت مطلوب الآن.',
  },
  {
    title: 'أمين صندوق',
    context: 'لا يحتاج البحث في كل السجلات لمعرفة ما يجب عمله.',
    outcome: 'يرى المدفوعات غير المطابقة، المتأخرات الحرجة، والصرف الجاهز للاعتماد.',
  },
  {
    title: 'مدير جمعية',
    context: 'لا يريد إدارة الصندوق كملف Excel كبير.',
    outcome: 'يرى الاستثناءات: طلبات معلقة، قرارات تحتاج حسم، أعضاء يحتاجون متابعة.',
  },
  {
    title: 'مدقق',
    context: 'لا يدخل لتشغيل العمل اليومي.',
    outcome: 'يرى Timeline مختصر للمخاطر والتغييرات المهمة، ويفتح التفاصيل عند الحاجة فقط.',
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
            <a href="#member" className={styles.navLink}>للعضو</a>
            <a href="#roles" className={styles.navLink}>الأدوار</a>
            <a href="#behind" className={styles.navLink}>خلف الكواليس</a>
            <Link href="/login" className={styles.navCta}>تسجيل الدخول</Link>
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroBackdrop} aria-hidden="true">
          <div className={styles.productMap}>
            <div className={styles.mapHeader}>
              <span>واجهتك اليوم</span>
              <strong>لا يوجد إجراء معقد</strong>
            </div>
            <div className={styles.mapGrid}>
              <div className={styles.mapPanel}>
                <span className={styles.panelLabel}>المطلوب</span>
                <strong>100 ر.س قبل 30 يونيو</strong>
                <small>زر دفع واحد، لا حاجة لفهم الحسابات.</small>
              </div>
              <div className={styles.mapPanel}>
                <span className={styles.panelLabel}>الاستفادة</span>
                <strong>مؤهل للطوارئ</strong>
                <small>النظام حسبها من اشتراكك وحالتك.</small>
              </div>
              <div className={styles.mapPanel}>
                <span className={styles.panelLabel}>ما يحدث</span>
                <strong>تم اعتماد صيانة المصعد</strong>
                <small>ملخص فقط، والتفاصيل متاحة عند الطلب.</small>
              </div>
              <div className={styles.mapPanel}>
                <span className={styles.panelLabel}>تنبيه</span>
                <strong>لا يوجد تصويت مطلوب</strong>
                <small>لن نعرض لك قرارات لا تخصك.</small>
              </div>
            </div>
            <div className={styles.mapLedger}>
              <span>خطوتك التالية</span>
              <strong>ادفع الاشتراك</strong>
              <span>حالة العضوية</span>
              <strong>نشط</strong>
            </div>
          </div>
        </div>

        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>منصة تختصر الدور ولا تعرض التعقيد</p>
          <h1 className={styles.heroTitle}>كل دور يرى ما يهمه فقط</h1>
          <p className={styles.heroLead}>
            CollectiveTrustOS لا يطلب من العضو فهم الصندوق والمحفظة والمسار والقواعد.
            النظام يحوّل ذلك إلى أشياء بسيطة: ماذا عليّ الآن؟ ماذا أستفيد؟ وماذا حدث في الصندوق؟
          </p>
          <div className={styles.heroActions}>
            <Link href="/login" className={styles.primaryAction}>الدخول للتجربة</Link>
            <Link href="/join" className={styles.secondaryAction}>إنشاء حساب</Link>
          </div>
          <dl className={styles.heroSignals} aria-label="ما الذي تختصره الواجهة">
            <div>
              <dt>للعضو</dt>
              <dd>دفع، استفادة، ملخص.</dd>
            </div>
            <div>
              <dt>للإدارة</dt>
              <dd>استثناءات وقرارات فقط.</dd>
            </div>
            <div>
              <dt>للنظام</dt>
              <dd>قواعد، فصل أموال، وتدقيق آلي.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={styles.trustStrip} aria-label="أسئلة العضو اليومية">
        {MEMBER_QUESTIONS.map((question) => (
          <span key={question}>{question}</span>
        ))}
      </section>

      <section className={styles.layersSection} id="member">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionKicker}>واجهة العضو</p>
          <h2>العضو لا يدخل ليشغّل النظام. يدخل ليعرف المطلوب منه.</h2>
          <p>
            إذا كان العضو يحتاج قراءة كل التفاصيل، فالمنتج فشل في اختصار العمل.
            التفاصيل موجودة عند الحاجة، لكن الشاشة اليومية تبدأ من الإجراء والفائدة.
          </p>
        </div>
        <div className={styles.layersGrid}>
          {MEMBER_VIEW.map((item) => (
            <article key={item.title} className={styles.layerCard}>
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.storiesSection} id="roles">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionKicker}>اختصار حسب الدور</p>
          <h2>نفس الصندوق، لكن ليست نفس الواجهة لكل شخص.</h2>
        </div>
        <div className={styles.storyGrid}>
          {REAL_SCENARIOS.map((story) => (
            <article key={story.title} className={styles.storyCard}>
              <h3>{story.title}</h3>
              <p>{story.context}</p>
              <strong>{story.outcome}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.governanceSection} id="behind">
        <div className={styles.governanceCopy}>
          <p className={styles.sectionKicker}>خلف الكواليس</p>
          <h2>التعقيد موجود، لكنه ليس واجهة المستخدم اليومية.</h2>
          <p>
            القواعد، أهلية الاستفادة، فصل الأموال، القرار، الاعتراض، والتدقيق يجب أن تعمل آلياً
            وتظهر فقط عندما يحتاج الدور الحالي إلى قرار أو مراجعة أو تفسير.
          </p>
        </div>
        <div className={styles.layersGrid}>
          {AUTOMATION_PROMISES.map((item) => (
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
          <p className={styles.sectionKicker}>قاعدة الواجهة</p>
          <h2>كل دور يبدأ من قائمة قصيرة: ما الذي ينتظرني الآن؟</h2>
        </div>
        <div className={styles.rolesList}>
          {ROLE_VIEWS.map(([role, promise]) => (
            <div key={role} className={styles.roleRow}>
              <strong>{role}</strong>
              <span>{promise}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.sectionKicker}>الهدف ليس عرض كل شيء. الهدف إنجاز ما يلزم.</p>
          <h2>منصة تجعل الصندوق مفهوماً للمستخدم البسيط، ومضبوطاً لمن يديره.</h2>
        </div>
        <div className={styles.finalActions}>
          <Link href="/login" className={styles.primaryAction}>الدخول للتجربة</Link>
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
