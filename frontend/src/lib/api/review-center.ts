import { getEntityPaymentRecords } from "./subscriptions";
import { getDisbursementRequests } from "./disbursement-requests";
import { getEntityDisputes } from "./disputes";
import { getEntityWallets, getWalletPaths } from "./wallets";
import { ReviewTask } from "../models/ReviewTask";
import { Entity } from "./entities";
import { getEntityMembershipApplications } from "./membership-applications";

/**
 * Aggregates all pending review tasks for the provided entities.
 * In a fully scaled architecture, this should be a single backend endpoint.
 */
export async function getReviewTasksForEntities(
  entities: Entity[],
  t: (key: string, values?: any) => string
): Promise<ReviewTask[]> {
  const tasks: ReviewTask[] = [];

  for (const entity of entities) {
    try {
      // 1. Membership applications
      const applications = await getEntityMembershipApplications(
        entity.id,
      ).catch(() => []);
      for (const application of applications) {
        tasks.push({
          id: application.id,
          type: "JOIN_REQUEST",
          title: t("joinRequestTitle"),
          subtitle:
            application.relationshipDescription ??
            application.note ??
            t("pendingVerification"),
          requestedBy: {
            id: application.person?.id ?? application.personId,
            name: application.person?.name ?? t("applicant"),
          },
          createdAt: application.submittedAt,
          urgency: application.status === "UNDER_REVIEW" ? "NORMAL" : "HIGH",
          context: {
            entityId: entity.id,
            entityName: entity.name,
          },
          ruleExplanation: t("invitationRuleExplanation"),
          actionUrl: `/entities/${entity.id}/members`,
        });
      }

      // 2. Payment Receipts
      const paymentRecords = await getEntityPaymentRecords(entity.id).catch(
        () => [],
      );
      const submittedRecords = paymentRecords.filter(
        (r) => r.status === "SUBMITTED",
      );

      for (const record of submittedRecords) {
        tasks.push({
          id: record.id,
          type: "PAYMENT_RECEIPT",
          title: t("paymentReceiptTitle"),
          subtitle: t("paymentReceiptSubtitle", { amount: record.amount, period: record.paymentDue?.periodLabel || "" }),
          requestedBy: {
            id: record.subscription?.membership?.person?.id ?? "unknown",
            name: record.subscription?.membership?.person?.name ?? t("member"),
          },
          createdAt: record.submittedAt,
          urgency: "NORMAL",
          context: {
            entityId: entity.id,
            entityName: entity.name,
            pathId: record.subscription?.governancePath?.id,
            pathName: record.subscription?.governancePath?.name,
            amount: record.amount,
          },
          actionUrl: `/finance?entityId=${entity.id}&tab=reviews`,
        });
      }

      // 3. Disputes
      const disputes = await getEntityDisputes(entity.id).catch(() => []);
      const openDisputes = disputes.filter(
        (d) => d.status === "OPEN" || d.status === "ESCALATED",
      );

      for (const dispute of openDisputes) {
        tasks.push({
          id: dispute.id,
          type: "DISPUTE_REVIEW",
          title: t("disputeReviewTitle"),
          subtitle: dispute.title,
          requestedBy: {
            id: dispute.initiatorId,
            name: dispute.initiator?.name ?? t("member"),
          },
          createdAt: dispute.createdAt,
          urgency: dispute.status === "ESCALATED" ? "HIGH" : "NORMAL",
          context: {
            entityId: entity.id,
            entityName: entity.name,
            walletId: dispute.walletId ?? undefined,
            pathId: dispute.governancePathId ?? undefined,
          },
          actionUrl: `/disputes`,
        });
      }

      // 4. Disbursement Requests (requires fetching wallets -> paths)
      const wallets = await getEntityWallets(entity.id).catch(() => []);
      for (const wallet of wallets) {
        const paths = await getWalletPaths(wallet.id).catch(() => []);
        for (const path of paths) {
          const requests = await getDisbursementRequests(path.id).catch(
            () => [],
          );
          const pendingRequests = requests.filter(
            (r) => r.status === "PENDING",
          );

          for (const req of pendingRequests) {
            tasks.push({
              id: req.id,
              type: "DISBURSEMENT_APPROVAL",
              title: t("disbursementApprovalTitle"),
              subtitle: t("disbursementApprovalSubtitle", { name: req.beneficiaryName, amount: req.amount }),
              requestedBy: {
                id: req.requestedById,
                name: t("member"), // Backend doesn't return requestedBy name directly in MVP, fallback
              },
              createdAt: req.requestedAt,
              urgency: "NORMAL",
              context: {
                entityId: entity.id,
                entityName: entity.name,
                walletId: wallet.id,
                walletName: wallet.name,
                pathId: path.id,
                pathName: path.name,
                amount: req.amount,
              },
              actionUrl: `/disbursement-requests?pathId=${path.id}`,
            });
          }
        }
      }
    } catch (e) {
      console.error("Failed fetching tasks for entity", entity.id, e);
    }
  }

  // Sort newest first
  return tasks.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
