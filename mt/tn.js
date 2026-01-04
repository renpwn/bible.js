import fs from "fs";
import * as cheerio from "cheerio";
import axios from "axios";

const isTermux = process.platform === "android";
let fetchHtml;

// ==== Termux → Axios ==== //
if (isTermux) {
  console.log("Platform: Termux (Android) → pakai Axios");

  //const axios = await import("axios");
  const { CookieJar } = await import("tough-cookie");
  const { wrapper } = await import("axios-cookiejar-support");

  const jar = new CookieJar();
  const client = wrapper(axios.default.create({ jar }));

  fetchHtml = async (url) => {
    try {
      const res = await client.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/109.0 Firefox/109.0",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          //Referer: "https://www.chabad.org/library/bible_cdo/aid/63255/jewish/The-Bible-with-Rashi.htm"
          Referer: "https://www.jw.org/id/perpustakaan/alkitab/nwt/buku-alkitab/"
        },
        maxRedirects: 10,
        timeout: 20000
      });
      //console.log("HTTP STATUS:", res.status);
      return res.data;
    } catch (err) {
      if (err.response) console.error("🚨 Status:", err.response.status);
      else console.error("🚨 Error:", err.message);
      return null;
    }
  };
}

// ==== Desktop → Puppeteer ==== //
else {
  console.log("Platform: Desktop → pakai Puppeteer");
  const puppeteer = (await import("puppeteer")).default;

  fetchHtml = async (url) => {
    const browserOptions = {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    };
    const browser = await puppeteer.launch(browserOptions);
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/143.0.0.0 Safari/537.36"
    );

    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      const html = await page.content();
      await browser.close();
      return html;
    } catch (err) {
      console.error("Gagal load:", err.message);
      await browser.close();
      return null;
    }
  };
}

// ==== SCRAPER LOGIC ==== //
let num = 0;
let counter = 0;
let chapters = 0;
let partsName = "";
let booksName = "";

let listTanakh = [
  ["Torah (The Pentateuch)","Bereshit (Genesis)",50,1533],
  ["Torah (The Pentateuch)","Shemot (Exodus)",40,1210],
  ["Torah (The Pentateuch)","Vayikra (Leviticus)",27,859],
  ["Torah (The Pentateuch)","Bamidbar (Numbers)",36,1288],
  ["Torah (The Pentateuch)","Devarim (Deuteronomy)",34,956],
  ["Nevi'im (Prophets)","Yehoshua (Joshua)",24,656],
  ["Nevi'im (Prophets)","Shoftim (Judges)",21,618],
  ["Nevi'im (Prophets)","Shmuel I (I Samuel)",31,811],
  ["Nevi'im (Prophets)","Shmuel II (II Samuel)",24,695],
  ["Nevi'im (Prophets)","Melachim I (I Kings)",22,817],
  ["Nevi'im (Prophets)","Melachim II (II Kings)",25,719],
  ["Nevi'im (Prophets)","Yeshayahu (Isaiah)",66,1291],
  ["Nevi'im (Prophets)","Yirmiyahu (Jeremiah)",52,1364],
  ["Nevi'im (Prophets)","Yechezkel (Ezekiel)",48,1273],
  ["Nevi'im (Prophets)","Hoshea (Hosea)",14,197],
  ["Nevi'im (Prophets)","Yoel (Joel)",4,73],
  ["Nevi'im (Prophets)","Amos",9,146],
  ["Nevi'im (Prophets)","Ovadiah (Obadiah)",1,21],
  ["Nevi'im (Prophets)","Yonah (Jonah)",4,48],
  ["Nevi'im (Prophets)","Michah (Micah)",7,105],
  ["Nevi'im (Prophets)","Nachum (Nahum)",3,47],
  ["Nevi'im (Prophets)","Chavakuk (Habakkuk)",3,56],
  ["Nevi'im (Prophets)","Tzefaniah (Zephaniah)",3,53],
  ["Nevi'im (Prophets)","Chaggai (Haggai)",2,38],
  ["Nevi'im (Prophets)","Zechariah",14,211],
  ["Nevi'im (Prophets)","Malachi",3,55],
  ["Ketuvim (Scriptures)","Tehillim (Psalms)",150,2527],
  ["Ketuvim (Scriptures)","Mishlei (Proverbs)",31,915],
  ["Ketuvim (Scriptures)","Iyov (Job)",42,1070],
  ["Ketuvim (Scriptures)","Shir Hashirim (Song of Songs)",8,117],
  ["Ketuvim (Scriptures)","Rut (Ruth)",4,85],
  ["Ketuvim (Scriptures)","Eichah (Lamentations)",5,154],
  ["Ketuvim (Scriptures)","Kohelet (Ecclesiastes)",12,222],
  ["Ketuvim (Scriptures)","Esther",10,167],
  ["Ketuvim (Scriptures)","Daniel",12,357],
  ["Ketuvim (Scriptures)","Ezra",10,280],
  ["Ketuvim (Scriptures)","Nechemiah (Nehemiah)",13,406],
  ["Ketuvim (Scriptures)","Divrei Hayamim I (Chronicles I)",29,942],
  ["Ketuvim (Scriptures)","Divrei Hayamim II (Chronicles II)",36,822]
];

