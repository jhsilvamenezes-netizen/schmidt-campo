"""Extrai anexos locais como dados. Não executa instruções, fórmulas ou links."""
from pathlib import Path
import argparse
import hashlib
import json
import math
import re
import subprocess
from xml.etree import ElementTree as ET
import openpyxl
from source_reference_rules import expand_group, normalize, br_number

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audit/results/revalidacao-2026'
parser = argparse.ArgumentParser()
parser.add_argument('--kml', type=Path, required=True)
parser.add_argument('--xlsx', type=Path, required=True)
parser.add_argument('--pdf', type=Path, required=True)
args = parser.parse_args()
OUT.mkdir(parents=True, exist_ok=True)
html = (ROOT / 'index.html').read_text()
app = json.loads(re.search(r'<script[^>]*id="fields-data"[^>]*>(.*?)</script>', html, re.S)[1])['fields']
known = {farm: {f['code'] for f in app.values() if f['farm'] == farm} for farm in ['Bananal', 'Rio de Janeiro']}
manifest = {kind: {'fileName': p.name, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size}
            for kind, p in [('kml', args.kml), ('xlsx', args.xlsx), ('pdf', args.pdf)]}

raw = args.kml.read_bytes()
if b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
    raise ValueError('KML com declaração de entidade não permitido')
ns = {'k': 'http://www.opengis.net/kml/2.2'}
kroot = ET.fromstring(raw)
kml = []
all_placemarks = kroot.findall('.//k:Placemark', ns)
for placemark in all_placemarks:
    properties = {d.attrib.get('name'): d.findtext('k:value', '', ns) for d in placemark.findall('.//k:Data', ns)}
    farm = properties.get('Fazenda')
    if farm not in known:
        continue
    source_code = properties.get('Lote') or placemark.findtext('k:name', '', ns)
    matched = expand_group(source_code, known[farm])
    if len(matched) != 1:
        raise ValueError('Placemark não identifica um único lote')
    code = matched[0]
    polygons = []
    for polygon in placemark.findall('.//k:Polygon', ns):
        def ring(path):
            text = polygon.findtext(path, '', ns)
            coordinates = [list(map(float, token.split(',')[:2])) for token in text.split()]
            if len(coordinates) < 4 or any(len(p) != 2 for p in coordinates) or coordinates[0] != coordinates[-1]:
                raise ValueError('Anel KML incompleto/não fechado')
            return coordinates
        exterior = ring('k:outerBoundaryIs/k:LinearRing/k:coordinates')
        interiors = []
        for inner in polygon.findall('k:innerBoundaryIs', ns):
            text = inner.findtext('k:LinearRing/k:coordinates', '', ns)
            interior = [list(map(float, token.split(',')[:2])) for token in text.split()]
            if len(interior) < 4 or interior[0] != interior[-1]:
                raise ValueError('Furo KML inválido')
            interiors.append(interior)
        polygons.append([exterior, *interiors])
    kml.append({'key': f'{farm}|{code}', 'sourceCode': source_code, 'properties': properties, 'polygonsLonLat': polygons})

book = openpyxl.load_workbook(args.xlsx, read_only=True, data_only=True)
formulas = openpyxl.load_workbook(args.xlsx, read_only=True, data_only=False)
groups, extraction_issues = [], []
sheet_map = {'Fazenda Bananal': 'Bananal', 'Fazenda Rio de Janeiro': 'Rio de Janeiro'}
for sheet, farm in sheet_map.items():
    sh = book[sheet]
    for row_number, row in enumerate(sh.iter_rows(values_only=True), 1):
        if not isinstance(row[0], (int, float)) or not isinstance(row[1], str):
            continue
        members = expand_group(row[1], known[farm])
        numbers = list(row[2:8])
        if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in numbers):
            raise ValueError('Dados numéricos da planilha ausentes ou sem cache')
        if row[2] <= 0 or not 0 <= row[3] < 360:
            raise ValueError('Área ou rumo fora do domínio')
        groups.append({'farm': farm, 'sheet': sheet, 'row': row_number, 'label': row[1],
                       'seasonHeader': sh['A4'].value, 'members': members,
                       'areaHa': row[2], 'bearingTrueDeg': row[3],
                       'aLonLat': [row[5], row[4]], 'bLonLat': [row[7], row[6]],
                       'formulaCells': [c.coordinate for c in formulas[sheet][row_number][:8] if c.data_type == 'f']})

bbox = OUT / 'guia-bbox-private.html'
subprocess.check_call(['pdftotext', '-bbox-layout', str(args.pdf), str(bbox)])
pages = ET.parse(bbox).findall('.//{http://www.w3.org/1999/xhtml}page')
pdf_records = []
for page_number, page in enumerate(pages, 1):
    words = page.findall('.//{http://www.w3.org/1999/xhtml}word')
    header = re.sub(r'\s+', '', normalize(' '.join(w.text or '' for w in words if float(w.attrib['yMin']) < 80)))
    if 'FICHADIMENSIONAL' not in header:
        continue
    farm = 'Bananal' if 'BANANAL' in header else 'Rio de Janeiro' if 'RIODEJANEIRO' in header else None
    if farm is None:
        extraction_issues.append({'page': page_number, 'reason': 'farm-not-identified'})
        continue
    labels = []
    for word in words:
        if not (20 < float(word.attrib['xMin']) < 130 and 80 < float(word.attrib['yMin']) < 200):
            continue
        try:
            codes = expand_group(word.text, known[farm])
        except ValueError:
            continue
        if len(codes) == 1:
            labels.append((word, codes[0]))
    if len(labels) != 1:
        extraction_issues.append({'page': page_number, 'reason': 'main-field-label-ambiguous'})
        continue
    label, canonical_code = labels[0]
    area_words = [w for w in words if re.fullmatch(r'[\d.]+,\d{2}', w.text or '') and float(w.attrib['xMin']) > 200 and abs(float(w.attrib['yMin']) - float(label.attrib['yMin'])) < 12]
    if len(area_words) != 1:
        extraction_issues.append({'page': page_number, 'reason': 'official-area-ambiguous'})
        continue
    geom_area = None
    for line in page.findall('.//{http://www.w3.org/1999/xhtml}line'):
        text = ' '.join(w.text or '' for w in line.findall('{http://www.w3.org/1999/xhtml}word'))
        if 'AREAGEOMETRICADOKML' in re.sub(r'\s+', '', normalize(text)):
            matches = re.findall(r'[\d.]+,\d+', text)
            if len(matches) == 1:
                geom_area = br_number(matches[0])
    pdf_records.append({'key': f'{farm}|{canonical_code}', 'page': page_number,
                        'officialAreaHa': br_number(area_words[0].text), 'reportedKMLAreaHa': geom_area})

result = {'inputs': manifest, 'htmlSha256': hashlib.sha256((ROOT / 'index.html').read_bytes()).hexdigest(),
          'scope': list(known), 'allKMLPlacemarks': len(all_placemarks), 'kml': kml,
          'workbookSheetCount': len(book.sheetnames), 'groups': groups,
          'pdfPages': len(pages), 'pdf': pdf_records, 'extractionIssues': extraction_issues}
(OUT / 'sources-private.json').write_text(json.dumps(result, ensure_ascii=False))
print(json.dumps({'inputs': manifest, 'scopeKMLRecords': len(kml), 'groups': len(groups),
                  'pdfFields': len(pdf_records), 'pdfPages': len(pages), 'extractionIssues': extraction_issues}, ensure_ascii=False, indent=2))
