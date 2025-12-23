import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import * as cheerio from 'cheerio'
import axios from 'axios'
import { openDB } from './db.js'

const sleep = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* =========================
   DAFTAR KITAB ALKITAB
========================= */
// [Nama Kitab, Jumlah Pasal, Jumlah Ayat, Jumlah Perikop]
const BibleBooks = [
  ["Kejadian", 50, 1533, 81],
  ["Keluaran", 40, 1213, 87],
  ["Imamat", 27, 859, 40],
  ["Bilangan", 36, 1288, 64],
  ["Ulangan", 34, 959, 86],
  ["Yosua", 24, 658, 40],
  ["Hakim-hakim", 21, 618, 36],
  ["Rut", 4, 85, 5],
  ["1 Samuel", 31, 811, 45],
  ["2 Samuel", 24, 695, 49],
  ["1 Raja-raja", 22, 817, 52],
  ["2 Raja-raja", 25, 719, 56],
  ["1 Tawarikh", 29, 942, 50],
  ["2 Tawarikh", 36, 822, 54],
  ["Ezra", 10, 280, 12],
  ["Nehemia", 13, 407, 18],
  ["Ester", 10, 167, 13],
  ["Ayub", 42, 1070, 41],
  ["Mazmur", 150, 2527, 148],
  ["Amsal", 31, 915, 18],
  ["Pengkhotbah", 12, 222, 18],
  ["Kidung Agung", 8, 117, 16],
  ["Yesaya", 66, 1292, 110],
  ["Yeremia", 52, 1364, 88],
  ["Ratapan", 5, 154, 5],
  ["Yehezkiel", 48, 1273, 71],
  ["Daniel", 12, 357, 13],
  ["Hosea", 14, 197, 21],
  ["Yoel", 3, 73, 7],
  ["Amos", 9, 146, 27],
  ["Obaja", 1, 21, 2],
  ["Yunus", 4, 48, 4],
  ["Mikha", 7, 105, 13],
  ["Nahum", 3, 47, 5],
  ["Habakuk", 3, 56, 7],
  ["Zefanya", 3, 53, 6],
  ["Hagai", 2, 38, 5],
  ["Zakharia", 14, 211, 25],
  ["Maleakhi", 4, 55, 9],
  ["Matius", 28, 1071, 132],
  ["Markus", 16, 678, 87],
  ["Lukas", 24, 1151, 140],
  ["Yohanes", 21, 878, 73],
  ["Kisah Para Rasul", 28, 1006, 76],
  ["Roma", 16, 434, 38],
  ["1 Korintus", 16, 437, 31],
  ["2 Korintus", 13, 256, 23],
  ["Galatia", 6, 149, 15],
  ["Efesus", 6, 155, 14],
  ["Filipi", 4, 104, 12],
  ["Kolose", 4, 95, 9],
  ["1 Tesalonika", 5, 89, 10],
  ["2 Tesalonika", 3, 47, 6],
  ["1 Timotius", 6, 113, 15],
  ["2 Timotius", 4, 83, 9],
  ["Titus", 3, 46, 6],
  ["Filemon", 1, 25, 4],
  ["Ibrani", 13, 303, 21],
  ["Yakobus", 5, 108, 15],
  ["1 Petrus", 5, 105, 13],
  ["2 Petrus", 3, 61, 6],
  ["1 Yohanes", 5, 105, 13],
  ["2 Yohanes", 1, 13, 3],
  ["3 Yohanes", 1, 15, 3],
  ["Yudas", 1, 25, 4],
  ["Wahyu", 22, 405, 48]
]

/* =========================
   VERSI ALKITAB YANG AKAN DIAMBIL
========================= */
const BibleVersions = [
  { id: 'tb', name: 'Alkitab Terjemahan Baru-LAI', language: 'id', category: 'core' },
  { id: 'bis', name: 'Alkitab Kabar Baik (BIS-LAI)', language: 'id', category: 'core' },
  { id: 'tl', name: 'Alkitab Terjemahan Lama', language: 'id', category: 'global' },
  { id: 'ende', name: 'Alkitab Ende', language: 'id', category: 'global' },
  { id: 'tb_itl_drf', name: 'TB Interlinear [draft]', language: 'id', category: 'advance', supports_strong: true },
  { id: 'tl_itl_drf', name: 'TL Interlinear [draft]', language: 'id', category: 'advance', supports_strong: true },
  { id: 'bbe', name: 'Bible in Basic English', language: 'en', category: 'global' },
  { id: 'message', name: 'The Message Bible', language: 'en', category: 'global' },
  { id: 'nkjv', name: 'New King James Version', language: 'en', category: 'global' },
  { id: 'net', name: 'NET Bible [draft]', language: 'en', category: 'advance', supports_strong: true },
  { id: 'net2', name: 'NET Bible [draft] Lab', language: 'en', category: 'advance', supports_strong: true }
]

/* =========================
   KONFIGURASI
========================= */
let db = null
const DB_PATH = "./bible.db"
const BIBLE_DIR = "./json_bible"
const BIBLE_DIR_MIN = "./json_bible_min"

// Helper untuk mendapatkan __dirname di ES Module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Helper untuk escape string SQL
function esc(s = "") {
  if (!s) return ""
  return s
    .replace(/'/g, "''")
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\t/g, " ")
    .trim()
}

// Parse arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    mode: 1,
    start: 1,
    book: null,
    concurrency: 3,
    batch: false,
    resume: false,
    versions: [] // filter versi tertentu
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === "--mode" || arg === "-m") {
      options.mode = parseInt(args[++i]) || 1
    } else if (arg === "--start" || arg === "-s") {
      options.start = parseInt(args[++i]) || 1
    } else if (arg === "--book" || arg === "-b") {
      options.book = parseInt(args[++i])
      options.batch = false
    } else if (arg === "--concurrency" || arg === "-c") {
      options.concurrency = parseInt(args[++i]) || 3
    } else if (arg === "--batch" || arg === "-B") {
      options.batch = true
    } else if (arg === "--resume" || arg === "-r") {
      options.resume = true
    } else if (arg === "--versions" || arg === "-v") {
      options.versions = args[++i].split(',')
    } else if (arg === "--help" || arg === "-h") {
      showHelp()
      process.exit(0)
    }
  }

  return options
}

