"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          fontFamily: "Tajawal, sans-serif",
          background: "#f8f9fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "2rem",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "2.5rem 2rem",
            maxWidth: "420px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h1
            style={{
              fontSize: "1.3rem",
              fontWeight: 800,
              color: "#1a1a1a",
              margin: "0 0 0.5rem",
            }}
          >
            حدث خطأ غير متوقع
          </h1>
          <p
            style={{
              fontSize: "0.9rem",
              color: "#666",
              margin: "0 0 1.5rem",
              lineHeight: 1.6,
            }}
          >
            نعتذر عن هذا الخلل. يمكنك المحاولة مجدداً أو التواصل مع الدعم إذا استمرت المشكلة.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "12px 28px",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: "pointer",
              width: "100%",
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
