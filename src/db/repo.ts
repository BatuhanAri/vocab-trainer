import { v4 as uuidv4 } from "uuid";
import { getDb } from "./db";

export type WordEntry = {
  id: string;
  term: string;
  meaning_tr: string;
  meaning_en?: string | null;
  example_en?: string | null;
  part_of_speech?: string | null;
  level?: number | null;
  notes?: string | null;
  created_at: number;
  updated_at: number;
};

export async function addWord(input: Omit<WordEntry, "id" | "created_at" | "updated_at">) {
  const db = await getDb();
  const now = Date.now();
  const id = uuidv4();
  const normalizedTerm = input.term.trim();
  const normalizedMeaningTr = input.meaning_tr.trim();

  const existing = await db.select<Array<{ id: string }>>(
    `SELECT id FROM word_entries WHERE lower(term) = lower(?) LIMIT 1`,
    [normalizedTerm]
  );
  if (existing.length > 0) {
    throw new Error("Bu terim zaten ekli.");
  }

  await db.execute(
    `INSERT INTO word_entries
     (id, term, meaning_tr, meaning_en, example_en, part_of_speech, level, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      normalizedTerm,
      normalizedMeaningTr,
      input.meaning_en ?? null,
      input.example_en ?? null,
      input.part_of_speech ?? null,
      input.level ?? null,
      input.notes ?? null,
      now,
      now,
    ]
  );

  // create initial srs state (due now)
  await db.execute(
    `INSERT INTO srs_state (word_entry_id, ease, interval_days, repetitions, due_at, lapses, last_reviewed_at)
     VALUES (?, 2.5, 0, 0, ?, 0, NULL)`,
    [id, now]
  );

  return id;
}

export async function listWords(q?: string): Promise<WordEntry[]> {
  const db = await getDb();
  const query = (q ?? "").trim();
  if (!query) {
    return await db.select<WordEntry[]>(
      `SELECT * FROM word_entries ORDER BY updated_at DESC`
    );
  }
  return await db.select<WordEntry[]>(
    `SELECT * FROM word_entries
     WHERE term LIKE ? OR meaning_tr LIKE ?
     ORDER BY updated_at DESC`,
    [`%${query}%`, `%${query}%`]
  );
}

export async function deleteWord(id: string) {
  const db = await getDb();
  await db.execute(`DELETE FROM word_entries WHERE id = ?`, [id]);
}

export type DueCard = WordEntry & {
  due_at: number;
  ease: number;
  interval_days: number;
  repetitions: number;
  lapses: number;
};

export async function getDueCards(limit = 50): Promise<DueCard[]> {
  const db = await getDb();
  const now = Date.now();
  return await db.select<DueCard[]>(
    `SELECT w.*, s.due_at, s.ease, s.interval_days, s.repetitions, s.lapses
     FROM srs_state s
     JOIN word_entries w ON w.id = s.word_entry_id
     WHERE s.due_at <= ?
     ORDER BY s.due_at ASC
     LIMIT ?`,
    [now, limit]
  );
}
export async function getCardsByLevelRange(
  minLevel: number,
  maxLevel: number,
  limit = 50
): Promise<DueCard[]> {
  const db = await getDb();
  return await db.select<DueCard[]>(
    `SELECT w.*, s.due_at, s.ease, s.interval_days, s.repetitions, s.lapses
     FROM srs_state s
     JOIN word_entries w ON w.id = s.word_entry_id
     WHERE w.level BETWEEN ? AND ?
     ORDER BY s.due_at ASC
     LIMIT ?`,
    [minLevel, maxLevel, limit]
  );
}
export async function getCardsByIds(ids: string[]): Promise<DueCard[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const placeholders = ids.map(() => "?").join(", ");
  return await db.select<DueCard[]>(
    `SELECT w.*, s.due_at, s.ease, s.interval_days, s.repetitions, s.lapses
     FROM srs_state s
     JOIN word_entries w ON w.id = s.word_entry_id
     WHERE w.id IN (${placeholders})
     ORDER BY s.due_at ASC`,
    ids
  );
}
export async function reviewCard(
  wordId: string,
  grade: 0 | 3 | 5,
  direction: "TR->EN" | "EN->TR"
) {
  const db = await getDb();
  const now = Date.now();

  // mevcut state'i al
  const rows = await db.select<
    Array<{ ease: number; interval_days: number; repetitions: number; lapses: number }>
  >(
    `SELECT ease, interval_days, repetitions, lapses
     FROM srs_state
     WHERE word_entry_id = ?
     LIMIT 1`,
    [wordId]
  );

  if (!rows.length) {
    throw new Error("SRS state bulunamadı");
  }

  let { ease, interval_days, repetitions, lapses } = rows[0];

  // Basit SM-2 benzeri güncelleme
  if (grade === 0) {
    lapses += 1;
    repetitions = 0;
    interval_days = 1;
    ease = Math.max(1.3, ease - 0.2);
  } else if (grade === 3) {
    repetitions += 1;
    interval_days = Math.max(1, interval_days === 0 ? 1 : Math.round(interval_days * 1.6));
    ease = Math.max(1.3, ease - 0.05);
  } else {
    repetitions += 1;
    interval_days = Math.max(1, interval_days === 0 ? 2 : Math.round(interval_days * ease));
    ease = Math.min(3.0, ease + 0.05);
  }

  const due_at = now + interval_days * 24 * 60 * 60 * 1000;

  await db.execute(
    `UPDATE srs_state
     SET ease = ?, interval_days = ?, repetitions = ?, lapses = ?, due_at = ?, last_reviewed_at = ?
     WHERE word_entry_id = ?`,
    [ease, interval_days, repetitions, lapses, due_at, now, wordId]
  );

  // İstersen review log da atarsın (opsiyonel)
  await db.execute(
    `INSERT INTO review_log (word_entry_id, direction, grade, reviewed_at)
     VALUES (?, ?, ?, ?)`,
    [wordId, direction, grade, now]
  );
}
