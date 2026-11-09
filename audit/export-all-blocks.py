"""Entrega uma prévia HTML somente de leitura e a matriz de validação local."""
from pathlib import Path
import base64
import hashlib
import json
import math
import re
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.table import Table, TableStyleInfo

ROOT = Path(__file__).resolve().parent.parent
PRIVATE = ROOT / 'audit/results/all-blocks'
OUT = ROOT.parent / 'entregas-schmidt/validacao-todos-lotes-blocos'
OUT.mkdir(parents=True, exist_ok=True)
r = json.loads((PRIVATE / 'validation-private.json').read_text())
refs = json.loads((PRIVATE / 'individuals-private.json').read_text())
src = json.loads((ROOT / 'audit/results/revalidacao-2026/crosscheck-private.json').read_text())
app = json.loads(re.search(r'<script[^>]*id="fields-data"[^>]*>(.*?)</script>', (ROOT / 'index.html').read_text(), re.S)[1])['fields']
labels = {'sampled-geometry-pass-access-pending': 'Atendeu geometria/cobertura amostrada; acesso pendente',
          'geometry-feasible-coverage-tradeoff-review': 'Geometria viável; comparar perdas de cobertura',
          'needs-redistribution-in-restricted-search': 'Exige redistribuição neste método de ensaio'}
passed = [b for b in r['blocks'] if b.get('best')]


def caption(keys):
    return ' + '.join(k.split('|')[1] for k in keys)


def tab(w, name, headings, rows):
    sh = w.create_sheet(name); sh.append(headings)
    for row in rows: sh.append(row)
    sh.freeze_panes = 'C2' if name in ['Individuais51', 'Combinacoes202', 'PorLoteCandidato'] else 'A2'
    sh.sheet_view.showGridLines = False
    for c in sh[1]:
        c.font = Font(name='Calibri', bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='17594A')
        c.alignment = Alignment(wrap_text=True, vertical='center')
    sh.row_dimensions[1].height = 34
    for row in sh.iter_rows(min_row=2):
        for c in row:
            c.alignment = Alignment(wrap_text=True, vertical='top')
            if isinstance(c.value, float): c.number_format = '0.000'
            elif isinstance(c.value, str): c.data_type = 's'
    for column in sh.columns:
        sh.column_dimensions[column[0].column_letter].width = min(54, max(15, max(len(str(c.value or '')) for c in column[:35]) * .75))
    table = Table(displayName='Estudo' + str(len(w.worksheets)), ref=sh.dimensions)
    table.tableStyleInfo = TableStyleInfo(name='TableStyleMedium4', showRowStripes=True); sh.add_table(table)
    return sh


w = Workbook(); w.remove(w.active)
tab(w, 'Resumo', ['Item', 'Resultado', 'Interpretação'], [
 ['Lotes individuais', 51, 'Todos disponíveis; planos iniciais preservados.'],
 ['Pontos individuais', 749, 'Todos os mínimos atendidos; perfil de teste inicial, não leitura dos aparelhos da equipe.'],
 ['Grupos de referência com vários lotes', 16, 'Também foram avaliados subconjuntos e vizinhos de rumo compatível.'],
 ['Combinações avaliadas', len(r['blocks']), 'Alternativas com membros repetidos; não ativar como blocos simultâneos.'],
 ['Grades testadas', r['summary']['testedGridCandidates'], 'Fases em múltiplos de 36,48 m e espaçamentos dos individuais.'],
 ['Atenderam critérios amostrados', len(passed), 'Candidatas geométricas; sem autorização automática de passagem.'],
 ['Geometria com perda de cobertura', r['summary']['statusCounts'].get('geometry-feasible-coverage-tradeoff-review', 0), 'Comparar ou otimizar; não ocultar piora de algum lote.'],
 ['Precisam redistribuir neste método', r['summary']['statusCounts'].get('needs-redistribution-in-restricted-search', 0), 'Não significa impossibilidade com outro gerador.'],
 ['Recuo do ensaio', '50 m', 'Valor de teste, não recomendação agronômica.'],
 ['Busca de vizinhos', 'Até 100 m / eixo até 0,05°', 'Critério de triagem; proximidade não valida acesso.'],
 ['P6', 'Preservado', 'Revisão adiada pelo proprietário; demais lotes seguem.'],
 ['Execução de campo liberada', 'Não', 'Acesso, roteiro, tempo, datum e base histórica continuam pendentes.']])
