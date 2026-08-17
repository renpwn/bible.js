import fs from 'fs/promises'
import path from 'path'
import {fileURLToPath} from 'url'
import * as cheerio from 'cheerio'
import {openDB} from './db.js'

const sleep = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

import { simpleLog } from '@renpwn/simplelog'

let simpleFetch = null;
try {
  const mod = await import('@renpwn/simplefetch');
  simpleFetch = mod.simpleFetch || mod.default;
} catch (_) {
  // Fallback to fetchUrl0 below if simpleFetch is not available
}

const sourceRules = [
  {
    source: "sabda",
    match: (url) => url.includes("sabda.org")
  },
  {
    source: "jw",
    match: (url) => url.includes("jw.org")
  },
  {
    source: "chabad",
    match: (url) => url.includes("chabad.org")
  }
]

const detectSource = (url) => {
  for (const rule of sourceRules) {
    if (rule.match(url)) {
      return rule.source
    }
  }
  return null
}

const sources = {
  sabda: {
    engine: "native",
  },
  jw: {
    engine: "axios-cookie",
    maxRedirects: 10,
    timeout: 20000,
  },
  chabad: {
    engine: "native",
    retries: 1,
    maxRedirects: 10,
    timeout: 20000
  }
}

const fetchUrl = async(url, options = {}) => {
  if (simpleFetch) {
    const source = detectSource(url)
    const baseConfig = source ? sources[source] : {}
    return await simpleFetch(url, {
      ...baseConfig,
      ...options,
      headers: {
        "User-Agent": "Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/109.0 Firefox/109.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",            
        ...(options?.headers || {})
      },
    });
  }
  return await fetchUrl0(url, options);
}

const logger = simpleLog({
  file: {
    path: 'logs/app.json',
    format: 'json'
  },
  progress: {
    slots: [
      '📖 BOOK',
      ['🌐 Scraping', "auto"],
      ['📊 DB Queue', [{color: [255, 255, 0]}, {color: "red"}]],
      '📚 Lexicon'
    ]
  },
  color: true
})

const logManager = {
  log: (...args) => logger.log(...args),
  update: (name, cur, total, text) =>
    logger.updateProgress(name, cur, total, text),
  remove: (name) => logger.removeProgress(name),
  clearProgress: () => logger.clearProgress()
}

const log = (...args) => logManager.log(...args)

let space = 2;

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

const B = BibleBooks;
/* =========================
    DAFTAR KITAB TANAKH
========================= */
const Tanakh = [
  {
    id: "torah",
    name: "Torah",
    books: [
      { he: "Bereshit", en: "Genesis",      id: B[0][0],  aid: 8165 },
      { he: "Shemot", en: "Exodus",         id: B[1][0],  aid: 9862 },
      { he: "Vayikra", en: "Leviticus",     id: B[2][0],  aid: 9902 },
      { he: "Bamidbar", en: "Numbers",      id: B[3][0],  aid: 9929 },
      { he: "Devarim", en: "Deuteronomy",   id: B[4][0],  aid: 9965 }
    ]
  },
  {
    id: "neviim",
    name: "Nevi'im",
    books: [
      { he: "Yehoshua", en: "Joshua",       id: B[5][0],  aid: 15785 },
      { he: "Shoftim", en: "Judges",        id: B[6][0],  aid: 15809 },
      { he: "Shmuel I", en: "I Samuel",     id: B[8][0],  aid: 15830 },
      { he: "Shmuel II", en: "II Samuel",   id: B[9][0],  aid: 15861 },
      { he: "Melachim I", en: "I Kings",    id: B[10][0], aid: 15885 },
      { he: "Melachim II", en: "II Kings",  id: B[11][0], aid: 15907 },
      { he: "Yeshayahu", en: "Isaiah",      id: B[22][0], aid: 15932 },
      { he: "Yirmiyahu", en: "Jeremiah",    id: B[23][0], aid: 15998 },
      { he: "Yechezkel", en: "Ezekiel",     id: B[25][0], aid: 16099 },
      { he: "Hoshea", en: "Hosea",          id: B[27][0], aid: 16155 },
      { he: "Yoel", en: "Joel",             id: B[28][0], aid: 16169 },
      { he: "Amos", en: "Amos",             id: B[29][0], aid: 16173 },
      { he: "Ovadiah", en: "Obadiah",       id: B[30][0], aid: 16182 },
      { he: "Yonah", en: "Jonah",           id: B[31][0], aid: 16183 },
      { he: "Michah", en: "Micah",          id: B[32][0], aid: 16187 },
      { he: "Nachum", en: "Nahum",          id: B[33][0], aid: 16194 },
      { he: "Chavakuk", en: "Habakkuk",     id: B[34][0], aid: 16197 },
      { he: "Tzefaniah", en: "Zephaniah",   id: B[35][0], aid: 16200 },
      { he: "Chaggai", en: "Haggai",        id: B[36][0], aid: 16203 },
      { he: "Zechariah", en: "Zechariah",   id: B[37][0], aid: 16205 },
      { he: "Malachi", en: "Malachi",       id: B[38][0], aid: 16219 }
    ]
  },
  {
    id: "ketuvim",
    name: "Ketuvim",
    books: [
      { he: "Tehillim", en: "Psalms",               id: B[18][0], aid: 16222 },
      { he: "Mishlei", en: "Proverbs",              id: B[19][0], aid: 16372 },
      { he: "Iyov", en: "Job",                      id: B[17][0], aid: 16403 },
      { he: "Shir Hashirim", en: "Song of Songs",   id: B[21][0], aid: 16445 },
      { he: "Rut", en: "Ruth",                      id: B[7][0],  aid: 16453 },
      { he: "Eichah", en: "Lamentations",           id: B[24][0], aid: 16457 },
      { he: "Kohelet", en: "Ecclesiastes",          id: B[20][0], aid: 16462 },
      { he: "Esther", en: "Esther",                 id: B[16][0], aid: 16474 },
      { he: "Daniel", en: "Daniel",                 id: B[26][0], aid: 16484 },
      { he: "Ezra", en: "Ezra",                     id: B[14][0], aid: 16498 },
      { he: "Nechemiah", en: "Nehemiah",            id: B[15][0], aid: 16508 },
      { he: "Divrei Hayamim I", en: "Chronicles I", id: B[12][0], aid: 16521 },
      { he: "Divrei Hayamim II", en: "Chronicles II", id: B[13][0], aid: 16550 }
    ]
  }
];

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
  },
  {
    id: 'nwt',
    name: 'Terjemahan Dunia Baru',
    language: 'id',
    category: 'core'
  },
  {
    id: 'tn_he',
    name: 'Tanakh Hebrew',
    language: 'he',
    category: 'core'
  },
  {
    id: 'tn_en',
    name: 'Tanakh Translation',
    language: 'en',
    category: 'core'
  }
]

