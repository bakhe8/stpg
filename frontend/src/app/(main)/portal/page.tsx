"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  getMyPaymentDues,
  getMyPaymentRecords,
  getSubscriptions,
  PaymentDue,
  PaymentRecord,
  Subscription,
} from "@/lib/api/subscriptions";
import { getPathSpendingItems, SpendingItem } from "@/lib/api/paths";
import { getEntities, Entity } from "@/lib/api/entities";
import {
  getEntityWallets,
  getWalletPaths,
  Wallet,
  GovernancePath,
} from "@/lib/api/wallets";
import { isReadableEntity } from "@/lib/access";
import styles from "./portal.module.css";
import RuleSummaryPanel from "@/components/Governance/RuleSummaryPanel";
import AccessReasonPanel from "@/components/shared/AccessReasonPanel";

// ── أنواع البيانات المجمّعة ──────────────────────────────────────────
interface WalletContext {
  entity: Entity;
  wallet: Wallet;
  path: GovernancePath;
  subscription: Subscription;
  dues: PaymentDue[];
  submittedRecords: PaymentRecord[];
  rights: SpendingItem[];
}

interface AttentionItem {
  entityName: string;
  walletName: string;
  pathName: string;
  state:
    | "CONDITIONAL"
    | "SUSPENDED"
    | "ENTITY_SUSPENDED"
    | "ENTITY_READ_ONLY"
    | "ENTITY_INACTIVE";
}

type PortalT = ReturnType<typeof useTranslations>;

function getAttentionLabel(t: PortalT, state: AttentionItem["state"]) {
  switch (state) {
    case "CONDITIONAL":
      return t("attentionConditional");
    case "SUSPENDED":
      return t("attentionSuspended");
    case "ENTITY_SUSPENDED":
      return t("attentionEntitySuspended");
    case "ENTITY_READ_ONLY":
      return t("attentionEntityReadOnly");
    case "ENTITY_INACTIVE":
      return t("attentionEntityInactive");
  }
}

function getAttentionState(
  subscription: Subscription,
  entity?: Entity,
): AttentionItem["state"] | null {
  if (entity?.isActive === false) return "ENTITY_INACTIVE";
  if (entity?.platformStatus === "SUSPENDED") return "ENTITY_SUSPENDED";
  if (entity?.platformStatus === "READ_ONLY") return "ENTITY_READ_ONLY";
  if (subscription.state === "CONDITIONAL") return "CONDITIONAL";
  if (subscription.state === "SUSPENDED") return "SUSPENDED";
  return null;
}

// ── مكوّن: ترويسة المحفظة السياقية ──────────────────────────────────
function WalletContextHeader({
  entityName,
  walletName,
  pathName,
}: {
  entityName: string;
  walletName: string;
  pathName: string;
}) {
  return (
    <div className={styles.walletHeader}>
      <div className={styles.walletHeaderMeta}>
        <span className={styles.walletEntityLabel}>{entityName}</span>
        <span className={styles.walletSep}>›</span>
        <span className={styles.walletName}>{walletName}</span>
        <span className={styles.walletSep}>›</span>
        <span className={styles.walletPathName}>{pathName}</span>
      </div>
    </div>
  );
}

// ── مساعد: عدد الأيام منذ تاريخ الاستحقاق ───────────────────────────
function daysPastDue(dueDate: string): number {
  return Math.floor((Date.now() - new Date(dueDate).getTime()) / 86_400_000);
}

function formatCurrency(t: PortalT, amount: number) {
  return t("amountSAR", { amount: new Intl.NumberFormat("ar-SA").format(amount) });
}

function getSubscriptionStateText(t: PortalT, state: Subscription["state"]) {
  switch (state) {
    case "ACTIVE":
      return t("subStateActive");
    case "CONDITIONAL":
      return t("subStateConditional");
    case "SUSPENDED":
      return t("subStateSuspended");
    case "SUPPORTER_ONLY":
      return t("subStateSupporterOnly");
    case "EXITED":
      return t("subStateExited");
    case "INTERESTED":
      return t("subStateInterested");
  }
}

