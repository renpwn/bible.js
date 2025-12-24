import Database from '@renpwn/termux-sqlite3'
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

    -- source_lang TEXT NOT NULL,
    _word TEXT NOT NULL,
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
    definition TEXT,
    phonetic   TEXT,
    pronunciation TEXT
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

--CREATE INDEX IF NOT EXISTS idx_interlinear_source_lang
--  ON interlinear_words(source_lang);

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