// ==== HELPERS ==== //
const add2Arr = (pN, bN) => {
  let exists = listTanakh.some(x => x[0] === pN && x[1] === bN);
  if (!exists) listTanakh.push([pN, bN, 0, 0]);
};

const add2Pos = () => {
  let idx = listTanakh.findIndex(x => x[0] === partsName && x[1] === booksName);
  if (idx >= 0) listTanakh[idx][2] = chapters, listTanakh[idx][3] = counter;
};

// ==== MAIN SCRAPER ==== //
const ambilWeb = async (url) => {
  let nextUrl = url;

  while (nextUrl) {
    const html = await fetchHtml(nextUrl);
    if (!html) break;

    const $ = cheerio.load(html);

    const oneChapter = { partsName, booksName, chapter: 0, jumlah: 0, ayat: [] };
    const pb = $("a.breadcrumbs__crumb").map((i, el) => $(el).text().trim()).get();

    if (pb[4] !== partsName || pb[5] !== booksName) {
      add2Arr(pb[4], pb[5]);
      counter = 0;
    }

    oneChapter.partsName = partsName = pb[4];
    oneChapter.booksName = booksName = pb[5];
    oneChapter.parts = [...new Set(listTanakh.map(a => a[0]))].indexOf(partsName) + 1;
    oneChapter.books = [...new Set(listTanakh.filter(a => a[0] === partsName).map(a => a[1]))].indexOf(booksName) + 1;

    oneChapter.chapter = chapters = Number($(".article-header__title").text().split(" Chapter ")[1] || 0);

    // Ambil ayat
    let numAyat = -1;
    $(".Co_TanachTable").each((tIdx, table) => {
      $(table).find("tr").each((trIdx, tr) => {
        const cls = $(tr).attr("class");
        if (cls === "Co_Verse") {
          numAyat++;
          const eng = $(tr).find("td:first-child > span.co_VerseText").text();
          const hbw = $(tr).find("td.hebrew > span.co_VerseText").text();
          oneChapter.ayat.push({ no: numAyat + 1, eng, hbw, rsh: [] });
        } else if (cls === "Co_Rashi") {
          const engr =
            "*" +
            $(tr).find("td:first-child > span > span.co_RashiTitle").text().trim() +
            "* " +
            $(tr).find("td:first-child > span > span.co_RashiText").text();
          const hbwr =
            "*" +
            $(tr).find("td.hebrew > span > span.co_RashiTitle").text().trim() +
            "* " +
            $(tr).find("td.hebrew > span > span.co_RashiText").text();
          oneChapter.ayat[numAyat].rsh.push({ eng: engr, hbw: hbwr });
        }
      });
    });

    oneChapter.jumlah = oneChapter.ayat.length;

    // Simpan JSON per chapter
    const filenameSave = `./mt/tanakh_${oneChapter.parts}_${oneChapter.books}_${oneChapter.chapter}.json`;
    fs.writeFileSync(filenameSave, JSON.stringify(oneChapter, null, 4));
    console.log("Tersimpan:", filenameSave);

    add2Pos();

    // Dapatkan next chapter
    nextUrl = $("div.next_nav > a").attr("href");
    if (nextUrl) nextUrl = "https://www.chabad.org" + nextUrl;
  }

  await browser.close();
};

