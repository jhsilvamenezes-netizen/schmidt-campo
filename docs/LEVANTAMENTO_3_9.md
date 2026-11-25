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

## 15. Feito na 3.19 — correções da autoanálise

| Item | Problema | Correção | Prova |
|---|---|---|---|
| Velocidade falsa parado | Tremor de 3–6 m entre leituras virava "Moto 8 km/h" | Deslocamento medido em ~3 s (tremor não acumula), acima de 1,5 × a precisão (mín. 6 m); troca moto/a pé só com 2 leituras | Teste: 6 leituras tremendo → continua "A pé" (falhava antes) |
| Chegada de moto a até 25 m | Raio crescia com a velocidade: "chegou" longe do ponto | Raio de chegada volta ao normal; de moto, a 1,5 s do ponto (até 25 m), "Pare aqui" com vibração longa | 51 lotes: a 20 m a 15 m/s = "pare"; a 8 m = chegou; a 30 m = a caminho |
| Tiro de 1 ponto (regra do proprietário, 19/11) | Pequeno e irregular (RA9, RB9) aceito; nos maiores só no bico | BE1: 1 ponto a mais tira o tiro de 1 ponto do meio (95% 300 → 298 m, maior vazio igual). RB8: os 2 tiros curtos do meio vêm da forma do lote (recorte); evitar piora o maior vazio ≥ 16% — fica para decisão | Teste: sugestões só em BD5, BE1 e RB9 |
| Comparação de imagens pulada no CI | Navegador do CI (141) ≠ local (153) | Compara também a estrutura da tela (caixas e cores de cada elemento), que não depende da versão | Pega 2 px a mais no espaçamento dos cartões em 6 telas |
| Símbolos fora da fonte | → ≥ ✓ ⌃ ⌄ caíam na letra do aparelho | Inter com esses símbolos, sem variantes de letra (44 KB, menor que antes) | 24 telas idênticas |
| Falhas raras de teste | Cópia de segurança (1 vez) e arraste da folha (1 vez) | Arraste: teste espera a animação; o app segue a folha nova se a tela redesenhar no meio. Cópia: não repetiu em 11 rodadas; o teste agora registra aviso e erros da tela | 6 rodadas seguidas verdes |

## 16. 3.20 · o tiro pode ser feito pelas duas pontas

Relato do campo (RB6 · T5): a pessoa estava ao lado do ponto 45, na ponta final do tiro, e a guia mandava ir
até a entrada do plano (ponto 37), a 2,4 km. O tiro pode ser feito de qualquer lado.

| Regra | Valor |
|---|---|
| Quando escolhe | antes do primeiro ponto do tiro e fora da linha do tiro (> tolerância de linha, 25 m) |
| Qual ponta | a mais perto da pessoa |
| Folga para trocar | a outra ponta tem de estar 30 m e 15% mais perto (GPS tremendo não troca de ponta) |
| Depois do primeiro ponto | o sentido fica |
| Próximo tiro | também começa pela ponta mais perto (vai e volta entre tiros vizinhos) |
| "Inverter" à mão | continua e desliga a escolha automática naquele tiro |

Testes: todos os tiros ≥ 300 m dos 51 lotes (perto da outra ponta inverte, perto da entrada fica, na linha mantém,
a guia aponta para a ponta perto) e no navegador (BC1 · T1, 120 m além da ponta final: 120 m, "0/N").

## 17. 3.21 · equipe em zigue-zague

Com o tiro feito pelas duas pontas (3.20), quem faz 2 ou mais tiros não precisa voltar à mesma borda: sai no
fim de um tiro e entra no próximo pela ponta ao lado. A divisão escolhe a entrada de cada tiro pela menor
caminhada total da pessoa (programação dinâmica com 2 estados, a ponta onde se está), contando a passagem em
linha reta da saída de um tiro até a entrada do próximo.

| 51 lotes, 1–3 pessoas | Antes (cada tiro sozinho) | 3.21 |
|---|---|---|
| Caminhada das 185 pessoas com 2+ tiros | 1.315 km | 1.006 km (−23,5%) |
| Pessoas que pioraram | — | 0 |
| Quem faz 1 tiro | igual | igual |

