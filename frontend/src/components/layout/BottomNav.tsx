"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import styles from "./bottomnav.module.css";

const PRIMARY_ITEMS = [
  { href: "/dashboard", icon: "⌂", labelKey: "dashboard" },
  { href: "/entities", icon: "◇", labelKey: "entities" },
  { href: "/portal", icon: "◎", labelKey: "portal" },
  { href: "/decisions", icon: "✓", labelKey: "decisions" },
  { href: "/notifications", icon: "◌", labelKey: "notifications" },
] as const;

interface Props {
  onMoreClick: () => void;
}

export default function BottomNav({ onMoreClick }: Props) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className={styles.bar} aria-label={t("menu")}>
      {PRIMARY_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{t(item.labelKey)}</span>
          </Link>
        );
      })}
      <button className={styles.item} onClick={onMoreClick} type="button">
        <span className={styles.icon}>≡</span>
        <span className={styles.label}>{t("menu")}</span>
      </button>
    </nav>
  );
}