function showHelp() {
  console.log(`
📖 Bible Scraper - SABDAweb

Mode:
  1: Web → JSON & DB (default)
  2: Web → JSON
  3: JSON → DB

Penggunaan:
  node bible.js [options]

Options:
  -m, --mode <mode>        Mode pengambilan data (1-3)
  -s, --start <no>         Mulai dari kitab ke-n (default: 1)
  -b, --book <no>          Proses satu kitab saja
  -c, --concurrency <n>    Jumlah request paralel (default: 3)
  -B, --batch              Proses semua kitab sekaligus
  -r, --resume             Resume proses (cek data yang sudah ada)
  -v, --versions <list>    Filter versi tertentu (comma separated: tb,bis,tl)
  -h, --help               Tampilkan bantuan ini

Contoh:
  node bible.js                     # Mode 1, kitab 1
  node bible.js -m 1 -s 40 -B       # Mode 1, mulai kitab 40, semua
  node bible.js -m 2 -b 1           # Mode 2, hanya kitab 1
  node bible.js -m 3 -c 3 -B        # Mode 3, 3 paralel, semua kitab
  node bible.js -m 1 -v tb,bis -B   # Mode 1, hanya versi TB dan BIS
  `)
}

/* =========================
   SISTEM QUEUE
========================= */

class DatabaseQueue {
  constructor(db, maxConcurrent = 1) {
    this.db = db
    this.maxConcurrent = maxConcurrent
    this.queue = []
    this.processing = 0
    this.completed = 0
    this.failed = 0
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject })
      this.process()
    })
  }

  async process() {
    while (this.queue.length > 0 && this.processing < this.maxConcurrent) {
      const { task, resolve, reject } = this.queue.shift()
      this.processing++

      task()
        .then(result => {
          resolve(result)
          this.completed++
        })
        .catch(error => {
          reject(error)
          this.failed++
          console.error("❌ Database task failed:", error.message)
        })
        .finally(() => {
          this.processing--
          this.process()
        })
    }
  }

  async waitUntilEmpty() {
    while (this.queue.length > 0 || this.processing > 0) {
      await sleep(100)
    }
  }
}

class BibleQueue {
  constructor(concurrency = 3) {
    this.concurrency = concurrency
    this.queue = []
    this.processing = 0
    this.completed = 0
    this.failed = 0
    this.total = 0
    this.results = []
  }

  add(task) {
    this.queue.push(task)
    this.total++
  }

  async process() {
    const workers = []

    const worker = async () => {
      while (this.queue.length > 0) {
        const task = this.queue.shift()
        if (!task) continue

        this.processing++
        try {
          const result = await task()
          this.results.push(result)
          this.completed++
        } catch (error) {
          this.failed++
          console.error("Task error:", error.message)
        } finally {
          this.processing--
          this.showProgress()
        }
      }
    }

    for (let i = 0; i < Math.min(this.concurrency, this.total); i++) {
      workers.push(worker())
    }

    await Promise.all(workers)
    return this.results
  }

  showProgress() {
    const processed = this.completed + this.failed
    const progress = Math.round(processed / this.total * 100)
    process.stdout.write(`\r📊 Progress: ${processed}/${this.total} pasal (${progress}%) | Active: ${this.processing} | Failed: ${this.failed}`)
  }
}

/* =========================
   FUNGSI UMUM
========================= */

async function fetchUrl(url, options = {}, retryCount = 3) {
  for (let i = 0; i < retryCount; i++) {
    try {
      const res = await axios({
        method: 'GET',
        url,
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'accept': 'text/html,application/xhtml+xml,application/xml',
          'accept-language': 'id-ID,id;q=0.9,en;q=0.8',
          ...options.headers
        },
        timeout: 30000,
        ...options
      })
      return res.data
    } catch (err) {
      console.log(`⏳ Retry ${i + 1}/${retryCount} untuk ${url}`)
      if (i === retryCount - 1) throw err
      await sleep(5000 * (i + 1))
    }
  }
}

async function buildSabdaUrl(bookId, chapter, versions = BibleVersions) {
  // Parameter altver untuk versi tambahan
  const altVersions = versions
    .filter(v => v.id !== 'tb') // TB adalah versi utama
    .map(v => `altver%5B%5D=${v.id}`)
    .join('&')
  
  const baseUrl = `https://sabdaweb.sabda.org/bible/chapter/`
  const params = new URLSearchParams({
    b: bookId,
    c: chapter,
    v: 1,
    version: 'tb',
    view: 'column',
    page: 'chapter',
    lang: 'indonesia',
    theme: 'clearsky'
  })
  
  // Tambahkan altver parameters
  const altParams = altVersions ? `&${altVersions}` : ''
  
  return `${baseUrl}?${params.toString()}${altParams}`
}

async function parseChapterHTML(html, bookId, chapter, targetVersions = BibleVersions) {
  const $ = cheerio.load(html)
  const verses = []
  
  // Cari semua baris ayat dalam tabel
  const verseRows = $('tr[id="b"]')
  
  // Jika tidak ditemukan dengan id="b", coba dengan class lain
  if (verseRows.length === 0) {
    $('tr').each((i, row) => {
      if ($(row).find('td[id="l"]').length > 0) {
        verseRows.push(row)
      }
    })
  }
  
  // Mapping urutan kolom ke versi (berdasarkan header)
  const headerRow = $('tr:contains("TB")').first()
  const versionOrder = []
  
  headerRow.find('td[id="d"]').each((i, td) => {
    const versionText = $(td).text().trim()
    const version = targetVersions.find(v => 
      versionText.includes(v.name.split(' ')[0]) || 
      versionText.toLowerCase().includes(v.id)
    )
    if (version) {
      versionOrder.push(version.id)
    }
  })
  
  // Jika tidak bisa detect header, gunakan urutan default
  if (versionOrder.length === 0) {
    versionOrder.push(...targetVersions.map(v => v.id))
  }
  
  // Parse setiap ayat
  verseRows.each((rowIndex, row) => {
    const cells = $(row).find('td')
    const verseData = { verse: rowIndex + 1, texts: {} }
    
    // Kolom pertama biasanya berisi nomor ayat dan teks TB
    const firstCell = $(cells[0])
    const verseNumMatch = firstCell.find('a[name]').attr('name') || 
                         firstCell.find('b').text().match(/\d+:\d+/)
    
    if (verseNumMatch) {
      const verseNum = typeof verseNumMatch === 'string' ? 
                      verseNumMatch.split(':')[1] || verseNumMatch : 
                      (rowIndex + 1)
      verseData.verse = parseInt(verseNum)
    }
    
    // Ambil teks untuk setiap versi
    cells.each((cellIndex, cell) => {
      if (cellIndex < versionOrder.length) {
        const versionId = versionOrder[cellIndex]
        let text = $(cell).html() || $(cell).text()
        
        // Hapus tag anchor dan bold
        text = text.replace(/<a[^>]*>.*?<\/a>/gi, '')
                   .replace(/<b>.*?<\/b>/gi, '')
                   .replace(/<\/?[^>]+(>|$)/g, '')
                   .trim()
        
        // Hapus nomor ayat di awal (format "1:1 ")
        text = text.replace(/^\d+:\d+\s*/, '').trim()
        
        verseData.texts[versionId] = text
      }
    })
    
    // Juga parse interlinear jika ada
    verseData.interlinear = {}
    cells.each((cellIndex, cell) => {
      const cellHtml = $(cell).html()
      if (cellHtml && cellHtml.includes('../../tools/lexicon/')) {
        const versionId = versionOrder[cellIndex]
        if (versionId.includes('itl') || versionId.includes('interlinear')) {
          const words = []
          const links = $(cell).find('a[href*="lexicon"]')
          
          links.each((linkIndex, link) => {
            const href = $(link).attr('href')
            const wordText = $(link).text().trim()
            const strongMatch = href.match(/w=(\d+)/)
            
            words.push({
              position: linkIndex + 1,
              word: wordText,
              strong: strongMatch ? strongMatch[1] : null,
              lemma: null, // Bisa di-parse dari halaman lexicon nanti
              morphology: null
            })
          })
          
          if (words.length > 0) {
            verseData.interlinear[versionId] = words
          }
        }
      }
    })
    
    if (verseData.texts && Object.keys(verseData.texts).length > 0) {
      verses.push(verseData)
    }
  })
  
  return {
    bookId,
    chapter,
    verses,
    totalVerses: verses.length,
    versionOrder
  }
}

