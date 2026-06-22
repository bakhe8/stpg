"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { getEntities } from "@/lib/api/entities";
import { getEntityHealth } from "@/lib/api/analytics";
import { filterEntitiesByRoles, OVERSIGHT_ROLES } from "@/lib/access";
import AccessReasonPanel from "@/components/shared/AccessReasonPanel";
import styles from "./analytics.module.css";

interface EntityData {
  id: string;
  name: string;
}

interface IndicatorCard {
  key: string;
  label: string;
  status: "GREEN" | "YELLOW" | "RED";
  value: string;
  message?: string;
}

type HealthData = Awaited<ReturnType<typeof getEntityHealth>>;

const STATUS_ICON: Record<string, string> = {
  GREEN: "🟢",
  YELLOW: "🟡",
  RED: "🔴",
};

function deriveStatus(score: number, threshold30: number, threshold60: number): "GREEN" | "YELLOW" | "RED" {
  if (score >= threshold60) return "RED";
  if (score >= threshold30) return "YELLOW";
  return "GREEN";
}

export default function HealthCenterPage() {
  const t = useTranslations("analytics");
  const [entities, setEntities] = useState<EntityData[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntities = useCallback(async () => {
    try {
      const data = await getEntities();
      const allowedEntities = filterEntitiesByRoles(data, OVERSIGHT_ROLES);
      setEntities(allowedEntities);
      if (allowedEntities.length > 0) {
        const stored = localStorage.getItem("currentEntityId");
        const nextId =
          stored && allowedEntities.some((entity) => entity.id === stored)
            ? stored
            : allowedEntities[0].id;
        localStorage.setItem("currentEntityId", nextId);
        setSelectedEntityId(nextId);
      }
      else setLoading(false);
    } catch { setLoading(false); }
  }, []);

  const loadHealth = useCallback(async (entityId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEntityHealth(entityId);
      setHealth(data as HealthData);
    } catch {
      setError(t("loadError"));
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadEntities(); }, [loadEntities]);
  useEffect(() => { if (selectedEntityId) void loadHealth(selectedEntityId); }, [selectedEntityId, loadHealth]);

  const buildCards = (): IndicatorCard[] => {
    if (!health) return [];
    const { indicators, advancedIndicators, alerts } = health;

    return [
      {
        key: "paymentFatigue",
        label: t("cardPaymentFatigue"),
        status: deriveStatus(indicators.paymentFatigueScore, 20, 50),
        value: t("cardPaymentFatigueValue", { pct: advancedIndicators.paymentFatigue.currentOverdueRate * 100 | 0 }),
        message: alerts.find((a) => a.includes(t("metricPaymentFatigue"))),
      },
      {
        key: "votingFatigue",
        label: t("cardVotingFatigue"),
        status: advancedIndicators.votingFatigue.isBelowThreshold ? "RED" : "GREEN",
        value: t("cardVotingFatigueValue", { pct: Math.round(advancedIndicators.votingFatigue.avgParticipationRate * 100) }),
        message: alerts.find((a) => a.includes(t("metricVotingFatigue"))),
      },
      {
        key: "weakPaths",
        label: t("cardWeakPaths"),
        status: advancedIndicators.weakPaths.paths.length > 0 ? "YELLOW" : "GREEN",
        value: t("cardWeakPathsValue", { count: advancedIndicators.weakPaths.paths.length }),
        message: alerts.find((a) => a.includes(t("metricWeakGovernance"))),
      },
      {
        key: "zombieWallets",
        label: t("cardZombieWallets"),
        status: advancedIndicators.zombieWallets.length > 0 ? "YELLOW" : "GREEN",
        value: t("cardZombieWalletsValue", { count: advancedIndicators.zombieWallets.length }),
        message: alerts.find((a) => a.includes(t("metricDeadWallet"))),
      },
      {
        key: "safetyThreshold",
        label: t("cardSafetyThreshold"),
        status: advancedIndicators.belowSafetyThreshold.length > 0 ? "RED" : "GREEN",
        value: t("cardSafetyThresholdValue", { count: advancedIndicators.belowSafetyThreshold.length }),
        message: alerts.find((a) => a.includes(t("metricEmergencyWallet"))),
      },
      {
        key: "disputeRate",
        label: t("cardDisputeRate"),
        status: advancedIndicators.disputes.disputeRate > 0.3 ? "RED" : advancedIndicators.disputes.disputeRate > 0.15 ? "YELLOW" : "GREEN",
        value: `${Math.round(advancedIndicators.disputes.disputeRate * 100)}%`,
        message: alerts.find((a) => a.includes(t("metricDisputeRate"))),
      },
      {
        key: "outOfBand",
        label: t("cardOutOfBand"),
        status: advancedIndicators.outOfBandDecisions.ratio > 0.2 ? "YELLOW" : "GREEN",
        value: t("cardOutOfBandValue", { pct: Math.round(advancedIndicators.outOfBandDecisions.ratio * 100) }),
        message: alerts.find((a) => a.includes(t("metricOffPlatform"))),
      },
    ];
  };

  const cards = buildCards();
  const redCount = cards.filter((c) => c.status === "RED").length;
  const yellowCount = cards.filter((c) => c.status === "YELLOW").length;
  const overallStatus: "RED" | "YELLOW" | "GREEN" = redCount > 0 ? "RED" : yellowCount > 0 ? "YELLOW" : "GREEN";

  const STATUS_LABEL: Record<string, string> = {
    GREEN: t("statusGood"),
    YELLOW: t("statusWarning"),
    RED: t("statusCritical"),
  };

  if (loading && !entities.length) return <div className={styles.loading}>{t("loading")}</div>;

  if (!loading && entities.length === 0) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t("title")}</h1>
        </header>
        <AccessReasonPanel reason="INSUFFICIENT_ROLE" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("title")}</h1>
        {entities.length > 0 && (
          <select
            className={styles.entitySelect}
            value={selectedEntityId}
            onChange={(e) => {
              setSelectedEntityId(e.target.value);
              localStorage.setItem("currentEntityId", e.target.value);
            }}
            aria-label={t("chooseEntity")}
          >
            {entities.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}
      </header>

      {loading && entities.length > 0 ? (
        <div className={styles.loading}>{t("loading")}</div>
      ) : error ? (
        <div className={styles.empty}>{error}</div>
      ) : health ? (
        <div className={styles.dashboard}>
          <div className={`${styles.overallBanner} ${styles[`banner${overallStatus}`]}`}>
            <span className={styles.overallIcon}>{STATUS_ICON[overallStatus]}</span>
            <div>
              <strong>{t("overallStatus")} {STATUS_LABEL[overallStatus]}</strong>
              <span className={styles.overallScore}>
                {health.healthScore}% — {health.healthLevel}
              </span>
            </div>
          </div>

          <div className={styles.indicatorsGrid}>
            {cards.map((card) => (
              <div key={card.key} className={`${styles.indicatorCard} ${styles[`card${card.status}`]}`}>
                <div className={styles.indicatorHeader}>
                  <span className={styles.statusIcon}>{STATUS_ICON[card.status]}</span>
                  <span className={styles.indicatorLabel}>{card.label}</span>
                </div>
                <div className={styles.indicatorValue}>{card.value}</div>
                {card.message && (
                  <div className={styles.indicatorMessage}>{card.message}</div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.section}>
            <h2>{t("summaryTitle")}</h2>
            <div className={styles.kpiCards}>
              {[
                { label: t("kpiTotalBalance"), value: `${Number(health.summary.totalBalance).toLocaleString()} ${t("sar")}` },
                { label: t("kpiActiveMembers"), value: `${health.summary.activeMembers} / ${health.summary.totalMembers}` },
                { label: t("kpiActiveSubs"), value: String(health.summary.activeSubs) },
                { label: t("kpiMonthlyRevenue"), value: `${Number(health.summary.monthlyExpectedRevenue).toLocaleString()} ${t("sar")}` },
              ].map((kpi) => (
                <div key={kpi.label} className={styles.card}>
                  <h3>{kpi.label}</h3>
                  <div className={styles.value}>{kpi.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className={styles.empty}>{t("noData")}</p>
      )}
    </div>
  );
}
