import { openDB as _openDB } from './setting.db.js';

let db = null;         // global DB instance
let manualDB = false;  // flag: apakah user membuka DB manual?

// Buka DB manual
export async function openDB() {
  if (!db) {
    db = await _openDB();
    manualDB = true; // user harus menutup
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
   FUZZY CORE (DRY – SINGLE SOURCE)
===================================== */
function compareTwoStrings(first, second) {
  first = first.replace(/\s+/g, '')
  second = second.replace(/\s+/g, '')

  if (first === second) return 1
  if (first.length < 2 || second.length < 2) return 0

  const map = new Map()
  for (let i = 0; i < first.length - 1; i++) {
    const bg = first.substring(i, i + 2)
    map.set(bg, (map.get(bg) || 0) + 1)
  }

  let intersection = 0
  for (let i = 0; i < second.length - 1; i++) {
    const bg = second.substring(i, i + 2)
    const count = map.get(bg) || 0
    if (count > 0) {
      map.set(bg, count - 1)
      intersection++
    }
  }

  return (2 * intersection) / (first.length + second.length - 2)
}

function correct(main, targets) {
  let bestIndex = 0
  let bestRating = 0

  const ratings = targets.map((t, i) => {
    const rating = compareTwoStrings(main, t)
    if (rating > bestRating) {
      bestRating = rating
      bestIndex = i
    }
    return { target: t, rating }
  })

  return {
    all: ratings,
    indexAll: bestIndex,
    result: ratings[bestIndex]?.target,
    rating: ratings[bestIndex]?.rating || 0
  }
}

/* =====================================
   UTIL
===================================== */
const normalizeSurah = s =>
  s.toLowerCase()
    .replace(/^al\s+/i, '')
    .replace(/[^a-z]/g, '')

const parseAyatRange = (input, maxAyat) => {
  const MAX = 5

  if (!input) {
    const r = Math.floor(Math.random() * maxAyat) + 1
    return { start: r, end: r }
  }

  if (input.includes('-')) {
    let [s, e] = input.split('-').map(Number)
    s = Math.max(1, Math.min(s, maxAyat))
    e = Math.min(maxAyat, e || maxAyat)
    if (e - s + 1 > MAX) e = s + MAX - 1
    return { start: s, end: e }
  }

  const a = Math.max(1, Math.min(Number(input), maxAyat))
  return { start: a, end: a }
}

/* =====================================
   MAIN HANDLER (DB ONLY)
===================================== */
export default async function alquranHandler(input = '', options = {}) {
  let autoClose = false;

  // kalau manualDB belum dibuka, buka sendiri
    if (!manualDB) {
      db = await _openDB(); // buka DB sementara
      autoClose = true;           // tandai untuk ditutup di akhir
    }
  // }


  /* ========= TAFSIR ========= */
  const availableTafsirs = [
    'kemenag_ringkas',
    'kemenag',
    'ibnu_katsir',
    'jalalain',
    'quraish_shihab'
  ]
  const tafsir =
    options.tafsir ||
    availableTafsirs[Math.floor(Math.random() * availableTafsirs.length)]
  
  const normalizeSearch = s =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()

  /* ========= LOAD SURAH LIST ========= */
  const surahs = await db.all(`
    SELECT no, name, id, ayat
    FROM surahs
    ORDER BY no
  `)

  const surahNames = surahs.map(s => normalizeSurah(s.name))

  input = input.trim().replace(':', ' ')
  const parts = input.split(/\s+/).filter(Boolean)

  let surahNum
  let ayatInput
  let debug = null

  /* ========= PARSE INPUT ========= */
  if (!parts.length) {
    surahNum = Math.floor(Math.random() * 114) + 1
  }
  else if (!isNaN(parts[0])) {
    surahNum = Number(parts[0])
    ayatInput = parts[1]
  }else if (parts[0].toLowerCase() === 'list') {
    const list = await db.all(`SELECT * FROM surahs`)
    return {
      mode: 'list',
      surahs: list
    }
  }
  else {
    const last = parts[parts.length - 1]
    const isAyat = !isNaN(last) || last.includes('-')

    // ===============================
    // TEXT SEARCH MODE
    // ===============================
    
    if (parts.length >= 1 && input.length >= 7) {
      const keyword = `%${input}%`

      const rows = await db.all(
        `
        WITH surah_offset AS (
          SELECT
            no,
            COALESCE(
              (SELECT SUM(ayat) FROM surahs s2 WHERE s2.no < s1.no),
              0
            ) AS offset
          FROM surahs s1
        )
        SELECT
          s.no   AS surahNumber,
          s.name AS surah,
          a.ayat,
          a.text_ar,
          a.text_latin,

          -- 🔥 nomor audio global
          so.offset + a.ayat AS noAudio,

          -- translations
          COALESCE(
            MAX(CASE WHEN tr.lang = 'id' THEN tr.text END),
            MAX(CASE WHEN tr2.lang = 'id' THEN tr2.text END)
          ) AS id,
          COALESCE(
            MAX(CASE WHEN tr.lang = 'en' THEN tr.text END),
            MAX(CASE WHEN tr2.lang = 'en' THEN tr2.text END)
          ) AS en,

          -- tafsir          
          t.text AS tafsir
          -- MAX(CASE WHEN t.kitab = 'kemenag' THEN t.text END) AS kemenag,
          -- MAX(CASE WHEN t.kitab = 'kemenag_ringkas' THEN t.text END) AS kemenag_ringkas,
          -- MAX(CASE WHEN t.kitab = 'jalalain' THEN t.text END) AS jalalain,
          -- MAX(CASE WHEN t.kitab = 'ibnu_katsir' THEN t.text END) AS ibnu_katsir,
          -- MAX(CASE WHEN t.kitab = 'quraish_shihab' THEN t.text END) AS quraish_shihab,
          -- MAX(CASE WHEN t.kitab = 'saadi' THEN t.text END) AS saadi

        FROM ayahs a
        JOIN surahs s ON s.no = a.surah_id
        JOIN surah_offset so ON so.no = s.no

        JOIN translations tr
          ON tr.ayah_id = a.id
        AND tr.lang IN ('id','en')

        LEFT JOIN translations tr2
          ON tr2.ayah_id = a.id
        AND tr2.lang IN ('id','en')

        LEFT JOIN tafsirs t
          ON t.ayah_id = a.id
        AND t.kitab = ?

        -- LEFT JOIN tafsirs t
        --   ON t.ayah_id = a.id
        -- AND t.kitab IN (
        --   'kemenag',
        --   'kemenag_ringkas',
        --   'jalalain',
        --   'ibnu_katsir',
        --   'quraish_shihab',
        --   'saadi'
        -- )

        WHERE
          (a.text_latin LIKE ?
          OR a.text_ar LIKE ?
          OR tr.text LIKE ?)

        GROUP BY a.id
        ORDER BY s.no, a.ayat
        LIMIT 5;
        `,
        [tafsir, keyword, keyword, keyword]
      )

      if(rows.length>=1) {
        return {
          mode: 'search',
          query: input,
          tafsir,
          total: rows.length,
          results: rows.map(r => ({
            surah: r.surah,
            ayah: r.ayat,
            surahNumber: r.surahNumber,
            arab: r.text_ar,
            latin: r.text_latin,
            id: r.id,
            en: r.en,
            tafsir: r.tafsir,            
            noAudio: r.noAudio,
            audioUrl: `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${r.noAudio}.mp3`
            // kemenag: r.kemenag,
            // kemenag_ringkas: r.kemenag_ringkas,
            // jalalain: r.jalalain,
            // ibnu_katsir: r.ibnu_katsir,
            // quraish_shihab: r.quraish_shihab,
            // saadi: r.saadi
          }))
        }
      }
    }

    // ===============================
    // DEFAULT SURAH GUESS (existing)
    // ===============================

    const surahName = isAyat
      ? parts.slice(0, -1).join(' ')
      : parts.join(' ')

    if (isAyat) ayatInput = last

    const raw = normalizeSurah(surahName)
    const guess = correct(raw, surahNames)

    debug = {
      input: raw,
      bestMatch: guess.result,
      rating: Number(guess.rating.toFixed(3)),
      top5: guess.all
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)
        .map(x => ({
          surah: surahs[surahNames.indexOf(x.target)]?.name,
          rating: Number(x.rating.toFixed(3))
        }))
    }

    surahNum =
      guess.rating < 0.25
        ? Math.floor(Math.random() * 114) + 1
        : guess.indexAll + 1
  }

  console.log('Surah number out of range, selecting random surah:', surahNum, debug, surahs[surahNum - 1])
  if (surahNum < 1 || surahNum > 114) {
    surahNum = Math.floor(Math.random() * 114) + 1
  }

  const surah = surahs[surahNum - 1]
  if (!surah) throw new Error('Surah not found')

  const { start, end } = parseAyatRange(ayatInput, surah.ayat)

  /* ========= AUDIO OFFSET ========= */
  const offsetRow = await db.get(
    `SELECT SUM(ayat) AS total FROM surahs WHERE no < ?`,
    [surahNum]
  )
  const offset = offsetRow?.total || 0

  /* ========= AYAH QUERY ========= */
  const ayahs = await db.all(
    `
    WITH surah_offset AS (
      SELECT
        no,
        COALESCE(
          (SELECT SUM(ayat) FROM surahs s2 WHERE s2.no < s1.no),
          0
        ) AS offset
      FROM surahs s1
    )
    SELECT
      a.id,
      a.ayat,
      a.text_ar,
      a.text_latin,

      -- translations
      MAX(CASE WHEN tr.lang = 'id' THEN tr.text END) AS id,
      MAX(CASE WHEN tr.lang = 'en' THEN tr.text END) AS en,

      t.text AS tafsir,
      so.offset + a.ayat AS noAudio
    FROM ayahs a   
    JOIN surahs s ON s.no = a.surah_id
    JOIN surah_offset so ON so.no = s.no

    JOIN translations tr
      ON tr.ayah_id = a.id
    AND tr.lang IN ('id','en')

    LEFT JOIN tafsirs t
      ON t.ayah_id = a.id
     AND t.kitab = ?
    WHERE a.surah_id = ?
      AND a.ayat BETWEEN ? AND ?
    ORDER BY a.ayat
    `,
    [tafsir, surahNum, start, end]
  )

  const resultAyahs = ayahs.map((a, i) => {
    // const noAudio = offset + start + i
    return {
      ayah: a.ayat,
      arab: a.text_ar,
      transliterasi: a.text_latin,
      id: a.id,
      en: a.en,
      tafsir: a.tafsir || null,
      noAudio: a.noAudio,
      audioUrl: `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${a.noAudio}.mp3`
    }
  })
  
  // ==== AUTO CLOSE jika dibuka sendiri ====
  if (autoClose) {
    await db.close();
  }

  return {
    mode: 'default',
    surahNumber: surahNum,
    surah: surah.name,
    arti: surah.id,
    range: start === end ? `${start}` : `${start}-${end}`,
    totalAyat: surah.ayat,
    tafsir,
    ayahs: resultAyahs,
    debug
  }
}