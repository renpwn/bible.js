import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import zlib from 'zlib';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';

// Default URL download (mencoba raw folder db di master/main repo, lalu fallback ke Releases)
export const DEFAULT_DOWNLOAD_URLS = [
  process.env.BIBLE_DB_URL,
  'https://raw.githubusercontent.com/renpwn/bible.js/master/db/bible.db.gz',
  'https://github.com/renpwn/bible.js/raw/master/db/bible.db.gz',
  'https://raw.githubusercontent.com/renpwn/bible.js/main/db/bible.db.gz',
  'https://github.com/renpwn/bible.js/releases/latest/download/bible.db.gz'
].filter(Boolean);

export const DEFAULT_RELEASE_URL = DEFAULT_DOWNLOAD_URLS[0];

export const DEFAULT_DB_PATH = 
  process.env.BIBLE_DB_PATH || 
  path.join(process.cwd(), 'db/bible.db');

/**
 * Format bytes ke ukuran yang mudah dibaca (KB/MB/GB)
 */
export function formatBytes(bytes) {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format detik ke waktu yang mudah dibaca (misal: 15s, 1m 20s)
 */
function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

/**
 * Kompres file database SQLite lokal ke format GZIP (.gz)
 * Rasio kompresi maksimal (level 9) - dari ~260MB menjadi ~32-96MB.
 */
export async function compressDatabase(srcDbPath = DEFAULT_DB_PATH, targetGzPath = null) {
  const src = path.resolve(srcDbPath);
  if (!fs.existsSync(src)) {
    throw new Error(`File sumber database tidak ditemukan: ${src}`);
  }

  const dest = targetGzPath ? path.resolve(targetGzPath) : `${src}.gz`;
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const srcStat = fs.statSync(src);
  console.log(`\n📦 Mengompresi database SQLite:`);
  console.log(`   Sumber : ${src} (${formatBytes(srcStat.size)})`);
  console.log(`   Tujuan : ${dest}`);

  const readStream = fs.createReadStream(src);
  const writeStream = fs.createWriteStream(dest);
  const gzip = zlib.createGzip({ level: 9 });

  const startTime = Date.now();
  await pipeline(readStream, gzip, writeStream);

  const destStat = fs.statSync(dest);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const ratio = ((1 - (destStat.size / srcStat.size)) * 100).toFixed(1);

  console.log(`✅ Selesai dalam ${duration}s!`);
  console.log(`   Ukuran akhir : ${formatBytes(destStat.size)} (Hemat ${ratio}% ruang)`);
  console.log(`   Siap di-commit ke GitHub atau di-upload ke Releases!\n`);

  return { src, dest, size: destStat.size, ratio };
}

/**
 * Ekstraksi file arsip lokal (.gz) langsung ke database SQLite
 * Menggunakan streaming zlib bawaan Node.js (Zero Dependencies & hemat RAM).
 */
export async function extractLocalGz(archivePath, targetDbPath = DEFAULT_DB_PATH) {
  const archive = path.resolve(archivePath);
  const target = path.resolve(targetDbPath);

  if (!fs.existsSync(archive)) {
    throw new Error(`File arsip tidak ditemukan: ${archive}`);
  }

  const targetDir = path.dirname(target);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const archiveStat = fs.statSync(archive);
  console.log(`\n📂 Mengekstrak database dari arsip lokal:`);
  console.log(`   Arsip  : ${archive} (${formatBytes(archiveStat.size)})`);
  console.log(`   Target : ${target}`);

  const tempFile = `${target}.tmp-${Date.now()}`;
  const readStream = fs.createReadStream(archive);
  const writeStream = fs.createWriteStream(tempFile);
  const gunzip = zlib.createGunzip();

  const startTime = Date.now();
  await pipeline(readStream, gunzip, writeStream);

  if (fs.existsSync(target)) {
    try { fs.unlinkSync(target); } catch (_) {}
  }
  fs.renameSync(tempFile, target);

  // Hapus file arsip sumber (.gz) setelah ekstraksi berhasil untuk menghemat ruang disk
  if (fs.existsSync(archive)) {
    try {
      fs.unlinkSync(archive);
      console.log(`🗑 File arsip ${path.basename(archive)} telah dihapus untuk menghemat ruang disk.`);
    } catch (_) {}
  }

  const finalStat = fs.statSync(target);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`✅ Database berhasil diekstrak dalam ${duration}s (${formatBytes(finalStat.size)})\n`);
  return { status: 'extracted', path: target, size: finalStat.size };
}

