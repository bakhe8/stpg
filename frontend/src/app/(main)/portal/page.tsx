"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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

function getAttentionLabel(state: AttentionItem["state"]) {
  switch (state) {
    case "CONDITIONAL":
      return "مشروط";
    case "SUSPENDED":
      return "موقوف";
    case "ENTITY_SUSPENDED":
      return "الكيان معلّق";
    case "ENTITY_READ_ONLY":
      return "قراءة فقط";
    case "ENTITY_INACTIVE":
      return "كيان غير نشط";
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

function formatCurrency(amount: number) {
  return `${new Intl.NumberFormat("ar-SA").format(amount)} ر.س`;
}

function getSubscriptionStateText(state: Subscription["state"]) {
  switch (state) {
    case "ACTIVE":
      return "نشط";
    case "CONDITIONAL":
      return "مشارك بشرط";
    case "SUSPENDED":
      return "موقوف";
    case "SUPPORTER_ONLY":
      return "داعم فقط";
    case "EXITED":
      return "منسحب";
    case "INTERESTED":
      return "مهتم";
  }
}

function getPathTypeText(type?: string) {
  switch (type) {
    case "BOARD":
      return "قرار مجلس";
    case "COMMITTEE":
      return "قرار لجنة";
    case "PUBLIC_VOTE":
      return "تصويت عام";
    case "INDIVIDUAL_WITH_CAP":
      return "قرار فردي بسقف";
    case "DONATION_ONLY":
      return "تبرع فقط";
    case "EMERGENCY_FAST":
      return "طوارئ سريع ثم مراجعة";
    default:
      return "مسار حوكمة";
  }
}

function RelationshipSummary({ context }: { context: WalletContext }) {
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
        أنت مشترك في <strong>{context.wallet.name}</strong> عبر{" "}
        <strong>{context.path.name}</strong> داخل{" "}
        <strong>{context.entity.name}</strong>.
      </div>
      <div className={styles.relationshipGrid}>
        <div className={styles.relationshipItem}>
          <span className={styles.relationshipLabel}>حالتك</span>
          <strong>{getSubscriptionStateText(state)}</strong>
        </div>
        <div className={styles.relationshipItem}>
          <span className={styles.relationshipLabel}>المسار</span>
          <strong>{getPathTypeText(context.path.type)}</strong>
        </div>
        <div className={styles.relationshipItem}>
          <span className={styles.relationshipLabel}>التزامك</span>
          <strong>
            {amount > 0 ? formatCurrency(amount) : "حسب قرار المسار"}
          </strong>
        </div>
        <div className={styles.relationshipItem}>
          <span className={styles.relationshipLabel}>المستحق الآن</span>
          <strong>
            {dueAmount > 0 ? formatCurrency(dueAmount) : "لا يوجد"}
          </strong>
        </div>
      </div>
      <div className={styles.relationshipOutcome}>
        {state === "SUPPORTER_ONLY"
          ? "أنت داعم فقط في هذا المسار: مساهمتك تدعم المحفظة ولا تمنحك حق استفادة أو طلب صرف."
          : state === "CONDITIONAL"
            ? "مشاركتك مشروطة: تظهر لك الالتزامات، لكن حق الاستفادة والتصويت يبقى محدوداً حتى تصبح نشطاً."
            : overdueCount > 0
              ? `لديك ${overdueCount} مستحق متأخر؛ التأخر قد يؤثر على حق الاستفادة أو التصويت حسب سياسة المسار.`
              : activeRights > 0
                ? `يحق لك الاستفادة من ${activeRights} بند صرف في هذا المسار عند تحقق شروط الأهلية.`
                : "لا توجد بنود استفادة نشطة في هذا المسار حالياً."}
      </div>
    </div>
  );
}

// ── مكوّن: حالة الدفع في المحفظة ─────────────────────────────────────
function PaymentStatusSection({
  dues,
  records,
  pathName,
}: {
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
            أنت منتظم في هذا المسار
          </div>
          {dues.length > 0 && (
            <div className={styles.paymentCleanSub}>
              آخر دفعة مؤكَّدة · التالية في{" "}
              {new Date(
                dues[dues.length - 1]?.dueDate ?? "",
              ).toLocaleDateString("ar-SA")}
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
          title={`لماذا ظهرت هذه المستحقات؟${pathName ? ` — ${pathName}` : ""}`}
          summary="هذه المبالغ صدرت بناءً على شروط اشتراكك في هذا المسار. سداد كل فترة في موعدها يحافظ على حقوقك في الاستفادة من المحفظة."
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
                متأخرة جداً ({days} يوم) — {d.periodLabel}
              </span>
              <span className={styles.paymentCriticalNote}>
                قد يُوقَف اشتراكك إذا لم تُسوَّ هذه الدفعة
              </span>
              <span className={styles.paymentAmount}>
                {Number(d.amountDue).toLocaleString("ar-SA")} ر.س
              </span>
            </div>
            <Link
              href={`/finance?tab=payment&dueId=${d.id}`}
              className={`${styles.payBtn} ${styles.payBtnCritical}`}
            >
              ادفع فوراً
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
                فترة سماح ({days} {days === 1 ? "يوم" : "أيام"} من الاستحقاق) —{" "}
                {d.periodLabel}
              </span>
              <span className={styles.paymentAmount}>
                {Number(d.amountDue).toLocaleString("ar-SA")} ر.س
              </span>
            </div>
            <Link
              href={`/finance?tab=payment&dueId=${d.id}`}
              className={`${styles.payBtn} ${styles.payBtnSecondary}`}
            >
              ادفع
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
                متأخرة ({days} يوماً) — {d.periodLabel}
              </span>
              <span className={styles.paymentAmount}>
                {Number(d.amountDue).toLocaleString("ar-SA")} ر.س
              </span>
            </div>
            <Link
              href={`/finance?tab=payment&dueId=${d.id}`}
              className={styles.payBtn}
            >
              ادفع الآن
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
              مستحقة {new Date(d.dueDate).toLocaleDateString("ar-SA")} —{" "}
              {d.periodLabel}
            </span>
            <span className={styles.paymentAmount}>
              {Number(d.amountDue).toLocaleString("ar-SA")} ر.س
            </span>
          </div>
          <Link
            href={`/finance?tab=payment&dueId=${d.id}`}
            className={`${styles.payBtn} ${styles.payBtnSecondary}`}
          >
            ادفع
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
              إثبات دفع ينتظر التأكيد — {r.paymentDue?.periodLabel}
            </span>
            <span className={styles.paymentAmount}>
              {Number(r.amount).toLocaleString("ar-SA")} ر.س
            </span>
          </div>
          <span className={styles.waitingBadge}>قيد المراجعة</span>
        </div>
      ))}
    </div>
  );
}

