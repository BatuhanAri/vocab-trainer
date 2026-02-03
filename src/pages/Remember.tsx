import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { WordEntry } from "../db/repo";
import { getCardsByIds, getRandomWords } from "../db/repo";
import {
  loadRememberIds,
  loadRememberProgress,
  pruneRememberProgress,
  resetRememberProgress,
  saveRememberIds,
  saveRememberProgress,
  type RememberProgress,
} from "../core/rememberStore";

const REQUIRED_CORRECT = 3;

type Mode = "typing" | "matching" | "truefalse";

type Option = {
  label: string;
  isCorrect: boolean;
};

type Statement = {
  meaning: string;
  isCorrect: boolean;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function pickRandomId(ids: string[], avoidId?: string) {
  if (ids.length === 0) return undefined;
  if (ids.length === 1) return ids[0];
  let next = ids[Math.floor(Math.random() * ids.length)];
  if (avoidId && ids.length > 1) {
    while (next === avoidId) {
      next = ids[Math.floor(Math.random() * ids.length)];
    }
  }
  return next;
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export default function Remember() {
  const [rememberIds, setRememberIds] = useState<string[]>([]);
  const [progress, setProgress] = useState<RememberProgress>({});
  const [words, setWords] = useState<WordEntry[]>([]);
  const [currentId, setCurrentId] = useState<string | undefined>();
  const [mode, setMode] = useState<Mode>("typing");
  const [loading, setLoading] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [err, setErr] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | "">("");
  const [showHint, setShowHint] = useState(false);
  const [typingResult, setTypingResult] = useState<null | { correct: boolean }>(null);
  const [typingStage, setTypingStage] = useState<"answering" | "feedback">("answering");
  const [matchingResult, setMatchingResult] = useState<null | { correct: boolean }>(null);
  const [matchingStage, setMatchingStage] = useState<"answering" | "feedback">("answering");
  const [matchingPendingNextId, setMatchingPendingNextId] = useState<string | undefined>();
  const [trueFalseResult, setTrueFalseResult] = useState<null | { correct: boolean }>(null);
  const [trueFalseStage, setTrueFalseStage] = useState<"answering" | "feedback">("answering");
  const [trueFalsePendingNextId, setTrueFalsePendingNextId] = useState<string | undefined>();
  const [pendingNextId, setPendingNextId] = useState<string | undefined>();
  const typingInputRef = useRef<HTMLInputElement | null>(null);
  const continueButtonRef = useRef<HTMLButtonElement | null>(null);

  const wordMap = useMemo(() => {
    const map = new Map<string, WordEntry>();
    for (const word of words) map.set(word.id, word);
    return map;
  }, [words]);

  const currentWord = currentId ? wordMap.get(currentId) : undefined;

  async function loadRememberWords(ids: string[]) {
    if (ids.length === 0) {
      setWords([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getCardsByIds(ids);
      setWords(res);
      const fetchedIds = new Set(res.map((card) => card.id));
      if (fetchedIds.size !== ids.length) {
        const nextIds = ids.filter((id) => fetchedIds.has(id));
        const nextProgress = pruneRememberProgress(progress, nextIds);
        persistState(nextIds, nextProgress);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const ids = loadRememberIds();
    const storedProgress = pruneRememberProgress(loadRememberProgress(), ids);
    setRememberIds(ids);
    setProgress(storedProgress);
    saveRememberProgress(storedProgress);
    loadRememberWords(ids);
    setCurrentId(pickRandomId(ids));
  }, []);

  useEffect(() => {
    if (!currentId || rememberIds.length === 0) return;
    if (typingStage === "feedback") return;
    if (!rememberIds.includes(currentId)) {
      setCurrentId(pickRandomId(rememberIds));
    }
  }, [rememberIds, currentId, typingStage]);

  useEffect(() => {
    setFeedback("");
    setFeedbackType("");
    setInputValue("");
    setShowHint(false);
    setOptions([]);
    setStatement(null);
    setTypingResult(null);
    setPendingNextId(undefined);
    setTypingStage("answering");
    setMatchingResult(null);
    setMatchingPendingNextId(undefined);
    setMatchingStage("answering");
    setTrueFalseResult(null);
    setTrueFalsePendingNextId(undefined);
    setTrueFalseStage("answering");

    if (!currentWord) return;

    if (mode === "matching") {
      void prepareMatching();
    }
    if (mode === "truefalse") {
      void prepareTrueFalse();
    }
  }, [mode, currentWord?.id]);

  useEffect(() => {
    if (mode !== "typing") return;
    if (typingStage === "feedback") {
      requestAnimationFrame(() => continueButtonRef.current?.focus());
    }
  }, [typingStage, mode]);

  async function prepareMatching() {
    if (!currentWord) return;
    setQuestionLoading(true);
    try {
      const wrongWords = await getRandomWords(3, currentWord.id);
      const wrongOptions = wrongWords
        .filter((word) => word.id !== currentWord.id)
        .map((word) => ({ label: word.meaning_tr, isCorrect: false }));
      const nextOptions = shuffle([
        { label: currentWord.meaning_tr, isCorrect: true },
        ...wrongOptions,
      ]).slice(0, 4);
      if (nextOptions.length < 4) {
        setErr("Eşleştirme için en az 4 kelime olmalı.");
      } else {
        setErr("");
      }
      setOptions(nextOptions);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setQuestionLoading(false);
    }
  }

  async function prepareTrueFalse() {
    if (!currentWord) return;
    setQuestionLoading(true);
    try {
      const shouldBeCorrect = Math.random() < 0.5;
      if (shouldBeCorrect) {
        setStatement({ meaning: currentWord.meaning_tr, isCorrect: true });
      } else {
        const wrongWords = await getRandomWords(1, currentWord.id);
        if (wrongWords.length === 0) {
          setStatement({ meaning: currentWord.meaning_tr, isCorrect: true });
          return;
        }
        setStatement({ meaning: wrongWords[0].meaning_tr, isCorrect: false });
      }
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setQuestionLoading(false);
    }
  }

  function persistState(nextIds: string[], nextProgress: RememberProgress) {
    setRememberIds(nextIds);
    setProgress(nextProgress);
    saveRememberIds(nextIds);
    saveRememberProgress(nextProgress);
  }

  function applyTypingAnswer(correct: boolean) {
    if (!currentWord) return;
    const currentCount = progress[currentWord.id] ?? 0;
    let nextIds = [...rememberIds];
    let nextProgress: RememberProgress = { ...progress };

    if (correct) {
      const nextCount = currentCount + 1;
      if (nextCount >= REQUIRED_CORRECT) {
        nextIds = nextIds.filter((id) => id !== currentWord.id);
        delete nextProgress[currentWord.id];
        setFeedback("Üçleme tamamlandı.");
        setFeedbackType("success");
      } else {
        nextProgress[currentWord.id] = nextCount;
        setFeedback("Doğru!");
        setFeedbackType("success");
      }
    } else {
      nextProgress = resetRememberProgress(nextProgress, currentWord.id);
      setFeedback("Yanlış. Tekrar 3 doğru gerekiyor.");
      setFeedbackType("error");
    }

    persistState(nextIds, nextProgress);
    setTypingResult({ correct });
    setTypingStage("feedback");
    if (nextIds.length === 0) {
      setPendingNextId(undefined);
      return;
    }
    const nextId = pickRandomId(nextIds, currentWord.id);
    setPendingNextId(nextId);
  }

  function applyMatchingAnswer(correct: boolean) {
    if (!currentWord) return;
    const currentCount = progress[currentWord.id] ?? 0;
    let nextIds = [...rememberIds];
    let nextProgress: RememberProgress = { ...progress };

    if (correct) {
      const nextCount = currentCount + 1;
      if (nextCount >= REQUIRED_CORRECT) {
        nextIds = nextIds.filter((id) => id !== currentWord.id);
        delete nextProgress[currentWord.id];
        setFeedback("Üçleme tamamlandı.");
        setFeedbackType("success");
      } else {
        nextProgress[currentWord.id] = nextCount;
        setFeedback("Doğru!");
        setFeedbackType("success");
      }
    } else {
      nextProgress = resetRememberProgress(nextProgress, currentWord.id);
      setFeedback("Yanlış. Tekrar 3 doğru gerekiyor.");
      setFeedbackType("error");
    }

    persistState(nextIds, nextProgress);
    setMatchingResult({ correct });
    setMatchingStage("feedback");
    if (nextIds.length === 0) {
      setMatchingPendingNextId(undefined);
      return;
    }
    const nextId = pickRandomId(nextIds, currentWord.id);
    setMatchingPendingNextId(nextId);
  }

  function applyTrueFalseAnswer(correct: boolean) {
    if (!currentWord) return;
    const currentCount = progress[currentWord.id] ?? 0;
    let nextIds = [...rememberIds];
    let nextProgress: RememberProgress = { ...progress };

    if (correct) {
      const nextCount = currentCount + 1;
      if (nextCount >= REQUIRED_CORRECT) {
        nextIds = nextIds.filter((id) => id !== currentWord.id);
        delete nextProgress[currentWord.id];
        setFeedback("Üçleme tamamlandı.");
        setFeedbackType("success");
      } else {
        nextProgress[currentWord.id] = nextCount;
        setFeedback("Doğru!");
        setFeedbackType("success");
      }
    } else {
      nextProgress = resetRememberProgress(nextProgress, currentWord.id);
      setFeedback("Yanlış. Tekrar 3 doğru gerekiyor.");
      setFeedbackType("error");
    }

    persistState(nextIds, nextProgress);
    setTrueFalseResult({ correct });
    setTrueFalseStage("feedback");
    if (nextIds.length === 0) {
      setTrueFalsePendingNextId(undefined);
      return;
    }
    const nextId = pickRandomId(nextIds, currentWord.id);
    setTrueFalsePendingNextId(nextId);
  }

  async function handleTypingSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!currentWord) return;
    if (typingStage === "feedback") {
      handleTypingContinue();
      return;
    }
    if (typingStage !== "answering") return;
    if (!inputValue.trim()) return;
    const correct = normalize(inputValue) === normalize(currentWord.meaning_tr);
    applyTypingAnswer(correct);
  }

  function handleTypingContinue() {
    if (typingStage !== "feedback") return;
    const wasCorrect = typingResult?.correct ?? false;
    setTypingResult(null);
    setTypingStage("answering");
    if (wasCorrect) {
      const fallbackNextId =
        pendingNextId ?? (currentWord ? pickRandomId(rememberIds, currentWord.id) : undefined);
      setCurrentId(fallbackNextId);
      setInputValue("");
      setShowHint(false);
    } else {
      setInputValue("");
      setShowHint(false);
    }
    setFeedback("");
    setFeedbackType("");
    setPendingNextId(undefined);
    requestAnimationFrame(() => typingInputRef.current?.focus());
  }

  function handleMatchingSelect(option: Option) {
    if (matchingStage !== "answering") return;
    applyMatchingAnswer(option.isCorrect);
  }

  function handleTrueFalseSelect(userChoice: boolean) {
    if (!statement) return;
    if (trueFalseStage !== "answering") return;
    const correct = statement.isCorrect === userChoice;
    applyTrueFalseAnswer(correct);
  }

  function handleMatchingContinue() {
    if (matchingStage !== "feedback") return;
    const wasCorrect = matchingResult?.correct ?? false;
    setMatchingResult(null);
    setMatchingStage("answering");
    if (wasCorrect) {
      const fallbackNextId =
        matchingPendingNextId ??
        (currentWord ? pickRandomId(rememberIds, currentWord.id) : undefined);
      setCurrentId(fallbackNextId);
    }
    setFeedback("");
    setFeedbackType("");
    setMatchingPendingNextId(undefined);
  }

  function handleTrueFalseContinue() {
    if (trueFalseStage !== "feedback") return;
    const wasCorrect = trueFalseResult?.correct ?? false;
    setTrueFalseResult(null);
    setTrueFalseStage("answering");
    if (wasCorrect) {
      const fallbackNextId =
        trueFalsePendingNextId ??
        (currentWord ? pickRandomId(rememberIds, currentWord.id) : undefined);
      setCurrentId(fallbackNextId);
    }
    setFeedback("");
    setFeedbackType("");
    setTrueFalsePendingNextId(undefined);
  }

  const currentProgress = currentWord ? progress[currentWord.id] ?? 0 : 0;

  return (
    <section className="page">
      <header className="page-header">
        <h2 className="page-title">Remember Mode</h2>
        <p className="page-subtitle">
          Yaz, eşleştir veya doğru-yanlış ile kelimeleri pekiştir.
        </p>
      </header>

      <div className="status-row">
        <div className="status-pill">
          Remember: <strong>{rememberIds.length}</strong> {loading ? "• yükleniyor" : ""}
        </div>
        <div className="status-pill">
          Hedef: <strong>{REQUIRED_CORRECT}</strong> doğru
        </div>
      </div>

      <div className="mode-tabs">
        <button
          className={`button ${mode === "typing" ? "primary" : "ghost"}`}
          onClick={() => setMode("typing")}
        >
          Yazarak
        </button>
        <button
          className={`button ${mode === "matching" ? "primary" : "ghost"}`}
          onClick={() => setMode("matching")}
        >
          Eşleştirme
        </button>
        <button
          className={`button ${mode === "truefalse" ? "primary" : "ghost"}`}
          onClick={() => setMode("truefalse")}
        >
          Doğru / Yanlış
        </button>
      </div>

      {err && <p className="error-text">{err}</p>}

      {!currentWord ? (
        <div className="card empty-state">
          Remember listesi boş ✅
          <p>Review ekranında yanlış yaptıkların buraya düşer.</p>
        </div>
      ) : (
        <div className="card remember-card">
          <div className="status-row">
            <div className="review-prompt">{currentWord.term}</div>
            <div className="status-pill">
              Doğru: <strong>{currentProgress}</strong>/{REQUIRED_CORRECT}
            </div>
          </div>

          {feedback && (
            <div className={`toast ${feedbackType === "success" ? "toast-success" : "toast-error"}`}>
              {feedback}
            </div>
          )}

          {mode === "typing" && (
            <form
              className="form-grid"
              onSubmit={handleTypingSubmit}
              onKeyDown={(e) => {
                if (typingStage === "feedback" && e.key === "Enter") {
                  e.preventDefault();
                  handleTypingContinue();
                }
              }}
            >
              <label className="field">
                Türkçe anlamını yaz
                <input
                  key={`${currentWord.id}-${typingStage}`}
                  className="input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Örn: ..."
                  disabled={typingStage === "feedback"}
                  ref={typingInputRef}
                />
              </label>
              <div className="status-actions">
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => setShowHint((prev) => !prev)}
                  disabled={typingStage === "feedback"}
                >
                  İpucu
                </button>
                {showHint && (
                  <span className="hint-text">
                    {`İlk harf: ${currentWord.meaning_tr.charAt(0)} • Uzunluk: ${currentWord.meaning_tr.length}`}
                  </span>
                )}
              </div>
              <div className="form-actions">
                {typingStage === "feedback" ? (
                  <button
                    className="button primary"
                    type="submit"
                    onClick={handleTypingContinue}
                    ref={continueButtonRef}
                  >
                    {typingResult?.correct ? "Devam" : "Tekrar et"}
                  </button>
                ) : (
                  <button className="button primary" type="submit">
                    Kontrol Et
                  </button>
                )}
              </div>
            </form>
          )}

          {mode === "matching" && (
            <div className="option-grid">
              {questionLoading && <p>Seçenekler hazırlanıyor...</p>}
              {!questionLoading &&
                options.map((option, index) => (
                  <button
                    key={`${option.label}-${index}`}
                    className="button ghost"
                    onClick={() => handleMatchingSelect(option)}
                    disabled={matchingStage === "feedback"}
                  >
                    {option.label}
                  </button>
                ))}
              {matchingStage === "feedback" && (
                <button
                  className="button primary"
                  type="button"
                  onClick={handleMatchingContinue}
                >
                  {matchingResult?.correct ? "Devam" : "Tekrar et"}
                </button>
              )}
            </div>
          )}

          {mode === "truefalse" && (
            <div className="truth-card">
              {questionLoading && <p>Hazırlanıyor...</p>}
              {!questionLoading && statement && (
                <>
                  <p className="review-answer">
                    <span>Türkçe:</span> {statement.meaning}
                  </p>
                  <div className="truth-row">
                    <button
                      className="button success"
                      onClick={() => handleTrueFalseSelect(true)}
                      disabled={trueFalseStage === "feedback"}
                    >
                      Doğru
                    </button>
                    <button
                      className="button danger"
                      onClick={() => handleTrueFalseSelect(false)}
                      disabled={trueFalseStage === "feedback"}
                    >
                      Yanlış
                    </button>
                    {trueFalseStage === "feedback" && (
                      <button
                        className="button primary"
                        type="button"
                        onClick={handleTrueFalseContinue}
                      >
                        {trueFalseResult?.correct ? "Devam" : "Tekrar et"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