Antes, o total mostrado contava a passagem entre tiros como a distância entre as linhas, mesmo quando a pessoa
saía na ponta oposta; agora conta a passagem real. Teste: força bruta em todas as combinações de entrada e saída
(até 8 tiros por pessoa) = o valor da divisão.

## 18. 3.23 · "Outra ponta" com a guia ligada

A ponta mais perto (3.20) pode não ter acesso: canal, cerca, lavoura sem carreador. Com a voz disponível (quase todo
Android), o "Inverter" sumia durante a guia, e era preciso parar a guia para trocar.

| Situação | 3.23 |
|---|---|
| Antes do 1º ponto | a guia mostra "Pela ponta mais perto." (ou "Pela entrada do plano." / "Pela outra ponta.") e o botão "Outra ponta" (88×44 px) |
| Escolhida à mão | leva até a entrada desse sentido, mesmo com a pessoa perto da outra ponta. Antes mandava ao último ponto, como se o tiro já estivesse andado |
| Chegou à entrada (≤ 30 m) | segue normal, pelo ponto 1 |
| Depois do 1º ponto | o botão some e o sentido fica |

Medido e descartado: dividir a equipe pela caminhada real, em vez de dividir e depois ajustar as pontas (3.21).
Nos 51 lotes com 2 a 4 pessoas, só 2 de 100 casos melhoram, em cerca de 10 m. Não vale a complexidade a mais.

## 19. 3.24 · arquitetura (parte 2), selo "sem internet" e voz a caminho

| Item | O que é | Prova |
|---|---|---|
| Telas por aba | `views.mjs` (28 KB) virou as peças comuns (3 KB) e 4 arquivos, um por aba (`views-mapa/plano/monitor/mais`). Divisão feita por script, com as dependências calculadas | 24 telas iguais (pixels e estrutura), tsc e teste de camadas |
| Selo "Pronto para usar sem internet" | no menu Mais. Confere se o cache da 3.x tem todos os arquivos (`offline.mjs`, sem DOM). Na 1ª visita, avisa uma vez quando termina de guardar | Node: cache vazio, parcial, da 2.x e completo; lista igual à do service worker. Navegador: selo "pronto" com o app guardado de verdade |
| Voz a caminho | com a voz ligada, "Faltam N metros" a cada 100 m (só fala, sem vibrar), até o aviso de chegando. Vale também na ida até a entrada do tiro | Node: conta de 100 em 100; se a pessoa se afastar, volta a contar; alvo novo começa do zero |

O teste de limite de palavras passou a descontar o aviso passageiro do rodapé (como já descontava os rótulos do mapa).

## 20. 3.25 · qualidade do GPS para calibrar com dado real

O raio de chegada (10 m) e a precisão aceita (15 m) ainda são valores iniciais, a confirmar em campo. A guia agora
conta as leituras do GPS em faixas, no próprio aparelho. Não guarda coordenadas nem marca coleta.

| Conta | Faixas |
|---|---|
| Precisão | ≤ 3, ≤ 5, ≤ 8, ≤ 10, ≤ 15, ≤ 25 e acima de 25 m |
| Intervalo entre leituras | ≤ 1, ≤ 2, ≤ 3, ≤ 5, ≤ 10 e acima de 10 s |
| Modo | moto ou a pé |

- **Onde ver:** Mais → "Qualidade do GPS (calibrar)". Mostra o resumo e diz se o raio atual cobre 9 em 10 leituras.
- **Arquivo:** "Compartilhar" gera um CSV só com faixas e contagens. "Zerar" recomeça.
- **Gravação:** a cada 10 leituras, ao parar a guia e ao esconder a tela.
- **Uso:** com 1 a 2 dias de uso da equipe, o arquivo mostra se raio e precisão precisam mudar. A decisão fica com o proprietário.

Testes: Node (faixas, percentis, resumo, arquivo sem posição, leitura sem precisão ignorada) e navegador
(guia de verdade, depois parar: contagem gravada sem x/y/lat/lon e tela de resumo).

## 21. 3.26 · fundo de satélite (decisão)

Sem imagem de drone (proprietário, 20/11), a escolha foi a fonte de imagem mais nítida, a mesma já usada na 2.5.

