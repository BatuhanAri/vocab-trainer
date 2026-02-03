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
const STAGE_ANSWERING = "answering";
const STAGE_FEEDBACK = "feedback";

type Mode = "typing" | "matching" | "truefalse";
type Stage = typeof STAGE_ANSWERING | typeof STAGE_FEEDBACK;

type Option = {
  label: string;
  isCorrect: boolean;
};

type Statement = {
  meaning: string;
  isCorrect: boolean;
};

type Result = { correct: boolean };

type ProgressUpdate = {
  nextIds: string[];
  nextProgress: RememberProgress;
  feedback: string;
  feedbackType: "success" | "error";
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

// Picks a random id, optionally avoiding the current one.
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

// Applies remember progress rules and returns the next progress state and feedback.
function buildProgressUpdate(params: {
  currentId: string;
  correct: boolean;
  rememberIds: string[];
  progress: RememberProgress;
}): ProgressUpdate {
  const { currentId, correct, rememberIds, progress } = params;
  const currentCount = progress[currentId] ?? 0;
  let nextIds = [...rememberIds];
  let nextProgress: RememberProgress = { ...progress };

  if (correct) {
    const nextCount = currentCount + 1;
    if (nextCount >= REQUIRED_CORRECT) {
      nextIds = nextIds.filter((id) => id !== currentId);
      delete nextProgress[currentId];
      return {
        nextIds,
        nextProgress,
        feedback: "Üçleme tamamlandı.",
        feedbackType: "success",
      };
    }
    nextProgress[currentId] = nextCount;
    return {
      nextIds,
      nextProgress,
      feedback: "Doğru!",
      feedbackType: "success",
    };
  }

  nextProgress = resetRememberProgress(nextProgress, currentId);
  return {
    nextIds,
    nextProgress,
    feedback: "Yanlış. Tekrar 3 doğru gerekiyor.",
    feedbackType: "error",
  };
}

export default function Remember() {
  // Remember list + progress (used by buildProgressUpdate and all mode handlers).
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
  // Typing mode state (used by handleTypingSubmit/handleTypingContinue).
  const [typingResult, setTypingResult] = useState<Result | null>(null);
  const [typingStage, setTypingStage] = useState<Stage>(STAGE_ANSWERING);
  // Matching mode state (used by handleMatchingSelect/handleMatchingContinue).
  const [matchingResult, setMatchingResult] = useState<Result | null>(null);
  const [matchingStage, setMatchingStage] = useState<Stage>(STAGE_ANSWERING);
  const [matchingPendingNextId, setMatchingPendingNextId] = useState<string | undefined>();
  // True/false mode state (used by handleTrueFalseSelect/handleTrueFalseContinue).
  const [trueFalseResult, setTrueFalseResult] = useState<Result | null>(null);
  const [trueFalseStage, setTrueFalseStage] = useState<Stage>(STAGE_ANSWERING);
  const [trueFalsePendingNextId, setTrueFalsePendingNextId] = useState<string | undefined>();
  const [pendingNextId, setPendingNextId] = useState<string | undefined>();
  const typingInputRef = useRef<HTMLInputElement | null>(null);
  const continueButtonRef = useRef<HTMLButtonElement | null>(null);

  // Word lookup used by all modes to resolve the current word quickly.
  const wordMap = useMemo(() => {
    const map = new Map<string, WordEntry>();
    for (const word of words) map.set(word.id, word);
    return map;
  }, [words]);

  const currentWord = currentId ? wordMap.get(currentId) : undefined;

  // Fetches remember words and reconciles missing ids (used by initial load).
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

  // Initial load: read storage, load words, select first word.
  useEffect(() => {
    const ids = loadRememberIds();
    const storedProgress = pruneRememberProgress(loadRememberProgress(), ids);
    setRememberIds(ids);
    setProgress(storedProgress);
    saveRememberProgress(storedProgress);
    loadRememberWords(ids);
    setCurrentId(pickRandomId(ids));
  }, []);

  // If the current word is removed, move to another one unless we are in feedback.
  useEffect(() => {
    if (!currentId || rememberIds.length === 0) return;
    if (typingStage === STAGE_FEEDBACK) return;
    if (!rememberIds.includes(currentId)) {
      setCurrentId(pickRandomId(rememberIds));
    }
  }, [rememberIds, currentId, typingStage]);

  // Resets per-mode state when mode or current word changes.
  useEffect(() => {
    setFeedback("");
    setFeedbackType("");
    setInputValue("");
    setShowHint(false);
    setOptions([]);
    setStatement(null);
    setTypingResult(null);
    setPendingNextId(undefined);
    setTypingStage(STAGE_ANSWERING);
    setMatchingResult(null);
    setMatchingPendingNextId(undefined);
    setMatchingStage(STAGE_ANSWERING);
    setTrueFalseResult(null);
    setTrueFalsePendingNextId(undefined);
    setTrueFalseStage(STAGE_ANSWERING);

    if (!currentWord) return;

    // Prepare mode-specific question state.
    if (mode === "matching") {
      void prepareMatching();
    }
    if (mode === "truefalse") {
      void prepareTrueFalse();
    }
  }, [mode, currentWord?.id]);

  // Focuses the continue button when feedback is visible.
  useEffect(() => {
    if (mode !== "typing") return;
    if (typingStage === STAGE_FEEDBACK) {
      requestAnimationFrame(() => continueButtonRef.current?.focus());
    }
  }, [typingStage, mode]);

  // Prepares 1 correct + 3 random options (used by matching mode).
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

  // Prepares a true/false statement with ~50% correctness.
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

  // Persists remember ids + progress together to keep storage in sync.
  function persistState(nextIds: string[], nextProgress: RememberProgress) {
    setRememberIds(nextIds);
    setProgress(nextProgress);
    saveRememberIds(nextIds);
    saveRememberProgress(nextProgress);
  }

  // Applies progress rules for typing mode and prepares the next word.
  function applyTypingAnswer(correct: boolean) {
    if (!currentWord) return;
    const update = buildProgressUpdate({
      currentId: currentWord.id,
      correct,
      rememberIds,
      progress,
    });

    setFeedback(update.feedback);
    setFeedbackType(update.feedbackType);
    persistState(update.nextIds, update.nextProgress);
    setTypingResult({ correct });
    setTypingStage(STAGE_FEEDBACK);
    if (update.nextIds.length === 0) {
      setPendingNextId(undefined);
      return;
    }
    const nextId = pickRandomId(update.nextIds, currentWord.id);
    setPendingNextId(nextId);
  }

  // Applies progress rules for matching mode and prepares the next word.
  function applyMatchingAnswer(correct: boolean) {
    if (!currentWord) return;
    const update = buildProgressUpdate({
      currentId: currentWord.id,
      correct,
      rememberIds,
      progress,
    });

    setFeedback(update.feedback);
    setFeedbackType(update.feedbackType);
    persistState(update.nextIds, update.nextProgress);
    setMatchingResult({ correct });
    setMatchingStage(STAGE_FEEDBACK);
    if (update.nextIds.length === 0) {
      setMatchingPendingNextId(undefined);
      return;
    }
    const nextId = pickRandomId(update.nextIds, currentWord.id);
    setMatchingPendingNextId(nextId);
  }

  // Applies progress rules for true/false mode and prepares the next word.
  function applyTrueFalseAnswer(correct: boolean) {
    if (!currentWord) return;
    const update = buildProgressUpdate({
      currentId: currentWord.id,
      correct,
      rememberIds,
      progress,
    });

    setFeedback(update.feedback);
    setFeedbackType(update.feedbackType);
    persistState(update.nextIds, update.nextProgress);
    setTrueFalseResult({ correct });
    setTrueFalseStage(STAGE_FEEDBACK);
    if (update.nextIds.length === 0) {
      setTrueFalsePendingNextId(undefined);
      return;
    }
    const nextId = pickRandomId(update.nextIds, currentWord.id);
    setTrueFalsePendingNextId(nextId);
  }

  // Submits the typing answer or continues when feedback is visible (Enter key).
  async function handleTypingSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!currentWord) return;
    if (typingStage === STAGE_FEEDBACK) {
      handleTypingContinue();
      return;
    }
    if (typingStage !== STAGE_ANSWERING) return;
    if (!inputValue.trim()) return;
    const correct = normalize(inputValue) === normalize(currentWord.meaning_tr);
    applyTypingAnswer(correct);
  }

  // Advances or retries the typing question based on the last result.
  function handleTypingContinue() {
    if (typingStage !== STAGE_FEEDBACK) return;
    const wasCorrect = typingResult?.correct ?? false;
    setTypingResult(null);
    setTypingStage(STAGE_ANSWERING);
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

  // Handles a matching choice (used by option buttons).
  function handleMatchingSelect(option: Option) {
    if (matchingStage !== STAGE_ANSWERING) return;
    applyMatchingAnswer(option.isCorrect);
  }

  // Handles a true/false choice (used by truth buttons).
  function handleTrueFalseSelect(userChoice: boolean) {
    if (!statement) return;
    if (trueFalseStage !== STAGE_ANSWERING) return;
    const correct = statement.isCorrect === userChoice;
    applyTrueFalseAnswer(correct);
  }

  // Advances or retries the matching question based on the last result.
  function handleMatchingContinue() {
    if (matchingStage !== STAGE_FEEDBACK) return;
    const wasCorrect = matchingResult?.correct ?? false;
    setMatchingResult(null);
    setMatchingStage(STAGE_ANSWERING);
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

  // Advances or retries the true/false question based on the last result.
  function handleTrueFalseContinue() {
    if (trueFalseStage !== STAGE_FEEDBACK) return;
    const wasCorrect = trueFalseResult?.correct ?? false;
    setTrueFalseResult(null);
    setTrueFalseStage(STAGE_ANSWERING);
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
                if (typingStage === STAGE_FEEDBACK && e.key === "Enter") {
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
                  disabled={typingStage === STAGE_FEEDBACK}
                  ref={typingInputRef}
                />
              </label>
              <div className="status-actions">
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => setShowHint((prev) => !prev)}
                  disabled={typingStage === STAGE_FEEDBACK}
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
                {typingStage === STAGE_FEEDBACK ? (
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
                    disabled={matchingStage === STAGE_FEEDBACK}
                  >
                    {option.label}
                  </button>
                ))}
              {matchingStage === STAGE_FEEDBACK && (
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
                      disabled={trueFalseStage === STAGE_FEEDBACK}
                    >
                      Doğru
                    </button>
                    <button
                      className="button danger"
                      onClick={() => handleTrueFalseSelect(false)}
                      disabled={trueFalseStage === STAGE_FEEDBACK}
                    >
                      Yanlış
                    </button>
                    {trueFalseStage === STAGE_FEEDBACK && (
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
