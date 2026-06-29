"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import styles from "./bottomnav.module.css";
import type { NavItem } from "./surfaceNavigation";

interface Props {
  onMoreClick: () => void;
  items: readonly NavItem[];
}

export default function BottomNav({ onMoreClick, items }: Props) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className={styles.bar} aria-label={t("menu")}>
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
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