async function getChapterData(bookId, chapter, targetVersions) {
  try {
    const url = await buildSabdaUrl(bookId, chapter, targetVersions)
    console.log(`🌐 Fetching: ${BibleBooks[bookId-1][0]} ${chapter}`)
    
    const html = await fetchUrl(url)
    const chapterData = await parseChapterHTML(html, bookId, chapter, targetVersions)
    
    return {
      success: true,
      data: chapterData
    }
  } catch (error) {
    console.error(`❌ Gagal ambil ${bookId}:${chapter}:`, error.message)
    return {
      success: false,
      error: error.message,
      bookId,
      chapter
    }
  }
}

/* =========================
   MODE 1 & 2: WEB → JSON & DB
========================= */

async function processBook(bookId, concurrency = 3, resume = false, mode = 1, targetVersions = BibleVersions) {
  const bookInfo = BibleBooks[bookId - 1]
  const totalChapters = bookInfo[1]
  
  console.log(`\n📖 Memproses kitab ${bookId}: ${bookInfo[0]}`)
  console.log(`📊 Total pasal: ${totalChapters}, Concurrency: ${concurrency}`)
  console.log(`📚 Versi: ${targetVersions.map(v => v.id).join(', ')}`)
  
  // Buat struktur data untuk kitab
  const bookData = {
    id: bookId,
    name: bookInfo[0],
    chapters: totalChapters,
    totalVerses: bookInfo[2],
    pericopes: bookInfo[3],
    testament: bookId <= 39 ? 'OT' : 'NT',
    data: []
  }
  
  // Cek pasal yang sudah ada jika resume
  const chaptersToProcess = []
  if (mode === 1 && resume) {
    // Cek di database
    for (let chapter = 1; chapter <= totalChapters; chapter++) {
      const hasData = await checkChapterInDB(bookId, chapter, targetVersions)
      if (!hasData) {
        chaptersToProcess.push(chapter)
      }
    }
  } else {
    chaptersToProcess.push(...Array.from({length: totalChapters}, (_, i) => i + 1))
  }
  
  if (chaptersToProcess.length === 0) {
    console.log(`✅ Semua pasal kitab ${bookId} sudah lengkap`)
    return true
  }
  
  console.log(`🔄 Mengambil ${chaptersToProcess.length} pasal...`)
  
  // Buat queue untuk pengambilan data
  const webQueue = new BibleQueue(concurrency)
  
  for (const chapter of chaptersToProcess) {
    webQueue.add(async () => {
      const result = await getChapterData(bookId, chapter, targetVersions)
      
      if (result.success) {
        bookData.data.push(result.data)
        
        // Simpan ke database jika mode 1
        if (mode === 1) {
          await saveChapterToDB(result.data, targetVersions)
        }
      }
      
      return result
    })
  }
  
  // Proses queue
  await webQueue.process()
  
  // Tunggu database queue jika mode 1
  if (mode === 1 && dbQueue) {
    console.log(`\n⏳ Menunggu operasi database selesai...`)
    await dbQueue.waitUntilEmpty()
  }
  
  // Simpan ke file JSON
  const filename = `${BIBLE_DIR}/Bible_${bookId}_${bookInfo[0].replace(/\s+/g, '_')}.json`
  await fs.writeFile(filename, JSON.stringify(bookData, null, 2))
  
  // Simpan versi minified
  const filenameMin = `${BIBLE_DIR_MIN}/Bible_${bookId}.min.json`
  await fs.writeFile(filenameMin, JSON.stringify(bookData))
  
  console.log(`\n✅ Kitab ${bookId} selesai diproses`)
  console.log(`📊 Statistik: ${webQueue.completed} berhasil, ${webQueue.failed} gagal`)
  
  return webQueue.failed === 0
}

async function checkChapterInDB(bookId, chapter, targetVersions) {
  if (!db) return false
  
  try {
    // Cek apakah semua versi untuk pasal ini sudah ada
    const versionIds = targetVersions.map(v => `'${v.id}'`).join(',')
    const result = await db.get(`
      SELECT COUNT(DISTINCT version) as count
      FROM verses 
      WHERE book_id = ${bookId} AND chapter = ${chapter}
      AND version IN (${versionIds})
    `)
    
    return result && result.count >= targetVersions.length
  } catch (error) {
    return false
  }
}

