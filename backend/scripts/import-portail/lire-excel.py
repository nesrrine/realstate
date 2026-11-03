import sys, zipfile, re, json
import xml.etree.ElementTree as ET
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
path = sys.argv[1]
z = zipfile.ZipFile(path)
shared = []
if "xl/sharedStrings.xml" in z.namelist():
    for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
        shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
wb = ET.fromstring(z.read("xl/workbook.xml"))
rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
target = {r.get("Id"): r.get("Target") for r in rels}
def col_index(ref):
    letters = re.match(r"[A-Z]+", ref).group(0)
    n = 0
    for ch in letters: n = n * 26 + ord(ch) - 64
    return n - 1
out = {}
for sh in wb.find("m:sheets", NS):
    name = sh.get("name"); rid = sh.get("{%s}id" % NS["r"])
    t = target[rid]; t = t if t.startswith("xl/") else "xl/" + t.lstrip("/")
    root = ET.fromstring(z.read(t))
    rows = []
    for row in root.iter("{%s}row" % NS["m"]):
        cells = {}
        for c in row.findall("m:c", NS):
            v = c.find("m:v", NS); typ = c.get("t")
            if typ == "s" and v is not None: val = shared[int(v.text)]
            elif typ == "inlineStr":
                val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
            else: val = v.text if v is not None else ""
            cells[col_index(c.get("r"))] = val
        if cells:
            width = max(cells) + 1
            rows.append([cells.get(i, "") for i in range(width)])
    out[name] = rows
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False)
for name, rows in out.items():
    print(f"== onglet « {name} » : {len(rows)} lignes")
    for r in rows[:6]: print("   ", r[:25])