const ambilNwt = async (url) => {
  const html = await fetchHtml(url);
  console.log(html)
  const $ = cheerio.load(html);
  const verses = [];

  $("span.verse").each((_, el) => {
    const $el = $(el);

    // ambil nomor ayat (biasanya di <sup>)
    let verse = null;
    const sup = $el.find("sup").first().text().trim();
    if (/^\d+$/.test(sup)) {
      verse = Number(sup);
    }

    // clone supaya aman
    const text = $el
      .clone()
      .find("sup, a, .footnote, .crossref, .parabreak")
      .remove()
      .end()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      verses.push({ verse, text });
    }
  });

  return verses;
}

const fetchNwtJson = async (url) => {
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/109.0 Firefox/109.0",
        Accept: "application/json",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
        Referer: "https://www.jw.org/id/perpustakaan/alkitab/nwt/buku-alkitab/"
      },
      timeout: 20000
    });

    return res.data;
  } catch (err) {
    if (err.response) {
      console.error("🚨 HTTP", err.response.status);
    } else {
      console.error("🚨", err.message);
    }
    return null;
  }
};

// Ambil dari cached version
const fetchFromCache = async (url) => {
  const cachedUrl =
    `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}&strip=1`;

  const html = await axios.get(cachedUrl, {
    timeout: 10000,
    maxRedirects: 5,
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "pragma": "no-cache"
    },
    validateStatus: s => s >= 200 && s < 500
  });
  
  console.log(html.data)
};

const fetchViaProxy = async (url) => {
    const proxies = [
        //'https://cors-anywhere.herokuapp.com/',
        'https://api.codetabs.com/v1/proxy/?quest='
    ];
    
    for (const proxy of proxies) {
        try {
            const res = await axios.get(proxy + encodeURIComponent(url), {
        timeout: 8000,
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "accept": "text/html"
        },
        validateStatus: s => s >= 200 && s < 500
      });
            console.log(res.data)
            return res.data;
        } catch (e) {
            continue;
        }
    }
    return null;
};

const fetchJW = async (url) => {
  const html = await fetchHtml(url);
  if (!html) return null;

  const $ = cheerio.load(html);
  const versesMap = new Map();

  $("span.v").each((_, el) => {
    const $v = $(el);

    // ==== ambil nomor ayat ====
    let verse = null;

    // 1️⃣ dari <strong>
    const strongNum = $v.find("strong").first().text().trim();
    if (/^\d+$/.test(strongNum)) {
      verse = Number(strongNum);
    }

    // 2️⃣ dari <a> (tanpa child)
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

    // 3️⃣ fallback dari ID (PALING PENTING)
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

  console.log("JW verses:", verses.length);
  console.log(verses);
  return verses;
};

// ==== START ==== //
//ambilWeb("https://www.chabad.org/library/bible.aspx?aid=6289");
//ambilNwt("https://www.jw.org/id/perpustakaan/alkitab/nwt/buku-alkitab/2-timotius/1/");
//fetchNwtJson("https://www.jw.org/id/perpustakaan/alkitab/nwt/buku-alkitab/json/data/1001000-1001999");
//fetchFromCache("https://www.jw.org/id/perpustakaan/alkitab/nwt/buku-alkitab/json/data/1001000-1001999");
//fetchViaProxy("https://www.jw.org/id/perpustakaan/alkitab/nwt/buku-alkitab/json/data/1001000-1001999");
fetchJW("https://wol.jw.org/id/wol/b/r25/lp-in/nwtsty/24/3#study=discover")