async function saveChapterToDB(chapterData, targetVersions) {
  if (!db) return
  
  const { bookId, chapter, verses } = chapterData
  
  for (const verseData of verses) {
    await dbQueue.add(async () => {
      try {
        // Simpan setiap versi untuk ayat ini
        for (const version of targetVersions) {
          const versionId = version.id
          const text = verseData.texts[versionId]
          
          if (text && text.trim()) {
            // Insert ke tabel verses
            await db.run(`
              INSERT OR REPLACE INTO verses (book_id, chapter, verse, version, text)
              VALUES (?, ?, ?, ?, ?)
            `, [bookId, chapter, verseData.verse, versionId, text])
            
            // Jika ini versi interlinear, simpan kata per kata
            if (verseData.interlinear && verseData.interlinear[versionId]) {
              const words = verseData.interlinear[versionId]
              for (const word of words) {
                await db.run(`
                  INSERT OR REPLACE INTO interlinear_words 
                  (book_id, chapter, verse, position, version, source_word, strong)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                  bookId, chapter, verseData.verse, 
                  word.position, versionId, word.word, word.strong
                ])
              }
            }
          }
        }
        
        return true
      } catch (error) {
        console.error(`❌ Gagal menyimpan ${bookId}:${chapter}:${verseData.verse}:`, error.message)
        throw error
      }
    })
  }
}

/* =========================
   MODE 3: JSON → DB
========================= */

async function migrateJSONtoDB(bookId) {
  console.log(`\n📁 Migrasi kitab ${bookId}...`)
  
  const filename = `${BIBLE_DIR}/Bible_${bookId}_*.json`
  const files = await fs.readdir(BIBLE_DIR)
  const bookFile = files.find(f => f.startsWith(`Bible_${bookId}_`))
  
  if (!bookFile) {
    console.error(`❌ File JSON untuk kitab ${bookId} tidak ditemukan`)
    return false
  }
  
  const filePath = `${BIBLE_DIR}/${bookFile}`
  
  try {
    const bookData = JSON.parse(await fs.readFile(filePath, "utf8"))
    console.log(`📊 Kitab: ${bookData.name}, Total pasal: ${bookData.data.length}`)
    
    // Simpan informasi kitab
    await dbQueue.add(async () => {
      await db.run(`
        INSERT OR REPLACE INTO books (id, name, chapters, total_verses, pericopes, testament)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        bookData.id,
        bookData.name,
        bookData.chapters,
        bookData.totalVerses,
        bookData.pericopes,
        bookData.testament
      ])
    })
    
    // Proses setiap pasal
    let successCount = 0
    let failCount = 0
    
    for (const chapterData of bookData.data) {
      try {
        await saveChapterToDB(chapterData, BibleVersions)
        successCount++
        
        // Tampilkan progress
        if (successCount % 5 === 0 || successCount === bookData.data.length) {
          const progress = Math.round(successCount / bookData.data.length * 100)
          process.stdout.write(`\r📊 Progress: ${successCount}/${bookData.data.length} pasal (${progress}%)`)
        }
        
      } catch (error) {
        console.error(`\n❌ Gagal migrasi pasal ${chapterData.chapter}:`, error.message)
        failCount++
      }
    }
    
    // Tunggu database queue selesai
    await dbQueue.waitUntilEmpty()
    
    console.log(`\n✅ Migrasi selesai: ${successCount} berhasil, ${failCount} gagal`)
    return failCount === 0
    
  } catch (error) {
    console.error(`❌ Gagal migrasi kitab ${bookId}:`, error.message)
    return false
  }
}

/* =========================
   FUNGSI INIT DATABASE
========================= */

async function initializeDatabase() {
  console.log("\n📊 Inisialisasi database...")
  
  // Insert versi-versi Alkitab
  for (const version of BibleVersions) {
    await dbQueue.add(async () => {
      await db.run(`
        INSERT OR REPLACE INTO versions (id, name, language, category, supports_strong, is_default)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        version.id,
        version.name,
        version.language,
        version.category || 'global',
        version.supports_strong ? 1 : 0,
        version.id === 'tb' ? 1 : 0  // TB sebagai default
      ])
    })
  }
  
  // Insert data kitab
  for (let i = 0; i < BibleBooks.length; i++) {
    const book = BibleBooks[i]
    await dbQueue.add(async () => {
      await db.run(`
        INSERT OR REPLACE INTO books (id, name, chapters, total_verses, pericopes, testament, position)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        i + 1,
        book[0],
        book[1],
        book[2],
        book[3],
        i < 39 ? 'OT' : 'NT',
        i + 1
      ])
    })
  }
  
  await dbQueue.waitUntilEmpty()
  console.log("✅ Database initialized")
}

/* =========================
   FUNGSI UTAMA
========================= */

let dbQueue = null

async function main() {
  const options = parseArgs()
  
  console.log("=".repeat(60))
  console.log("📖 BIBLE SABDAWEB SCRAPER")
  console.log("=".repeat(60))
  
  const modeNames = {
    1: "Web → JSON & DB",
    2: "Web → JSON",
    3: "JSON → DB"
  }
  
  console.log(`Mode: ${options.mode} (${modeNames[options.mode]})`)
  console.log(`Start: kitab ${options.start}`)
  if (options.book) console.log(`Single book: ${options.book}`)
  console.log(`Concurrency: ${options.concurrency}`)
  console.log(`Batch mode: ${options.batch}`)
  console.log(`Resume mode: ${options.resume}`)
  if (options.versions.length > 0) {
    console.log(`Versions filter: ${options.versions.join(', ')}`)
  }
  console.log("=".repeat(60))
  
  // Filter versi jika di-specified
  let targetVersions = BibleVersions
  if (options.versions.length > 0) {
    targetVersions = BibleVersions.filter(v => options.versions.includes(v.id))
    if (targetVersions.length === 0) {
      console.error("❌ Tidak ada versi yang valid")
      return
    }
  }
  
  // Buat folder output
  try {
    await fs.access(BIBLE_DIR)
  } catch {
    await fs.mkdir(BIBLE_DIR, { recursive: true })
  }
  
  try {
    await fs.access(BIBLE_DIR_MIN)
  } catch {
    await fs.mkdir(BIBLE_DIR_MIN, { recursive: true })
  }
  
  // Buka koneksi database untuk mode 1 & 3
  if (options.mode === 1 || options.mode === 3) {
    console.log("\n🚀 Opening database connection...")
    db = await openDB(DB_PATH)
    dbQueue = new DatabaseQueue(db, 1)
    
    // Inisialisasi database
    await initializeDatabase()
    await sleep(1000)
  }
  
  try {
    // Tentukan kitab yang akan diproses
    const booksToProcess = []
    
    if (options.book) {
      if (options.book >= 1 && options.book <= BibleBooks.length) {
        booksToProcess.push(options.book)
      } else {
        console.error(`❌ Kitab ${options.book} tidak valid`)
        return
      }
    } else if (options.batch) {
      for (let i = options.start; i <= BibleBooks.length; i++) {
        booksToProcess.push(i)
      }
    } else {
      booksToProcess.push(options.start)
    }
    
    console.log(`📋 Total kitab yang akan diproses: ${booksToProcess.length}`)
    
    let totalSuccess = 0
    let totalFailed = 0
    
    for (const bookId of booksToProcess) {
      const bookName = BibleBooks[bookId - 1][0]
      
      console.log(`\n📖 ========================================`)
      console.log(`📖 Proses kitab ${bookId}: ${bookName}`)
      console.log(`📖 ========================================`)
      
      let success = false
      
      try {
        switch (options.mode) {
          case 1:
            success = await processBook(bookId, options.concurrency, options.resume, options.mode, targetVersions)
            break
            
          case 2:
            success = await processBook(bookId, options.concurrency, options.resume, options.mode, targetVersions)
            break
            
          case 3:
            success = await migrateJSONtoDB(bookId)
            break
            
          default:
            console.error(`❌ Mode ${options.mode} tidak dikenali`)
            return
        }
        
        if (success) {
          totalSuccess++
        } else {
          totalFailed++
        }
        
      } catch (error) {
        console.error(`❌ Error memproses kitab ${bookId}:`, error.message)
        totalFailed++
      }
      
      // Jeda antar kitab
      if (bookId !== booksToProcess[booksToProcess.length - 1]) {
        const delay = options.mode === 1 || options.mode === 2 ? 5000 : 2000
        console.log(`\n⏳ Menunggu ${delay/1000} detik sebelum kitab berikutnya...`)
        await sleep(delay)
      }
    }
    
    console.log("\n" + "=".repeat(60))
    console.log("🎉 PROSES SELESAI!")
    console.log("=".repeat(60))
    console.log(`📊 Statistik: ${totalSuccess} kitab berhasil, ${totalFailed} kitab gagal`)
    console.log(`📊 Mode: ${modeNames[options.mode]}`)
    
    if (options.mode === 1 || options.mode === 3) {
      console.log(`💾 Database: ${DB_PATH}`)
      
      // Update FTS
      console.log("\n🔄 Updating FTS tables...")
      try {
        await db.run("INSERT INTO verses_fts(verses_fts) VALUES ('rebuild')")
        console.log("✅ FTS tables updated")
      } catch (error) {
        console.error("❌ Error updating FTS:", error.message)
      }
    }
    
    if (options.mode === 1 || options.mode === 2) {
      console.log(`📁 JSON files: ${BIBLE_DIR}/`)
      console.log(`📁 Minified JSON: ${BIBLE_DIR_MIN}/`)
    }
    
    console.log("=".repeat(60))
    
  } catch (error) {
    console.error("\n❌ Error utama:", error.message)
    console.error(error.stack)
  } finally {
    // Tutup koneksi database
    if (db) {
      await db.close()
    }
  }
}

// Jalankan aplikasi
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error)
}import Database from '@renpwn/termux-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const DEFAULT_DB = './db/bible.db'

export async function openDB(dbFile = DEFAULT_DB) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  const dbPath = path.resolve(__dirname, '..', 'db', 'bible.db')

  // ===============================
  // ENSURE DB DIRECTORY
  // ===============================
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
    console.log('📁 Created DB directory:', dbDir)
  }

  // ===============================
  // REMOVE OLD DB (DEV MODE)
  // ===============================
  if (fs.existsSync(dbPath)) {
    console.log('🗑 Removing old database...')
    fs.unlinkSync(dbPath)
  }

  console.log('🚀 Opening database:', dbPath)

  // ===============================
  // OPEN DATABASE
  // ===============================
  const db = new Database(dbPath, {
    timeout: 30000,
    maxRetries: 3,
    poolSize: 2
  })

  // ===============================
  // TEST CONNECTION
  // ===============================
  try {
    await db.exec('SELECT 1')
    console.log('✅ Database connection OK')
  } catch (e) {
    throw new Error('Database open failed: ' + e.message)
  }

  // ===============================
  // INIT SCHEMA
  // ===============================
  console.log('📊 Initializing schema...')

  const schemaSQL = `
  PRAGMA foreign_keys = ON;

  -- ===============================
  -- BOOKS
  -- ===============================
  CREATE TABLE IF NOT EXISTS books (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    abbrev        TEXT,
    chapters      INTEGER NOT NULL,
    total_verses  INTEGER NOT NULL,
    pericopes     INTEGER,
    testament     TEXT CHECK (testament IN ('OT','NT')) NOT NULL,
    position      INTEGER
  );

  -- ===============================
  -- VERSIONS
  -- ===============================
  CREATE TABLE IF NOT EXISTS versions (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    language        TEXT NOT NULL,
    category        TEXT CHECK (category IN ('core','global','advance')) NOT NULL,
    supports_strong BOOLEAN DEFAULT 0,
    is_default      BOOLEAN DEFAULT 0,
    description     TEXT
  );

  -- ===============================
  -- VERSES (CORE / GLOBAL)
  -- ===============================
  CREATE TABLE IF NOT EXISTS verses (
    book_id   INTEGER NOT NULL,
    chapter   INTEGER NOT NULL,
    verse     INTEGER NOT NULL,
    version   TEXT NOT NULL,
    text      TEXT NOT NULL,

    PRIMARY KEY (book_id, chapter, verse, version),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (version) REFERENCES versions(id) ON DELETE CASCADE
  );

  -- ===============================
  -- INTERLINEAR (ADVANCE)
  -- ===============================
  CREATE TABLE IF NOT EXISTS interlinear_words (
    book_id     INTEGER NOT NULL,
    chapter     INTEGER NOT NULL,
    verse       INTEGER NOT NULL,
    position    INTEGER NOT NULL,
    version     TEXT NOT NULL,

    source_lang TEXT NOT NULL,
    source_word TEXT NOT NULL,
    lemma       TEXT,
    strong      TEXT,
    morphology  TEXT,
    gloss       TEXT,

    PRIMARY KEY (book_id, chapter, verse, position, version),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (version) REFERENCES versions(id) ON DELETE CASCADE
  );

  -- ===============================
  -- STRONG LEXICON
  -- ===============================
  CREATE TABLE IF NOT EXISTS strong_lexicon (
    strong     TEXT PRIMARY KEY,
    language   TEXT NOT NULL,
    lemma      TEXT NOT NULL,
    translit   TEXT,
    definition TEXT
  );

  -- ===============================
  -- VERSE LINK (CORE → ADVANCE)
  -- ===============================
  CREATE TABLE IF NOT EXISTS verse_links (
    book_id   INTEGER NOT NULL,
    chapter   INTEGER NOT NULL,
    verse     INTEGER NOT NULL,
    from_ver  TEXT NOT NULL,
    to_ver    TEXT NOT NULL,

    PRIMARY KEY (book_id, chapter, verse, from_ver, to_ver)
  );

  -- ===============================
  -- PERICOPES
  -- ===============================
  CREATE TABLE IF NOT EXISTS pericopes (
    book_id     INTEGER,
    chapter     INTEGER,
    verse_start INTEGER,
    verse_end   INTEGER,
    version     TEXT,
    title       TEXT
  );


  -- ===============================
  -- FOOTNOTES
  -- ===============================
  CREATE TABLE IF NOT EXISTS footnotes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id   INTEGER NOT NULL,
  chapter   INTEGER NOT NULL,
  verse     INTEGER NOT NULL,
  version   TEXT NOT NULL,
  note      TEXT NOT NULL,

  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (version) REFERENCES versions(id) ON DELETE CASCADE
);
  `
  // CREATE INDEX IF NOT EXISTS idx_books_position
  //   ON books(position);

  // CREATE INDEX IF NOT EXISTS idx_verses_lookup
  //   ON verses(book_id, chapter, verse, version);

  // CREATE INDEX IF NOT EXISTS idx_interlinear_strong
  //   ON interlinear_words(strong);

  // CREATE INDEX IF NOT EXISTS idx_footnotes_lookup
  //   ON footnotes(book_id, chapter, verse, version);

  const indexSQL = `
-- ===============================
-- BOOKS TABLE INDEXES
-- ===============================
CREATE INDEX IF NOT EXISTS idx_books_position
  ON books(position);

CREATE INDEX IF NOT EXISTS idx_books_testament
  ON books(testament);

CREATE INDEX IF NOT EXISTS idx_books_name
  ON books(name);

CREATE INDEX IF NOT EXISTS idx_books_abbrev
  ON books(abbrev);

-- ===============================
-- VERSIONS TABLE INDEXES
-- ===============================
CREATE INDEX IF NOT EXISTS idx_versions_category
  ON versions(category);

CREATE INDEX IF NOT EXISTS idx_versions_language
  ON versions(language);

CREATE INDEX IF NOT EXISTS idx_versions_is_default
  ON versions(is_default) WHERE is_default = 1;

-- ===============================
-- VERSES TABLE INDEXES
-- ===============================
CREATE INDEX IF NOT EXISTS idx_verses_lookup
  ON verses(book_id, chapter, verse, version);

CREATE INDEX IF NOT EXISTS idx_verses_version
  ON verses(version);

CREATE INDEX IF NOT EXISTS idx_verses_book_chapter
  ON verses(book_id, chapter);

CREATE INDEX IF NOT EXISTS idx_verses_book_chapter_verse
  ON verses(book_id, chapter, verse);

-- ===============================
-- INTERLINEAR WORDS TABLE INDEXES
-- ===============================
CREATE INDEX IF NOT EXISTS idx_interlinear_strong
  ON interlinear_words(strong);

CREATE INDEX IF NOT EXISTS idx_interlinear_lemma
  ON interlinear_words(lemma);

CREATE INDEX IF NOT EXISTS idx_interlinear_book_chapter_verse
  ON interlinear_words(book_id, chapter, verse);

CREATE INDEX IF NOT EXISTS idx_interlinear_version
  ON interlinear_words(version);

CREATE INDEX IF NOT EXISTS idx_interlinear_source_lang
  ON interlinear_words(source_lang);

CREATE INDEX IF NOT EXISTS idx_interlinear_position
  ON interlinear_words(book_id, chapter, verse, position);

-- ===============================
-- STRONG LEXICON TABLE INDEXES
-- ===============================
CREATE INDEX IF NOT EXISTS idx_strong_language
  ON strong_lexicon(language);

CREATE INDEX IF NOT EXISTS idx_strong_lemma
  ON strong_lexicon(lemma);

-- ===============================
-- VERSE LINKS TABLE INDEXES
-- ===============================
CREATE INDEX IF NOT EXISTS idx_verse_links_from
  ON verse_links(book_id, chapter, verse, from_ver);

CREATE INDEX IF NOT EXISTS idx_verse_links_to
  ON verse_links(book_id, chapter, verse, to_ver);

CREATE INDEX IF NOT EXISTS idx_verse_links_cross
  ON verse_links(from_ver, to_ver);

-- ===============================
-- PERICOPES TABLE INDEXES
-- ===============================
CREATE INDEX IF NOT EXISTS idx_pericopes_book_chapter
  ON pericopes(book_id, chapter);

CREATE INDEX IF NOT EXISTS idx_pericopes_range
  ON pericopes(book_id, chapter, verse_start, verse_end);

CREATE INDEX IF NOT EXISTS idx_pericopes_version
  ON pericopes(version);

CREATE INDEX IF NOT EXISTS idx_pericopes_lookup
  ON pericopes(book_id, chapter, verse_start, verse_end, version);

-- ===============================
-- FOOTNOTES TABLE INDEXES
-- ===============================
CREATE INDEX IF NOT EXISTS idx_footnotes_lookup
  ON footnotes(book_id, chapter, verse, version);

CREATE INDEX IF NOT EXISTS idx_footnotes_version
  ON footnotes(version);

-- ===============================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ===============================
-- Untuk pencarian ayat dalam versi tertentu
CREATE INDEX IF NOT EXISTS idx_verses_version_book_chapter_verse
  ON verses(version, book_id, chapter, verse);

-- Untuk navigasi antar pasal
CREATE INDEX IF NOT EXISTS idx_books_testament_position
  ON books(testament, position);

-- Untuk query interlinear yang sering digunakan
CREATE INDEX IF NOT EXISTS idx_interlinear_comprehensive
  ON interlinear_words(book_id, chapter, verse, version, position);

-- Untuk pencarian Strong's numbers dengan filter bahasa
CREATE INDEX IF NOT EXISTS idx_strong_comprehensive
  ON strong_lexicon(strong, language, lemma);

-- ===============================
-- PARTIAL INDEXES (UNTUK DATA SPESIFIK)
-- ===============================
-- Untuk versi dengan dukungan Strong's
CREATE INDEX IF NOT EXISTS idx_versions_supports_strong
  ON versions(supports_strong) WHERE supports_strong = 1;

-- Untuk kata-kata interlinear dengan Strong's numbers
CREATE INDEX IF NOT EXISTS idx_interlinear_has_strong
  ON interlinear_words(strong) WHERE strong IS NOT NULL;

-- Untuk buku-buku Perjanjian Lama
CREATE INDEX IF NOT EXISTS idx_books_ot
  ON books(testament, position) WHERE testament = 'OT';

-- Untuk buku-buku Perjanjian Baru
CREATE INDEX IF NOT EXISTS idx_books_nt
  ON books(testament, position) WHERE testament = 'NT';
`

  // const ftsSQL = `
  // -- ===============================
  // -- FTS5 TABLES
  // -- ===============================
  // CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(
  //   text,
  //   content='verses'
  // );

  // CREATE VIRTUAL TABLE IF NOT EXISTS strong_lexicon_fts USING fts5(
  //   lemma, translit, definition,
  //   content='strong_lexicon'
  // );
  // `

  const ftsSQL = `
-- ===============================
-- FTS5 TABLES WITH OPTIMIZED TOKENIZER
-- ===============================
CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(
  book_id UNINDEXED,
  chapter UNINDEXED,
  verse UNINDEXED,
  version UNINDEXED,
  text,
  content='verses',
  content_rowid='rowid',
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE VIRTUAL TABLE IF NOT EXISTS strong_lexicon_fts USING fts5(
  strong UNINDEXED,
  language UNINDEXED,
  lemma,
  translit,
  definition,
  content='strong_lexicon',
  content_rowid='rowid',
  tokenize = 'unicode61 remove_diacritics 2'
);

-- ===============================
-- FTS5 AUXILIARY TABLES FOR STATISTICS
-- ===============================
CREATE TABLE IF NOT EXISTS fts_stat (
  id INTEGER PRIMARY KEY,
  value BLOB
);

-- ===============================
-- FTS5 TRIGGERS FOR AUTOMATIC SYNC
-- ===============================
CREATE TRIGGER IF NOT EXISTS verses_ai AFTER INSERT ON verses BEGIN
  INSERT INTO verses_fts(rowid, book_id, chapter, verse, version, text)
  VALUES (new.rowid, new.book_id, new.chapter, new.verse, new.version, new.text);
END;

CREATE TRIGGER IF NOT EXISTS verses_ad AFTER DELETE ON verses BEGIN
  INSERT INTO verses_fts(verses_fts, rowid, book_id, chapter, verse, version, text)
  VALUES('delete', old.rowid, old.book_id, old.chapter, old.verse, old.version, old.text);
END;

CREATE TRIGGER IF NOT EXISTS verses_au AFTER UPDATE ON verses BEGIN
  INSERT INTO verses_fts(verses_fts, rowid, book_id, chapter, verse, version, text)
  VALUES('delete', old.rowid, old.book_id, old.chapter, old.verse, old.version, old.text);
  INSERT INTO verses_fts(rowid, book_id, chapter, verse, version, text)
  VALUES (new.rowid, new.book_id, new.chapter, new.verse, new.version, new.text);
END;

CREATE TRIGGER IF NOT EXISTS strong_lexicon_ai AFTER INSERT ON strong_lexicon BEGIN
  INSERT INTO strong_lexicon_fts(rowid, strong, language, lemma, translit, definition)
  VALUES (new.rowid, new.strong, new.language, new.lemma, new.translit, new.definition);
END;

CREATE TRIGGER IF NOT EXISTS strong_lexicon_ad AFTER DELETE ON strong_lexicon BEGIN
  INSERT INTO strong_lexicon_fts(strong_lexicon_fts, rowid, strong, language, lemma, translit, definition)
  VALUES('delete', old.rowid, old.strong, old.language, old.lemma, old.translit, old.definition);
END;

CREATE TRIGGER IF NOT EXISTS strong_lexicon_au AFTER UPDATE ON strong_lexicon BEGIN
  INSERT INTO strong_lexicon_fts(strong_lexicon_fts, rowid, strong, language, lemma, translit, definition)
  VALUES('delete', old.rowid, old.strong, old.language, old.lemma, old.translit, old.definition);
  INSERT INTO strong_lexicon_fts(rowid, strong, language, lemma, translit, definition)
  VALUES (new.rowid, new.strong, new.language, new.lemma, new.translit, new.definition);
END;

-- ===============================
-- FTS5 AUXILIARY FUNCTIONS
-- ===============================
CREATE TABLE IF NOT EXISTS fts_config (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT OR IGNORE INTO fts_config (key, value) VALUES
  ('last_optimized', '0'),
  ('tokenizer', 'unicode61_remove_diacritics_2'),
  ('min_prefix_length', '2');
`