/* =========================
   FUNGSI UMUM
========================= */
const fetchUrl0 = async(url, options = {}, maxRetries = 3) => {
  let attempt = 0;
  let isPuppeteerAvailable = true;

  // persiapkan client Axios global supaya tidak re-import setiap retry
  let axiosClient;
  try {
    const axios = await import("axios");
    const { CookieJar } = await import("tough-cookie");
    const { wrapper } = await import("axios-cookiejar-support");
    const jar = new CookieJar();
    axiosClient = wrapper(axios.default.create({ jar }));
  } catch (err) {
    log("🏳️ Gagal import Axios:", err.message);
    axiosClient = null;
  }

  while (attempt < maxRetries) {
    attempt++;
    const delay = 500 * attempt;

    // ==== Coba Axios ====
    if (axiosClient) {
      try {
        const res = await axiosClient.get(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/109.0 Firefox/109.0",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",            
            ...(options?.headers || {})
          },
          maxRedirects: 10,
          timeout: 20000,
        });
        return res.data; // sukses → return
      } catch (err) {
        log(`🏳️ Axios gagal ${attempt}x:`, err.message);
      }
    }

    // ==== Coba Puppeteer jika terinstall ====
    if(isPuppeteerAvailable){
      try {
        let puppeteer = (await import("puppeteer")).default;
        log("🏳️ Ulang pakai Puppeteer...");
        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/143.0.0.0 Safari/537.36"
        );

        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
        const html = await page.content();
        await browser.close();
        return html; // sukses → return
      } catch (err) {
        if (err.message.includes("Cannot find module") || err.message.includes("not installed")) {
          log("🏳️ Puppeteer tidak terinstall, ulang pakai Axios...");
          isPuppeteerAvailable = false;
        } else {
          log(`🏳️ Puppeteer gagal ${attempt}x:`, err.message);
        }
      }
    }

    // ==== Sleep sebelum retry ====
    if (attempt < maxRetries) {
      log(`🏳️ Tunggu ${delay}ms sebelum retry...`);
      await sleep(delay);
    }
  }

  log("🏳️ Semua percobaan gagal.");
  return null;
};

/* =========================
   KONFIGURASI
========================= */
let db = null
const DB_PATH = "./db/bible.db"
const DIR = "./json"
const DIR_LEXICON = "./lexicon";

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
    fresh: false,
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
    } else if (arg === "--fresh") {
      options.fresh = true
    } else if (arg === "--versions" || arg === "-v") {
      options.versions = args[++i].split(',')
    } else if (arg === "--help" || arg === "-h") {
      showHelp()
      process.exit(0)
    } else if (arg === "-space" || arg === "-min") {
      space = parseInt(args[++i]) ?? 2
    }
  }

  return options
}

function showHelp() {
  log(`
📖 Bible Scraper - SABDAweb

Mode:
  1: Web → DB (default)
  2: Web → JSON & DB
  3: Web → JSON
  4: JSON → DB

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
  -space <n>, -min <n>     Atur spasi JSON output (default: 2)

Contoh:
  node bible.js                     # Mode 1, kitab 1
  node bible.js -m 1 -s 40 -B       # Mode 1, mulai kitab 40, semua
  node bible.js -m 2 -b 1           # Mode 2, hanya kitab 1
  node bible.js -m 3 -c 3 -B        # Mode 3, 3 paralel, semua kitab
  node bible.js -m 1 -v tb,bis -B   # Mode 1, hanya versi TB dan BIS
  `)
}

/* =========================
   SISTEM QUEUE - DIPERBAIKI
========================= */
class BaseQueue {
    constructor(concurrency = 1, name = "Main") {
        this.concurrency = concurrency
        this.name = name

        this.queue = []
        this.processing = 0
        this.completed = 0
        this.failed = 0
        this.total = 0
    }

    add(task) {
        this.total++;
        this.queue.push(task)
        return this
    }

    async addAsync(task) {
        this.total++;
        return new Promise((resolve, reject) => {
            this.queue.push({
                task,
                resolve,
                reject
            })
            this.process()
        })
    }

    async process(handler) {
        const workers = []

        const worker = async () => {
            while (this.queue.length > 0) {
                if (this.processing >= this.concurrency) {
                    await sleep(10)
                    continue
                }

                const item = this.queue.shift()
                if (!item) continue

                this.processing++
                if (typeof item === "string")
                    this.currentLexi = item

                const isDB = typeof item === "object" && item.task
                const isFn = typeof item === "function"

                try {
                    const result = isDB ?
                        await item.task() :
                        isFn ?
                        await item() :
                        await handler(item)

                    this.completed++

                    if (isDB) item.resolve(result)
                    else if (this.results) this.results.push(result)
                    else if (this.lexiconCache) this.lexiconCache.set(item, result)
                } catch (error) {
                    this.failed++
                    if (isDB) item.reject(error)
                    log(`❌ ${this.name} error:`, error.message)
                } finally {
                    this.processing--
                    this.showProgress()
                }
            }
        }

        for (let i = 0; i < this.concurrency; i++) {
            workers.push(worker())
        }

        await Promise.all(workers)

        return this.results || this.lexiconCache
    }

    showProgress() {
        const processed = this.completed + this.failed
        logManager.update(
            this.name,
            processed,
            this.total || 1,
            `${this.currentLexi ? "| " + this.currentLexi + " " : ""}| ⏳ ${this.processing} | ❌ ${this.failed}`
        )
    }
}

class DatabaseQueue extends BaseQueue {
    constructor(db, concurrency = 1) {
        super(concurrency, "📊 DB Queue")
        this.db = db
    }

    async waitUntilEmpty() {
        while (this.queue.length > 0 || this.processing > 0) {
            await sleep(100)
        }
    }
}

class BibleQueue extends BaseQueue {
    constructor(concurrency = 3) {
        super(concurrency, "🌐 Scraping")
        this.results = []
    }
}

class LexiconQueue extends BaseQueue {
    constructor(concurrency = 2) {
        super(concurrency, "📚 Lexicon")
        this.lexiconCache = new Map()
        this.currentLexi = ""
    }

    add(strongNumber) {
        if (!this.lexiconCache.has(strongNumber)) {
            super.add(strongNumber)
            this.lexiconCache.set(strongNumber, null)
        }
    }

    getCache() {
        return this.lexiconCache
    }
}

