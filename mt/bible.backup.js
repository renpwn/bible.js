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
   DAFTAR SURAT
========================= */
// [Nama Surat, Jumlah Ayat, Jumlah Ayat (teks), Jumlah Perikop]
const List = [
  ["Kejadian", 50, 1533, 81],
  ["Keluaran", 40, 1213, 87],
  ["Imamat", 27, 859, 40],
  ["Bilangan", 36, 1288, 64],
  ["Ulangan", 34, 959, 86],
  ["Yosua", 24, 658, 40],
  ["Hakim-Hakim", 21, 618, 36],
  ["Rut", 4, 85, 5],
  ["I Samuel", 31, 811, 45],
  ["2 Samuel", 24, 695, 49],
  ["1 Raja-Raja", 22, 817, 52],
  ["2 Raja-Raja", 25, 719, 56],
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
   KONFIGURASI
========================= */
let db = null
const DB_PATH = "./quran.db"
const ALQURAN_DIR = "./json"
const ALQURAN_DIR_MIN = "./json_min"
const SOURCE_DIR = "../renpwn/database/alquran"

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
    surah: null,
    concurrency: 5,
    batch: false,
    resume: false
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === "--mode" || arg === "-m") {
      options.mode = parseInt(args[++i]) || 1
    } else if (arg === "--start" || arg === "-s") {
      options.start = parseInt(args[++i]) || 1
    } else if (arg === "--surah" || arg === "-S") {
      options.surah = parseInt(args[++i])
      options.batch = false
    } else if (arg === "--concurrency" || arg === "-c") {
      options.concurrency = parseInt(args[++i]) || 5
    } else if (arg === "--batch" || arg === "-b") {
      options.batch = true
    } else if (arg === "--resume" || arg === "-r") {
      options.resume = true
    } else if (arg === "--help" || arg === "-h") {
      showHelp()
      process.exit(0)
    }
  }

  return options
}

function showHelp() {
  console.log(`
📖 Quran Tafsir Scraper - 3 Mode Penggunaan

Mode:
  1: Web → JSON & DB (default)
  2: Web → JSON
  3: JSON → DB

Penggunaan:
  node cektafsir++.js [options]

Options:
  -m, --mode <mode>        Mode pengambilan data (1-3)
  -s, --start <no>         Mulai dari surah ke-n (default: 1)
  -S, --surah <no>         Proses satu surah saja
  -c, --concurrency <n>    Jumlah request paralel (default: 5)
  -b, --batch              Proses semua surah sekaligus
  -r, --resume             Resume proses (cek data yang sudah ada)
  -h, --help               Tampilkan bantuan ini

Contoh:
  node cektafsir++.js                     # Mode 1, surah 1
  node cektafsir++.js -m 1 -s 41 -b       # Mode 1, mulai surah 41, semua
  node cektafsir++.js -m 2 -S 1           # Mode 2, hanya surah 1
  node cektafsir++.js -m 3 -c 3 -b        # Mode 3, 3 paralel, semua surah
  node cektafsir++.js -m 1 -c 7 -b        # Mode 1, 7 paralel, semua surah
  `)
}

/* =========================
   SISTEM QUEUE YANG LEBIH BAIK
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

class TafsirQueue {
  constructor(concurrency = 5) {
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
    process.stdout.write(`\r📊 Progress: ${processed}/${this.total} ayat (${progress}%) | Active: ${this.processing} | Failed: ${this.failed}`)
  }
}

/* =========================
   FUNGSI UMUM
========================= */