// Fungsi untuk memuat data ke FTS5 setelah import
const ftsPopulateSQL = `
-- Populate FTS tables with existing data
INSERT OR IGNORE INTO verses_fts(rowid, book_id, chapter, verse, version, text)
SELECT rowid, book_id, chapter, verse, version, text FROM verses;

INSERT OR IGNORE INTO strong_lexicon_fts(rowid, strong, language, lemma, translit, definition)
SELECT rowid, strong, language, lemma, translit, definition FROM strong_lexicon;

-- Update statistics
INSERT INTO fts_stat(id, value) VALUES(1, zeroblob(64))
ON CONFLICT(id) DO UPDATE SET value=zeroblob(64);
`

// Fungsi helper untuk query FTS5
const ftsHelperFunctions = `
-- ===============================
-- FTS5 HELPER FUNCTIONS
-- ===============================

-- Fungsi untuk mencari ayat dengan ranking BM25
CREATE FUNCTION IF NOT EXISTS search_verses(query TEXT, version_filter TEXT DEFAULT NULL)
RETURNS TABLE(book_id INT, chapter INT, verse INT, version TEXT, text TEXT, rank REAL) AS $$
  SELECT 
    v.book_id, v.chapter, v.verse, v.version, v.text,
    bm25(verses_fts) AS rank
  FROM verses_fts
  JOIN verses v ON v.rowid = verses_fts.rowid
  WHERE verses_fts MATCH query
    AND (version_filter IS NULL OR v.version = version_filter)
  ORDER BY rank
$$;

-- Fungsi untuk mencari kata Strong dengan wildcard support
CREATE FUNCTION IF NOT EXISTS search_strong(query TEXT, lang_filter TEXT DEFAULT NULL)
RETURNS TABLE(strong TEXT, language TEXT, lemma TEXT, translit TEXT, definition TEXT, rank REAL) AS $$
  SELECT 
    s.strong, s.language, s.lemma, s.translit, s.definition,
    bm25(strong_lexicon_fts) AS rank
  FROM strong_lexicon_fts
  JOIN strong_lexicon s ON s.rowid = strong_lexicon_fts.rowid
  WHERE strong_lexicon_fts MATCH query
    AND (lang_filter IS NULL OR s.language = lang_filter)
  ORDER BY rank
$$;

-- Fungsi untuk mendapatkan highlight hasil pencarian
CREATE FUNCTION IF NOT EXISTS highlight_verse(
  book_id INT, 
  chapter INT, 
  verse INT, 
  version TEXT, 
  query TEXT,
  start_tag TEXT DEFAULT '<mark>',
  end_tag TEXT DEFAULT '</mark>'
)
RETURNS TEXT AS $$
  SELECT highlight(verses_fts, 0, start_tag, end_tag)
  FROM verses_fts
  JOIN verses v ON v.rowid = verses_fts.rowid
  WHERE v.book_id = book_id 
    AND v.chapter = chapter 
    AND v.verse = verse 
    AND v.version = version
    AND verses_fts MATCH query
$$;

-- Fungsi untuk mendapatkan konteks sekitar ayat (ayat sebelum & sesudah)
CREATE FUNCTION IF NOT EXISTS get_verse_context(
  book_id INT,
  chapter INT,
  verse INT,
  version TEXT,
  context_size INT DEFAULT 2
)
RETURNS TABLE(
  book_id INT,
  chapter INT,
  verse INT,
  text TEXT,
  is_target BOOLEAN
) AS $$
  WITH target AS (
    SELECT book_id, chapter, verse, version
    FROM verses
    WHERE book_id = book_id 
      AND chapter = chapter 
      AND verse = verse 
      AND version = version
  )
  SELECT 
    v.book_id,
    v.chapter,
    v.verse,
    v.text,
    (v.book_id = t.book_id AND v.chapter = t.chapter AND v.verse = t.verse) AS is_target
  FROM verses v
  CROSS JOIN target t
  WHERE v.book_id = t.book_id
    AND v.chapter = t.chapter
    AND v.verse BETWEEN t.verse - context_size AND t.verse + context_size
    AND v.version = t.version
  ORDER BY v.verse
$$;
`