tab(w, 'Individuais51', ['Fazenda', 'Lote', 'Pontos', 'Mínimo', 'Espaçamento m', 'Pontos externos no KML', 'Distância mínima à borda m', 'Individual disponível', 'P6'],
 [[*x['field'].split('|'), x['points'], x['minimum'], x['spacingM'], x['baselineClearance']['outside'], x['baselineClearance']['minimumPointToBoundaryM'], 'Sim', 'Manter; revisão adiada' if x['p6ReviewDeferred'] else ''] for x in r['individuals']])
rows = []
for b in r['blocks']:
    best = b.get('best')
    rows.append([b['id'], b['members'][0].split('|')[0], caption(b['members']), len(b['members']),
      labels.get(b['status'], b['status']), sum(b['pointCountsByField'].values()), sum(b['minimumPointsByField'].values()),
      b.get('testedCandidates', 0), b.get('feasibleCandidates', 0), b.get('acceptedGeometryCandidates', 0),
      best['spacingM'] if best else None, best['offsetFromABM'] if best else None,
      b.get('anchorGroup'), 'Curta; conferir em campo' if b.get('shortAnchor') else '',
      ', '.join(b.get('sourceTopologyWarnings', [])), 'Não', 'Sim', ', '.join(b['origins'])])
tab(w, 'Combinacoes202', ['ID', 'Fazenda', 'Membros', 'Nº lotes', 'Resultado do estudo', 'Pontos mantidos', 'Soma mínimos',
 'Grades testadas', 'Grades viáveis', 'Grades sem piora amostrada', 'Espaçamento escolhido m', 'Fase a partir A/B m',
 'Referência', 'Revisão de referência', 'Topologia fonte', 'Acesso validado', 'Individual disponível', 'Origem da triagem'], rows)
full_groups = []
for g in src['groups']:
    if len(g['members']) < 2: continue
    full = next(b for b in r['blocks'] if set(b['members']) == set(g['members']))
    accepted_subsets = [caption(b['members']) for b in passed if set(b['members']) <= set(g['members'])]
    full_groups.append([g['farm'], g['group'], caption(g['members']), labels.get(full['status'], full['status']),
                        '; '.join(accepted_subsets), 'Sim'])
tab(w, 'GruposOrigem16', ['Fazenda', 'Grupo planilha', 'Membros', 'Grupo completo', 'Subconjuntos que atenderam', 'Individual disponível'], full_groups)
member_rows = []
for b in passed:
    for key in b['members']:
        old = b['baselineCoverage'][key]; new = b['best']['coverage'][key]
        member_rows.append([b['id'], caption(b['members']), *key.split('|'), b['pointCountsByField'][key], b['minimumPointsByField'][key],
          old['p95M'], new['p95M'], old['maximumAtCellCentresM'], new['maximumAtCellCentresM'],
          b['best']['minimumBoundaryDistanceByFieldM'][key], 'Não'])
tab(w, 'PorLoteCandidato', ['ID bloco', 'Alternativa', 'Fazenda', 'Lote', 'Pontos', 'Mínimo', 'P95 antes m', 'P95 depois m',
 'Máximo nos centros antes m', 'Máximo nos centros depois m', 'Menor distância à borda m', 'Execução liberada'], member_rows)