// ── مكوّن: حقوقي في المحفظة ──────────────────────────────────────────
function RightsSection({
  rights,
  pathId,
  subscriptionState,
}: {
  rights: SpendingItem[];
  pathId: string;
  subscriptionState: Subscription["state"];
}) {
  const active = rights.filter((r) => r.isActive);

  if (subscriptionState === "SUPPORTER_ONLY") {
    return (
      <div className={styles.rightsSection}>
        <div className={styles.rightsBlocked}>
          <strong>لا توجد حقوق استفادة لهذا الاشتراك</strong>
          <span>
            هذا المسار مخصص للدعم فقط، لذلك لا يظهر زر طلب صرف ولا تدخل هذه
            المساهمة ضمن أهلية الاستفادة.
          </span>
        </div>
      </div>
    );
  }

  if (subscriptionState === "CONDITIONAL") {
    return (
      <div className={styles.rightsSection}>
        <div className={styles.rightsBlocked}>
          <strong>حقوقك لم تُفعّل بعد</strong>
          <span>
            مشاركتك ما زالت مشروطة. ستظهر بنود الاستفادة وطلبات الصرف بعد تفعيل
            الاشتراك من إدارة الكيان.
          </span>
        </div>
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <div className={styles.rightsSection}>
        <div className={styles.rightsBlocked}>
          <strong>لا توجد بنود استفادة نشطة</strong>
          <span>هذا المسار لا يتيح طلب صرف حالياً.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.rightsSection}>
      <div className={styles.rightsSectionTitle}>حقوقي في هذا المسار</div>
      <div className={styles.rightsGrid}>
        {active.map((item) => (
          <div key={item.id} className={styles.rightItem}>
            <div className={styles.rightName}>{item.name}</div>
            {item.maxAmountPerRequest && (
              <div className={styles.rightMeta}>
                سقف الطلب: {Number(item.maxAmountPerRequest).toLocaleString()}{" "}
                ر.س
              </div>
            )}
            {item.requiresCommitteeApproval && (
              <div className={styles.rightWarning}>يتطلب موافقة لجنة</div>
            )}
            <Link
              href={`/disbursement-requests?pathId=${pathId}`}
              className={styles.rightRequestBtn}
            >
              قدّم طلباً ←
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── الصفحة الرئيسية ───────────────────────────────────────────────────
export default function PortalPage() {
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

        // بناء خريطة الكيانات
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

        // اشتراكات تحتاج انتباه بسبب حالة الاشتراك أو حالة الكيان نفسه
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
        setError(
          e instanceof Error ? e.message : "حدث خطأ أثناء تحميل المحافظ",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
        <p>جاري تحميل محافظك...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>محافظي</h1>
        </header>
        <AccessReasonPanel reason="UNKNOWN" detail={error} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>محافظي</h1>
        <p className={styles.pageSubtitle}>التزاماتي وحقوقي في كل صندوق</p>
      </header>

      {attentionItems.length > 0 && (
        <div className={styles.attentionSection}>
          <div className={styles.attentionTitle}>⚠ اشتراكات تحتاج انتباه</div>
          {attentionItems.map((item, i) => (
            <div key={i} className={styles.attentionItem}>
              <span className={styles.attentionPath}>
                {item.entityName} › {item.walletName} › {item.pathName}
              </span>
              <span className={styles.stateBadge} data-state={item.state}>
                {getAttentionLabel(item.state)}
              </span>
            </div>
          ))}
        </div>
      )}

      {walletContexts.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🗂</div>
          <p className={styles.emptyTitle}>لا توجد اشتراكات فعّالة حالياً</p>
          {myEntities.length > 0 ? (
            <>
              <p className={styles.emptyHint}>
                أنت عضو في{" "}
                {myEntities.length > 1
                  ? `${myEntities.length} كيانات`
                  : `"${myEntities[0].name}"`}{" "}
                — ادخل على الكيان لتفعيل اشتراك في أحد مساراته.
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
              <p className={styles.emptyHint}>
                انضم إلى كيان أو أنشئ كياناً جديداً للبدء.
              </p>
              <Link href="/entities" className={styles.emptyLink}>
                استعرض الكيانات
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
                    ? "مؤسس"
                    : ctx.subscription.membership?.role === "ADMIN"
                      ? "مدير"
                      : ctx.subscription.membership?.role === "MEMBER"
                        ? "عضو"
                        : "مشارك"}
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
                    ? "✓ منتظم"
                    : ctx.subscription.state === "CONDITIONAL"
                      ? "⚠ مشروط"
                      : ctx.subscription.state === "SUSPENDED"
                        ? "موقوف"
                        : ctx.subscription.state === "SUPPORTER_ONLY"
                          ? "داعم"
                          : ctx.subscription.state === "EXITED"
                            ? "منسحب"
                            : ctx.subscription.state === "INTERESTED"
                              ? "مهتم"
                              : "—"}
                </span>
              </div>
              <RelationshipSummary context={ctx} />
              <PaymentStatusSection
                dues={ctx.dues}
                records={ctx.submittedRecords}
                pathName={ctx.path.name}
              />
              <RightsSection
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
