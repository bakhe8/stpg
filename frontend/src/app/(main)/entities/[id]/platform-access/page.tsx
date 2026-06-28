"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getPlatformAccessLogs,
  type PlatformAccessLogEntry,
} from "../../../../../lib/api/platform";
import { getToken } from "../../../../../lib/api";
import styles from "./platform-access.module.css";
import { useTranslations } from "next-intl";

export default function PlatformAccessPage() {
  const t = useTranslations("platformAccess");

  const ACCESS_TYPE_LABELS: Record<string, string> = {
    READ: t("readOnly"),
    SUPPORT: t("techSupport"),
    ADMIN_ACTION: t("adminAction"),
    BREAK_GLASS: t("emergencyAccess"),
  };

  const params = useParams();
  const entityId = params.id as string;

  const [logs, setLogs] = useState<PlatformAccessLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    getPlatformAccessLogs(entityId, token)
      .then(setLogs)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t("loadError"));
      })
      .finally(() => setLoading(false));
  }, [entityId, t]);

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>{t("title")}</h2>
      <p className={styles.notice}>
        {t("desc1")}
        {t("desc2")}
      </p>

      {loading && <p className={styles.stateMsg}>{t("loading")}</p>}
      {error && <p className={styles.errorMsg}>{error}</p>}

      {!loading && !error && logs.length === 0 && (
        <div className={styles.emptyState}>
          <p>{t("empty")}</p>
        </div>
      )}

      {logs.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("colMember")}</th>
                <th>{t("colRole")}</th>
                <th>{t("colAccessType")}</th>
                <th>{t("colDataAccessed")}</th>
                <th>{t("colReason")}</th>
                <th>{t("colTimestamp")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.platformAccount.name}</td>
                  <td>{log.platformAccount.role}</td>
                  <td>
                    <span className={styles.badge} data-type={log.accessType}>
                      {ACCESS_TYPE_LABELS[log.accessType]}
                    </span>
                  </td>
                  <td className={styles.scopeCell}>{log.dataScope}</td>
                  <td>{log.reason}</td>
                  <td>{new Date(log.startedAt).toLocaleString("ar-SA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
