export type RememberProgress = Record<string, number>;

const REMEMBER_IDS_KEY = "remember.wordIds";
const REMEMBER_PROGRESS_KEY = "remember.progress";
const LEGACY_UNLEARNED_KEY = "review.unlearnedIds";

function readStringArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === "string");
  } catch {
    return [];
  }
}

export function loadRememberIds(): string[] {
  const current = readStringArray(REMEMBER_IDS_KEY);
  const legacy = readStringArray(LEGACY_UNLEARNED_KEY);
  const merged = Array.from(new Set([...current, ...legacy]));
  if (merged.length !== current.length || legacy.length > 0) {
    saveRememberIds(merged);
  }
  return merged;
}

export function saveRememberIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_IDS_KEY, JSON.stringify(ids));
}

export function loadRememberProgress(): RememberProgress {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(REMEMBER_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const output: RememberProgress = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key === "string" && typeof value === "number" && value >= 0) {
        output[key] = value;
      }
    }
    return output;
  } catch {
    return {};
  }
}

export function saveRememberProgress(progress: RememberProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_PROGRESS_KEY, JSON.stringify(progress));
}

export function resetRememberProgress(progress: RememberProgress, id: string): RememberProgress {
  return { ...progress, [id]: 0 };
}

export function pruneRememberProgress(
  progress: RememberProgress,
  ids: string[]
): RememberProgress {
  const allowed = new Set(ids);
  const next: RememberProgress = {};
  for (const [key, value] of Object.entries(progress)) {
    if (allowed.has(key)) {
      next[key] = value;
    }
  }
  return next;
}
