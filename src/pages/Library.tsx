import { useEffect, useState } from "react";
import { deleteWord, listWords } from "../db/repo";
import type { WordEntry } from "../db/repo";


export default function Library() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<WordEntry[]>([]);
  const [err, setErr] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);


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
          <button
            onClick={() => {
              setQ("");
              load("");
            }}
                        className="button ghost"

          >
            Reset
          </button>
        </div>
        <div className="status-pill">
          Total: <strong>{items.length}</strong>
        </div>
      </div>
    
    {err && <p className="error-text">{err}</p>}

      {items.length === 0 ? (
        <div className="card empty-state">
          No words in the library.
          <p>Add new words to get started.</p>
        </div>
      ) : (
        <div className="card-grid">
          {items.map((w) => (
            <article key={w.id} className="card word-card">
              <div className="word-header">
                <div>
                  <h3>{w.term}</h3>
                  <p>{w.meaning_tr}</p>
                </div>
                <span className="level-pill">Level {w.level ?? "-"}</span>
              </div>
              <div className="word-meta">
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
    </section>  );
}
