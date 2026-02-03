import Database from "@tauri-apps/plugin-sql";
import schemaSql from "./schema.sql?raw";

let db: Database | null = null;

// Tauri SQL plugin uses: "sqlite:<path>"
const DB_URL = "sqlite:vocab.db";

// Lazy-loads the DB and ensures the schema exists.
export async function getDb(): Promise<Database> {
  if (db) return db;
  db = await Database.load(DB_URL);
  // Schema init (idempotent)
  await db.execute(schemaSql);
  return db;
}
