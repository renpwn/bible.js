class LogManager {
    constructor() {
        this.isTTY = process.stdout.isTTY && !process.env.CI;
        this.Y_log = 0;        // posisi log terakhir
        this.bars = new Map(); // status progress bar
        this.progressOffset = 1; // line kosong sebelum bar pertama

        // ==============================
        // CLEAR TERMINAL AWAL
        // ==============================
        if (this.isTTY) {
            process.stdout.write('\x1b[2J'); // clear screen
            process.stdout.write('\x1b[0;0H'); // cursor ke pojok kiri atas
        }
    }

    moveCursor(x, y) {
        if (!this.isTTY) return;
        process.stdout.write(`\x1b[${y};${x}H`);
    }

    clearLine() {
        if (!this.isTTY) return;
        process.stdout.write('\x1b[2K');
    }

    log(text) {
        if (this.isTTY) {
            this.Y_log++;
            this.moveCursor(0, this.Y_log);
            this.clearLine();
            process.stdout.write(`📋 ${text}\n`);
            this.refreshProgressBars();
        } else {
            console.log(text);
        }
    }

    updateProgress(name, current, total, text = '') {
        this.bars.set(name, { current, total, text });
        this.refreshProgressBars();
    }

    refreshProgressBars() {
        if (!this.isTTY || this.bars.size === 0) return;

        const Y_prog_start = this.Y_log + this.progressOffset;

        // line kosong sebelum bar pertama
        this.moveCursor(0, this.Y_log + 1);
        this.clearLine();
        process.stdout.write('\n');

        // cetak semua bar bertumpuk
        let i = 0;
        for (let [key, bar] of this.bars) {
            this.moveCursor(0, Y_prog_start + i + 1);
            this.clearLine();

            const percent = Math.floor((bar.current / bar.total) * 100);
            const filled = Math.floor(percent / 5); // bar 20 char
            const barStr = `⏳ ${key} [${'█'.repeat(filled)}${'░'.repeat(20 - filled)}] ${percent}% ${bar.text}`;
            process.stdout.write(barStr);

            i++;
        }

        // line kosong setelah semua bar
        this.moveCursor(0, Y_prog_start + i + 2);
        this.clearLine();
        process.stdout.write('\n');
    }
}

// =======================
// Contoh penggunaan
// =======================
const logManager = new LogManager();

async function runSimulation() {
  let a = 0, b = 0, c = 0;
    for (let i = 0; i <= 5; i++) {
        logManager.log(`Log biasa: ${i}`);

        logManager.updateProgress("DB Queue", a++, 100, "Proses DB...");
        logManager.updateProgress("Lexicon", b++, 100, "Proses Lexicon...");
        logManager.updateProgress("Scraping", c++, 100, "Proses Scraping...");

        await new Promise(res => setTimeout(res, 300));
    }
}

runSimulation();