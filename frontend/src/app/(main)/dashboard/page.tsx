"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  AdvancedToolLink,
  BlockedCapability,
  ContextSurfaceSummary,
  getMyWorkSurface,
  SurfaceAction,
  SurfaceException,
  SurfaceUpdate,
  WorkSurface,
} from "../../../lib/api/work-surface";
import styles from "./dashboard.module.css";

function priorityLabel(priority: string) {
  if (priority === "critical" || priority === "urgent") return "مهم الآن";
  if (priority === "normal") return "مطلوب";
  return "للمتابعة";
}

function ActionCard({ action }: { action: SurfaceAction }) {
  return (
    <article
      className={`${styles.surfaceCard} ${styles[`surfacePriority_${action.priority}`] ?? ""}`}
    >
      <div className={styles.surfaceCardHeader}>
        <span className={styles.surfaceBadge}>
          {priorityLabel(action.priority)}
        </span>
        {action.contextLabel ? (
          <span className={styles.surfaceContext}>{action.contextLabel}</span>
        ) : null}
      </div>
      <h3 className={styles.surfaceCardTitle}>{action.title}</h3>
      <p className={styles.surfaceCardBody}>{action.body}</p>
      {action.reason ? (
        <p className={styles.surfaceReason}>{action.reason}</p>
      ) : null}
      {action.expectedAfterAction ? (
        <p className={styles.surfaceExpected}>{action.expectedAfterAction}</p>
      ) : null}
      <Link href={action.cta.href} className={styles.surfacePrimaryLink}>
        {action.cta.label}
      </Link>
    </article>
  );
}

function ExceptionCard({ item }: { item: SurfaceException }) {
  return (
    <article
      className={`${styles.surfaceCard} ${styles[`surfacePriority_${item.severity}`] ?? ""}`}
    >
      <div className={styles.surfaceCardHeader}>
        <span className={styles.surfaceBadge}>
          {priorityLabel(item.severity)}
        </span>
        <span className={styles.surfaceContext}>
          {exceptionRoleLabel(item.ownerRole)}
        </span>
      </div>
      {item.contextLabel ? (
        <div className={styles.surfaceExceptionMeta}>
          <span>{item.contextLabel}</span>
        </div>
      ) : null}
      <h3 className={styles.surfaceCardTitle}>{item.title}</h3>
      <p className={styles.surfaceCardBody}>{item.body}</p>
      <p className={styles.surfaceImpact}>{item.impact}</p>
      <p className={styles.surfaceReason}>{item.whyShown}</p>
      {item.expectedAfterAction ? (
        <p className={styles.surfaceExpected}>{item.expectedAfterAction}</p>
      ) : null}
      <Link href={item.cta.href} className={styles.surfacePrimaryLink}>
        {item.cta.label}
      </Link>
    </article>
  );
}

function QuietUpdate({ update }: { update: SurfaceUpdate }) {
  const content = (
    <>
      <div>
        <strong>{update.title}</strong>
        <p>{update.body}</p>
      </div>
      {update.contextLabel ? <span>{update.contextLabel}</span> : null}
    </>
  );

  if (update.href) {
    return (
      <Link href={update.href} className={styles.surfaceUpdate}>
        {content}
      </Link>
    );
  }

  return <div className={styles.surfaceUpdate}>{content}</div>;
}

function BlockedItem({ item }: { item: BlockedCapability }) {
  return (
    <article className={styles.surfaceBlockedItem}>
      <div>
        <strong>{item.title}</strong>
        <p>{item.reason}</p>
        {item.contextLabel ? (
          <span className={styles.surfaceContextLine}>{item.contextLabel}</span>
        ) : null}
      </div>
      {item.fixCta ? (
        <Link href={item.fixCta.href} className={styles.surfaceInlineLink}>
          {item.fixCta.label}
        </Link>
      ) : null}
    </article>
  );
}

