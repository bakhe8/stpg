"use client";

import React, { useEffect } from "react";
import styles from "./error.module.css";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>⚠️</div>
        <h2 className={styles.title}>حدث خطأ</h2>
        <p className={styles.desc}>
          تعذّر تحميل هذه الصفحة. يمكنك المحاولة مجدداً أو العودة للرئيسية.
        </p>
        <div className={styles.actions}>
          <button className={styles.retryBtn} onClick={reset}>
            إعادة المحاولة
          </button>
          <a href="/dashboard" className={styles.homeBtn}>
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}