/* =========================
   SUPERSCRIPT
========================= */
function toSuperscript(num) {
  const sup = '⁰¹²³⁴⁵⁶⁷⁸⁹'
  return '⁽' + String(num).split('').map(n => sup[n]).join('') + '⁾'
}

async function fetchSabdaData(bookId, chapter, targetVersions) {
  const url = `https://sabdaweb.sabda.org/bible/chapter/?b=${bookId}&c=${chapter}&v=1&version=tb&altver%5B%5D=bis&altver%5B%5D=tl&altver%5B%5D=ende&altver%5B%5D=tb_itl_drf&altver%5B%5D=tl_itl_drf&altver%5B%5D=bbe&altver%5B%5D=message&altver%5B%5D=nkjv&altver%5B%5D=net&altver%5B%5D=net2&view=column&page=chapter&lang=indonesia&theme=clearsky`
  const html = await fetchUrl(url)
  const $ = cheerio.load(html);
  const verses = [];
  const strongNumbers = new Set();

  const prefix = bookId <= 39 ? 'H' : 'G';

  $('tr[id="b"]').each((rowIndex, row) => {
    const cells = $(row).find('td');

    const verseData = {
      verse: rowIndex + 1,
      texts: {},
      notes: []
    };

    /* =========================
       VERSE NUMBER
    ========================= */
    const firstCell = $(cells[0]);
    const verseNumMatch =
      firstCell.find('a[name]').attr('name') ||
      firstCell.find('b').text().match(/\d+:\d+/);

    if (verseNumMatch) {
      const verseNum = typeof verseNumMatch === 'string'
        ? verseNumMatch.split(':')[1] || verseNumMatch
        : (rowIndex + 1);
      verseData.verse = parseInt(verseNum);
    }

    /* =========================
       CELLS
    ========================= */
    cells.each((cellIndex, cell) => {
      const version = findVersionForColumn(cellIndex, targetVersions);
      if (!version) return;

      const cellHtml = $(cell).html();
      if (!cellHtml) return;

      // ===== KHUSUS NET
      if (version.id === 'net2') {
        const cell$ = cheerio.load(cellHtml);

        /* =========================
          BOOK & TITLE
        ========================= */
        const book = cell$('p.book').first().text().trim()
        const title = cell$('p.paragraphtitle').first().text().trim()

        const verseNode = cell$('td').length ? cell$('td') : cell$.root();

        const notes = [];

        /* ----- NOTES ----- */
        verseNode.find('div[id^="n"]').each((_, el) => {
          const $el = cell$(el);
          const num = $el.attr('id').replace('n', '');

          const type = $el.find('b').first().text().trim() || null;

          let lang = null;
          $el.find('i').each((_, iel) => {
            const t = cell$(iel).text().trim();
            if (t === 'Heb' || t === 'Grk') lang = t;
          });

          const body = $el.clone();
          body.find('b').remove();
          body.find('i').each((_, iel) => {
            const t = cell$(iel).text().trim();
            if (t === 'Heb' || t === 'Grk') cell$(iel).remove();
          });

          const text = body.text().replace(/\s+/g, ' ').trim();

          notes.push({ num, type, lang, text });
        });

        /* ----- AYAT ----- */
        verseNode.find('div').remove();
        verseNode.find('a').remove();

        verseNode.find('sup').each((_, el) => {
          cell$(el).replaceWith(toSuperscript(cell$(el).text()));
        });

        let verseText = verseNode
          .text()
          .replace(/^\d+:\d+\s*/, '')
          .replace(/\s+/g, ' ')
          .trim();

        /* ----- RENDER NOTE KE TEXT ----- */
        if (notes.length) {
          verseData.notes = new Object();
          for (const n of notes) {
            const meta = [n.type, n.lang].filter(Boolean).join(', ');
            verseData.notes[n.num] = `${meta ? `(${meta})` : ''}: ${n.text}`.trim();
          }
        }

        verseData.texts[version.id] = `*${book}*\n\n_${title}_\n\n${verseText}`;
        return;
      }

      /* =========================
         VERSI NON-NET (AS IS)
      ========================= */
      const cellText = $(cell).text().trim();
      let text = cellText.replace(/^\d+:\d+\s*/, '').trim();
      verseData.texts[version.id] = text;

      if (version.supports_strong && version.id !== 'net2') {
        const strongMatches = cellHtml.match(/\/tools\/lexicon\/\?w=(\d+)/g);
        if (strongMatches) {
          strongMatches.forEach(m => {
            const num = m.match(/\d+/)[0];
            strongNumbers.add(prefix + num);
          });
        }
      }
    });

    if (Object.keys(verseData.texts).length > 0) {
      verses.push(verseData);
    }
  });

  return {
    bookId,
    chapter,
    verses,
    totalVerses: verses.length,
    strongNumbers: Array.from(strongNumbers)
  };
}

/* =========================
   GET CHAPTER DATA - DUAL SOURCE
========================= */

async function getChapterData(bookId, chapter, targetVersions) {
  try {    
    const bookName = BibleBooks[bookId-1][0];
    let sabdaData = null;
    let nwtData = null;
    let chabadData = null;
    
    // Fetch dari SABDAweb
    try {
      sabdaData = await fetchSabdaData(bookId, chapter, targetVersions)      
      log(`📘 Sabda : ${bookName} ${chapter} (${sabdaData.totalVerses} ayat)`);
    } catch (error) {
      log(`❌ Gagal ambil dari SABDAweb ${bookId}:${chapter}:`, error.message)
    }
    
    // Fetch dari JW.org untuk NWT
    try {
      nwtData = await fetchJWData(bookId, chapter);      
      log(`📗 JW    : ${bookName} ${chapter} (${nwtData.length} ayat)`);
    } catch (error) {
      log(`❌ Gagal ambil dari NWT ${bookId}:${chapter}:`, error.message)
    }
    
    // Fetch dari Chabad.org untuk Tanakh
    try {
      const isTanakh = bookId <= 39; // Perjanjian Lama
      if (isTanakh) {
        const tanakhBook = findTanakhBook(bookId);
        chabadData = await fetchChabadData(bookId, chapter);
        log(`📕 Chabad: ${tanakhBook.id} ${chapter} (${chabadData.totalVerses} ayat) | ${tanakhBook.he} (${tanakhBook.en}) | ${chabadData.aid} ✓`);
      }
    } catch (error) {
      log(`❌ Gagal ambil dari Chabad ${bookId}:${chapter}:`, error.message)
    }
    
    // Gabungkan data dari kedua sumber
    const combinedData = await combineChapterData(sabdaData, nwtData, chabadData, bookId, chapter);
    
    return {
      success: sabdaData || nwtData || chabadData,
      data: combinedData,
      sources: {
        sabda: !!sabdaData,
        jw: !!nwtData,
        chabad: !!chabadData
      }
    }
  } catch (error) {
    log(`❌ Gagal ambil ${bookId}:${chapter}:`, error.message)
    return {
      success: false,
      error: error.message,
      bookId,
      chapter
    }
  }
}

