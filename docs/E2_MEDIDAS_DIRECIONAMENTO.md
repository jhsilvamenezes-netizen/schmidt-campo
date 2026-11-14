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

**Teste de mutação:** alterar de propósito um deslocamento (+1 cm), um intervalo (+1 cm),
um ponto (+50 cm), uma ponta de trecho (−1 m) e o texto do cartão faz a auditoria falhar
em cada caso. A conferência é sensível; o erro zero não é efeito de comparar o app com ele mesmo.

Correção no próprio método: o teste de paralelismo usava `acos`, que perde ~1e-6° perto
de zero e acusava 72 falsos desvios; passou a usar `atan2(|a×b|, a·b)`.

## Conclusão e limites

Nenhum erro de medida foi reproduzido nos itens 10–14 e 20. Não foi conferido aqui:
distância à borda mostrada por ponto no mapa do bloco, exportações após edição
manual (23), rumo/norte de grade (09) e GPS (24–27). Verificação matemática não
homologa divisa legal, área oficial nem acesso físico entre lotes.
