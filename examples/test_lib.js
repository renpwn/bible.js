/**
 * @fileoverview @renpwn/bible.js - Test Suite
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

import bibleHandler, { openDB, closeDB } from "../index.js";

(async () => {
  console.log("🚀 Testing @renpwn/bible.js API...");

  const tests = [
    "list",              // Daftar semua kitab
    "versi",             // Daftar versi Alkitab
    "Yohanes 3:16",      // Referensi ayat tunggal (TB + link tafsir)
    "Kejadian 1:1-3",    // Rentang ayat
    "Kej 1:1 tn+",       // Tanakh + Rashi Commentary
    "1 Korintus 13:4-7", // Surat Perjanjian Baru
    "Mazmur 23",         // Satu pasal penuh
    "Mat 5:3-5 tb",      // Singkatan kitab + versi spesifik
    "strong:H7225",      // Lookup Strong Hebrew Lexicon
    "strong:G26",        // Lookup Strong Greek Lexicon
    "search:kasih",      // Pencarian kata
  ];

  // Buka koneksi database 1x (akan otomatis download jika DB belum ada)
  const db = await openDB();

  for (const t of tests) {
    console.log("\n==============================");
    console.log("INPUT:", JSON.stringify(t));
    try {
      const res = await bibleHandler(t);
      console.log(JSON.stringify(res, null, 2));
    } catch (e) {
      console.error("ERROR:", e.message);
    }
  }

  await closeDB();
  console.log("\n✅ Test selesai!");
})();