// Fungsi untuk maintenance FTS5
const ftsMaintenanceSQL = `
-- ===============================
-- FTS5 MAINTENANCE FUNCTIONS
-- ===============================

-- Optimize FTS tables
CREATE PROCEDURE IF NOT EXISTS optimize_fts()
BEGIN
  INSERT INTO verses_fts(verses_fts) VALUES('optimize');
  INSERT INTO strong_lexicon_fts(strong_lexicon_fts) VALUES('optimize');
  UPDATE fts_config SET value = strftime('%s', 'now') WHERE key = 'last_optimized';
END;

-- Rebuild FTS indexes
CREATE PROCEDURE IF NOT EXISTS rebuild_fts()
BEGIN
  -- Rebuild verses_fts
  INSERT INTO verses_fts(verses_fts, rank) VALUES('rebuild', 0);
  
  -- Rebuild strong_lexicon_fts
  INSERT INTO strong_lexicon_fts(strong_lexicon_fts, rank) VALUES('rebuild', 0);
  
  -- Update rebuild timestamp
  INSERT OR REPLACE INTO fts_config (key, value) 
  VALUES ('last_rebuild', strftime('%s', 'now'));
END;

-- Get FTS statistics
CREATE FUNCTION IF NOT EXISTS get_fts_stats()
RETURNS TABLE(table_name TEXT, row_count INT, last_optimized TEXT) AS $$
  SELECT 
    'verses_fts' as table_name,
    (SELECT COUNT(*) FROM verses_fts) as row_count,
    (SELECT value FROM fts_config WHERE key = 'last_optimized') as last_optimized
  UNION ALL
  SELECT 
    'strong_lexicon_fts',
    (SELECT COUNT(*) FROM strong_lexicon_fts),
    (SELECT value FROM fts_config WHERE key = 'last_optimized')
$$;

-- Clean old FTS data (older than specified days)
CREATE PROCEDURE IF NOT EXISTS cleanup_fts_old_data(days_old INT DEFAULT 30)
BEGIN
  -- Not applicable for external content tables
  -- These tables only contain indexes, not data
  -- Data cleanup should be done on the content tables
  SELECT 'Use DELETE FROM verses WHERE ...' as note;
END;
`

