# Projeção geométrica mínima — BB1 e BC1

09/11/2026. Pedido: estudar e apresentar uma projeção em imagem somente desses
dois lotes, sem implantar o modo bloco.

## Imagem e referência

Comparativo: `/workspace/entregas-schmidt/estudo-bloco-bb1-bc1/BB1-BC1-comparativo-projecao.png`.
Versão vetorial: mesmo nome `.pdf`. Resumo numérico: `RESULTADO-DO-ENSAIO.json`.
Os contornos e os dados intermediários ficam locais; não houve publicação.

O “antes” vem de dois estados reais da web 1.31.0-r1, em perfil descartável:
abrir Plano e selecionar BB1 e BC1 com os planos iniciais recomendados. Não é
leitura dos planos personalizados existentes nos aparelhos da equipe.
Esses estados diferem dos defaults puros de `buildScenario` usados no primeiro
estudo: aqui ambos têm cinco tiros e espaçamento efetivo de **401,28 m**.

O “depois” foi calculado em coordenadas métricas das cópias dos contornos
históricos do aplicativo. A imagem é uma figura técnica, não uma montagem de
satélite nem captura de um recurso já integrado. Usa os mesmos limites, escala
e orientação Norte nos dois painéis. O detalhe da divisa foi ampliado para
evidenciar o deslocamento, que é pequeno na escala dos lotes completos.

## Cálculo executado

1. Extrair tiros, pontos, mínimos, parâmetros e origens dos dois estados reais,
   mantendo coordenadas detalhadas apenas em `audit/results/block-pilot/`.
2. Transportar cópias para o referencial do BB1, sem unir os polígonos.
3. Usar direção física e fase da grade do BB1 como referência comum. O app
   faz pequenas correções locais de direção; o piloto usa uma base comum única.
4. Gerar linhas comuns e recortá-las separadamente por lote, preservando a
   divisa e a lacuna existente. Nenhum caminho de transferência é criado.
5. Projetar os pontos dos estados de referência no eixo comum mais próximo,
   preservando sua posição longitudinal e quantidade por lote.
6. Conferir lote de origem, distância à divisa, pertencimento a trecho recortado,
   IDs novos do candidato, posições distintas e comprimento mínimo de trecho.
7. Comparar cobertura geométrica aproximada antes/depois na mesma grade fixa
   de avaliação por lote; não usar essa aproximação como homologação.

**Essa projeção não move os pontos salvos do app.** O candidato tem IDs próprios
com referência ao ponto de origem apenas para estudo. Não transporta marcações
de coleta. BB1 praticamente não muda; no BC1 há deslocamento lateral de até
36,59 m. Não foi executado novo algoritmo geral de alocação ou otimização.

## Resultado

| Item | Antes | Projeção |
| --- | --- | --- |
| Referência dos eixos | Grade individual em cada lote | Grade comum ancorada no BB1 |
| Desencontro na divisa, trecho central | Aproximadamente 36,52 m na normal do eixo | Eixos colineares na base comum |
| Espaçamento entre tiros/eixos | 401,28 m em ambos | 401,28 m |
| Trechos amostrais | 5 no BB1 + 5 no BC1 | 5 eixos comuns, recortados em 10 trechos no total |
| Pontos BB1 / mínimo | 26 / 26 | 26 / 26 |
| Pontos BC1 / mínimo | 23 / 23 | 23 / 23 |
| Pontos fora do lote | Nenhum no cenário de referência | Nenhum na projeção |
| Acesso entre lotes | Não homologado | Continua não validado |

Foi usado **50 m como recuo de ensaio**, não como recomendação agronômica.
Os dois estados iniciais já atendiam esse valor. A menor distância de ponto à
borda na projeção ficou em 185,73 m no BB1 e 186,58 m no BC1. Isso demonstra
apenas viabilidade geométrica desse candidato sob o requisito de ensaio.

Cobertura aproximada, medida em centros de células de 57,57 m no BB1 e 54,64 m
no BC1, com a mesma grade antes/depois:

| Lote | P95 antes → depois | Maior distância nos centros avaliados, antes → depois |
| --- | --- | --- |
| BB1 | 267,99 → 267,99 m | 316,14 → 316,14 m |
| BC1 | 266,28 → 267,15 m | 345,93 → 324,93 m |

No BC1 o P95 piora ligeiramente, enquanto o maior valor amostrado melhora.
Não declarar ganho geral de cobertura só por alinhar os eixos. Não foi definida
tolerância agronômica de aceitação; a grade não mede o máximo contínuo exato.
O próximo protótipo deve comparar outras fases comuns sob as regras acordadas.

## Testes e limitações

Oito testes sintéticos passaram: recorte com lacuna, furo que divide trecho,
projeção sem mutar entradas, ponto que sairia do lote, recuo violado, direção
nula/limite de linhas, translação com fase correspondente e tipos numéricos.
O caso real conferiu 49 pontos, mínimos individuais, trechos e recuo sem
alterar o HTML publicado, parâmetros salvos, contornos ou dados operacionais.

O módulo recusa uma projeção inválida; não procura solução alternativa nem
reduz o recuo. A função é um piloto restrito, não o gerador geral de blocos.
Não existe rota entre lotes, distribuição de equipe ou ganho de tempo calculado.
Linhas visualmente alinhadas não autorizam atravessar cerca, estrada ou canal.

## Reprodução

```sh
cd audit
node block-pilot-reference.mjs
.venv/bin/python -m unittest shared_grid_pilot_test.py
.venv/bin/python block-pilot-project.py
MPLCONFIGDIR=/tmp/schmidt-matplotlib python plot-block-pilot.py
```

Cálculo: ambiente espacial já documentado (Shapely/NumPy). Desenho:
Matplotlib 3.10.8 previamente disponível no Python do ambiente; não foi
adicionado às dependências do aplicativo. As figuras foram geradas diretamente
dos números/contornos, sem redesenho generativo das geometrias.

Esta etapa avança parcialmente B1 da arquitetura individual/bloco, sem concluir
gerador, roteador ou integração. Individual permanece disponível no app atual.
Próximo passo de estudo: acesso real, busca de fase/cobertura e comparação de
percursos individuais versus bloco. Implantação visual continua dependente
de aprovação específica após avaliação das projeções.
