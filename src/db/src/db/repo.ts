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

  await db.execute(
    `INSERT INTO word_entries
     (id, term, meaning_tr, meaning_en, example_en, part_of_speech, level, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.term.trim(),
      input.meaning_tr.trim(),
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