// Fungsi untuk query advanced FTS5
const ftsAdvancedQueries = `
-- ===============================
-- ADVANCED FTS5 QUERY EXAMPLES
-- ===============================

-- Pencarian frasa exact
CREATE FUNCTION IF NOT EXISTS search_exact_phrase(phrase TEXT, version TEXT DEFAULT NULL)
RETURNS TABLE(book_id INT, chapter INT, verse INT, version TEXT, text TEXT) AS $$
  SELECT v.book_id, v.chapter, v.verse, v.version, v.text
  FROM verses_fts
  JOIN verses v ON v.rowid = verses_fts.rowid
  WHERE verses_fts MATCH '"' || phrase || '"'
    AND (version IS NULL OR v.version = version)
$$;

-- Pencarian dengan operator AND/OR
CREATE FUNCTION IF NOT EXISTS search_with_operators(terms TEXT, version TEXT DEFAULT NULL)
RETURNS TABLE(book_id INT, chapter INT, verse INT, version TEXT, text TEXT, rank REAL) AS $$
  SELECT v.book_id, v.chapter, v.verse, v.version, v.text,
    bm25(verses_fts) AS rank
  FROM verses_fts
  JOIN verses v ON v.rowid = verses_fts.rowid
  WHERE verses_fts MATCH terms
    AND (version IS NULL OR v.version = version)
  ORDER BY rank
$$;

-- Pencarian dengan prefix/wildcard
CREATE FUNCTION IF NOT EXISTS search_with_prefix(prefix TEXT, version TEXT DEFAULT NULL)
RETURNS TABLE(book_id INT, chapter INT, verse INT, version TEXT, text TEXT) AS $$
  SELECT v.book_id, v.chapter, v.verse, v.version, v.text
  FROM verses_fts
  JOIN verses v ON v.rowid = verses_fts.rowid
  WHERE verses_fts MATCH prefix || '*'
    AND (version IS NULL OR v.version = version)
$$;

-- Pencarian dengan proximity (kata berdekatan)
CREATE FUNCTION IF NOT EXISTS search_with_proximity(term1 TEXT, term2 TEXT, distance INT DEFAULT 5)
RETURNS TABLE(book_id INT, chapter INT, verse INT, version TEXT, text TEXT) AS $$
  SELECT v.book_id, v.chapter, v.verse, v.version, v.text
  FROM verses_fts
  JOIN verses v ON v.rowid = verses_fts.rowid
  WHERE verses_fts MATCH 'NEAR(' || term1 || ' ' || term2 || ', ' || distance || ')'
$$;
`

  try {
    await db.exec(schemaSQL)
    await db.exec(indexSQL)
    console.log('✅ Schema & indexes created')

    await db.exec(ftsSQL)
    console.log('✅ FTS5 created')
  } catch (e) {
    console.error('❌ Schema FAILED:', e)
    throw e
  }

  // ===============================
  // VERIFY TABLES
  // ===============================
  const tables = await db.all(`
    SELECT name FROM sqlite_master
    WHERE type IN ('table','view')
    ORDER BY name
  `)

  if (!tables.length) {
    throw new Error('Schema verification failed: no tables created')
  }

  console.log(
    '📋 Tables:',
    tables.map(t => t.name).join(', ')
  )

  // ===============================
  // RETURN DB WRAPPER
  // ===============================
  return {
    exec: (sql) => db.exec(sql),
    run: (sql, params) => db.run(sql, params),
    get: (sql, params) => db.get(sql, params),
    all: (sql, params) => db.all(sql, params),
    prepare: (sql) => db.prepare(sql),

    transaction(fn, options) {
      return db.transaction(fn, options)
    },

    async close() {
      try {
        await db.exec('PRAGMA wal_checkpoint(FULL)')
      } catch {}
      await db.close()
      console.log('✅ Database closed')
    },

    _db: db
  }
}
