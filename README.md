# 📖 Al-Qur'an Digital - Complete Node.js Library

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![Database](https://img.shields.io/badge/Database-SQLite%20%2B%20FTS5-blue)
![Tafsir](https://img.shields.io/badge/Tafsir-6%20Sources-orange)

## 🎯 Filosofi Proyek

> _"Sehari baca 100 pesan bisa, tapi 1 ayat pun jarang."_

Proyek ini lahir dari kesadaran bahwa di era digital yang penuh dengan pesan dan notifikasi, kita mudah teralihkan dari hal-hal yang penting. **Library ini hadir untuk mengembalikan fokus kita kepada Al-Qur'an**, dengan menyediakan akses mudah ke ayat-ayat dan tafsirnya melalui kode program.

**Misi**: Membantu developer Muslim membangun aplikasi yang mengingatkan pada kebaikan, dengan prinsip:
- **1 Hari 25 Ayat dan Tafsir atau Hadis (random)** - Konsumsi Al-Qur'an yang terukur
- **Integrasi mudah** - Cukup beberapa baris kode
- **Sumber terpercaya** - Data dari ulama dan institusi resmi

## 📦 Instalasi Cepat

```bash
npm install @renpwn/termux-sqlite3 cheerio axios
# atau clone repository
git clone https://github.com/renpwn/alquran.js
```

## 🚀 Mulai dalam 30 Detik

```javascript
// 1. Import library
import alquranHandler from './index.js';

// 2. Query dengan berbagai format
const result = await alquranHandler('2:255');                    // Ayat Kursi
const result2 = await alquranHandler('yasin 1-10');             // Yasin ayat 1-10
const result3 = await alquranHandler('الرحمن');                 // Cari teks Arab
const result4 = await alquranHandler('dengan menyebut nama');   // Cari terjemahan
const result5 = await alquranHandler('list');                   // Daftar semua surah

// 3. Tampilkan hasil
console.log(result.ayahs[0]); // Data lengkap ayat pertama
```

**Hasil:**
```json
{
  "ayah": 255,
  "arab": "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...",
  "transliterasi": "Allāhu lā ilāha illā huw, al-ḥayyul-qayyụm...",
  "id": "Allah, tidak ada Tuhan selain Dia. Yang Mahahidup, Yang Mahaberdiri Sendiri...",
  "en": "Allah! There is no god ˹worthy of worship˺ except Him...",
  "tafsir": "Ayat Kursi adalah ayat teragung dalam Al-Qur'an...",
  "audioUrl": "https://cdn.islamic.network/quran/audio/128/ar.alafasy/256.mp3"
}
```

## 🏗️ Arsitektur Library

```
📁 PROYEK ANDA/
├── 📁 node_modules/
├── 📁 db/                    # Database SQLite (otomatis dibuat)
│   └── quran.db            # File database utama
├── index.js                📦 CORE LIBRARY - Import ini saja!
├── setting.db.js           🔧 Database connector internal
├── 📁 mt/                  ⚙️ Tools development (opsional)
│   ├── db.js              🗃️ Database initializer
│   └── quran.js           🌐 Web scraper 3-mode
└── 📁 examples/            💡 Contoh penggunaan
    └── test_lib.js        🧪 Test script
```

## 📖 API Reference Lengkap

### Fungsi Utama
```javascript
// Import library
import alquranHandler from './index.js';

// Query Al-Qur'an
const result = await alquranHandler(input, options);
```

### Parameter Input
| Format | Contoh | Deskripsi | Output |
|--------|--------|-----------|--------|
| **Nomor surah:ayat** | `"2:255"` | Ayat spesifik | Surah 2 ayat 255 |
| **Surah saja** | `"yasin"` | Seluruh surah | Semua ayat Yasin |
| **Surah + range** | `"al baqarah 1-10"` | Multiple ayat | Ayat 1-10 Al-Baqarah |
| **Pencarian teks** | `"dengan nama allah"` | Full-text search | Hasil pencarian |
| **List surah** | `"list"` | Metadata surah | 114 surah |
| **Kosong** | `""` | Random ayat | Ayat random |

### Options Object
```javascript
const options = {
  tafsir: 'kemenag',      // Pilih tafsir (default: random)
  // Pilihan: 'kemenag', 'kemenag_ringkas', 'ibnu_katsir', 
  //         'jalalain', 'quraish_shihab', 'saadi'
  
  min: true              // Output ringkas (default: false)
};
```

### Return Object
```javascript
{
  mode: 'default',      // 'default', 'search', atau 'list'
  surahNumber: 2,
  surah: "Al Baqarah",
  arti: "Sapi Betina",
  range: "255",         // atau "1-10" untuk multiple
  totalAyat: 286,
  tafsir: "kemenag",
  ayahs: [              // Array of ayat objects
    {
      ayah: 255,
      arab: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ...",
      transliterasi: "Allāhu lā ilāha illā huw...",
      id: "Allah, tidak ada Tuhan selain Dia...",
      en: "Allah! There is no god except Him...",
      tafsir: "Tafsir lengkap...",
      audioUrl: "https://cdn.islamic.network/.../256.mp3"
    }
  ],
  debug: {              // Hanya jika ada fuzzy matching
    input: "albaqarah",
    bestMatch: "albaqarah",
    rating: 0.95,
    top5: [...]        // 5 hasil terdekat
  }
}
```

## 🔧 Setup Database & Scraping

### Inisialisasi Database Pertama Kali
```bash
# 1. Pastikan folder db/ ada
mkdir -p db

# 2. Jalankan scraper mode 1 (Web → JSON & Database)
node mt/quran.js -m 1 -b -c 5

# Parameter:
# -m 1  : Mode 1 (Web ke JSON & DB)
# -b    : Batch mode (semua 114 surah)
# -c 5  : 5 concurrent requests
```

### 3 Mode Scraper
```bash
# Mode 1: Web scraping → JSON & Database (lengkap)
node mt/quran.js -m 1 -S 36        # Hanya surah 36 (Yasin)
node mt/quran.js -m 1 -s 1 -b      # Semua surah dari awal

# Mode 2: Web scraping → JSON saja
node mt/quran.js -m 2 -S 1         # Surah 1 ke JSON

# Mode 3: JSON → Database (migrasi)
node mt/quran.js -m 3 -b           # Migrasi semua JSON ke DB

# Opsi tambahan:
# -r : Resume (skip data yang sudah ada)
# -c : Concurrency (default: 5)
# -S : Single surah (misal: -S 1)
# -s : Start from (misal: -s 41)
```

### Help Command
```bash
node mt/quran.js --help
```

## 🗃️ Struktur Database

Library ini menggunakan **SQLite dengan FTS5** untuk pencarian super cepat:

### Tabel Utama
```sql
-- 1. Surah metadata
CREATE TABLE surahs (
  no INTEGER PRIMARY KEY,    -- 1-114
  name TEXT NOT NULL,        -- "Al Fatihah"
  ar TEXT,                   -- "الفاتحة"
  en TEXT,                   -- "The Opening"
  id TEXT,                   -- "Pembuka"
  ayat INTEGER NOT NULL,     -- Jumlah ayat
  place TEXT                 -- 'Meccan' atau 'Medinan'
);

-- 2. Ayat text
CREATE TABLE ayahs (
  id INTEGER PRIMARY KEY,
  surah_id INTEGER REFERENCES surahs(no),
  ayat INTEGER,              -- Nomor ayat dalam surah
  text_ar TEXT,              -- Teks Arab
  text_latin TEXT            -- Transliterasi
);

-- 3. Terjemahan
CREATE TABLE translations (
  id INTEGER PRIMARY KEY,
  surah_id INTEGER,
  ayah_id INTEGER,
  lang TEXT,                 -- 'id' atau 'en'
  text TEXT
);

-- 4. Tafsir dari 6 sumber
CREATE TABLE tafsirs (
  id INTEGER PRIMARY KEY,
  surah_id INTEGER,
  ayah_id INTEGER,
  kitab TEXT,                -- 'kemenag', 'ibnu_katsir', dll
  text TEXT
);
```

### Full-Text Search Tables
```sql
-- Virtual tables untuk pencarian instan
CREATE VIRTUAL TABLE surahs_fts USING fts5(...);
CREATE VIRTUAL TABLE ayahs_fts USING fts5(...);
CREATE VIRTUAL TABLE translations_fts USING fts5(...);
CREATE VIRTUAL TABLE tafsirs_fts USING fts5(...);
```

## 🔍 Advanced Usage

### 1. Manual Database Access
```javascript
import { openDB, closeDB } from './setting.db.js';

// Buka koneksi manual
const db = openDB();

// Query langsung
const surahs = await db.all('SELECT * FROM surahs ORDER BY no');
const ayat = await db.get(
  'SELECT * FROM ayahs WHERE surah_id = ? AND ayat = ?',
  [2, 255]
);

// Jangan lupa close!
await closeDB();
```

### 2. Implementasi "1 Hari 25 Ayat"
```javascript
// Sistem harian: 25 ayat random per hari dengan tafsir
async function getDaily25Ayat() {
  const results = [];
  
  for (let i = 0; i < 25; i++) {
    const surah = Math.floor(Math.random() * 114) + 1;
    const ayatResult = await alquranHandler(`${surah}`, { 
      tafsir: ['kemenag', 'ibnu_katsir', 'quraish_shihab'][Math.floor(Math.random() * 3)]
    });
    
    // Ambil random ayat dari surah tersebut
    const randomAyatIndex = Math.floor(Math.random() * ayatResult.ayahs.length);
    results.push(ayatResult.ayahs[randomAyatIndex]);
  }
  
  return results;
}

// Gunakan untuk notifikasi harian
const dailyAyat = await getDaily25Ayat();
dailyAyat.forEach((ayat, index) => {
  console.log(`Ayat ${index + 1}: ${ayat.arab}\nTafsir: ${ayat.tafsir?.substring(0, 100)}...\n`);
});
```

### 3. Batch Processing
```javascript
// Proses multiple query
const queries = ['2:255', 'yasin 1', 'al kahfi 10'];
const results = [];

for (const query of queries) {
  const result = await alquranHandler(query);
  results.push(result);
}
```

### 4. Custom Tafsir Selection
```javascript
// Loop semua tafsir untuk satu ayat
const tafsirSources = [
  'kemenag',
  'kemenag_ringkas', 
  'ibnu_katsir',
  'jalalain',
  'quraish_shihab',
  'saadi'
];

for (const tafsir of tafsirSources) {
  const result = await alquranHandler('1:1', { tafsir });
  console.log(`Tafsir ${tafsir}:`, result.ayahs[0].tafsir);
}
```

### 5. Audio Streaming
```javascript
const result = await alquranHandler('2:255');
const audioUrl = result.ayahs[0].audioUrl;

// Gunakan di web app
// <audio src="${audioUrl}" controls></audio>

// Download dengan Node.js
import fs from 'fs';
import https from 'https';

https.get(audioUrl, (response) => {
  response.pipe(fs.createWriteStream('ayat-kursi.mp3'));
});
```

## 📊 Sumber Data Terpercaya

### Al-Qur'an & Tafsir
| Komponen | Sumber | Kualitas |
|----------|--------|----------|
| **Teks Arab Utsmani** | [LiteQuran.net](https://litequran.net/) | Standar Madinah |
| **Terjemahan Kemenag** | Qur'an Kemenag RI | Resmi Indonesia |
| **Transliterasi** | [LiteQuran.net](https://litequran.net/) | Latinisasi akurat |
| **Tafsir Kemenag** | [Qurano.com](https://qurano.com/) | Lengkap & ringkas |
| **Tafsir Ibnu Katsir** | [Qurano.com](https://qurano.com/) | Klasik rujukan |
| **Tafsir Jalalain** | [Qurano.com](https://qurano.com/) | Ringkas padat |
| **Tafsir Quraish Shihab** | [Qurano.com](https://qurano.com/) | Kontekstual modern |
| **Tafsir Saadi** | [Qurano.com](https://qurano.com/) | Penjelasan sederhana |
| **Audio Murottal** | [Islamic Network](https://islamic.network/) | Syaikh Alafasy 128kbps |
| **Hadis** | [IlmuIslam.id](https://ilmuislam.id/) | Shahih & terjemahan |

### Murottal Qur'an dan Terjemahan
- **Google Drive (AMR & MP3)**: [Download](https://drive.google.com/drive/folders/1GWvlW5HGBDkbvSFMb46AsqE7UA5XAT22)
- **Source MP3**: [IslamDownload](https://islamdownload.net/124170-murottal-al-quran-dan-terjemahannya-oleh-syaikh-misyari-rasyid.html)
- **Listening Online**: 
  - [Archive.org](https://archive.org/details/AlQuranTerjemahanBahasaIndonesiaArabic)
  - [Spotify](https://open.spotify.com/show/32VV2OExP3MRGe7mNkP2mh?si=MWNDI0qVS02APQ7TrIOSBg)

## 🎯 Fitur Unggulan

### ✅ **Fuzzy Matching Cerdas**
```javascript
// Auto-correct otomatis
await alquranHandler('albaqara 255');    // → Al Baqarah 255
await alquranHandler('fatiha');          // → Al Fatihah
await alquranHandler('yaasiin');         // → Yasin
```

### ✅ **Pencarian Full-Text**
```javascript
// Cari di semua teks: Arab, Latin, Terjemahan
await alquranHandler('bismillah');
await alquranHandler('inna lillahi');
await alquranHandler('dengan menyebut nama');
await alquranHandler('allahu akbar');
```

### ✅ **Audio Global Index**
Setiap ayat memiliki nomor audio global yang konsisten:
- Al-Fatihah:1 → audio #1
- Al-Baqarah:1 → audio #8 (7+1)
- Al-Baqarah:255 → audio #262

### ✅ **Multiple Tafsir Sources**
6 sumber tafsir dalam 1 database:
1. Kemenag (lengkap)
2. Kemenag Ringkas
3. Ibnu Katsir
4. Jalalain
5. Quraish Shihab
6. Saadi

## ⚡ Performance

- **Query waktu**: < 50ms untuk kebanyakan operasi
- **Pencarian FTS5**: < 100ms untuk 10k+ ayat
- **Memory usage**: ~5MB untuk database 50MB
- **Concurrent users**: Support 100+ dengan connection pooling

## 🚨 Error Handling

```javascript
try {
  const result = await alquranHandler('invalid:input');
} catch (error) {
  console.error('Error types:');
  console.error('- Database not initialized');
  console.error('- Invalid query format');
  console.error('- Network error (for scraping)');
  console.error('- File system error');
}
```

## 📈 Use Cases

### 1. **Bot WhatsApp/Telegram**
```javascript
// Contoh: Bot pengirim ayat harian otomatis
// *Hanya admin yang bisa kirim pesan ke grup*
// Fitur: 1 Hari 25 Ayat dan Tafsir atau Hadis (random)

async function sendDailyAyatToGroup() {
  const dailyAyat = await getDaily25Ayat();
  
  // Format pesan untuk WhatsApp/Telegram
  const message = dailyAyat.map((ayat, index) => 
    `*Ayat ${index + 1}:* ${ayat.arab}\n` +
    `*Terjemahan:* ${ayat.id.substring(0, 100)}...\n` +
    `*Tafsir:* ${ayat.tafsir?.substring(0, 150)}...\n` +
    `────────────────────`
  ).join('\n\n');
  
  return message;
}
```

### 2. **Aplikasi Mobile**
```javascript
// React Native / Expo
import alquranHandler from '@renpwn/alquran';

function App() {
  const [ayat, setAyat] = useState(null);
  
  useEffect(() => {
    alquranHandler('2:255').then(setAyat);
  }, []);
}
```

### 3. **Website Islamic**
```javascript
// Next.js API Route
export default async function handler(req, res) {
  const { query, tafsir } = req.query;
  const result = await alquranHandler(query, { tafsir });
  res.json(result);
}
```

### 4. **E-Learning Platform**
```javascript
// Sistem belajar harian dengan progress tracking
class QuranLearningSystem {
  constructor() {
    this.dailyGoal = 25; // 25 ayat per hari
    this.completed = 0;
  }
  
  async getNextAyat() {
    const surah = Math.floor(Math.random() * 114) + 1;
    const result = await alquranHandler(`${surah}`);
    const randomAyat = result.ayahs[Math.floor(Math.random() * result.ayahs.length)];
    
    this.completed++;
    return {
      ayat: randomAyat,
      progress: `${this.completed}/${this.dailyGoal}`,
      completed: this.completed >= this.dailyGoal
    };
  }
}
```

## 🤝 Komunitas & Grup

### **Grup WhatsApp Al-Qur'an & Hadis**
- **Group Chat**: [Join WhatsApp Group](https://chat.whatsapp.com/IQFzaK1AIlz3uRALVBKRA8)
  
- **WhatsApp Channel**: [Join Channel](https://whatsapp.com/channel/0029VaZzOuI3rZZY5YLVQP0W)
- **Telegram Channel**: [@renpwn_quranhadis](https://t.me/renpwn_quranhadis)

### **Update & Info Bot**
- **Channel Update Bot**: [WhatsApp Channel](https://whatsapp.com/channel/0029VaGSK1P30LKTKAzint0N)

### **𝑺𝒑𝒐𝒏𝒔𝒐𝒓𝒆𝒅 𝒃𝒚 **
**RENPWN** - available on:
- **𝐓𝐨𝐤𝐩𝐞𝐝𝐢𝐚**: [tokopedia.com/renpwn](https://tokopedia.com/renpwn)
- **𝐒𝐡𝐨𝐩𝐞𝐞**: [shopee.co.id/renpwn](https://shopee.co.id/renpwn)
- **𝐓𝐢𝐤𝐓𝐨𝐤**: [tiktok.com/@renpwn](https://tiktok.com/@renpwn)
- **YouTube**: [@RenPwn](https://www.youtube.com/@RenPwn)

## 🔄 Maintenance

### Update Database
```bash
# Update tafsir untuk surah tertentu
node mt/quran.js -m 1 -S 36 -r

# Update semua data dari web
node mt/quran.js -m 1 -b -r -c 3
```

### Backup & Restore
```bash
# Backup database
cp db/quran.db db/quran.backup.$(date +%Y%m%d).db

# Restore
cp db/quran.backup.20240101.db db/quran.db

# Export ke JSON
node -e "const db=require('./setting.db.js').openDB(); db.all('SELECT * FROM ayahs', (err,rows)=>{require('fs').writeFileSync('export.json',JSON.stringify(rows))})"
```

## 📝 Contoh Lengkap

Lihat `examples/test_lib.js` untuk contoh implementasi lengkap:

```javascript
import alquranHandler, { openDB, closeDB } from "./index.js";

(async () => {
  const tests = [
    "",           // Random ayat
    "2:255",      // Ayat Kursi
    "2 1-10",     // Al-Baqarah 1-10
    "baqa 1-5",   // Fuzzy match
    "yasin",      // Seluruh surah
    "list",       // Daftar surah
    "al kahfi 10" // Pencarian spesifik
  ];
  
  for (const query of tests) {
    const result = await alquranHandler(query);
    console.log(`\n${query}:`, result.surah, result.range);
  }
})();
```

## 🔗 GitHub Repository

Library ini tersedia di GitHub: [github.com/renpwn/alquran.js](https://github.com/renpwn/alquran.js)

## 🤝 Kontribusi

1. Fork repository
2. Buat feature branch
3. Commit changes
4. Push ke branch
5. Buat Pull Request

**Area yang butuh kontribusi:**
- Terjemahan bahasa lain
- Tafsir tambahan
- Unit tests
- Performance optimization

## 📄 License

MIT License - bebas digunakan untuk proyek komersial & non-komersial.

## 🌐 Links & Support

- **GitHub**: [github.com/renpwn/alquran.js](https://github.com/renpwn/alquran.js)
- **Issues**: [GitHub Issues](https://github.com/renpwn/alquran.js/issues)
- **Contact**: [@renpwn_ren](https://instagram.com/renpwn_ren)
- **YouTube**: [@RenPwn](https://www.youtube.com/@RenPwn)

---

**⭐ Pro Tip**: Untuk production, cache hasil query di Redis/Memcached untuk performa maksimal!

```javascript
// Simple cache implementation
const cache = new Map();

async function cachedAlquran(query, options) {
  const key = JSON.stringify({ query, options });
  
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const result = await alquranHandler(query, options);
  cache.set(key, result);
  
  // Auto-expire setelah 1 jam
  setTimeout(() => cache.delete(key), 3600000);
  
  return result;
}
```

**Selamat mengembangkan aplikasi yang mengingatkan pada kebaikan! 🚀**