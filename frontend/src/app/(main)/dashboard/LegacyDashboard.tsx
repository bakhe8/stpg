"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getEntities, Entity } from "../../../lib/api/entities";
import {
  getMyPaymentDues,
  getMyPaymentRecords,
  getSubscriptions,
  PaymentDue,
  PaymentRecord,
  Subscription,
} from "../../../lib/api/subscriptions";
import {
  getMemberSubscriptionOverlaps,
  SubscriptionOverlap,
} from "../../../lib/api/analytics";
import {
  getMyMembershipApplications,
  MembershipApplication,
} from "../../../lib/api/membership-applications";
import type { Translator } from "../../../lib/i18n";
import { ENTITY_TYPE_KEYS } from "../../../lib/enum-labels";
import styles from "./dashboard.module.css";

// ── نوع موحّد لبند في قائمة المطلوبات ────────────────────────────────
interface ActionItem {
  id: string;
  priority: "urgent" | "normal";
  icon: string;
  title: string;
  subtitle: string;
  reason: string;
  impact: string;
  nextStep: string;
  href: string;
  ctaLabel: string;
}

interface SubscriptionSummary {
  active: number;
  conditional: number;
  supporterOnly: number;
  overdueAmount: number;
  entityCount: number;
}

function buildSubscriptionSummary(
  subscriptions: Subscription[],
  paymentDues: PaymentDue[],
): SubscriptionSummary {
  return {
    active: subscriptions.filter(
      (subscription) => subscription.state === "ACTIVE",
    ).length,
    conditional: subscriptions.filter(
      (subscription) => subscription.state === "CONDITIONAL",
    ).length,
    supporterOnly: subscriptions.filter(
      (subscription) => subscription.state === "SUPPORTER_ONLY",
    ).length,
    overdueAmount: paymentDues
      .filter((due) => due.status === "OVERDUE")
      .reduce((sum, due) => sum + Number(due.amountDue), 0),
    entityCount: new Set(
      subscriptions
        .map((subscription) => subscription.membership?.entityId)
        .filter(Boolean),
    ).size,
  };
}

function buildActionItems(
  paymentDues: PaymentDue[],
  paymentRecords: PaymentRecord[],
  membershipApplications: MembershipApplication[],
  t: Translator,
): ActionItem[] {
  const items: ActionItem[] = [];

  membershipApplications
    .filter((application) =>
      ["PENDING", "UNDER_REVIEW", "REJECTED"].includes(application.status),
    )
    .forEach((application) => {
      const rejected = application.status === "REJECTED";
      items.push({
        id: `membership-application-${application.id}`,
        priority: rejected ? "urgent" : "normal",
        icon: rejected ? "!" : "…",
        title: rejected
          ? t("rejectedMembershipTitle", {
              entityName: application.entity?.name ?? t("entityFallback"),
            })
          : t("pendingMembershipTitle", {
              entityName: application.entity?.name ?? t("entityFallback"),
            }),
        subtitle: rejected
          ? (application.reviewerNotes ??
            t("rejectedMembershipDefaultSubtitle"))
          : application.status === "UNDER_REVIEW"
            ? t("underReviewSubtitle")
            : t("pendingMembershipSubtitle"),
        reason: rejected
          ? t("membershipRejectedReason")
          : application.status === "UNDER_REVIEW"
            ? t("membershipUnderReviewReason")
            : t("membershipPendingReason"),
        impact: rejected
          ? t("membershipRejectedImpact")
          : t("membershipPendingImpact"),
        nextStep: rejected
          ? t("membershipRejectedNext")
          : t("membershipPendingNext"),
        href: rejected ? "/entities" : "/dashboard",
        ctaLabel: rejected ? t("viewOptions") : t("continue"),
      });
    });

  // الدفعات المتأخرة
  const overdue = paymentDues.filter((d) => d.status === "OVERDUE");
  overdue.forEach((d) => {
    items.push({
      id: `due-${d.id}`,
      priority: "urgent",
      icon: "⚠",
      title: t("overdueTitle", {
        pathName: d.subscription?.governancePath?.name ?? t("pathFallback"),
      }),
      subtitle: t("overdueSubtitle", {
        amount: d.amountDue.toLocaleString("ar-SA"),
        period: d.periodLabel,
      }),
      reason: t("overdueReason", {
        pathName: d.subscription?.governancePath?.name ?? t("pathFallback"),
      }),
      impact: t("overdueImpact"),
      nextStep: t("overdueNext"),
      href: "/portal",
      ctaLabel: t("payNow"),
    });
  });

  // الدفعات المستحقة (غير المتأخرة بعد)
  const pending = paymentDues.filter((d) => d.status === "PENDING");
  pending.forEach((d) => {
    items.push({
      id: `due-${d.id}`,
      priority: "normal",
      icon: "📅",
      title: t("pendingDueTitle", {
        pathName: d.subscription?.governancePath?.name ?? t("pathFallback"),
      }),
      subtitle: t("pendingDueSubtitle", {
        amount: d.amountDue.toLocaleString("ar-SA"),
        date: new Date(d.dueDate).toLocaleDateString("ar-SA"),
      }),
      reason: t("pendingDueReason", {
        pathName: d.subscription?.governancePath?.name ?? t("pathFallback"),
      }),
      impact: t("pendingDueImpact"),
      nextStep: t("pendingDueNext"),
      href: "/portal",
      ctaLabel: t("pay"),
    });
  });

  // إثباتات دفع أرسلتها وتنتظر تأكيد أمين الصندوق
  const submitted = paymentRecords.filter((r) => r.status === "SUBMITTED");
  submitted.forEach((r) => {
    items.push({
      id: `rec-${r.id}`,
      priority: "normal",
      icon: "🕐",
      title: t("proofPendingTitle", {
        pathName: r.subscription?.governancePath?.name ?? t("pathFallback"),
      }),
      subtitle: t("proofPendingSubtitle", {
        amount: r.amount.toLocaleString("ar-SA"),
        period: r.paymentDue?.periodLabel ?? "",
      }),
      reason: t("proofPendingReason"),
      impact: t("proofPendingImpact"),
      nextStep: t("proofPendingNext"),
      href: "/portal",
      ctaLabel: t("continue"),
    });
  });

  return items;
}

