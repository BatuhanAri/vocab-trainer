import { useEffect, useState } from "react";
import { getCardsByIds, getCardsByLevelRange, getDueCards, reviewCard } from "../db/repo";
import type { DueCard } from "../db/repo";

const UNLEARNED_STORAGE_KEY = "review.unlearnedIds";

function readUnlearnedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(UNLEARNED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === "string");
  } catch {
    return [];
  }
}

function persistUnlearnedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(UNLEARNED_STORAGE_KEY, JSON.stringify(ids));
}

export default function Review() {
  const [cards, setCards] = useState<DueCard[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [unlearnedIds, setUnlearnedIds] = useState<string[]>([]);


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

    async function loadUnlearned() {
    setErr("");
    setLoading(true);
    try {
      const res = await getCardsByIds(unlearnedIds);
      setCards(res);
      const fetchedIds = new Set(res.map((card) => card.id));
      if (fetchedIds.size !== unlearnedIds.length) {
        const nextIds = unlearnedIds.filter((id) => fetchedIds.has(id));
        setUnlearnedIds(nextIds);
        persistUnlearnedIds(nextIds);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Hata");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const savedIds = readUnlearnedIds();
    setUnlearnedIds(savedIds);
    load();
  }, []);

  async function loadByLevel(minLevel: number, maxLevel: number) {
    setErr("");
    setLoading(true);
    try {
      const res = await getCardsByLevelRange(minLevel, maxLevel, 50);
      setCards(res);
    } catch (e: any) {
      setErr(e?.message ?? "Hata");
    } finally {
      setLoading(false);
    }
  }

  const current = cards[0];

  async function grade(g: 0 | 3 | 5) {
    if (!current) return;
    try {
      await reviewCard(current.id, g, "EN->TR");
      setCards((prev) => prev.slice(1)); // UI'den düşür
            setUnlearnedIds((prev) => {
        const next = new Set(prev);
        if (g === 5) {
          next.delete(current.id);
        } else {
          next.add(current.id);
        }
        const ids = Array.from(next);
        persistUnlearnedIds(ids);
        return ids;
      });
    } catch (e: any) {
      setErr(e?.message ?? "Review hata");
    }
  }

  const unlearnedCount = unlearnedIds.length;


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
        <div className="status-actions">
          <div className="status-pill">
            Öğrenilmemiş: <strong>{unlearnedCount}</strong>
          </div>
          <button
            className="button ghost"
            onClick={unlearnedCount > 0 ? loadUnlearned : load}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

       <div className="status-actions">
          <span className="learn-label">Öğren</span>
          <button
            className="button ghost"
            onClick={() => loadByLevel(1, 2)}
            disabled={loading}
          >
            Kolay (1-2)
          </button>
          <button
            className="button ghost"
            onClick={() => loadByLevel(3, 4)}
            disabled={loading}
          >
            Orta (3-4)
          </button>
          <button
            className="button ghost"
            onClick={() => loadByLevel(5, 5)}
            disabled={loading}
          >
            Zor (5)
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
          <div className="review-direction">EN → TR</div>
          <div className="review-prompt">{current.term}</div>
          <div className="review-answer">
            <span>Türkçe:</span> {current.meaning_tr}

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