/* =========================
   FETCH JW.ORG DATA
========================= */

function buildChabadUrl(aid) {
  return `https://www.chabad.org/library/bible_cdo/aid/${aid}`
}

async function fetchJWData(bookId, chapter){
  const html = await fetchUrl(`https://wol.jw.org/id/wol/b/r25/lp-in/nwtsty/${bookId}/${chapter}#study=discover`);
  if (!html) return null;

  const $ = cheerio.load(html);
  const versesMap = new Map();

  $("span.v").each((_, el) => {
    const $v = $(el);

    // ==== ambil nomor ayat ====
    let verse = null;

    // dari <strong>
    const strongNum = $v.find("strong").first().text().trim();
    if (/^\d+$/.test(strongNum) && versesMap.size === 0) {
      verse = 1;
    }

    // dari <a> (tanpa child)
    if (verse === null) {
      const aNum = $v
        .find("a")
        .first()
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim();
      if (/^\d+$/.test(aNum)) verse = Number(aNum);
    }

    // fallback dari ID (PALING PENTING)
    if (verse === null) {
      const id = $v.attr("id"); // v24-3-2-4
      const m = id && id.match(/^v\d+-\d+-(\d+)-\d+$/);
      if (m) verse = Number(m[1]);
    }

    if (verse === null) return;

    // ==== teks ayat ====
    const text = $v
      .clone()
      .find("a, .fn, .b, .tt")
      .remove()
      .end()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    if (!text) return;

    // ==== gabungkan fragment ====
    if (!versesMap.has(verse)) {
      versesMap.set(verse, text);
    } else {
      versesMap.set(verse, versesMap.get(verse) + " " + text);
    }
  });

  // ==== hasil akhir ====
  const verses = [...versesMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([verse, text]) => ({ verse, text }));

  return verses;
}

/* =========================
   FETCH TANAKH DATA (SEFARIA + RASHI)
========================= */
const SEFARIA_NAME_MAP = {
  "Shmuel I": "I Samuel",
  "Shmuel II": "II Samuel",
  "Melachim I": "I Kings",
  "Melachim II": "II Kings",
  "Divrei Hayamim I": "I Chronicles",
  "Divrei Hayamim II": "II Chronicles",
  "Chronicles I": "I Chronicles",
  "Chronicles II": "II Chronicles"
};

