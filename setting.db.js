import Database from "@renpwn/termux-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "db/quran.db");

export function openDB() {
  return new Database(DB_PATH, {
    timeout: 30000,
    maxRetries: 3,
    poolSize: 2
  });
}
