# Motor 2 — etapa 2: núcleo geométrico e tiros reescritos

15/11/2026. Continua o plano `UPGRADE_MOTOR_E_MOBILE.md` (U2) depois da etapa 1 do Codex
(consulta de bordas, PR #21).

## O problema

O motor 0.5.1 só existe minificado dentro do `index.html`. O projeto-fonte original não está
no repositório. Mexer nele exige substituições de texto frágeis.

## O que foi feito

1. **Oráculo do motor antigo no Node** (`audit/legacy-engine.mjs`). Recorta do `index.html` o
   trecho contínuo dos módulos `__m_engine_*` (funções puras) e o executa sem navegador. Carrega
   também os 51 lotes do bloco `fields-data`. `buildScenario` dos 51 lotes: 749 pontos, 162 ms,
   o mesmo do app.
2. **Núcleo reescrito em código legível e comentado** (`src/engine/`):
   - `tolerances.mjs`: cada tolerância com o significado;
   - `geometry.mjs`: área, ponto dentro, centroide, cruzamento de segmentos, validação;
   - `polyline.mjs`: comprimento acumulado, ponto em s, projeção, recorte;
   - `clip.mjs`: recorte do tiro pelo lote (furos e partes separadas, sem ligar pelo lado de fora);
   - `tracks.mjs`: referencial (rumo + correção de grade), deslocamentos por espaçamento e
     quantidade, múltiplos da barra com fase, seleção e recorte em trechos.
3. **Teste diferencial** (`audit/engine-diff.test.mjs`, no `test:blocks` do CI). Exige igualdade
   **exata** com o motor antigo em 83.931 casos:
   - 51 lotes × 41 variações (espaçamento de 40 a 2.000 m com e sem barra, fases, rumos de 0 a
     179,9°, quantidade de 1 a 60), com 3 valores de trecho mínimo e 4 modos de seleção;
   - pontos aleatórios e cruzamentos, inclusive casos de borda a ±5e-10 m de vértices e arestas;
   - polilinhas aleatórias abertas e fechadas.
   - **Teste de mutação:** 3 defeitos plantados (ponta do tiro, fusão de cortes, folga de
     cruzamento) foram todos detectados. O terceiro só depois de acrescentar os casos de borda,
     uma lacuna encontrada e corrigida.

## O que ainda não muda

O aplicativo continua usando o motor antigo. Os módulos novos entram em uso quando o cenário
completo (amostragem, alocação, cobertura, rota) também for reescrito e bater nos 51 lotes e
40 grupos. Anéis de dados legados ficam no motor antigo (o método vigente é linear).

## Próxima etapa

Reescrever amostragem e alocação de pontos e `buildScenario`, com o mesmo teste diferencial do
cenário inteiro. Depois, trocar o motor no build e repetir a conferência GEOS/PROJ.

## Etapa 3 (mesma data): amostragem, alocação e núcleo do plano

- `src/engine/sampling.mjs`: posições pelas três regras de borda, intervalo, raio de
  cobertura ao longo, deslocamento e numeração.
- `src/engine/allocation.mjs`: mínimo por área; repartição gulosa (maior raio, depois
  trecho mais longo, depois id menor); por tiro e por intervalo desejado.
- `src/engine/plan.mjs`: `planCore`, de tiros a pontos (sem métricas, cobertura e rota).
- `audit/engine-plan-diff.test.mjs`:
  - funções isoladas em 3.000 casos aleatórios × 3 regras;
  - `planCore` = `buildScenario` antigo campo a campo em **1.122 cenários, 29.542 pontos**
    (51 lotes × 22 variações de modo de pontos, borda, trecho mínimo, seleção, espaçamento e rumo);
  - mutações de desempate e de posição detectadas.

Falta reescrever, para trocar o motor no app: validação e resolução de parâmetros, métricas e
cobertura (`metrics`/`evaluate`), otimização e rota.

## Etapa 4: métricas e cobertura

- `src/engine/metrics.mjs`:
  - intervalos por trecho e por tiro;
  - grade de cobertura por varredura de linhas;
  - distância exata ao ponto mais próximo (varredura ordenada por x);
  - p95 por seleção de Hoare;
  - cobertura em duas resoluções com limite superior do vazio;
  - distância entre tiros vizinhos e caminhada.
- `audit/engine-metrics-diff.test.mjs`: igualdade exata em **459 cenários e 3.028.868 células**
  (51 lotes × 9 variações, inclusive grades de 400 e 4.000 células alvo) e em funções isoladas.
  Mutações no posto do p95 e no vai-e-volta da caminhada foram detectadas.

O núcleo do plano e as métricas do cenário já estão reescritos. Faltam a resolução e validação
de parâmetros, os avisos (diagnostics) e a otimização. Depois vem a troca no app.

## Etapa 5: cenário completo

- `src/engine/params.mjs`: padrões, resolução e assinatura. A versão declarada do motor
  continua `0.5.1-sim` para não invalidar ajustes manuais guardados.
- `src/engine/scenario.mjs`: `buildScenario` completo (validação de geometria e área, núcleo
  do plano, métricas, linhas por tiro, status). Validação detalhada de parâmetros, avisos e
  otimização ainda são do motor antigo, **injetados** como dependência.
- `audit/engine-scenario-diff.test.mjs`: o cenário inteiro, objeto completo, é igual ao do motor
  antigo em **426 cenários** (51 lotes × 8 variações e otimização em dois modos). As mensagens
  de erro também são idênticas. Só a hora de geração e o tempo medido da otimização são ignorados.

## Etapa 6: otimização

- `src/engine/optimize.mjs`: busca local determinística (fase por trecho e troca de pontos
  entre trechos sob limites de intervalo e CV), aceita só se melhorar o p95 na grade fina.
- `audit/engine-optimize-diff.test.mjs`: **265 otimizações idênticas** (175 aceitas), em três
  modos e variações, direto e dentro do cenário completo.

## Etapa 7: avisos

- `src/engine/diagnostics.mjs`: avisos do plano na mesma ordem e com os mesmos textos.
  A checagem de qualidade dos dados do lote (`assessField`) ainda é injetada do motor antigo.
- O teste do cenário completo passa a usar avisos e otimização do motor 2: **630 cenários
  idênticos**, com **17 tipos de aviso** exercitados (inclui conflito, abaixo do mínimo, rumo
  alterado, trechos curtos, tiros inativos e intervalo acima do alvo).

### Próximo

1. Reescrever `paramCatalog` (validação e textos) e `dataQuality` (qualidade dos dados), com o
   mesmo teste.
2. Trocar o motor no app: página **e** worker (que tem cópia própria do motor), com a conferência
   GEOS/PROJ, os 51 lotes e os 40 grupos no navegador.
