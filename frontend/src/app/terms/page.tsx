import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata = {
  title: 'شروط الاستخدام — CollectiveTrustOS',
};

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>◇</span>
            <span>CollectiveTrustOS</span>
          </Link>
          <Link href="/" className={styles.backLink}>← العودة للرئيسية</Link>
        </div>
      </header>

      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.badge}>وثيقة قانونية</div>
          <h1 className={styles.title}>شروط الاستخدام</h1>
          <p className={styles.updated}>آخر تحديث: يونيو ٢٠٢٦</p>
        </div>
      </div>

      <div className={styles.content}>

        <div className={styles.highlight}>
          باستخدامك لمنصة CollectiveTrustOS فإنك توافق على هذه الشروط. يُرجى قراءتها
          بعناية قبل استخدام الخدمة.
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>١. وصف الخدمة</h2>
          <p className={styles.sectionText}>
            CollectiveTrustOS منصة إلكترونية لإدارة الصناديق الجماعية والكيانات التعاونية،
            تُتيح إدارة الأعضاء والمدفوعات والقرارات وسجلات التدقيق. الخدمة موجّهة للكيانات
            القانونية أو غير الرسمية التي تحتاج إلى حوكمة منظّمة وشفافة.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٢. الأهلية والتسجيل</h2>
          <ul className={styles.list}>
            <li>يجب أن يكون عمرك ١٨ عاماً أو أكثر لاستخدام المنصة</li>
            <li>يجب تقديم معلومات صحيحة ودقيقة عند التسجيل</li>
            <li>أنت مسؤول عن الحفاظ على سرية بيانات دخولك</li>
            <li>الحساب شخصي غير قابل للتحويل لطرف آخر</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٣. الاستخدام المقبول</h2>
          <p className={styles.sectionText}>يُسمح باستخدام المنصة لـ:</p>
          <ul className={styles.list}>
            <li>إدارة الصناديق العائلية والقبلية والتعاونيات والجمعيات</li>
            <li>تتبّع الاشتراكات والمدفوعات الشرعية</li>
            <li>اتخاذ القرارات الجماعية الموثّقة</li>
          </ul>
          <p className={styles.sectionText}>يُحظر استخدام المنصة لـ:</p>
          <ul className={styles.list}>
            <li>أي نشاط مخالف للأنظمة والقوانين السعودية</li>
            <li>غسيل الأموال أو التمويل غير المشروع</li>
            <li>انتحال صفة الغير أو تقديم معلومات مضللة</li>
            <li>اختراق أمان المنصة أو التلاعب ببياناتها</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٤. مسؤولية الكيانات والمستخدمين</h2>
          <p className={styles.sectionText}>
            كل كيان مسؤول عن البيانات التي يُدخلها والقرارات التي يتخذها داخل المنصة.
            المنصة أداة تنظيمية ولا تتحمّل مسؤولية النزاعات المالية بين أعضاء الكيانات.
            يتحمّل مؤسس الكيان مسؤولية إدارته وفق الأنظمة المعمول بها.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٥. الملكية الفكرية</h2>
          <p className={styles.sectionText}>
            جميع حقوق الملكية الفكرية للمنصة (التصميم، الكود، الخوارزميات) محفوظة
            لـ CollectiveTrustOS. البيانات التي تُدخلها تبقى ملكاً لك ولكيانك.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٦. توقف الخدمة وإنهاء الحساب</h2>
          <ul className={styles.list}>
            <li>نحتفظ بحق تعليق أو إنهاء أي حساب يُخالف هذه الشروط</li>
            <li>يمكنك طلب حذف حسابك في أي وقت</li>
            <li>قد تتوقف الخدمة مؤقتاً للصيانة مع إشعار مسبق كلما أمكن</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٧. إخلاء المسؤولية</h2>
          <p className={styles.sectionText}>
            تُقدَّم الخدمة "كما هي" دون ضمانات صريحة أو ضمنية. لا نضمن خلوّ المنصة
            من الأخطاء في جميع الأوقات. ننصح بالاحتفاظ بنسخ احتياطية من البيانات
            المالية الحساسة خارج المنصة.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٨. القانون المطبّق</h2>
          <p className={styles.sectionText}>
            تخضع هذه الشروط للأنظمة والقوانين المعمول بها في المملكة العربية السعودية.
            أي نزاع ينشأ عن استخدام المنصة يُحسم وفق الأنظمة السعودية.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٩. تعديل الشروط</h2>
          <p className={styles.sectionText}>
            قد نُعدّل هذه الشروط من وقت لآخر. سنُبلّغ المستخدمين النشطين بأي تغيير
            جوهري قبل تطبيقه بـ ١٤ يوماً. استمرارك في استخدام المنصة بعد التعديل
            يعني قبولك للشروط الجديدة.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>١٠. تواصل معنا</h2>
          <p className={styles.sectionText}>
            لأي استفسار قانوني أو شكوى:{' '}
            <a href="mailto:bakheet@gmail.com" className={styles.footerLink}>bakheet@gmail.com</a>
          </p>
        </div>

      </div>

      <footer className={styles.footer}>
        <p className={styles.footerText}>
          © {new Date().getFullYear()} CollectiveTrustOS ·{' '}
          <Link href="/privacy" className={styles.footerLink}>سياسة الخصوصية</Link>
        </p>
      </footer>
    </div>
  );
}
