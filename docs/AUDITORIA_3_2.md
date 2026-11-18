# Auditoria crítica 3.2 — motor, mapa, código e tela

Data: 18/11/2026 · base: 3.1.0 (PR #42) · medido nos 51 lotes, 5 pessoas, regra de 20 ha por ponto.
Decisão do proprietário (18/11): o motor da 3.x passa a ser **próprio e sempre evoluir**; a 2.5 fica congelada em `legado/`.

## 1. O que foi medido

| Indicador (51 lotes) | Mín. | Mediana | 90% | Máx. | Leitura |
|---|---|---|---|---|---|
| Entre pontos ÷ entre tiros | 0,67 | **1,23** | 1,36 | **1,96** | Grade alongada: pontos mais longe uns dos outros no tiro do que entre tiros |
| Entre tiros (m) | 328 | 401 | 511 | 620 | Lado ideal de 20 ha = **447 m** |
| Variação da área por ponto (CV) | 1% | 8% | 17% | **62%** | RB9: um ponto cobre 7,2 ha e outro 30,2 ha |
| Área de um ponto (ha) | 7,2 | — | — | 30,2 | Regra é 20 ha |
| 95% do lote a menos de (m) | 261 | 272 | 297 | 517 | |
| Pior vazio (m) | 307 | 340 | 409 | **689** | BD5: um trecho fica a 689 m do ponto mais perto |
| Tiros de 1 ponto | — | — | — | **9** | BE1 (3), RA9 (2), RB8 (2), BD4, RB9 |
| Tempo para recomendar (ms) | 69 | 181 | 256 | 522 | No computador; no celular ~4× mais |
| Pontos acima do mínimo | 0 lotes | | | | O motor sempre fica no mínimo (bom) |

Lotes fora do padrão (entre pontos ÷ entre tiros fora de 0,7–1,4 ou áreas muito desiguais):

| Lote | ha | Pontos/tiros | Entre tiros | Entre pontos | Área por ponto | Pior vazio | Tiros de 1 ponto |
|---|---|---|---|---|---|---|---|
| BD5 | 376 | 19 / 4 | 328 m | **643 m** | 15–26 ha | **689 m** | 0 |
| BE1 | 265 | 14 / 6 | 365 m | 592 m | **9–27 ha** | 391 m | **3** |
| BD4 | 218 | 11 / 5 | 365 m | 558 m | 12–27 ha | 389 m | 1 |
| RB8 | 169 | 9 / 5 | 401 m | 609 m | 14–25 ha | 414 m | 2 |
| RB9 | 49 | 3 / 2 | 620 m | — | **7–30 ha** | 631 m | 1 |
| RC4 | 102 | 6 / 2 | 511 m | 341 m | 17 ha | 307 m | 0 |

Perfil do motor (10 lotes): **27.760** contas de "distância ao ponto mais perto", **22% repetidas** (mesmos pontos,
lista nova) e 54% do tempo total nessa conta. A busca do equilíbrio monta o cenário inteiro (com otimizador) para
cada candidato.

## 2. Achados — motor

| # | Achado | Prova | Proposta | Ganho esperado |
|---|---|---|---|---|
| M1 | **Grade alongada**: o motor escolhe o espaçamento entre tiros e depois reparte os pontos no comprimento; não busca o par (entre tiros, entre pontos) mais próximo de um quadrado | Razão mediana 1,23; BD5 1,96 | Motor 3.x escolhe o número de tiros que deixa entre pontos ≈ entre tiros (razão-alvo 1,0, aceitar 0,8–1,25), sempre em passadas inteiras da barra e sem passar do mínimo de pontos | Pior vazio menor com os mesmos pontos (a medir; BD5 hoje 689 m) |
| M2 | **Tiros de 1 ponto** viram "ilhas": ponto sozinho em tiro curto | 9 tiros | Fase dos tiros (deslocamento a partir de A) escolhida também para evitar tiro curto na borda; ponto de tiro curto passa ao vizinho quando a cobertura não piora | Menos que os 9 de hoje (a medir) |
| M3 | **Áreas desiguais** em lotes pequenos (RB9 7–30 ha) | CV 62% | Em lotes com ≤ 3 pontos, posição dos pontos pelo centro de área (Lloyd restrito ao tiro) | Áreas mais iguais (a medir) |
| M4 | **Contas repetidas** | 22% | Cache pelo conteúdo (já testado: resultado idêntico, −18% de tempo) | −18% (medido) |
| M5 | **Equilíbrio caro**: cada candidato monta cenário completo | Perfil | Pré-filtro barato (pontos por tiro e razão) antes do cenário completo; só os 3 melhores vão ao cálculo exato | A medir |
| M6 | **Busca por fase em passos fixos** (cada passada) | Código | Busca grossa e depois fina só perto do melhor | Menos candidatos, mesmo resultado |
| M7 | Margem de borda igual em todo o lote | Código | Margem por lado, conforme a forma (lado estreito × lado comprido) | Bordas menos vazias |
| M8 | **Identidade do motor**: rótulo "2.0.0" e assinatura "0.5.1-sim" convivem | `planner.mjs`, `params.mjs` | Motor 3.x com versão própria (3.2.0), recomendações embutidas refeitas e teste de que o plano gravado reabre igual | Clareza e rastreio |

Regra de ouro para cada mudança no motor: **nos 51 lotes, nada piora** (95% do lote, pior vazio, mínimo de pontos,
tiro inteiro por pessoa), e o que melhora é mostrado em tabela antes/depois.

## 3. Achados — mapa e metragem

| # | Achado | Proposta |
|---|---|---|
| G1 | A grade do mapa é **decorativa** (40 px), não diz metros | Grade em metros reais (100/250/500 m conforme o zoom), com rótulo discreto no canto |
| G2 | Medidas só para **um par** (entre pontos, entre tiros) | Régua: tocar em dois pontos (ou ponto e borda) e ver a distância; distância em cada trecho do tiro ao tocar no tiro |
| G3 | Escala só no canto | Escala que acompanha o zoom (já calcula) + "1 quadrado = 250 m" |
| G4 | Lote sempre com o norte para cima | Botão "talhão em pé" (tiros na vertical), como planejado em U06 |
| G5 | Lotes vizinhos só no bloco | Vizinhos em cinza claro no Mapa, para noção do entorno |
| G6 | Aba Lotes nova: fazenda pequena na tela | Enquadrar pela fazenda com folga menor e abrir com o lote em uso um pouco maior |

## 4. Achados — código

| # | Achado | Proposta |
|---|---|---|
| C1 | Motor compartilhado com a 2.5 impede evoluir | Copiar `src/engine/` → `src/engine3/` (só a 3.x usa); `legado/` continua do motor antigo; teste garante `legado/` idêntico |
| C2 | `main.mjs` faz cálculo, estado e tela | Separar `state.mjs` (estado e memória) de `render.mjs` |
| C3 | Telas montadas por texto (HTML em string) em `views.mjs` (170 linhas) | Dividir por tela (`views-plano`, `views-mapa`…) |
| C4 | Arquivo único de 690 KB (motor 179 KB + app 198 KB + dados) | Dados dos lotes comprimidos; motor só no `motor.js` (hoje vai duas vezes) |
| C5 | CI de 15 min estoura quando a instalação demora | Cache do navegador de testes no CI |
| C6 | Testes: bons no motor e nas telas; faltam testes de propriedades do motor 3.x | Teste "nada piora" nos 51 lotes a cada mudança do motor |

## 5. Achados — tela (após 3.1.0)

| # | Achado | Proposta |
|---|---|---|
| T1 | Plano ainda é uma lista longa | Mapa grande com painel deslizante (meio/topo) |
| T2 | Monitorar sem modo navegação | Tela cheia: seta, distância grande, próximo ponto |
| T3 | Sem animação entre abas e painéis | Transições curtas (150–200 ms), respeitando "reduzir movimento" |
| T4 | Letra do aparelho (varia por celular) | Fonte própria embutida (sem internet) |
| T5 | Acessibilidade (U09) pendente | Voltar fecha janela, foco visível, leitura de tela no mapa |

## 6. Ordem proposta

| Etapa | Conteúdo | Por quê primeiro |
|---|---|---|
| **3.2.0** | C1 (motor próprio) + M4 + M5 + M8 | Destrava tudo e já fica mais rápido sem mudar resultado |
| **3.2.1** | M1 + M2 (grade quadrada e sem tiro de 1 ponto) | Maior ganho de cobertura com os mesmos pontos |
| **3.2.2** | G1 + G2 + G3 (metragem real no mapa) | Noção de distância pedida pelo proprietário |
| **3.2.3** | M3 + M6 + M7 | Lotes pequenos e bordas |
| **3.3** | T1 + T2 + T3 + G4 + G5 | Grande salto de tela |
| **3.4** | C2–C6, T4, T5 | Base para crescer |

Cada etapa: tabela antes/depois nos 51 lotes, testes, prévia (claro, escuro, Sol) e publicação só com o CI verde.
