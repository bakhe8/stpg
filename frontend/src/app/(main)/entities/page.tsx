"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getEntities, Entity } from "../../../lib/api/entities";
import styles from "./entities.module.css";

export default function EntitiesPage() {
  const t = useTranslations("entities");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ENTITY_TYPE_LABELS: Record<string, string> = {
    FAMILY: t("typeFamily"),
    TRIBE: t("typeTribe"),
    BUILDING: t("typeBuilding"),
    NEIGHBORHOOD: t("typeNeighborhood"),
    COMMUNITY: t("typeCommunity"),
    CAMPAIGN: t("typeCampaign"),
    FRIENDS: t("typeFriends"),
  };

  const roleLabel = (role?: string | null) => {
    if (!role) return "";
    const roleKey = `role${role
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("")}`;
    return t(roleKey as Parameters<typeof t>[0]);
  };

  const load = useCallback(async () => {
    try {
      setEntities(await getEntities());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("generalError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
        <Link
          href="/entities/new"
          className={styles.addBtn}
        >
          {t("newEntity")}
        </Link>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.centered}>
          <div className={styles.spinner} />
        </div>
      ) : entities.length === 0 ? (
        <div className={styles.empty}>{t("empty")}</div>
      ) : (
        <div className={styles.list}>
          {entities.map((e) => (
            <Link key={e.id} href={`/entities/${e.id}`} className={styles.row}>
              <div className={styles.rowIcon}>⬡</div>
              <div className={styles.rowInfo}>
                <div className={styles.rowName}>{e.name}</div>
                <div className={styles.rowType}>
                  {ENTITY_TYPE_LABELS[e.type] ?? e.type}
                  {e.myRole ? (
                    <span className={styles.roleBadge}>
                      {roleLabel(e.myRole)}
                    </span>
                  ) : null}
                </div>
              </div>
              {e.platformStatus && e.platformStatus !== 'ACTIVE' && (
                <span className={styles.platformBadge} data-status={e.platformStatus}>
                  {e.platformStatus === 'SUSPENDED' ? '🚫 معلّق' : e.platformStatus === 'READ_ONLY' ? '👁 قراءة فقط' : '⏳ قيد المراجعة'}
                </span>
              )}
              <div className={`${styles.statusDot} ${e.isActive ? styles.statusActive : styles.statusInactive}`} />
              <div className={styles.rowArrow}>←</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