function ActionItemCard({
  item,
  urgent = false,
}: {
  item: ActionItem;
  urgent?: boolean;
}) {
  const t = useTranslations("dashboard");

  return (
    <Link
      href={item.href}
      className={`${styles.actionItem} ${urgent ? styles.actionItemUrgent : ""}`}
    >
      <span className={styles.actionIcon}>{item.icon}</span>
      <div className={styles.actionBody}>
        <div className={styles.actionTitle}>{item.title}</div>
        <div className={styles.actionSubtitle}>{item.subtitle}</div>
        <div className={styles.actionReasonGrid}>
          <span>
            <strong>{t("actionWhy")}</strong>
            {item.reason}
          </span>
          <span>
            <strong>{t("actionImpact")}</strong>
            {item.impact}
          </span>
          <span>
            <strong>{t("actionNext")}</strong>
            {item.nextStep}
          </span>
        </div>
      </div>
      <span className={styles.actionCta}>{item.ctaLabel}</span>
    </Link>
  );
}

// ── كرت الصندوق المبسّط (بدون analytics) ─────────────────────────────
function EntityCard({ entity }: { entity: Entity }) {
  const tEnums = useTranslations("enums");
  const tEntities = useTranslations("entities");

  const roleKey = entity.myRole
    ? `role${entity.myRole
        .toLowerCase()
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join("")}`
    : null;

  return (
    <Link href={`/entities/${entity.id}`} className={styles.entityCard}>
      <div className={styles.entityHeader}>
        <div className={styles.entityIcon}>⬡</div>
        <div className={styles.entityMeta}>
          <div className={styles.entityName}>{entity.name}</div>
          <div className={styles.entityType}>
            {ENTITY_TYPE_KEYS[entity.type]
              ? tEnums(
                  ENTITY_TYPE_KEYS[entity.type] as Parameters<typeof tEnums>[0],
                )
              : entity.type}
            {roleKey && (
              <span className={styles.roleBadge}>
                {tEntities(roleKey as Parameters<typeof tEntities>[0])}
              </span>
            )}
          </div>
        </div>
        <div
          className={`${styles.entityStatus} ${entity.isActive ? styles.entityStatusActive : styles.entityStatusInactive}`}
        >
          <span>
            {entity.isActive ? tEntities("active") : tEntities("inactive")}
          </span>
        </div>
      </div>
      <div className={styles.entityArrow}>›</div>
    </Link>
  );
}

