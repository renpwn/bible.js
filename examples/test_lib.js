import alquranHandler, { openDB, closeDB } from "../index.js";

(async () => {
  const tests = [
    "",
    "2:255",
    "2 1-10",
    "baqa 1-5",
    "yasin",
    "150 3",
    "list",
    // "al kahfi 10",
    // "baqarah 286",
    // "al fatihah 1-3",
    // "fatih",
    // "Al-ḥamdu",
    // "اَلْحَمْدُ"
  ];
  
  const db = await openDB(); // buka 1x
  for (const t of tests) {
    console.log("\n==============================");
    console.log("INPUT:", JSON.stringify(t));
    try {
      const res = await alquranHandler(t, { min: true });
      console.log(res);
      if (res.debug) {
        console.log("DEBUG:", res.debug);
      }
    } catch (e) {
      console.error("ERROR:", e.message);
    }
  }
  await closeDB(); // tutup 1x
})();
