/**
 * @fileoverview @renpwn/bible.js - Node.js Usage Example
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

import bibleHandler from '../index.js';

async function main() {
  console.log('📖 === Contoh Penggunaan @renpwn/bible.js ===\n');

  // 1. Ambil 1 Ayat Acak (Default TB)
  const randomOne = await bibleHandler('random');
  console.log(`🎲 [Random 1] ${randomOne.book.name} ${randomOne.chapter}:${randomOne.verseRange} (${randomOne.version.toUpperCase()})`);
  console.log(`   "${randomOne.verses[0].text}"`);
  console.log(`   🔗 Tafsir: ${randomOne.verses[0].tafsir}\n`);

  // 2. Ambil Ayat Spesifik Alkitab (Yohanes 3:16)
  const yoh = await bibleHandler('Yohanes 3:16 tb');
  console.log(`✝️ [Single Verse] ${yoh.book.name} ${yoh.chapter}:${yoh.verseRange}`);
  console.log(`   "${yoh.verses[0].text}"`);
  console.log(`   🔗 Tafsir: ${yoh.verses[0].tafsir}\n`);

  // 3. Ambil Tanakh / Jewish Bible + Komentar Rabbi Rashi (Kejadian 1:1)
  const tanakh = await bibleHandler('Kej 1:1 tn+');
  console.log(`✡️ [Tanakh + Rashi] ${tanakh.book.name} (${tanakh.book.name_he}) ${tanakh.chapter}:${tanakh.verseRange}`);
  console.log(`   Ibrani : ${tanakh.verses[0].tn_he}`);
  console.log(`   Inggris: ${tanakh.verses[0].tn_en}`);
  if (tanakh.verses[0].rashi) {
    console.log(`   Rashi  : ${tanakh.verses[0].rashi[0]?.eng?.slice(0, 120)}...\n`);
  }

  // 4. Komparasi Semua Versi Terjemahan (Yohanes 1:5)
  const allVerses = await bibleHandler('Yoh 1:5 all');
  console.log(`🌐 [All Versions] ${allVerses.book.name} ${allVerses.chapter}:${allVerses.verseRange}`);
  const versions = allVerses.verses[0].versions;
  console.log(`   TB   : ${versions.tb}`);
  console.log(`   BIS  : ${versions.bis}`);
  console.log(`   NKJV : ${versions.nkjv}`);
  console.log(`   NET  : ${versions.net}\n`);

  // 5. Lookup Strong's Lexicon Ibrani & Yunani
  const hebrewLex = await bibleHandler('strong:H7225');
  console.log(`📚 [Strong H7225 - Ibrani]`);
  console.log(`   Kata     : ${hebrewLex.data.word}`);
  console.log(`   Pelafalan: ${hebrewLex.data.pronunciation}`);
  console.log(`   Definisi : ${hebrewLex.data.definition.split('\n')[0]}\n`);

  const greekLex = await bibleHandler('strong:G26');
  console.log(`📚 [Strong G26 - Yunani]`);
  console.log(`   Kata     : ${greekLex.data.word}`);
  console.log(`   Pelafalan: ${greekLex.data.pronunciation}`);
  console.log(`   Definisi : ${greekLex.data.definition.split('\n')[0]}\n`);

  // 6. Pencarian Teks / Kata Kunci (FTS5)
  const searchRes = await bibleHandler('search:kasih setia', { limit: 3 });
  console.log(`🔍 [Pencarian "kasih setia"] - Total: ${searchRes.totalResults} hasil ditemukan`);
  searchRes.results.slice(0, 3).forEach((r, idx) => {
    console.log(`   ${idx + 1}. ${r.book_name} ${r.chapter}:${r.verse} (${r.version}) -> "${r.text.slice(0, 70)}..."`);
  });
}

main().catch(console.error);