function AdvancedTool({ tool }: { tool: AdvancedToolLink }) {
  return (
    <Link href={tool.href} className={styles.surfaceTool}>
      <strong>{tool.label}</strong>
      <span>{tool.reason}</span>
    </Link>
  );
}

function ContextSummaryCard({ item }: { item: ContextSurfaceSummary }) {
  return (
    <article className={styles.surfaceContextCard}>
      <div className={styles.surfaceContextCardHeader}>
        <div>
          <strong>{item.label}</strong>
          <span>{contextKindLabel(item.kind)}</span>
        </div>
        <span className={styles.surfaceContextStatus}>{item.stateLabel}</span>
      </div>
      <div className={styles.surfaceContextStats}>
        <div>
          <span>المال</span>
          <strong>{item.moneyText}</strong>
        </div>
        <div>
          <span>الاستفادة</span>
          <strong>{item.benefitText}</strong>
        </div>
        <div>
          <span>ما يهمك</span>
          <strong>{item.attentionText ?? "لا يوجد تنبيه"}</strong>
        </div>
      </div>
    </article>
  );
}

function FinanceSummaryPanel({
  summary,
}: {
  summary: WorkSurface["financeSummary"];
}) {
  const metrics = [
    {
      label: "دفعات تنتظر المطابقة",
      value: summary.pendingPaymentCount.toLocaleString("ar-SA"),
      subValue: formatMoney(summary.pendingPaymentAmount),
    },
    {
      label: "متأخرات",
      value: summary.overdueDueCount.toLocaleString("ar-SA"),
      subValue: formatMoney(summary.overdueDueAmount),
    },
    {
      label: "صرف معتمد",
      value: summary.approvedDisbursementCount.toLocaleString("ar-SA"),
      subValue: formatMoney(summary.approvedDisbursementAmount),
    },
    {
      label: "مانع رصيد",
      value: summary.blockedDisbursementCount.toLocaleString("ar-SA"),
      subValue: formatMoney(summary.blockedDisbursementAmount),
    },
    {
      label: "الرصيد المتاح",
      value: formatMoney(summary.availableBalance),
      subValue: `${summary.entityCount.toLocaleString("ar-SA")} صندوق`,
    },
  ];

  return (
    <section className={styles.surfaceFinancePanel}>
      <div className={styles.surfaceSectionHeader}>
        <div>
          <h2>المال الذي يحتاجك الآن</h2>
          <p>مطابقة وتنفيذ وتفسير، بدون فتح الدفتر الخام.</p>
        </div>
        <span className={styles.surfaceCount}>
          {summary.entityCount.toLocaleString("ar-SA")}
        </span>
      </div>

      <p className={styles.surfaceFinanceLead}>{summary.displayText}</p>

      <div className={styles.surfaceFinanceMetrics}>
        {metrics.map((metric) => (
          <div key={metric.label} className={styles.surfaceFinanceMetric}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.subValue}</small>
          </div>
        ))}
      </div>

      <div className={styles.surfaceFinanceInsights}>
        {summary.insights.map((item) => (
          <article
            key={item.id}
            className={`${styles.surfaceFinanceInsight} ${
              styles[`surfacePriority_${item.severity}`] ?? ""
            }`}
          >
            <div className={styles.surfaceCardHeader}>
              <span className={styles.surfaceBadge}>
                {priorityLabel(item.severity)}
              </span>
              {item.contextLabel ? (
                <span className={styles.surfaceContext}>
                  {item.contextLabel}
                </span>
              ) : null}
            </div>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            {typeof item.amount === "number" ? (
              <strong className={styles.surfaceFinanceAmount}>
                {formatMoney(item.amount)}
              </strong>
            ) : null}
            {item.cta ? (
              <Link href={item.cta.href} className={styles.surfaceInlineLink}>
                {item.cta.label}
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function CommitteeSummaryPanel({
  summary,
}: {
  summary: WorkSurface["committeeSummary"];
}) {
  return (
    <section className={styles.surfaceCommitteePanel}>
      <div className={styles.surfaceSectionHeader}>
        <div>
          <h2>أعمال اللجنة التي تخصك</h2>
          <p>تظهر هنا القرارات التي تحتاج رأيك فقط، لا كل الحوكمة.</p>
        </div>
        <span className={styles.surfaceCount}>
          {summary.pendingVoteCount.toLocaleString("ar-SA")}
        </span>
      </div>

      <div className={styles.surfaceCommitteeLead}>
        <p>{summary.displayText}</p>
        <div>
          <span>لجانك</span>
          <strong>{summary.committeeCount.toLocaleString("ar-SA")}</strong>
        </div>
        <div>
          <span>صوّت عليها</span>
          <strong>{summary.alreadyVotedCount.toLocaleString("ar-SA")}</strong>
        </div>
      </div>

      {summary.decisions.length > 0 ? (
        <div className={styles.surfaceCommitteeList}>
          {summary.decisions.map((decision) => (
            <article
              key={decision.id}
              className={`${styles.surfaceCommitteeItem} ${
                decision.hasVoted ? styles.surfaceCommitteeItemDone : ""
              }`}
            >
              <div className={styles.surfaceCardHeader}>
                <span className={styles.surfaceBadge}>
                  {decision.hasVoted ? "صوتك محفوظ" : "ينتظر رأيك"}
                </span>
                <span className={styles.surfaceContext}>
                  {decision.contextLabel}
                </span>
              </div>
              <h3>{decision.title}</h3>
              <p>{decision.body}</p>
              <dl className={styles.surfaceCommitteeFacts}>
                <div>
                  <dt>اللجنة</dt>
                  <dd>{decision.committeeName}</dd>
                </div>
                <div>
                  <dt>نوع القرار</dt>
                  <dd>{decision.decisionTypeLabel}</dd>
                </div>
                <div>
                  <dt>الموعد</dt>
                  <dd>{formatDate(decision.closesAt)}</dd>
                </div>
                <div>
                  <dt>الأصوات</dt>
                  <dd>
                    {decision.voteCount.toLocaleString("ar-SA")} /{" "}
                    {decision.eligibleVoterCount.toLocaleString("ar-SA")}
                  </dd>
                </div>
              </dl>
              {decision.voteChoice ? (
                <p className={styles.surfaceCommitteeVote}>
                  صوتك: {voteChoiceLabel(decision.voteChoice)}
                </p>
              ) : null}
              <p className={styles.surfaceReason}>{decision.whyShown}</p>
              <p className={styles.surfaceExpected}>
                {decision.expectedAfterVote}
              </p>
              <Link href={decision.cta.href} className={styles.surfacePrimaryLink}>
                {decision.cta.label}
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.surfaceDone}>
          لا توجد قرارات لجنة تحتاج منك إجراء الآن.
        </div>
      )}
    </section>
  );
}

function AuditorSummaryPanel({
  summary,
}: {
  summary: WorkSurface["auditorSummary"];
}) {
  const metrics = [
    {
      label: "أحداث مهمة",
      value: summary.highRiskCount.toLocaleString("ar-SA"),
    },
    {
      label: "أحداث مالية",
      value: summary.financeEventCount.toLocaleString("ar-SA"),
    },
    {
      label: "أحداث حوكمة",
      value: summary.governanceEventCount.toLocaleString("ar-SA"),
    },
    {
      label: "أحداث عضوية",
      value: summary.membershipEventCount.toLocaleString("ar-SA"),
    },
  ];

  return (
    <section className={styles.surfaceAuditorPanel}>
      <div className={styles.surfaceSectionHeader}>
        <div>
          <h2>ما يحتاجه المدقق الآن</h2>
          <p>Timeline رقابي مختصر: من فعل ماذا، وما الأثر، وما الذي تغير.</p>
        </div>
        <span className={styles.surfaceCount}>
          {summary.eventCount.toLocaleString("ar-SA")}
        </span>
      </div>

      <div className={styles.surfaceAuditorLead}>
        <p>{summary.displayText}</p>
        {metrics.map((metric) => (
          <div key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>

      {summary.timeline.length > 0 ? (
        <div className={styles.surfaceAuditorTimeline}>
          {summary.timeline.map((event) => (
            <article
              key={event.id}
              className={`${styles.surfaceAuditorEvent} ${
                styles[`surfacePriority_${event.severity}`] ?? ""
              }`}
            >
              <div className={styles.surfaceCardHeader}>
                <span className={styles.surfaceBadge}>
                  {event.severityLabel}
                </span>
                <span className={styles.surfaceContext}>
                  {event.contextLabel}
                </span>
              </div>
              <h3>{event.title}</h3>
              <div className={styles.surfaceAuditorMeta}>
                <span>{event.actorName}</span>
                <span>{formatDate(event.occurredAt)}</span>
                <span>{auditorCategoryLabel(event.category)}</span>
              </div>
              <p className={styles.surfaceExpected}>{event.effect}</p>

              {event.changes.length > 0 ? (
                <dl className={styles.surfaceAuditorChanges}>
                  {event.changes.slice(0, 3).map((change) => (
                    <div key={change.field}>
                      <dt>{change.label}</dt>
                      <dd>
                        <span>{change.before}</span>
                        <strong>{change.after}</strong>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {event.linkedRecords.length > 0 ? (
                <div className={styles.surfaceAuditorLinks}>
                  {event.linkedRecords.slice(0, 4).map((record) =>
                    record.href ? (
                      <Link
                        key={`${event.id}-${record.type}-${record.id}`}
                        href={record.href}
                      >
                        {record.label} {record.shortId}
                      </Link>
                    ) : (
                      <span key={`${event.id}-${record.type}-${record.id}`}>
                        {record.label} {record.shortId}
                      </span>
                    ),
                  )}
                </div>
              ) : null}

              <p className={styles.surfaceReason}>{event.whyShown}</p>
              <Link href={event.cta.href} className={styles.surfaceInlineLink}>
                {event.cta.label}
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.surfaceDone}>
          لا توجد أحداث تدقيق تحتاج مراجعة الآن.
        </div>
      )}

      <Link href={summary.cta.href} className={styles.surfacePrimaryLink}>
        {summary.cta.label}
      </Link>
    </section>
  );
}

function NonOperationalSummaryPanel({
  summary,
}: {
  summary: WorkSurface["nonOperationalSummary"];
}) {
  const metrics = [
    {
      label: "موقوف",
      value: summary.suspendedCount.toLocaleString("ar-SA"),
    },
    {
      label: "قيد المراجعة",
      value: summary.pendingReviewCount.toLocaleString("ar-SA"),
    },
    {
      label: "متابعة فقط",
      value: summary.readOnlyCount.toLocaleString("ar-SA"),
    },
  ];

  return (
    <section className={styles.surfaceNonOperationalPanel}>
      <div className={styles.surfaceSectionHeader}>
        <div>
          <h2>حالة التشغيل</h2>
          <p>
            هذه الصناديق لا تعمل كصناديق عادية الآن، لذلك أخفى النظام إجراءات
            الدفع والصرف والقرارات غير المناسبة.
          </p>
        </div>
        <span className={styles.surfaceCount}>
          {summary.items.length.toLocaleString("ar-SA")}
        </span>
      </div>

      <div className={styles.surfaceNonOperationalLead}>
        <p>{summary.displayText}</p>
        {metrics.map((metric) => (
          <div key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>

      <div className={styles.surfaceNonOperationalList}>
        {summary.items.map((item) => (
          <article
            key={item.id}
            className={`${styles.surfaceNonOperationalItem} ${
              styles[`surfaceNonOperationalItem_${item.tone}`] ?? ""
            }`}
          >
            <div className={styles.surfaceCardHeader}>
              <span className={styles.surfaceBadge}>{item.statusLabel}</span>
              <span className={styles.surfaceContext}>{item.roleLabel}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.whatThisMeans}</p>
            <div className={styles.surfaceNonOperationalColumns}>
              <div>
                <strong>لا يعرضه النظام الآن</strong>
                <ul>
                  {item.blockedActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>المسموح لك</strong>
                <ul>
                  {item.allowedActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className={styles.surfaceExpected}>{item.nextStep}</p>
            <p className={styles.surfaceReason}>{item.whyShown}</p>
            {item.cta ? (
              <Link href={item.cta.href} className={styles.surfacePrimaryLink}>
                {item.cta.label}
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function SharedBenefitSummaryPanel({
  summary,
}: {
  summary: WorkSurface["sharedBenefitSummary"];
}) {
  const metrics = [
    {
      label: "العجز الحالي",
      value: formatMoney(summary.totalCurrentDeficit),
    },
    {
      label: "المتأخرات",
      value: formatMoney(summary.totalOverdueAmount),
    },
    {
      label: "مصالح مشتركة",
      value: summary.itemCount.toLocaleString("ar-SA"),
    },
  ];

  return (
    <section className={styles.surfaceSharedBenefitPanel}>
      <div className={styles.surfaceSectionHeader}>
        <div>
          <h2>المصالح المشتركة</h2>
          <p>
            خدمات يستفيد منها الجميع مثل الصيانة أو المرافق، لذلك يعرضها النظام
            كتغطية وعجز لا كطلب فردي.
          </p>
        </div>
        <span className={styles.surfaceCount}>
          {summary.itemCount.toLocaleString("ar-SA")}
        </span>
      </div>

      <div className={styles.surfaceSharedBenefitLead}>
        <p>{summary.displayText}</p>
        {metrics.map((metric) => (
          <div key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>

      <div className={styles.surfaceSharedBenefitList}>
        {summary.items.map((item) => (
          <article
            key={item.id}
            className={`${styles.surfaceSharedBenefitItem} ${
              styles[`surfaceSharedBenefitItem_${item.tone}`] ?? ""
            }`}
          >
            <div className={styles.surfaceCardHeader}>
              <span className={styles.surfaceBadge}>{item.entityName}</span>
              <span className={styles.surfaceContext}>{item.roleLabel}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.benefitText}</p>

            <div className={styles.surfaceSharedCoverage}>
              <div>
                <span>نسبة التغطية</span>
                <strong>{item.coveragePercent.toLocaleString("ar-SA")}%</strong>
              </div>
              <div
                className={styles.surfaceSharedCoverageBar}
                aria-label={item.coverageText}
              >
                <span style={{ width: `${Math.min(item.coveragePercent, 100)}%` }} />
              </div>
              <p>{item.coverageText}</p>
            </div>

            <div className={styles.surfaceSharedBenefitMetrics}>
              <div>
                <span>الدعم المتوقع</span>
                <strong>{formatMoney(item.expectedMonthlySupport)}</strong>
              </div>
              <div>
                <span>العجز الحالي</span>
                <strong>{formatMoney(item.currentDeficitAmount)}</strong>
              </div>
              <div>
                <span>غير داعمين الآن</span>
                <strong>{item.nonSupportingCount.toLocaleString("ar-SA")}</strong>
              </div>
            </div>

            <p className={styles.surfaceExpected}>{item.userContributionText}</p>
            <p className={styles.surfaceImpact}>{item.sharedImpactText}</p>
            <p className={styles.surfaceReason}>{item.nextStep}</p>
            <p className={styles.surfaceSharedWhy}>{item.whyShown}</p>
            {item.cta ? (
              <Link href={item.cta.href} className={styles.surfacePrimaryLink}>
                {item.cta.label}
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const tCommon = useTranslations("common");
  const [surface, setSurface] = useState<WorkSurface | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyWorkSurface()
      .then((nextSurface) => {
        if (!cancelled) setSurface(nextSurface);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "تعذر تحميل حالتك");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
        <p>{tCommon("loading")}</p>
      </div>
    );
  }

  if (error || !surface) {
    return (
      <div className={styles.centered}>
        <p className={styles.errorText}>{error ?? tCommon("error")}</p>
        <Link href="/dashboard/legacy" className={styles.surfacePrimaryLink}>
          فتح الواجهة التفصيلية القديمة
        </Link>
      </div>
    );
  }

  const hasActions = surface.requiredActions.length > 0;
  const hasBenefits = surface.benefitSummary.items.length > 0;
  const hasUpdates = surface.quietUpdates.length > 0;
  const hasExceptions = surface.exceptions.length > 0;
  const hasMultipleContexts = surface.contextSummaries.length > 1;
  const showFinanceSummary = surface.financeSummary?.isVisible;
  const showCommitteeSummary = surface.committeeSummary?.isVisible;
  const showAuditorSummary = surface.auditorSummary?.isVisible;
  const showNonOperationalSummary = surface.nonOperationalSummary?.isVisible;
  const showSharedBenefitSummary = surface.sharedBenefitSummary?.isVisible;
  const showGettingStarted =
    surface.activeContexts.length === 0 &&
    surface.requiredActions.length === 0 &&
    surface.exceptions.length === 0;

  return (
    <div className={styles.page}>
      <section
        className={`${styles.surfaceHero} ${styles[`surfaceTone_${surface.primaryMessage.tone}`] ?? ""}`}
      >
        <div>
          <span className={styles.surfaceKicker}>
            مرحباً {surface.person.displayName}
          </span>
          <h1>{surface.primaryMessage.title}</h1>
          {surface.primaryMessage.body ? (
            <p>{surface.primaryMessage.body}</p>
          ) : null}
          {surface.primaryMessage.nextStep ? (
            <strong className={styles.surfaceNextStep}>
              {surface.primaryMessage.nextStep}
            </strong>
          ) : null}
        </div>
        <div className={styles.surfaceHeroMeta}>
          <span>{surfaceLabel(surface.surfaceKind)}</span>
          <span>{surface.moneySummary.displayText}</span>
        </div>
      </section>

      {surface.person.accountState === "UNVERIFIED" &&
      surface.person.accountMessage ? (
        <section className={styles.surfaceAlert}>
          {surface.person.accountMessage}
        </section>
      ) : null}

      {showGettingStarted ? (
        <section className={styles.surfaceSection}>
          <div className={styles.surfaceEmptyStart}>
            <h2>ابدأ بانضمام أو إنشاء صندوق</h2>
            <p>
              لا تظهر هنا قوائم النظام الداخلية. عندما تصبح عضواً سيعرض لك
              النظام المطلوب منك وما تستفيد منه فقط.
            </p>
            <div className={styles.surfaceActionsRow}>
              <Link href="/entities/new" className={styles.surfacePrimaryLink}>
                إنشاء صندوق
              </Link>
              <Link href="/entities" className={styles.surfaceSecondaryLink}>
                استعراض الخيارات
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {showNonOperationalSummary ? (
        <NonOperationalSummaryPanel summary={surface.nonOperationalSummary} />
      ) : null}

      {showSharedBenefitSummary ? (
        <SharedBenefitSummaryPanel summary={surface.sharedBenefitSummary} />
      ) : null}

      {hasMultipleContexts ? (
        <section className={styles.surfaceSection}>
          <div className={styles.surfaceSectionHeader}>
            <div>
              <h2>صناديقك باختصار</h2>
              <p>الأموال والحقوق مفصولة هنا حتى لا تختلط عليك الصناديق.</p>
            </div>
            <span className={styles.surfaceCount}>
              {surface.contextSummaries.length}
            </span>
          </div>
          <div className={styles.surfaceContextSummaryGrid}>
            {surface.contextSummaries.map((item) => (
              <ContextSummaryCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.surfaceSection}>
        <div className={styles.surfaceSectionHeader}>
          <div>
            <h2>المطلوب منك الآن</h2>
            <p>النظام يعرض فقط ما يحتاج فعلاً إلى إجراء منك.</p>
          </div>
          <span className={styles.surfaceCount}>
            {surface.requiredActions.length}
          </span>
        </div>
        {hasActions ? (
          <div className={styles.surfaceGrid}>
            {surface.requiredActions.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
          </div>
        ) : (
          <div className={styles.surfaceDone}>
            لا يوجد إجراء مطلوب منك الآن.
          </div>
        )}
      </section>

      {showFinanceSummary ? (
        <FinanceSummaryPanel summary={surface.financeSummary} />
      ) : null}

      {showCommitteeSummary ? (
        <CommitteeSummaryPanel summary={surface.committeeSummary} />
      ) : null}

      {showAuditorSummary ? (
        <AuditorSummaryPanel summary={surface.auditorSummary} />
      ) : null}

      <section className={styles.surfaceTwoColumn}>
        <div className={styles.surfacePanel}>
          <div className={styles.surfaceSectionHeader}>
            <h2>مدفوعاتك</h2>
          </div>
          <div className={styles.surfaceMoneyGrid}>
            <div>
              <span>المستحق الآن</span>
              <strong>{formatMoney(surface.moneySummary.dueNow)}</strong>
            </div>
            <div>
              <span>المتأخرات</span>
              <strong>{formatMoney(surface.moneySummary.overdue)}</strong>
            </div>
            <div>
              <span>إثباتات تنتظر التأكيد</span>
              <strong>{surface.moneySummary.pendingProofs}</strong>
            </div>
          </div>
          <p className={styles.surfacePanelNote}>
            {surface.moneySummary.displayText}
          </p>
        </div>

        <div className={styles.surfacePanel}>
          <div className={styles.surfaceSectionHeader}>
            <h2>{surface.benefitSummary.title}</h2>
          </div>
          {hasBenefits ? (
            <div className={styles.surfaceBenefitList}>
              {surface.benefitSummary.items.map((item) => (
                <article key={item.id} className={styles.surfaceBenefit}>
                  <span
                    className={`${styles.surfaceBenefitState} ${
                      styles[`surfaceBenefitState_${item.state}`] ?? ""
                    }`}
                  >
                    {benefitStateLabel(item.state)}
                  </span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  {item.contextLabel ? <span>{item.contextLabel}</span> : null}
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.surfacePanelNote}>
              لا تظهر استفادة نشطة الآن. سيعرضها النظام عندما تصبح مرتبطة
              بعضويتك.
            </p>
          )}
        </div>
      </section>

      {surface.blockedCapabilities.length > 0 ? (
        <section className={styles.surfaceSection}>
          <div className={styles.surfaceSectionHeader}>
            <h2>ما لا يمكن فعله الآن ولماذا</h2>
          </div>
          <div className={styles.surfaceBlockedList}>
            {surface.blockedCapabilities.map((item) => (
              <BlockedItem key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {hasExceptions ? (
        <section className={styles.surfaceSection}>
          <div className={styles.surfaceSectionHeader}>
            <div>
              <h2>استثناءات تحتاج تدخلك</h2>
              <p>تظهر لأن دورك يتطلب التدخل عند هذه الحالات فقط.</p>
            </div>
            <span className={styles.surfaceCount}>
              {surface.exceptions.length}
            </span>
          </div>
          <div className={styles.surfaceGrid}>
            {surface.exceptions.map((item) => (
              <ExceptionCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.surfaceSection}>
        <div className={styles.surfaceSectionHeader}>
          <div>
            <h2>ما حدث ويهمك</h2>
            <p>تحديثات مختصرة بدون إدخالك في تفاصيل التشغيل.</p>
          </div>
        </div>
        {hasUpdates ? (
          <div className={styles.surfaceUpdates}>
            {surface.quietUpdates.map((update) => (
              <QuietUpdate key={update.id} update={update} />
            ))}
          </div>
        ) : (
          <div className={styles.surfaceMutedEmpty}>
            لا توجد تحديثات مهمة الآن.
          </div>
        )}
      </section>

      <details className={styles.surfaceAdvanced}>
        <summary>أدوات تفصيلية للمقارنة أو عند الحاجة</summary>
        <p>
          هذه ليست الواجهة اليومية. أبقيناها مؤقتاً حتى ترى الفرق بين التجربة
          الجديدة والقديمة.
        </p>
        <div className={styles.surfaceToolGrid}>
          {surface.advancedTools.map((tool) => (
            <AdvancedTool key={tool.href} tool={tool} />
          ))}
        </div>
      </details>
    </div>
  );
}

function surfaceLabel(kind: WorkSurface["surfaceKind"]) {
  switch (kind) {
    case "FOUNDER":
      return "سطح مؤسس";
    case "ADMIN":
      return "سطح مسؤول";
    case "TREASURER":
      return "سطح أمين صندوق";
    case "AUDITOR":
      return "سطح مدقق";
    case "COMMITTEE_MEMBER":
      return "سطح لجنة";
    case "MULTI_ENTITY_MEMBER":
      return "عضو في أكثر من صندوق";
    case "CONDITIONAL_MEMBER":
      return "عضوية مشروطة";
    case "SUSPENDED_MEMBER":
      return "عضوية معلقة";
    case "EXITED_MEMBER":
      return "عضوية سابقة";
    case "SUPPORTER_ONLY":
      return "داعم فقط";
    case "READ_ONLY_MEMBER":
      return "متابعة فقط";
    case "PENDING_REVIEW_MEMBER":
      return "قيد المراجعة";
    case "MEMBER":
      return "سطح عضو";
  }
}

function benefitStateLabel(
  state: WorkSurface["benefitSummary"]["items"][number]["state"],
) {
  switch (state) {
    case "AVAILABLE":
      return "متاح";
    case "SUPPORT_ONLY":
      return "داعم فقط";
    case "CONDITIONAL":
      return "مشروط";
    case "SUSPENDED":
      return "معلق";
    case "EXITED":
      return "سابق";
    case "READ_ONLY":
      return "متابعة فقط";
  }
}

function contextKindLabel(kind: ContextSurfaceSummary["kind"]) {
  switch (kind) {
    case "CAMPAIGN":
      return "حملة";
    case "SHARED_BENEFIT":
      return "مصلحة مشتركة";
    case "ENTITY":
      return "صندوق";
  }
}

function exceptionRoleLabel(role: SurfaceException["ownerRole"]) {
  switch (role) {
    case "FOUNDER":
      return "للمؤسس";
    case "ADMIN":
      return "للإدارة";
    case "TREASURER":
      return "لأمين الصندوق";
    case "AUDITOR":
      return "للمدقق";
    case "COMMITTEE":
      return "للجنة";
  }
}

function formatMoney(amount: number) {
  return `${amount.toLocaleString("ar-SA", {
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  })} ر.س`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function voteChoiceLabel(choice: NonNullable<WorkSurface["committeeSummary"]["decisions"][number]["voteChoice"]>) {
  switch (choice) {
    case "APPROVE":
      return "موافق";
    case "REJECT":
      return "رافض";
    case "ABSTAIN":
      return "امتناع";
  }
}

function auditorCategoryLabel(
  category: WorkSurface["auditorSummary"]["timeline"][number]["category"],
) {
  switch (category) {
    case "FINANCE":
      return "مالي";
    case "GOVERNANCE":
      return "حوكمة";
    case "MEMBERSHIP":
      return "عضوية";
    case "ACCESS":
      return "وصول";
    case "OPERATIONS":
      return "تشغيل";
  }
}