tab(w, 'Pendencias', ['Tema', 'Regra'], [
 ['Acesso', 'Nenhum corredor foi homologado; não desenhar uma reta livre entre lotes.'],
 ['Alternativas sobrepostas', 'BB1 pode aparecer em mais de uma opção. Escolher um plano/revisão por atividade, sem duplicar coleta.'],
 ['Individual', 'Um lote membro de bloco continua podendo ser feito sozinho. Simulação não sobrescreve seu plano.'],
 ['P6', 'Manter atual; divergência registrada e revisão adiada pelo proprietário.'],
 ['Recuo', '50 m somente para este ensaio; a regra operacional depende da atividade.'],
 ['Cobertura', 'P95 e máximo nos centros de grade fixa; não prova o máximo contínuo nem homologação agronômica.'],
 ['Fontes', 'Base KML histórica; planilha 25/26 e datum não declarado.'],
 ['Rendimento', 'Não há roteiro/equipe/tempo validado. Menos desalinhamento não comprova economia.'],
 ['Novo cálculo', 'Alterar parâmetros ou fontes invalida bloco antigo; individual atualizado permanece disponível.']])
tab(w, 'Fontes', ['Tipo', 'Arquivo', 'SHA-256'], [[k, v['fileName'], v['sha256']] for k, v in src['summary']['inputs'].items()])
book_path = OUT / 'Validacao_Todos_Lotes_Individual_Bloco.xlsx'; w.save(book_path)
check = load_workbook(book_path, read_only=True, data_only=False)
assert check['Individuais51'].max_row == 52 and check['Combinacoes202'].max_row == len(r['blocks']) + 1
assert not any(c.data_type == 'f' for sh in check for row in sh for c in row)


def polygons_from_mapping(geometry):
    if geometry['type'] == 'Polygon': return [geometry['coordinates']]
    if geometry['type'] == 'MultiPolygon': return geometry['coordinates']
    raise ValueError('Tipo de geometria inesperado')


def preview_plan(polys, segments, clouds, counts, minima, spacing, title, farm, reference, warning):
    vertices = [p for shape in polys.values() for poly in shape for p in poly[0]]
    x0, y0 = min(p[0] for p in vertices), min(p[1] for p in vertices)
    x1, y1 = max(p[0] for p in vertices), max(p[1] for p in vertices)
    scale = 900 / max(x1 - x0, y1 - y0)
    def xy(p): return [round(500 + (p[0] - (x0 + x1) / 2) * scale, 4), round(500 - (p[1] - (y0 + y1) / 2) * scale, 4)]
    along_distances = []
    for key, lines in segments.items():
        for line in lines:
            a, b = line[0], line[-1]; length = math.hypot(b[0] - a[0], b[1] - a[1])
            if length <= 1e-9: continue
            ux, uy = (b[0] - a[0]) / length, (b[1] - a[1]) / length
            positions = []
            for p in clouds[key]:
                dx, dy = p['x'] - a[0], p['y'] - a[1]; s = dx * ux + dy * uy
                if abs(dx * uy - dy * ux) < 1e-5 and -1e-5 <= s <= length + 1e-5: positions.append(s)
            positions.sort(); along_distances += [b - a for a, b in zip(positions, positions[1:])]
    nice = [m for m in [20, 50, 100, 200, 500, 1000, 2000] if m <= (x1 - x0) / 4]
    bar = nice[-1] if nice else 10
    return {'title': title, 'farm': farm, 'reference': reference, 'warning': warning,
      'points': sum(counts.values()), 'minimum': sum(minima.values()), 'spacingM': spacing,
      'alongRangeM': [min(along_distances), max(along_distances)] if along_distances else None,
      'members': [{'key': k, 'code': k.split('|')[1], 'points': counts[k], 'minimum': minima[k]} for k in counts],
      'shapes': [{'key': k, 'polys': [[[xy(p) for p in ring] for ring in poly] for poly in shapes]} for k, shapes in polys.items()],
      'lines': [list(map(xy, line)) for lines in segments.values() for line in lines],
      'dots': [{'xy': xy([p['x'], p['y']]), 'label': k.split('|')[1] + ' · ' + p['id']} for k, pts in clouds.items() for p in pts],
      'scaleBarPixels': bar * scale, 'scaleBarM': bar}


preview = {'individual': {}, 'block': {}, 'summary': r['summary']}
for key, f in refs['fields'].items():
    preview['individual'][key] = preview_plan({key: app[key]['geom']}, {key: [u['line'] for u in f['units']]}, {key: f['samples']},
      {key: len(f['samples'])}, {key: f['minimum']}, f['deltaM'], key.split('|')[1], key.split('|')[0], app[key]['ref'],
      'P6 preservado; revisão adiada.' if key == 'Rio de Janeiro|P6' else 'Referência individual inicial; dados do aparelho não foram carregados.')
