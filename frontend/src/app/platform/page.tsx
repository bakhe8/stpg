"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getEntitiesList,
  suspendEntity,
  activateEntity,
  getPlatformAccount,
  getAppeals,
  type PlatformEntity,
} from "../../lib/api/platform";
import styles from "./dashboard.module.css";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "نشط",
  SUSPENDED: "معلّق",
  READ_ONLY: "قراءة فقط",
  PENDING_REVIEW: "قيد المراجعة",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  FAMILY: "عائلة",
  TRIBE: "قبيلة",
  BUILDING: "عمارة",
  NEIGHBORHOOD: "حي",
  COMMUNITY: "مجتمع",
  CAMPAIGN: "حملة",
};

export default function PlatformDashboardPage() {
  const router = useRouter();
  const account = getPlatformAccount();
  const canManageEntities =
    account?.role === "OWNER" || account?.role === "SUPER_ADMIN";

  const [entities, setEntities] = useState<PlatformEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingAppeals, setPendingAppeals] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [entitiesRes, appealsRes] = await Promise.all([
        getEntitiesList({ status: statusFilter || undefined }),
        getAppeals({ status: "PENDING" }),
      ]);
      setEntities(entitiesRes.entities);
      setTotal(entitiesRes.total);
      setPendingAppeals(appealsRes.total);
    } catch {
      void router.push("/platform/login");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, router]);

  useEffect(() => {
    void load();
  }, [load]);

  // handleLogout moved to layout

  async function handleSuspend(entity: PlatformEntity) {
    const reason = prompt(`سبب تعليق "${entity.name}":`);
    if (!reason) return;
    setActionLoading(entity.id);
    try {
      await suspendEntity(entity.id, reason, "SUSPENDED");
      await load();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleActivate(entity: PlatformEntity) {
    if (!confirm(`تفعيل "${entity.name}" من جديد؟`)) return;
    setActionLoading(entity.id);
    try {
      await activateEntity(entity.id);
      await load();
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>إدارة الكيانات</h1>
          <p className={styles.pageSubtitle}>
            {total} كيان مسجّل — {account?.name} ({account?.role})
            {pendingAppeals > 0 && (
              <span className={styles.appealsBadge}>
                {pendingAppeals} اعتراض معلّق
              </span>
            )}
          </p>
        </div>
      </div>

      <div className={styles.filterRow}>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">كل الحالات</option>
          <option value="ACTIVE">نشط</option>
          <option value="SUSPENDED">معلّق</option>
          <option value="READ_ONLY">قراءة فقط</option>
          <option value="PENDING_REVIEW">قيد المراجعة</option>
        </select>
      </div>

      {loading ? (
        <p className={styles.loadingText}>جاري التحميل...</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
          <thead>
            <tr>
              <th>اسم الكيان</th>
              <th>النوع</th>
              <th>الأعضاء</th>
              <th>الحالة</th>
              <th>تاريخ الإنشاء</th>
              <th>{canManageEntities ? "إجراء" : "الصلاحية"}</th>
            </tr>
          </thead>
          <tbody>
            {entities.map((entity) => (
              <tr key={entity.id}>
                <td>{entity.name}</td>
                <td>{ENTITY_TYPE_LABELS[entity.type] ?? entity.type}</td>
                <td>{entity._count.memberships}</td>
                <td>
                  <span
                    className={styles.statusBadge}
                    data-status={entity.platformStatus}
                  >
                    {STATUS_LABELS[entity.platformStatus]}
                  </span>
                </td>
                <td>
                  {new Date(entity.foundedAt).toLocaleDateString("ar-SA")}
                </td>
                <td>
                  {canManageEntities ? (
                    entity.platformStatus === "ACTIVE" ||
                    entity.platformStatus === "PENDING_REVIEW" ? (
                      <button
                        className={styles.actionBtnDanger}
                        disabled={actionLoading === entity.id}
                        onClick={() => void handleSuspend(entity)}
                      >
                        تعليق
                      </button>
                    ) : (
                      <button
                        className={styles.actionBtnSafe}
                        disabled={actionLoading === entity.id}
                        onClick={() => void handleActivate(entity)}
                      >
                        تفعيل
                      </button>
                    )
                  ) : (
                    <span className={styles.readOnlyAction}>متابعة فقط</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
