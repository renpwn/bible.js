import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDB as _openDB } from './setting.db.js';

let db = null;         // Global DB instance
let manualDB = false;  // Flag: apakah user membuka DB manual?

// Cache file notes in-memory
const notesCache = new Map();

function getNotesFileForBook(bookId) {
  if (notesCache.has(bookId)) return notesCache.get(bookId);
  const jsonDir = path.join(process.cwd(), 'json');
  if (!fs.existsSync(jsonDir)) {
    notesCache.set(bookId, null);
    return null;
  }
  try {
    const files = fs.readdirSync(jsonDir);
    const targetFile = files.find(f => f.startsWith(`Bible_${bookId}_`) && f.endsWith('.notes.json'));
    if (!targetFile) {
      notesCache.set(bookId, null);
      return null;
    }
    const content = JSON.parse(fs.readFileSync(path.join(jsonDir, targetFile), 'utf8'));
    notesCache.set(bookId, content);
    return content;
  } catch (_) {
    notesCache.set(bookId, null);
    return null;
  }
}

export function getVerseNotesAndRashi(bookId, chapter, verse) {
  const fileData = getNotesFileForBook(bookId);
  if (!fileData || !fileData.data) return { notes: null, rashi: null };

  const chapterData = fileData.data.find(chArr => chArr[0]?.chapter === chapter);
  if (!chapterData || !chapterData[0]?.verses) return { notes: null, rashi: null };

  const verseData = chapterData[0].verses.find(v => v.verse === verse);
  return {
    notes: verseData?.notes && Object.keys(verseData.notes).length > 0 ? verseData.notes : null,
    rashi: verseData?.rashi && verseData.rashi.length > 0 ? verseData.rashi : null
  };
}

export async function getVerseLexicon(database, bookId, chapter, verse, isNeedLexi, testament = 'OT') {
  if (!database || !isNeedLexi) return null;
  try {
    const itlRows = await database.all(`
      SELECT text FROM verses
      WHERE book_id = ? AND chapter = ? AND verse = ?
        AND version IN ('tb_itl_drf', 'tl_itl_drf', 'net')
    `, [bookId, chapter, verse]);

    if (!itlRows || itlRows.length === 0) return null;

    const strongSet = new Set();
    const isNT = testament === 'NT' || bookId >= 40;

    for (const row of itlRows) {
      const matches = row.text.match(/<(\d+)>/g);
      if (matches) {
        for (const m of matches) {
          const rawNum = m.replace(/[<>]/g, '');
          const intNum = parseInt(rawNum, 10);
          if (isNT) {
            strongSet.add(`G${intNum}`);
          } else {
            strongSet.add(`H${rawNum.padStart(5, '0')}`);
            strongSet.add(`H${intNum}`);
          }
        }
      }
    }

    if (strongSet.size === 0) return null;

    const placeholders = Array.from(strongSet).map(() => '?').join(',');
    const lexiconEntries = await database.all(`
      SELECT strong, word, pronunciation, partOfSpeech, definition, avSummary
      FROM strong_lexicon
      WHERE strong IN (${placeholders})
    `, Array.from(strongSet));

    return lexiconEntries && lexiconEntries.length > 0 ? lexiconEntries : null;
  } catch (_) {
    return null;
  }
}

export const TANAKH_SECTIONS = 
  "\n1. Torah (Taurat Musa) : Genesis (Kejadian), Exodus (Keluaran), Leviticus (Imamat), Numbers (Bilangan), Deuteronomy (Ulangan)\n" +
  "2. Nevi'im (Nabi-nabi) : Joshua (Yosua), Judges (Hakim-hakim), I Samuel (1 Samuel), II Samuel (2 Samuel), I Kings (1 Raja-raja), II Kings (2 Raja-raja), Isaiah (Yesaya), Jeremiah (Yeremia), Ezekiel (Yehezkiel), Hosea, Joel (Yoel), Amos (Amos), Obadiah (Obaja), Jonah (Yunus), Micah (Mikha), Nahum, Habakkuk (Habakuk), Zephaniah (Zefanya), Haggai (Hagai), Zechariah (Zakharia), Malachi (Maleakhi)\n" +
  "3. Ketuvim (Tulisan-tulisan / Sastra) : Psalms (Mazmur), Proverbs (Amsal), Job (Ayub), Song of Songs (Kidung Agung), Ruth (Rut), Lamentations (Ratapan), Ecclesiastes (Pengkhotbah), Esther (Ester), Daniel, Ezra, Nehemiah (Nehemia), I Chronicles (1 Tawarikh), II Chronicles (2 Tawarikh)";

export const VERSION_ALIASES = {
  tb: 'tb',
  bis: 'bis',
  bimk: 'bis',
  tl: 'tl',
  ende: 'ende',
  nwt: 'nwt',
  tdb: 'nwt',
  tb_itl_drf: 'tb_itl_drf',
  tl_itl_drf: 'tl_itl_drf',
  bbe: 'bbe',
  message: 'message',
  msg: 'message',
  nkjv: 'nkjv',
  kjv: 'nkjv',
  net: 'net',
  net2: 'net2',
  ayt: 'tb',
  fayh: 'bis',
  tsi: 'bis',
  vmd: 'bis',
  tn: 'tn',
  jb: 'tn',
  tanakh: 'tn',
  tanak: 'tn',
  jewish: 'tn',
  tn_he: 'tn_he',
  he: 'tn_he',
  hebrew: 'tn_he',
  ibrani: 'tn_he',
  tn_en: 'tn_en',
  jps: 'tn_en',
  all: 'all',
  semua: 'all'
};

