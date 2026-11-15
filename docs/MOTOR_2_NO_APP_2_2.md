# 2.2.0 — motor 2 no aplicativo (página e worker)

15/11/2026. O app passa a calcular com o motor reescrito em código legível (`src/engine/`). Antes, o motor
0.5.1 só existia minificado e sem projeto-fonte.

## O que mudou

| Antes | Agora |
|---|---|
| Motor 0.5.1 minificado na página **e** uma segunda cópia como texto no worker | `scripts/bundle-engine.mjs` empacota `src/engine/` num bloco fechado (`schmidtEngine2`), que entra na página e, escapado, no worker |
| Mudar o motor = substituir trechos minificados | Mudar o motor = editar `src/engine/*.mjs`, com teste diferencial |
| Versão declarada 0.5.1-sim | 2.0.0 (exportações, rodapés, GPX/KML). A assinatura dos parâmetros não mudou: ajustes manuais guardados continuam válidos |

Trocados na página e no worker: geometria, polilinhas, recorte, tiros, amostragem, alocação,
métricas/cobertura, otimização, avisos, avaliação e cenário (11 módulos em cada).

Continuam do motor antigo (injetados), para a próxima etapa:
- validação de parâmetros (`paramCatalog`);
- qualidade dos dados do lote (`dataQuality`);
- recomendação, rota, edição, equipe, projeção e exportação.

Esses módulos já usam o motor 2 por baixo.

O build confere marcadores únicos e a ordem dos módulos. Qualquer diferença no artefato base interrompe o build.

## Provas

| Teste | Resultado |
|---|---|
| Testes diferenciais no Node (`engine-*-diff`) | 83.931 casos de núcleo, 1.122 planos, 459 coberturas, 630 cenários completos e 265 otimizações idênticos |
| Pacote = motor antigo nos 51 lotes | idêntico |
| `audit/engine-swap-browser.mjs` (navegador) | página 51/51 idêntica; otimização no worker (modo `web_worker`) 9/9; recomendação no worker 9/9; versão 2.0.0; 0 erro |
| Bateria local (CI completo + sessões, correções, gravar ao sair, atualização 2.1.0 → 2.2.0) | 27/27 |
| GEOS/PROJ (51 lotes, 40 grupos) | 24 verificações ok |
| Tempos × 2.1.0 (mediana/p95) | abrir 197/244 × 210/277 ms (CPU×1); 51 lotes 495/503 × 456/591 ms (CPU×4); desenho igual |

## Reverter

Reverter o PR volta ao motor 0.5.1. Não há mudança de dados nem de formato gravado.
