# Continuidade e comparação de fase comum

09/11/2026. O proprietário informou que a equipe vinha conseguindo trabalhar
e pediu seguir, deixando para revisar posteriormente a referência do P6.

## Decisão operacional do proprietário

- Preservar a configuração/referência atual do **P6**, sem trocar rumo ou A/B.
- Registrar a divergência numérica como **revisão adiada**, não como resolvida
  ou homologada. O relato de uso é respeitado; não corrige por si só os números.
- Não bloquear o trabalho dos demais lotes ou o estudo BB1/BC1 por essa pendência.
- Não impedir o uso individual existente do P6 nem recalcular planos/coletas.
- Não promover automaticamente uma nova direção de P6 baseada na interpretação
  dos anexos. Qualquer correção futura será específica, após revisar a origem.

Esta decisão conserva o funcionamento atual. Nenhum parâmetro do P6 foi alterado
e nenhum bloqueio novo foi introduzido no app. A matriz de fontes anterior
permanece como registro do diagnóstico, com a divergência ainda aberta.

## Avanço executado em BB1/BC1

Foram comparadas **11 fases comuns**, em incrementos de uma barra de 36,48 m,
mantendo os eixos a 401,28 m, a mesma referência A/B, os contornos anexados,
o recuo de ensaio de 50 m e os mínimos de 26 pontos no BB1 e 23 no BC1.

Quatro fases foram recusadas pela projeção dos pontos existentes; sete
preservaram pontos/recuo/trechos. Isso não prova que as quatro sejam impossíveis
com outro algoritmo de alocação. O piloto não cria pontos ou muda a posição
longitudinal para resolver um conflito.

Para comparar cobertura, a mesma grade fixa de células foi usada em cada lote
e em todas as fases. O critério exige que **cada lote** não piore no P95 e na
maior distância avaliada nos centros das células. Melhorar um lote não compensa
piorar o outro. Tolerância de 0,000001 m é somente numérica; não é recuo,
acurácia de mapa/GPS ou tolerância agronômica.

Uma candidata atendeu o critério. Ela usa fase de ensaio **218,88 m a partir
do A/B**, equivalente a seis larguras de barra, sem mudar os cinco eixos e dez
trechos amostrais. Esse deslocamento é a fase da grade, não o número de tiros.
O conjunto anterior de referência permanece preservado.

| Lote / métrica | Individual de referência | Candidata de fase comum |
| --- | --- | --- |
| BB1 — P95 na grade | 268,339 m | 265,780 m |
| BB1 — maior valor nos centros | 315,648 m | 315,564 m |
| BC1 — P95 na grade | 266,284 m | 266,273 m |
| BC1 — maior valor nos centros | 345,924 m | 345,896 m |
| Pontos BB1 / BC1 | 26 / 23 | 26 / 23 |

Os pequenos ganhos numéricos, especialmente no BC1, não comprovam melhoria
perceptível em campo. A candidata é a única não pior nas duas métricas por
lote entre estas onze projeções, não um ótimo global ou recomendação de operação.
Rotas/acessos, equipe, tempo e cobertura contínua não foram certificados.

## Testes, imagem e proteção dos dados

Seis novos testes passaram, cobrindo aceitação por lote, perda escondida por
média, piora de cantos mesmo com P95 melhor, conjunto de lotes divergente,
tolerância numérica e tipos inválidos.

O ensaio real conferiu a mesma base de avaliação da projeção anterior, contou
os pontos por lote, recusou pontos externos/recuo insuficiente e verificou
trechos/pontos distintos. O JSON de origem não foi alterado. Nenhuma coleta
foi transferida para o candidato.

Resultados detalhados permanecem em `audit/results/revalidacao-2026/`, ignorado.
A nova imagem fica em
`/workspace/entregas-schmidt/estudo-bloco-bb1-bc1-fases/BB1-BC1-fase-comum-comparativo.png`
e há versão `.pdf`. A projeção anterior e os pacotes publicados continuam intactos.

Reprodução em `audit/`, após extrair/revalidar os anexos e gerar o piloto A/B:

```sh
.venv/bin/python -m unittest phase_comparison_test.py
.venv/bin/python search-shared-phase.py
MPLCONFIGDIR=/tmp/schmidt-matplotlib python plot-block-pilot.py --input results/revalidacao-2026/phase-selected-projection-private.json --output /workspace/entregas-schmidt/estudo-bloco-bb1-bc1-fases --name BB1-BC1-fase-comum-comparativo
```

Continuar com estudo de percurso e acesso confirmado, mantendo o individual
disponível. Nenhuma nova função visual ou de execução foi implantada no site.
