"""Entrega local de conferência sem copiar coordenadas ou anexos para o repositório."""
from pathlib import Path
import json
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.table import Table, TableStyleInfo

ROOT = Path(__file__).resolve().parent.parent
r = json.loads((ROOT / 'audit/results/revalidacao-2026/crosscheck-private.json').read_text())
s = r['summary']
OUT = ROOT.parent / 'entregas-schmidt/revalidacao-fontes-bb1-bc1'
OUT.mkdir(parents=True, exist_ok=True)
w = Workbook()
w.remove(w.active)


def sheet(name, headings, rows):
    sh = w.create_sheet(name)
    sh.append(headings)
    for row in rows:
        sh.append(row)
    sh.freeze_panes = 'A2'
    sh.sheet_view.showGridLines = False
    for cell in sh[1]:
        cell.font = Font(name='Calibri', size=11, color='FFFFFF', bold=True)
        cell.fill = PatternFill('solid', fgColor='17594A')
        cell.alignment = Alignment(wrap_text=True, vertical='center')
    sh.row_dimensions[1].height = 34
    for row in sh.iter_rows(min_row=2):
        for cell in row:
            cell.font = Font(name='Calibri', size=11, color='163E2F')
            cell.alignment = Alignment(vertical='top', wrap_text=True)
            if isinstance(cell.value, float):
                cell.number_format = '0.0000'
            elif isinstance(cell.value, str):
                cell.data_type = 's'
    for column in sh.columns:
        sh.column_dimensions[column[0].column_letter].width = min(55, max(15, max(len(str(c.value or '')) for c in column[:30]) * .8))
    table = Table(displayName='Conferencia' + str(len(w.worksheets)), ref=sh.dimensions)
    table.tableStyleInfo = TableStyleInfo(name='TableStyleMedium4', showRowStripes=True)
    sh.add_table(table)
    sh.print_title_rows = '1:1'
    return sh


sheet('Resumo', ['Verificação', 'Resultado', 'Interpretação'], [
    ['Escopo', 51, 'Somente Bananal e Rio de Janeiro; demais fazendas dos anexos não incorporadas.'],
    ['Lotes do KML correspondentes', s['kmlMatchedFields'], 'Contornos com metadado de base histórica 2024/25.'],
    ['Fichas do PDF correspondentes', s['pdfMatchedFields'], 'Extração por posição do texto visível; 56 páginas no total.'],
    ['Grupos A/B da planilha', s['xlsxGroups'], 'Cobrem cada um dos 51 lotes exatamente uma vez.'],
    ['Áreas oficiais PDF iguais ao app', 51 - len(s['pdfOfficialAreasDifferentFromApp']), 'Não substituir área oficial por área geométrica.'],
    ['Áreas KML do PDF coerentes com geodésica', 51 - len(s['pdfKMLAreaDiffAbove001Ha']), 'Conferência em hectares, diferença até 0,01; não é precisão de levantamento.'],
    ['Coleções sobrepostas/repetidas', len(s['sourceOverlappingCollections']), 'Diagnóstico em cópia; não reescrever contornos automaticamente.'],
    ['Limites diferentes do app acima de 5 cm', s['fieldsBoundaryDifferenceAbove5cm'], 'Limiar diagnóstico; máximo aproximado 0,62 m. Não homologa ou reprova GPS.'],
    ['Referências A/B menores que 50 m', len(s['shortABGroups']), 'Sinal para revisão, não comprovação de coordenada errada.'],
    ['Rumos divergentes acima de 0,05°', len(s['axisDisagreementAbove005deg']), 'Pivô-6: aproximadamente 60,8°; não escolher automaticamente um dos valores.'],
    ['Datum declarado na planilha', 'Não identificado', 'Interpretação EPSG:4326 usada como hipótese de conferência numérica.'],
    ['Referência BB1-BC1', 'Consistente no teste numérico', 'A/B de cerca de 699,46 m; rumo declarado 333,1691°. Acesso não validado.'],
    ['App publicado alterado', 'Não', 'Revalidação, projeção e documentos permanecem locais.'],
    ['Resultado global', 'Conferido, sem homologação de campo', 'A/B define eixo de referência; grade também exige fase, espaçamento e validação de percurso.']])

