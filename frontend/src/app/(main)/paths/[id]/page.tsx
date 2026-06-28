"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  getPath,
  getPathSpendingItems,
  createSpendingItem,
  GovernancePath,
  SpendingItem,
} from "../../../../lib/api/paths";
import { getEntity } from "../../../../lib/api/entities";
import {
  getSubscriptions,
  Subscription,
} from "../../../../lib/api/subscriptions";
import { getDecisions, Decision } from "../../../../lib/api/decisions";
import styles from "./path-detail.module.css";
import { DECISION_TYPE_KEYS } from "../../../../lib/enum-labels";
import RuleSummaryPanel from "../../../../components/Governance/RuleSummaryPanel";
import VisibilityNotice from "../../../../components/shared/VisibilityNotice";
import StatusBadge from "../../../../components/shared/StatusBadge";

function formatCurrency(n: number, currency = "SAR") {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency }).format(
    n,
  );
}

type Tab = "items" | "subscriptions" | "decisions";

export default function PathDetailPage() {
  const t = useTranslations("paths");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const { id } = useParams<{ id: string }>();
  const [path, setPath] = useState<GovernancePath | null>(null);
  const [items, setItems] = useState<SpendingItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [canManagePath, setCanManagePath] = useState(false);
  const [canViewSubscriptions, setCanViewSubscriptions] = useState(false);
  const [tab, setTab] = useState<Tab>("items");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    maxAmountPerRequest: "",
    maxAmountPerYear: "",
    requiresCommitteeApproval: false,
    privacyLevel: "PUBLIC_TO_MEMBERS",
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [pathResult, itemsResult, decisionsResult] = await Promise.allSettled([
        getPath(id),
        getPathSpendingItems(id),
        getDecisions(id),
      ]);

      if (cancelled) return;

      if (pathResult.status === "fulfilled") {
        const loadedPath = pathResult.value;
        setPath(loadedPath);

        const entityId = loadedPath.wallet?.entityId;
        const entity = entityId ? await getEntity(entityId).catch(() => null) : null;
        if (cancelled) return;

        const canManage = entity?.myRole === "FOUNDER" || entity?.myRole === "ADMIN";
        setCanManagePath(canManage);
        setCanViewSubscriptions(canManage);

        if (canManage) {
          const subs = await getSubscriptions({ pathId: id }).catch(() => []);
          if (!cancelled) setSubscriptions(subs);
        } else {
          setSubscriptions([]);
        }
      }

      if (itemsResult.status === "fulfilled") setItems(itemsResult.value);
      if (decisionsResult.status === "fulfilled") setDecisions(decisionsResult.value);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsg(null);
    try {
      await createSpendingItem(id, {
        name: form.name,
        description: form.description || undefined,
        maxAmountPerRequest: form.maxAmountPerRequest
          ? parseFloat(form.maxAmountPerRequest)
          : undefined,
        maxAmountPerYear: form.maxAmountPerYear
          ? parseFloat(form.maxAmountPerYear)
          : undefined,
        requiresCommitteeApproval: form.requiresCommitteeApproval,
        privacyLevel: form.privacyLevel,
      });
      setMsg(t('createSuccess'));
      setShowForm(false);
      setForm({
        name: "",
        description: "",
        maxAmountPerRequest: "",
        maxAmountPerYear: "",
        requiresCommitteeApproval: false,
        privacyLevel: "PUBLIC_TO_MEMBERS",
      });
      const its = await getPathSpendingItems(id);
      setItems(its);
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : tCommon('failed')}`);
    } finally {
      setCreating(false);
    }
  }

  if (loading)
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
      </div>
    );
  if (!path) return <div className={styles.errorBox}>{t('notFound')}</div>;

  const walletId = path.walletId ?? path.wallet?.id;
  const currency = path.currency;

  const totalBalance = items.reduce(
    (s, i) => s + (i.ledgerAccount?.balance ?? 0),
    0,
  );
  const activeSubs = canViewSubscriptions
    ? subscriptions.filter((s) => s.state === "ACTIVE").length
    : (path._count?.subscriptions ?? 0);
  const openDecs = decisions.filter((d) => d.status === "OPEN").length;

  const PRIVACY_LEVEL_MAP: Record<string, "PublicToMembers" | "VisibleToCommittee" | "HiddenSensitive"> = {
    PUBLIC_TO_MEMBERS: "PublicToMembers",
    VISIBLE_TO_COMMITTEE: "VisibleToCommittee",
    HIDDEN_SENSITIVE: "HiddenSensitive",
  };

  return (
    <div className={styles.page}>
      <Link
        href={walletId ? `/wallets/${walletId}` : "#"}
        className={styles.back}
      >
        {t("backToWallet")}
      </Link>

      {/* ── رأس المسار ── */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>◎</div>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{path.name}</h1>
          {path.description && <p className={styles.desc}>{path.description}</p>}
          <span className={styles.type}>{path.type}</span>
        </div>
        <span className={`${styles.statusBadge} ${path.isActive !== false ? styles.active : styles.inactive}`}>
          {path.isActive !== false ? t('active') : t('inactive')}
        </span>
      </div>

      {/* ── مؤشرات ── */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiValue}>{formatCurrency(totalBalance, currency)}</span>
          <span className={styles.kpiLabel}>{t('kpiBalance')}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiValue}>{activeSubs}</span>
          <span className={styles.kpiLabel}>{t('kpiActiveSubs')}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiValue}>{openDecs}</span>
          <span className={styles.kpiLabel}>{t('kpiOpenDecisions')}</span>
        </div>
      </div>

      {/* ── سياق الحوكمة ── */}
      <RuleSummaryPanel
        icon="⚖"
        summary={
          path.type === 'COMMITTEE'
            ? t('ruleCommittee')
            : path.type === 'INDIVIDUAL'
            ? t('ruleIndividual')
            : t('ruleGeneral')
        }
      />

      {msg && (
        <div
          className={`${styles.msg} ${msg.startsWith("⚠") ? styles.error : styles.success}`}
        >
          {msg}
        </div>
      )}

      {/* ── تبويبات ── */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'items' ? styles.tabActive : ''}`} onClick={() => setTab('items')}>
          {t('tabItems')} {items.length > 0 && `(${items.length})`}
        </button>
        {canViewSubscriptions && (
          <button className={`${styles.tab} ${tab === 'subscriptions' ? styles.tabActive : ''}`} onClick={() => setTab('subscriptions')}>
            {t('tabSubscriptions', { count: subscriptions.length })}
          </button>
        )}
        <button className={`${styles.tab} ${tab === 'decisions' ? styles.tabActive : ''}`} onClick={() => setTab('decisions')}>
          {t('tabDecisions', { count: openDecs })}
        </button>
      </div>

      {tab === "items" && (
        <>
          {canManagePath && (
            <div className={styles.tabHeader}>
              <button
                className={styles.addBtn}
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? t('cancelCreate') : t('newItem')}
              </button>
            </div>
          )}

          {canManagePath && showForm && (
            <div className={styles.formCard}>
              <h3 className={styles.formTitle}>{t('createItemTitle')}</h3>
              <form onSubmit={handleCreate} className={styles.form}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>{t('itemNameLabel')}</label>
                  <input
                    className={styles.input}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t('itemNamePlaceholder')}
                    required
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>{t('itemDescLabel')}</label>
                  <input
                    className={styles.input}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder={t('itemDescPlaceholder')}
                  />
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>{t('maxPerRequest')}</label>
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.maxAmountPerRequest}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          maxAmountPerRequest: e.target.value,
                        })
                      }
                      placeholder="0.00"
                      dir="ltr"
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>{t('maxPerYear')}</label>
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.maxAmountPerYear}
                      onChange={(e) =>
                        setForm({ ...form, maxAmountPerYear: e.target.value })
                      }
                      placeholder="0.00"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>{t('privacyLabel')}</label>
                    <select
                      className={styles.input}
                      value={form.privacyLevel}
                      onChange={(e) =>
                        setForm({ ...form, privacyLevel: e.target.value })
                      }
                    >
                      <option value="PUBLIC_TO_MEMBERS">{t('privacyMembers')}</option>
                      <option value="VISIBLE_TO_COMMITTEE">{t('privacyCommittee')}</option>
                      <option value="HIDDEN_SENSITIVE">{t('privacyHidden')}</option>
                    </select>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>{t('requiresCommitteeLabel')}</label>
                    <label className={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={form.requiresCommitteeApproval}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            requiresCommitteeApproval: e.target.checked,
                          })
                        }
                      />
                      <span>{tCommon('yes')}</span>
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={creating || !form.name}
                >
                  {creating ? t('creating') : t('createBtn')}
                </button>
              </form>
            </div>
          )}

          {items.length === 0 ? (
            <div className={styles.empty}>{t('noItems')}</div>
          ) : (
            <div className={styles.itemsGrid}>
              {items.map((item) => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemName}>{item.name}</div>
                  {item.description && (
                    <div className={styles.itemDesc}>{item.description}</div>
                  )}
                  {item.privacyLevel && PRIVACY_LEVEL_MAP[item.privacyLevel] && (
                    <VisibilityNotice level={PRIVACY_LEVEL_MAP[item.privacyLevel]!} compact />
                  )}
                  <div className={styles.itemStats}>
                    {item.ledgerAccount && (
                      <div className={styles.itemStat}>
                        <span className={styles.statLabel}>{t('balanceLabel')}</span>
                        <span className={styles.statVal}>
                          {formatCurrency(item.ledgerAccount.balance)}
                        </span>
                      </div>
                    )}
                    {item.maxAmountPerRequest && (
                      <div className={styles.itemStat}>
                        <span className={styles.statLabel}>{t('limitLabel')}</span>
                        <span className={styles.statVal}>
                          {formatCurrency(item.maxAmountPerRequest)}
                        </span>
                      </div>
                    )}
                    {item.maxAmountPerYear && (
                      <div className={styles.itemStat}>
                        <span className={styles.statLabel}>{t('maxPerYear')}</span>
                        <span className={styles.statVal}>
                          {formatCurrency(item.maxAmountPerYear)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={styles.itemTags}>
                    {item.requiresCommitteeApproval && (
                      <span className={styles.tag}>{t('requiresCommitteeTag')}</span>
                    )}
                    {item.allowsException && (
                      <span className={styles.tagGreen}>{t('allowsExceptionTag')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      
      {tab === "subscriptions" && (
        <div className={styles.list}>
          {subscriptions.length === 0 ? (
            <div className={styles.empty}>{t('noSubscriptions')}</div>
          ) : (
            subscriptions.map((s) => (
              <div key={s.id} className={styles.subRow}>
                <div className={styles.subAvatar}>
                  {s.membership?.person.name.charAt(0) ?? t("colNo")}
                </div>
                <div className={styles.subInfo}>
                  <div className={styles.subName}>
                    {s.membership?.person.name ?? "—"}
                  </div>
                  <div className={styles.subFreq}>
                    {s.governancePath?.type ?? "—"}
                  </div>
                </div>
                {s.agreedAmount != null && (
                  <div className={styles.subAmount}>
                    {formatCurrency(Number(s.agreedAmount))}
                  </div>
                )}
                <StatusBadge
                  status={s.state === "ACTIVE" ? "active" : s.state === "SUSPENDED" ? "suspended" : s.state === "INTERESTED" ? "pending" : "inactive"}
                  size="sm"
                />
              </div>
            ))
          )}
        </div>
      )}

      
      {tab === "decisions" && (
        <div className={styles.list}>
          {decisions.length === 0 ? (
            <div className={styles.empty}>{t('noDecisions')}</div>
          ) : (
            decisions.map((d) => (
              <div key={d.id} className={styles.decRow}>
                <div className={styles.decInfo}>
                  <div className={styles.decTitle}>{d.title}</div>
                  <div className={styles.decMeta}>
                    {DECISION_TYPE_KEYS[d.decisionType]
                      ? tEnums(DECISION_TYPE_KEYS[d.decisionType] as Parameters<typeof tEnums>[0])
                      : d.decisionType} ·{" "}
                    {new Date(d.createdAt).toLocaleDateString("ar-SA")}
                  </div>
                </div>
                <div
                  className={styles.decStatus}
                  style={{ color: d.status === "OPEN" ? "#f59e0b" : "var(--text-secondary)" }}
                >
                  {d.status === "OPEN" ? t('decisionOpen') : t('closed')}
                </div>
                <Link href="/decisions" className={styles.decLink}>
                  تصويت
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