| Fonte | Nitidez | Uso empresarial | Escolha |
|---|---|---|---|
| Esri World Imagery | abaixo de 1 m (talhões, carreadores, pivôs) | termos da Esri: uso comercial pode exigir licença; **a confirmar** com a Esri | ✅ camada opcional, como na 2.5 |
| Sentinel-2 cloudless (EOX) | 10 m | só a camada de 2016 é CC BY 4.0 (imagem antiga); 2018 em diante não comercial | descartada |
| Google / Mapbox | boa | pago, com chave, e os termos proíbem guardar a imagem | descartada |

Como funciona:
- **Camada "Satélite"** no painel de camadas do Mapa. Vem desligada; ligada, fica lembrada.
- **Duas imagens por lote**, no fuso UTM 23S, no mapa principal e no da guia:
  - a do lote, nítida: folga em volta e no máximo 2048 px;
  - a do entorno, larga e leve: 3× o lado maior, 1024 px. Assim não sobra borda vazia na tela.
- **Visual próprio ("tema satélite"), pelos mesmos tokens de cor:**
  - fundo verde-escuro da marca além da foto;
  - véu verde-escuro leve sobre a foto;
  - lote em branco; tiros e medidas entre tiros em verde-claro; medidas entre pontos em dourado;
  - textos, escala e norte em branco com contorno escuro;
  - os pontos não mudam.
- **Nada externo até ligar.** A CSP libera só `services.arcgisonline.com`, e só para imagem (`connect-src 'self'`).
- **Sem sinal**, o mapa segue igual: o plano não depende da imagem.
- **Crédito no canto:** "Imagem: Esri, Vantor, Earthstar Geographics".

Conferido com a imagem real (BD3 e BD5): o contorno do lote cai em cima dos talhões. Teste no Node: nos 51 lotes, o
lote fica dentro da imagem com folga, sem esticar, no fuso 23S. Teste no navegador: desligado não pede nada; ligado,
a imagem e o crédito aparecem; a camada fica lembrada e desligar tira a imagem.

Qualidade do GPS (3.25): não precisa mandar arquivo. A guia já ajusta o raio de chegada à precisão de cada leitura
(3.16). A tela fica no menu Mais só para diagnóstico, se alguém relatar "não chega no ponto".

Calibração das cores sobre o satélite: 7 fotos reais (BB1, BD1, BD3, BD5, RA3, RB2, RC5). A medida é o contraste
contra o pior caso, os 5% de pixels mais claros, com o mesmo tratamento da tela.

