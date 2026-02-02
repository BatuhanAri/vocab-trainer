import { useState } from "react";
import { addWord, addWordsBatch, findExistingTerms } from "../db/repo";

export default function AddWord() {
  const [term, setTerm] = useState("");
  const [meaningTr, setMeaningTr] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState<number | "">("");
  const [msg, setMsg] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkMsg, setBulkMsg] = useState("");
  const [bulkRejectedLines, setBulkRejectedLines] = useState<string[]>([]);

  function cleanText(value: string) {
    return value.replace(/^[\s\u00A0]+|[\s\u00A0]+$/g, "");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    // input validation
    const normalizedTerm = cleanText(term);
    const normalizedMeaningTr = cleanText(meaningTr);
    const normalizedCategory = cleanText(category);
    if (!normalizedTerm || !normalizedMeaningTr || !normalizedCategory || level === "") {
      setMsg("Term, Turkish Meaning, Category, and Level are required.");
      return;
    }
    try {
      await addWord({
        term: normalizedTerm,
        meaning_tr: normalizedMeaningTr,
        part_of_speech: normalizedCategory,
        level,
        meaning_en: null,
        example_en: null,
        notes: null,
      });

      setTerm("");
      setMeaningTr("");
      setCategory("");
      setLevel("");
      setMsg("Saved ✅");
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

  function parseBulkLines(raw: string) {
    const errors: string[] = [];
    const entries: Array<{
      lineNo: number;
      termLower: string;
      term: string;
      meaning_tr: string;
      part_of_speech: string;
      level: number;
      meaning_en: null;
      example_en: null;
      notes: null;
    }> = [];

    const lines = raw
      .split("\n")
      .map((line) => cleanText(line))
      .filter((line) => line.length > 0);

    const seen = new Set<string>();

    lines.forEach((line, index) => {
      const lineNo = index + 1;
      const parts = line.split("|").map((part) => cleanText(part));
      if (parts.length !== 4) {
        errors.push(`Line ${lineNo}: Format must be term | tr | category | level.`);
        return;
      }

      const [termRaw, trRaw, categoryRaw, levelRaw] = parts;
      if (!termRaw || !trRaw || !categoryRaw || !levelRaw) {
        errors.push(`Line ${lineNo}: All fields are required.`);
        return;
      }

      const levelParsed = Number(levelRaw);
      if (!Number.isInteger(levelParsed) || levelParsed < 1 || levelParsed > 5) {
        errors.push(`Line ${lineNo}: Level must be an integer between 1 and 5.`);
        return;
      }

      const dedupeKey = termRaw.toLowerCase();
      if (seen.has(dedupeKey)) {
        errors.push(`Line ${lineNo}: Duplicate term in the list.`);
        return;
      }
      seen.add(dedupeKey);

      entries.push({
        lineNo,
        termLower: dedupeKey,
        term: termRaw,
        meaning_tr: trRaw,
        part_of_speech: categoryRaw,
        level: levelParsed,
        meaning_en: null,
        example_en: null,
        notes: null,
      });
    });

    return { entries, errors };
  }

  async function onBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBulkMsg("");
    setBulkErrors([]);
    setBulkRejectedLines([]);

    const { entries, errors } = parseBulkLines(bulkText);
    if (errors.length > 0) {
      setBulkErrors(errors);
      setBulkMsg(`Nothing was added. ${errors.length} invalid lines.`);
      const rejected = errors
        .map((err) => {
          const match = err.match(/Line\s+(\d+)/);
          return match ? Number(match[1]) : null;
        })
        .filter((value): value is number => value !== null)
        .map((lineNo) => bulkText.split("\n")[lineNo - 1])
        .filter((line): line is string => typeof line === "string");
      setBulkRejectedLines(rejected);
      return;
    }
    if (entries.length === 0) {
      setBulkErrors(["Add at least one line."]);
      setBulkMsg("Nothing was added. 0 valid lines.");
      return;
    }

    try {
      const existing = await findExistingTerms(entries.map((entry) => entry.term));
      if (existing.length > 0) {
        const existingSet = new Set(existing);
        const existingErrors = entries
          .filter((entry) => existingSet.has(entry.termLower))
          .map((entry) => `Line ${entry.lineNo}: This term already exists.`);
        setBulkErrors(existingErrors);
        setBulkMsg(`Nothing was added. ${existingErrors.length} lines already exist.`);
        const rejected = entries
          .filter((entry) => existingSet.has(entry.termLower))
          .map((entry) => bulkText.split("\n")[entry.lineNo - 1])
          .filter((line): line is string => typeof line === "string");
        setBulkRejectedLines(rejected);
        return;
      }

      const addedCount = await addWordsBatch(entries);
      setBulkMsg(`${addedCount} words added ✅`);
      setBulkText("");
    } catch (err: unknown) {
      console.error("BULK ADD ERROR (raw):", err);

      const rawMessage = typeof err === "string" ? err : err instanceof Error ? err.message : "";
      if (rawMessage.startsWith("Already existing terms:")) {
        const termPart = rawMessage.replace("Already existing terms:", "").trim();
        const terms = termPart ? termPart.split(",").map((t) => t.trim().toLowerCase()) : [];
        if (terms.length > 0) {
          const existingSet = new Set(terms);
          const existingErrors = entries
            .filter((entry) => existingSet.has(entry.termLower))
            .map((entry) => `Line ${entry.lineNo}: This term already exists.`);
          setBulkErrors(existingErrors);
          setBulkMsg(`Nothing was added. ${existingErrors.length} lines already exist.`);
          const rejected = entries
            .filter((entry) => existingSet.has(entry.termLower))
            .map((entry) => bulkText.split("\n")[entry.lineNo - 1])
            .filter((line): line is string => typeof line === "string");
          setBulkRejectedLines(rejected);
          return;
        }
      }
      if (rawMessage.startsWith("Duplicate terms in the list:")) {
        setBulkMsg("Nothing was added. Duplicate terms in the list.");
        setBulkRejectedLines([]);
        return;
      }
      if (rawMessage) {
        setBulkMsg(rawMessage);
        return;
      }

      try {
        setBulkMsg(JSON.stringify(err, null, 2));
      } catch {
        setBulkMsg(String(err));
      }
    }
  }

  function handleCopyRejected() {
    if (bulkRejectedLines.length === 0) return;
    const text = bulkRejectedLines.join("\n");
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        setBulkMsg("Copy failed. Please try again.");
      });
    } else {
      setBulkMsg("Clipboard is not available.");
    }
  }
  // UI
  return (
    // Add Word Page
    <section className="page">
      <header className="page-header">
        <h2 className="page-title">Add New Word</h2>
        <p className="page-subtitle">Keep your library clean and organized.</p>
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
            Turkish Meaning
            <input
              className="input"
              value={meaningTr}
              onChange={(e) => setMeaningTr(e.target.value)}
              placeholder="e.g. Turkish meaning"
            />
          </label>

          <label className="field">
            Category
            <input
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="phrasal"
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

      {msg && <div className="toast">{msg}</div>}

      <div className="card form-card">
        <form onSubmit={onBulkSubmit} className="form-grid">
          <label className="field">
            Bulk Add (term | tr | category | level)
            <textarea
              className="input"
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="take off | Turkish meaning | phrasal | 3"
            />
          </label>

          <div className="form-actions">
            <button
              className="button primary"
              type="submit"
              disabled={bulkText.trim().length === 0}
            >
              Save in Bulk
            </button>
          </div>
        </form>
      </div>

      {bulkErrors.length > 0 && (
        <div className="toast">
          <div className="form-actions">
            <button className="button ghost" type="button" onClick={handleCopyRejected}>
              Copy rejected lines
            </button>
          </div>
          <ul>
            {bulkErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {bulkMsg && (
        <div className="toast">
          {bulkMsg}
        </div>
      )}
    </section>
  );
}