export function resolveVersion(str, defaultVer = 'tb') {
  if (!str) return defaultVer;
  const lower = str.toLowerCase().trim();
  return VERSION_ALIASES[lower] || lower;
}

// Buka DB manual
export async function openDB(options = {}) {
  if (!db) {
    db = await _openDB(options);
    manualDB = true;
  }
  return db;
}

// Tutup DB manual
export async function closeDB() {
  if (db) {
    await db.close();
    db = null;
    manualDB = false;
  }
}

/* =====================================
   FUZZY MATCHING
===================================== */
function compareTwoStrings(first, second) {
  first = first.replace(/\s+/g, '').toLowerCase();
  second = second.replace(/\s+/g, '').toLowerCase();

  if (first === second) return 1;
  if (first.length < 2 || second.length < 2) return 0;

  const map = new Map();
  for (let i = 0; i < first.length - 1; i++) {
    const bg = first.substring(i, i + 2);
    map.set(bg, (map.get(bg) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < second.length - 1; i++) {
    const bg = second.substring(i, i + 2);
    const count = map.get(bg) || 0;
    if (count > 0) {
      map.set(bg, count - 1);
      intersection++;
    }
  }

  return (2 * intersection) / (first.length + second.length - 2);
}

function findBestMatch(main, targets) {
  let bestIndex = 0;
  let bestRating = 0;

  const ratings = targets.map((t, i) => {
    const rating = compareTwoStrings(main, t);
    if (rating > bestRating) {
      bestRating = rating;
      bestIndex = i;
    }
    return { target: t, rating };
  });

  return {
    all: ratings,
    indexAll: bestIndex,
    result: targets[bestIndex],
    rating: bestRating
  };
}

/* =====================================
   BOOK ALIASES & NORMALIZATION
===================================== */
const BOOK_ALIASES = {
  kej: 1, kejadian: 1, gen: 1, genesis: 1,
  kel: 2, keluaran: 2, exo: 2, exodus: 2,
  im: 3, imamat: 3, lev: 3, leviticus: 3,
  bil: 4, bilangan: 4, num: 4, numbers: 4,
  ul: 5, ulangan: 5, deu: 5, deut: 5, deuteronomy: 5,
  yos: 6, yosua: 6, jos: 6, josh: 6, joshua: 6,
  hak: 7, hakim: 7, 'hakim-hakim': 7, jdg: 7, judges: 7,
  rut: 8, ruth: 8, rth: 8,
  '1sam': 9, '1samuel': 9, '1 sam': 9, '1 samuel': 9, 'i samuel': 9, 'isamuel': 9,
  '2sam': 10, '2samuel': 10, '2 sam': 10, '2 samuel': 10, 'ii samuel': 10, 'iisamuel': 10,
  '1raj': 11, '1raja': 11, '1raja-raja': 11, '1 raj': 11, '1 raja-raja': 11, '1ki': 11, '1kings': 11,
  '2raj': 12, '2raja': 12, '2raja-raja': 12, '2 raj': 12, '2 raja-raja': 12, '2ki': 12, '2kings': 12,
  '1taw': 13, '1tawarikh': 13, '1 taw': 13, '1 tawarikh': 13, '1ch': 13, '1chronicles': 13,
  '2taw': 14, '2tawarikh': 14, '2 taw': 14, '2 tawarikh': 14, '2ch': 14, '2chronicles': 14,
  ezr: 15, ezra: 15,
  neh: 16, nehemia: 16, nehemiah: 16,
  est: 17, ester: 17, esther: 17,
  ayb: 18, ayub: 18, job: 18,
  maz: 19, mazmur: 19, psa: 19, psalm: 19, psalms: 19,
  ams: 20, amsal: 20, pro: 20, prov: 20, proverbs: 20,
  pkh: 21, pengkhotbah: 21, ecc: 21, ecclesiastes: 21,
  kid: 22, 'kidung agung': 22, 'kidung': 22, sos: 22, 'song of solomon': 22, song: 22,
  yes: 23, yesaya: 23, isa: 23, isaiah: 23,
  yer: 24, yeremia: 24, jer: 24, jeremiah: 24,
  rat: 25, ratapan: 25, lam: 25, lamentations: 25,
  yeh: 26, yehezkiel: 26, eze: 26, ezekiel: 26,
  dan: 27, daniel: 27,
  hos: 28, hosea: 28,
  yl: 29, yoel: 29, joe: 29, joel: 29,
  am: 30, amos: 30, amo: 30,
  ob: 31, obaja: 31, oba: 31, obadiah: 31,
  yun: 32, yunus: 32, jon: 32, jonah: 32,
  mik: 33, mikha: 33, mic: 33, micah: 33,
  nah: 34, nahum: 34,
  hab: 35, habakuk: 35, habakkuk: 35,
  zef: 36, zefanya: 36, zep: 36, zephaniah: 36,
  hag: 37, hagai: 37, haggai: 37,
  zak: 38, zakharia: 38, zec: 38, zechariah: 38,
  mal: 39, maleakhi: 39, malachi: 39,
  mat: 40, matius: 40, matt: 40, matthew: 40,
  mrk: 41, mar: 41, markus: 41, mark: 41,
  luk: 42, lukas: 42, luke: 42,
  yoh: 43, yohanes: 43, jhn: 43, john: 43,
  kis: 44, 'kisah para rasul': 44, 'kisah': 44, act: 44, acts: 44,
  rom: 45, roma: 45, romans: 45,
  '1kor': 46, '1korintus': 46, '1 kor': 46, '1 korintus': 46, '1co': 46, '1corinthians': 46,
  '2kor': 47, '2korintus': 47, '2 kor': 47, '2 korintus': 47, '2co': 47, '2corinthians': 47,
  gal: 48, galatia: 48, galatians: 48,
  ef: 49, efesus: 49, eph: 49, ephesians: 49,
  flp: 50, fil: 50, filipi: 50, php: 50, philippians: 50,
  kol: 51, kolose: 51, col: 51, colossians: 51,
  '1tes': 52, '1tesalonika': 52, '1 tes': 52, '1 tesalonika': 52, '1th': 52, '1thessalonians': 52,
  '2tes': 53, '2tesalonika': 53, '2 tes': 53, '2 tesalonika': 53, '2th': 53, '2thessalonians': 53,
  '1tim': 54, '1timotius': 54, '1 tim': 54, '1 timotius': 54, '1ti': 54, '1timothy': 54,
  '2tim': 55, '2timotius': 55, '2 tim': 55, '2 timotius': 55, '2ti': 55, '2timothy': 55,
  tit: 56, titus: 56,
  flm: 57, filemon: 57, phm: 57, philemon: 57,
  ibr: 58, ibrani: 58, heb: 58, hebrews: 58,
  yak: 59, yakobus: 59, jas: 59, james: 59,
  '1pet': 60, '1petrus': 60, '1 pet': 60, '1 petrus': 60, '1pe': 60, '1peter': 60,
  '2pet': 61, '2petrus': 61, '2 pet': 61, '2 petrus': 61, '2pe': 61, '2peter': 61,
  '1yoh': 62, '1yohanes': 62, '1 yoh': 62, '1 yohanes': 62, '1jn': 62, '1john': 62,
  '2yoh': 63, '2yohanes': 63, '2 yoh': 63, '2 yohanes': 63, '2jn': 63, '2john': 63,
  '3yoh': 64, '3yohanes': 64, '3 yoh': 64, '3 yohanes': 64, '3jn': 64, '3john': 64,
  yud: 65, yudas: 65, jud: 65, jude: 65,
  why: 66, wahyu: 66, rev: 66, revelation: 66
};

const normalizeName = (s) =>
  s.toLowerCase()
    .replace(/^kitab\s+/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

function resolveBookId(input, books) {
  if (!input) return null;
  const norm = normalizeName(input);

  // 1. Cek langsung di alias dictionary
  if (BOOK_ALIASES[norm]) {
    return BOOK_ALIASES[norm];
  }

  // 2. Cek apakah angka ID langsung (1 - 66)
  const num = parseInt(input, 10);
  if (!isNaN(num) && num >= 1 && num <= 66) {
    return num;
  }

  // 3. Cek di daftar kitab database
  for (const b of books) {
    if (normalizeName(b.name) === norm || (b.name_en && normalizeName(b.name_en) === norm)) {
      return b.id;
    }
  }

  // 4. Fuzzy match
  const bookNames = books.map(b => b.name);
  const match = findBestMatch(input, bookNames);
  if (match.rating >= 0.5) {
    return books[match.indexAll].id;
  }

  return null;
}

/* =====================================
   MAIN BIBLE HANDLER
===================================== */
export default async function bibleHandler(input = '', options = {}) {
  let autoClose = false;
  
  if (!manualDB && !db) {
    db = await _openDB(options);
    autoClose = true;
  }
  
  try {
    const rawInput = input.trim();
    // random default option & drf should hasplus
    const defaultVersion = options.version || ['tb','tb_itl_drf'][Math.floor(Math.random() * 2)];
    
    
    // 0. Command: RANDOM / ACAK AYAT
    // Mendukung:
    // - Tanakh / Jewish Bible: "random tn", "random jb", "random tanakh", "random 5 tn", "tn+", "jb+", "random 3 torah+"
    //   -> Mengembalikan paket tn_he + tn_en. Jika terdapat "+", menyertakan komentar Rabbi (Rashi).
    // - Bible / Alkitab: "random", "random 5", "bible+", "alkitab+", "random 3 bible+", "random nkjv+"
    //   -> Mengembalikan ayat Alkitab. Jika terdapat "+", menyertakan notes & leksikon Strong's.
    const hasPlus = rawInput.includes('+') || options.plus === true || options.commentary === true || options.notes === true || defaultVersion.includes('_');
    const cleanInput = rawInput.replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
    const randomTokens = cleanInput.toLowerCase().split(/\s+/).filter(Boolean);
    
    const hasVerseColon = /\d+:\d+/.test(cleanInput);
    const isExplicitRandom = randomTokens.includes('random') || randomTokens.includes('acak');
    const isSingleKeyword = !hasVerseColon && (
      randomTokens.length === 0 ||
      (randomTokens.length <= 3 && (
        randomTokens.includes('tanakh') || randomTokens.includes('tanak') ||
        randomTokens.includes('torah') || randomTokens.includes('neviim') || randomTokens.includes('ketuvim') ||
        randomTokens.includes('bible') || randomTokens.includes('alkitab') ||
        randomTokens.includes('tn') || randomTokens.includes('jb')
      ))
    );
    const isTanakh = randomTokens.includes('tanakh') || randomTokens.includes('tanak') ||
    randomTokens.includes('torah') || randomTokens.includes('neviim') || randomTokens.includes('ketuvim') ||
    randomTokens.includes('tn') || randomTokens.includes('jb') ||
    randomTokens.includes('tn_he') || randomTokens.includes('tn_en') ||
    options.tanakh || options.tanakh_id ||
    options.version === 'tn' || options.version === 'jb' || options.version === 'tanakh';
    const isRandom = (!cleanInput || isExplicitRandom || isSingleKeyword || options.random) && !hasVerseColon;
    const isInterlinearVersion = (ver) => ['tb_itl_drf', 'tl_itl_drf', 'net'].includes(ver);

    if (isRandom) {
      let range = options.range || 1;
      let selectedVersion = resolveVersion(options.version, defaultVersion);
      let selectedTestament = options.testament || null;
      let selectedTanakhId = options.tanakh_id || (typeof options.tanakh === 'string' ? options.tanakh : null);

      if (randomTokens.length > 0) {
        for (const tok of randomTokens) {
          if (tok === 'random' || tok === 'acak' || tok === 'bible' || tok === 'alkitab') continue;

          if (/^\d+$/.test(tok)) {
            range = parseInt(tok, 10);
          } else if (VERSION_ALIASES[tok]) {
            selectedVersion = resolveVersion(tok);
          } else if (tok === 'ot' || tok === 'pl' || tok === 'old') {
            selectedTestament = 'OT';
          } else if (tok === 'nt' || tok === 'pb' || tok === 'new') {
            selectedTestament = 'NT';
          } else if (['torah', 'neviim', 'ketuvim'].includes(tok)) {
            selectedTanakhId = tok;
          }
        }
      }

      // ==========================================
      // KASUS A: TANAKH / TORAH (tn_he + tn_en + Rashi)
      // ==========================================
      if (isTanakh) {
        let tanakhWhere = ["v.version = 'tn_he'", "b.testament = 'OT'"];
        let tanakhParams = [];

        if (selectedTanakhId) {
          tanakhWhere.push("b.tanakh_id = ?");
          tanakhParams.push(selectedTanakhId.toLowerCase());
        }

        const anchor = await db.get(`
          SELECT b.id as book_id, b.name as book_name, b.name_en as book_name_en, b.name_he as book_name_he, b.chapters, b.tanakh_id, b.testament, v.chapter, v.verse
          FROM verses v
          JOIN books b ON v.book_id = b.id
          WHERE ${tanakhWhere.join(' AND ')}
          ORDER BY RANDOM()
        `, tanakhParams);

        if (!anchor) {
          return { mode: 'random', type: 'tanakh', error: 'Tidak ada data ayat Tanakh yang ditemukan.' };
        }

        const chapterInfo = await db.get(`
          SELECT MIN(verse) as min_verse, MAX(verse) as max_verse
          FROM verses
          WHERE book_id = ? AND chapter = ? AND version = 'tn_he'
        `, [anchor.book_id, anchor.chapter]);

        const maxVerse = chapterInfo.max_verse;
        const minVerse = chapterInfo.min_verse;

        let startVerse = anchor.verse;
        let endVerse = startVerse + range - 1;

        if (endVerse > maxVerse) {
          endVerse = maxVerse;
          startVerse = Math.max(minVerse, endVerse - range + 1);
        }

        const rows = await db.all(`
          SELECT v.verse, v.version, v.text
          FROM verses v
          WHERE v.book_id = ? AND v.chapter = ? AND v.version IN ('tn_he', 'tn_en')
            AND v.verse BETWEEN ? AND ?
          ORDER BY v.verse ASC, v.version ASC
        `, [anchor.book_id, anchor.chapter, startVerse, endVerse]);

        const verseMap = new Map();
        for (let vNum = startVerse; vNum <= endVerse; vNum++) {
          verseMap.set(vNum, { verse: vNum, tn_he: '', tn_en: '' });
        }
        for (const r of rows) {
          const item = verseMap.get(r.verse);
          if (item) {
            item[r.version] = r.text;
          }
        }

        const combinedVerses = Array.from(verseMap.values()).map(v => {
          const entry = {
            verse: v.verse,
            tn_he: v.tn_he,
            tn_en: v.tn_en
          };
          if (hasPlus) {
            const notesData = getVerseNotesAndRashi(anchor.book_id, anchor.chapter, v.verse);
            entry.rashi = notesData.rashi || null;
          }
          return entry;
        });

        return {
          mode: 'random',
          type: 'tanakh',
          book: {
            id: anchor.book_id,
            name: anchor.book_name,
            name_en: anchor.book_name_en,
            name_he: anchor.book_name_he,
            tanakh_id: anchor.tanakh_id,
            chapters: anchor.chapters
          },
          chapter: anchor.chapter,
          anchor: anchor.verse,
          verseRange: startVerse === endVerse ? `${startVerse}` : `${startVerse}-${endVerse}`,
          count: combinedVerses.length,
          hasCommentary: hasPlus,
          verses: combinedVerses
        };
      }

      // ==========================================
      // KASUS B: ALL VERSIONS (random all / random 5 all+)
      // ==========================================
      if (selectedVersion === 'all') {
        const whereParts = ["v.version = 'tb'"];
        const queryParams = [];

        if (selectedTestament) {
          whereParts.push('b.testament = ?');
          queryParams.push(selectedTestament.toUpperCase());
        }
        if (selectedTanakhId) {
          whereParts.push('b.tanakh_id = ?');
          queryParams.push(selectedTanakhId.toLowerCase());
        }
        const whereSql = whereParts.join(' AND ');

        const anchor = await db.get(`
          SELECT b.id as book_id, b.name as book_name, b.name_en as book_name_en, b.chapters, b.testament, v.chapter, v.verse
          FROM verses v
          JOIN books b ON v.book_id = b.id
          WHERE ${whereSql}
          ORDER BY RANDOM()
        `, queryParams);

        if (!anchor) {
          return { mode: 'random', type: 'all_versions', error: 'Tidak ada data ayat untuk versi: all' };
        }

        const chapterInfo = await db.get(`
          SELECT MIN(verse) as min_verse, MAX(verse) as max_verse
          FROM verses
          WHERE book_id = ? AND chapter = ?
        `, [anchor.book_id, anchor.chapter]);

        const maxVerse = chapterInfo.max_verse;
        const minVerse = chapterInfo.min_verse;

        let startVerse = anchor.verse;
        let endVerse = startVerse + range - 1;

        if (endVerse > maxVerse) {
          endVerse = maxVerse;
          startVerse = Math.max(minVerse, endVerse - range + 1);
        }

        const rows = await db.all(`
          SELECT v.verse, v.version, v.text
          FROM verses v
          WHERE v.book_id = ? AND v.chapter = ?
            AND v.verse BETWEEN ? AND ?
          ORDER BY v.verse ASC, v.version ASC
        `, [anchor.book_id, anchor.chapter, startVerse, endVerse]);

        const verseMap = new Map();
        for (const r of rows) {
          if (!verseMap.has(r.verse)) {
            verseMap.set(r.verse, { verse: r.verse, versions: {} });
          }
          verseMap.get(r.verse).versions[r.version] = r.text;
        }

        const allVerses = [];
        for (const v of verseMap.values()) {
          const item = {
            verse: v.verse,
            total_versions: Object.keys(v.versions).length,
            versions: v.versions
          };
          if (hasPlus) {
            const notesData = getVerseNotesAndRashi(anchor.book_id, anchor.chapter, v.verse);
            const lexiconData = await getVerseLexicon(db, anchor.book_id, anchor.chapter, v.verse, true, anchor.testament);
            if (notesData.notes) item.notes = notesData.notes;
            if (notesData.rashi) item.rashi = notesData.rashi;
            if (lexiconData) item.lexicon = lexiconData;
          }
          allVerses.push(item);
        }

        return {
          mode: 'random',
          type: 'all_versions',
          book: {
            id: anchor.book_id,
            name: anchor.book_name,
            name_en: anchor.book_name_en,
            chapters: anchor.chapters
          },
          chapter: anchor.chapter,
          anchor: anchor.verse,
          verseRange: startVerse === endVerse ? `${startVerse}` : `${startVerse}-${endVerse}`,
          version: 'all',
          count: allVerses.length,
          hasNotes: hasPlus,
          verses: allVerses
        };
      }

      // ==========================================
      // KASUS C: BIBLE / ALKITAB (Notes + Lexicon)
      // ==========================================
      const whereParts = ['v.version = ?'];
      const queryParams = [selectedVersion];

      if (selectedTestament) {
        whereParts.push('b.testament = ?');
        queryParams.push(selectedTestament.toUpperCase());
      }
      if (selectedTanakhId) {
        whereParts.push('b.tanakh_id = ?');
        queryParams.push(selectedTanakhId.toLowerCase());
      }
      const whereSql = whereParts.join(' AND ');

      const anchor = await db.get(`
        SELECT b.id as book_id, b.name as book_name, b.name_en as book_name_en, b.chapters, b.testament, v.chapter, v.verse, v.version
        FROM verses v
        JOIN books b ON v.book_id = b.id
        WHERE ${whereSql}
        ORDER BY RANDOM()
      `, queryParams);

      if (!anchor) {
        return { mode: 'random', type: 'bible', error: `Tidak ada data ayat untuk versi: ${selectedVersion}` };
      }

      const chapterInfo = await db.get(`
        SELECT MIN(verse) as min_verse, MAX(verse) as max_verse
        FROM verses
        WHERE book_id = ? AND chapter = ? AND version = ?
      `, [anchor.book_id, anchor.chapter, selectedVersion]);

      const maxVerse = chapterInfo.max_verse;
      const minVerse = chapterInfo.min_verse;

      let startVerse = anchor.verse;
      let endVerse = startVerse + range - 1;

      if (endVerse > maxVerse) {
        endVerse = maxVerse;
        startVerse = Math.max(minVerse, endVerse - range + 1);
      }

      const rangeVerses = await db.all(`
        SELECT v.verse, v.text, v.version
        FROM verses v
        WHERE v.book_id = ? AND v.chapter = ? AND v.version = ?
          AND v.verse BETWEEN ? AND ?
        ORDER BY v.verse ASC
      `, [anchor.book_id, anchor.chapter, selectedVersion, startVerse, endVerse]);

      // Enrich with Notes & Lexicon jika terdapat flag '+'
      const enrichedVerses = [];
      for (const v of rangeVerses) {
        const item = {
          verse: v.verse,
          text: v.text,
          version: v.version
        };
        if (hasPlus) {
          const notesData = getVerseNotesAndRashi(anchor.book_id, anchor.chapter, v.verse);
          const lexiconData = await getVerseLexicon(db, anchor.book_id, anchor.chapter, v.verse, isInterlinearVersion(v.version || selectedVersion), anchor.testament);
          if (notesData.notes) item.notes = notesData.notes;
          if (lexiconData) item.lexicon = lexiconData;
        }
        enrichedVerses.push(item);
      }

      return {
        mode: 'random',
        type: 'bible',
        book: {
          id: anchor.book_id,
          name: anchor.book_name,
          name_en: anchor.book_name_en,
          chapters: anchor.chapters
        },
        chapter: anchor.chapter,
        anchor: anchor.verse,
        verseRange: startVerse === endVerse ? `${startVerse}` : `${startVerse}-${endVerse}`,
        version: selectedVersion,
        count: enrichedVerses.length,
        hasNotes: hasPlus,
        verses: enrichedVerses
      };
    }

    // 1. Command: LIST / KITAB (Daftar semua kitab)
    if (rawInput.toLowerCase() === 'list' || rawInput.toLowerCase() === 'kitab') {
      const books = await db.all(`SELECT id, name, name_en, chapters, total_verses, pericopes, testament FROM books ORDER BY id`);
      return {
        mode: 'list_books',
        total: books.length,
        books
      };
    }

    // 2. Command: VERSIONS / VERSI (Daftar versi Alkitab)
    if (rawInput.toLowerCase() === 'versions' || rawInput.toLowerCase() === 'versi') {
      const versions = await db.all(`SELECT id, name, language, category, supports_strong FROM versions ORDER BY id`);
      return {
        mode: 'list_versions',
        total: versions.length,
        versions
      };
    }

    // 3. Command: STRONG / LEXICON (contoh: "strong:H7225" atau "H7225" / "G746")
    const strongMatch = rawInput.match(/^(?:strong:)?([HG]\d+)$/i);
    if (strongMatch) {
      const strongId = strongMatch[1].toUpperCase();
      const lexicon = await db.get(`SELECT * FROM strong_lexicon WHERE strong = ?`, [strongId]);
      if (lexicon) {
        return {
          mode: 'lexicon',
          data: lexicon
        };
      }
      return {
        mode: 'lexicon',
        error: `Strong number ${strongId} tidak ditemukan.`
      };
    }

    // 4. Command: SEARCH (pencarian kata di ayat)
    const isExplicitSearch = rawInput.toLowerCase().startsWith('search:') || rawInput.toLowerCase().startsWith('cari:');
    if (isExplicitSearch || options.search) {
      const query = isExplicitSearch ? rawInput.replace(/^(search|cari):/i, '').trim() : rawInput;
      const targetVersion = options.version || defaultVersion;
      const limit = options.limit || 20;

      // Coba pencarian via FTS5 jika tersedia, fallback ke LIKE
      let rows = [];
      try {
        rows = await db.all(`
          SELECT b.id as book_id, b.name as book_name, v.chapter, v.verse, v.version, v.text
          FROM verses_fts f
          JOIN books b ON f.book_id = b.id
          JOIN verses v ON v.book_id = f.book_id AND v.chapter = f.chapter AND v.verse = f.verse AND v.version = f.version
          WHERE verses_fts MATCH ? AND f.version = ?
          LIMIT ?
        `, [query, targetVersion, limit]);
      } catch (_) {
        rows = await db.all(`
          SELECT b.id as book_id, b.name as book_name, v.chapter, v.verse, v.version, v.text
          FROM verses v
          JOIN books b ON v.book_id = b.id
          WHERE v.version = ? AND v.text LIKE ?
          ORDER BY b.id, v.chapter, v.verse
          LIMIT ?
        `, [targetVersion, `%${query}%`, limit]);
      }

      return {
        mode: 'search',
        query,
        version: targetVersion,
        totalResults: rows.length,
        results: rows
      };
    }

    // 5. PARSE AYAT REFERENCE (contoh: "Yohanes 3:16", "Kejadian 1:1-5", "1 Kor 13:4-7 tb", "Mazmur 23", "Kejadian 1:1+", "Kej 1:1 tn", "Gen 1:1 jb+")
    const books = await db.all(`SELECT id, name, name_en, name_he, tanakh_id, chapters, total_verses, testament FROM books ORDER BY id`);
    
    // Ekstrak versi di akhir jika ada (misal: "Yoh 3:16 nkjv", "Kej 1:1 tn", "Kej 1:1 jb+")
    let workingStr = cleanInput;
    let selectedVersion = defaultVersion;
    const tokens = workingStr.split(/\s+/);
    const lastToken = tokens[tokens.length - 1]?.toLowerCase();
    
    if (tokens.length > 1 && VERSION_ALIASES[lastToken]) {
      selectedVersion = resolveVersion(lastToken, defaultVersion);
      workingStr = tokens.slice(0, -1).join(' ');
    }

    // Pola regex: [Nama Kitab] [Pasal](:[Ayat_Mulai](-[Ayat_Selesai])?)?
    // Contoh: "1 Korintus 13:4-7", "Yohanes 3:16", "Kejadian 1", "Mazmur 23:1-6"
    const refMatch = workingStr.match(/^((?:\d\s+)?[a-zA-Z\-]+)\s*(\d+)?(?::(\d+)(?:-(\d+))?)?$/i);

    if (refMatch) {
      const rawBookName = refMatch[1];
      const chapterNum = refMatch[2] ? parseInt(refMatch[2], 10) : 1;
      const startVerse = refMatch[3] ? parseInt(refMatch[3], 10) : null;
      const endVerse = refMatch[4] ? parseInt(refMatch[4], 10) : startVerse;

      const bookId = resolveBookId(rawBookName, books);

      if (bookId) {
        const bookInfo = books.find(b => b.id === bookId);

        // KASUS 1: Versi Tanakh / Jewish Bible (tn / jb / tn_he / tn_en)
        if (selectedVersion === 'tn' || selectedVersion === 'tn_he' || selectedVersion === 'tn_en') {
          // Validasi: Tanakh hanya mencakup 39 kitab Perjanjian Lama
          if (bookInfo.testament === 'NT' || bookId > 39) {
            return {
              mode: 'not_found',
              type: 'tanakh',
              query: cleanInput,
              error: `Kitab "${bookInfo.name}" (Perjanjian Baru) tidak termasuk dalam Tanakh / Kitab Suci Ibrani (Jewish Bible).`,
              message: 'Tanakh hanya mencakup 39 kitab Perjanjian Lama yang terbagi menjadi 3 bagian: ' + TANAKH_SECTIONS
            };
          }

          if (selectedVersion === 'tn') {
            let sql = `
              SELECT v.verse, v.version, v.text
              FROM verses v
              WHERE v.book_id = ? AND v.chapter = ? AND v.version IN ('tn_he', 'tn_en')
            `;
            const params = [bookId, chapterNum];
            if (startVerse && endVerse) {
              sql += ` AND v.verse BETWEEN ? AND ? ORDER BY v.verse ASC, v.version ASC`;
              params.push(startVerse, endVerse);
            } else if (startVerse) {
              sql += ` AND v.verse = ? ORDER BY v.verse ASC, v.version ASC`;
              params.push(startVerse);
            } else {
              sql += ` ORDER BY v.verse ASC, v.version ASC`;
            }

            const rows = await db.all(sql, params);
            const minV = startVerse || (rows.length > 0 ? rows[0].verse : 1);
            const maxV = endVerse || (rows.length > 0 ? rows[rows.length - 1].verse : minV);

            const verseMap = new Map();
            for (let vNum = minV; vNum <= maxV; vNum++) {
              verseMap.set(vNum, { verse: vNum, tn_he: '', tn_en: '' });
            }
            for (const r of rows) {
              const item = verseMap.get(r.verse);
              if (item) item[r.version] = r.text;
            }

            const combinedVerses = Array.from(verseMap.values()).map(v => {
              const entry = {
                verse: v.verse,
                tn_he: v.tn_he,
                tn_en: v.tn_en
              };
              if (hasPlus) {
                const notesData = getVerseNotesAndRashi(bookId, chapterNum, v.verse);
                if (notesData.rashi) entry.rashi = notesData.rashi;
              }
              return entry;
            });

            return {
              mode: 'verse',
              type: 'tanakh',
              book: {
                id: bookInfo.id,
                name: bookInfo.name,
                name_en: bookInfo.name_en,
                name_he: bookInfo.name_he,
                tanakh_id: bookInfo.tanakh_id,
                chapters: bookInfo.chapters
              },
              chapter: chapterNum,
              verseRange: startVerse ? (endVerse && endVerse !== startVerse ? `${startVerse}-${endVerse}` : `${startVerse}`) : 'all',
              version: 'tn',
              count: combinedVerses.length,
              hasCommentary: hasPlus,
              verses: combinedVerses
            };
          }
        }

        // KASUS 2: Versi 'all' -> Mengembalikan semua versi Alkitab & Tanakh yang tersedia
        if (selectedVersion === 'all') {
          let sql = `
            SELECT v.verse, v.version, v.text
            FROM verses v
            WHERE v.book_id = ? AND v.chapter = ?
          `;
          const params = [bookId, chapterNum];
          if (startVerse && endVerse) {
            sql += ` AND v.verse BETWEEN ? AND ? ORDER BY v.verse ASC, v.version ASC`;
            params.push(startVerse, endVerse);
          } else if (startVerse) {
            sql += ` AND v.verse = ? ORDER BY v.verse ASC, v.version ASC`;
            params.push(startVerse);
          } else {
            sql += ` ORDER BY v.verse ASC, v.version ASC`;
          }

          const rows = await db.all(sql, params);
          const verseMap = new Map();
          for (const r of rows) {
            if (!verseMap.has(r.verse)) {
              verseMap.set(r.verse, { verse: r.verse, versions: {} });
            }
            verseMap.get(r.verse).versions[r.version] = r.text;
          }

          const allVerses = [];
          for (const v of verseMap.values()) {
            const item = {
              verse: v.verse,
              total_versions: Object.keys(v.versions).length,
              versions: v.versions
            };
            if (hasPlus) {
              const notesData = getVerseNotesAndRashi(bookId, chapterNum, v.verse);
              const lexiconData = await getVerseLexicon(db, bookId, chapterNum, v.verse, true, bookInfo.testament);
              if (notesData.notes) item.notes = notesData.notes;
              if (notesData.rashi) item.rashi = notesData.rashi;
              if (lexiconData) item.lexicon = lexiconData;
            }
            allVerses.push(item);
          }

          return {
            mode: 'verse',
            type: 'all_versions',
            book: {
              id: bookInfo.id,
              name: bookInfo.name,
              name_en: bookInfo.name_en,
              chapters: bookInfo.chapters
            },
            chapter: chapterNum,
            verseRange: startVerse ? (endVerse && endVerse !== startVerse ? `${startVerse}-${endVerse}` : `${startVerse}`) : 'all',
            version: 'all',
            count: allVerses.length,
            hasNotes: hasPlus,
            verses: allVerses
          };
        }

        // KASUS 3: Versi Alkitab standar (tb, nkjv, ende, bbe, bis, tl, nwt, net, tn_he, tn_en, dll.)
        let sql = `
          SELECT v.verse, v.text, v.version
          FROM verses v
          WHERE v.book_id = ? AND v.chapter = ? AND v.version = ?
        `;
        const params = [bookId, chapterNum, selectedVersion];

        if (startVerse && endVerse) {
          sql += ` AND v.verse BETWEEN ? AND ? ORDER BY v.verse ASC`;
          params.push(startVerse, endVerse);
        } else if (startVerse) {
          sql += ` AND v.verse = ? ORDER BY v.verse ASC`;
          params.push(startVerse);
        } else {
          sql += ` ORDER BY v.verse ASC`;
        }

        const verses = await db.all(sql, params);

        let enrichedVerses = verses;
        if (hasPlus) {
          enrichedVerses = [];
          const isTanakhSingle = selectedVersion === 'tn_he' || selectedVersion === 'tn_en';
          for (const v of verses) {
            const item = { ...v };
            if (isTanakhSingle) {
              const notesData = getVerseNotesAndRashi(bookId, chapterNum, v.verse);
              if (notesData.rashi) item.rashi = notesData.rashi;
            } else {
              const notesData = getVerseNotesAndRashi(bookId, chapterNum, v.verse);
              const lexiconData = await getVerseLexicon(db, bookId, chapterNum, v.verse, isInterlinearVersion(selectedVersion), bookInfo.testament);
              if (notesData.notes) item.notes = notesData.notes;
              if (lexiconData) item.lexicon = lexiconData;
            }
            enrichedVerses.push(item);
          }
        }

        return {
          mode: 'verse',
          book: {
            id: bookInfo.id,
            name: bookInfo.name,
            name_en: bookInfo.name_en,
            chapters: bookInfo.chapters
          },
          chapter: chapterNum,
          verseRange: startVerse ? (endVerse && endVerse !== startVerse ? `${startVerse}-${endVerse}` : `${startVerse}`) : 'all',
          version: selectedVersion,
          count: enrichedVerses.length,
          hasNotes: hasPlus,
          verses: enrichedVerses
        };
      }
    }


    // 6. Jika tidak cocok format referensi kitab & panjang input cukup panjang, jalankan pencarian teks
    if (rawInput.length >= 3) {
      const rows = await db.all(`
        SELECT b.id as book_id, b.name as book_name, v.chapter, v.verse, v.version, v.text
        FROM verses v
        JOIN books b ON v.book_id = b.id
        WHERE v.version = ? AND v.text LIKE ?
        ORDER BY b.id, v.chapter, v.verse
        LIMIT 20
      `, [selectedVersion, `%${rawInput}%`]);

      if (rows.length > 0) {
        return {
          mode: 'search',
          query: rawInput,
          version: selectedVersion,
          totalResults: rows.length,
          results: rows
        };
      }
    }

    return {
      mode: 'not_found',
      query: rawInput,
      message: `Format referensi atau data Alkitab tidak ditemukan untuk: "${rawInput}"`
    };

  } finally {
    if (autoClose && db) {
      await db.close();
      db = null;
    }
  }
}

// Support direct CLI execution: node index.js [query]
if (process.argv[1] && (
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
  process.argv[1].endsWith('index.js') ||
  process.argv[1].endsWith('index')
)) {
  const query = process.argv.slice(2).join(' ') || 'random';
  bibleHandler(query)
    .then((res) => {
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error:', err.message);
      process.exit(1);
    });
}