| Cor | Véu 24% | Véu 34% (adotado) |
|---|---|---|
| Branco (lote, textos) | 4,1:1 | 4,8:1 |
| Verde-claro (tiros) | 3,0:1 | 3,6:1 |
| Ouro (medidas de ponto) | 2,9:1 | 3,4:1 |
| Alerta | 2,6:1 | 3,1:1 |
| Erro (#ff8a7a → #ffb3a6, coral claro) | 1,8:1 (43% dos pixels ≥ 3:1) | 2,8:1 (90% ≥ 3:1), com sombra escura |

A paleta segue a mesma (branco, mata e ouro). Só o vermelho e a força do véu foram calibrados para a foto. Linhas de
medida, borda, vazio e régua ganham uma sombra escura fina.

## 22. 4.0.1 · onde o motor ainda podia melhorar (medido) e o ponto no maior vazio

Qualidade do plano nos 51 lotes, contra o limite teórico. O limite é a malha hexagonal ideal com o mesmo número de
pontos na mesma área.

| Medida | Mediana dos 51 lotes |
|---|---|
| 95% do lote ÷ limite teórico | 1,01 (praticamente no limite) |
| Maior vazio ÷ limite teórico | 1,28 |

- **Onde destoa:** só o BD5, com o maior vazio a 2,4 × o limite. O vazio fica no bico NE, a ponta comprida do triângulo.
- **O +1 de antes:** refazia o plano com 1 ponto a mais e redistribuía tudo. Levava o vazio só de 689 para 602 m.
- **O que mudou:** a sugestão também testa manter o plano e acrescentar 1 ponto num tiro existente, na posição que mais
  encurta o maior vazio. É a regra do proprietário: "um ponto sozinho, só no bico, para evitar buraco".
- **Travas do ponto novo:**
  - fora da bordadura mínima (15 m);
  - a 30 m das pontas do tiro;
  - a 60 m de outro ponto do mesmo tiro.
- **Escolha:** fica a alternativa que encurtar mais o maior vazio.

| Lote | Antes | +1 refazendo o plano | +1 no vazio (4.0.1) |
|---|---|---|---|
| BD5 | 689 m | 602 m | 453 m (−34%), 95% 313 → 311 m |
| RB9, BE1 | — | — | sem mudança (vence o mesmo +1 de antes) |

Nos demais lotes, um ponto a mais no vazio ganharia 12% ou menos. Não vale sugerir: o 95% do lote já está no limite.

## 23. 4.0.2 · guarda de qualidade do motor e bordadura mínima

**Guarda** (`audit/engine-quality.mjs`, teste `engine-quality.test.mjs` no `test:blocks`, roda no CI):
- Retrato do plano recomendado (5 pessoas) nos 51 lotes, em `audit/engine-quality-baseline.json`:
  pontos, tiros, 95% do lote, maior vazio exato, razão ao ótimo hexagonal, área descoberta, caminhada,
  pessoa mais longa, tiros sem ponto, tiros de 1 ponto no meio e menor distância à borda.
- Qualquer piora em qualquer lote reprova (folga só de arredondamento: 0,5 m / 0,1%).
- Piora intencional: `node engine-quality.mjs --update --motivo "…"`. O motivo e a lista do que mudou ficam
  no `historico` do arquivo.

**Achado na primeira medição:** BC3 tinha ponto a 10,5 m da borda (T5 cruza um recorte do lote), abaixo
da mínima de 15 m. Nenhuma fase de tiros resolvia; por isso o teste antigo o aceitava como exceção.

**Correção** (`src/engine3/scenario.mjs`, `borderGuard`):
- No plano equilibrado, o trecho com ponto a menos de 15 m desliza inteiro ao longo do tiro (mesmos pontos,
  mesmo espaçamento), no menor deslocamento que tira os pontos da faixa.
- Teto: o maior vazio exato pode crescer no máximo 15%. Ponto na bordadura não representa o talhão
  (manobra, compactação, sobreposição de adubo).
- Candidatos do equilíbrio de áreas que só passam por causa da guarda são descartados (sem isso o RB7
  trocava de fase, +1,5% de caminhada).
- A Conferência mostra "T5: pontos deslizados 70 m para longe da borda".

| BC3 | 4.0.1 | 4.0.2 |
|---|---|---|
| Ponto mais perto da borda | 10,5 m | 15 m |
| Maior vazio | 321 m (1,16× o ótimo) | 354 m (1,28×; mediana dos lotes 1,29×) |
| 95% do lote | 273 m | 273 m |
| Demais 50 lotes | — | idênticos |

**Retrato atual:** mediana 1,29× o ótimo hexagonal no maior vazio. Fora da curva: RB9 (2,5×, lote pequeno
e irregular, aceito) e BD5 (2,5×; o botão "Ponto no maior vazio" leva a 453 m).

## 24. Rumos dos 51 lotes (20/11): conferência e decisão

**Conferido** (scripts em `audit/rumos/`, resultado em `rumos-satelite-2026-11-20.json`):
- Correção de grade (convergência meridiana UTM 23S): igual ao cálculo nos 51 lotes (diferença < 0,0001°).
- Rumo da planilha × direção de A para B: só o P6 diverge (já conferido com o proprietário).
- Em 29 lotes A e B estão a 3,05 m: essa conferência não é independente nesses lotes.
- Rumo × linhas visíveis na imagem de satélite: 39 lotes batem (≤ 2°, todos os pivôs incluídos).
  Divergem: BD3 (42°), BD4 (38°), BE1–BE3 (23°), BA1–BA3 (12°), BD5 (7°, sinal fraco).
  Sem conclusão: RA8 e RB8 (imagem antiga, outro uso), RA9 e RB9 (pequenos demais).

**Decisão do proprietário (20/11):** vale o rumo da planilha. Nenhum rumo foi alterado. As linhas da
imagem podem ser de plantio, que não segue o rastro da pulverização, e a data da imagem é desconhecida.

## 25. 4.1.0 · guia de moto: mapa que segue, gira e aceita pinça; telas mais limpas

Pedido do proprietário (24/11): na guia, o mapa ficava parado ao seguir. A pinça não fazia nada e ele não
girava com o sentido de quem anda de moto.

**Mapa da guia (seguindo):**
- A posição fica no meio da largura e a 60% da altura livre, com mais mapa à frente de quem anda.
- Pinça e roda mudam o zoom sem largar o seguir (de 0,25× a 12×), para afastar e ver o lote todo e
  o caminho ao redor. Arrastar não tira o mapa de quem anda; o botão ⤢ mostra o lote inteiro.
- **Rumo para cima (padrão):** o mapa gira no sentido do deslocamento e os textos ficam em pé.
  - Andando (≥ 1,5 m/s): vale o rumo do GPS. Na moto, a bússola erra perto do motor e do ímã.
  - Sem rumo do GPS: vale a reta entre leituras (≥ 8 m e ≥ 2 × a precisão, para não pegar tremor).
  - Parado: vale a bússola do celular; sem ela, o último rumo.
  - O botão ▲/N troca entre rumo e norte para cima. O "N" do canto gira junto.
  - Em `monitor.mjs`: `courseStep`, com teste.

**Telas mais limpas:**
- Guia: saiu a linha "seta pelo celular / com o norte para cima". Ela continua só para leitor de tela.
- Plano: saiu "km por tiro" (repete a caminhada; o km de cada pessoa está na equipe). "Borda ≥ 54 m" não
  quebra mais a linha.
- Plano: "Sugestão do motor / áreas 7 → 6%" virou "Distribuir melhor os pontos / áreas por ponto mais iguais".

## 26. 4.2.0 · app enxuto e mais leve (pedido do proprietário, 25/11)

**Saiu do app (menu Mais e código):**
- vitrine do design;
- visual anterior (a reserva da 4.0, cumprida a condição de uma versão);
- Arquivos e fichas: compartilhar plano, fichas impressas, GPX/KML/CSV/GeoJSON e copiar resumo;
- Abrir plano recebido;
- Versões anteriores, e a gravação automática delas;
- Qualidade do GPS, e a contagem das leituras;
- Cópia de segurança.

O menu Mais ficou com glossário, dados do lote, como foi calculado e todos os lotes. O GPX do tiro na aba Monitorar
continua.

**Travadas:**
- O profiler (CPU 6×, trocar 6 abas e 2 lotes) mostrou que o maior custo era a aba Lotes recalculando a cobertura de
  cada lote da fazenda.
- Agora a linha de cada lote no plano recomendado vem pronta no arquivo (`recs-data`, conferida no teste U05).

| Medida | 4.1.0 | 4.2.0 |
|---|---|---|
| CPU ocupada na sequência | 1.476 ms | 802 ms (−46%) |
| Tamanho do app | 777 KB | 736 KB |

**Testes:**
- Saíram os blocos das funções removidas e as 8 telas do visual anterior; ficaram 16 telas.
- O teste do menu confere que só sobraram os 4 itens.

## 27. 4.2.1 · limpeza e leveza (25/11)

**Repositório:**
- Saíram 98 arquivos de `docs/` (20,6 MB): prévias e relatórios antigos que nenhum código, teste ou documento vivo
  usa. Continuam no histórico do Git.
- Saíram 26 relatórios JSON antigos de `audit/`.
- Branches: ver `docs/PLANO_4_3.md`, fase C. Apagar exige permissão que esta sessão não tem.

**Leveza:**
- Os pedidos de desenho do mapa no mesmo quadro viram um só. Na abertura eram 4 a 5 seguidos.
- Número inteiro é formatado direto: mesmo texto do `Intl` em 400 mil valores, com teste, e cerca de 2× mais rápido.
- O motor deixou de usar `toLocaleString` com opções a cada chamada.

**Medido (CPU 6×):**

| Medida | 4.2.0 | 4.2.1 |
|---|---|---|
| CPU na abertura + troca de abas | ~1.000 ms | ~825 ms |
| Maior travada | 98–123 ms | 50 ms |

**Teste corrigido:** o teste do zoom no guia passava sem verificar nada (a escala já estava no máximo, 5.000 m). Agora
ele mede o lote encolhendo.

## 28. 4.5.0 · fluidez e visual (plano 4.3 a 4.5, aprovado em 25/11)

| Item | Feito | Medido |
|---|---|---|
| A1 · gestos pela placa de vídeo | Arrastar e pinçar só deslocam o desenho pronto (`transform`); o mapa é refeito uma vez ao soltar | p95 do quadro no arraste: 33 → 17 ms (CPU 6×) |
| A2 · guia sem refazer a tela | **Não feito:** cada leitura do GPS custa 21 ms a 6× (cerca de 2% do processador); o risco não compensa | — |
| A3 · movimento suave | Na guia seguindo, o mapa desliza e gira até a leitura nova em 0,6 s, pela placa de vídeo. Salto maior que 400 px vai direto. "Reduzir movimento" desliga | Conferido no navegador (transição aplicada) |
| A4 · guarda de desempenho | `app3-perf-browser`: o mapa não pode ser refeito durante o arraste e é refeito 1 a 2 vezes ao soltar | O próprio teste |
| B1 · câmera animada | Lote novo entra com animação de 0,22 s | — |
| B2 · hierarquia no mapa | Tiro em andamento destacado, com setas no sentido da caminhada | Prévia aprovada pelo proprietário (claro e Sol) |
| B3 · números que não tremem | Algarismos de largura fixa | — |
| B4 · folha com física | Já existia desde a 4.0-c (segue o gesto rápido) | — |
| B5 · Sol e escuro | Botões do mapa ligados ficavam brancos sobre branco no Sol (corrigido). A faixa do topo da guia fica numa linha, com a velocidade sempre visível | — |

## 29. 4.5.1 · auditoria completa (25/11)

Ferramentas usadas: ESLint, html-validate, axe-core (WCAG 2.2 AA e boas práticas), fotos em 390 px escuro e
1440 px, e revisão do CSP e do manifesto.

| Segmento | Achado | Correção |
|---|---|---|
| Código | 3 avisos: importação que sobrou da 4.2 e código morto | Removidos; 0 avisos |
| HTML | `doctype` minúsculo; 7 botões sem `type` | Corrigidos; validador limpo |
| Acessibilidade | Guia sem título (h1) para leitor de tela | Título oculto. **0 violações** em 3 temas × 11 telas, agora teste permanente (`app3-a11y-browser`) |
| Visual no computador | Janelas e aviso abriam na tela inteira; o app fica numa coluna de 480 px | Ficam na coluna do app |
| Texto | O glossário ainda dizia "Sugestão do motor" | "Distribuir melhor os pontos" |
| App instalável | Faltavam id, idioma e descrição; ícone "any maskable" junto | Manifesto completo; ícone maskable separado (o logo tem margem de segurança) |
| Segurança | CSP só com scripts e estilos assinados por hash; imagem externa só do satélite | Sem achado |

## 30. 4.6.0 · GPS com filtro de Kalman (25/11)

**Antes:** a posição era a leitura bruta do GPS; só a velocidade era suavizada.

**Agora:** `kalmanStep` em `monitor.mjs`:
- modelo de velocidade constante, eixos x e y;
- ruído de cada leitura igual à precisão informada pelo GPS;
- q = 0,3 m²/s³;
- recomeça depois de 10 s sem leitura ou de um salto maior que 50 m + 5 × a precisão.

**Simulação:** 1 leitura/s, ruído de 4 a 8 m, 900 trajetos com parada no ponto.

| Caso | Erro bruto | Com Kalman |
|---|---|---|
| A pé (ruído 4 m) | 5,8 m | 3,4 m |
| A pé (ruído 8 m) | 11,6 m | 5,8 m |
| Moto (ruído 4 m) | 5,7 m | 3,8 m |
| Moto (ruído 8 m) | 11,0 m | 6,8 m |

- **Chegada ao ponto:** sem atraso (0,1 a 0,3 s). A pé, o aviso deixou de sair cerca de 1,4 s antes por causa do tremor.
- **Avisos falsos:** 0.
- **Ressalva:** o GPS do celular já filtra um pouco e o ruído real não é independente entre leituras. O ganho em campo
  tende a ser menor que o simulado, mas não piora: o filtro recomeça em qualquer salto.
