"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getAppeals,
  respondToAppeal,
  type PlatformSuspensionAppeal,
} from "../../../lib/api/platform";
import styles from "./appeals.module.css";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "معلّق — ينتظر الرد", color: "pending" },
  REVIEWED: { label: "تمت المراجعة", color: "reviewed" },
  RESOLVED: { label: "مُحسوم", color: "resolved" },
};

export default function PlatformAppealsPage() {
  const router = useRouter();
  const [appeals, setAppeals] = useState<PlatformSuspensionAppeal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [responding, setResponding] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAppeals({ status: statusFilter || undefined });
      setAppeals(res.appeals);
      setTotal(res.total);
    } catch {
      void router.push("/platform/login");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRespond(
    appeal: PlatformSuspensionAppeal,
    status: "REVIEWED" | "RESOLVED",
  ) {
    const text = responseText[appeal.id]?.trim();
    if (!text) {
      setMsg("⚠ أدخل نص الرد قبل الإرسال");
      return;
    }
    setResponding(appeal.id);
    setMsg(null);
    try {
      await respondToAppeal(appeal.id, text, status);
      setMsg("✓ تم إرسال الرد بنجاح");
      setResponseText((prev) => {
        const next = { ...prev };
        delete next[appeal.id];
        return next;
      });
      await load();
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : "تعذّر إرسال الرد"}`);
    } finally {
      setResponding(null);
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>اعتراضات التعليق</h1>
          <p className={styles.pageSubtitle}>
            {total} اعتراض — مدراء الكيانات يعترضون على قرارات التعليق
          </p>
        </div>
      </div>

      {msg && (
        <div
          className={`${styles.msg} ${msg.startsWith("✓") ? styles.msgSuccess : styles.msgError}`}
        >
          {msg}
        </div>
      )}

      <div className={styles.filterRow}>
        {(["PENDING", "REVIEWED", "RESOLVED", ""] as const).map((s) => (
          <button
            key={s}
            className={`${styles.filterBtn} ${statusFilter === s ? styles.filterBtnActive : ""}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === "" ? "الكل" : STATUS_LABELS[s]?.label ?? s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.centered}>
          <div className={styles.spinner} />
        </div>
      ) : appeals.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>✓</span>
          <p>لا توجد اعتراضات في هذه الفئة</p>
        </div>
      ) : (
        <div className={styles.list}>
          {appeals.map((appeal) => {
            const st = STATUS_LABELS[appeal.status];
            return (
              <div key={appeal.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardMeta}>
                    <span className={styles.submitter}>
                      {appeal.submittedBy.name}
                    </span>
                    <span className={styles.sep}>·</span>
                    <span className={styles.entityId}>
                      الكيان: {appeal.entityId.slice(0, 8)}…
                    </span>
                    <span className={styles.sep}>·</span>
                    <span className={styles.date}>
                      {new Date(appeal.createdAt).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                  <span
                    className={styles.statusBadge}
                    data-color={st?.color}
                  >
                    {st?.label ?? appeal.status}
                  </span>
                </div>

                <div className={styles.reason}>
                  <span className={styles.reasonLabel}>سبب الاعتراض:</span>
                  <p className={styles.reasonText}>{appeal.reason}</p>
                </div>

                {appeal.response && (
                  <div className={styles.existingResponse}>
                    <span className={styles.reasonLabel}>رد المنصة:</span>
                    <p className={styles.reasonText}>{appeal.response}</p>
                    {appeal.resolvedAt && (
                      <span className={styles.resolvedDate}>
                        {new Date(appeal.resolvedAt).toLocaleDateString("ar-SA")}
                      </span>
                    )}
                  </div>
                )}

                {appeal.status === "PENDING" && (
                  <div className={styles.respondArea}>
                    <textarea
                      className={styles.responseInput}
                      placeholder="اكتب ردّك على هذا الاعتراض…"
                      rows={3}
                      value={responseText[appeal.id] ?? ""}
                      onChange={(e) =>
                        setResponseText((prev) => ({
                          ...prev,
                          [appeal.id]: e.target.value,
                        }))
                      }
                    />
                    <div className={styles.respondBtns}>
                      <button
                        className={styles.btnReviewed}
                        disabled={responding === appeal.id}
                        onClick={() => void handleRespond(appeal, "REVIEWED")}
                      >
                        {responding === appeal.id ? "…" : "تمت المراجعة"}
                      </button>
                      <button
                        className={styles.btnResolved}
                        disabled={responding === appeal.id}
                        onClick={() => void handleRespond(appeal, "RESOLVED")}
                      >
                        {responding === appeal.id ? "…" : "حسم الاعتراض"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
