# Levantamento 3.9 — tudo que ainda pode melhorar

Base: 3.8.0. Medido em 19/11/2026 nos 51 lotes (20 ha por ponto, 5 pessoas) e no navegador em 390 px.
Legenda de prioridade: **A** = fazer já · **B** = próxima rodada · **C** = depende de campo/decisão.

## 1. Números de hoje

| Área | Medida | Valor |
|---|---|---|
| Motor | Tempo para recomendar um lote (computador) | mediana 165 ms · 90% 269 ms · máx. 404 ms |
| Motor | Tiros de 1 ponto | 9 (BD4 1, BE1 3, RA9 2, RB8 2, RB9 1) |
| Motor | Entre pontos ÷ entre tiros | mediana 1,24 · 90% 1,52 |
| Motor | Variação da área por ponto | mediana 8% · 90% 17% · máx. 64% (RB9) |
| Motor | Pior vazio | mediana 340 m · máx. 689 m (BD5) |
| Motor | Ponto mais perto da borda | mín. 11 m (BC3) · mediana 146 m |
| Motor | Lotes em que a "Sugestão do motor" melhora | 31 de 51 |
| App | Abrir até ficar pronto | 215 ms (computador) |
| App | Arquivo principal / motor em segundo plano | 717 KB / 207 KB (o motor vai nos dois) |
| Acessibilidade (axe) | Falhas por aba | 2 (página sem título principal; nome do botão do lote diferente do texto) |
| Toque | Alvos menores que 44 px | Lotes 6 · Mapa 5 · Plano 20 · Monitorar 6 |
| Código | Maior arquivo da tela | `planner.mjs` 363 linhas, `map.mjs` 303, `styles.css` 310 |
| Código | CSS | 415 regras, 8 seletores redefinidos 3+ vezes, 97 cores fora dos tokens |

## 2. Motor e lógica

| # | Item | Por quê | Prioridade |
|---|---|---|---|
| M1 | Grade mais "quadrada" (entre pontos ≈ entre tiros) junto com a escolha de fase | Razão 1,24; BD5 tem 643 m entre pontos e 328 m entre tiros | B |
| M2 | Tiros de 1 ponto: só quando necessário (decisão do proprietário) — tentar fase/margem que evite tiro curto na borda | 9 tiros | B |
| M3 | Lotes pequenos (≤ 3 pontos): pontos pelo centro de área | RB9 com 7 e 30 ha | B |
| M4 | Motor uma vez só no app (hoje vai no `index.html` e no `motor.js`) | −180 KB para baixar | B |
| M5 | Bordadura: valor (30 m) a confirmar com o proprietário; opção de "bordadura mínima" nos ajustes | Hoje é valor inicial | **C** |
| M6 | Raio de chegada (10 m) × precisão aceita do GPS (15 m) | Chegada incerta com GPS fraco | **C** |
| M7 | Recomendar no celular: medir no aparelho lento (6×) os 404 ms do pior lote | Lote grande pode passar de 2 s no celular | B |

## 3. Código

| # | Item | Prioridade |
|---|---|---|
| C1 | `styles.css` em camadas por tema/aba, juntando os seletores redefinidos (body, .lot small, .mt, .tid…) | B |
| C2 | Cores soltas (97) viram tokens (`--hd-grad`, `--shadow-*`) | B |
| C3 | `planner.mjs` dividido: plano/equilíbrio, distribuição (minimax, bordadura), consultas do mapa | B |
| C4 | Teste "nada piora" do motor nos 51 lotes a cada versão (já existe em partes; juntar num relatório antes/depois) | A |

## 4. Visual e coesão

| # | Item | Prioridade |
|---|---|---|
| V1 | Alvos de toque ≥ 44 px em todo o app (luva, sol): topo, atalhos de regra, "Inverter", "Roteiro sem GPS", selo de alertas | **A** |
| V2 | Plano com mapa maior e painel deslizante (o mapa do Plano é 30% da tela) | B |
| V3 | Monitorar: botão para o próximo tiro da mesma pessoa ao terminar | B |
| V4 | Mapa: tocar num tiro mostra o tiro inteiro (comprimento, pontos, entrada) | B |
| V5 | Sol automático (sensor de luz, quando o aparelho permitir) | C |

## 5. Didática e usabilidade