// ── الصفحة الفارغة (أول دخول) ────────────────────────────────────────
function EmptyDashboard({ personName }: { personName: string }) {
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [inviteInput, setInviteInput] = useState("");

  function handleInviteGo() {
    const trimmed = inviteInput.trim();
    if (!trimmed) return;
    const match = trimmed.match(/\/join\/([a-f0-9-]{36})/i);
    const token = match ? match[1] : trimmed;
    void router.push(`/join/${token}`);
  }

  return (
    <div className={styles.emptyDashboard}>
      <div className={styles.emptyGreeting}>
        <span className={styles.emptyWave}>👋</span>
        <div>
          <h2 className={styles.emptyTitle}>
            {personName
              ? t("emptyGreetingWithName", { name: personName })
              : t("emptyGreeting")}
          </h2>
          <p className={styles.emptySubtitle}>{t("emptySubtitle")}</p>
        </div>
      </div>
      <div className={styles.emptyCards}>
        <div className={styles.emptyCard}>
          <div className={styles.emptyCardIcon}>◇</div>
          <h3 className={styles.emptyCardTitle}>{t("createEntity")}</h3>
          <p className={styles.emptyCardDesc}>{t("createEntityDesc")}</p>
          <Link href="/entities/new" className={styles.emptyCardBtn}>
            {t("startCreation")}
          </Link>
        </div>
        <div className={styles.emptyCard}>
          <div className={styles.emptyCardIcon}>🔗</div>
          <h3 className={styles.emptyCardTitle}>{t("haveInviteLink")}</h3>
          <p className={styles.emptyCardDesc}>{t("haveInviteLinkDesc")}</p>
          <div className={styles.inviteInputRow}>
            <input
              className={styles.inviteInput}
              placeholder={t("inviteLinkPlaceholder")}
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInviteGo()}
            />
            <button
              className={styles.inviteGoBtn}
              onClick={handleInviteGo}
              disabled={!inviteInput.trim()}
            >
              {t("join")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── الصفحة الرئيسية ───────────────────────────────────────────────────
export default function LegacyDashboardPage() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [overlaps, setOverlaps] = useState<SubscriptionOverlap | null>(null);
  const [suspendedSubs, setSuspendedSubs] = useState<Subscription[]>([]);
  const [subscriptionSummary, setSubscriptionSummary] =
    useState<SubscriptionSummary>({
      active: 0,
      conditional: 0,
      supporterOnly: 0,
      overdueAmount: 0,
      entityCount: 0,
    });
  const [showAllItems, setShowAllItems] = useState(false);
  const ACTION_PAGE_SIZE = 8;
  const [personName, setPersonName] = useState("");
  const [pendingApplications, setPendingApplications] = useState<
    MembershipApplication[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPersonName(localStorage.getItem("personName") ?? "");
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [entityList, dues, records, overlapData, applications, allSubs] =
          await Promise.all([
            getEntities(),
            getMyPaymentDues().catch(() => [] as PaymentDue[]),
            getMyPaymentRecords().catch(() => [] as PaymentRecord[]),
            getMemberSubscriptionOverlaps().catch(() => null),
            getMyMembershipApplications().catch(
              () => [] as MembershipApplication[],
            ),
            getSubscriptions({}).catch(() => [] as Subscription[]),
          ]);
        setEntities(entityList);
        setActionItems(buildActionItems(dues, records, applications, t));
        setOverlaps(overlapData);
        setSuspendedSubs(allSubs.filter((s) => s.state === "SUSPENDED"));
        setSubscriptionSummary(buildSubscriptionSummary(allSubs, dues));
        setPendingApplications(
          applications.filter(
            (a) => a.status === "PENDING" || a.status === "UNDER_REVIEW",
          ),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : t("generalError"));
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
        <p>{tCommon("loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centered}>
        <p className={styles.errorText}>⚠ {error}</p>
      </div>
    );
  }

  if (entities.length === 0 && actionItems.length === 0) {
    return (
      <div className={styles.page}>
        <EmptyDashboard personName={personName} />
      </div>
    );
  }

  const urgentItems = actionItems.filter((i) => i.priority === "urgent");
  const normalItems = actionItems.filter((i) => i.priority === "normal");
  const visibleNormalItems = showAllItems
    ? normalItems
    : normalItems.slice(0, Math.max(0, ACTION_PAGE_SIZE - urgentItems.length));
  const hiddenCount = normalItems.length - visibleNormalItems.length;

  return (
    <div className={styles.page}>
      <section className={styles.intro}>
        <div>
          <span className={styles.introEyebrow}>{t("personalWorkspace")}</span>
          <h1>
            {personName
              ? t("welcomeName", { name: personName })
              : t("myOverview")}
          </h1>
        </div>
      </section>

      {suspendedSubs.length > 0 && (
        <div className={styles.suspendedBanner}>
          <span className={styles.overlapIcon}>🔒</span>
          <div>
            <strong>
              اشتراكاتك معلّقة في{" "}
              {suspendedSubs.length > 1
                ? `${suspendedSubs.length} مسارات`
                : `مسار "${suspendedSubs[0]?.governancePath?.name ?? ""}"`}
            </strong>
            <p className={styles.suspendedBannerNote}>
              لا يمكنك الاستفادة من هذه المسارات حتى تُعاد تفعيل اشتراكاتك.
              تواصل مع إدارة الصندوق.
            </p>
          </div>
          <Link href="/portal" className={styles.overlapLink}>
            عرض الاشتراكات
          </Link>
        </div>
      )}

      {overlaps?.hasOverlaps && (
        <div className={styles.overlapBanner}>
          <span className={styles.overlapIcon}>⚠</span>
          <div>
            <strong>{t("overlapTitle")}</strong>{" "}
            <Link href="/subscriptions" className={styles.overlapLink}>
              {t("overlapLink")}
            </Link>
          </div>
        </div>
      )}

      <section className={styles.relationshipSummary}>
        <div className={styles.relationshipSummaryText}>
          <span className={styles.relationshipSummaryEyebrow}>
            عضويتك التشغيلية
          </span>
          <strong>
            تظهر لك الالتزامات والحقوق حسب الصندوق والمحفظة والمسار وحالة
            الاشتراك.
          </strong>
        </div>
        <div className={styles.relationshipSummaryGrid}>
          <Link href="/portal" className={styles.relationshipSummaryItem}>
            <span>اشتراكات نشطة</span>
            <strong>{subscriptionSummary.active}</strong>
          </Link>
          <Link
            href="/subscriptions"
            className={styles.relationshipSummaryItem}
          >
            <span>مشاركات مشروطة</span>
            <strong>{subscriptionSummary.conditional}</strong>
          </Link>
          <Link
            href="/subscriptions"
            className={styles.relationshipSummaryItem}
          >
            <span>داعم فقط</span>
            <strong>{subscriptionSummary.supporterOnly}</strong>
          </Link>
          <Link href="/portal" className={styles.relationshipSummaryItem}>
            <span>متأخرات حالية</span>
            <strong>
              {new Intl.NumberFormat("ar-SA").format(
                subscriptionSummary.overdueAmount,
              )}{" "}
              ر.س
            </strong>
          </Link>
        </div>
        {subscriptionSummary.supporterOnly > 0 && (
          <div className={styles.supporterOnlyNote}>
            لديك {subscriptionSummary.supporterOnly} اشتراك داعم فقط: تساهم
            في الرصيد ولا تملك حق استفادة أو طلب صرف في هذه المسارات.
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>{t("actionItemsTitle")}</h2>
            <p className={styles.sectionHint}>{t("actionItemsHint")}</p>
          </div>
          {actionItems.length > 0 && (
            <span className={styles.actionCount}>{actionItems.length}</span>
          )}
        </div>

        {actionItems.length === 0 ? (
          <div className={styles.actionEmpty}>
            <span className={styles.actionEmptyIcon}>✓</span>
            <p>{t("actionItemsEmpty")}</p>
          </div>
        ) : (
          <div className={styles.actionList}>
            {urgentItems.length > 0 && (
              <div className={styles.actionGroupLabel}>
                <span>{t("actionGroupUrgent")}</span>
                <strong>{urgentItems.length}</strong>
              </div>
            )}
            {urgentItems.map((item) => (
              <ActionItemCard key={item.id} item={item} urgent />
            ))}
            {visibleNormalItems.length > 0 && (
              <div className={styles.actionGroupLabel}>
                <span>{t("actionGroupNormal")}</span>
                <strong>{normalItems.length}</strong>
              </div>
            )}
            {visibleNormalItems.map((item) => (
              <ActionItemCard key={item.id} item={item} />
            ))}
            {hiddenCount > 0 && (
              <button
                className={styles.showMoreBtn}
                onClick={() => setShowAllItems(true)}
              >
                {t("showMoreItems", { count: hiddenCount })}
              </button>
            )}
            {showAllItems && normalItems.length > ACTION_PAGE_SIZE && (
              <button
                className={styles.showMoreBtn}
                onClick={() => setShowAllItems(false)}
              >
                {t("showLessItems")}
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── رحلة الانضمام — للطلبات المعلقة ── */}
      {pendingApplications.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t("joinJourneyTitle")}</h2>
          </div>
          <div className={styles.joinJourneyList}>
            {pendingApplications.map((app) => {
              const isUnderReview = app.status === "UNDER_REVIEW";
              return (
                <div key={app.id} className={styles.joinJourneyCard}>
                  <div className={styles.joinJourneyEntity}>
                    {app.entity?.name ?? t("entityFallback")}
                  </div>
                  <div className={styles.joinTimeline}>
                    <div
                      className={`${styles.joinStep} ${styles.joinStepDone}`}
                    >
                      <span className={styles.joinStepDot} />
                      <span className={styles.joinStepLabel}>
                        {t("joinStepSubmitted")}
                      </span>
                      <span className={styles.joinStepDate}>
                        {new Date(app.submittedAt).toLocaleDateString("ar-SA")}
                      </span>
                    </div>
                    <div
                      className={`${styles.joinStep} ${isUnderReview ? styles.joinStepActive : styles.joinStepPending}`}
                    >
                      <span className={styles.joinStepDot} />
                      <span className={styles.joinStepLabel}>
                        {t("joinStepReview")}
                      </span>
                      {isUnderReview && (
                        <span className={styles.joinStepBadge}>
                          {t("joinStatusUnderReview")}
                        </span>
                      )}
                    </div>
                    <div className={styles.joinStepPending}>
                      <span
                        className={`${styles.joinStep} ${styles.joinStepLast}`}
                      />
                      <span className={styles.joinStepLabel}>
                        {t("joinStepActive")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {entities.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t("entitiesTitle")}</h2>
            <Link href="/entities" className={styles.seeAll}>
              {t("viewAll")}
            </Link>
          </div>
          <div className={styles.entityGrid}>
            {entities.map((e) => (
              <EntityCard key={e.id} entity={e} />
            ))}
          </div>
        </section>
      )}

      {/* ── بطاقة توجيه المستفيد ── */}
      {entities.some((e) => e.myRole === "BENEFICIARY") && (
        <section className={styles.section}>
          <div className={styles.beneficiaryCard}>
            <div className={styles.beneficiaryIcon}>🎁</div>
            <div className={styles.beneficiaryBody}>
              <div className={styles.beneficiaryTitle}>
                أنت مستفيد في{" "}
                {entities.filter((e) => e.myRole === "BENEFICIARY").length > 1
                  ? `${entities.filter((e) => e.myRole === "BENEFICIARY").length} صناديق`
                  : `"${entities.find((e) => e.myRole === "BENEFICIARY")?.name ?? ""}"`}
              </div>
              <div className={styles.beneficiaryDesc}>
                يمكنك تقديم طلبات صرف والاطلاع على حقوقك في المحافظ المخصصة لك.
              </div>
            </div>
            <div className={styles.beneficiaryActions}>
              <Link href="/portal" className={styles.beneficiaryBtn}>
                محافظي وحقوقي
              </Link>
              <Link
                href="/disbursement-requests"
                className={styles.beneficiaryBtnSecondary}
              >
                طلبات صرف
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── وصول سريع — دائماً في الأسفل ── */}
      <section className={styles.quickSection}>
        <div className={styles.quickGrid}>
          <Link href="/finance" className={styles.quickItem}>
            <span className={styles.quickIcon}>◫</span>
            <span className={styles.quickLabel}>{t("quickFinance")}</span>
          </Link>
          <Link href="/subscriptions" className={styles.quickItem}>
            <span className={styles.quickIcon}>≋</span>
            <span className={styles.quickLabel}>{t("quickSubscriptions")}</span>
          </Link>
          <Link href="/decisions" className={styles.quickItem}>
            <span className={styles.quickIcon}>✓</span>
            <span className={styles.quickLabel}>{t("quickDecisions")}</span>
          </Link>
          <Link href="/disputes" className={styles.quickItem}>
            <span className={styles.quickIcon}>↔</span>
            <span className={styles.quickLabel}>{t("quickDisputes")}</span>
          </Link>
          <Link href="/documents" className={styles.quickItem}>
            <span className={styles.quickIcon}>▤</span>
            <span className={styles.quickLabel}>{t("quickDocuments")}</span>
          </Link>
          <Link href="/notifications" className={styles.quickItem}>
            <span className={styles.quickIcon}>◌</span>
            <span className={styles.quickLabel}>{t("quickNotifications")}</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
