"use client";

import React, { useEffect, useState } from "react";
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
            title: "إرهاق الدفع",
            value: `${ind.paymentFatigueScore}%`,
            status: statusFromScore(100 - ind.paymentFatigueScore, [40, 70]),
            description:
              adv.paymentFatigue.currentOverdueRate > 0
                ? `نسبة التأخر الحالية: ${pct(adv.paymentFatigue.currentOverdueRate)} · ${adv.paymentFatigue.overloadedMembers} عضو مثقل`
                : "لا يوجد تأخر في الدفع",
          },
          {
            id: "voting_fatigue",
            title: "إرهاق التصويت",
            value: pct(adv.votingFatigue.avgParticipationRate),
            status: adv.votingFatigue.isBelowThreshold ? "warning" : "good",
            description:
              adv.votingFatigue.generalDecisionsCount > 0
                ? `${adv.votingFatigue.generalDecisionsCount} قرار تصويتي · متوسط المشاركة ${pct(adv.votingFatigue.avgParticipationRate)}`
                : "لا توجد قرارات تصويتية حديثة",
          },
          {
            id: "weak_paths",
            title: "مسارات الحوكمة الضعيفة",
            value: String(ind.weakPathsCount),
            status: ind.weakPathsCount === 0 ? "good" : ind.weakPathsCount <= 2 ? "warning" : "critical",
            description:
              adv.weakPaths.paths.length > 0
                ? `مسارات: ${adv.weakPaths.paths.map((p) => p.name).join("، ")}`
                : "جميع المسارات نشطة وكافية",
          },
          {
            id: "zombie_wallets",
            title: "محافظ شبه ميتة",
            value: String(ind.zombieWalletsCount),
            status: ind.zombieWalletsCount === 0 ? "good" : "warning",
            description:
              adv.zombieWallets.length > 0
                ? `محافظ: ${adv.zombieWallets.map((w) => w.name).join("، ")}`
                : "جميع المحافظ لها حركة تشغيلية",
          },
          {
            id: "safety_threshold",
            title: "الرصيد دون حد الأمان",
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
                    .map((w) => `${w.name}: ${Number(w.balance).toLocaleString("ar-SA")} ر.س`)
                    .join(" · ")
                : "جميع المحافظ فوق حد الأمان",
          },
          {
            id: "dispute_rate",
            title: "كثرة الاعتراضات",
            value: pct(ind.disputeRate),
            status: statusFromScore(1 - ind.disputeRate, [0.5, 0.7]),
            description:
              `${adv.disputes.appealsCurrent30} اعتراض · ${adv.disputes.disputesCurrent30} نزاع` +
              ` في آخر 30 يوم`,
          },
          {
            id: "out_of_band",
            title: "قرارات خارج النظام",
            value: pct(ind.outOfBandRatio),
            status: statusFromScore(1 - ind.outOfBandRatio, [0.5, 0.8]),
            description:
              adv.outOfBandDecisions.outOfBandTransactions > 0
                ? `${adv.outOfBandDecisions.outOfBandTransactions} تسوية من أصل ${adv.outOfBandDecisions.totalTransactions90} عملية (90 يوم)`
                : "لا توجد تسويات خارج النظام",
          },
        ]);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "فشل تحميل مؤشرات الصحة");
      })
      .finally(() => setLoading(false));
  }, [entityId]);

  const scoreColor =
    overallScore === null
      ? "var(--text-secondary)"
      : overallScore >= 70
      ? "#22c55e"
      : overallScore >= 40
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>مركز صحة الصندوق</h1>
          <p className={styles.subtitle}>7 مؤشرات تشغيلية لصحة كيانك</p>
        </div>
        <select
          className={styles.select}
          value={entityId}
          onChange={(e) => {
            setEntityId(e.target.value);
            localStorage.setItem("currentEntityId", e.target.value);
          }}
          title="اختر كياناً"
        >
          <option value="">— اختر كياناً —</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {!entityId && (
        <div className={styles.prompt}>اختر كياناً لعرض مؤشرات الصحة التشغيلية</div>
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
                {overallLevel === "EXCELLENT" ? "ممتاز"
                  : overallLevel === "GOOD" ? "جيد"
                  : overallLevel === "FAIR" ? "مقبول"
                  : overallLevel === "POOR" ? "ضعيف"
                  : overallLevel ?? "غير محدد"}
              </div>
              <div className={styles.overallLabel}>درجة الصحة العامة (من 100)</div>
            </div>
          </div>

          {alerts.length > 0 && (
            <div className={styles.alertsBox}>
              <div className={styles.alertsTitle}>⚠ تنبيهات تحتاج إجراء</div>
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
                  {ind.status === "good" ? "✓ طبيعي" : ind.status === "warning" ? "⚠ تحذير" : "✗ حرج"}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
