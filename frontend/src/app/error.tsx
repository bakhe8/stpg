"use client";

import React, { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error("Caught by app/error.tsx:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "Tajawal, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "2.5rem 2rem",
          maxWidth: "450px",
          width: "100%",
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          border: "1px solid #eaeaea",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
        <h2
          style={{
            fontSize: "1.2rem",
            fontWeight: 800,
            color: "#1a1a1a",
            margin: "0 0 0.5rem",
          }}
        >
          حدث خطأ غير متوقع في هذه الصفحة
        </h2>
        <p
          style={{
            fontSize: "0.9rem",
            color: "#666",
            margin: "0 0 1.5rem",
            lineHeight: 1.6,
          }}
        >
          نعتذر عن هذا الخلل. حاول تحديث الصفحة أو العودة لاحقاً.
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
    </div>
  );
}
