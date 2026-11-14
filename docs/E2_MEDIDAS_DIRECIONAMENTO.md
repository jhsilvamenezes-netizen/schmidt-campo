# E2 — medidas de direcionamento conferidas com GEOS/PROJ

Versão auditada: 1.35.1 (main `2e4e2be`, HTML `cea2c21f…`). Executado em 14/11/2026.

## Como reproduzir

```bash
cd audit && node direction-measures-probe.mjs        # extrai do app: 51 lotes + 40 grupos (privado, results/)
python -m venv .venv && .venv/bin/pip install -r requirements-spatial.txt
.venv/bin/python -I direction-measures.py           # gera direction-measures-evidence.json (público)
```

O probe lê o app sem alterar parâmetros nem armazenamento. A auditoria recalcula de
forma independente (Shapely 2.1.2 / GEOS 3.13, pyproj 3.7.2 / PROJ 9.5.1) e sai com
código 1 se qualquer verificação passar da tolerância.

## Referências, unidades e tolerâncias

| Item | Definição |
|---|---|
| CRS | EPSG:32723 (WGS 84 / UTM 23S). Coordenadas do app = UTM − centroide do lote, em metros |
| Distâncias | De **grade** UTM. No terreno: fator de escala 0,999726–0,999778 nos 51 lotes, ou seja 0,10–0,12 m a menos em 438 m (0,02–0,03%). Irrelevante para direcionamento a pé; registrado para não ser confundido com erro |
| Tolerância geométrica | 1e-6 m: ruído de ponto flutuante em coordenadas locais. Acima disso é diferença de método |
| Tolerância de exportação | 1 mm: o app e o PROJ usam fórmulas diferentes para lon/lat; concordam muito abaixo disso |
| Tela | O cartão mostra metros inteiros; comparado com o cálculo arredondado |

## Resultado

| Verificação (item do plano) | Casos | Erro máximo |
|---|---|---|
| Entre tiros = distância perpendicular entre as retas (12) | 157 pares | 0 m |
| Tiros paralelos (12) | 157 pares | 0° |
| Texto "Entre tiros" do cartão = cálculo (12) | 51 lotes | 0 |
| Entre pontos = intervalo ao longo do mesmo trecho (12) | 538 intervalos | 0 m |
| Trecho do tiro inteiro dentro do lote (11) | 211 trechos | 0 m |
| Pontas do trecho sobre a divisa (11) | 422 pontas | 0 m |
| Nenhum trecho criado através de área externa (11) | 208 tiros | 0 m |
| Ponto dentro do lote / sobre o trecho / posição ao longo / sem duplicar (14) | 749 pontos cada | 0 m |
| Bloco: tiros paralelos e na mesma grade comum (10, 20) | 411 tiros, 147 intervalos | 0 m |
| Bloco: entre tiros múltiplo do espaçamento comum no lote (20) | 323 pares | 0 m |
| Bloco: pontos dentro do lote (14, 20) | 1.535 pontos | 0 m |
| Menor distância de ponto à divisa (13) | 51 lotes | registrada: 10,54 m no mínimo |
| Bloco: "Até a borda mais próxima" do ponto escolhido (13) | 1.535 pontos | 0 m |
| Bloco: "Ponto mais perto da borda" do painel (13) | 40 grupos | 0 m |
| Bloco: tiros vizinhos sempre a 1× o espaçamento comum (o cartão não esconde salto) | 323 pares | 0 |
| Exportação: lon/lat de cada ponto (GPX/GeoJSON/CSV) devolvido à grade pelo PROJ (23) | 749 pontos de lote + 1.535 de bloco | 0,000000002 m |
| Rumo: correção do lote = −convergência meridiana do PROJ (09) | 51 lotes | 0,00008° |
| Rumo: azimute de grade dos tiros = rumo + correção (09) | 51 lotes | 0° |

**Teste de mutação:** alterar de propósito um deslocamento (+1 cm), um intervalo (+1 cm),
um ponto (+50 cm), uma ponta de trecho (−1 m) e o texto do cartão faz a auditoria falhar
em cada caso. A conferência é sensível; o erro zero não é efeito de comparar o app com ele mesmo.

Correção no próprio método: o teste de paralelismo usava `acos`, que perde ~1e-6° perto
de zero e acusava 72 falsos desvios; passou a usar `atan2(|a×b|, a·b)`.

## Rumo e norte (item 09)

| Referência | Como o app usa |
|---|---|
| Norte verdadeiro | Rumo da planilha. Sem sentido: 333° e 153° dão a mesma linha de tiro |
| Norte de grade | Os tiros são retas na grade UTM: azimute de grade = rumo − convergência, com a correção calculada no centroide do lote (−0,19° a −0,20°) |
| Norte magnético | Não é usado nem deduzido. A bússola difere do norte verdadeiro pela declinação, que o app não informa |
| Tela | O mapa é desenhado na grade. Na orientação padrão (norte), para cima é o norte de grade, a 0,2° do verdadeiro. Ao girar pelo lote ou pelo rumo do GPS, a seta de norte gira junto. A diferença de 0,2° não aparece na tela |

Limite: a convergência muda dentro do lote em até 0,006°. Como o tiro é reto na grade,
a linha de rumo verdadeiro constante se afasta dele no máximo **0,48 m** no fim do tiro
mais longo. Para direcionar a pé, a reta é a referência certa; o valor fica registrado
para não ser confundido com erro.

## Oportunidade (não é defeito)

A distância à borda é calculada por duas funções iguais: `schmidtBlockBorderDistance`
(painel) e `schmidtMapClosestBorder` (mapa, que também devolve o ponto da divisa). Hoje
dão o mesmo número. Unificar evita que divirjam numa mudança futura.

## Conclusão e limites

Nenhum erro de medida foi reproduzido nos itens 09–14, 20 e 23. A consulta após editar
o plano já tinha sido corrigida na 1.35.1 (PR #14); o teste `audit/block-map-selection-browser.mjs`
foi reexecutado e passou nas 5 verificações. Não foi conferido aqui: GPS (24–27, etapa E4). Verificação matemática não
homologa divisa legal, área oficial nem acesso físico entre lotes.
