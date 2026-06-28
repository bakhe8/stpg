"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { fetchApi } from "../../lib/api";
import { ENTITY_TYPE_KEYS } from "../../lib/enum-labels";
import styles from "./GlobalSearch.module.css";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  url: string;
  score: number;
}

type SearchEntityResult = {
  id?: string;
  name?: string;
  type?: string;
  status?: string | null;
  platformStatus?: string | null;
  score?: number;
};

type GroupedSearchResponse = {
  entities?: SearchEntityResult[];
};

function normalizeSearchResponse(response: unknown): SearchResult[] {
  if (Array.isArray(response)) return response as SearchResult[];

  const grouped = response as GroupedSearchResponse;
  return (grouped.entities ?? [])
    .filter((entity): entity is SearchEntityResult & { id: string; name: string } =>
      Boolean(entity.id && entity.name),
    )
    .map((entity) => ({
      id: entity.id,
      type: "Entity",
      title: entity.name,
      subtitle: [entity.type, entity.platformStatus ?? entity.status]
        .filter(Boolean)
        .join(" · "),
      url: `/entities/${entity.id}`,
      score: entity.score ?? 1,
    }));
}

export default function GlobalSearch() {
  const t = useTranslations("search");
  const tEnums = useTranslations("enums");
  const tStatus = useTranslations("status");
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
            setResults(normalizeSearchResponse(res));
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

  function translateOrFallback(
    translator: ReturnType<typeof useTranslations>,
    key: string | undefined,
    fallback: string,
  ) {
    if (!key) return fallback;
    try {
      return translator(key as Parameters<typeof translator>[0]);
    } catch {
      return fallback;
    }
  }

  function formatResultSubtitle(result: SearchResult) {
    if (!result.subtitle || result.type !== "Entity") return result.subtitle;
    const [rawType, rawStatus] = result.subtitle.split(" · ");
    const typeKey = ENTITY_TYPE_KEYS[rawType];
    const statusKey = rawStatus?.toLowerCase();
    const typeLabel = translateOrFallback(tEnums, typeKey, rawType);
    const statusLabel = translateOrFallback(tStatus, statusKey, rawStatus ?? "");
    return [typeLabel, statusLabel].filter(Boolean).join(" · ");
  }

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

      {isOpen && (
        <div className={styles.resultsDropdown}>
          {results.length === 0 && !loading ? (
            <div className={styles.emptyResult}>{t("noResults")}</div>
          ) : results.map((result) => (
            (() => {
              const subtitle = formatResultSubtitle(result);
              return (
                <button
                  type="button"
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
                    {subtitle && <div className={styles.resultSubtitle}>{subtitle}</div>}
                  </div>
                </button>
              );
            })()
          ))}
        </div>
      )}
    </div>
  );
}