function getPathTypeText(t: PortalT, type?: string) {
  switch (type) {
    case "BOARD":
      return t("pathTypeBoard");
    case "COMMITTEE":
      return t("pathTypeCommittee");
    case "PUBLIC_VOTE":
      return t("pathTypePublicVote");
    case "INDIVIDUAL_WITH_CAP":
      return t("pathTypeIndividualCap");
    case "DONATION_ONLY":
      return t("pathTypeDonationOnly");
    case "EMERGENCY_FAST":
      return t("pathTypeEmergencyFast");
    default:
      return t("pathTypeDefault");
  }
}

function RelationshipSummary({
  t,
  context,
}: {
  t: PortalT;
  context: WalletContext;
}) {
  const dueAmount = context.dues
    .filter((due) => due.status === "PENDING" || due.status === "OVERDUE")
    .reduce((sum, due) => sum + Number(due.amountDue), 0);
  const overdueCount = context.dues.filter(
    (due) => due.status === "OVERDUE",
  ).length;
  const activeRights = context.rights.filter((right) => right.isActive).length;
  const state = context.subscription.state;
  const amount = Number(context.subscription.agreedAmount ?? 0);

  return (
    <div className={styles.relationshipPanel}>
      <div className={styles.relationshipLine}>
        {t.rich("relationshipLine", {
          bold: (chunks) => <strong>{chunks}</strong>,
          wallet: context.wallet.name,
          path: context.path.name,
          entity: context.entity.name,
        })}
      </div>
      <div className={styles.relationshipGrid}>
        <div className={styles.relationshipItem}>
          <span className={styles.relationshipLabel}>{t("yourState")}</span>
          <strong>{getSubscriptionStateText(t, state)}</strong>
        </div>
        <div className={styles.relationshipItem}>
          <span className={styles.relationshipLabel}>{t("yourPath")}</span>
          <strong>{getPathTypeText(t, context.path.type)}</strong>
        </div>
        <div className={styles.relationshipItem}>
          <span className={styles.relationshipLabel}>
            {t("yourCommitment")}
          </span>
          <strong>
            {amount > 0 ? formatCurrency(t, amount) : t("perPathDecision")}
          </strong>
        </div>
        <div className={styles.relationshipItem}>
          <span className={styles.relationshipLabel}>{t("dueNow")}</span>
          <strong>
            {dueAmount > 0 ? formatCurrency(t, dueAmount) : t("noneDue")}
          </strong>
        </div>
      </div>
      <div className={styles.relationshipOutcome}>
        {state === "SUPPORTER_ONLY"
          ? t("outcomeSupporterOnly")
          : state === "CONDITIONAL"
            ? t("outcomeConditional")
            : overdueCount > 0
              ? t("outcomeOverdue", { count: overdueCount })
              : activeRights > 0
                ? t("outcomeRights", { count: activeRights })
                : t("outcomeNoRights")}
      </div>
    </div>
  );
}