/**
 * Cari file arsip database lokal di folder target (misal db/bible.db.gz atau db/bible.db.zip)
 */
export function findLocalArchive(dbPath = DEFAULT_DB_PATH) {
  const base = path.resolve(dbPath);
  const dir = path.dirname(base);
  const filename = path.basename(base);

  const possibleNames = [
    `${base}.gz`,            // db/bible.db.gz
    path.join(dir, `${filename}.gz`),
    path.join(dir, 'bible.gz'),
    path.join(dir, 'bible.db.gz'),
    path.join(dir, 'bible.zip'),
    `${base}.zip`
  ];

  for (const p of possibleNames) {
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      if (stat.size > 0) return p;
    }
  }

  return null;
}

/**
 * Download file via stream dengan handling redirect, dynamic activity timeout, dan live progress bar.
 */
function downloadFileWithProgress(url, targetFilePath, isGzip = true, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) {
      return reject(new Error('Terlalu banyak redirect HTTP'));
    }

    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) renpwn/bible.js',
        'Accept': '*/*'
      }
    }, (res) => {
      // Handle HTTP redirects (301, 302, 303, 307, 308)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const parsed = new URL(url);
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        res.resume(); // Buang data redirect
        return downloadFileWithProgress(redirectUrl, targetFilePath, isGzip, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Server mengembalikan status code ${res.statusCode} (${res.statusMessage})`));
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      const startTime = Date.now();
      let lastTime = startTime;
      let lastBytes = 0;
      let speed = 0;

      // Activity timeout: reset timer setiap kali ada data masuk (60s)
      let activityTimeout = null;
      const resetActivityTimeout = () => {
        if (activityTimeout) clearTimeout(activityTimeout);
        activityTimeout = setTimeout(() => {
          req.destroy(new Error('Koneksi terputus: Tidak ada data masuk selama 60 detik'));
        }, 60000);
      };
      resetActivityTimeout();

      // Transform stream untuk tracking progress
      const progressTracker = new Transform({
        transform(chunk, encoding, callback) {
          downloadedBytes += chunk.length;
          resetActivityTimeout();

          const now = Date.now();
          if (now - lastTime >= 300 || downloadedBytes === totalBytes) {
            const timeDiff = (now - lastTime) / 1000;
            if (timeDiff > 0) {
              speed = (downloadedBytes - lastBytes) / timeDiff;
            }
            lastTime = now;
            lastBytes = downloadedBytes;

            const percent = totalBytes > 0 ? Math.floor((downloadedBytes / totalBytes) * 100) : 0;
            const barLength = 20;
            const filled = Math.round((barLength * (percent || 0)) / 100);
            const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, barLength - filled));
            const eta = speed > 0 && totalBytes > downloadedBytes ? (totalBytes - downloadedBytes) / speed : 0;

            const textTotal = totalBytes > 0 ? ` / ${formatBytes(totalBytes)}` : '';
            process.stdout.write(
              `\r⏳ Download [${bar}] ${percent}% (${formatBytes(downloadedBytes)}${textTotal}) | ${formatBytes(speed)}/s | ETA: ${formatTime(eta)}   `
            );
          }
          callback(null, chunk);
        }
      });

      const tempFile = `${targetFilePath}.tmp-${Date.now()}`;
      const fileWriteStream = fs.createWriteStream(tempFile);

      // Siapkan pipeline (dekompres jika gzip)
      const streams = isGzip
        ? [res, progressTracker, zlib.createGunzip(), fileWriteStream]
        : [res, progressTracker, fileWriteStream];

      pipeline(...streams)
        .then(() => {
          if (activityTimeout) clearTimeout(activityTimeout);
          process.stdout.write('\n');

          // Rename file temp ke final
          if (fs.existsSync(targetFilePath)) {
            try { fs.unlinkSync(targetFilePath); } catch (_) {}
          }
          fs.renameSync(tempFile, targetFilePath);

          const finalStat = fs.statSync(targetFilePath);
          resolve(finalStat.size);
        })
        .catch((err) => {
          if (activityTimeout) clearTimeout(activityTimeout);
          if (fs.existsSync(tempFile)) {
            try { fs.unlinkSync(tempFile); } catch (_) {}
          }
          reject(err);
        });
    });

    // Timeout untuk initial handshake koneksi (30 detik)
    req.setTimeout(30000, () => {
      req.destroy(new Error('Koneksi timeout saat menghubungkan ke server'));
    });

    req.on('error', reject);
  });
}

/**
 * Memastikan database bible.db tersedia saat init aplikasi:
 * 1. Cek apakah bible.db sudah ada di lokal.
 * 2. Jika belum, cek apakah ada file arsip lokal (bible.db.gz) di folder db/ lalu ekstrak.
 * 3. Jika arsip lokal tidak ada, baru download dari GitHub dengan live progress bar.
 */
export async function ensureDatabase(options = {}) {
  const dbPath = path.resolve(options.dbPath || DEFAULT_DB_PATH);
  const force = options.force || false;

  // 1. Cek jika database file (.db) sudah ada dan valid
  if (fs.existsSync(dbPath) && !force) {
    const stat = fs.statSync(dbPath);
    if (stat.size > 0) {
      return { status: 'exists', dbPath, size: stat.size };
    }
  }

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // 2. Cek apakah ada file arsip terkompresi lokal di folder db/ (misal: db/bible.db.gz)
  const localArchive = findLocalArchive(dbPath);
  if (localArchive && !force) {
    console.log(`📦 Ditemukan file arsip lokal di repository: ${path.basename(localArchive)}`);
    return await extractLocalGz(localArchive, dbPath);
  }

  // 3. Fallback: Download dari GitHub jika file lokal tidak ada
  console.log('📦 Database Alkitab (bible.db) belum ditemukan di lokal.');
  const downloadUrls = options.urls || (options.url ? [options.url] : DEFAULT_DOWNLOAD_URLS);

  let lastError = null;
  for (const downloadUrl of downloadUrls) {
    console.log(`🌐 Mengunduh dari: ${downloadUrl}`);
    console.log(`📂 Menyimpan ke: ${dbPath}`);

    const isGzip = downloadUrl.endsWith('.gz') || !downloadUrl.endsWith('.db');

    try {
      const size = await downloadFileWithProgress(downloadUrl, dbPath, isGzip);
      console.log(`✅ Database Alkitab berhasil diunduh dan diekstrak (${formatBytes(size)}): ${dbPath}\n`);
      return { status: 'downloaded', dbPath, size };
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Gagal dari URL ini (${error.message}), mencoba URL alternatif...`);
    }
  }

  throw new Error(`Gagal menyiapkan database Alkitab setelah mencoba semua URL: ${lastError?.message}`);
}

// Support CLI run: node mt/download.js [--compress | --extract | --force]
if (process.argv[1] && (
  process.argv[1].endsWith('download.js') ||
  process.argv[1].endsWith('download')
)) {
  const args = process.argv.slice(2);
  
  if (args.includes('--compress') || args.includes('-c')) {
    compressDatabase()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('❌ Error kompresi:', err.message);
        process.exit(1);
      });
  } else if (args.includes('--extract') || args.includes('-e')) {
    const archive = findLocalArchive() || `${DEFAULT_DB_PATH}.gz`;
    extractLocalGz(archive)
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('❌ Error ekstraksi:', err.message);
        process.exit(1);
      });
  } else {
    const isForce = args.includes('--force') || args.includes('-f');
    ensureDatabase({ force: isForce })
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('❌ Error:', err.message);
        process.exit(1);
      });
  }
}
