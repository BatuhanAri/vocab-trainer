import { useEffect, useState } from "react";
import { listWords } from "../db/repo";
import type { WordEntry } from "../db/repo";


export default function Library() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<WordEntry[]>([]);
  const [err, setErr] = useState<string>("");

  async function load(query?: string) {
    setErr("");
    try {
      const res = await listWords(query);
      setItems(res);
    } catch (e: any) {
      setErr(e?.message ?? "Hata");
    }
  }

  useEffect(() => {
    load("");
  }, []);

  return (
    <div>
      <h2>Library</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ara: term veya TR anlam"
          style={{ padding: 10, width: 360 }}
        />
        <button onClick={() => load(q)} style={{ padding: 10, cursor: "pointer" }}>
          Search
        </button>
        <button onClick={() => { setQ(""); load(""); }} style={{ padding: 10, cursor: "pointer" }}>
          Reset
        </button>
      </div>

      <div style={{ marginBottom: 10, opacity: 0.8 }}>
        Total: {items.length}
      </div>

      {err && <p>{err}</p>}

      <div style={{ display: "grid", gap: 8 }}>
        {items.map((w) => (
          <div
            key={w.id}
            style={{
              padding: 12,
              border: "1px solid #ddd",
              borderRadius: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>{w.term}</div>
            <div style={{ opacity: 0.85 }}>{w.meaning_tr}</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              level: {w.level ?? "-"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