async function fetchChabadData(bookId, chapter) {
  // Cari book info dari struktur Tanakh
  const tanakhBook = findTanakhBook(bookId);
  if (!tanakhBook) {
    log(`⚠️ Kitab ${bookId} tidak ditemukan dalam Tanakh`);
    return null;
  }
  
  const { aid, he, en } = tanakhBook;
  const sefariaBook = SEFARIA_NAME_MAP[en] || en;
  
  try {
    // 1. Ambil teks Tanakh (Hebrew + English JPS) dari Sefaria API
    const tanakhUrl = `https://www.sefaria.org/api/texts/${encodeURIComponent(sefariaBook)}.${chapter}?context=0`;
    const tanakhRes = await fetch(tanakhUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!tanakhRes.ok) {
      throw new Error(`Sefaria HTTP ${tanakhRes.status}`);
    }
    const tanakhData = await tanakhRes.json();

    // 2. Ambil komentar Rabbi Rashi untuk pasal ini
    let rashiData = null;
    try {
      const rashiUrl = `https://www.sefaria.org/api/texts/Rashi_on_${encodeURIComponent(sefariaBook)}.${chapter}?context=0`;
      const rashiRes = await fetch(rashiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (rashiRes.ok) {
        rashiData = await rashiRes.json();
      }
    } catch (_) {}

    const stripTags = (str) => typeof str === 'string' ? str.replace(/<[^>]*>/g, '').replace(/[\s\u200B]+/g, ' ').trim() : '';

    const verses = (tanakhData.he || []).map((hebRaw, idx) => {
      const verseNum = idx + 1;
      const engRaw = tanakhData.text?.[idx] || '';

      const rashiHeb = rashiData?.he?.[idx] || [];
      const rashiEng = rashiData?.text?.[idx] || [];

      const hebArr = Array.isArray(rashiHeb) ? rashiHeb : (rashiHeb ? [rashiHeb] : []);
      const engArr = Array.isArray(rashiEng) ? rashiEng : (rashiEng ? [rashiEng] : []);

      const maxComments = Math.max(hebArr.length, engArr.length);
      const rashiList = [];
      for (let c = 0; c < maxComments; c++) {
        const h = hebArr[c] ? stripTags(hebArr[c]) : '';
        const e = engArr[c] ? stripTags(engArr[c]) : '';
        if (h || e) {
          rashiList.push({ heb: h, eng: e });
        }
      }

      return {
        verse: verseNum,
        tn_he: stripTags(hebRaw),
        tn_en: stripTags(engRaw),
        rashi: rashiList
      };
    });

    return {
      bookId,
      chapter,
      aid: aid || 0,
      nextAid: null,
      verses,
      totalVerses: verses.length
    };
  } catch (error) {
    log(`⚠️ Error Tanakh ${bookId}:${chapter}:`, error.message);
    throw error;
  }
}

/* =========================
   FIND TANAKH BOOK
========================= */

function findTanakhBook(bookId) {
  // Mapping dari ID Alkitab ke kitab Tanakh
  const bookName = BibleBooks[bookId - 1][0];
  
  // Cari di semua bagian Tanakh
  for (const section of Tanakh) {
    const index = section.books.findIndex(b => b.id === bookName);
    if (index !== -1) {
      const book = section.books[index];
      return {
        ...book,
        tanakh_id: section.id,
        name: section.name,
        pos: index
      };
    }
  }
  
  return null;
}

/* =========================
   COMBINE CHAPTER DATA
========================= */

async function combineChapterData(sabdaData, nwtData, chabadData, bookId, chapter) {
  const s = sabdaData?.verses || []
  const n = nwtData || []
  const c = chabadData?.verses || []
  const verses = []

  const maxVerse = Math.max(s.length, n.length, c.length)
  if (!maxVerse) return null;
  
  for (let i = 0; i < maxVerse; i++) {
    const texts = {
      ...(s[i]?.texts || {}),
      ...(n[i]?.text ? { nwt: n[i].text } : {}),
      ...(c[i]?.tn_he ? { tn_he: c[i].tn_he, tn_en: c[i].tn_en } : {})
    };
    if (!Object.keys(texts).length) continue;
    
    verses.push({
      verse: i+1,
      texts,
      ...(s[i]?.notes && Object.keys(s[i].notes).length && { notes: s[i].notes }),
      ...(c[i]?.rashi?.length && { rashi: c[i].rashi })
    })
  }
  
  return {
    bookId,
    chapter,
    verses,
    totalVerses: maxVerse,
    ...(chabadData?.aid && { aid: chabadData.aid }),
    ...(chabadData?.nextAid && { nextAid: chabadData.nextAid }),
    sources: { sabda: !!sabdaData, jw: !!nwtData, chabad: !!chabadData },
    strongNumbers: sabdaData.strongNumbers || []
  };
}

/* =========================
   MODE 
  1: Web → DB (default)
  2: Web → JSON & DB
  3: Web → JSON
========================= */

async function processBook(bookId, concurrency = 3, resume = false, mode = 1, targetVersions = BibleVersions) {
  const bookInfo = BibleBooks[bookId - 1];
  const totalChapters = bookInfo[1];

  log(`📖 Memproses kitab ${bookId}: ${bookInfo[0]}`);
  log(`📊 Total pasal: ${totalChapters}, Concurrency: ${concurrency}`);
  log(`📚 Versi: ${targetVersions.map(v => v.id).join(', ')}`);  
  const {
     name : tanakh_name, pos: tanakh_pos, he: tname_he, en: tname_en, aid
  } = findTanakhBook(bookId) || {};

  // Buat struktur data untuk kitab
  const createBookBase = () => ({
    id: bookId,
    name: bookInfo[0],
    chapters: totalChapters,
    totalVerses: bookInfo[2],
    pericopes: bookInfo[3],
  
    ...(tanakh_name != null && { tanakh_name }),
    ...(tanakh_pos != null && { tanakh_pos }),
    ...(tname_he != null && { tname_he }),
    ...(tname_en != null && { tname_en }),
    ...(aid != null && { aid }),

    testament: bookId <= 39 ? 'OT' : 'NT',
    data: new Array(totalChapters)
  })

  const bookData = createBookBase()
  const noteData = createBookBase()

  // Cek pasal yang sudah ada jika resume
  const chaptersToProcess = [];
  if (mode !== 3 && resume) {
    // Cek di database
    for (let chapter = 1; chapter <= totalChapters; chapter++) {
      const hasData = await checkChapterInDB(bookId, chapter, targetVersions);
      if (!hasData) {
        chaptersToProcess.push(chapter);
      }
    }
  } else {
    chaptersToProcess.push(...Array.from({
      length: totalChapters
    }, (_, i) => i + 1));
  }

  if (chaptersToProcess.length === 0) {
    log(`✅ Semua pasal kitab ${bookId} sudah lengkap`);
    return { success: true, strongNumbers: [] };
  }

  log(`🔄 Mengambil ${chaptersToProcess.length} pasal...`);

  // Buat queue untuk pengambilan data
  const webQueue = new BibleQueue(concurrency);
  const bookStrongs = new Set();

  // helper untuk clone + hapus field
  const stripField = (chapter, fields) => {
    const remove = new Set(Array.isArray(fields) ? fields : [fields])
  
    return (Array.isArray(chapter) ? chapter : [chapter]).map(book => ({
      ...book,
      verses: (book.verses ?? []).map(v =>
        Object.fromEntries(
          Object.entries(v).filter(([k]) => !remove.has(k))
        )
      )
    }))
  }
    
  logManager.update("🌐 Scraping", 0, chaptersToProcess.length);

  for (const chapter of chaptersToProcess) {
    webQueue.add(async () => {
      const result = await getChapterData(bookId, chapter, targetVersions);

      if (result.success) {
        // Kumpulkan Strong's numbers dari hasil parsing
        if (result.data.strongNumbers && result.data.strongNumbers.length > 0) {
          result.data.strongNumbers.forEach(s => bookStrongs.add(s));
          delete result.data.strongNumbers
        }
        
        bookData.data[chapter - 1] = stripField(result.data, ['notes', 'rashi']);
        noteData.data[chapter - 1] = stripField(result.data, 'texts');

        // Simpan ke database jika mode 1 atau 2
        if (mode !== 3) {
          await saveChapterToDB(result.data, targetVersions);
        }
      }
      return result;
    });
  }

  // Proses queue
  await webQueue.process();

  // Tunggu database queue jika mode 1 atau 2
  if (mode !== 3 && dbQueue) {
    log("\n⏳ Menunggu operasi database selesai...");
    await dbQueue.waitUntilEmpty();
  }

  if(mode !== 1){
    await createDirectories(mode)
    // Simpan ke file JSON
    const filename = `${DIR}/Bible_${bookId}_${bookInfo[0].replace(/\s+/g, '_')}.json`;
    await fs.writeFile(filename, JSON.stringify(bookData, null, space));
    const filenameNotes = `${DIR}/Bible_${bookId}_${bookInfo[0].replace(/\s+/g, '_')}.notes.json`;
    await fs.writeFile(filenameNotes, JSON.stringify(noteData, null, space));
  }
  
  log("")
  log(`✅ Kitab ${bookId} selesai diproses`);
  log(`📊 Statistik: ${webQueue.completed} berhasil, ${webQueue.failed} gagal`);
  log(`📚 Strong's numbers ditemukan: ${bookStrongs.size}`);
  logManager.update("📚 Lexicon", 0, bookStrongs.size || 0);

  return {
    success: webQueue.failed === 0,
    strongNumbers: Array.from(bookStrongs)
  };
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
  if (!db) return;

  const { bookId, chapter, verses } = chapterData;

  for (const verseData of verses) {
    await dbQueue.addAsync(async () => {
      try {
        // Hanya simpan teks ayat (per versi) ke tabel verses
        for (const version of targetVersions) {
          const versionId = version.id;
          const text = verseData.texts[versionId];

          if (text && text.trim()) {
            await db.run(
              `INSERT OR REPLACE INTO verses (book_id, chapter, verse, version, text) 
               VALUES (?, ?, ?, ?, ?)`,
              [bookId, chapter, verseData.verse, versionId, text]
            );
          }
        }
        return true;
      } catch (error) {
        log(`❌ Gagal menyimpan ${bookId}:${chapter}:${verseData.verse}:`, error.message);
        throw error;
      }
    });
  }
}

/* =========================
   MODE 3: JSON → DB
========================= */

async function migrateJSONtoDB(bookId) {
  log(`\n📁 Migrasi kitab ${bookId}...`)

  const filename = `${DIR}/Bible_${bookId}_*.json`
  const files = await fs.readdir(DIR)
  const bookFile = files.find(f => f.startsWith(`Bible_${bookId}_`))

  if (!bookFile) {
    log(`❌ File JSON untuk kitab ${bookId} tidak ditemukan`)
    return false
  }

  const filePath = `${DIR}/${bookFile}`

  try {
    const bookData = JSON.parse(await fs.readFile(filePath, "utf8"))
    log(`📊 Kitab: ${bookData.name}, Total pasal: ${bookData.data.length}`)

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
          process.stdout.write(`📊 Progress: ${successCount}/${bookData.data.length} pasal (${progress}%)\n`)
        }

      } catch (error) {
        log(`\n❌ Gagal migrasi pasal ${chapterData.chapter}:`, error.message)
        failCount++
      }
    }

    // Tunggu database queue selesai
    await dbQueue.waitUntilEmpty()

    log(`\n✅ Migrasi selesai: ${successCount} berhasil, ${failCount} gagal`)
    return failCount === 0

  } catch (error) {
    log(`❌ Gagal migrasi kitab ${bookId}:`, error.message)
    return false
  }
}

