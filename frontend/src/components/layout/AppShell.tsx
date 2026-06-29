"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import styles from "./appshell.module.css";
import { getMe, logout } from "../../lib/api/auth";
import { Entity, getEntities } from "../../lib/api/entities";
import { getMyWorkSurface, WorkSurface } from "../../lib/api/work-surface";
import { MemberRole, hasAnyRole } from "../../lib/access";
import { setupPushNotifications, unsubscribePushNotifications } from "../../lib/push";
import GlobalSearch from "../shared/GlobalSearch";
import BottomNav from "./BottomNav";
import {
  buildAdvancedNavItems,
  buildDailyNavItems,
  buildNewUserNavItems,
  buildRouteAccessItems,
  canAccessNavItem,
  findActiveNavItem,
  selectBottomNavItems,
  type NavItem,
  type SurfaceNavLabels,
} from "./surfaceNavigation";

const TOOL_SEARCH_ROLES: readonly MemberRole[] = [
  "FOUNDER",
  "ADMIN",
  "TREASURER",
  "AUDITOR",
  "COMMITTEE_MEMBER",
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [surface, setSurface] = useState<WorkSurface | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [personName, setPersonName] = useState("");

  const labels: SurfaceNavLabels = {
    dailySurface: t("dailySurface"),
    notifications: t("notifications"),
    entities: t("entities"),
    reviewCenter: t("reviewCenter"),
    finance: t("finance"),
    auditor: t("auditor"),
    committees: t("committees"),
    legacyDashboard: t("legacyDashboard"),
  };

  const hasEntities = entities.length > 0;
  const dailyItems = hasEntities
    ? buildDailyNavItems(surface, labels)
    : buildNewUserNavItems(labels);
  const advancedItems = hasEntities ? buildAdvancedNavItems(surface, labels) : [];
  const allItems = [
    ...dailyItems,
    ...advancedItems,
    ...buildRouteAccessItems(labels),
  ];
  const bottomItems = selectBottomNavItems(dailyItems);
  const showGlobalSearch =
    hasEntities && hasAnyRole(entities, TOOL_SEARCH_ROLES);
  const activeItem = findActiveNavItem(pathname, allItems);
  const canAccessCurrent = canAccessNavItem(activeItem, entities);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getEntities(),
      getMe(),
      getMyWorkSurface().catch(() => null),
    ])
      .then(([nextEntities, person, nextSurface]) => {
        if (cancelled) return;
        setEntities(nextEntities);
        setSurface(nextSurface);
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
          <div className={styles.navSection}>
            <div className={styles.navSectionLabel}>{t("personalGroup")}</div>
            {dailyItems.map((item) => (
              <ShellNavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
          {advancedItems.length > 0 ? (
            <details className={styles.navAdvanced}>
              <summary className={styles.navAdvancedSummary}>
                {t("advancedGroup")}
              </summary>
              <p className={styles.navAdvancedHint}>
                تظهر هذه الأدوات عند الحاجة أو للمقارنة، وليست قائمة العمل
                اليومية.
              </p>
              <div className={styles.navAdvancedBody}>
                {advancedItems.map((item) => (
                  <ShellNavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                  />
                ))}
              </div>
            </details>
          ) : null}
          {!hasEntities && !accessLoading && (
            <div className={styles.navHint}>
              {t("joinOrCreateHint")}
            </div>
          )}
        </nav>

        <div className={styles.versionBadge}>
          <span>CollectiveTrustOS</span>
          <span className={styles.versionTag}>v1.0</span>
        </div>

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
            {showGlobalSearch ? <GlobalSearch /> : null}
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

      <BottomNav items={bottomItems} onMoreClick={() => setSidebarOpen(true)} />
    </div>
  );
}

function ShellNavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
      href={item.href}
      className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
    >
      <span className={styles.navIcon}>{item.icon}</span>
      <span className={styles.navLabel}>{item.label}</span>
    </Link>
  );
}
