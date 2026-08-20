# @renpwn/bible.js - Complete Bible Library for Node.js

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
[![npm version](https://img.shields.io/npm/v/@renpwn/bible.js.svg)](https://www.npmjs.com/package/@renpwn/bible.js)
![Database](https://img.shields.io/badge/Database-SQLite%20%2B%20FTS5-blue)
![Bible Versions](https://img.shields.io/badge/Bible%20Versions-14%20Terjemahan-orange)
![Downloads](https://img.shields.io/npm/dt/@renpwn/bible.js)

## 📖 Table of Contents
- [🎯 Filosofi Proyek](#-filosofi-proyek)
- [✨ Fitur Utama](#-fitur-utama)
- [📦 Instalasi](#-instalasi)
- [🚀 Mulai Cepat](#-mulai-cepat)
- [🏗️ Arsitektur](#️-arsitektur)
- [📖 API Reference Lengkap](#-api-reference-lengkap)
- [🗃️ Struktur Database](#️-struktur-database)
- [🔧 Versi Alkitab yang Tersedia](#-versi-alkitab-yang-tersedia)
- [🔍 Advanced Usage](#-advanced-usage)
- [📊 Sumber Data](#-sumber-data)
- [🎯 Use Cases](#-use-cases)
- [⚡ Performance](#-performance)
- [🚨 Error Handling](#-error-handling)
- [🤝 Kontribusi](#-kontribusi)
- [📄 License](#-license)
- [🔗 Links & Support](#-links--support)

---

## 🎯 Filosofi Proyek

> _"Sebab firman Allah hidup dan kuat dan lebih tajam dari pada pedang bermata dua manapun."_ (Ibrani 4:12)

Proyek ini lahir dari kerinduan untuk membawa firman Tuhan lebih dekat ke dalam kehidupan digital sehari-hari. **Library ini hadir agar developer Kristiani dapat membangun aplikasi yang memperkuat iman**, dengan menyediakan akses mudah ke Alkitab, leksikon Strong's, serta catatan perikop melalui kode program.

**Misi**: Membantu developer membangun aplikasi rohani yang bermakna, dengan prinsip:
- **Firman yang mudah diakses** — Cukup beberapa baris kode
- **14 Terjemahan** — Indonesia, Inggris, dan Ibrani/Yunani asli
- **Leksikon Strong's** — Bahasa asli Ibrani (H) & Yunani (G) beserta definisi lengkap
- **Sumber terpercaya** — Data dari sabda.org, jw.org, dan chabad.org

---

## ✨ Fitur Utama

- ✅ **Database SQLite + FTS5** — Pencarian teks super cepat di seluruh Alkitab
- ✅ **14 Versi Alkitab** — TB, BIS, TL, Ende, NKJV, BBE, The Message, NWT, NET, dan lebih
- ✅ **Tanakh & Jewish Bible** — Teks asli Ibrani (Hebrew) + terjemahan English Jewish Bible untuk kitab suci Yahudi.
- ✅ **Leksikon Strong's** — 8.674 kata Ibrani (H) + 5.624 kata Yunani (G)
- ✅ **Interlinear Draft** — Versi TB & TL dengan Strong's numbers
- ✅ **Fuzzy Matching** — Auto-detect nama kitab (singkatan, typo, bahasa Inggris)
- ✅ **Perikop** — Pembagian bagian dan judul perikop per kitab
- ✅ **Cross-reference** — Referensi silang antar ayat
- ✅ **Full-Text Search (FTS5)** — Cari ayat berdasarkan kata kunci dalam bahasa apapun
- ✅ **Auto-download database** — DB diunduh otomatis dari GitHub Releases, package NPM tetap ringan (<1 MB)
- ✅ **Multi-format Query** — Berbagai format input: `Yoh 3:16`, `John 3 16`, `Kejadian 1:1-5`
- ✅ **Random Ayat** — Sistem ayat random harian

---

## 📦 Instalasi

```bash
# Install package
npm install @renpwn/bible.js

# Atau dengan yarn
yarn add @renpwn/bible.js

# Atau dengan pnpm
pnpm add @renpwn/bible.js
```

> **Catatan**: Database SQLite (~100MB) tidak disertakan di dalam package NPM. Database akan **diunduh otomatis** dari GitHub Releases saat pertama kali `openDB()` dipanggil. Pastikan koneksi internet tersedia pada saat inisialisasi pertama.

---

## 🚀 Mulai Cepat

```javascript
import bibleHandler from '@renpwn/bible.js';

// Ambil ayat spesifik
const yohanes316 = await bibleHandler('Yohanes 3:16');

// Rentang ayat dengan versi tertentu
const mazmur23 = await bibleHandler('Mazmur 23', { version: 'tb' });

// Singkatan kitab juga didukung
const paulus = await bibleHandler('1 Kor 13:4-7');

// Pencarian kata
const kasih = await bibleHandler('search:kasih karunia');

// Strong's Lexicon lookup
const strong = await bibleHandler('strong:H7225');

// Daftar semua kitab
const daftarKitab = await bibleHandler('list');
```

**Contoh hasil output:**
```javascript
// bibleHandler('Yohanes 3:16')
{
  mode: 'verse',
  book: {
    id: 43,
    name: 'Yohanes',
    name_en: 'John',
    chapters: 21
  },
  chapter: 3,
  verseRange: '16',
  version: 'tb',
  count: 1,
  verses: [
    {
      verse: 16,
      text: 'Karena begitu besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal, supaya setiap orang yang percaya kepada-Nya tidak binasa, melainkan beroleh hidup yang kekal.',
      version: 'tb'
    }
  ]
}
```

---

## 🏗️ Arsitektur

```
@renpwn/bible.js/
├── 📁 db/                    # Database SQLite (diunduh otomatis)
│   └── bible.db              # File database utama (~100MB, tidak di-publish ke NPM)
├── 📁 json/                  # Raw JSON per kitab (hasil scraping, tidak di-publish)
│   └── Bible_1_Kejadian.json
├── 📁 lexicon/               # JSON leksikon Strong's (cache lokal)
│   ├── H/                    # Kosakata Ibrani (H0001 - H9999)
│   └── G/                    # Kosakata Yunani (G0001 - G5999)
├── 📁 mt/                    # ⚙️ Internal modules
│   ├── bible.js              # 🌐 Web scraper & CLI (3 mode)
│   ├── db.js                 # 🗃️ Database initializer & schema
│   └── download.js           # 📥 Auto-downloader dari GitHub Releases
├── 📁 examples/              # 💡 Contoh penggunaan
│   ├── test_lib.js           # 🧪 Test script
│   └── node_example.js       # 📜 Contoh penggunaan dasar
├── index.js                  # 📦 MAIN EXPORT — Import ini saja!
├── setting.db.js             # 🔧 Database connector & utilities
├── AlkitabList.json          # 📋 Daftar 66 kitab + metadata
├── package.json              # 📄 Package configuration
└── README.md                 # 📖 Dokumentasi ini
```

---

## 📖 API Reference Lengkap

### Fungsi Utama

```javascript
import bibleHandler, { openDB, closeDB } from '@renpwn/bible.js';

// Gunakan tanpa buka/tutup manual (auto-open & auto-close)
const result = await bibleHandler(input, options);

// ATAU kelola koneksi database manual untuk performa lebih baik
const db = await openDB();
const r1 = await bibleHandler('Yohanes 3:16');
const r2 = await bibleHandler('Mazmur 23:1');
await closeDB();
```

### Parameter `input`

| Format | Contoh | Deskripsi |
|--------|--------|-----------|
| **`Kitab Pasal:Ayat`** | `"Yohanes 3:16"` | Satu ayat spesifik |
| **`Kitab Pasal:Mulai-Selesai`** | `"Kejadian 1:1-5"` | Rentang ayat |
| **`Kitab Pasal`** | `"Mazmur 23"` | Satu pasal penuh |
| **`Singkatan`** | `"yoh 3:16"`, `"kej 1"`, `"1kor 13"` | Singkatan kitab |
| **`Bahasa Inggris`** | `"John 3:16"`, `"Gen 1:1"`, `"Psalm 23"` | Nama kitab bahasa Inggris |
| **`... versi`** | `"Yohanes 3:16 nkjv"` | Pilih versi di akhir input |
| **`search:kata`** | `"search:kasih karunia"` | Pencarian teks di seluruh Alkitab |
| **`cari:kata`** | `"cari:kasih"` | Alias search dalam Bahasa Indonesia |
| **`strong:Hxxxx`** | `"strong:H7225"` | Lookup leksikon Strong's Ibrani |
| **`strong:Gxxxx`** | `"strong:G26"` | Lookup leksikon Strong's Yunani |
| **`list`** / **`kitab`** | `"list"` | Daftar 66 kitab Alkitab |
| **`versi`** / **`versions`** | `"versi"` | Daftar semua versi terjemahan |

### Parameter `options`

```javascript
const options = {
  version: 'tb',          // Kode versi terjemahan (default: 'tb')
                          // Pilihan: 'tb', 'bis', 'tl', 'ende', 'nkjv', 'bbe',
                          //          'message', 'nwt', 'net', 'tn_he', 'tn_en',
                          //          'tb_itl_drf', 'tl_itl_drf', 'net2'
  search: false,          // Paksa mode pencarian teks (boolean)
  limit: 20,              // Batas hasil pencarian (default: 20)
  autoDownload: true,     // Download DB otomatis jika belum ada (default: true)
};
```

### Return Object

```javascript
// Mode: 'verse' — Hasil query ayat
{
  mode: 'verse',
  book: {
    id: 43,              // ID kitab (1-66)
    name: 'Yohanes',     // Nama kitab (Indonesia)
    name_en: 'John',     // Nama kitab (Inggris)
    chapters: 21         // Jumlah pasal
  },
  chapter: 3,            // Nomor pasal
  verseRange: '16',      // Rentang ayat (misal: '1-5' atau 'all')
  version: 'tb',         // Kode versi yang digunakan
  count: 1,              // Jumlah ayat yang ditemukan
  verses: [
    {
      verse: 16,
      text: 'Karena begitu besar kasih Allah...',
      version: 'tb'
    }
  ]
}

// Mode: 'search' — Hasil pencarian
{
  mode: 'search',
  query: 'kasih karunia',
  version: 'tb',
  totalResults: 15,
  results: [
    {
      book_id: 49,
      book_name: 'Efesus',
      chapter: 2,
      verse: 8,
      version: 'tb',
      text: 'Sebab karena kasih karunia kamu diselamatkan...'
    }
  ]
}

// Mode: 'lexicon' — Hasil Strong's number
{
  mode: 'lexicon',
  data: {
    strong: 'H7225',
    word: 'רֵאשִׁית',
    pronunciation: 'ray-sheeth',
    partOfSpeech: 'noun feminine',
    definition: 'beginning, first, chief',
    etymology: 'from H7218',
    occurrence: 51
  }
}

// Mode: 'list_books' — Daftar kitab
{
  mode: 'list_books',
  total: 66,
  books: [
    { id: 1, name: 'Kejadian', name_en: 'Genesis', chapters: 50, total_verses: 1533, testament: 'OT' },
    // ...
  ]
}

// Mode: 'list_versions' — Daftar versi terjemahan
{
  mode: 'list_versions',
  total: 14,
  versions: [
    { id: 'tb', name: 'Alkitab Terjemahan Baru-LAI', language: 'id', category: 'core' },
    // ...
  ]
}
```

---

## 🗃️ Struktur Database

### Tabel Utama
```sql
-- 1. Metadata kitab (66 kitab Alkitab)
CREATE TABLE books (
  id INTEGER PRIMARY KEY,      -- 1-66
  name TEXT NOT NULL,          -- Nama kitab (Indonesia)
  name_en TEXT,                -- Nama kitab (Inggris)
  name_he TEXT,                -- Nama kitab (Ibrani, khusus Tanakh)
  chapters INTEGER NOT NULL,   -- Jumlah pasal
  total_verses INTEGER,        -- Total ayat
  pericopes INTEGER,           -- Jumlah perikop
  testament TEXT,              -- 'OT' atau 'NT'
  tanakh_id TEXT,              -- ID bagian Tanakh (torah, neviim, ketuvim)
  tanakh_pos TEXT,             -- Posisi dalam Tanakh
  aid INTEGER                  -- Audio ID (untuk referensi audio)
);

-- 2. Versi terjemahan
CREATE TABLE versions (
  id TEXT PRIMARY KEY,         -- Kode versi: tb, bis, tl, nkjv, dll
  name TEXT NOT NULL,          -- Nama lengkap
  language TEXT NOT NULL,      -- Kode bahasa: id, en, he
  category TEXT,               -- core, global, advance
  supports_strong INTEGER      -- 1 jika mendukung Strong's numbers
);

-- 3. Ayat-ayat Alkitab (tabel utama — data terbesar)
CREATE TABLE verses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  version TEXT NOT NULL,
  text TEXT NOT NULL,
  UNIQUE(book_id, chapter, verse, version)
);

-- 4. Leksikon Strong's (Ibrani H + Yunani G)
CREATE TABLE strong_lexicon (
  strong TEXT PRIMARY KEY,     -- 'H7225', 'G26'
  word TEXT,                   -- Kata asli (Ibrani/Yunani)
  pronunciation TEXT,          -- Cara baca transliterasi
  etymology TEXT,              -- Asal-usul kata
  partOfSpeech TEXT,           -- Jenis kata
  definition TEXT,             -- Definisi lengkap
  avSummary TEXT,              -- Ringkasan terjemahan umum
  occurrence INTEGER           -- Frekuensi kemunculan di Alkitab
);

-- 5. Perikop (pembagian judul teks)
CREATE TABLE pericopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  start_chapter INTEGER,
  start_verse INTEGER,
  end_chapter INTEGER,
  end_verse INTEGER,
  title TEXT NOT NULL,         -- Judul perikop
  subtitle TEXT                -- Sub-judul (opsional)
);

-- 6. Referensi silang antar ayat
CREATE TABLE cross_references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_book_id INTEGER,
  source_chapter INTEGER,
  source_verse INTEGER,
  target_book_id INTEGER,
  target_chapter INTEGER,
  target_verse INTEGER,
  strength INTEGER,            -- 1=lemah, 2=sedang, 3=kuat
  type TEXT                    -- quotation, allusion, theme
);
```

### Full-Text Search Tables (FTS5)
```sql
-- Virtual table untuk pencarian cepat seluruh teks Alkitab
CREATE VIRTUAL TABLE verses_fts USING fts5(
  book_id, chapter, verse, version, text,
  content='verses',
  content_rowid='id',
  tokenize='porter unicode61'  -- Mendukung stemming bahasa
);

-- Virtual table untuk pencarian leksikon Strong's
CREATE VIRTUAL TABLE strong_lexicon_fts USING fts5(
  strong, word, pronunciation, definition,
  content='strong_lexicon',
  tokenize='porter unicode61'
);
```

---

## 🔧 Versi Alkitab yang Tersedia

| Kode | Nama Lengkap | Bahasa | Kategori | Strong's |
|------|-------------|--------|----------|----------|
| `tb` | Alkitab Terjemahan Baru - LAI | 🇮🇩 Indonesia | Core | ❌ |
| `bis` | Alkitab Kabar Baik (BIS-LAI) | 🇮🇩 Indonesia | Core | ❌ |
| `tl` | Alkitab Terjemahan Lama | 🇮🇩 Indonesia | Global | ❌ |
| `ende` | Alkitab Ende | 🇮🇩 Indonesia | Global | ❌ |
| `nwt` | Terjemahan Dunia Baru | 🇮🇩 Indonesia | Core | ❌ |
| `tb_itl_drf` | TB Interlinear *(draft)* | 🇮🇩 Indonesia | Advance | ✅ |
| `tl_itl_drf` | TL Interlinear *(draft)* | 🇮🇩 Indonesia | Advance | ✅ |
| `bbe` | Bible in Basic English | 🇬🇧 Inggris | Global | ❌ |
| `message` | The Message Bible | 🇬🇧 Inggris | Global | ❌ |
| `nkjv` | New King James Version | 🇬🇧 Inggris | Global | ❌ |
| `net` | NET Bible *(draft)* | 🇬🇧 Inggris | Advance | ✅ |
| `net2` | NET Bible Lab *(draft)* | 🇬🇧 Inggris | Advance | ✅ |
| `tn_he` | Tanakh Hebrew | 🇮🇱 Ibrani | Core | ❌ |
| `tn_en` | Tanakh English (Jewish) | 🇬🇧 Inggris | Core | ❌ |

---

## 🔍 Advanced Usage

### 1. Akses Database Langsung

```javascript
import { openDB, closeDB } from '@renpwn/bible.js';

// Buka koneksi database
const db = await openDB();

// Query manual — ambil semua pasal Yohanes 3
const verses = await db.all(`
  SELECT v.verse, v.text
  FROM verses v
  JOIN books b ON v.book_id = b.id
  WHERE b.name = 'Yohanes' AND v.chapter = 3 AND v.version = 'tb'
  ORDER BY v.verse
`);

// FTS5 full-text search
const results = await db.all(`
  SELECT b.name, f.chapter, f.verse, f.text
  FROM verses_fts f
  JOIN books b ON f.book_id = b.id
  WHERE verses_fts MATCH 'kasih AND anugerah'
  LIMIT 10
`);

// Jangan lupa tutup koneksi
await closeDB();
```

### 2. Membandingkan Terjemahan Antar Versi

```javascript
import bibleHandler, { openDB, closeDB } from '@renpwn/bible.js';

async function compareVersions(book, chapter, verse) {
  const versions = ['tb', 'bis', 'tl', 'nkjv', 'bbe'];
  const db = await openDB();

  const results = await db.all(`
    SELECT v.version, v.text, ver.name as version_name
    FROM verses v
    JOIN versions ver ON v.version = ver.id
    JOIN books b ON v.book_id = b.id
    WHERE b.name = ? AND v.chapter = ? AND v.verse = ?
    AND v.version IN (${versions.map(() => '?').join(',')})
    ORDER BY ver.category, v.version
  `, [book, chapter, verse, ...versions]);

  await closeDB();

  return results.map(r => ({
    version: r.version,
    name: r.version_name,
    text: r.text
  }));
}

// Bandingkan Yohanes 3:16 di 5 versi berbeda
const comparison = await compareVersions('Yohanes', 3, 16);
comparison.forEach(r => {
  console.log(`\n[${r.version.toUpperCase()}] ${r.name}`);
  console.log(r.text);
});
```

### 3. Studi Leksikon Strong's

```javascript
import bibleHandler, { openDB, closeDB } from '@renpwn/bible.js';

// Lookup definisi kata Ibrani/Yunani
const agape = await bibleHandler('strong:G26');
console.log('Kata Yunani "agape" (kasih):');
console.log(`  Kata asli  : ${agape.data.word}`);
console.log(`  Cara baca  : ${agape.data.pronunciation}`);
console.log(`  Jenis kata : ${agape.data.partOfSpeech}`);
console.log(`  Definisi   : ${agape.data.definition}`);

// Cari semua kata Strong's yang berhubungan dengan "kasih" dalam bahasa Yunani
const db = await openDB();
const loveWords = await db.all(`
  SELECT strong, word, pronunciation, definition
  FROM strong_lexicon
  WHERE strong LIKE 'G%'
  AND definition LIKE '%love%'
  ORDER BY strong
  LIMIT 10
`);
await closeDB();
```

### 4. Sistem Devotional Harian

```javascript
import bibleHandler from '@renpwn/bible.js';

class DailyDevotional {
  constructor() {
    // 66 kitab, total 31.102 ayat dalam Alkitab TB
    this.totalVerses = 31102;
  }

  // Dapatkan ayat harian berdasarkan tanggal
  async getVerseOfDay(date = new Date()) {
    const dayOfYear = this.getDayOfYear(date);
    // Rotasi ayat berdasarkan hari dalam setahun
    const verseIndex = (dayOfYear % this.totalVerses) + 1;

    const db = await (await import('@renpwn/bible.js')).openDB();
    const ayat = await db.get(`
      SELECT b.name as book_name, v.chapter, v.verse, v.text
      FROM verses v
      JOIN books b ON v.book_id = b.id
      WHERE v.version = 'tb'
      ORDER BY v.id
      LIMIT 1 OFFSET ?
    `, [verseIndex - 1]);
    await (await import('@renpwn/bible.js')).closeDB();

    return {
      date: date.toLocaleDateString('id-ID'),
      reference: `${ayat.book_name} ${ayat.chapter}:${ayat.verse}`,
      text: ayat.text
    };
  }

  getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }
}

const devotional = new DailyDevotional();
const today = await devotional.getVerseOfDay();
console.log(`\n📖 Firman Hari Ini (${today.date})`);
console.log(`📍 ${today.reference}`);
console.log(`💬 "${today.text}"`);
```

### 5. Pencarian Referensi Silang

```javascript
import { openDB, closeDB } from '@renpwn/bible.js';

async function getCrossReferences(bookName, chapter, verse) {
  const db = await openDB();

  const refs = await db.all(`
    SELECT
      b_src.name AS source_book,
      cr.source_chapter,
      cr.source_verse,
      b_tgt.name AS target_book,
      cr.target_chapter,
      cr.target_verse,
      cr.strength,
      cr.type,
      v.text AS target_text
    FROM cross_references cr
    JOIN books b_src ON cr.source_book_id = b_src.id
    JOIN books b_tgt ON cr.target_book_id = b_tgt.id
    LEFT JOIN verses v ON (
      v.book_id = cr.target_book_id
      AND v.chapter = cr.target_chapter
      AND v.verse = cr.target_verse
      AND v.version = 'tb'
    )
    WHERE b_src.name = ? AND cr.source_chapter = ? AND cr.source_verse = ?
    ORDER BY cr.strength DESC
    LIMIT 10
  `, [bookName, chapter, verse]);

  await closeDB();

  return refs.map(r => ({
    source: `${r.source_book} ${r.source_chapter}:${r.source_verse}`,
    target: `${r.target_book} ${r.target_chapter}:${r.target_verse}`,
    type: r.type,
    strength: ['', '⬤○○', '⬤⬤○', '⬤⬤⬤'][r.strength] || '',
    text: r.target_text
  }));
}

// Referensi silang Yohanes 3:16
const crossRefs = await getCrossReferences('Yohanes', 3, 16);
crossRefs.forEach(ref => {
  console.log(`\n${ref.strength} [${ref.type}] ${ref.target}`);
  console.log(`  "${ref.text}"`);
});
```

---

## 📊 Sumber Data Terpercaya

| Komponen | Sumber | Keterangan |
|----------|--------|------------|
| **TB, BIS, TL, Ende** | [sabda.org](https://alkitab.sabda.org/) | Terjemahan resmi Indonesia |
| **Terjemahan Dunia Baru (NWT)** | [jw.org](https://www.jw.org/id/) | |
| **Tanakh (Hebrew & English)** | [chabad.org](https://www.chabad.org/) | Jewish Bible + terjemahan Ibrani |
| **BBE, NKJV, The Message** | [sabda.org](https://alkitab.sabda.org/) | Terjemahan bahasa Inggris |
| **NET Bible** | [sabda.org](https://alkitab.sabda.org/) | Terjemahan akademik + Strong's |
| **Leksikon Strong's (H+G)** | [sabda.org](https://alkitab.sabda.org/) + [chabad.org](https://www.chabad.org/) | 14.000+ entri Ibrani & Yunani |
| **Perikop** | [sabda.org](https://alkitab.sabda.org/) | Judul bagian per kitab |
| **Cross-references** | [sabda.org](https://alkitab.sabda.org/) | Referensi silang antar ayat |

---

## 🎯 Use Cases

### 1. Bot WhatsApp / Telegram

```javascript
import bibleHandler from '@renpwn/bible.js';

// Contoh handler pesan bot
async function handleBibleCommand(messageText) {
  // Perintah: !alkitab Yohanes 3:16
  // Perintah: !alkitab cari:kasih karunia
  // Perintah: !alkitab strong:H7225
  // Perintah: !alkitab list

  const query = messageText.replace(/^!alkitab\s*/i, '').trim();

  try {
    const result = await bibleHandler(query);

    if (result.mode === 'verse') {
      const v = result.verses[0];
      return [
        `📖 *${result.book.name} ${result.chapter}:${result.verseRange}*`,
        `_(${result.version.toUpperCase()})_`,
        ``,
        result.verses.map(v => `[${v.verse}] ${v.text}`).join('\n'),
      ].join('\n');
    }

    if (result.mode === 'search') {
      const lines = result.results.slice(0, 5).map(r =>
        `📍 *${r.book_name} ${r.chapter}:${r.verse}* — ${r.text.slice(0, 80)}...`
      );
      return `🔍 *Hasil pencarian "${result.query}":*\n\n` + lines.join('\n\n');
    }

    if (result.mode === 'lexicon') {
      const d = result.data;
      return [
        `📚 *Strong's ${d.strong}*`,
        `🔤 ${d.word} _(${d.pronunciation})_`,
        `📝 ${d.definition}`,
        `🏷️ ${d.partOfSpeech}`
      ].join('\n');
    }

    if (result.mode === 'list_books') {
      const ot = result.books.filter(b => b.testament === 'OT');
      const nt = result.books.filter(b => b.testament === 'NT');
      return `📖 *Alkitab — ${result.total} Kitab*\n\n*PL (${ot.length}):* ${ot.map(b => b.name).join(', ')}\n\n*PB (${nt.length}):* ${nt.map(b => b.name).join(', ')}`;
    }

  } catch (error) {
    return `❌ Terjadi kesalahan: ${error.message}`;
  }
}

// Contoh penggunaan
const response = await handleBibleCommand('!alkitab Yohanes 3:16');
console.log(response);
```

### 2. REST API dengan Express.js

```javascript
import express from 'express';
import bibleHandler, { openDB, closeDB } from '@renpwn/bible.js';

const app = express();
app.use(express.json());

// Buka koneksi database saat server start
let db;
app.listen(3000, async () => {
  db = await openDB();
  console.log('📖 Bible API running on http://localhost:3000');
});

// Route: Query ayat
// GET /api/bible?q=Yohanes+3:16&version=tb
app.get('/api/bible', async (req, res) => {
  try {
    const { q = '', version = 'tb', limit = 20 } = req.query;
    const result = await bibleHandler(q, { version, limit: parseInt(limit) });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Route: Daftar semua kitab
// GET /api/bible/books
app.get('/api/bible/books', async (req, res) => {
  const result = await bibleHandler('list');
  res.json(result);
});

// Route: Versi yang tersedia
// GET /api/bible/versions
app.get('/api/bible/versions', async (req, res) => {
  const result = await bibleHandler('versions');
  res.json(result);
});

// Route: Strong's Lexicon
// GET /api/lexicon/H7225
app.get('/api/lexicon/:strong', async (req, res) => {
  try {
    const result = await bibleHandler(`strong:${req.params.strong}`);
    if (result.error) return res.status(404).json({ error: result.error });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Route: Ayat acak
// GET /api/bible/random?version=tb
app.get('/api/bible/random', async (req, res) => {
  const { version = 'tb' } = req.query;
  const randomVerse = await db.get(`
    SELECT b.name as book_name, v.chapter, v.verse, v.text
    FROM verses v JOIN books b ON v.book_id = b.id
    WHERE v.version = ?
    ORDER BY RANDOM() LIMIT 1
  `, [version]);
  res.json({ version, ...randomVerse });
});

// Tutup koneksi saat server dimatikan
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});
```

### 3. Aplikasi Web (Vanilla JS / React)

```javascript
// Untuk lingkungan Node.js (Next.js API Routes / Nuxt server routes)
import bibleHandler from '@renpwn/bible.js';

// Next.js API Route: pages/api/bible.js
export default async function handler(req, res) {
  const { q, version = 'tb' } = req.query;
  const result = await bibleHandler(q, { version });
  res.json(result);
}

// React hook contoh
import { useState, useCallback } from 'react';

function useBible() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const query = useCallback(async (q, version = 'tb') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bible?q=${encodeURIComponent(q)}&version=${version}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, query };
}
```

### 4. Aplikasi Mobile (React Native)

```javascript
// Karena React Native tidak mendukung SQLite native bawaan Node.js,
// gunakan REST API sebagai perantara (contoh 2 di atas).

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

const BibleApp = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const API_URL = 'https://your-bible-api.example.com';

  const search = async () => {
    const res = await fetch(`${API_URL}/api/bible?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResult(data);
  };

  const renderVerse = ({ item }) => (
    <View style={styles.verse}>
      <Text style={styles.verseNum}>{item.verse}</Text>
      <Text style={styles.verseText}>{item.text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Yohanes 3:16, search:kasih, strong:H7225"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={search}
      />
      <TouchableOpacity style={styles.btn} onPress={search}>
        <Text style={styles.btnText}>Cari</Text>
      </TouchableOpacity>
      {result?.verses && (
        <FlatList
          data={result.verses}
          keyExtractor={(item) => String(item.verse)}
          renderItem={renderVerse}
          ListHeaderComponent={() => (
            <Text style={styles.header}>
              {result.book?.name} {result.chapter} ({result.version?.toUpperCase()})
            </Text>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f0' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 8 },
  btn: { backgroundColor: '#2c5f8a', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  header: { fontSize: 18, fontWeight: 'bold', margin: 12, color: '#2c5f8a' },
  verse: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderColor: '#eee' },
  verseNum: { width: 28, fontWeight: 'bold', color: '#888' },
  verseText: { flex: 1, lineHeight: 22 },
});
```

---

## ⚡ Performance

- **Query Ayat**: < 5ms dengan index B-Tree SQLite
- **FTS5 Search**: < 50ms untuk pencarian di seluruh 31.000+ ayat
- **Strong's Lookup**: < 2ms (primary key lookup)
- **Memory Usage**: ~10–20MB untuk database operasional berkat paged I/O SQLite
- **Concurrent Users**: Support 100+ dengan connection pooling

### Tips Optimasi

```javascript
// 1. Selalu buka koneksi DB sekali, bukan per-query
const db = await openDB();
// ...lakukan banyak query...
await closeDB();

// 2. Implementasi in-memory cache sederhana
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

async function cachedBible(query, options = {}) {
  const key = `${query}:${JSON.stringify(options)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  const data = await bibleHandler(query, options);
  cache.set(key, { ts: Date.now(), data });
  return data;
}

// 3. FTS5 lebih cepat dari LIKE untuk pencarian teks
// Gunakan prefix 'search:' pada query untuk memaksa FTS5
const fast = await bibleHandler('search:kasih dan anugerah');
```

---

## 🚨 Error Handling

```javascript
import bibleHandler from '@renpwn/bible.js';

async function safeBibleQuery(query, options = {}) {
  try {
    const result = await bibleHandler(query, options);

    if (result.mode === 'not_found') {
      console.warn('⚠️ Tidak ditemukan:', result.message);
      return null;
    }

    return result;
  } catch (error) {
    if (error.message.includes('Gagal mengunduh')) {
      console.error('🌐 Gagal download database. Periksa koneksi internet.');
      // Coba lagi dengan URL custom
      return bibleHandler(query, {
        ...options,
        url: 'https://mirror.example.com/bible.db.gz'
      });
    }

    if (error.message.includes('database') || error.message.includes('SQLITE')) {
      console.error('💾 Error database SQLite:', error.message);
      throw error;
    }

    console.error('❌ Error tidak dikenal:', error.message);
    throw error;
  }
}

// Error umum yang mungkin terjadi:
// - Database belum terdownload / koneksi internet putus saat download
// - Format query tidak dikenali → mode: 'not_found'
// - Kitab / pasal / ayat tidak ada di database
// - SQLITE_BUSY saat akses konkuren tinggi (tingkatkan timeout)
```

---

## 🤝 Kontribusi

Kami menyambut kontribusi dari semua developer! Berikut cara berkontribusi:

### Cara Kontribusi
1. **Fork repository**
2. **Buat feature branch**
```bash
git checkout -b feature/amazing-feature
```
3. **Commit changes**
```bash
git commit -m 'feat: tambah fitur pencarian leksikon lanjutan'
```
4. **Push ke branch**
```bash
git push origin feature/amazing-feature
```
5. **Buat Pull Request**

### Area yang Butuh Kontribusi
- **🌐 Terjemahan** — Versi bahasa daerah (Jawa, Batak, Sunda, dll)
- **📚 Tafsir & Komentar** — Catatan teologis per perikop
- **🧪 Unit tests & integration tests** — Cakupan pengujian lebih luas
- **⚡ Performance optimization** — Caching, indeks query
- **📱 Contoh aplikasi** — Mobile, Desktop, CLI
- **📖 Documentation improvement** — Perbaikan & terjemahan dokumen
- **🐛 Bug fixes** — Temukan dan perbaiki bug

### Testing
```bash
# Jalankan test
npm test

# Unduh database manual (pertama kali atau force-refresh)
npm run download:db

# Kompres bible.db sebelum upload ke GitHub Release
npm run compress:db

# Scraping semua kitab + data ke database
npm run scrape:all
```

---

## 📄 License

MIT License

Copyright (c) 2024 Ardy Ren

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 🔗 Links & Support

### Official Channels
- **GitHub Repository**: [github.com/renpwn/bible.js](https://github.com/renpwn/bible.js)
- **npm Package**: [npmjs.com/package/@renpwn/bible.js](https://www.npmjs.com/package/@renpwn/bible.js)
- **Issues & Bugs**: [GitHub Issues](https://github.com/renpwn/bible.js/issues)

### Sosial Media & Sponsor
- **YouTube**: [@RenPwn](https://www.youtube.com/@RenPwn)
- **Instagram**: [@renpwn_ren](https://instagram.com/renpwn_ren)
- **TikTok**: [tiktok.com/@renpwn](https://tiktok.com/@renpwn)

### Support Development
```
⭐ Star repository di GitHub
📢 Share dengan developer Kristiani lain
🐛 Report bugs dan issues
💡 Suggest new features
🔧 Submit pull requests
```

---

**⭐ Pro Tip**: Untuk aplikasi production, implementasikan caching dengan Redis dan selalu gunakan mode `openDB() / closeDB()` manual untuk mengelola koneksi database dengan lebih efisien!

```javascript
import Redis from 'ioredis';
import bibleHandler, { openDB, closeDB } from '@renpwn/bible.js';
const redis = new Redis();

async function getWithCache(query, version = 'tb') {
  const key = `bible:${query}:${version}`;

  // Cek cache Redis terlebih dahulu
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // Ambil dari database
  const data = await bibleHandler(query, { version });

  // Simpan ke cache selama 1 jam
  await redis.setex(key, 3600, JSON.stringify(data));
  return data;
}
```

---

**Kiranya library ini menjadi berkat bagi setiap karya yang dibangun di atasnya. 🙏**

---
*"Sebab Aku ini mengetahui rancangan-rancangan apa yang ada pada-Ku mengenai kamu, demikianlah firman TUHAN, yaitu rancangan damai sejahtera dan bukan rancangan kecelakaan, untuk memberikan kepadamu hari depan yang penuh harapan."* (Yeremia 29:11 — TB)