/* =========================
   FUNGSI INIT DATABASE
========================= */

async function initializeDatabase() {
  log("\n📊 Inisialisasi database...")
  
  // Insert Tanakh sections
  for (const section of Tanakh) {
    await dbQueue.addAsync(async () => {
      await db.run(`
        INSERT OR REPLACE INTO tanakh (id, name)
        VALUES (?, ?)
      `, [
        section.id,
        section.name
      ])
    })
  }

  // Insert versi-versi Alkitab
  for (const version of BibleVersions) {
    await dbQueue.addAsync(async () => {
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
    await dbQueue.addAsync(async () => {      
      const tnBook = findTanakhBook(i+1);
      await db.run(`
        INSERT OR REPLACE INTO books (id, name, name_en, name_he, chapters, total_verses, pericopes, testament, tanakh_id, tanakh_pos, aid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        i + 1,
        book[0],
        tnBook?.en || null,
        tnBook?.he || null,
        book[1],
        book[2],
        book[3],
        i < 39 ? 'OT' : 'NT',
        tnBook?.tanakh_id || null,
        tnBook?.pos || null,
        tnBook?.aid || null
      ])
    })
  }

  await dbQueue.waitUntilEmpty()
  log("✅ Database initialized")
}

/* =========================
   STRONG'S NUMBERS - IMPROVED
========================= */

async function fetchStrongLexicon(strongNumber) {
  const prefix = strongNumber.charAt(0);
  const number = strongNumber.substring(1);
  const url = `https://sabdaweb.sabda.org/tools/lexicon/?w=${number}`;

  try {
    const html = await fetchUrl(url);
    const $ = cheerio.load(html);
    
    // log(`📚 Lexicon: ${strongNumber}`);

    // Data dasar
    let lexiconData = {
      strong: strongNumber,
      word: '',
      pronunciation: '',
      etymology: '',
      strong_reference: '',
      source: '',
      partOfSpeech: '',
      avSummary: '',
      occurrence: 0,
      definition: '',
      isSpecialCase: false
    };

    // 1. Cek apakah ada konten <pre> khusus
    const preContent = $('td#b pre, tr[valign="top"] pre').first();
    
    if (preContent.length > 0) {
      const preText = preContent.text().trim();
      
      // Deteksi halaman khusus (dalam bahasa Inggris)
      if (preText.includes('The original word in the Greek or Hebrew') ||
          preText.includes('Strong\'s No.') ||
          preText.includes('e.g.')) {
        
        lexiconData.isSpecialCase = true;
        lexiconData.definition = preText;
        lexiconData.word = '[SPECIAL CASE - Explanatory Page]';
        
        return lexiconData;
      }
    }

    // 2. Parsing untuk halaman lexicon normal
    $('span#h, span#g').each((_, el) => {
      $(el).replaceWith(`_*${$(el).text()}*_`)
    })

    const rows = $('td#b table tbody tr')
      .map((_, row) => $(row).find('td').eq(1))
      .get()

    // Jika tidak ada tabel, coba alternatif
    if (rows.length === 0) {
      const altRows = $('table[cellpadding="3"] tbody tr')
        .map((_, row) => $(row).find('td').eq(1))
        .get()
      
      if (altRows.length > 0) {
        return parseTableStructure(altRows, lexiconData);
      }
      
      // Fallback: ambil teks langsung
      const textContent = $('td#b').text().trim();
      if (textContent) {
        lexiconData.definition = textContent;
      }
      return lexiconData;
    }

    // Parsing tabel normal
    const getText = i => rows[i]?.text().replace(/\s+/g, ' ').trim() || '';
    const getPre = i => rows[i]?.find('pre').text().trim() || getText(i);

    lexiconData.word          = getText(1);
    lexiconData.pronunciation = getText(2);
    lexiconData.etymology     = getText(3);
    lexiconData.source        = getText(4);
    lexiconData.partOfSpeech  = getText(5);
    lexiconData.avSummary     = getText(6);
    lexiconData.occurrence    = parseInt(getText(7)) || 0;
    lexiconData.definition    = getPre(8);

    // Ekstrak referensi Strong
    const strongMatch = lexiconData.etymology.match(/\d+/);
    if (strongMatch) {
      lexiconData.strong_reference = prefix + strongMatch[0];
    }

    return lexiconData;

  } catch (error) {
    log(`❌ Failed to fetch lexicon ${strongNumber}:`, error.message);
    return {
      strong: strongNumber,
      error: error.message
    };
  }
}

// Fungsi helper untuk parsing struktur tabel
function parseTableStructure(rows, lexiconData) {
  const getText = i => rows[i]?.text().replace(/\s+/g, ' ').trim() || '';
  const getPre = i => rows[i]?.find('pre').text().trim() || getText(i);
  
  if (rows.length >= 8) {
    lexiconData.word          = getText(1);
    lexiconData.pronunciation = getText(2);
    lexiconData.etymology     = getText(3);
    lexiconData.source        = getText(4);
    lexiconData.partOfSpeech  = getText(5);
    lexiconData.avSummary     = getText(6);
    lexiconData.occurrence    = parseInt(getText(7)) || 0;
    lexiconData.definition    = getPre(8);
  } else if (rows.length >= 6) {
    lexiconData.word          = getText(0);
    lexiconData.pronunciation = getText(1);
    lexiconData.etymology     = getText(2);
    lexiconData.partOfSpeech  = getText(3);
    lexiconData.occurrence    = parseInt(getText(4)) || 0;
    lexiconData.definition    = getPre(5);
  } else if (rows.length >= 3) {
    lexiconData.word          = getText(0);
    lexiconData.pronunciation = getText(1);
    lexiconData.definition    = getPre(2);
  }
  
  return lexiconData;
}

async function saveLexiconToDB(lexiconData) {
  if (!lexiconData || !lexiconData.strong) return false;

  return dbQueue.addAsync(async () => {
    try {
      await db.run(`
        INSERT OR REPLACE INTO strong_lexicon 
        (strong, word, pronunciation, etymology, strong_reference, source, 
          partOfSpeech, avSummary, occurrence, definition, isSpecialCase)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        lexiconData.strong,
        lexiconData.word,
        lexiconData.pronunciation,
        lexiconData.etymology,
        lexiconData.strong_reference,
        lexiconData.source,
        lexiconData.partOfSpeech,
        lexiconData.avSummary,
        lexiconData.occurrence,
        lexiconData.definition,
        lexiconData.isSpecialCase
      ]);

      return true;
    } catch (error) {
      log(`❌ Gagal menyimpan lexicon ${lexiconData.strong}:`, error.message);
      log(error);
      return false;
    }
  });
}

// Simpan lexicon ke JSON (auto H / G)
async function saveLexiconToJSON(lexiconData, overwrite = true) {
  if (!lexiconData?.strong) return false;

  try {
    const prefix = lexiconData.strong[0];
    const data = { ...lexiconData, timestamp: new Date().toISOString() };
    const file = `${lexiconData.strong}.json`;
    
    if (!overwrite) {
      try {
        await fs.access(path.join(DIR_LEXICON, prefix, file));
        return false;
      } catch {}
    }

    await fs.writeFile(
      path.join(DIR_LEXICON, prefix, file),
      JSON.stringify(data, null, space),
      'utf8'
    );

    return data;
  } catch (e) {
    log(`❌ Gagal simpan ${lexiconData.strong}:`, e.message);
    return false;
  }
}

async function processLexicons(strongNumbers, concurrency = 2, mode) {
  if (!strongNumbers || strongNumbers.length === 0) {
    log("ℹ️ Tidak ada Strong's numbers untuk diproses");
    return;
  }
  
  // log(`\n📚 Memproses ${strongNumbers.length} Strong's numbers...`);
  
  const validStrongs = strongNumbers.filter(s => s && s.match(/^[HG]\d+$/));
  
  if (validStrongs.length === 0) {
    log("❌ Tidak ada Strong's numbers yang valid");
    return;
  }

  if(mode !== 1){
    // Buat folder output
    try {
      await fs.access(DIR);
      } catch {
        await fs.mkdir(DIR, { recursive: true });
      }
  }
  
  await createLexiconDirectories(mode);

  const lexiconQueue = new LexiconQueue(concurrency);
  const uniqueStrongs = [...new Set(validStrongs)];
  
  log(`🔄 ${uniqueStrongs.length} unique Strong's numbers`);
  
  uniqueStrongs.forEach(strong => lexiconQueue.add(strong));
  
  let index, indexPath, indexMinPath;
  if(mode !== 1){
    indexPath = `${DIR_LEXICON}/_index.json`;
    index = await fs.readFile(indexPath, 'utf8')
      .then(JSON.parse)
      .catch(() => []);    
  }
  
  const cache = await lexiconQueue.process(async (strongNumber) => {
    await sleep(300);
    
    try {
      const lexiconData = await fetchStrongLexicon(strongNumber);
      
      if (lexiconData && (lexiconData.word || lexiconData.is_specialcase)) {
        const savedData = [2,3].includes(mode) && await saveLexiconToJSON(lexiconData);
        mode !== 3 && await saveLexiconToDB(lexiconData);
        
        if (savedData) {
          index = await updateLexiconIndex(index, savedData);
        }
        
        return lexiconData;
      } else {
        log(`⚠️ Lexicon ${strongNumber} tidak ditemukan atau kosong`);
        return null;
      }
    } catch (error) {
      log(`❌ Error mengambil lexicon ${strongNumber}:`, error.message);
      return null;
    }
  });
  
  if(mode !== 1){
  // Simpan index.json
    await fs.writeFile(indexPath, JSON.stringify(index, null, space), 'utf8');
  }
  
  log("")
  log(`✅ Lexicon processing selesai`);
  log(`📊 Statistik: ${lexiconQueue.completed} berhasil, ${lexiconQueue.failed} gagal`);
  
  try {
    let hebrewCount = 0, greekCount = 0;

    index = mode !== 1 ? JSON.parse(await fs.readFile(indexPath, 'utf8')) : uniqueStrongs.map(s => ({ strong: s }));

    for (const i of index) {
      if (i.strong[0] === 'H') hebrewCount++;
      else if (i.strong[0] === 'G') greekCount++;
    }
    
    log("")
    log(`📚 STATISTIK LEXICON:`);
    log(`   Total: ${index.length} entries`);
    log(`   Hebrew (H): ${hebrewCount}`);
    log(`   Greek (G): ${greekCount}`);
    if(mode !== 1){
      log(`   JSON folder: ${DIR_LEXICON}/`);
    }
  } catch (error) {
    log('📚 Lexicon index belum dibuat atau error');
  }
  
  return cache;
}

function findVersionForColumn(columnIndex, targetVersions) {
  const columnMapping = [
    'tb',
    'bis',
    'tl',
    'ende',
    'tb_itl_drf',
    'tl_itl_drf',
    'bbe',
    'message',
    'nkjv',
    'net',
    'net2'
  ]

  if (columnIndex < columnMapping.length) {
    const versionId = columnMapping[columnIndex]
    return targetVersions.find(v => v.id === versionId)
  }

  return null
}

// Buat folder lexicon dengan struktur H & G
async function createLexiconDirectories(mode) {
  if(mode === 1) return false;
  const subs  = ['H', 'G']
    for (const sub of subs) {
      try {
        await fs.access(path.join(DIR_LEXICON, sub));
      } catch {
        await fs.mkdir(path.join(DIR_LEXICON, sub), { recursive: true });
      }
    }
}

async function createDirectories(mode) {
  if(mode === 1) return false;
  try {
    await fs.access(DIR);
  } catch {
    await fs.mkdir(DIR, { recursive: true });
  }
}

// Update index.json
async function updateLexiconIndex(index, lexiconData) {
  try {
    const existingIdx = index.findIndex(item => item.strong === lexiconData.strong);
    
    if (existingIdx >= 0) {
      index[existingIdx] = {
        strong: lexiconData.strong,
        word: lexiconData.word || "",
        pronunciation: lexiconData.pronunciation || "",
        timestamp: new Date().toISOString()
      };
    } else {
      index.push({
        strong: lexiconData.strong,
        word: lexiconData.word || "",
        pronunciation: lexiconData.pronunciation || "",
        timestamp: new Date().toISOString()
      });
    }
    
    index.sort((a, b) => {
      const prefixA = a.strong.charAt(0);
      const prefixB = b.strong.charAt(0);
      const numA = parseInt(a.strong.substring(1)) || 0;
      const numB = parseInt(b.strong.substring(1)) || 0;
      
      if (prefixA !== prefixB) {
        return prefixA === 'H' ? -1 : 1;
      }
      
      return numA - numB;
    });
    
    return index;
  } catch (error) {
    log('❌ Gagal update lexicon index:', error.message);
    return false;
  }
}

/* =========================
   FUNGSI UTAMA
========================= */

let dbQueue = null

async function main() {
  const options = parseArgs();

  log("=".repeat(60));
  log("📖 BIBLE SABDAWEB SCRAPER");
  log("=".repeat(60));

  const modeNames = {
    1: "Web → DB",
    2: "Web → JSON & DB",
    3: "Web → JSON",
    4: "JSON → DB"
  };

  log(`Mode: ${options.mode} (${modeNames[options.mode]})`);
  log(`Start: kitab ${options.start}`);
  if (options.book) log(`Single book: ${options.book}`);
  log(`Concurrency: ${options.concurrency}`);
  log(`Batch mode: ${options.batch}`);
  log(`Resume mode: ${options.resume}`);
  if (options.versions.length > 0) {
    log(`Versions filter: ${options.versions.join(', ')}`);
  }
  log("=".repeat(60));

  // Filter versi jika di-specified
  let targetVersions = BibleVersions;
  if (options.versions.length > 0) {
    targetVersions = BibleVersions.filter(v => options.versions.includes(v.id));
    if (targetVersions.length === 0) {
      log("❌ Tidak ada versi yang valid");
      return;
    }
  }

  // await createLexiconDirectories();

  // Buka koneksi database untuk mode 1, 2 & 4
  if (options.mode !== 3) {
    log("\n🚀 Opening database connection...");
    db = await openDB(DB_PATH, log, { fresh: options.fresh });
    dbQueue = new DatabaseQueue(db, 1);

    await initializeDatabase();
    await sleep(1000);
  }

  try {
    const booksToProcess = [];

    if (options.book) {
      if (options.book >= 1 && options.book <= BibleBooks.length) {
        booksToProcess.push(options.book);
      } else {
        log(`❌ Kitab ${options.book} tidak valid`);
        return;
      }
    } else if (options.batch) {
      for (let i = options.start; i <= BibleBooks.length; i++) {
        booksToProcess.push(i);
      }
    } else {
      booksToProcess.push(options.start);
    }

    log(`📋 Total kitab yang akan diproses: ${booksToProcess.length}`);

    let totalSuccess = 0;
    let totalFailed = 0;
    const allStrongs = new Set();

    for (const bookId of booksToProcess) {
      const bookName = BibleBooks[bookId - 1][0];

      log(`\n📖 ========================================`);
      log(`📖 Proses kitab ${bookId}: ${bookName}`);
      log(`📖 ========================================`);

      let success = false;

      try {
        switch (options.mode) {
          case 1:
          case 2:
          case 3:{
            const result = await processBook(bookId, options.concurrency, options.resume, options.mode, targetVersions);
            success = result.success;
            if (result.strongNumbers) {
              result.strongNumbers.forEach(s => allStrongs.add(s));
            }
            break;
          }
          case 4:
            success = await migrateJSONtoDB(bookId);
            break;

          default:
            log(`❌ Mode ${options.mode} tidak dikenali`);
            return;
        }

        if (success) {
          totalSuccess++;
        } else {
          totalFailed++;
        }

      } catch (error) {
        log(`❌ Error memproses kitab ${bookId}:`, error.message);
        totalFailed++;
      }

      logManager.update("📖 BOOK", bookId, booksToProcess.length);

      if (bookId !== booksToProcess[booksToProcess.length - 1]) {
        const delay = options.mode !== 4 ? 5000 : 2000;
        log("")
        log(`⏳ Menunggu ${delay/1000} detik sebelum kitab berikutnya...`);        
        await sleep(delay);
        // Clear progress setelah selesai
        setTimeout(() => {
          logManager.remove("🌐 Scraping"); // Perbaikan: ubah removeProgress menjadi remove
        }, 1000);
      }
    }

    // PROSES LEXICONS
    log("")
    log("🔍 Mengumpulkan Strong's numbers...");
    
    const commonStrongs = [];
    const allStrongNumbers = [...allStrongs, ...commonStrongs];
    
    if (allStrongNumbers.length > 0) {
      log("")
      log(`📚 Memproses ${allStrongNumbers.length} Strong's numbers...`);
      await processLexicons(allStrongNumbers, options.concurrency,  options.mode);
    } else {
      log("")
      log("ℹ️ Tidak ada Strong's numbers yang dikumpulkan.");
    }

    log("=".repeat(60));
    log("🎉 PROSES SELESAI!");
    log("=".repeat(60));
    log(`📊 Statistik: ${totalSuccess} kitab berhasil, ${totalFailed} kitab gagal`);
    log(`📊 Mode: ${modeNames[options.mode]}`);

    if (options.mode !== 3) {
      log(`💾 Database: ${DB_PATH}`);
      
      log("")
      log("🔄 Updating FTS tables...");
      try {
        await db.run("INSERT INTO verses_fts(verses_fts) VALUES ('rebuild')");
        log("✅ FTS tables updated");
      } catch (error) {
        log("❌ Error updating FTS:", error.message);
      }
    }

    if (options.mode === 2 || options.mode === 3) {
      log(`📁 JSON files: ${DIR}/`);      
      log(`📁 Lexicon JSON: ${DIR_LEXICON}/`);      
      log(`📁 JSON Type: ${space <= 0 ? 'MIN' : 'BEAUTY:' +space}`);
      log("=".repeat(60));
    }

  } catch (error) {
    log("")
    log("❌ Error utama:", error.message);
    log(error.stack);
  } finally {
    // Tutup koneksi database
    if (db) {
      await db.close();
    }
  }
}

// Jalankan aplikasi
if (process.argv[1] === fileURLToPath(
    import.meta.url)) {
  main().catch(console.error)
}