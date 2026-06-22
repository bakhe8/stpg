"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { fetchApi } from "../../lib/api";
import styles from "./GlobalSearch.module.css";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  url: string;
  score: number;
}

export default function GlobalSearch() {
  const t = useTranslations("search");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length >= 2) {
        setLoading(true);
        fetchApi(`/search?q=${encodeURIComponent(query)}`)
          .then((res) => {
            const results = res as SearchResult[];
            setResults(results);
            setIsOpen(true);
          })
          .catch(() => setResults([]))
          .finally(() => setLoading(false));
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleResultClick = (url: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(url);
  };

  return (
    <div className={styles.searchWrapper} ref={wrapperRef}>
      <div className={styles.searchInputWrapper}>
        <span className={styles.searchIcon}>⌕</span>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        />
        {loading && <span className={styles.loadingSpinner}></span>}
      </div>

      {isOpen && results.length > 0 && (
        <div className={styles.resultsDropdown}>
          {results.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              className={styles.resultItem}
              onClick={() => handleResultClick(result.url)}
            >
              <div className={styles.resultIcon}>
                {result.type === "Entity" ? "⬡"
                  : result.type === "Wallet" ? "◫"
                  : result.type === "Decision" ? "✓"
                  : result.type === "Membership" ? "👤"
                  : "📄"}
              </div>
              <div className={styles.resultContent}>
                <div className={styles.resultTitle}>{result.title}</div>
                {result.subtitle && <div className={styles.resultSubtitle}>{result.subtitle}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