| # | Item | Prioridade |
|---|---|---|
| D1 | **Glossário** no menu: tiro, passada, ponto, entre tiros, entre pontos, 95% do lote, maior vazio, bordadura, área de cada ponto — cada um em uma frase | **A** |
| D2 | Ícone "?" ao lado das medidas do painel do mapa e do Plano abrindo a frase do glossário | B |
| D3 | Primeiro uso: 3 telas curtas (escolher lote → plano → campo) | B |

## 6. Acessibilidade

| # | Item | Prioridade |
|---|---|---|
| X1 | Título principal da página (h1) para leitores de tela | **A** |
| X2 | Botão do lote: nome lido igual ao texto visível ("BD3 Bananal, escolher lote") | **A** |
| X3 | Voltar do celular fecha painel/janela aberta | B |

## 7. Ordem

1. **3.9.0 (agora):** V1, D1, X1, X2.
2. **3.10:** V2, V4, M4, C1, C2.
3. **3.11:** M1, M2, M3, V3, D2.
4. **Com o proprietário:** M5 (bordadura), M6 (raio de chegada), V5.

## 8. Feito na 3.11 — visual "Mata e Ouro"

| Item | O que mudou |
|---|---|
| C1 | `styles.css` reescrito numa folha só, por seção (base, topo, conteúdo, controles, listas, menu, folhas, mapa, Lotes, Monitorar, Sol, impressão); 342 → 283 linhas, sem seletor redefinido em camadas |
| C2 | Sombras e vidro viram tokens (`--sh1/2/3`, `--glass`); paleta revista com contraste ≥ 4,5 (claro, escuro e Sol) |
| Estrutura | Folha arredondada que sobe sobre o mapa (Lotes, Plano, Monitorar); menu de baixo flutuante com cápsula no item ativo; títulos de seção em versalete com ponto dourado |
| Plano | Resultado primeiro (pontos, tiros, medidas e sugestão do motor), regra depois |
| Lotes | Lote em uso no topo; escolha da fazenda dentro do cartão da fazenda |
| Monitorar | "Iniciar guia" como ação única; GPX e roteiro sem GPS juntos em "Sem o guia" |

Evidências: `docs/evidencias-3-1/3.11-*.png` (antes, claro, escuro, Sol, telas inteiras).

## 9. Feito na 3.12 — campo

| Item | O que mudou |
|---|---|
| Versão nova | O worker novo espera; aparece "Atualizar" no topo (no lugar da palavra SCHMIDT) e um aviso. Um toque troca e recarrega. Nunca troca sozinho e some durante a guia. Contrato do worker: `skipWaiting` só pela mensagem do app |
| V4 | Tocar num tiro no Mapa mostra o tiro inteiro: comprimento, pontos, intervalo, por onde entrar e vizinhos; o tiro fica destacado |
| D2 | Cada medida do Plano e do painel do mapa abre a frase do glossário (rótulo sublinhado em pontos; "?" no painel) |
| Correção | Ao restaurar uma cópia, nada mais grava até recarregar (uma recomendação atrasada do motor gravava por cima o estado antigo) |

## 10. Feito na 3.13 — campo

| Item | O que mudou |
|---|---|
| V3 | Ao chegar ao último ponto do tiro, "Próximo tiro: T3 · Pessoa 1" (o próximo da mesma pessoa na equipe do Plano); a guia continua ligada |
| X3 | O Voltar do celular fecha a janela aberta (menu, glossário, ajustes…) em vez de sair do app |
| M3 (medido, não feito) | RB9 (3 pontos, 7 a 30 ha por ponto) não melhora deslizando os pontos no tiro: falta tiro numa parte do lote. Precisa mexer nos tiros (espaçamento e fase) junto com M1/M2 numa rodada própria do motor |

## 11. Estudo do motor — 3.14 (51 lotes, 20 ha por ponto, 5 pessoas)

