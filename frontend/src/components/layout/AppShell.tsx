"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import styles from "./appshell.module.css";
import { getMe, logout } from "../../lib/api/auth";
import { Entity, getEntities } from "../../lib/api/entities";
import {
  BENEFICIARY_ROLES,
  COMMITTEE_ROLES,
  FINANCE_ROLES,
  MemberRole,
  OVERSIGHT_ROLES,
  ADMIN_ROLES,
  hasAnyRole,
} from "../../lib/access";
import { setupPushNotifications, unsubscribePushNotifications } from "../../lib/push";
import GlobalSearch from "../shared/GlobalSearch";
import BottomNav from "./BottomNav";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: readonly MemberRole[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [accessLoading, setAccessLoading] = useState(true);
  const [personName, setPersonName] = useState("");

  const navSections: NavSection[] = [
    {
      label: t("personalGroup"),
      items: [
        { href: "/dashboard", label: t("dashboard"), icon: "⌂" },
        { href: "/portal", label: t("portal"), icon: "◎" },
        { href: "/entities", label: t("entities"), icon: "◇" },
        { href: "/finance", label: t("finance"), icon: "◫" },
        { href: "/subscriptions", label: t("subscriptions"), icon: "≋" },
        { href: "/decisions", label: t("decisions"), icon: "✓" },
        { href: "/disputes", label: t("disputes"), icon: "↔" },
        { href: "/documents", label: t("documents"), icon: "▤" },
        { href: "/notifications", label: t("notifications"), icon: "◌" },
      ],
    },
    {
      label: t("operationsGroup"),
      items: [
        {
          href: "/review-center",
          label: t("reviewCenter"),
          icon: "⚡",
          roles: ADMIN_ROLES,
        },
        {
          href: "/disbursement-requests",
          label: t("disbursementRequests"),
          icon: "＋",
        },
        {
          href: "/committees",
          label: t("committees"),
          icon: "◉",
          roles: COMMITTEE_ROLES,
        },
        {
          href: "/beneficiaries",
          label: t("beneficiaries"),
          icon: "♙",
          roles: BENEFICIARY_ROLES,
        },
        {
          href: "/disbursements",
          label: t("disbursements"),
          icon: "↗",
          roles: FINANCE_ROLES,
        },
        {
          href: "/rules",
          label: t("rules"),
          icon: "§",
          roles: ADMIN_ROLES,
        },
      ],
    },
    {
      label: t("oversightGroup"),
      items: [
        {
          href: "/health",
          label: t("health"),
          icon: "♡",
          roles: ADMIN_ROLES,
        },
        {
          href: "/analytics",
          label: t("analytics"),
          icon: "⌁",
          roles: OVERSIGHT_ROLES,
        },
        {
          href: "/auditor",
          label: t("auditor"),
          icon: "⌕",
          roles: OVERSIGHT_ROLES,
        },
      ],
    },
  ];

  const hasEntities = entities.length > 0;
  const allItems = navSections.flatMap((section) => section.items);

  // للمستخدم الجديد بلا كيانات: اعرض فقط dashboard + entities
  const newUserItems: NavItem[] = [
    { href: '/dashboard', label: t('dashboard'), icon: '⌂' },
    { href: '/entities', label: t('entities'), icon: '◇' },
    { href: '/notifications', label: t('notifications'), icon: '◌' },
  ];

  const visibleSections = hasEntities
    ? navSections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) => !item.roles || hasAnyRole(entities, item.roles),
          ),
        }))
        .filter((section) => section.items.length > 0)
    : [{ label: t('personalGroup'), items: newUserItems }];
  const activeItem = allItems.find((item) => pathname.startsWith(item.href));
  const canAccessCurrent =
    !activeItem?.roles || hasAnyRole(entities, activeItem.roles);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getEntities(), getMe()])
      .then(([nextEntities, person]) => {
        if (cancelled) return;
        setEntities(nextEntities);
        setPersonName(person.name);
        localStorage.setItem("personName", person.name);
        localStorage.setItem("personId", person.id);
        
        // Setup push notifications asynchronously if user is logged in
        setupPushNotifications().catch(console.error);
      })
      .catch(() => {
        if (!cancelled) {
          setPersonName(localStorage.getItem("personName") ?? "");
        }
      })
      .finally(() => {
        if (!cancelled) setAccessLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await unsubscribePushNotifications().catch(console.error);
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      await logout(refreshToken).catch(() => undefined);
    }
    localStorage.clear();
    document.cookie = "accessToken=; path=/; max-age=0";
    window.location.replace("/login");
  }

  return (
    <div className={styles.shell}>
      {sidebarOpen ? (
        <button
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
          aria-label={t("closeMenu")}
        />
      ) : null}

      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
        aria-label={t("menu")}
      >
        <div className={styles.sidebarLogo}>
          <span className={styles.logoIcon}>◇</span>
          <div>
            <span className={styles.logoText}>CollectiveTrustOS</span>
            <span className={styles.logoCaption}>{t("workspace")}</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {visibleSections.map((section) => (
            <div key={section.label} className={styles.navSection}>
              <div className={styles.navSectionLabel}>{section.label}</div>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${
                    pathname.startsWith(item.href)
                      ? styles.navItemActive
                      : ""
                  }`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
          {!hasEntities && !accessLoading && (
            <div className={styles.navHint}>
              {t("joinOrCreateHint")}
            </div>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/profile" className={styles.userBadge}>
            <span className={styles.userAvatar}>
              {personName.charAt(0) || t("defaultInitial")}
            </span>
            <span className={styles.userName}>{personName || t("user")}</span>
          </Link>
          <button
            className={styles.logoutBtn}
            onClick={() => void handleLogout()}
            title={t("logout")}
          >
            <span aria-hidden="true">↪</span>
            <span className={styles.srOnly}>{t("logout")}</span>
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={t("menu")}
          >
            <span />
            <span />
            <span />
          </button>
          <div className={styles.headerRight}>
            <div className={styles.headerTitles}>
              <div className={styles.topbarEyebrow}>{t("workspace")}</div>
              <div className={styles.topbarTitle}>
                {activeItem?.label ?? "CollectiveTrustOS"}
              </div>
            </div>
            <GlobalSearch />
          </div>
        </header>

        <main className={styles.content}>
          {accessLoading && activeItem?.roles ? (
            <div className={styles.accessState}>{t("checkingAccess")}</div>
          ) : !canAccessCurrent ? (
            <div className={styles.accessState}>
              <span className={styles.accessIcon}>○</span>
              <h1>{t("accessDeniedTitle")}</h1>
              <p>{t("accessDeniedBody")}</p>
              <Link href="/dashboard" className={styles.accessLink}>
                {t("backToDashboard")}
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <BottomNav onMoreClick={() => setSidebarOpen(true)} />
    </div>
  );
}