for block in passed:
    candidate = json.loads((PRIVATE / f'{block["id"]}-candidate-private.json').read_text())
    assert candidate['analysisFingerprint'] == r['summary']['analysisFingerprint']
    poly = {k: polygons_from_mapping(g) for k, g in candidate['geometryMapping'].items()}
    lines = {k: [s['line'] for s in candidate['grid']['segments'] if s['field'] == k] for k in block['members']}
    preview['block'][block['id']] = preview_plan(poly, lines, candidate['samples'], block['pointCountsByField'],
      block['minimumPointsByField'], block['best']['spacingM'], caption(block['members']), block['members'][0].split('|')[0], block['anchorGroup'],
      'Candidata geométrica; acesso e roteiro pendentes.' + (' Referência A/B curta: conferir em campo.' if block['shortAnchor'] else ''))
dataset = json.dumps(preview, ensure_ascii=False).replace('<', '\\u003c')
script = r'''const D=JSON.parse(document.getElementById('data').textContent),mode=document.getElementById('scope'),pick=document.getElementById('pick');
const state={individual:'Bananal|BB1',block:'1a2a29fae23acb90'};let current;
const fmt=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:1});
const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;};
const sv=(tag,attrs={})=>{const x=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))x.setAttribute(k,v);return x;};
function render(){const kind=mode.value;state[kind]=pick.value;current=D[kind][pick.value];document.getElementById('name').textContent=current.farm+' · '+current.title;
 document.getElementById('counts').textContent=current.points+' pontos';document.getElementById('minimum').textContent='Mínimo por lote somado: '+current.minimum;
 document.getElementById('across').textContent=fmt(current.spacingM)+' m';document.getElementById('along').textContent=current.alongRangeM?fmt(current.alongRangeM[0])+' a '+fmt(current.alongRangeM[1])+' m':'Sem intervalo no trecho';
 document.getElementById('warning').textContent=current.warning;document.getElementById('reference').textContent='Referência: '+current.reference;
 const members=document.getElementById('members');members.replaceChildren();for(const member of current.members){const b=el('button',member.code+' · '+member.points+' pontos');b.type='button';b.dataset.member=member.key;b.onclick=()=>{state.individual=member.key;mode.value='individual';options();};members.append(b);}
 const map=document.getElementById('map');map.replaceChildren();
 for(const shape of current.shapes){let d='';for(const poly of shape.polys)for(const ring of poly)d+='M'+ring.map(p=>p.join(',')).join('L')+'Z';const path=sv('path',{d,fill:'#e3f0ea',stroke:'#17594a','stroke-width':2,'fill-rule':'evenodd'});path.append(sv('title'));path.firstChild.textContent=shape.key;map.append(path);}
 for(const line of current.lines)map.append(sv('polyline',{points:line.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#096f86','stroke-width':2}));
 for(const p of current.dots){const c=sv('circle',{cx:p.xy[0],cy:p.xy[1],r:4.2,fill:'#95521c',stroke:'white','stroke-width':1});const title=sv('title');title.textContent=p.label;c.append(title);map.append(c);}
 map.append(sv('path',{d:'M950 125V55M944 65L950 55L956 65',stroke:'#17594a',fill:'none','stroke-width':3}));const north=sv('text',{x:950,y:43,'text-anchor':'middle',fill:'#17594a','font-size':22});north.textContent='N';map.append(north);
 map.append(sv('path',{d:'M50 970H'+(50+current.scaleBarPixels),stroke:'#17594a','stroke-width':3}));const scale=sv('text',{x:50,y:955,fill:'#17594a','font-size':20});scale.textContent=current.scaleBarM+' m';map.append(scale);
 document.body.dataset.mode=kind;document.body.dataset.selection=pick.value;document.body.dataset.pointCount=current.points;
}
function options(){const kind=mode.value;pick.replaceChildren();for(const[key,p]of Object.entries(D[kind])){const o=el('option',p.farm+' · '+p.title);o.value=key;pick.append(o);}if(D[kind][state[kind]])pick.value=state[kind];render();}
mode.onchange=options;pick.onchange=render;options();'''
csp_hash = base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()
html = '''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-HASH'; base-uri 'none'; form-action 'none'">
<title>SCHMIDT Campo · prévia individual e bloco</title><style>
*{box-sizing:border-box}body{margin:0;background:#eaf0ec;color:#163e2f;font:16px/1.4 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:18px}h1{font-size:22px;margin:0 0 4px}p{margin:5px 0}.muted{color:#56685f;font-size:13px}.panel{background:white;border:1px solid #cadbd0;border-radius:12px;padding:16px;margin-top:14px}.controls{display:grid;grid-template-columns:180px 1fr;gap:12px}label{font-size:14px;font-weight:600}select,button{font:inherit;color:#17594a;background:#f3f7f4;border:1px solid #78948a;border-radius:8px;min-height:44px;padding:8px}select{width:100%;margin-top:5px}h2{font-size:20px;margin:0 0 6px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}.metric{border:1px solid #cadbd0;border-radius:9px;padding:9px}.metric span{display:block;font-size:13px;color:#56685f}.metric strong{display:block;font-size:21px;color:#17594a;overflow-wrap:anywhere}.notice{background:#fff3d9;color:#8a5414;border:1px solid #d8c6a8;border-radius:8px;padding:9px;font-size:14px}#members{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}#members button{font-size:13px;cursor:pointer}svg{display:block;width:100%;height:min(65vh,700px);background:#fff;border:1px solid #cadbd0;border-radius:8px}details{margin-top:14px}summary{cursor:pointer;font-weight:600;padding:8px 0}@media(max-width:600px){main{padding:10px}.panel{padding:12px}.controls{grid-template-columns:1fr}.stats{grid-template-columns:1fr 1fr}.metric:first-child{grid-column:1/-1}.metric strong{font-size:20px}svg{height:450px}}
</style><main><h1>SCHMIDT Campo · prévia de planejamento</h1><p class="muted">PROJEÇÃO LOCAL · somente leitura · não altera o aplicativo nem libera execução em campo.</p>
<section class="panel controls"><label>Modo<select id="scope"><option value="individual">Lote individual</option><option value="block">Bloco — candidatas geométricas</option></select></label><label>Lote ou conjunto<select id="pick"></select></label></section>
<section class="panel"><h2 id="name"></h2><p class="notice" id="warning"></p><div class="stats"><div class="metric"><span>Plano exibido</span><strong id="counts"></strong><span id="minimum"></span></div><div class="metric"><span>Entre tiros / eixos</span><strong id="across"></strong></div><div class="metric"><span>Entre pontos no mesmo trecho</span><strong id="along"></strong></div></div><div id="members" aria-label="Consultar um lote individual"></div><svg id="map" viewBox="0 0 1000 1000" role="img" aria-label="Contornos, tiros e pontos do plano em prévia"></svg>
<details><summary>Referência e limites do ensaio</summary><p id="reference"></p><p class="muted">Blocos: 50 m de recuo de ensaio, não recomendação. Cobertura amostrada por lote, sem validação de acesso, percurso ou tempo. As opções podem repetir lotes: escolha uma alternativa por atividade. Os individuais reproduzem um perfil inicial de teste, sem carregar dados dos aparelhos.</p><p class="muted">O P6 mantém a referência atual, com revisão adiada. Nenhuma marcação de coleta é copiada.</p></details></section></main>
<script type="application/json" id="data">DATA</script><script>SCRIPT</script></html>'''
html = html.replace('HASH', csp_hash).replace('DATA', dataset).replace('SCRIPT', script)
preview_path = OUT / 'Previa_Individual_Bloco.html'; preview_path.write_text(html)
(OUT / 'RESUMO-VALIDACAO.json').write_text(json.dumps(r['summary'], ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'workbook': str(book_path), 'preview': str(preview_path), 'individuals': len(preview['individual']), 'blockOptions': len(preview['block'])}, ensure_ascii=False))
