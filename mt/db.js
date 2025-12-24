import Database from '@renpwn/termux-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const DEFAULT_DB = './bible.db' // Ganti dari quran.db ke bible.db

export async function openDB(dbFile = DEFAULT_DB) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  // Gunakan path absolut
  const dbPath = path.resolve(process.cwd(), dbFile)

  // ✅ Pastikan folder ada
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
    console.log('📁 Created DB directory:', dbDir)
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
  // TEST KONEKSI
  // ===============================
  try {
    await db.exec('SELECT 1')
    console.log('✅ Database connection OK')
  } catch (e) {
    throw new Error('Database open failed: ' + e.message)
  }

  // ===============================
  // INIT SCHEMA UNTUK ALKITAB
  // ===============================
  console.log('📊 Initializing Bible schema...')

  const schemaSQL = `
  -- Enable foreign keys and WAL mode for better performance
  PRAGMA foreign_keys = ON;
  -- PRAGMA journal_mode = WAL;
  -- PRAGMA synchronous = NORMAL;
  -- PRAGMA cache_size = -10000; -- 10MB cache

  -- Tabel untuk versi Alkitab (TB, BIS, TL, dll)
  CREATE TABLE IF NOT EXISTS versions (
    id TEXT PRIMARY KEY,           -- kode singkat: tb, bis, tl, etc
    name TEXT NOT NULL,            -- nama lengkap versi
    language TEXT NOT NULL,        -- id, en, etc
    category TEXT,                 -- core, global, advance
    supports_strong INTEGER DEFAULT 0, -- 1 jika mendukung Strong's numbers
    is_default INTEGER DEFAULT 0,  -- 1 untuk versi default (TB)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabel untuk kitab-kitab (Kejadian, Keluaran, ...)
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY,        -- 1-66
    name TEXT NOT NULL,            -- Nama kitab
    name_short TEXT,               -- Singkatan (optional)
    chapters INTEGER NOT NULL,     -- Jumlah pasal
    total_verses INTEGER NOT NULL, -- Total ayat
    pericopes INTEGER,             -- Jumlah perikop
    testament TEXT CHECK(testament IN ('OT', 'NT')), -- Perjanjian Lama/Baru
    position INTEGER,              -- Urutan dalam Alkitab
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabel utama untuk ayat-ayat
  CREATE TABLE IF NOT EXISTS verses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    version TEXT NOT NULL,         -- tb, bis, tl, etc
    text TEXT NOT NULL,            -- Teks ayat
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (version) REFERENCES versions(id) ON DELETE CASCADE,
    UNIQUE(book_id, chapter, verse, version) -- Mencegah duplikat
  );

  -- Tabel untuk kata-kata interlinear (versi interlinear saja)
  CREATE TABLE IF NOT EXISTS interlinear_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    position INTEGER NOT NULL,     -- Urutan kata dalam ayat (1,2,3,...)
    version TEXT NOT NULL,         -- tb_itl_drf, tl_itl_drf, etc
    _word TEXT NOT NULL,           -- Kata asli (dari teks)
    strong TEXT,                   -- Strong's number (H7225, G746)
    lemma TEXT,                    -- Lemma/akar kata
    translit TEXT,                 -- Transliterasi
    morphology TEXT,               -- Info morfologi
    gloss TEXT,                    -- Terjemahan kata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (version) REFERENCES versions(id) ON DELETE CASCADE
  );

  -- Tabel leksikon Strong's numbers
  CREATE TABLE IF NOT EXISTS strong_lexicon (
    strong TEXT PRIMARY KEY,       -- Format: H7225, G746
    language TEXT NOT NULL,        -- hebrew/greek
    lemma TEXT,                    -- Kata Ibrani/Yunani asli
    translit TEXT,                 -- Transliterasi
    definition TEXT,               -- Definisi lengkap
    phonetic TEXT,                 -- Pengucapan
    pronunciation TEXT,            -- Cara baca
    part_of_speech TEXT,           -- Jenis kata (noun, verb, etc)
    etymology TEXT,                -- Asal kata
    av_summary TEXT,               -- Penggunaan dalam AV/KJV
    occurrence INTEGER DEFAULT 0,  -- Jumlah kemunculan
    source TEXT,                   -- Sumber (TWOT, etc)
    strong_reference TEXT,         -- Referensi ke Strong lain
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (strong_reference) REFERENCES strong_lexicon(strong)
  );

  -- Tabel perikop (opsional, untuk struktur pembagian)
  CREATE TABLE IF NOT EXISTS pericopes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    start_chapter INTEGER NOT NULL,
    start_verse INTEGER NOT NULL,
    end_chapter INTEGER NOT NULL,
    end_verse INTEGER NOT NULL,
    title TEXT NOT NULL,           -- Judul perikop
    subtitle TEXT,                 -- Subjudul (opsional)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  -- Tabel pencarian silang (cross-references)
  CREATE TABLE IF NOT EXISTS cross_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_book_id INTEGER NOT NULL,
    source_chapter INTEGER NOT NULL,
    source_verse INTEGER NOT NULL,
    target_book_id INTEGER NOT NULL,
    target_chapter INTEGER NOT NULL,
    target_verse INTEGER NOT NULL,
    strength INTEGER DEFAULT 1,    -- 1=weak, 2=medium, 3=strong
    type TEXT,                     -- quotation, allusion, theme, etc
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_book_id) REFERENCES books(id),
    FOREIGN KEY (target_book_id) REFERENCES books(id)
  );
  `

  const ftsSQL = `
  -- FTS5 TABLES untuk pencarian cepat
  -- Teks ayat (semua versi)
  CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(
    book_id, chapter, verse, version, text,
    content='verses',
    content_rowid='id',
    tokenize='porter unicode61'
  );

  -- Leksikon Strong's
  CREATE VIRTUAL TABLE IF NOT EXISTS strong_lexicon_fts USING fts5(
    strong, lemma, translit, definition,
    content='strong_lexicon',
    content_rowid='rowid',
    tokenize='porter unicode61'
  );

  -- Pencarian interlinear
  CREATE VIRTUAL TABLE IF NOT EXISTS interlinear_fts USING fts5(
    book_id, chapter, verse, _word, strong, lemma,
    content='interlinear_words',
    content_rowid='id',
    tokenize='porter unicode61'
  );
  `

  const indexSQL = `
  -- INDEXES untuk performa query
  CREATE INDEX IF NOT EXISTS idx_verses_book_chapter_verse 
    ON verses(book_id, chapter, verse);

  CREATE INDEX IF NOT EXISTS idx_verses_version 
    ON verses(version);

  CREATE INDEX IF NOT EXISTS idx_verses_text_search 
    ON verses(book_id, version, text COLLATE NOCASE);

  CREATE INDEX IF NOT EXISTS idx_interlinear_ref 
    ON interlinear_words(book_id, chapter, verse, version);

  CREATE INDEX IF NOT EXISTS idx_interlinear_strong 
    ON interlinear_words(strong) WHERE strong IS NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_strong_language 
    ON strong_lexicon(language);

  CREATE INDEX IF NOT EXISTS idx_pericopes_book 
    ON pericopes(book_id, start_chapter, start_verse);

  CREATE INDEX IF NOT EXISTS idx_cross_references_source 
    ON cross_references(source_book_id, source_chapter, source_verse);

  CREATE INDEX IF NOT EXISTS idx_cross_references_target 
    ON cross_references(target_book_id, target_chapter, target_verse);
  `

  const triggerSQL = `
  -- TRIGGERS untuk mengupdate FTS tables
  -- Verses FTS
  CREATE TRIGGER IF NOT EXISTS verses_ai AFTER INSERT ON verses BEGIN
    INSERT INTO verses_fts(rowid, book_id, chapter, verse, version, text)
    VALUES (new.id, new.book_id, new.chapter, new.verse, new.version, new.text);
  END;

  CREATE TRIGGER IF NOT EXISTS verses_ad AFTER DELETE ON verses BEGIN
    INSERT INTO verses_fts(verses_fts, rowid, book_id, chapter, verse, version, text)
    VALUES('delete', old.id, old.book_id, old.chapter, old.verse, old.version, old.text);
  END;

  CREATE TRIGGER IF NOT EXISTS verses_au AFTER UPDATE ON verses BEGIN
    INSERT INTO verses_fts(verses_fts, rowid, book_id, chapter, verse, version, text)
    VALUES('delete', old.id, old.book_id, old.chapter, old.verse, old.version, old.text);
    INSERT INTO verses_fts(rowid, book_id, chapter, verse, version, text)
    VALUES (new.id, new.book_id, new.chapter, new.verse, new.version, new.text);
  END;

  -- Strong Lexicon FTS
  CREATE TRIGGER IF NOT EXISTS strong_lexicon_ai AFTER INSERT ON strong_lexicon BEGIN
    INSERT INTO strong_lexicon_fts(rowid, strong, lemma, translit, definition)
    VALUES (new.rowid, new.strong, new.lemma, new.translit, new.definition);
  END;

  CREATE TRIGGER IF NOT EXISTS strong_lexicon_ad AFTER DELETE ON strong_lexicon BEGIN
    INSERT INTO strong_lexicon_fts(strong_lexicon_fts, rowid, strong, lemma, translit, definition)
    VALUES('delete', old.rowid, old.strong, old.lemma, old.translit, old.definition);
  END;

  CREATE TRIGGER IF NOT EXISTS strong_lexicon_au AFTER UPDATE ON strong_lexicon BEGIN
    INSERT INTO strong_lexicon_fts(strong_lexicon_fts, rowid, strong, lemma, translit, definition)
    VALUES('delete', old.rowid, old.strong, old.lemma, old.translit, old.definition);
    INSERT INTO strong_lexicon_fts(rowid, strong, lemma, translit, definition)
    VALUES (new.rowid, new.strong, new.lemma, new.translit, new.definition);
  END;

  -- Interlinear FTS
  CREATE TRIGGER IF NOT EXISTS interlinear_ai AFTER INSERT ON interlinear_words BEGIN
    INSERT INTO interlinear_fts(rowid, book_id, chapter, verse, _word, strong, lemma)
    VALUES (new.id, new.book_id, new.chapter, new.verse, new._word, new.strong, new.lemma);
  END;

  CREATE TRIGGER IF NOT EXISTS interlinear_ad AFTER DELETE ON interlinear_words BEGIN
    INSERT INTO interlinear_fts(interlinear_fts, rowid, book_id, chapter, verse, _word, strong, lemma)
    VALUES('delete', old.id, old.book_id, old.chapter, old.verse, old._word, old.strong, old.lemma);
  END;

  CREATE TRIGGER IF NOT EXISTS interlinear_au AFTER UPDATE ON interlinear_words BEGIN
    INSERT INTO interlinear_fts(interlinear_fts, rowid, book_id, chapter, verse, _word, strong, lemma)
    VALUES('delete', old.id, old.book_id, old.chapter, old.verse, old._word, old.strong, old.lemma);
    INSERT INTO interlinear_fts(rowid, book_id, chapter, verse, _word, strong, lemma)
    VALUES (new.id, new.book_id, new.chapter, new.verse, new._word, new.strong, new.lemma);
  END;
  `

  try {
    // Eksekusi skema utama
    await db.exec(schemaSQL)
    console.log('✅ Main schema created')

    // Eksekusi FTS tables
    await db.exec(ftsSQL)
    console.log('✅ FTS5 tables created')

    // Eksekusi indexes
    await db.exec(indexSQL)
    console.log('✅ Indexes created')

    // Eksekusi triggers
    await db.exec(triggerSQL)
    console.log('✅ Triggers created')

  } catch (e) {
    console.error('❌ Schema creation FAILED:', e.message)
    console.error('Full error:', e)
    throw e
  }

  // ===============================
  // VERIFIKASI TABEL
  // ===============================
  try {
    const tables = await db.all(`
      SELECT name, type 
      FROM sqlite_master 
      WHERE type IN ('table', 'view', 'trigger')
      ORDER BY type, name
    `)

    if (!tables.length) {
      throw new Error('Schema verification failed: no tables created')
    }

    console.log('\n📋 Database Objects Created:')
    const byType = tables.reduce((acc, obj) => {
      acc[obj.type] = acc[obj.type] || []
      acc[obj.type].push(obj.name)
      return acc
    }, {})

    for (const [type, names] of Object.entries(byType)) {
      console.log(`  ${type.toUpperCase()}: ${names.length} items`)
      // Tampilkan nama-nama jika tidak terlalu banyak
      if (names.length <= 10) {
        names.forEach(name => console.log(`    - ${name}`))
      }
    }

  } catch (e) {
    console.error('❌ Table verification failed:', e.message)
  }

  // ===============================
  // RETURN DB OBJECT DENGAN METHOD YANG DIPERLUKAN
  // ===============================
  return {
    // Basic methods
    exec: (sql) => db.exec(sql),
    run: (sql, params) => db.run(sql, params),
    get: (sql, params) => db.get(sql, params),
    all: (sql, params) => db.all(sql, params),
    prepare: (sql) => db.prepare(sql),

    // Transaction support
    transaction: (fn, options) => db.transaction(fn, options),

    // Custom methods untuk operasi khusus Alkitab
    async getBookInfo(bookId) {
      return db.get('SELECT * FROM books WHERE id = ?', [bookId])
    },

    async getChapter(bookId, chapter, version = 'tb') {
      return db.all(
        `SELECT verse, text FROM verses 
         WHERE book_id = ? AND chapter = ? AND version = ? 
         ORDER BY verse`,
        [bookId, chapter, version]
      )
    },

    async searchVerses(query, version = 'tb', limit = 50) {
      return db.all(
        `SELECT b.name, v.chapter, v.verse, v.text
         FROM verses v
         JOIN books b ON v.book_id = b.id
         WHERE v.version = ? AND v.text LIKE ?
         LIMIT ?`,
        [version, `%${query}%`, limit]
      )
    },

    async getStrongLexicon(strongNumber) {
      return db.get('SELECT * FROM strong_lexicon WHERE strong = ?', [strongNumber])
    },

    async getInterlinearWords(bookId, chapter, verse, version) {
      return db.all(
        `SELECT * FROM interlinear_words 
         WHERE book_id = ? AND chapter = ? AND verse = ? AND version = ?
         ORDER BY position`,
        [bookId, chapter, verse, version]
      )
    },

    // Close dengan cleanup
    async close() {
      try {
        // Checkpoint WAL untuk memastikan data tersimpan
        await db.exec('PRAGMA wal_checkpoint(FULL)')
      } catch (error) {
        console.warn('⚠️ WAL checkpoint failed:', error.message)
      }
      
      try {
        await db.close()
        console.log('✅ Database closed')
      } catch (error) {
        console.error('❌ Error closing database:', error.message)
      }
    },

    // Access to raw db object (for advanced use)
    _db: db
  }
}

// Optional: Export utility functions
export async function resetDatabase(dbPath = DEFAULT_DB) {
  const fullPath = path.resolve(process.cwd(), dbPath)
  if (fs.existsSync(fullPath)) {
    console.log(`🗑 Removing database: ${fullPath}`)
    fs.unlinkSync(fullPath)
  }
  return openDB(dbPath)
}

export async function backupDatabase(srcPath = DEFAULT_DB, backupPath = null) {
  const srcFull = path.resolve(process.cwd(), srcPath)
  if (!fs.existsSync(srcFull)) {
    throw new Error('Source database not found')
  }

  const backupFull = backupPath || 
    path.resolve(process.cwd(), `./backup/bible_${Date.now()}.db`)
  
  const backupDir = path.dirname(backupFull)
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  fs.copyFileSync(srcFull, backupFull)
  console.log(`💾 Database backed up to: ${backupFull}`)
  return backupFull
}