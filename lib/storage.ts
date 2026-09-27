'use client'

const PREFIX = 'chrono:'

/** Reads a JSON value from localStorage. Returns `fallback` if missing, unparsable, or run server-side. */
export function loadState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Writes a JSON value to localStorage. Silently no-ops if storage is unavailable (private mode, SSR, etc). */
export function saveState<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage unavailable — app keeps working in-memory for this session.
  }
}
