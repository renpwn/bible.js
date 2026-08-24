# -*- coding: utf-8 -*-
"""
@fileoverview @renpwn/bible.js - Python Integration Example

Copyright (C) 2026 RENPWN (ARDY RENDRA R) <renpwn.ch@gmail.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
"""

import json
import sqlite3
import subprocess
import sys
from pathlib import Path

# Set UTF-8 encoding untuk konsol Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parents[1]
DB_PATH = BASE_DIR / "db" / "bible.js.db"

def query_via_cli(query_str: str) -> dict:
    """Menjalankan query melalui CLI Node.js bible.js"""
    result = subprocess.run(
        ["node", "index.js", query_str],
        cwd=str(BASE_DIR),
        capture_output=True,
        text=True,
        encoding="utf-8"
    )
    if result.returncode == 0 and result.stdout.strip():
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            return {"raw": result.stdout.strip()}
    return {"error": result.stderr.strip() or "Execution failed"}

def query_via_sqlite_direct(book_name: str, chapter: int, verse: int, version: str = "tb") -> dict:
    """Mengambil ayat langsung dari SQLite database"""
    if not DB_PATH.exists():
        return {"error": f"Database file not found at {DB_PATH}. Run 'npm run download:db' first."}
    
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT v.verse, v.text, b.name as book_name, b.name_en, b.id as book_id
        FROM verses v
        JOIN books b ON v.book_id = b.id
        WHERE (LOWER(b.name) = LOWER(?) OR LOWER(b.name_en) = LOWER(?))
          AND v.chapter = ? AND v.verse = ? AND v.version = ?
    """, (book_name, book_name, chapter, verse, version))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "book": row["book_name"],
            "chapter": chapter,
            "verse": row["verse"],
            "version": version,
            "text": row["text"],
            "tafsir": f"https://alkitab.sabda.org/verse_commentary.php?book={row['book_id']}&chapter={chapter}&verse={verse}"
        }
    return {"error": "Verse not found"}

def main():
    print("📖 === Python Example Integration with @renpwn/bible.js ===\n")
    
    # 1. Query langsung via SQLite
    print("1. [Direct SQLite] Mengambil Yohanes 3:16 (TB):")
    verse_db = query_via_sqlite_direct("Yohanes", 3, 16, "tb")
    print(f"   {verse_db.get('book')} {verse_db.get('chapter')}:{verse_db.get('verse')} ({verse_db.get('version', '').upper()})")
    print(f"   \"{verse_db.get('text')}\"")
    print(f"   Tafsir: {verse_db.get('tafsir')}\n")
    
    # 2. Query via CLI Node.js (Tanakh + Rashi)
    print("2. [Node CLI Bridge] Mengambil Tanakh + Rashi (Kej 1:1 tn+):")
    res_tanakh = query_via_cli("Kej 1:1 tn+")
    if "verses" in res_tanakh:
        v = res_tanakh["verses"][0]
        print(f"   Hebrew : {v.get('tn_he')}")
        print(f"   English: {v.get('tn_en')}")
        if v.get("rashi"):
            print(f"   Rashi  : {v['rashi'][0].get('eng', '')[:100]}...\n")
            
    # 3. Query Strong Lexicon via CLI
    print("3. [Node CLI Bridge] Lookup Strong Greek G26 (Agape):")
    res_strong = query_via_cli("strong:G26")
    if "data" in res_strong:
        d = res_strong["data"]
        print(f"   Strong ID    : {d.get('strong')}")
        print(f"   Word         : {d.get('word')}")
        print(f"   Pronunciation: {d.get('pronunciation')}")
        print(f"   Definition   : {d.get('definition', '').splitlines()[0]}")

if __name__ == "__main__":
    main()