async function fetchUrl(url, options = {}, retryCount = 3) {
  for (let i = 0; i < retryCount; i++) {
    try {
      const res = await axios({
        method: options.post ? 'POST' : 'GET',
        url,
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

async function salinDataSurah(key) {
  const val = List[key]
  const surahNo = key + 1

  try {
    const sourceFile = `${SOURCE_DIR}/Alquran_${surahNo}.json`
    const targetFile = `${ALQURAN_DIR}/Alquran_${surahNo}.json`

    // Cek apakah file target sudah ada
    try {
      await fs.access(targetFile)
      console.log(`ℹ️  File ${targetFile} sudah ada, menggunakan data yang ada`)
      return JSON.parse(await fs.readFile(targetFile, "utf8"))
    } catch {
      // File tidak ada, lanjut salin dari source
    }

    // Baca file source
    const raw = await fs.readFile(sourceFile, "utf8")
    const res = JSON.parse(raw)

    // Format data baru
    const isibaru = {
      number: surahNo,
      name: val[0],
      ar: res.data[1].name,
      en: res.data[0].englishName,
      id: val[1].replace(/[()]/g, ''),
      revelationType: res.data[0].revelationType,
      numberOfAyahs: res.data[0].ayahs.length,
      ayahs: []
    }

    // Salin data ayat
    for (let keyay = 0; keyay < res.data[0].ayahs.length; keyay++) {
      isibaru.ayahs[keyay] = {
        ind: res.data[0].ayahs[keyay].text,
        arb: res.data[1].ayahs[keyay].text,
        transliterasi: "",
        eng: res.data[2].ayahs[keyay].text,
        kemenag: "",
        kemenag_ringkas: "",
        ibnu_katsir: "",
        jalalain: "",
        quraish_shihab: "",
        saadi: ""
      }
    }

    // Simpan ke file lokal
    await fs.writeFile(targetFile, JSON.stringify(isibaru, null, 4))
    console.log(`✅ Data dasar surah ${surahNo}: ${val[0]} (${isibaru.numberOfAyahs} ayat)`)

    return isibaru

  } catch (error) {
    console.error(`❌ Gagal menyalin surah ${surahNo}:`, error.message)
    throw error
  }
}

async function ambilTafsirAyat(surahNo, ayat) {
  const key = surahNo - 1
  const val = List[key]
  const specialSlug = {
    83: "al-tatfif",
    40: "al-mu-min",
    108: "al-kausar"
  }

  const baseSlug = val[0]
    .toLowerCase()
    .replace(/[ '\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  const slug = specialSlug[surahNo] ?? baseSlug
  const surat = `${surahNo}-${slug}`

  const url = `https://qurano.com/id/${surat}/ayat-${ayat}/`

  try {
    const html = await fetchUrl(url)
    const $ = cheerio.load(html)

    // Ambil title untuk nama surah
    const titleElement = $("h1.text-center")
    let title = titleElement.text().split(" Ayat")[0].trim()
    if (!title) {
      title = val[0]
    }

    // Formatter untuk tafsir
    const formatter = (id) =>
    $(`article#${id}`)
      .find("p")
      .html()
      ?.replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?em>/gi, "_") ?? ""

    // Kumpulkan data tafsir
    const tafsirData = {
      kemenag_ringkas: formatter("kemenag_ringkas"),
      kemenag: formatter("kemenag"),
      ibnu_katsir: formatter("ibnu_katsir"),
      jalalain: formatter("jalalain"),
      quraish_shihab: formatter("quraish_shihab"),
      saadi: formatter("saadi")
    }

    return {
      success: true,
      data: tafsirData,
      title,
      surat,
      ayat
    }

  } catch (error) {
    console.error(`❌ Gagal ambil ${surahNo} ayat ${ayat}:`, error.message)
    return {
      success: false,
      error: error.message,
      surat,
      ayat
    }
  }
}

async function ambilTransliterasiAyat(surahNo) {
  const litequranSlugs = [
    "al-fatihah", "al-baqarah", "ali-imran", "an-nisa", "al-maidah",
    "al-anam", "al-araf", "al-anfal", "at-taubah", "yunus",
    "hud", "yusuf", "ar-rad", "ibrahim", "al-hijr",
    "an-nahl", "al-isra", "al-kahfi", "maryam", "taha",
    "al-anbiya", "al-hajj", "al-muminun", "an-nur", "al-furqan",
    "asy-syuara", "an-naml", "al-qasas", "al-ankabut", "ar-rum",
    "luqman", "as-sajdah", "al-ahzab", "saba", "fatir",
    "yasin", "as-saffat", "sad", "az-zumar", "gafir",
    "fussilat", "asy-syura", "az-zukhruf", "ad-dukhan", "al-jasiyah",
    "al-ahqaf", "muhammad", "al-fath", "al-hujurat", "qaf",
    "az-zariyat", "at-tur", "an-najm", "al-qamar", "ar-rahman",
    "al-waqiah", "al-hadid", "al-mujadilah", "al-hasyr", "al-mumtahanah",
    "as-saff", "al-jumuah", "al-munafiqun", "at-tagabun", "at-talaq",
    "at-tahrim", "al-mulk", "al-qalam", "al-haqqah", "al-maarij",
    "nuh", "al-jinn", "al-muzzammil", "al-muddassir", "al-qiyamah",
    "al-insan", "al-mursalat", "an-naba", "an-naziat", "abasa",
    "at-takwir", "al-infitar", "al-mutaffifin", "al-insyiqaq", "al-buruj",
    "at-tariq", "al-ala", "al-gasyiyah", "al-fajr", "al-balad",
    "asy-syams", "al-lail", "ad-duha", "asy-syarh", "at-tin",
    "al-alaq", "al-qadr", "al-bayyinah", "al-zalzalah", "al-adiyat",
    "al-qariah", "at-takasur", "al-asr", "al-humazah", "al-fil",
    "al-quraisy", "al-maun", "al-kausar", "al-kafirun", "an-nasr",
    "al-lahab", "al-ikhlas", "al-falaq", "an-nas"
  ];
  const title = litequranSlugs[surahNo - 1];
  const url = `https://litequran.net/${title}/`

  try {
    const html = await fetchUrl(url)
    const $ = cheerio.load(html)

    // Ambil text arab
    const arab = $("p.arabic")
    const arabic = arab.map((i, el) => {
      return $(el).text().trim()
    })

    // Ambil transliterasi
    const trans = $("p.translate")
    const transliterasi = trans.map((i, el) => {
      return $(el).text().trim()
    })

    return {
      success: true,
      transliterasi,
      arabic,
      title
    }

  } catch (error) {
    console.error(`❌ Gagal ambil ${title}`, error.message)
    return {
      success: false,
      error: error.message,
      title
    }
  }
}


function cekAyatBelumLengkap(surahData) {
  const ayatBelumLengkap = []

  for (let i = 0; i < surahData.ayahs.length; i++) {
    const ayah = surahData.ayahs[i]
    if (!ayah.transliterasi || !ayah.kemenag || ayah.kemenag.trim() === "") {
      ayatBelumLengkap.push(i + 1)
    }
  }

  return ayatBelumLengkap
}


/* =========================
   MODE 1: WEB → JSON & DB
   MODE 2: WEB → JSON
========================= */
async function processSurah(surahNo, concurrency = 5, resume = false, mode = 1) {
  const key = surahNo - 1
  const val = List[key]

  console.log(`\n📖 Memproses surah ${surahNo}: ${val[0]} (Mode ${mode}: Web → JSON ${mode === 1 ? "& DB" : ""})`)
  console.log(`📊 Total ayat: ${val[2]}, Web concurrency: ${concurrency}${mode === 1 ? `, DB concurrency: 1` : ""}`)

  try {
    // 1. Salin data dasar
    let surahData = await salinDataSurah(key)

    if(mode === 1){
      // 2. Simpan surah ke database
      await simpanSurahToDB(surahNo, surahData)
    }

    // 3. Cek ayat yang belum lengkap
    const ayatBelumLengkap = resume ? cekAyatBelumLengkap(surahData) : Array.from({
      length: val[2]
    }, (_, i) => i + 1)

    if (ayatBelumLengkap.length === 0) {
      console.log(`✅ Semua tafsir surah ${surahNo} sudah lengkap`)
      
      // Buat versi minified
      // try {
      //   await fs.access(ALQURAN_DIR_MIN)
      // } catch {
      //   await fs.mkdir(ALQURAN_DIR_MIN, {
      //     recursive: true
      //   })
      // }

      // const filenameMin = `${ALQURAN_DIR_MIN}/Alquran_${surahNo}.min.json`
      // await fs.writeFile(filenameMin, JSON.stringify(surahData))

      return true
    }

    console.log(`🔄 Mengambil ${ayatBelumLengkap.length} ayat yang belum lengkap...`)

    // 4. Buat queue untuk pengambilan tafsir
    const webQueue = new TafsirQueue(concurrency)

    let namaSurahUpdated = false
    
    const getTrans = await ambilTransliterasiAyat(surahNo)
    const trans = getTrans.transliterasi || []
    const arabic = getTrans.arabic || []

    for (const ayat of ayatBelumLengkap) {
      webQueue.add(async () => {
        const result = await ambilTafsirAyat(surahNo, ayat)

        if (result.success) {
          // Update nama surah jika ada
          if (result.title && result.title !== surahData.name && !namaSurahUpdated) {
            surahData.name = result.title
            namaSurahUpdated = true

            if(mode === 1){
              await dbQueue.add(async () => {
                try {
                  await db.exec(`
                    UPDATE surahs SET name = '${esc(result.title)}' WHERE no = ${surahNo}
                  `)
                } catch (error) {
                  console.error(`❌ Gagal update nama surah ${surahNo}:`, error.message)
                  throw error
                }
              })
            }
          }

          // Update data di memory
          const ayahIndex = ayat - 1
          surahData.ayahs[ayahIndex] = {
            ...surahData.ayahs[ayahIndex],
            arb: arabic[ayahIndex],
            transliterasi: trans[ayahIndex],
            ...result.data
          }

          if(mode === 1) {
          // Simpan ke database via queue
          await simpanAyatToDB(surahNo, ayat, surahData.ayahs[ayahIndex])
          }
        }

        return result
      })
    }

    // 5. Proses web queue
    await webQueue.process()

    // 6. Tunggu semua operasi database selesai
    if(mode === 1) {
      console.log(`\n⏳ Menunggu operasi database selesai...`)
      await dbQueue.waitUntilEmpty()
    }

    // 7. Simpan ke file JSON
    const filename = `${ALQURAN_DIR}/Alquran_${surahNo}.json`
    await fs.writeFile(filename, JSON.stringify(surahData, null, 4))

    // 8. Buat versi minified
    // try {
    //   await fs.access(ALQURAN_DIR_MIN)
    // } catch {
    //   await fs.mkdir(ALQURAN_DIR_MIN, {
    //     recursive: true
    //   })
    // }

    const filenameMin = `${ALQURAN_DIR_MIN}/Alquran_${surahNo}.min.json`
    await fs.writeFile(filenameMin, JSON.stringify(surahData))

    console.log(`\n✅ Surah ${surahNo} selesai diproses`)
    console.log(`📊 Statistik: Web: ${webQueue.completed} berhasil, ${webQueue.failed} gagal`)
    if (mode === 1) {
      console.log(`📊 Statistik: DB: ${dbQueue.completed} berhasil, ${dbQueue.failed} gagal`)
    }

    return (mode === 1 ? (webQueue.failed === 0 && dbQueue.failed === 0) : webQueue.failed === 0)

  } catch (error) {
    console.error(`❌ Error memproses surah ${surahNo}:`, error.message)
    return false
  }
}

/* =========================
   MODE 1: WEB → JSON & DB
========================= */

async function simpanSurahToDB(surahNo, surahData) {
  return dbQueue.add(async () => {
    try {
      await db.exec(`
        INSERT OR REPLACE INTO surahs (no, name, ar, en, "id", ayat, place)
        VALUES (
          ${surahNo},
          '${esc(surahData.name)}',
          '${esc(surahData.ar)}',
          '${esc(surahData.en)}',
          '${esc(surahData.id)}',
          ${surahData.numberOfAyahs},
          '${esc(surahData.revelationType)}'
        )
      `)
      return true
    } catch (error) {
      console.error(`❌ Gagal menyimpan surah ${surahNo} ke DB:`, error.message)
      throw error
    }
  })
}

async function simpanAyatToDB(surahNo, ayahNo, ayahData) {
  return dbQueue.add(async () => {
    try {
      // Insert atau replace ayat
      await db.exec(`
        INSERT OR REPLACE INTO ayahs (surah_id, ayat, text_ar, text_latin)
        VALUES (${surahNo}, ${ayahNo}, '${esc(ayahData.arb)}', '${esc(ayahData.transliterasi || '')}')
      `)

      // Dapatkan ID ayat
      const ayahResult = await db.get(`
        SELECT id, surah_id FROM ayahs 
        WHERE surah_id = ${surahNo} AND ayat = ${ayahNo}
      `)

      // console.log("ayahResult:", ayahResult);

      if (ayahResult && ayahResult.id) {
        const ayahId = ayahResult.id
        const surahId = ayahResult.surah_id

        // Update terjemahan
        const translationQueries = 
          `DELETE FROM translations WHERE ayah_id = ${ayahId};` +
          `INSERT INTO translations (surah_id, ayah_id, lang, text) VALUES (${surahId}, ${ayahId}, 'id', '${esc(ayahData.ind)}');` +
          `INSERT INTO translations (surah_id, ayah_id, lang, text) VALUES (${surahId}, ${ayahId}, 'en', '${esc(ayahData.eng)}');`
        
        await db.exec(translationQueries)

        // Simpan tafsir
        const tafsirEntries = [
          ['kemenag', ayahData.kemenag],
          ['kemenag_ringkas', ayahData.kemenag_ringkas],
          ['jalalain', ayahData.jalalain],
          ['ibnu_katsir', ayahData.ibnu_katsir],
          ['quraish_shihab', ayahData.quraish_shihab],
          ['saadi', ayahData.saadi]
        ]

        for (const [kitab, text] of tafsirEntries) {
          if (text && text.trim()) {
            const tafsirQueries = 
              `DELETE FROM tafsirs WHERE ayah_id = ${ayahId} AND kitab = '${kitab}';` +
              `INSERT INTO tafsirs (ayah_id, surah_id, kitab, text) VALUES (${ayahId}, ${surahId}, '${kitab}', '${esc(text)}');`
            
            await db.exec(tafsirQueries)
          }
        }
      }
      return true
    } catch (error) {
      console.error(`❌ Gagal menyimpan ayat ${surahNo}:${ayahNo} ke DB:`, error.message)
      throw error
    }
  })
}


/* =========================
   MODE 3: JSON → DB
========================= */

async function migrateJSONtoDB(surahNo) {
  console.log(`\n📁 Migrasi surah ${surahNo}...`)

  const filename = `${ALQURAN_DIR}/Alquran_${surahNo}.json`

  try {
    // Baca file JSON
    const surahData = JSON.parse(await fs.readFile(filename, "utf8"))

    console.log(`📊 Surah: ${surahData.name}, Total ayat: ${surahData.ayahs.length}`)

    // Simpan surah ke database
    await dbQueue.add(async () => {
      await db.exec(`
        INSERT OR REPLACE INTO surahs (no, name, ar, en, "id", ayat, place)
        VALUES (
          ${surahData.number},
          '${esc(surahData.name)}',
          '${esc(surahData.ar)}',
          '${esc(surahData.en)}',
          '${esc(surahData.id)}',
          ${surahData.numberOfAyahs},
          '${esc(surahData.revelationType)}'
        )
      `)
    })

    // Proses setiap ayat
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < surahData.ayahs.length; i++) {
      const ayah = surahData.ayahs[i]
      const ayahNo = i + 1

      try {
        await simpanAyatToDB(surahNo, ayahNo, ayah)
        successCount++

        // Tampilkan progress
        if ((i + 1) % 10 === 0 || i === surahData.ayahs.length - 1) {
          const progress = Math.round((i + 1) / surahData.ayahs.length * 100)
          process.stdout.write(`\r📊 Progress: ${i + 1}/${surahData.ayahs.length} ayat (${progress}%)`)
        }

      } catch (error) {
        console.error(`\n❌ Gagal migrasi ayat ${ayahNo}:`, error.message)
        failCount++
      }
    }

    // Tunggu semua operasi database selesai
    await dbQueue.waitUntilEmpty()

    console.log(`\n✅ Migrasi selesai: ${successCount} berhasil, ${failCount} gagal`)
    return failCount === 0

  } catch (error) {
    console.error(`❌ Gagal migrasi surah ${surahNo}:`, error.message)
    return false
  }
}

// Rebuild FTS tables
async function rebuildFTS() {
  console.log("\n🔄 Rebuilding FTS tables...")
  try {
    await dbQueue.add(async () => {
      await db.exec(
        "INSERT INTO surahs_fts(surahs_fts) VALUES ('rebuild');" +
        "INSERT INTO ayahs_fts(ayahs_fts) VALUES ('rebuild');" +
        "INSERT INTO translations_fts(translations_fts) VALUES ('rebuild');" +
        "INSERT INTO tafsirs_fts(tafsirs_fts) VALUES ('rebuild');"
      )
    })
    await dbQueue.waitUntilEmpty()
    console.log("✅ FTS tables rebuilt")
  } catch (error) {
    console.error("❌ Error rebuilding FTS:", error.message)
  }
}

/* =========================
   FUNGSI UTAMA
========================= */
let dbQueue = null

async function main() {
  const options = parseArgs()

  console.log("=".repeat(60))
  console.log("📖 QURAN TAFSIR SCRAPER - 3 MODES")
  console.log("=".repeat(60))

  const modeNames = {
    1: "Web → JSON & DB",
    2: "Web → JSON",
    3: "JSON → DB"
  }

  console.log(`Mode: ${options.mode} (${modeNames[options.mode]})`)
  console.log(`Start: surah ${options.start}`)
  if (options.surah) console.log(`Single surah: ${options.surah}`)
  console.log(`Concurrency: ${options.concurrency}`)
  console.log(`Batch mode: ${options.batch}`)
  console.log(`Resume mode: ${options.resume}`)
  console.log("=".repeat(60))

  // Buat folder alquran jika belum ada
  try {
    await fs.access(ALQURAN_DIR)
  } catch {
    await fs.mkdir(ALQURAN_DIR, {
      recursive: true
    })
  }

  // Buat versi minified
  try {
    await fs.access(ALQURAN_DIR_MIN)
  } catch {
    await fs.mkdir(ALQURAN_DIR_MIN, {
      recursive: true
    })
  }

  // Buka koneksi database untuk mode 1 & 3
  if (options.mode === 1 || options.mode === 3) {
    console.log("\n🚀 Opening database connection...")
    db = await openDB(DB_PATH)

    // Inisialisasi database queue (HANYA 1 concurrent untuk database)
    dbQueue = new DatabaseQueue(db, 1)

    await sleep(1000)
  }

  try {
    // Tentukan surah yang akan diproses
    const surahsToProcess = []

    if (options.surah) {
      if (options.surah >= 1 && options.surah <= List.length) {
        surahsToProcess.push(options.surah)
      } else {
        console.error(`❌ Surah ${options.surah} tidak valid`)
        return
      }
    } else if (options.batch) {
      for (let i = options.start; i <= List.length; i++) {
        surahsToProcess.push(i)
      }
    } else {
      surahsToProcess.push(options.start)
    }

    console.log(`📋 Total surah yang akan diproses: ${surahsToProcess.length}`)

    let totalSuccess = 0
    let totalFailed = 0

    for (const surahNo of surahsToProcess) {
      const key = surahNo - 1

      console.log(`\n📖 ========================================`)
      console.log(`📖 Proses surah ${surahNo}: ${List[key][0]}`)
      console.log(`📖 ========================================`)

      let success = false

      try {
        switch (options.mode) {
          case 1:
            success = await processSurah(surahNo, options.concurrency, options.resume, options.mode)
            break

          case 2:
            success = await processSurah(surahNo, options.concurrency, options.resume, options.mode)
            break

          case 3:
            success = await migrateJSONtoDB(surahNo)
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
        console.error(`❌ Error memproses surah ${surahNo}:`, error.message)
        totalFailed++
      }

      // Jeda antar surah
      if (surahNo !== surahsToProcess[surahsToProcess.length - 1]) {
        const delay = options.mode === 1 || options.mode === 2 ? 3000 : 1000
        console.log(`\n⏳ Menunggu ${delay/1000} detik sebelum surah berikutnya...`)
        await sleep(delay)
      }
    }

    // Rebuild FTS untuk mode 1 & 3
    if ((options.mode === 1 || options.mode === 3) && db) {
      await rebuildFTS()
    }

    console.log("\n" + "=".repeat(60))
    console.log("🎉 PROSES SELESAI!")
    console.log("=".repeat(60))
    console.log(`📊 Statistik: ${totalSuccess} surah berhasil, ${totalFailed} surah gagal`)
    console.log(`📊 Mode: ${modeNames[options.mode]}`)

    if (options.mode === 1 || options.mode === 3) {
      console.log(`💾 Database: ${DB_PATH}`)
    }

    if (options.mode === 1 || options.mode === 2) {
      console.log(`📁 JSON files: ${ALQURAN_DIR}/`)
      console.log(`📁 Minified JSON: ${ALQURAN_DIR_MIN}/`)
    }

    console.log("=".repeat(60))

  } catch (error) {
    console.error("\n❌ Error utama:", error.message)
    console.error(error.stack)
  } finally {
    // Tutup koneksi database
    if (db) {
      db.close()
    }
  }
}

// Jalankan aplikasi
if (process.argv[1] === fileURLToPath(
    import.meta.url)) {
  main().catch(console.error)
}