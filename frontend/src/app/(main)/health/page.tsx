"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getEntities, Entity } from "../../../lib/api/entities";
import { getEntityHealth } from "../../../lib/api/analytics";
import { ADMIN_ROLES, hasRole } from "../../../lib/access";
import styles from "./health.module.css";

type HealthStatus = "good" | "warning" | "critical";

interface Indicator {
  id: string;
  title: string;
  value: string;
  status: HealthStatus;
  description: string;
}

function statusFromScore(score: number, thresholds: [number, number]): HealthStatus {
  if (score <= thresholds[0]) return "critical";
  if (score <= thresholds[1]) return "warning";
  return "good";
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export default function HealthPage() {
  const t = useTranslations("health");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [overallLevel, setOverallLevel] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEntities()
      .then((items) => {
        const filtered = items.filter((e) => hasRole(e, ADMIN_ROLES));
        setEntities(filtered);
        const stored = localStorage.getItem("currentEntityId");
        const nextId =
          stored && filtered.some((entity) => entity.id === stored)
            ? stored
            : filtered[0]?.id ?? "";
        if (nextId) {
          localStorage.setItem("currentEntityId", nextId);
          setEntityId(nextId);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!entityId) return;
    setLoading(true);
    setError(null);
    getEntityHealth(entityId)
      .then((health) => {
        const ind = health.indicators;
        const adv = health.advancedIndicators;

        setOverallScore(health.healthScore);
        setOverallLevel(health.healthLevel);
        setAlerts(health.alerts);

        setIndicators([
          {
            id: "payment_fatigue",
            title: t("indPaymentFatigueTitle"),
            value: `${ind.paymentFatigueScore}%`,
            status: statusFromScore(100 - ind.paymentFatigueScore, [40, 70]),
            description:
              adv.paymentFatigue.currentOverdueRate > 0
                ? t("indPaymentFatigueDescActive", {
                    rate: pct(adv.paymentFatigue.currentOverdueRate),
                    members: adv.paymentFatigue.overloadedMembers,
                  })
                : t("indPaymentFatigueDescNone"),
          },
          {
            id: "voting_fatigue",
            title: t("indVotingFatigueTitle"),
            value: pct(adv.votingFatigue.avgParticipationRate),
            status: adv.votingFatigue.isBelowThreshold ? "warning" : "good",
            description:
              adv.votingFatigue.generalDecisionsCount > 0
                ? t("indVotingFatigueDescActive", {
                    count: adv.votingFatigue.generalDecisionsCount,
                    rate: pct(adv.votingFatigue.avgParticipationRate),
                  })
                : t("indVotingFatigueDescNone"),
          },
          {
            id: "weak_paths",
            title: t("indWeakPathsTitle"),
            value: String(ind.weakPathsCount),
            status: ind.weakPathsCount === 0 ? "good" : ind.weakPathsCount <= 2 ? "warning" : "critical",
            description:
              adv.weakPaths.paths.length > 0
                ? t("indWeakPathsDescActive", {
                    names: adv.weakPaths.paths.map((p) => p.name).join("، "),
                  })
                : t("indWeakPathsDescNone"),
          },
          {
            id: "zombie_wallets",
            title: t("indZombieWalletsTitle"),
            value: String(ind.zombieWalletsCount),
            status: ind.zombieWalletsCount === 0 ? "good" : "warning",
            description:
              adv.zombieWallets.length > 0
                ? t("indZombieWalletsDescActive", {
                    names: adv.zombieWallets.map((w) => w.name).join("، "),
                  })
                : t("indZombieWalletsDescNone"),
          },
          {
            id: "safety_threshold",
            title: t("indSafetyThresholdTitle"),
            value: String(ind.belowSafetyThresholdCount),
            status:
              ind.belowSafetyThresholdCount === 0
                ? "good"
                : ind.belowSafetyThresholdCount === 1
                ? "warning"
                : "critical",
            description:
              adv.belowSafetyThreshold.length > 0
                ? adv.belowSafetyThreshold
                    .map((w) =>
                      t("indSafetyThresholdAmount", {
                        name: w.name,
                        amount: Number(w.balance).toLocaleString("ar-SA"),
                      }),
                    )
                    .join(" · ")
                : t("indSafetyThresholdDescNone"),
          },
          {
            id: "dispute_rate",
            title: t("indDisputeRateTitle"),
            value: pct(ind.disputeRate),
            status: statusFromScore(1 - ind.disputeRate, [0.5, 0.7]),
            description: t("indDisputeRateDesc", {
              appeals: adv.disputes.appealsCurrent30,
              disputes: adv.disputes.disputesCurrent30,
            }),
          },
          {
            id: "out_of_band",
            title: t("indOutOfBandTitle"),
            value: pct(ind.outOfBandRatio),
            status: statusFromScore(1 - ind.outOfBandRatio, [0.5, 0.8]),
            description:
              adv.outOfBandDecisions.outOfBandTransactions > 0
                ? t("indOutOfBandDescActive", {
                    out: adv.outOfBandDecisions.outOfBandTransactions,
                    total: adv.outOfBandDecisions.totalTransactions90,
                  })
                : t("indOutOfBandDescNone"),
          },
        ]);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t("loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [entityId, t]);

  const scoreColor =
    overallScore === null
      ? "var(--text-secondary)"
      : overallScore >= 70
      ? "#22c55e"
      : overallScore >= 40
      ? "#f59e0b"
      : "#ef4444";

  const overallLevelText =
    overallLevel === "EXCELLENT"
      ? t("levelExcellent")
      : overallLevel === "GOOD"
      ? t("levelGood")
      : overallLevel === "FAIR"
      ? t("levelFair")
      : overallLevel === "POOR"
      ? t("levelPoor")
      : overallLevel ?? t("levelUnknown");

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>
        <select
          className={styles.select}
          value={entityId}
          onChange={(e) => {
            setEntityId(e.target.value);
            localStorage.setItem("currentEntityId", e.target.value);
          }}
          title={t("selectEntityTitle")}
        >
          <option value="">{t("selectEntityOption")}</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {!entityId && (
        <div className={styles.prompt}>{t("selectEntityPrompt")}</div>
      )}

      {entityId && loading && (
        <div className={styles.centered}><div className={styles.spinner} /></div>
      )}

      {entityId && error && (
        <div className={styles.errorMsg}>⚠ {error}</div>
      )}

      {entityId && !loading && !error && overallScore !== null && (
        <>
          <div className={styles.overallCard}>
            <div className={styles.overallScore} style={{ color: scoreColor }}>
              {overallScore}
            </div>
            <div className={styles.overallMeta}>
              <div className={styles.overallLevel} style={{ color: scoreColor }}>
                {overallLevelText}
              </div>
              <div className={styles.overallLabel}>{t("overallLabel")}</div>
            </div>
          </div>

          {alerts.length > 0 && (
            <div className={styles.alertsBox}>
              <div className={styles.alertsTitle}>{t("alertsTitle")}</div>
              <ul className={styles.alertsList}>
                {alerts.map((a, i) => (
                  <li key={i} className={styles.alertItem}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.grid}>
            {indicators.map((ind) => (
              <div key={ind.id} className={`${styles.card} ${styles[ind.status]}`}>
                <div className={styles.cardTop}>
                  <div className={styles.indicatorTitle}>{ind.title}</div>
                  <div className={`${styles.statusDot} ${styles[`dot_${ind.status}`]}`} />
                </div>
                <div className={styles.indicatorValue}>{ind.value}</div>
                <div className={styles.indicatorDesc}>{ind.description}</div>
                <div className={styles.statusLabel}>
                  {ind.status === "good" ? t("statusNormal") : ind.status === "warning" ? t("statusWarning") : t("statusCritical")}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
