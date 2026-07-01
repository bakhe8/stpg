"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getEntities, Entity } from "../../../lib/api/entities";
import {
  getEntityWallets,
  getWalletPaths,
  Wallet,
  GovernancePath,
} from "../../../lib/api/wallets";
import {
  getSubscriptions,
  createSubscription,
  Subscription,
} from "../../../lib/api/subscriptions";
import {
  getMemberSubscriptionOverlaps,
  SubscriptionOverlap,
} from "../../../lib/api/analytics";
import {
  getMembershipPreferences,
  MemberPreference,
} from "../../../lib/api/memberships";
import styles from "./subscriptions.module.css";
import RuleSummaryPanel from "../../../components/Governance/RuleSummaryPanel";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SubscriptionsPage() {
  const t = useTranslations("subscriptions");

  const STATE_MAP: Record<
    string,
    { label: string; bg: string; color: string }
  > = {
    ACTIVE: {
      label: t("stateActive"),
      bg: "rgba(34,197,94,0.15)",
      color: "#22c55e",
    },
    INTERESTED: {
      label: t("stateInterested"),
      bg: "var(--accent-soft)",
      color: "var(--accent-primary)",
    },
    CONDITIONAL: {
      label: t("stateConditional"),
      bg: "rgba(245,158,11,0.15)",
      color: "#f59e0b",
    },
    SUSPENDED: {
      label: t("stateSuspended"),
      bg: "rgba(239,68,68,0.15)",
      color: "#ef4444",
    },
    EXITED: {
      label: t("stateExited"),
      bg: "var(--surface-muted)",
      color: "var(--text-secondary)",
    },
    SUPPORTER_ONLY: {
      label: t("stateSupporterOnly"),
      bg: "rgba(139,92,246,0.12)",
      color: "#7c3aed",
    },
  };

  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletNameByPathId, setWalletNameByPathId] = useState<
    Record<string, string>
  >({});
  const [paths, setPaths] = useState<GovernancePath[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [overlaps, setOverlaps] = useState<SubscriptionOverlap | null>(null);
  const [preferences, setPreferences] = useState<MemberPreference | null>(null);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [form, setForm] = useState({
    membershipId: "",
    pathId: "",
    agreedAmount: "",
    notes: "",
  });
  const selectedEntity = entities.find((entity) => entity.id === selectedId);
  const activeCount = subscriptions.filter((s) => s.state === "ACTIVE").length;
  const conditionalCount = subscriptions.filter(
    (s) => s.state === "CONDITIONAL",
  ).length;
  const supporterOnlyCount = subscriptions.filter(
    (s) => s.state === "SUPPORTER_ONLY",
  ).length;
  const monthlyAmount = subscriptions
    .filter((s) => ["ACTIVE", "CONDITIONAL"].includes(s.state))
    .reduce((sum, s) => sum + Number(s.agreedAmount ?? 0), 0);

  function subscriptionOutcome(subscription: Subscription) {
    if (subscription.state === "ACTIVE") return t("relationshipRowActive");
    if (subscription.state === "CONDITIONAL")
      return t("relationshipRowConditional");
    if (subscription.state === "SUPPORTER_ONLY")
      return t("relationshipRowSupporterOnly");
    if (subscription.state === "INTERESTED")
      return t("relationshipRowInterested");
    if (subscription.state === "SUSPENDED")
      return t("relationshipRowSuspended");
    return t("relationshipRowExited");
  }

  function subscriptionRightsText(subscription: Subscription) {
    if (subscription.state === "ACTIVE") return t("rowRightsActive");
    if (subscription.state === "CONDITIONAL") return t("rowRightsConditional");
    if (subscription.state === "SUPPORTER_ONLY")
      return t("rowRightsSupporterOnly");
    if (subscription.state === "SUSPENDED") return t("rowRightsSuspended");
    if (subscription.state === "INTERESTED") return t("rowRightsInterested");
    return t("rowRightsExited");
  }

  function pathTypeText(type?: string) {
    if (type === "BOARD") return t("pathTypeBoard");
    if (type === "COMMITTEE") return t("pathTypeCommittee");
    if (type === "PUBLIC_VOTE") return t("pathTypePublicVote");
    if (type === "INDIVIDUAL_WITH_CAP") return t("pathTypeIndividual");
    if (type === "DONATION_ONLY") return t("pathTypeDonation");
    if (type === "EMERGENCY_FAST") return t("pathTypeEmergency");
    return t("pathTypeGeneral");
  }

  function preferenceGovernanceText() {
    if (!preferences || preferences.acceptedGovernanceTypes.length === 0) {
      return t("prefsAnyGovernance");
    }
    return preferences.acceptedGovernanceTypes.map(pathTypeText).join("، ");
  }

  function preferenceWarnings(pathType?: string, amount?: number | null) {
    if (!preferences) return [];
    const warnings: string[] = [];
    if (
      pathType &&
      preferences.acceptedGovernanceTypes.length > 0 &&
      !preferences.acceptedGovernanceTypes.includes(pathType)
    ) {
      warnings.push(
        t("prefsGovernanceConflict", {
          accepted: preferenceGovernanceText(),
          actual: pathTypeText(pathType),
        }),
      );
    }
    const cap = Number(preferences.maxSpendingCapAccepted ?? 0);
    if (amount && cap > 0 && amount > cap) {
      warnings.push(
        t("prefsCapConflict", {
          cap: formatCurrency(cap),
          amount: formatCurrency(amount),
        }),
      );
    }
    if (preferences.requiresAuditAccess) warnings.push(t("prefsAuditRequirement"));
    if (preferences.requiresCommitteeApproval) {
      warnings.push(t("prefsCommitteeRequirement"));
    }
    return warnings;
  }

  useEffect(() => {
    getEntities()
      .then(setEntities)
      .catch(() => {});
    getMemberSubscriptionOverlaps()
      .then(setOverlaps)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const entity = entities.find((item) => item.id === selectedId);
    Promise.all([
      getSubscriptions({}),
      getEntityWallets(selectedId),
      entity?.myMembershipId
        ? getMembershipPreferences(entity.myMembershipId).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(async ([allSubscriptions, wals, prefs]) => {
        const pathsPerWallet = await Promise.all(
          wals.map((wallet) =>
            getWalletPaths(wallet.id).catch(() => [] as GovernancePath[]),
          ),
        );
        const nextWalletNameByPathId = Object.fromEntries(
          pathsPerWallet.flatMap((walletPaths, index) =>
            walletPaths.map((path) => [path.id, wals[index]?.name ?? ""]),
          ),
        );
        setSubscriptions(
          allSubscriptions.filter(
            (subscription) => subscription.membership?.entityId === selectedId,
          ),
        );
        setWallets(wals);
        setPreferences(prefs);
        setWalletNameByPathId(nextWalletNameByPathId);
        setForm((current) => ({
          ...current,
          membershipId: entity?.myMembershipId ?? "",
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entities, selectedId]);

  async function handleWalletChange(walletId: string) {
    if (!walletId) {
      setPaths([]);
      return;
    }
    try {
      setPaths(await getWalletPaths(walletId));
    } catch {
      setPaths([]);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsg(null);
    try {
      await createSubscription(form.pathId, {
        membershipId: form.membershipId,
        agreedAmount: form.agreedAmount
          ? parseFloat(form.agreedAmount)
          : undefined,
        notes: form.notes || undefined,
      });
      setMsg(t("createSuccess"));
      setShowForm(false);
      setForm({
        membershipId: form.membershipId,
        pathId: "",
        agreedAmount: "",
        notes: "",
      });
      const subs = await getSubscriptions({});
      setSubscriptions(
        subs.filter(
          (subscription) => subscription.membership?.entityId === selectedId,
        ),
      );
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : t("createFailed")}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
        <div className={styles.controls}>
          <select
            className={styles.entitySelect}
            value={selectedId}
            onChange={(e) => {
              const entityId = e.target.value;
              const entity = entities.find((item) => item.id === entityId);
              setSelectedId(entityId);
              setForm({
                membershipId: entity?.myMembershipId ?? "",
                pathId: "",
                agreedAmount: "",
                notes: "",
              });
              setMsg(null);
              setSubscriptions([]);
              setWallets([]);
              setWalletNameByPathId({});
              setPaths([]);
              setPreferences(null);
              setLoading(Boolean(entityId));
            }}
          >
            <option value="">{t("chooseEntity")}</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          {selectedId && (
            <button
              className={styles.addBtn}
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? t("cancelNew") : t("newSub")}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div
          className={`${styles.msg} ${msg.startsWith("✓") ? styles.success : styles.error}`}
        >
          {msg}
        </div>
      )}

      {!selectedId && <div className={styles.prompt}>{t("prompt")}</div>}

      {selectedId && (
        <section className={styles.relationshipPanel}>
          <div className={styles.relationshipHeader}>
            <div>
              <h2 className={styles.relationshipTitle}>
                {t("relationshipTitle")}
              </h2>
              <p className={styles.relationshipText}>
                {t("relationshipText", {
                  entity: selectedEntity?.name ?? t("entityFallback"),
                })}
              </p>
            </div>
          </div>
          <div className={styles.relationshipGrid}>
            <div>
              <span>{t("relationshipActive")}</span>
              <strong>{activeCount}</strong>
            </div>
            <div>
              <span>{t("relationshipConditional")}</span>
              <strong>{conditionalCount}</strong>
            </div>
            <div>
              <span>{t("relationshipSupporterOnly")}</span>
              <strong>{supporterOnlyCount}</strong>
            </div>
            <div>
              <span>{t("relationshipMonthly")}</span>
              <strong>
                {monthlyAmount > 0
                  ? formatCurrency(monthlyAmount)
                  : t("relationshipNone")}
              </strong>
            </div>
          </div>
          <p className={styles.relationshipOutcome}>
            {subscriptions.length > 0
              ? t("relationshipOutcome")
              : t("relationshipNoSubs")}
          </p>
          {preferences && (
            <div className={styles.preferencePanel}>
              <div className={styles.preferenceHeader}>
                <div>
                  <span>{t("prefsEyebrow")}</span>
                  <h3>{t("prefsTitle")}</h3>
                </div>
                <strong>
                  {preferences.requiresCommitteeApproval || preferences.requiresAuditAccess
                    ? t("prefsConditionalImpact")
                    : t("prefsFlexibleImpact")}
                </strong>
              </div>
              <div className={styles.preferenceGrid}>
                <div>
                  <span>{t("prefsAcceptedGovernance")}</span>
                  <strong>{preferenceGovernanceText()}</strong>
                </div>
                <div>
                  <span>{t("prefsMaxCap")}</span>
                  <strong>
                    {preferences.maxSpendingCapAccepted
                      ? formatCurrency(Number(preferences.maxSpendingCapAccepted))
                      : t("prefsNoCap")}
                  </strong>
                </div>
                <div>
                  <span>{t("prefsAuditAccess")}</span>
                  <strong>
                    {preferences.requiresAuditAccess ? t("yes") : t("no")}
                  </strong>
                </div>
                <div>
                  <span>{t("prefsCommitteeApproval")}</span>
                  <strong>
                    {preferences.requiresCommitteeApproval ? t("yes") : t("no")}
                  </strong>
                </div>
              </div>
              {preferences.notes && (
                <p className={styles.preferenceNote}>{preferences.notes}</p>
              )}
            </div>
          )}
        </section>
      )}

      {showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>{t("newSubTitle")}</h3>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t("memberLabel")}</label>
                <div className={styles.currentMember}>
                  <strong>{t("currentMember")}</strong>
                  <span>{selectedEntity?.name}</span>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t("walletLabel")}</label>
                <select
                  className={styles.input}
                  onChange={(e) => handleWalletChange(e.target.value)}
                >
                  <option value="">{t("chooseWallet")}</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t("pathLabel")}</label>
                <select
                  className={styles.input}
                  value={form.pathId}
                  onChange={(e) => {
                    setForm({ ...form, pathId: e.target.value });
                    setTermsAgreed(false);
                  }}
                  required
                >
                  <option value="">{t("choosePath")}</option>
                  {paths.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t("amountLabel")}</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.agreedAmount}
                  onChange={(e) =>
                    setForm({ ...form, agreedAmount: e.target.value })
                  }
                  placeholder="0.00"
                  dir="ltr"
                />
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>{t("notesLabel")}</label>
              <input
                className={styles.input}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("notesPlaceholder")}
              />
            </div>
            {form.pathId &&
              (() => {
                const selectedPath = paths.find((p) => p.id === form.pathId);
                const warnings = preferenceWarnings(
                  selectedPath?.type,
                  form.agreedAmount ? Number(form.agreedAmount) : null,
                );
                return selectedPath ? (
                  <div className={styles.termsBox}>
                    <RuleSummaryPanel
                      title={`شروط المشاركة في: ${selectedPath.name}`}
                      summary={`باشتراكك في هذا المسار تقر بما يلي:\n• الاشتراك وفق المبلغ المتفق عليه في كل فترة دفع\n• الخضوع لآلية الحوكمة المعتمدة في الصندوق\n• إمكانية إيقاف الاشتراك عند التأخر المتكرر\n• أن حق الاستفادة مرتبط بالنظام الداخلي للصندوق`}
                      icon="📜"
                    />
                    <label className={styles.termsCheck}>
                      <input
                        type="checkbox"
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                      />
                      <span>أفهم وأوافق على شروط المشاركة في هذا المسار</span>
                    </label>
                    {warnings.length > 0 && (
                      <div className={styles.preferenceWarning}>
                        <strong>{t("prefsNewSubscriptionImpact")}</strong>
                        {warnings.map((warning) => (
                          <span key={warning}>{warning}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={
                creating || !form.membershipId || !form.pathId || !termsAgreed
              }
            >
              {creating ? t("creating") : t("createBtn")}
            </button>
          </form>
        </div>
      )}

      {overlaps?.hasOverlaps && (
        <div className={styles.overlapSection}>
          <h3 className={styles.overlapTitle}>{t("overlapTitle")}</h3>
          <p className={styles.overlapNote}>{overlaps.note}</p>
          {overlaps.overlaps.map((overlap) => (
            <div key={overlap.purpose} className={styles.overlapCard}>
              <div className={styles.overlapPurposeRow}>
                <span className={styles.overlapPurpose}>{overlap.purpose}</span>
                <span className={styles.overlapCount}>
                  {t("overlapEntities", { count: overlap.entityCount })}
                </span>
                <span className={styles.overlapAmount}>
                  {new Intl.NumberFormat("ar-SA").format(
                    overlap.totalMonthlyAmount,
                  )}{" "}
                  {t("sarPerMonth")}
                </span>
              </div>
              <div className={styles.overlapSubList}>
                {overlap.subscriptions.map((sub, i) => (
                  <div key={i} className={styles.overlapSubRow}>
                    <span className={styles.overlapEntityName}>
                      {sub.entityName}
                    </span>
                    <span className={styles.overlapWalletName}>
                      {sub.walletName} — {sub.pathName}
                    </span>
                    <span className={styles.overlapMonthly}>
                      {new Intl.NumberFormat("ar-SA").format(sub.monthlyAmount)}{" "}
                      {t("sar")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedId && loading ? (
        <div className={styles.centered}>
          <div className={styles.spinner} />
        </div>
      ) : selectedId && subscriptions.length === 0 ? (
        <div className={styles.emptyStatePanel}>
          <h3>{t("emptyTitle")}</h3>
          <p>{t("emptyBody")}</p>
          <Link href={`/entities/${selectedId}`} className={styles.emptyStateAction}>
            {t("emptyAction")}
          </Link>
        </div>
      ) : selectedId ? (
        <div className={styles.list}>
          {subscriptions.map((s) => {
            const sc = STATE_MAP[s.state] ?? {
              label: s.state,
              bg: "var(--surface-muted)",
              color: "var(--text-secondary)",
            };
            const walletName =
              walletNameByPathId[s.governancePathId] ?? t("rowWalletUnknown");
            const rowPreferenceWarnings = preferenceWarnings(
              s.governancePath?.type,
              s.agreedAmount != null ? Number(s.agreedAmount) : null,
            );
            return (
              <div key={s.id} className={styles.row}>
                <div className={styles.rowAvatar}>
                  {s.membership?.person.name.charAt(0) ?? "م"}
                </div>
                <div className={styles.rowInfo}>
                  <div className={styles.rowName}>
                    {s.membership?.person.name ?? "—"}
                  </div>
                  <div className={styles.rowSub}>
                    {s.governancePath?.name ?? "—"}
                  </div>
                  <div className={styles.rowMeaning}>
                    {subscriptionOutcome(s)}
                  </div>
                </div>
                <div
                  className={styles.rowStatus}
                  style={{ background: sc.bg, color: sc.color }}
                >
                  {sc.label}
                </div>
                <div className={styles.subscriptionCard}>
                  <div className={styles.subscriptionRelationship}>
                    {t("rowRelationship", {
                      wallet: walletName,
                      path: s.governancePath?.name ?? t("rowPathUnknown"),
                    })}
                  </div>
                  <div className={styles.subscriptionMetrics}>
                    <div>
                      <span>{t("rowWallet")}</span>
                      <strong>{walletName}</strong>
                    </div>
                    <div>
                      <span>{t("rowPathType")}</span>
                      <strong>{pathTypeText(s.governancePath?.type)}</strong>
                    </div>
                    <div>
                      <span>{t("rowObligation")}</span>
                      <strong>
                        {s.agreedAmount != null
                          ? `${new Intl.NumberFormat("ar-SA").format(
                              Number(s.agreedAmount),
                            )} ${t("sar")}`
                          : t("rowObligationByPolicy")}
                      </strong>
                    </div>
                    <div>
                      <span>{t("rowState")}</span>
                      <strong>{sc.label}</strong>
                    </div>
                  </div>
                  <div className={styles.subscriptionOutcome}>
                    <strong>{t("rowWhyTitle")}</strong>
                    <span>{subscriptionRightsText(s)}</span>
                  </div>
                  {rowPreferenceWarnings.length > 0 && (
                    <div className={styles.preferenceWarning}>
                      <strong>{t("prefsCurrentSubscriptionImpact")}</strong>
                      {rowPreferenceWarnings.map((warning) => (
                        <span key={warning}>{warning}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
