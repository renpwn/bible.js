import fs from 'fs/promises'
import path from 'path'
import {
  fileURLToPath
} from 'url'
import * as cheerio from 'cheerio'
import axios from 'axios'
import {
  openDB
} from './db.js'

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
const BibleVersions = [{
    id: 'tb',
    name: 'Alkitab Terjemahan Baru-LAI',
    language: 'id',
    category: 'core'
  },
  {
    id: 'bis',
    name: 'Alkitab Kabar Baik (BIS-LAI)',
    language: 'id',
    category: 'core'
  },
  {
    id: 'tl',
    name: 'Alkitab Terjemahan Lama',
    language: 'id',
    category: 'global'
  },
  {
    id: 'ende',
    name: 'Alkitab Ende',
    language: 'id',
    category: 'global'
  },
  {
    id: 'tb_itl_drf',
    name: 'TB Interlinear [draft]',
    language: 'id',
    category: 'advance',
    supports_strong: true
  },
  {
    id: 'tl_itl_drf',
    name: 'TL Interlinear [draft]',
    language: 'id',
    category: 'advance',
    supports_strong: true
  },
  {
    id: 'bbe',
    name: 'Bible in Basic English',
    language: 'en',
    category: 'global'
  },
  {
    id: 'message',
    name: 'The Message Bible',
    language: 'en',
    category: 'global'
  },
  {
    id: 'nkjv',
    name: 'New King James Version',
    language: 'en',
    category: 'global'
  },
  {
    id: 'net',
    name: 'NET Bible [draft]',
    language: 'en',
    category: 'advance',
    supports_strong: true
  },
  {
    id: 'net2',
    name: 'NET Bible [draft] Lab',
    language: 'en',
    category: 'advance',
    supports_strong: true
  }
]

/* =========================
   KONFIGURASI
========================= */
let db = null
const DB_PATH = "./bible.db"
const BIBLE_DIR = "./json_bible"
const BIBLE_DIR_MIN = "./json_bible_min"

