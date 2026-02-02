import { useEffect, useState } from "react";
import { getCardsByIds, getCardsByLevelRange, getDueCards, reviewCard } from "../db/repo";
import type { DueCard } from "../db/repo";

const UNLEARNED_STORAGE_KEY = "review.unlearnedIds";
const DIRECTION_STORAGE_KEY = "review.direction";

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

function readDirection(): "EN->TR" | "TR->EN" {
  if (typeof window === "undefined") return "EN->TR";
  const raw = window.localStorage.getItem(DIRECTION_STORAGE_KEY);
  return raw === "TR->EN" ? "TR->EN" : "EN->TR";
}

function persistDirection(next: "EN->TR" | "TR->EN") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DIRECTION_STORAGE_KEY, next);
}

export default function Review() {
  const [cards, setCards] = useState<DueCard[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [unlearnedIds, setUnlearnedIds] = useState<string[]>([]);
  const [direction, setDirection] = useState<"EN->TR" | "TR->EN">("EN->TR");
  const [showAnswer, setShowAnswer] = useState(false);


  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await getDueCards(50);
      setCards(res);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
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
      setErr(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  async function loadByLevel(minLevel: number, maxLevel: number) {
    setErr("");
    setLoading(true);
    try {
      const res = await getCardsByLevelRange(minLevel, maxLevel, 50);
      setCards(res);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  const current = cards[0];
  
  useEffect(() => {
    const savedIds = readUnlearnedIds();
    setUnlearnedIds(savedIds);
    setDirection(readDirection());
    load();
  }, []);

  useEffect(() => {
    setShowAnswer(false);
  }, [current?.id]);


  async function grade(g: 0 | 3 | 5) {
    if (!current) return;
    try {
      await reviewCard(current.id, g, direction);
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
      setErr(e?.message ?? "Review error");
    }
  }

  const unlearnedCount = unlearnedIds.length;

  function handleDirectionChange(next: "EN->TR" | "TR->EN") {
    setDirection(next);
    persistDirection(next);
  }


  return (
    <section className="page">
      <header className="page-header">
        <h2 className="page-title">Review Time</h2>
        <p className="page-subtitle">Quickly review your daily cards.</p>
      </header>

      <div className="status-row">
        <div className="status-pill">
          Due: <strong>{cards.length}</strong> {loading ? "• loading..." : ""}
        </div>
        <div className="status-actions">
          <div className="status-pill">
            Unlearned: <strong>{unlearnedCount}</strong>
          </div>
          <button
            className="button ghost"
            onClick={unlearnedCount > 0 ? loadUnlearned : load}
            disabled={loading}
          >
            Remember
          </button>
        </div>
      </div>

       <div className="status-actions">
          <span className="learn-label">Practice</span>
          <button
            className="button ghost"
            onClick={() => loadByLevel(1, 2)}
            disabled={loading}
          >
            Easy (1-2)
          </button>
          <button
            className="button ghost"
            onClick={() => loadByLevel(3, 4)}
            disabled={loading}
          >
            Medium (3-4)
          </button>
          <button
            className="button ghost"
            onClick={() => loadByLevel(5, 5)}
            disabled={loading}
          >
            Hard (5)
          </button>
        </div>

      {err && <p className="error-text">{err}</p>}

      {!current ? (
        <div className="card empty-state">
          No due cards today ✅
          <p>Add new words to build your practice flow.</p>
        </div>
      ) : (
        <div className="card review-card">
          <div className="review-direction">{direction.replace("->", " → ")}</div>
          <div className="review-prompt">
            {direction === "EN->TR" ? current.term : current.meaning_tr}
          </div>
          <div className="review-answer">
            <span>{direction === "EN->TR" ? "Turkish:" : "English:"}</span>{" "}
            {showAnswer ? (
              direction === "EN->TR" ? current.meaning_tr : current.term
            ) : (
              <button
                type="button"
                className="button ghost"
                onClick={() => setShowAnswer(true)}
              >
                See
              </button>
            )}
          </div>

          <div className="button-row">
            <button
              onClick={() => handleDirectionChange("EN->TR")}
              className={`button ${direction === "EN->TR" ? "primary" : "ghost"}`}
            >
              EN → TR
            </button>
            <button
              onClick={() => handleDirectionChange("TR->EN")}
              className={`button ${direction === "TR->EN" ? "primary" : "ghost"}`}
            >
              TR → EN
            </button>
          </div>

          <div className="button-row">
            <button onClick={() => grade(0)} className="button danger">
              Forgot (0)
            </button>
            <button onClick={() => grade(3)} className="button warning">
              Hard (3)
            </button>
            <button onClick={() => grade(5)} className="button success">
              Easy (5)
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
