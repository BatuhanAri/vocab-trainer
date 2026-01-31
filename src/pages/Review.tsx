import { useEffect, useState } from "react";
import { getDueCards, reviewCard } from "../db/repo";
import type { DueCard } from "../db/repo";


export default function Review() {
  const [cards, setCards] = useState<DueCard[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await getDueCards(50);
      setCards(res);
    } catch (e: any) {
      setErr(e?.message ?? "Hata");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const current = cards[0];

  async function grade(g: 0 | 3 | 5) {
    if (!current) return;
    try {
      await reviewCard(current.id, g, "TR->EN");
      setCards((prev) => prev.slice(1)); // UI'den düşür
    } catch (e: any) {
      setErr(e?.message ?? "Review hata");
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h2>Review</h2>

      <div style={{ marginBottom: 10, opacity: 0.8 }}>
        Due: {cards.length} {loading ? "(loading...)" : ""}
      </div>

      {err && <p>{err}</p>}

      {!current ? (
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          Bugün due kart yok ✅
          <div style={{ marginTop: 10 }}>
            <button onClick={load} style={{ padding: 10, cursor: "pointer" }}>Refresh</button>
          </div>
        </div>
      ) : (
        <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>TR → EN</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>
            {current.meaning_tr}
          </div>
          <div style={{ opacity: 0.8, marginBottom: 14 }}>
            <span style={{ fontWeight: 700 }}>Term:</span> {current.term}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => grade(0)} style={{ padding: 12, cursor: "pointer" }}>
              Unuttum (0)
            </button>
            <button onClick={() => grade(3)} style={{ padding: 12, cursor: "pointer" }}>
              Zor (3)
            </button>
            <button onClick={() => grade(5)} style={{ padding: 12, cursor: "pointer" }}>
              Kolay (5)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
