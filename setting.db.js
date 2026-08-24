/**
 * @fileoverview @renpwn/bible.js - Database Connector & Auto-Initializer
 * 
 * Copyright (C) 2026 RENPWN (ARDY RENDRA R) <renpwn.ch@gmail.com>
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('@renpwn/termux-sqlite3');
import path from "path";
import { ensureDatabase, DEFAULT_DB_PATH } from "./mt/download.js";

const DB_PATH = process.env.BIBLE_DB_PATH || path.join(process.cwd(), "db/bible.js.db");

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

