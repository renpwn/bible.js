# examples/python_example.py
import json
from pathlib import Path

base = Path(__file__).resolve().parents[1]

def read_json(p): 
    return json.loads(p.read_text(encoding='utf8'))

def main():
    list_q = read_json(base / 'ListQuran.json')
    print('Jumlah surah:', len(list_q['quran']))

    surah_meta = next(s for s in list_q['quran'] if s['number']==103)
    print('Surah 103 meta:', surah_meta)

    surah_detail = read_json(base / 'alquran' / 'Alquran_103.json')
    ayat1 = next((a for a in surah_detail['ayahs'] if a.get('index')==1), surah_detail['ayahs'][0])
    print('Ayat 1 (Arab):', ayat1['arb'])
    print('Tafsir Ibnu Katsir:', ayat1.get('tafsir', {}).get('ibnu_katsir'))

if __name__ == '__main__':
    main()