rows = []
for row in r['geometries']:
    farm, code = row['key'].split('|')
    rows.append([farm, code, row.get('pdfOfficialAreaHa'), row.get('officialAreaDifferenceFromAppHa'),
      row.get('currentAreaHa'), row.get('sourceAreaUTMHa'), row.get('sourceUnionGeodesicAreaHa'),
      row.get('pdfReportedKMLAreaHa'), row.get('pdfKMLAreaDifferenceFromGeodesicHa'),
      row.get('sourceToAppBoundaryHausdorffM'), row.get('sourcePolygons'),
      'Revisar sobreposição' if not row.get('sourceCollectionValid', False) else 'Sem sobreposição nesta coleção'])
sheet('Lotes51', ['Fazenda', 'Lote', 'Área oficial PDF ha', 'PDF menos app ha', 'Geom. app UTM ha',
 'Geom. anexo UTM ha', 'Geom. anexo geodésica ha', 'Geom. informada PDF ha',
 'PDF menos geodésica ha', 'Diferença de limite m', 'Polígonos na fonte', 'Topologia da coleção'], rows)

rows = []
for g in r['groups']:
    rows.append([g['farm'], g['group'], ', '.join(k.split('|')[1] for k in g['members']), g['sourceRow'],
      g['declaredBearingTrueDeg'], g['calculatedBearingTrueDeg'], g['axisDifferenceDeg'],
      g['calculatedBearingGridDeg'], g['abLengthM'], 'Revisar referência curta' if g['shortReferenceUnder50M'] else 'Referência acima de 50 m',
      g['areaGroupXLSXHa'], g['sumOfficialMemberAreasHa'], g['groupAreaDifferenceHa'],
      max(p['appReferenceAResidualM'] for p in g['references']),
      'Revisar rumo / A-B' if g['axisDifferenceDeg'] > .05 else 'Coerência angular numérica'])
sh = sheet('Referencias27', ['Fazenda', 'Grupo planilha', 'Lotes membros', 'Linha de origem',
 'Rumo declarado verdadeiro °', 'Azimute A-B verdadeiro °', 'Diferença de eixo °', 'Azimute na grade UTM °',
 'Comprimento A-B m', 'Diagnóstico de comprimento', 'Área grupo XLSX ha', 'Soma áreas PDF ha',
 'XLSX menos soma PDF ha', 'Resíduo numérico A no app m', 'Diagnóstico angular'], rows)
for row in sh.iter_rows(min_row=2):
    if row[6].value > .05:
        for cell in row: cell.fill = PatternFill('solid', fgColor='FBE9E7')

sheet('Pendencias', ['Item', 'Evidência', 'Próxima ação'], [
 ['Safras e procedência', 'XLSX 25/26; KML/guia indicam base 24/25.', 'Confirmar validade atual. O nome do arquivo não comprova levantamento 26/27.'],
 ['Datum da planilha', 'Nenhuma declaração encontrada nos cabeçalhos/notas das abas alvo.', 'Confirmar com responsável; resíduos numéricos não são precisão GPS.'],
 ['Pivô-6', 'Divergência de eixo cerca de 60,8° e A/B curto.', 'Conferir par A/B e rumo na origem. Não corrigir por hipótese.'],
 ['Áreas dos pivôs', 'Diferenças XLSX/PDF em P1 a P7.', 'Distinguir época e conceito de área; manter regra oficial atual até decisão.'],
 ['Topologia', 'BD3, BD4, RB8, RC8 com sobreposição/repetição.', 'Preservar fonte; união apenas em cópia de diagnóstico.'],
 ['Representação dos limites', '42 contornos diferem acima do limiar de 5 cm; máximo 0,62 m.', 'Investigar geração/simplificação, sem atribuir causa não provada.'],
 ['Ponto A compartilhado', 'A de BB1-BC1 fica em BB1 e fora de BC1.', 'Não exigir que o mesmo A pertença a todo membro; interpretar referência de grupo.'],
 ['Área BB1-BC1', 'XLSX 951,27 ha; soma PDF 951,25 ha.', 'Manter mínimo por lote: 26 + 23 = 49, não arredondar somente o total do bloco.'],
 ['Passagens e rendimento', 'Eixo comum não comprova corredor ou rota.', 'Conferir acesso; calcular percurso/equipe e comparar alternativas.']])

sheet('Fontes', ['Tipo', 'Arquivo', 'SHA-256', 'Bytes'], [[k, d['fileName'], d['sha256'], d['bytes']] for k, d in s['inputs'].items()])
path = OUT / 'Revalidacao_Bananal_RJ_Fontes_2026.xlsx'
w.save(path)
check = load_workbook(path, read_only=True, data_only=False)
assert check['Lotes51'].max_row == 52 and check['Referencias27'].max_row == 28
assert not any(c.data_type == 'f' for sh in check for row in sh for c in row)
print(str(path))
