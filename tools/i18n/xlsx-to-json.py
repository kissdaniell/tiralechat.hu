# python tools/i18n/xlsx-to-json.py <the translators' workbook.xlsx>
# Turns the workbook (sheet 1: #, where, kind, source, Magyar, English, note)
# into tools/i18n/en.json, which build-en.mjs reads. Needs openpyxl.
import json, os, sys
from openpyxl import load_workbook

ws = load_workbook(sys.argv[1]).worksheets[0]
rows = []
for r in ws.iter_rows(min_row=2, values_only=True):
    if r[4] is None:
        continue
    rows.append({'where': r[1], 'kind': r[2], 'source': r[3], 'hu': str(r[4]), 'en': str(r[5]).strip() if r[5] is not None else ''})
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'en.json')
json.dump(rows, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(rows), 'rows ->', out, '| without English:', sum(1 for x in rows if not x['en']))
