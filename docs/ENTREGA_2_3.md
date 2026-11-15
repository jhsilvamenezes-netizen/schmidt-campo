# 2.3.0 — motor conferido, tela mais enxuta e tema Noite

Escopo: só planejamento e direcionamento. Método linear sem anéis, barra de 36,48 m, P6, 51 lotes e
40 opções de bloco preservados. Plano continua padrão; Satélite continua opcional.

## 1. Motor

| Item | Antes | Depois | Prova |
|---|---|---|---|
| Montar bloco (Node, 40 grupos) | 16,9 s | 3,3 s | `block-plan-fast.test.mjs` (resultado igual ao caminho completo) |
| Montar bloco no navegador, CPU ×4 | 5 a 8 s | 0,7 a 1,4 s | medida local; maior tarefa ~160 ms |
| Limite superior do pior vazio | abaixo do real em 16 de 153 planos (até 10,9 m) | 0 violações | `coverage-exact.py` (Shapely/GEOS, Voronoi exato) |
| Tipos do motor (`src/engine`) | sem checagem | TypeScript 7.0.2 estrito, 0 erros | `npm --prefix audit run test:types` |
| Propriedades em lotes aleatórios | — | 5 propriedades × 300 casos (fast-check 4.10.2) | `engine-properties.test.mjs` |

Propriedades: translação, pontos dentro do lote, contagem pedida, limite da cobertura acima da distância
real (inclusive na divisa), grade da barra e recorte dos tiros.

## 2. Revisão de tela

| # | Achado | Decisão |
|---|---|---|
| 1 | Faixa vazia no mapa ao sair do monitor no celular | corrigido: a aba ativa é reaplicada |
| 2 | Foco "some" no fim da ordem de tabulação | não é defeito (vai para o navegador) |
| 3 | Título com "v1.31.0" | "SCHMIDT Campo · Planejamento de amostragem" |
| 4 | Sem prévia ao compartilhar o link | og:title, og:description e og:image |
| 5 | Auditoria marcava "!" em notas informativas | "!" só com alerta ou erro do motor; selo "Dados" conta igual |
| 6 | Caixas de seleção pequenas | não é defeito (rótulo de 44 px quando visível) |
| 7 | Tablet sem legenda do mapa | legenda visível de 600 a 999 px |
| 8 | "Descoberto · limite 376 m" | "Área descoberta · a mais de 376 m de um ponto" |
| 9 | Sem tema escuro | tema Noite opcional: botão Sol alterna Normal → Sol → Noite |
| 10 | "Trocar lote" no desktop | mantido: atalho que leva ao seletor |

Contraste (axe 4.14.0, color-contrast): 0 falhas em Normal, Sol e Noite, 390 e 1440 px
(`night-theme-browser.mjs`).

## 3. Menos texto

Módulo `src/ui/text-trim.mjs` (21 regras). Saem textos que repetiam a tela ou explicavam o óbvio;
números, avisos de dados e ações ficam.

| Aba | Antes | Depois |
|---|---:|---:|
| Tiros | 219 | 168 |
| Dados | 133 | 108 |
| Auditoria | 177 | 154 |
| Plano | 102 | 102 |
| Diagnóstico | 262 | 161 |
| Ajuste fino | 237 | 167 |
| Conferência | 279 | 228 |
| Arquivos | 276 | 196 |
| Monitor | 238 | 204 |
| **Total** | **1.923** | **1.488 (−23%)** |
