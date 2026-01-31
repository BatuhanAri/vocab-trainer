import Database from "@tauri-apps/plugin-sql";
import schemaSql from "./schema.sql?raw";

let db: Database | null = null;

// Tauri SQL plugin: "sqlite:<path>"
const DB_URL = "sqlite:vocab.db";

export async function getDb(): Promise<Database> {
  if (db) return db;
  db = await Database.load(DB_URL);
  // Schema init (idempotent)
  await db.execute(schemaSql);
  return db;
}
