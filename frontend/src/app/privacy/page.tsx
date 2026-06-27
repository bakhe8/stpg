import Link from 'next/link';
import styles from '../legal.module.css';

export const metadata = {
  title: 'سياسة الخصوصية — CollectiveTrustOS',
};

export default function PrivacyPage() {
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
          <h1 className={styles.title}>سياسة الخصوصية</h1>
          <p className={styles.updated}>آخر تحديث: يونيو ٢٠٢٦</p>
        </div>
      </div>

      <div className={styles.content}>

        <div className={styles.highlight}>
          نحن في CollectiveTrustOS نُولي خصوصية بياناتك أهمية قصوى. تُوضّح هذه السياسة
          ما نجمعه وكيف نستخدمه وكيف نحميه، وفقاً لنظام حماية البيانات الشخصية السعودي (PDPL).
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>١. البيانات التي نجمعها</h2>
          <p className={styles.sectionText}>نجمع البيانات الضرورية لتشغيل الخدمة فقط، وتشمل:</p>
          <ul className={styles.list}>
            <li><strong>بيانات الهوية:</strong> الاسم الكامل، رقم الجوال</li>
            <li><strong>بيانات العضوية:</strong> الكيانات التي تنتمي إليها، الدور، تاريخ الانضمام</li>
            <li><strong>البيانات المالية:</strong> سجلات الاشتراكات والمدفوعات والصرف المرتبطة بحسابك</li>
            <li><strong>بيانات الاستخدام:</strong> سجلات النشاط لأغراض التدقيق والأمان</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٢. كيف نستخدم بياناتك</h2>
          <ul className={styles.list}>
            <li>تمكينك من إدارة عضويتك والمشاركة في كيانك</li>
            <li>إرسال الإشعارات المتعلقة بالقرارات والمدفوعات والطلبات</li>
            <li>تدقيق العمليات وضمان سلامة البيانات المالية</li>
            <li>تحسين أداء المنصة وتجربة المستخدم</li>
          </ul>
          <p className={styles.sectionText}>
            لا نستخدم بياناتك لأغراض تسويقية أو نبيعها لأي طرف ثالث.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٣. مشاركة البيانات</h2>
          <p className={styles.sectionText}>لا نشارك بياناتك الشخصية مع أطراف خارجية باستثناء:</p>
          <ul className={styles.list}>
            <li><strong>مدراء الكيان الذي تنتمي إليه:</strong> يرون بيانات العضوية الضرورية لإدارة الكيان</li>
            <li><strong>مزودي البنية التحتية:</strong> استضافة الخوادم بضمانات تعاقدية للخصوصية</li>
            <li><strong>الجهات القانونية:</strong> عند الإلزام القانوني فقط</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٤. حماية البيانات</h2>
          <ul className={styles.list}>
            <li>تشفير البيانات أثناء النقل (HTTPS/TLS)</li>
            <li>كلمات المرور مخزّنة بتشفير bcrypt — لا أحد يعرفها حتى نحن</li>
            <li>سجلات تدقيق كاملة لكل عملية حساسة</li>
            <li>صلاحيات محدودة بالدور — كل مستخدم يصل لما يخصّه فقط</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٥. الاحتفاظ بالبيانات</h2>
          <p className={styles.sectionText}>
            نحتفظ ببياناتك طوال فترة نشاط حسابك. عند طلب الحذف، نحذف البيانات الشخصية
            خلال ٣٠ يوماً، مع الإبقاء على السجلات المالية التي قد تكون مطلوبة قانونياً
            لمدة لا تتجاوز ٧ سنوات.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٦. حقوقك</h2>
          <p className={styles.sectionText}>وفقاً لنظام PDPL، يحق لك:</p>
          <ul className={styles.list}>
            <li>الاطلاع على بياناتك الشخصية المحفوظة لدينا</li>
            <li>تصحيح أي بيانات غير دقيقة</li>
            <li>طلب حذف بياناتك (&quot;الحق في النسيان&quot;)</li>
            <li>الاعتراض على معالجة بياناتك في حالات معينة</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٧. ملفات الارتباط (Cookies)</h2>
          <p className={styles.sectionText}>
            نستخدم ملف ارتباط واحداً (<code>accessToken</code>) لإدارة جلسة تسجيل الدخول.
            لا نستخدم ملفات ارتباط تتبعية أو تسويقية.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>٨. تواصل معنا</h2>
          <p className={styles.sectionText}>
            لأي استفسار متعلق بخصوصيتك أو لممارسة حقوقك، تواصل معنا على:{' '}
            <a href="mailto:bakheet@gmail.com" className={styles.footerLink}>bakheet@gmail.com</a>
          </p>
        </div>

      </div>

      <footer className={styles.footer}>
        <p className={styles.footerText}>
          © {new Date().getFullYear()} CollectiveTrustOS ·{' '}
          <Link href="/terms" className={styles.footerLink}>شروط الاستخدام</Link>
        </p>
      </footer>
    </div>
  );
}
