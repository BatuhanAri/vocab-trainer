import { useState } from "react";
import { addWord } from "../db/repo";

export default function AddWord() {
  const [term, setTerm] = useState("");
  const [meaningTr, setMeaningTr] = useState("");
  const [level, setLevel] = useState<number | "">("");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    // input validation
    // term
    // meaning_tr
    try {
      await addWord({
        term,
        meaning_tr: meaningTr,
        level: level === "" ? null : level,
        meaning_en: null,
        example_en: null,
        part_of_speech: null,
        notes: null,
      });

      setTerm("");
      setMeaningTr("");
      setLevel("");
      setMsg("Kaydedildi ✅");
    } catch (err: unknown) {
      console.error("ADD WORD ERROR (raw):", err);

      // Tauri plugin hataları bazen string gibi gelir
      if (typeof err === "string") {
        setMsg(err);
        return;
      }

      // JS Error
      if (err instanceof Error) {
        setMsg(`${err.name}: ${err.message}`);
        return;
      }

      // object ise JSON bas
      try {
        setMsg(JSON.stringify(err, null, 2));
      } catch {
        setMsg(String(err));
      }
    }
  }
  // UI
  return (
    // Add Word Page
    <section className="page">
      <header className="page-header">
        <h2 className="page-title">Yeni Kelime Ekle</h2>
        <p className="page-subtitle">Kütüphaneni düzenli ve temiz tut.</p>
      </header>
      
      <div className="card form-card">
        <form onSubmit={onSubmit} className="form-grid">
          <label className="field">
            Term
            <input
              className="input"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="take off"
            />
          </label>
          
          <label className="field">
            TR Meaning
            <input
              className="input"
              value={meaningTr}
              onChange={(e) => setMeaningTr(e.target.value)}
              placeholder="havalanmak"
            />
          </label>

          <label className="field">
            Level (1-5)
            <input
              className="input"
              type="number"
              min={1}
              max={5}
              value={level}
              onChange={(e) => setLevel(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>

          <div className="form-actions">
            <button className="button primary" type="submit">
              Save Word
            </button>
          </div>
        </form>
      </div>

      {msg && (
        <div className="toast">
          {msg}
        </div>
      )}
    </section>
  );
}
