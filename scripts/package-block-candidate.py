"""Empacota a candidata local testada, fontes versionadas e matriz sem GPS."""
from pathlib import Path
import hashlib
import importlib.util
import json
import subprocess
import os
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill

root = Path(__file__).resolve().parent.parent
release = json.loads((root / 'audit/block-candidate.json').read_text())
out = root.parent / 'entregas-schmidt' / release['directory']
results = root / 'audit/results' / release['resultsDirectory']
spec = importlib.util.spec_from_file_location('delivery', root / 'scripts/package-delivery.py')
delivery = importlib.util.module_from_spec(spec); spec.loader.exec_module(delivery)
def git(*args): return subprocess.check_output(['git', *args], cwd=root)
if git('status', '--porcelain').strip(): raise SystemExit('Commitar a candidata antes de empacotar')
commit = git('rev-parse', 'HEAD').decode().strip()
meta = json.loads((out / 'CANDIDATA.json').read_text())
assert hashlib.sha256((out / 'index.html').read_bytes()).hexdigest() == meta['htmlSha256']
r = json.loads((results / 'report-private.json').read_text())
ui = json.loads((results / 'ui-report.json').read_text())
spatial = json.loads((results / 'independent-spatial-report.json').read_text())
assert len(r['groups']) == 40 and not r['errors'] and not ui['errors']
assert all(not g['coverageTradeoff'] for g in r['groups'])
readme = f'''SCHMIDT Campo — {release['version']}
Snapshot Git: {commit}

Candidata local testada; não é a versão do link público nem APK assinado.
Extraia o ZIP Web em uma pasta separada. Sirva essa pasta em localhost,
por exemplo: python -m http.server 8080 --bind 127.0.0.1
Abra http://127.0.0.1:8080/ no navegador. Use um perfil de teste separado.
Não substitua o site publicado para experimentar esta entrega.

Plano > depois do resumo do individual > Planejamento > Modo bloco.
Escolha os lotes, Preparar bloco e Usar bloco. Botões de membros abrem
o lote no mapa/monitoramento atuais. Escolha o tiro antes de marcar.
O botão Bloco do cabeçalho volta à etapa Plano. Volte ao modo individual
para recuperar seus planos e marcações individuais. Coletas não migram
automaticamente entre individual e bloco. Retomar preserva o bloco salvo.

40 opções por referência comum; incluem pares e conjuntos completos.
Não execute alternativas sobrepostas como atividades independentes.
Alguns blocos precisam de pontos adicionais para manter a comparação
de cobertura; a quantidade é mostrada antes da aplicação.
Distância real à borda não é recomendação agronômica. Conferir acesso,
obstáculos e orientação em campo. Não há rota automática entre lotes.
Pontos são simulados, sem homologação de datum ou ensaio físico Android.

GPX exporta pontos de todos os membros. O backup completo v2 guarda
individual e blocos com hash; restauração foi testada em perfil limpo.
Faça backup antes de migrar qualquer aparelho. APK não foi distribuído.
Site publicado e dados da equipe permanecem intactos.
'''
(out / 'LEIA-ME.txt').write_text(readme)
w = Workbook(); sh = w.active; sh.title = '40 opcoes'
sh.append(['Bloco', 'Lotes', 'Pontos no bloco', 'Mínimo somado', 'Adicionais sobre mínimo', 'Entre eixos m', 'Cobertura amostrada atendida', 'Rota homologada'])
for g in r['groups']:
    n = sum(x['points'] for x in g['counts'].values()); minimum = sum(x['minimum'] for x in g['counts'].values())
    sh.append([g['id'], ' + '.join(k.split('|')[1] for k in g['members']), n, minimum, n-minimum, g['common']['spacingM'], 'Sim', 'Não'])
fields = w.create_sheet('88 conferencias por lote')
fields.append(['Bloco', 'Lote', 'Pontos', 'Mínimo', 'Menor distância à borda m', 'P95 individual m', 'P95 bloco m', 'Máximo individual m', 'Máximo bloco m'])
for x in spatial['rows']: fields.append([x['block'], x['field'], x['points'], x['minimum'], x['minimumBorderM'], x['coverageBefore']['p95'], x['coverageAfter']['p95'], x['coverageBefore']['max'], x['coverageAfter']['max']])
for sheet in w:
    sheet.freeze_panes = 'C2'; sheet.auto_filter.ref = sheet.dimensions
    for cell in sheet[1]: cell.font = Font(bold=True,color='FFFFFF'); cell.fill = PatternFill('solid',fgColor='17594A')
    for col in sheet.columns: sheet.column_dimensions[col[0].column_letter].width = 34 if col[0].column <= 2 else 24
book = out / 'Blocos_Referencia_Comum_Validacao.xlsx'; w.save(book)
assert load_workbook(book,read_only=True).worksheets[0].max_row == 41
web = {name:(out / name).read_bytes() for name in ['index.html','sw.js','manifest.webmanifest','icone.svg','icone-180.png','icone-192.png','icone-512.png','CANDIDATA.json','VERSAO.json','LEIA-ME.txt']}
web_zip=out / ('SCHMIDT-Campo-'+release['version']+'-Web.zip')
web_zip.write_bytes(delivery.archive(web))
source = {name:git('show',f'HEAD:{name}') for name in git('ls-files').decode().splitlines()}
source['LEIA-ME-CANDIDATA.txt'] = readme.encode()
modes = {line.split('\t',1)[1]:int(line.split(' ',1)[0],8) for line in git('ls-files','--stage').decode().splitlines()}
(out / ('SCHMIDT-Campo-'+release['version']+'-Fonte-e-Testes.zip')).write_bytes(delivery.archive(source,modes))
files = {p.name:{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}
         for p in sorted(out.iterdir()) if p.is_file() and p.name != 'MANIFESTO-ENTREGA.json'}
(out / 'MANIFESTO-ENTREGA.json').write_text(json.dumps({'version':meta['version'],'commit':commit,'production':False,'files':files},ensure_ascii=False,indent=2)+'\n')
if os.environ.get('GITHUB_OUTPUT'):
    with open(os.environ['GITHUB_OUTPUT'],'a') as output:
        output.write('web_zip='+str(web_zip.resolve())+'\n')
print(json.dumps({'commit':commit,'webFiles':len(web),'sourceFiles':len(source),'workbook':str(book)},ensure_ascii=False))