// ── مكوّن: حالة الدفع في المحفظة ─────────────────────────────────────
function PaymentStatusSection({
  t,
  dues,
  records,
  pathName,
}: {
  t: PortalT;
  dues: PaymentDue[];
  records: PaymentRecord[];
  pathName?: string;
}) {
  const overdue = dues.filter((d) => d.status === "OVERDUE");
  const pending = dues.filter((d) => d.status === "PENDING");
  const submittedRecords = records.filter((r) => r.status === "SUBMITTED");

  // دورة حياة التأخر: فترة سماح (1–15 يوم) → متأخرة (15–30 يوم) → معلقة (30+ يوم)
  const graceOverdue = overdue.filter((d) => daysPastDue(d.dueDate) <= 15);
  const lateOverdue = overdue.filter(
    (d) => daysPastDue(d.dueDate) > 15 && daysPastDue(d.dueDate) <= 30,
  );
  const criticalOverdue = overdue.filter((d) => daysPastDue(d.dueDate) > 30);

  const allGood =
    overdue.length === 0 &&
    pending.length === 0 &&
    submittedRecords.length === 0;

  if (allGood) {
    return (
      <div className={styles.paymentClean}>
        <span className={styles.checkIcon}>✓</span>
        <div>
          <div className={styles.paymentCleanTitle}>
            {t("regularStatus")}
          </div>
          {dues.length > 0 && (
            <div className={styles.paymentCleanSub}>
              {t("lastConfirmed", {
                date: new Date(
                  dues[dues.length - 1]?.dueDate ?? "",
                ).toLocaleDateString("ar-SA"),
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.paymentSection}>
      {dues.length > 0 && (
        <RuleSummaryPanel
          title={`${t("ruleTitle")}${pathName ? ` — ${pathName}` : ""}`}
          summary={t("ruleDesc")}
          icon="ℹ"
        />
      )}

      {criticalOverdue.map((d) => {
        const days = daysPastDue(d.dueDate);
        return (
          <div
            key={d.id}
            className={`${styles.paymentRow} ${styles.paymentRowCritical}`}
          >
            <span className={styles.paymentIcon}>🚨</span>
            <div className={styles.paymentBody}>
              <span className={styles.paymentLabel}>
                {t("veryOverdue", { days, period: d.periodLabel })}
              </span>
              <span className={styles.paymentCriticalNote}>
                {t("suspensionWarning")}
              </span>
              <span className={styles.paymentAmount}>
                {t("amountSAR", {
                  amount: Number(d.amountDue).toLocaleString("ar-SA"),
                })}
              </span>
            </div>
            <Link
              href={`/finance?tab=payment&dueId=${d.id}`}
              className={`${styles.payBtn} ${styles.payBtnCritical}`}
            >
              {t("payNow")}
            </Link>
          </div>
        );
      })}

      {graceOverdue.map((d) => {
        const days = daysPastDue(d.dueDate);
        return (
          <div
            key={d.id}
            className={`${styles.paymentRow} ${styles.paymentRowGrace}`}
          >
            <span className={styles.paymentIcon}>⏰</span>
            <div className={styles.paymentBody}>
              <span className={styles.paymentLabel}>
                {t("graceOverdue", {
                  days,
                  dayUnit: days === 1 ? t("days") : t("daysAlt"),
                  period: d.periodLabel,
                })}
              </span>
              <span className={styles.paymentAmount}>
                {t("amountSAR", {
                  amount: Number(d.amountDue).toLocaleString("ar-SA"),
                })}
              </span>
            </div>
            <Link
              href={`/finance?tab=payment&dueId=${d.id}`}
              className={`${styles.payBtn} ${styles.payBtnSecondary}`}
            >
              {t("pay")}
            </Link>
          </div>
        );
      })}

      {lateOverdue.map((d) => {
        const days = daysPastDue(d.dueDate);
        return (
          <div
            key={d.id}
            className={`${styles.paymentRow} ${styles.paymentRowOverdue}`}
          >
            <span className={styles.paymentIcon}>⚠</span>
            <div className={styles.paymentBody}>
              <span className={styles.paymentLabel}>
                {t("overdue", { days, period: d.periodLabel })}
              </span>
              <span className={styles.paymentAmount}>
                {t("amountSAR", {
                  amount: Number(d.amountDue).toLocaleString("ar-SA"),
                })}
              </span>
            </div>
            <Link
              href={`/finance?tab=payment&dueId=${d.id}`}
              className={styles.payBtn}
            >
              {t("payNowAlt")}
            </Link>
          </div>
        );
      })}

      {pending.map((d) => (
        <div
          key={d.id}
          className={`${styles.paymentRow} ${styles.paymentRowPending}`}
        >
          <span className={styles.paymentIcon}>📅</span>
          <div className={styles.paymentBody}>
            <span className={styles.paymentLabel}>
              {t("dueOn", {
                date: new Date(d.dueDate).toLocaleDateString("ar-SA"),
                period: d.periodLabel,
              })}
            </span>
            <span className={styles.paymentAmount}>
              {t("amountSAR", {
                amount: Number(d.amountDue).toLocaleString("ar-SA"),
              })}
            </span>
          </div>
          <Link
            href={`/finance?tab=payment&dueId=${d.id}`}
            className={`${styles.payBtn} ${styles.payBtnSecondary}`}
          >
            {t("pay")}
          </Link>
        </div>
      ))}

      {submittedRecords.map((r) => (
        <div
          key={r.id}
          className={`${styles.paymentRow} ${styles.paymentRowWaiting}`}
        >
          <span className={styles.paymentIcon}>🕐</span>
          <div className={styles.paymentBody}>
            <span className={styles.paymentLabel}>
              {t("proofPending", { period: r.paymentDue?.periodLabel ?? "" })}
            </span>
            <span className={styles.paymentAmount}>
              {t("amountSAR", {
                amount: Number(r.amount).toLocaleString("ar-SA"),
              })}
            </span>
          </div>
          <span className={styles.waitingBadge}>{t("underReview")}</span>
        </div>
      ))}
    </div>
  );
}

// ── مكوّن: حقوقي في المحفظة ──────────────────────────────────────────
function RightsSection({
  t,
  rights,
  pathId,
  subscriptionState,
}: {
  t: PortalT;
  rights: SpendingItem[];
  pathId: string;
  subscriptionState: Subscription["state"];
}) {
  const active = rights.filter((r) => r.isActive);

  if (subscriptionState === "SUPPORTER_ONLY") {
    return (
      <div className={styles.rightsSection}>
        <div className={styles.rightsBlocked}>
          <strong>{t("rightsBlockedSupporterTitle")}</strong>
          <span>{t("rightsBlockedSupporterDesc")}</span>
        </div>
      </div>
    );
  }

  if (subscriptionState === "CONDITIONAL") {
    return (
      <div className={styles.rightsSection}>
        <div className={styles.rightsBlocked}>
          <strong>{t("rightsBlockedConditionalTitle")}</strong>
          <span>{t("rightsBlockedConditionalDesc")}</span>
        </div>
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <div className={styles.rightsSection}>
        <div className={styles.rightsBlocked}>
          <strong>{t("rightsBlockedNoneTitle")}</strong>
          <span>{t("rightsBlockedNoneDesc")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.rightsSection}>
      <div className={styles.rightsSectionTitle}>{t("myRights")}</div>
      <div className={styles.rightsGrid}>
        {active.map((item) => (
          <div key={item.id} className={styles.rightItem}>
            <div className={styles.rightName}>{item.name}</div>
            {item.maxAmountPerRequest && (
              <div className={styles.rightMeta}>
                {t("limitPerRequest", {
                  amount: Number(
                    item.maxAmountPerRequest,
                  ).toLocaleString(),
                })}
              </div>
            )}
            {item.requiresCommitteeApproval && (
              <div className={styles.rightWarning}>
                {t("committeeApproval")}
              </div>
            )}
            <Link
              href={`/disbursement-requests?pathId=${pathId}`}
              className={styles.rightRequestBtn}
            >
              {t("submitRequest")}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── الصفحة الرئيسية ───────────────────────────────────────────────────
export default function PortalPage() {
  const t = useTranslations("portal");
  const [walletContexts, setWalletContexts] = useState<WalletContext[]>([]);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [myEntities, setMyEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [entities, subscriptions, dues, records] = await Promise.all([
          getEntities(),
          getSubscriptions({}),
          getMyPaymentDues().catch(() => [] as PaymentDue[]),
          getMyPaymentRecords().catch(() => [] as PaymentRecord[]),
        ]);

    // بناء خريطة الصناديق
        const entityMap = new Map(entities.map((e) => [e.id, e]));

        // الاشتراكات التي يجب أن يرى العضو سياقها التشغيلي.
        const visibleSubs = subscriptions.filter((s) =>
          ["ACTIVE", "CONDITIONAL", "SUPPORTER_ONLY"].includes(s.state),
        );
        const readableActiveSubs = visibleSubs.filter((s) => {
          const entityId = s.membership?.entityId;
          const entity = entityId ? entityMap.get(entityId) : undefined;
          return entity ? isReadableEntity(entity) : false;
        });

    // اشتراكات تحتاج انتباه بسبب حالة الاشتراك أو حالة الصندوق نفسه
        const problemSubs = subscriptions.filter((s) => {
          const entityId = s.membership?.entityId;
          const entity = entityId ? entityMap.get(entityId) : undefined;
          return getAttentionState(s, entity) !== null;
        });

        // جلب المحافظ ومساراتها للاشتراكات الفعّالة
        const uniqueEntityIds = [
          ...new Set(
            readableActiveSubs
              .map((s) => s.membership?.entityId)
              .filter(Boolean) as string[],
          ),
        ];

        const walletsPerEntity = await Promise.all(
          uniqueEntityIds.map((eid) =>
            getEntityWallets(eid).catch(() => [] as Wallet[]),
          ),
        );
        const entityWalletMap = new Map(
          uniqueEntityIds.map((eid, i) => [eid, walletsPerEntity[i]]),
        );

        // بناء WalletContext لكل اشتراك فعّال
        const contexts: WalletContext[] = [];

        for (const sub of readableActiveSubs) {
          const entityId = sub.membership?.entityId;
          if (!entityId) continue;
          const entity = entityMap.get(entityId);
          if (!entity) continue;

          const wallets = entityWalletMap.get(entityId) ?? [];

          // ابحث عن المحفظة التي تحتوي هذا المسار
          let foundWallet: Wallet | undefined;
          let foundPath: GovernancePath | undefined;

          for (const wallet of wallets) {
            const paths = await getWalletPaths(wallet.id).catch(
              () => [] as GovernancePath[],
            );
            const path = paths.find((p) => p.id === sub.governancePathId);
            if (path) {
              foundWallet = wallet;
              foundPath = path;
              break;
            }
          }

          if (!foundWallet || !foundPath) continue;

          // دفعات هذا الاشتراك
          const subDues = dues.filter(
            (d) =>
              d.subscription?.membership?.entityId === entityId &&
              d.subscription?.governancePath?.id === sub.governancePathId,
          );
          const subRecords = records.filter(
            (r) =>
              r.subscription?.membership?.entityId === entityId &&
              r.subscription?.governancePath?.id === sub.governancePathId &&
              r.status === "SUBMITTED",
          );

          // بنود الصرف (حقوق)
          const rights = await getPathSpendingItems(sub.governancePathId).catch(
            () => [] as SpendingItem[],
          );

          contexts.push({
            entity,
            wallet: foundWallet,
            path: foundPath,
            subscription: sub,
            dues: subDues,
            submittedRecords: subRecords,
            rights,
          });
        }

        // اشتراكات تحتاج انتباه
        const attentions: AttentionItem[] = await Promise.all(
          problemSubs.map(async (s) => {
            const entityId = s.membership?.entityId ?? "";
            const entity = entityMap.get(entityId);
            const wallets = entityWalletMap.get(entityId) ?? [];
            const state = getAttentionState(s, entity);

            let walletName = "—";
            for (const w of wallets) {
              const paths = await getWalletPaths(w.id).catch(
                () => [] as GovernancePath[],
              );
              if (paths.find((p) => p.id === s.governancePathId)) {
                walletName = w.name;
                break;
              }
            }

            return {
              entityName: entity?.name ?? "—",
              walletName,
              pathName: s.governancePath?.name ?? "—",
              state: state ?? "SUSPENDED",
            };
          }),
        );

        setMyEntities(entities);
        setWalletContexts(contexts);
        setAttentionItems(attentions);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("genericLoadError"));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [t]);

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
        <p>{t("loadingWallets")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>{t("myWallets")}</h1>
        </header>
        <AccessReasonPanel reason="UNKNOWN" detail={error} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("myWallets")}</h1>
        <p className={styles.pageSubtitle}>{t("myWalletsDesc")}</p>
      </header>

      {attentionItems.length > 0 && (
        <div className={styles.attentionSection}>
          <div className={styles.attentionTitle}>{t("subsAttention")}</div>
          {attentionItems.map((item, i) => (
            <div key={i} className={styles.attentionItem}>
              <span className={styles.attentionPath}>
                {item.entityName} › {item.walletName} › {item.pathName}
              </span>
              <span className={styles.stateBadge} data-state={item.state}>
                {getAttentionLabel(t, item.state)}
              </span>
            </div>
          ))}
        </div>
      )}

      {walletContexts.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🗂</div>
          <p className={styles.emptyTitle}>{t("emptyTitle")}</p>
          {myEntities.length > 0 ? (
            <>
              <p className={styles.emptyHint}>
                {myEntities.length > 1
                  ? t("emptyHintMultiple", { count: myEntities.length })
                  : t("emptyHintSingle", { name: myEntities[0].name })}
              </p>
              <div className={styles.emptyEntityList}>
                {myEntities.map((e) => (
                  <Link
                    key={e.id}
                    href={`/entities/${e.id}`}
                    className={styles.emptyEntityCard}
                  >
                    <span className={styles.emptyEntityName}>{e.name}</span>
                    <span className={styles.emptyEntityArrow}>›</span>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className={styles.emptyHint}>{t("emptyHintNone")}</p>
              <Link href="/entities" className={styles.emptyLink}>
                {t("browseEntities")}
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className={styles.walletList}>
          {walletContexts.map((ctx, i) => (
            <div key={i} className={styles.walletCard}>
              <WalletContextHeader
                entityName={ctx.entity.name}
                walletName={ctx.wallet.name}
                pathName={ctx.path.name}
              />
              <div className={styles.membershipMeta}>
                <span className={styles.membershipRole}>
                  {ctx.subscription.membership?.role === "FOUNDER"
                    ? t("roleFounder")
                    : ctx.subscription.membership?.role === "ADMIN"
                      ? t("roleAdmin")
                      : ctx.subscription.membership?.role === "MEMBER"
                        ? t("roleMember")
                        : t("roleParticipant")}
                </span>
                <span className={styles.membershipSep}>·</span>
                <span
                  className={`${styles.membershipState} ${
                    ctx.subscription.state === "ACTIVE"
                      ? styles.stateActive
                      : styles.stateWarning
                  }`}
                >
                  {ctx.subscription.state === "ACTIVE"
                    ? t("stateActiveBadge")
                    : ctx.subscription.state === "CONDITIONAL"
                      ? t("badgeConditional")
                      : ctx.subscription.state === "SUSPENDED"
                        ? t("badgeSuspended")
                        : ctx.subscription.state === "SUPPORTER_ONLY"
                          ? t("badgeSupporter")
                          : ctx.subscription.state === "EXITED"
                            ? t("badgeExited")
                            : ctx.subscription.state === "INTERESTED"
                              ? t("badgeInterested")
                              : t("badgeUnknown")}
                </span>
              </div>
              <RelationshipSummary t={t} context={ctx} />
              <PaymentStatusSection
                t={t}
                dues={ctx.dues}
                records={ctx.submittedRecords}
                pathName={ctx.path.name}
              />
              <RightsSection
                t={t}
                rights={ctx.rights}
                pathId={ctx.path.id}
                subscriptionState={ctx.subscription.state}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