// Helper untuk mendapatkan __dirname di ES Module
const __filename = fileURLToPath(
  import.meta.url)
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
      this.queue.push({
        task,
        resolve,
        reject
      })
      this.process()
    })
  }

  async process() {
    while (this.queue.length > 0 && this.processing < this.maxConcurrent) {
      const {
        task,
        resolve,
        reject
      } = this.queue.shift()
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

class LexiconQueue {
  constructor(concurrency = 2) {
    this.concurrency = concurrency
    this.queue = []
    this.processing = 0
    this.completed = 0
    this.failed = 0
    this.total = 0
    this.lexiconCache = new Map() // Cache untuk menghindari duplikasi request
  }

  add(strongNumber) {
    if (!this.lexiconCache.has(strongNumber)) {
      this.queue.push(strongNumber)
      this.total++
      this.lexiconCache.set(strongNumber, null)
    }
  }

  async process(fetchFn) {
    const workers = []

    const worker = async () => {
      while (this.queue.length > 0) {
        const strongNumber = this.queue.shift()
        if (!strongNumber) continue

        this.processing++
        try {
          const data = await fetchFn(strongNumber)
          this.lexiconCache.set(strongNumber, data)
          this.completed++
        } catch (error) {
          this.failed++
          console.error(`Lexicon error ${strongNumber}:`, error.message)
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
    return this.lexiconCache
  }

  showProgress() {
    const processed = this.completed + this.failed
    const progress = Math.round(processed / this.total * 100)
    process.stdout.write(`\r📚 Lexicon: ${processed}/${this.total} (${progress}%) | Active: ${this.processing} | Failed: ${this.failed}`)
  }

  getCache() {
    return this.lexiconCache
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

async function parseChapterHTMLOri(html, bookId, chapter, targetVersions = BibleVersions) {
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
    const verseData = {
      verse: rowIndex + 1,
      texts: {}
    }

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

async function parseChapterHTML(html, bookId, chapter, targetVersions) {
  const $ = cheerio.load(html)
  const verses = []
  const strongNumbers = new Set()

  // Cari semua baris ayat
  $('tr[id="b"]').each((rowIndex, row) => {
    const cells = $(row).find('td')
    const verseData = {
      verse: rowIndex + 1,
      texts: {},
      interlinear: {}
    }

    // Parse nomor ayat dari kolom pertama
    const firstCell = $(cells[0])
    const verseNumMatch = firstCell.find('a[name]').attr('name') ||
      firstCell.find('b').text().match(/\d+:\d+/)

    if (verseNumMatch) {
      const verseNum = typeof verseNumMatch === 'string' ?
        verseNumMatch.split(':')[1] || verseNumMatch :
        (rowIndex + 1)
      verseData.verse = parseInt(verseNum)
    }

    // Parse setiap kolom (versi)
    cells.each((cellIndex, cell) => {
      const cellHtml = $(cell).html()
      const cellText = $(cell).text().trim()

      // Cari versi yang sesuai dengan kolom ini
      const version = findVersionForColumn(cellIndex, targetVersions)
      if (!version) return

      // Untuk teks biasa
      let text = cellText
      // Hapus nomor ayat di awal
      text = text.replace(/^\d+:\d+\s*/, '').trim()
      verseData.texts[version.id] = text

      // Untuk versi interlinear, parse kata per kata
      if (version.category === 'advance' && version.supports_strong) {
        const words = []
        const wordLinks = $(cell).find('a[href*="lexicon"]')

        if (wordLinks.length > 0) {
          wordLinks.each((wordIndex, link) => {
            const wordHtml = $(link).html()
            const wordText = $(link).text().trim()
            const href = $(link).attr('href')
            const strongMatch = href.match(/w=(\d+)/)

            let strongNumber = null
            if (strongMatch) {
              const language = bookId <= 39 ? 'hebrew' : 'greek'
              strongNumber = `${language === 'hebrew' ? 'H' : 'G'}${strongMatch[1]}`
              strongNumbers.add(strongNumber)
            }

            words.push({
              position: wordIndex + 1,
              source_word: wordText,
              strong: strongNumber,
              lemma: null,
              morphology: null,
              gloss: null
            })
          })

          if (words.length > 0) {
            verseData.interlinear[version.id] = words
          }
        }
      }
    })

    if (Object.keys(verseData.texts).length > 0) {
      verses.push(verseData)
    }
  })

  return {
    bookId,
    chapter,
    verses,
    totalVerses: verses.length,
    strongNumbers: Array.from(strongNumbers)
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
    chaptersToProcess.push(...Array.from({
      length: totalChapters
    }, (_, i) => i + 1))
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

  const {
    bookId,
    chapter,
    verses
  } = chapterData

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
        version.id === 'tb' ? 1 : 0 // TB sebagai default
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
   STRONG 'S NUMBERS
========================= */

async function parseInterlinearWord(wordHtml, bookId) {
  const $ = cheerio.load(wordHtml)
  const wordData = {
    source_word: '',
    strong: null,
    lemma: null,
    morphology: null,
    gloss: null
  }

  // Ambil kata sumber
  wordData.source_word = $.text().trim()

  // Cari link Strong's number
  const strongLink = $('a[href*="lexicon"]')
  if (strongLink.length > 0) {
    const href = strongLink.attr('href')
    const strongMatch = href.match(/w=(\d+)/)
    if (strongMatch) {
      wordData.strong = strongMatch[1]

      // Tentukan bahasa berdasarkan kitab
      const language = bookId <= 39 ? 'hebrew' : 'greek'
      wordData.strong = `${language === 'hebrew' ? 'H' : 'G'}${wordData.strong}`
    }
  }

  return wordData
}

async function fetchStrongLexicon(strongNumber) {
  // Format: H7225 (Hebrew) atau G746 (Greek)
  const prefix = strongNumber.charAt(0) // H atau G
  const number = strongNumber.substring(1)

  const url = `https://sabdaweb.sabda.org/tools/lexicon/?w=${number}`

  try {
    const html = await fetchUrl(url)
    const $ = cheerio.load(html)

    // Parse data leksikon dari halaman SABDAweb
    const lexiconData = {
      strong: strongNumber,
      language: prefix === 'H' ? 'hebrew' : 'greek',
      lemma: '',
      translit: '',
      definition: '',
      phonetic: '',
      pronunciation: '',
      usage: '',
      etymology: ''
    }

    // Cari tabel leksikon
    const lexiconTable = $('table').filter((i, table) => {
      return $(table).text().includes('Kata Asli') ||
        $(table).text().includes('Transliterasi') ||
        $(table).text().includes('Arti')
    }).first()

    if (lexiconTable.length > 0) {
      // Parse baris-baris tabel
      lexiconTable.find('tr').each((i, row) => {
        const cells = $(row).find('td')
        if (cells.length >= 2) {
          const label = $(cells[0]).text().trim().toLowerCase()
          const value = $(cells[1]).text().trim()

          if (label.includes('kata asli') || label.includes('original word')) {
            lexiconData.lemma = value
          } else if (label.includes('transliterasi') || label.includes('transliteration')) {
            lexiconData.translit = value
          } else if (label.includes('arti') || label.includes('definition')) {
            lexiconData.definition = value
          } else if (label.includes('bunyi') || label.includes('phonetic')) {
            lexiconData.phonetic = value
          } else if (label.includes('pengucapan') || label.includes('pronunciation')) {
            lexiconData.pronunciation = value
          }
        }
      })
    }

    // Jika tidak ada tabel, coba ambil dari struktur lain
    if (!lexiconData.lemma) {
      // Coba ambil dari elemen lainnya
      const headings = $('h2, h3, h4, b, strong')
      headings.each((i, el) => {
        const text = $(el).text().trim()
        if (text.includes('Strong') && text.includes(strongNumber.substring(1))) {
          const nextText = $(el).next().text()
          lexiconData.definition = lexiconData.definition || nextText
        }
      })
    }

    console.log(`📖 Lexicon ${strongNumber}: ${lexiconData.lemma || 'N/A'}`)
    return lexiconData

  } catch (error) {
    console.error(`❌ Gagal ambil lexicon ${strongNumber}:`, error.message)
    return null
  }
}

async function saveLexiconToDB(lexiconData) {
  if (!lexiconData || !lexiconData.strong) return false

  return dbQueue.add(async () => {
    try {
      await db.run(`
        INSERT OR REPLACE INTO strong_lexicon 
        (strong, language, lemma, translit, definition, phonetic, pronunciation)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        lexiconData.strong,
        lexiconData.language,
        lexiconData.lemma,
        lexiconData.translit,
        lexiconData.definition,
        lexiconData.phonetic,
        lexiconData.pronunciation
      ])

      // Update interlinear_words dengan lemma dari lexicon
      if (lexiconData.lemma) {
        await db.run(`
          UPDATE interlinear_words 
          SET lemma = ?
          WHERE strong = ? AND (lemma IS NULL OR lemma = '')
        `, [lexiconData.lemma, lexiconData.strong])
      }

      return true
    } catch (error) {
      console.error(`❌ Gagal menyimpan lexicon ${lexiconData.strong}:`, error.message)
      return false
    }
  })
}

async function processLexicons(strongNumbers, concurrency = 2) {
  if (!strongNumbers || strongNumbers.length === 0) {
    console.log("ℹ️  Tidak ada Strong's numbers untuk diproses")
    return
  }

  console.log(`\n📚 Memproses ${strongNumbers.length} Strong's numbers...`)

  const lexiconQueue = new LexiconQueue(concurrency)

  // Tambahkan semua Strong's numbers ke queue
  strongNumbers.forEach(strong => lexiconQueue.add(strong))

  // Proses dengan concurrency terbatas
  const cache = await lexiconQueue.process(async (strongNumber) => {
    // Cek dulu di database
    const existing = await dbQueue.add(async () => {
      return await db.get(
        'SELECT * FROM strong_lexicon WHERE strong = ?',
        [strongNumber]
      )
    })

    if (existing) {
      console.log(`✅ Lexicon ${strongNumber} sudah ada di database`)
      return existing
    }

    // Ambil dari web
    const lexiconData = await fetchStrongLexicon(strongNumber)
    if (lexiconData) {
      await saveLexiconToDB(lexiconData)
    }

    return lexiconData
  })

  console.log(`\n✅ Lexicon processing selesai`)
  console.log(`📊 Statistik: ${lexiconQueue.completed} berhasil, ${lexiconQueue.failed} gagal`)

  return cache
}

function findVersionForColumn(columnIndex, targetVersions) {
  // Mapping default kolom SABDAweb (berdasarkan file HTML)
  const columnMapping = [
    'tb', // Kolom 0: TB
    'bis', // Kolom 1: BIS
    'tl', // Kolom 2: TL
    'ende', // Kolom 3: ENDE
    'tb_itl_drf', // Kolom 4: TB Interlinear
    'tl_itl_drf', // Kolom 5: TL Interlinear
    'bbe', // Kolom 6: BBE
    'message', // Kolom 7: Message
    'nkjv', // Kolom 8: NKJV
    'net', // Kolom 9: NET
    'net2' // Kolom 10: NET2
  ]

  if (columnIndex < columnMapping.length) {
    const versionId = columnMapping[columnIndex]
    return targetVersions.find(v => v.id === versionId)
  }

  return null
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
    await fs.mkdir(BIBLE_DIR, {
      recursive: true
    })
  }

  try {
    await fs.access(BIBLE_DIR_MIN)
  } catch {
    await fs.mkdir(BIBLE_DIR_MIN, {
      recursive: true
    })
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

    // Proses Strong's numbers jika mode 1 atau 3
    if ((options.mode === 1 || options.mode === 3) && db) {
      console.log("\n🔍 Mengumpulkan Strong's numbers dari database...")

      // Kumpulkan semua Strong's numbers yang belum ada lemma-nya
      const missingStrongs = await dbQueue.add(async () => {
        const result = await db.all(`
        SELECT DISTINCT strong 
        FROM interlinear_words 
        WHERE strong IS NOT NULL 
          AND strong != ''
          AND (lemma IS NULL OR lemma = '')
      `)
        return result.map(row => row.strong)
      })

      if (missingStrongs.length > 0) {
        console.log(`📚 Ditemukan ${missingStrongs.length} Strong's numbers yang perlu diproses`)
        await processLexicons(missingStrongs, Math.min(2, options.concurrency))
      } else {
        console.log("✅ Semua Strong's numbers sudah memiliki data lexicon")
      }
    }
    // Strong 's numbers selesai diproses

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
if (process.argv[1] === fileURLToPath(
    import.meta.url)) {
  main().catch(console.error)
}