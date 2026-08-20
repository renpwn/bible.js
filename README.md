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
- [💾 Manajemen Database & Auto-Download](#-manajemen-database--auto-download)
- [🎲 Fitur Ayat Acak (Random Verse)](#-fitur-ayat-acak-random-verse)
- [🚀 Mulai Cepat](#-mulai-cepat)
- [🏗️ Arsitektur](#️-arsitektur)
- [📖 API Reference Lengkap](#-api-reference-lengkap)
- [🔧 Setup & Konfigurasi Scraper](#-setup--konfigurasi-scraper)
- [🗃️ Struktur Database](#️-struktur-database)
- [🔧 Versi Alkitab yang Tersedia](#-versi-alkitab-yang-tersedia)
- [🔍 Advanced Usage](#-advanced-usage)
- [📊 Sumber Data Terpercaya](#-sumber-data-terpercaya)
- [🎯 Use Cases](#-use-cases)
- [⚡ Performance & Optimasi](#-performance--optimasi)
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
- **Sumber terpercaya** — Data dari sabda.org, jw.org, dan sefaria.org (Tanakh & Rashi)

---

## ✨ Fitur Utama

- ✅ **Database SQLite + FTS5** — Pencarian teks super cepat di seluruh Alkitab
- ✅ **14 Versi Alkitab** — TB, BIS, TL, Ende, NKJV, BBE, The Message, NWT, NET, dan lainnya
- ✅ **Tanakh & Jewish Bible** — Teks asli Ibrani (Hebrew) + terjemahan English Jewish Bible (JPS) + Komentar Rabbi Rashi
- ✅ **Leksikon Strong's** — 8.674 kata Ibrani (H) + 5.624 kata Yunani (G)
- ✅ **Interlinear Draft** — Versi TB & TL dengan Strong's numbers
- ✅ **Fuzzy Matching** — Auto-detect nama kitab (singkatan, typo, bahasa Inggris)
- ✅ **Perikop & Cross-reference** — Pembagian perikop dan referensi silang antar ayat
- ✅ **🎲 Smart Random System** — Input kosong `""` atau `'random'` otomatis menghasilkan ayat acak yang selalu berganti
- ✅ **💾 Auto-Extract & Download Database** — Cek database lokal $\rightarrow$ ekstrak arsip lokal $\rightarrow$ fallback unduh dari GitHub dengan Live Progress Bar
- ✅ **🗑️ Auto-Cleanup** — File arsip `.gz` otomatis dihapus setelah diekstrak untuk menghemat ruang disk
- ✅ **⚡ CLI Execution Langsung** — Jalankan langsung via `node index` atau `npm start`

---

## 📦 Instalasi

```bash
# Install package via npm
npm install @renpwn/bible.js

# Atau dengan yarn
yarn add @renpwn/bible.js

# Atau dengan pnpm
pnpm add @renpwn/bible.js
```

---

## 💾 Manajemen Database & Auto-Download

Library ini menggunakan basis data SQLite terpadu (`~265 MB`). Agar package NPM dan repositori tetap ringan, kami menerapkan **sistem inisialisasi cerdas 3-tahap**:

```
┌────────────────────────────────────────────────────────┐
│             Saat Aplikasi Dijalankan (Init)            │
└──────────────────────────┬─────────────────────────────┘
                           ▼
               [ db/bible.db sudah ada? ]
                 /                    \
              (Ya)                    (Tidak)
               /                        \
              ▼                          ▼
      [ Langsung Digunakan ]     [ Cek db/bible.db.gz di lokal ]
                                   /                       \
                                (Ada)                    (Tidak)
                                 /                           \
                                ▼                             ▼
                     [ Ekstrak bible.db.gz ]         [ Download dari GitHub ]
                                │                    (Live Progress Bar)
                                ▼                             │
                     [ Hapus bible.db.gz ]                    ▼
                     (Hemat ruang disk)              [ Ekstrak bible.db ]
```

### 1. Ekstraksi Otomatis dari File Lokal
Jika Anda meng-clone repositori dari GitHub dan terdapat file `db/bible.db.gz`, library akan **langsung mengekstraknya secara lokal** tanpa membutuhkan koneksi internet. Setelah berhasil diekstrak, file `bible.db.gz` **otomatis dihapus** untuk menghemat ruang penyimpanan.

### 2. Download Otomatis dari GitHub (Live Progress Bar)
Jika library diinstall melalui `npm install` (file lokal tidak ada), library otomatis mengunduh database dari GitHub dengan tampilan progress bar interaktif:

```text
📦 Database Alkitab (bible.db) belum ditemukan di lokal.
🌐 Mengunduh dari: https://raw.githubusercontent.com/renpwn/bible.js/master/db/bible.db.gz
📂 Menyimpan ke: D:\zproject\bible.js\db\bible.db
⏳ Download [████████████░░░░░░░░] 60% (58.12 MB / 96.88 MB) | 7.45 MB/s | ETA: 5s
```

### 3. Perintah CLI Pengembang
```bash
# Kompres db/bible.db menjadi db/bible.db.gz sebelum commit ke repo
npm run compress:db

# Ekstrak manual db/bible.db.gz menjadi db/bible.db
npm run extract:db

# Download manual database dari GitHub
npm run download:db
```

---

## 🎲 Fitur Ayat Acak (Random Verse)

Setiap kali input berupa **string kosong `""`**, kata `'random'`, `'acak'`, opsi `{ random: true }`, atau tanpa argumen di CLI, library akan **secara otomatis mengambil ayat acak** yang selalu berganti setiap kali dijalankan.

### 🔄 Opsi Range Ayat Berturutan (Auto-Shift Boundary)
Anda dapat menentukan jumlah ayat berturutan yang ingin diambil, misalnya `random 5` atau `acak 3`:
- Library akan memilih **1 ayat anchor secara acak** di suatu pasal, lalu mengambil rentang ayat berturutan dari pasal tersebut.
- **Auto-Shift Boundary**: Jika rentang melebihi jumlah ayat terakhir di pasal tersebut, nomor awal otomatis **bergeser mundur** agar jumlah ayat yang diminta tetap terpenuhi (misal di pasal yang hanya punya 10 ayat, jika acak jatuh di ayat 8 dengan range 5, ayat yang diambil otomatis ayat 6 sampai 10).

### Contoh di Kode JavaScript:
```javascript
import bibleHandler from '@renpwn/bible.js';

// 1. String kosong otomatis menghasilkan 1 ayat acak
const acak1 = await bibleHandler('');
console.log(`${acak1.book.name} ${acak1.chapter}:${acak1.verseRange}`);
console.log(acak1.verses[0].text);

// 2. Menggunakan keyword 'random' atau 'acak'
const acak2 = await bibleHandler('random');

// 3. Mengambil rentang 5 ayat berturutan dari pasal yang sama
const limaAyat = await bibleHandler('random 5');
console.log(`Kitab: ${limaAyat.book.name} ${limaAyat.chapter}:${limaAyat.verseRange}`);
limaAyat.verses.forEach(v => console.log(`[${v.verse}] ${v.text}`));

// 4. Menggunakan opsi parameter { range: 3 }
const tigaAyat = await bibleHandler('acak', { range: 3 });

// 5. Ayat acak dalam versi bahasa Inggris (NKJV / BBE)
const randomEnglish = await bibleHandler('random 3', { version: 'nkjv' });
console.log(randomEnglish.verses[0].text);
```

### Contoh di Terminal / CLI:
```bash
# Menjalankan acak 1 ayat (default)
npm start

# Atau via node
node index
node index random
node index acak

# Mengambil rentang ayat acak berturutan (misal: 5 ayat)
node index "random 5"
node index "acak 3"
```

---

## 🚀 Mulai Cepat

```javascript
import bibleHandler from '@renpwn/bible.js';

// 1. Ayat Acak (Input kosong)
const randomVerse = await bibleHandler('');

// 2. Ayat Spesifik
const yohanes316 = await bibleHandler('Yohanes 3:16');

// 3. Rentang Ayat
const kej1 = await bibleHandler('Kejadian 1:1-3');

// 4. Satu Pasal Penuh
const mazmur23 = await bibleHandler('Mazmur 23');

// 5. Singkatan & Versi Spesifik
const korintus = await bibleHandler('1 kor 13:4-7 nkjv');

// 6. Pencarian Kata Kunci
const hasilCari = await bibleHandler('search:kasih karunia');

// 7. Strong's Lexicon
const strong = await bibleHandler('strong:H7225');

// 8. Daftar Kitab
const listKitab = await bibleHandler('list');
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
├── 📁 db/                    # Database SQLite
│   └── bible.db              # File database utama SQLite (~265MB)
├── 📁 json/                  # Raw JSON data per kitab (opsional)
├── 📁 lexicon/               # JSON leksikon Strong's (cache lokal)
│   ├── H/                    # Kosakata Ibrani (H0001 - H9999)
│   └── G/                    # Kosakata Yunani (G0001 - G5999)
├── 📁 mt/                    # ⚙️ Internal modules
│   ├── bible.js              # 🌐 Scraper & CLI
│   ├── db.js                 # 🗃️ Database initializer & schema
│   └── download.js           # 📥 Auto-downloader & streaming extractor
├── 📁 examples/              # 💡 Contoh penggunaan
│   └── test_lib.js           # 🧪 Test script
├── index.js                  # 📦 MAIN EXPORT + CLI Runner
├── setting.db.js             # 🔧 Database connector & utilities
├── AlkitabList.json          # 📋 Metadata 66 kitab
├── package.json              # 📄 Package configuration
└── README.md                 # 📖 Dokumentasi ini
```

---

## 📖 API Reference Lengkap

### Fungsi Utama

```javascript
import bibleHandler, { openDB, closeDB } from '@renpwn/bible.js';

// Auto-open & auto-close koneksi per request
const result = await bibleHandler(input, options);

// ATAU kelola koneksi manual (direkomendasikan untuk batch / server)
const db = await openDB();
const r1 = await bibleHandler('Yohanes 3:16');
const r2 = await bibleHandler('Mazmur 23:1');
await closeDB();
```

### Parameter `input`

| Format | Contoh | Deskripsi | Mode Output |
|---|---|---|---|
| **`""` (Kosong)** | `""` | **1 Ayat acak (Random Verse)** | `random` |
| **`"random"` / `"acak"`** | `"random"` | **1 Ayat acak** | `random` |
| **`"random <N>"` / `"acak <N>"`** | `"random 5"`, `"acak 3"` | **N Ayat acak berturutan (auto-shift boundary)** | `random` |
| **`Kitab Pasal:Ayat`** | `"Yohanes 3:16"` | Satu ayat spesifik | `verse` |
| **`Kitab Pasal:Mulai-Selesai`** | `"Kejadian 1:1-5"` | Rentang ayat | `verse` |
| **`Kitab Pasal`** | `"Mazmur 23"` | Satu pasal penuh | `verse` |
| **`Singkatan`** | `"yoh 3:16"`, `"1kor 13"` | Singkatan nama kitab | `verse` |
| **`Bahasa Inggris`** | `"John 3:16"`, `"Genesis 1"` | Nama kitab dalam bahasa Inggris | `verse` |
| **`... versi`** | `"Yoh 3:16 nkjv"` | Menentukan versi terjemahan di akhir | `verse` |
| **`search:kata`** | `"search:kasih karunia"` | Pencarian Full-Text Search (FTS5) | `search` |
| **`cari:kata`** | `"cari:anugerah"` | Alias pencarian bahasa Indonesia | `search` |
| **`strong:Kode`** | `"strong:H7225"`, `"G26"` | Lookup leksikon Strong's Ibrani / Yunani | `lexicon` |
| **`"list"` / `"kitab"`** | `"list"` | Daftar 66 kitab Alkitab | `list_books` |
| **`"versi"` / `"versions"`** | `"versi"` | Daftar 14 versi Alkitab yang tersedia | `list_versions` |

### Parameter `options`

```javascript
const options = {
  version: 'tb',          // Kode versi terjemahan (default: 'tb')
                          // Pilihan: 'tb', 'bis', 'tl', 'ende', 'nkjv', 'bbe',
                          //          'message', 'nwt', 'net', 'tn_he', 'tn_en',
                          //          'tb_itl_drf', 'tl_itl_drf', 'net2'
  range: null,            // Jumlah rentang ayat acak berturutan (misal: 5)
  limit: 20,              // Batas hasil pencarian atau jumlah ayat acak
  search: false,          // Paksa mode pencarian teks (boolean)
  random: false,          // Paksa mode random
  autoDownload: true,     // Download DB otomatis jika belum ada (default: true)
};
```

### Struktur Return Object

```javascript
// Mode: 'random' atau 'verse'
{
  mode: 'random', // atau 'verse'
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
      text: 'Karena begitu besar kasih Allah akan dunia ini...',
      version: 'tb'
    }
  ]
}

// Mode: 'search'
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

// Mode: 'lexicon'
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

// Mode: 'list_books'
{
  mode: 'list_books',
  total: 66,
  books: [
    { id: 1, name: 'Kejadian', name_en: 'Genesis', chapters: 50, total_verses: 1533, testament: 'OT' },
    // ...
  ]
}

// Mode: 'list_versions'
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

## 🔧 Setup & Konfigurasi Scraper

Database sudah otomatis siap pakai melalui download/arsip. Jika Anda ingin melakukan scraping mandiri dari sumber web:

```bash
# 1. Scrape semua 66 kitab ke database
npm run scrape:all

# 2. Migrasi data JSON ke database (jika ada)
npm run migrate:json

# 3. Scrape kitab tertentu melalui CLI (contoh: Kitab ke-43 Yohanes)
node mt/bible.js -b 43
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
  tanakh_id TEXT,              -- Bagian Tanakh (torah, neviim, ketuvim)
  tanakh_pos TEXT,
  aid INTEGER
);

-- 2. Versi terjemahan
CREATE TABLE versions (
  id TEXT PRIMARY KEY,         -- Kode versi: tb, bis, tl, nkjv, dll
  name TEXT NOT NULL,
  language TEXT NOT NULL,      -- id, en, he
  category TEXT,               -- core, global, advance
  supports_strong INTEGER
);

-- 3. Ayat-ayat Alkitab (Tabel utama)
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
  word TEXT,
  pronunciation TEXT,
  etymology TEXT,
  partOfSpeech TEXT,
  definition TEXT,
  avSummary TEXT,
  occurrence INTEGER
);

-- 5. Perikop
CREATE TABLE pericopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  start_chapter INTEGER,
  start_verse INTEGER,
  end_chapter INTEGER,
  end_verse INTEGER,
  title TEXT NOT NULL,
  subtitle TEXT
);

-- 6. Referensi Silang Antar Ayat
CREATE TABLE cross_references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_book_id INTEGER,
  source_chapter INTEGER,
  source_verse INTEGER,
  target_book_id INTEGER,
  target_chapter INTEGER,
  target_verse INTEGER,
  strength INTEGER,
  type TEXT
);
```

### Full-Text Search (FTS5)
```sql
CREATE VIRTUAL TABLE verses_fts USING fts5(
  book_id, chapter, verse, version, text,
  content='verses',
  content_rowid='id',
  tokenize='porter unicode61'
);

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
| `tn_en` | Tanakh English (Jewish JPS) | 🇬🇧 Inggris | Core | ❌ |

---

## 🔍 Advanced Usage

### 1. Akses Database Langsung

```javascript
import { openDB, closeDB } from '@renpwn/bible.js';

// Buka koneksi database
const db = await openDB();

// Query manual — ambil semua ayat Yohanes 3
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
  return results;
}

const comparison = await compareVersions('Yohanes', 3, 16);
comparison.forEach(r => {
  console.log(`\n[${r.version.toUpperCase()}] ${r.version_name}`);
  console.log(r.text);
});
```

### 3. Studi Leksikon Strong's (Bahasa Asli)

```javascript
import bibleHandler, { openDB, closeDB } from '@renpwn/bible.js';

// Cari definisi kata Yunani 'agape' (G26)
const agape = await bibleHandler('strong:G26');
console.log('Kata Asli  :', agape.data.word);
console.log('Cara Baca  :', agape.data.pronunciation);
console.log('Jenis Kata :', agape.data.partOfSpeech);
console.log('Definisi   :', agape.data.definition);

// Cari semua kosakata Strong's yang berkaitan dengan 'love' dalam bahasa Yunani
const db = await openDB();
const loveWords = await db.all(`
  SELECT strong, word, pronunciation, definition
  FROM strong_lexicon
  WHERE strong LIKE 'G%' AND definition LIKE '%love%'
  ORDER BY strong
  LIMIT 10
`);
await closeDB();
```

### 4. Pencarian Referensi Silang (Cross-References)

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
| **Terjemahan Dunia Baru (NWT)** | [jw.org](https://www.jw.org/id/) | Teks Alkitab NWT |
| **Tanakh & Komentar Rashi** | [sefaria.org](https://www.sefaria.org/) | Teks asli Masoretik Ibrani, JPS English, dan Rashi |
| **BBE, NKJV, The Message** | [sabda.org](https://alkitab.sabda.org/) | Terjemahan bahasa Inggris |
| **NET Bible** | [sabda.org](https://alkitab.sabda.org/) | Terjemahan akademik + Strong's |
| **Leksikon Strong's (H+G)** | [sabda.org](https://alkitab.sabda.org/) | 14.000+ entri Ibrani & Yunani |
| **Perikop & Cross-references** | [sabda.org](https://alkitab.sabda.org/) | Judul bagian & referensi silang |

---

## 🎯 Use Cases

### 1. Bot WhatsApp / Telegram

```javascript
import bibleHandler from '@renpwn/bible.js';

async function handleBotMessage(messageText) {
  const query = messageText.replace(/^!alkitab\s*/i, '').trim();

  try {
    // Jika user hanya ketik "!alkitab", otomatis berikan ayat acak
    const result = await bibleHandler(query);

    if (result.mode === 'random' || result.mode === 'verse') {
      return [
        `📖 *${result.book.name} ${result.chapter}:${result.verseRange}* (${result.version.toUpperCase()})`,
        ``,
        result.verses.map(v => `[${v.verse}] ${v.text}`).join('\n')
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
  } catch (error) {
    return `❌ Terjadi kesalahan: ${error.message}`;
  }
}
```

### 2. REST API dengan Express.js

```javascript
import express from 'express';
import bibleHandler, { openDB, closeDB } from '@renpwn/bible.js';

const app = express();
app.use(express.json());

// GET /api/bible?q=Yohanes+3:16 (atau kosongkan q untuk ayat acak)
app.get('/api/bible', async (req, res) => {
  try {
    const { q = '', version = 'tb', limit = 20 } = req.query;
    const result = await bibleHandler(q, { version, limit: parseInt(limit) });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/bible/books
app.get('/api/bible/books', async (req, res) => {
  const result = await bibleHandler('list');
  res.json(result);
});

// GET /api/bible/versions
app.get('/api/bible/versions', async (req, res) => {
  const result = await bibleHandler('versions');
  res.json(result);
});

app.listen(3000, () => console.log('📖 Bible API running on port 3000'));
```

### 3. Aplikasi Web (Next.js / React)

```javascript
import { useState, useCallback } from 'react';
import bibleHandler from '@renpwn/bible.js';

export function useBible() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const query = useCallback(async (q, version = 'tb') => {
    setLoading(true);
    setError(null);
    try {
      const data = await bibleHandler(q, { version });
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
import React, { useState } from 'react';
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

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Yohanes 3:16, search:kasih, atau kosongkan untuk acak"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={search}
      />
      <TouchableOpacity style={styles.btn} onPress={search}>
        <Text style={styles.btnText}>Cari / Acak</Text>
      </TouchableOpacity>
      {result?.verses && (
        <FlatList
          data={result.verses}
          keyExtractor={(item, index) => String(index)}
          renderItem={({ item }) => (
            <View style={styles.verse}>
              <Text style={styles.verseNum}>{item.verse}</Text>
              <Text style={styles.verseText}>{item.text}</Text>
            </View>
          )}
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

## ⚡ Performance & Optimasi

- **Query Ayat**: < 5ms dengan B-Tree index SQLite
- **Random Verse**: < 10ms
- **FTS5 Search**: < 50ms di seluruh 31.000+ ayat
- **Strong's Lookup**: < 2ms (primary key lookup)
- **Memory Usage**: ~10–20MB berkat paged I/O SQLite

### Tips Optimasi & Caching Redis

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
    if (error.message.includes('Gagal menyiapkan database')) {
      console.error('🌐 Gagal download database. Periksa koneksi internet.');
    } else if (error.message.includes('database') || error.message.includes('SQLITE')) {
      console.error('💾 Error database SQLite:', error.message);
    } else {
      console.error('❌ Error:', error.message);
    }
    throw error;
  }
}
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
git commit -m 'feat: tambah fitur baru'
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
# Jalankan test suite
npm test

# Unduh database manual
npm run download:db

# Kompres bible.db sebelum upload ke GitHub Release
npm run compress:db

# Ekstrak bible.db.gz secara lokal
npm run extract:db
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

**Kiranya library ini menjadi berkat bagi setiap karya yang dibangun di atasnya. 🙏**

---
*"Sebab Aku ini mengetahui rancangan-rancangan apa yang ada pada-Ku mengenai kamu, demikianlah firman TUHAN, yaitu rancangan damai sejahtera dan bukan rancangan kecelakaan, untuk memberikan kepadamu hari depan yang penuh harapan."* (Yeremia 29:11 — TB)
