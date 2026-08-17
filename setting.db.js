import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('@renpwn/termux-sqlite3');
import path from "path";
import { ensureDatabase, DEFAULT_DB_PATH } from "./mt/download.js";

const DB_PATH = process.env.BIBLE_DB_PATH || path.join(process.cwd(), "db/bible.db");

export async function openDB(options = {}) {
  const targetPath = options.path || DB_PATH;
  
  // Auto-download database dari GitHub Release jika belum ada di lokal
  if (options.autoDownload !== false) {
    await ensureDatabase({ dbPath: targetPath, ...options });
  }

  return new Database(targetPath, {
    timeout: 30000,
    maxRetries: 3,
    poolSize: 2,
    ...options.dbOptions
  });
}

