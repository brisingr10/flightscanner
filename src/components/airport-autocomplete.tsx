"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import airports from "@/data/airports.json";

type Airport = (typeof airports)[number];

interface AirportAutocompleteProps {
  id: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}

export function AirportAutocomplete({
  id,
  value,
  onChange,
  placeholder,
}: AirportAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync query when value prop changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const results = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    const matched = airports.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q)
    );
    return matched.slice(0, 15);
  }, [query]);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase();
    setQuery(val);
    onChange(val);
    setOpen(true);
    setHighlightIndex(-1);
  }

  function select(airport: Airport) {
    setQuery(airport.code);
    onChange(airport.code);
    setOpen(false);
    setHighlightIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        return;
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : results.length - 1
      );
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      select(results[highlightIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.parentElement?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function displayLabel(airport: Airport) {
    return `${airport.code} · ${airport.city} (${airport.name})`;
  }

  const selectedAirport = useMemo(
    () => airports.find((a) => a.code === value),
    [value]
  );

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        required
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-2xl border border-[rgba(184,168,146,0.58)] bg-white px-4 py-3 text-sm uppercase text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(230,123,62,0.12)]"
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />

      {selectedAirport && !open && (
        <p className="mt-1.5 text-xs text-[var(--ink-muted)]">
          {displayLabel(selectedAirport)}
        </p>
      )}

      {open && results.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-20 mt-1 w-full overflow-auto rounded-2xl border border-[rgba(206,193,175,0.75)] bg-white p-1.5 shadow-[0_12px_40px_rgba(74,53,27,0.14)]"
          style={{ maxHeight: "15rem" }}
        >
          {results.map((airport, i) => (
            <li
              key={airport.code}
              role="option"
              aria-selected={i === highlightIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                select(airport);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
                i === highlightIndex
                  ? "bg-[rgba(221,122,68,0.1)] text-[var(--ink)]"
                  : "text-[var(--ink-soft)] hover:bg-[rgba(221,122,68,0.06)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 text-center font-semibold text-[var(--accent-deep)]">
                  {airport.code}
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {airport.city}
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {airport.name}
                  </p>
                </div>
              </div>
              <span className="text-xs text-[var(--ink-faint)]">
                {airport.country}
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && query && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-2xl border border-[rgba(206,193,175,0.75)] bg-white p-4 text-center text-sm text-[var(--ink-muted)] shadow-[0_12px_40px_rgba(74,53,27,0.14)]">
          일치하는 공항이 없습니다
        </div>
      )}
    </div>
  );
}