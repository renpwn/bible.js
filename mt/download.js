import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import zlib from 'zlib';
import { pipeline } from 'stream/promises';

// Default URL rilis GitHub untuk asset bible.db.gz
export const DEFAULT_RELEASE_URL = 
  process.env.BIBLE_DB_URL || 
  'https://github.com/renpwn/bible.js/releases/latest/download/bible.db.gz';

export const DEFAULT_DB_PATH = 
  process.env.BIBLE_DB_PATH || 
  path.join(process.cwd(), 'db/bible.db');

/**
 * Format bytes ke ukuran yang mudah dibaca (KB/MB)
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Download file dengan handling redirect dan progress reporter
 */
function downloadStream(url, onProgress) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    const request = client.get(url, (response) => {
      // Handle redirect (301, 302, 307, 308)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        let redirectUrl = response.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const parsedUrl = new URL(url);
          redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
        }
        return downloadStream(redirectUrl, onProgress).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`Gagal download: Server mengembalikan status code ${response.statusCode} (${response.statusMessage})`));
      }

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (onProgress && totalBytes > 0) {
          const percent = Math.floor((downloadedBytes / totalBytes) * 100);
          onProgress(downloadedBytes, totalBytes, percent);
        }
      });

      resolve(response);
    });

    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Koneksi timeout saat mengunduh database'));
    });
  });
}

/**
 * Memastikan database bible.db tersedia di lokal.
 * Jika belum ada, otomatis download bible.db.gz dari GitHub Releases lalu decompress ke target.
 */
export async function ensureDatabase(options = {}) {
  const dbPath = path.resolve(options.dbPath || DEFAULT_DB_PATH);
  const downloadUrl = options.url || DEFAULT_RELEASE_URL;
  const force = options.force || false;

  // Jika sudah ada dan tidak dipaksa re-download
  if (fs.existsSync(dbPath) && !force) {
    const stat = fs.statSync(dbPath);
    if (stat.size > 0) {
      return { status: 'exists', dbPath };
    }
  }

  // Buat direktori jika belum ada
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log('📦 Database Alkitab (bible.db) belum ditemukan di lokal.');
  console.log(`🌐 Mengunduh dari: ${downloadUrl}`);
  console.log(`📂 Menyimpan ke: ${dbPath}`);

  const tempFile = `${dbPath}.tmp-${Date.now()}`;
  const isGzip = downloadUrl.endsWith('.gz') || !downloadUrl.endsWith('.db');

  try {
    const stream = await downloadStream(downloadUrl, (downloaded, total, percent) => {
      const barLength = 25;
      const filled = Math.round((barLength * percent) / 100);
      const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, barLength - filled));
      process.stdout.write(`\r⏳ Downloading [${bar}] ${percent}% (${formatBytes(downloaded)} / ${formatBytes(total)})`);
    });

    process.stdout.write('\n⚙️ Mengekstrak dan menulis database...\n');

    const fileWriteStream = fs.createWriteStream(tempFile);

    if (isGzip) {
      const gunzip = zlib.createGunzip();
      await pipeline(stream, gunzip, fileWriteStream);
    } else {
      await pipeline(stream, fileWriteStream);
    }

    // Rename temp file ke file final (atomic write)
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    fs.renameSync(tempFile, dbPath);

    const finalStat = fs.statSync(dbPath);
    console.log(`✅ Database Alkitab berhasil diunduh (${formatBytes(finalStat.size)}): ${dbPath}\n`);

    return { status: 'downloaded', dbPath, size: finalStat.size };
  } catch (error) {
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (_) {}
    }
    throw new Error(`Gagal mengunduh database Alkitab: ${error.message}`);
  }
}

// Support CLI run: node mt/download.js
if (process.argv[1] && process.argv[1].endsWith('download.js')) {
  const isForce = process.argv.includes('--force') || process.argv.includes('-f');
  ensureDatabase({ force: isForce })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error:', err.message);
      process.exit(1);
    });
}