| Ideia testada | Resultado | Entrou? |
|---|---|---|
| Espaçamento ±3 passadas e todas as fases, sem piorar nada (95%, áreas, tiros de 1 ponto, caminhada) | 0 lotes melhoram: a recomendação atual já é o melhor desse conjunto | — |
| O mesmo, aceitando 95% até +1% e áreas até +1 p.p. para baixar o pior vazio ≥ 5% | 2 lotes (RA1 366 → 344 m, RC1 369 → 341 m) | Não (ganho pequeno, custo em todos) |
| Menos tiros de 1 ponto por espaçamento/fase (±3 passadas) | 9 → 9: vêm da forma do lote (proprietário aceita) | — |
| "Sugestão do motor" com mais tentativas (1.200 → 4.000) | Igual: o método de passos fixos trava num ótimo local | — |
| **Lloyd ao longo do tiro** (cada ponto anda no próprio tiro em direção ao centro da sua área) | Pior vazio médio 355 → 354 m; variação das áreas 10,07% → 10,00%; nada piora; +10% de tempo | **Sim** |
| Pares de pontos perto do maior vazio | Pior vazio −1 m, mas áreas mais desiguais (10,00% → 10,15%) | Não |

Conclusão: com tiros retos nas passadas da barra e o mínimo de pontos, o motor está perto do limite desta estrutura.
Ganhos maiores agora dependem de decisões do proprietário: pontos acima do mínimo em lotes irregulares (RB9, BD5),
margem das pontas por lado (M7) e calibração em campo (trecho mínimo 60 m, raio de chegada).

## 12. Feito na 3.15

| Item | O que mudou |
|---|---|
| +1 ponto (decisão do proprietário, 19/11) | Lote irregular (maior vazio > 1,2 × lado ideal) com ganho ≥ 8%: sugestão "Lote irregular: N pontos (1 a mais) · Usar", com Desfazer. Nos 51 lotes: BD5 (maior vazio 689 → 602 m) e RB9 (95% do lote 517 → 451 m) |
| Fonte | Inter embutida (`inter.woff2`, 48 KB, latino, licença SIL OFL em `docs/LICENCA_FONTE_INTER.txt`); guardada pelo service worker para uso sem internet |
| Calculando | Barra que brilha no lugar do texto (lista de lotes, lote em uso, números da fazenda, recomendado) |
| V2 | Plano: botão no canto do mapa para mapa grande (58% da tela) e de volta |

## 13. Feito na 3.16 (com embasamento)

| Item | Base técnica | Resultado |
|---|---|---|
| Chegada pela precisão do GPS (M6) | O GPS não separa posições mais próximas que a sua precisão; com ± 13 m e raio de 10 m a pessoa podia estar no ponto e nunca "chegar" | Raio efetivo = maior entre 10 m e a precisão (até 15 m, a precisão aceita). Acima de 10 m a chegada vem com "confira pelos passos". Teste novo falha no código antigo |
| Margem das pontas (M7) | Medido nos 51 lotes: "margens iguais" piora (maior vazio médio 365 → 454 m, 95% 280 → 340 m); margem fixa de 41 a 150 m por lote não melhora nenhum lote sem piorar outra medida | Fica a meia margem atual |
| Anel de progresso | Quanto do trecho até o ponto já foi andado, em volta da seta (leitura de relance, sem números) | Guia |

## 14. Feito na 3.17 — moto e a pé (relato da equipe: ~70% moto, ~30% a pé)

| Item | Base técnica | O que mudou |
|---|---|---|
| Posição no Mapa só mudava ao tocar no ◎ | O "Onde estou" pedia a posição uma vez (getCurrentPosition) | Acompanha cada leitura do GPS (watchPosition) até tocar de novo; para ao sair do Mapa, trocar de lote ou apagar a tela |
| "GPS indisponível" a cada 20 s parado | Parado, o navegador só manda leitura quando a posição muda; o tempo-limite de 20 s virava erro | Sem tempo-limite; só "localização negada" interrompe. Leitura velha segue como "GPS sem atualização" |
| Velocidade | Velocidade do próprio GPS; sem ela, distância ÷ tempo entre leituras (0,5–15 s), suavizada | "Moto N km/h" (≥ 2,5 m/s ≈ 9 km/h) ou "A pé" na etiqueta da guia; parado > 5 s volta para "A pé" |
| Aviso de chegando | De moto a 30 km/h (8 m/s), 30 m são ~4 s | Aviso a max(30 m, 8 s × velocidade) |
| Raio de chegada | O GPS lê ~1×/s: a 8 m/s o ponto pode ficar entre duas leituras | Raio = maior entre 10 m, precisão do GPS (até 15 m) e 1,5 s × velocidade (até 25 m) |
| Tempo até o ponto | — | "Faltam 171 m andando no tiro · ~20 s" em movimento |
