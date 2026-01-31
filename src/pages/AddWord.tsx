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

  return (
    <div style={{ maxWidth: 520 }}>
      <h2>Add Word</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label>
          Term
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            placeholder="take off"
          />
        </label>

        <label>
          TR Meaning
          <input
            value={meaningTr}
            onChange={(e) => setMeaningTr(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            placeholder="havalanmak"
          />
        </label>

        <label>
          Level (1-5)
          <input
            type="number"
            min={1}
            max={5}
            value={level}
            onChange={(e) => setLevel(e.target.value === "" ? "" : Number(e.target.value))}
            style={{ width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <button style={{ padding: 12, cursor: "pointer" }}>Save</button>
      </form>

      {msg && (
        <pre style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
          {msg}
        </pre>
      )}
    </div>
  );
}
