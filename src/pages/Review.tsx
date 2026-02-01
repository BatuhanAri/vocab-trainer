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
    <section className="page">
      <header className="page-header">
        <h2 className="page-title">Tekrar Zamanı</h2>
        <p className="page-subtitle">Günlük kartlarını hızlıca gözden geçir.</p>
      </header>

      <div className="status-row">
        <div className="status-pill">
          Due: <strong>{cards.length}</strong> {loading ? "• loading..." : ""}
        </div>
        <button className="button ghost" onClick={load}>
          Refresh
        </button>
      </div>

      {err && <p className="error-text">{err}</p>}

      {!current ? (
        <div className="card empty-state">
          Bugün due kart yok ✅
          <p>Yeni kelimeler ekleyerek çalışma akışını güçlendirebilirsin.</p>
        </div>
      ) : (
        <div className="card review-card">
          <div className="review-direction">TR → EN</div>
          <div className="review-prompt">{current.meaning_tr}</div>
          <div className="review-answer">
            <span>Term:</span> {current.term}

          </div>

          <div className="button-row">
            <button onClick={() => grade(0)} className="button danger">
              Unuttum (0)
            </button>
            <button onClick={() => grade(3)} className="button warning">
              Zor (3)
            </button>
            <button onClick={() => grade(5)} className="button success">
              Kolay (5)
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
