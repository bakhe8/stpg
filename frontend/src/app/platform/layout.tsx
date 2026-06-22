'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getPlatformAccount, platformLogout } from '../../lib/api/platform';
import styles from './platform.module.css';

const NAV_LINKS = [
  { href: '/platform', label: 'الكيانات', icon: '⬡' },
  { href: '/platform/appeals', label: 'الاعتراضات', icon: '⚖' },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isLoginPage = pathname === '/platform/login';
    const account = getPlatformAccount();
    if (!account && !isLoginPage) {
      void router.push('/platform/login');
    }
  }, [pathname, router]);

  const isLoginPage = pathname === '/platform/login';

  function handleLogout() {
    platformLogout();
    void router.push('/platform/login');
  }

  return (
    <div className={styles.platformShell} dir="rtl">
      <div className={styles.platformBanner}>
        <span className={styles.platformBannerIcon}>◇</span>
        <div className={styles.platformBrand}>
          <strong className={styles.platformBannerTitle}>CollectiveTrustOS</strong>
          <span className={styles.platformBannerCaption}>إدارة المنصة</span>
        </div>
        {!isLoginPage && (
          <button className={styles.platformLogoutBtn} onClick={handleLogout}>
            خروج
          </button>
        )}
      </div>
      {!isLoginPage && (
        <nav className={styles.platformNav}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.platformNavLink} ${
                pathname === link.href ? styles.platformNavLinkActive : ''
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      )}
      <main className={styles.platformMain}>{children}</main>
    </div>
  );
}
