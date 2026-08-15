import bibleHandler, { openDB, closeDB } from "../index.js";

(async () => {
  console.log("🚀 Testing @renpwn/bible.js API...");

  const tests = [
    "list",              // Daftar semua kitab
    "versi",             // Daftar versi Alkitab
    "Yohanes 3:16",      // Referensi ayat tunggal
    "Kejadian 1:1-3",    // Rentang ayat
    "1 Korintus 13:4-7", // Surat Perjanjian Baru
    "Mazmur 23",         // Satu pasal penuh
    "Mat 5:3-5 tb",      // Singkatan kitab + versi spesifik
    "strong:H7225",      // Lookup Strong Hebrew Lexicon
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
