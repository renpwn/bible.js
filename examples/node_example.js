// examples/node_example.js
const fs = require('fs').promises;
const path = require('path');

async function readJSON(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  const base = path.join(__dirname, '..'); // sesuaikan
  const list = await readJSON(path.join(base, 'ListQuran.json'));
  console.log('Jumlah surah:', list.quran.length);

  // ambil metadata surah nomor 103
  const surahMeta = list.quran.find(s => s.number === 103);
  console.log('Surah 103 meta:', surahMeta);

  // ambil detail surah dari file Alquran_103.json
  const surahDetail = await readJSON(path.join(base, 'alquran', `Alquran_103.json`));
  console.log('Surah detail:', surahDetail.number, surahDetail.englishName);

  // ambil ayat dan tafsir ayat 1
  const ayat1 = surahDetail.ayahs.find(a => a.index === 1 || a.ind === 'Demi masa.');
  console.log('Ayat 1 arab:', ayat1.arb);
  console.log('Tafsir kemenag ringkas:', ayat1.tafsir?.kemenag_ringkas);
}

main().catch(console.error);
