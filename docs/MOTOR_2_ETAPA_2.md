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
