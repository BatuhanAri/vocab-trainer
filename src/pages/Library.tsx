import { useEffect, useMemo, useState } from "react";
import { deleteWord, listWords } from "../db/repo";
import type { WordEntry } from "../db/repo";

const ALL_FILTER = "all";

export default function Library() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<WordEntry[]>([]);
  const [err, setErr] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState(ALL_FILTER);
  const [levelFilter, setLevelFilter] = useState(ALL_FILTER);

  // Fetches library items optionally filtered by search query (used by search + reset).
  async function load(query?: string) {
    setErr("");
    try {
      const res = await listWords(query);
      setItems(res);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    }
  }

  useEffect(() => {
    load("");
  }, []);

  const categories = useMemo(() => {
    const values = items
      .map((item) => item.part_of_speech)
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredItems = items.filter((item) => {
    const categoryOk =
      categoryFilter === ALL_FILTER ||
      (item.part_of_speech ?? "").toLowerCase() === categoryFilter;
    const levelOk =
      levelFilter === ALL_FILTER || String(item.level ?? "") === levelFilter;
    return categoryOk && levelOk;
  });

  // Deletes a word with confirmation and keeps the list in sync (used by delete button).
  async function handleDelete(word: WordEntry) {
    const confirmed = window.confirm(`Delete "${word.term}"?`);
    if (!confirmed) return;
    setDeletingId(word.id);
    setErr("");
    try {
      await deleteWord(word.id);
      setItems((prev) => prev.filter((item) => item.id !== word.id));
    } catch (e: any) {
      setErr(e?.message ?? "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h2 className="page-title">Word Library</h2>
        <p className="page-subtitle">Search, filter, and manage all words.</p>
      </header>
      <div className="toolbar">
        <div className="search-bar">
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: term or Turkish meaning"
          />
          <button onClick={() => load(q)} className="button primary">
            Search
          </button>
          <select
            className="input"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category.toLowerCase()}>
                {category}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            aria-label="Filter by level"
          >
            <option value="all">All levels</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
            <option value="4">Level 4</option>
            <option value="5">Level 5</option>
          </select>
          <button
            onClick={() => {
              setQ("");
              setCategoryFilter(ALL_FILTER);
              setLevelFilter(ALL_FILTER);
              load("");
            }}
            className="button ghost"
          >
            Reset
          </button>
        </div>
        <div className="status-pill">
          Total: <strong>{filteredItems.length}</strong>
        </div>
      </div>
    
    {err && <p className="error-text">{err}</p>}

      {filteredItems.length === 0 ? (
        <div className="card empty-state">
          No words in the library.
          <p>Add new words to get started.</p>
        </div>
      ) : (
        <div className="card-grid">
          {filteredItems.map((w) => (
            <article key={w.id} className="card word-card">
              <div className="word-header">
                <div>
                  <h3>{w.term}</h3>
                  <p>{w.meaning_tr}</p>
                </div>
                <span className="level-pill">L{w.level ?? "-"}</span>
              </div>
              <div className="word-meta">
                <span>Category: {w.part_of_speech ?? "-"}</span>
                <span>Updated: {new Date(w.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="button-row">
                <button
                  className="button danger"
                  onClick={() => handleDelete(w)}
                  disabled={deletingId === w.id}
                >
                  {deletingId === w.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
