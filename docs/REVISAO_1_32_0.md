# 1.32.0 — revisão do modo bloco: visual, legibilidade e código (candidata em branch)

Pedido do proprietário em 11/11/2026: "melhorar código, visual-design, estrutura,
formatação [...] análise mais profunda e criteriosa". Esta candidata fica em
branch; **não altera a `main` nem o link** até a aprovação das imagens de antes
e depois. Inclui a correção 1.31.4 (gravar ao sair).

## Medido antes (1.31.3, no link)

| Item | Medição (celular 360/390, notebook 1440, temas normal e Sol) |
| --- | --- |
| Números dos pontos no mapa do bloco | De 58 pontos, só 21 a 25 tinham número; 17 a 21 números em cima de pontos |
| Letras | 35 textos de 10 px e 3 de 11 px no mapa do bloco (mínimo do aplicativo: 12 px) |
| Alvos de toque | +, − e Enquadrar com 40 px; "Abrir este lote" com 42 px (mínimo: 44 px) |
| Tema Sol | Cores escritas à mão no desenho: o mapa do bloco não mudava no Sol |
| Botões do bloco | Aparência diferente do resto; "Usar bloco" sem destaque de ação principal |
| Salto de tela ao abrir | 0,167 no notebook (o conteúdo chegava depois da primeira pintura e empurrava o mapa 80 px) |
| axe-core (todas as regras) | 0 violações |
| ESLint (`recommended`) nos módulos novos | Sem erro real; 4 avisos (2 comparações `== null` intencionais, 2 nomes repetidos) |

## O que mudou

| # | Onde | Antes | Agora |
| --- | --- | --- | --- |
| 1 | Mapa do bloco · pontos | Número ao lado, só em parte dos pontos | **Número dentro do ponto** quando os vizinhos ficam a 23 px ou mais na tela; abaixo disso todos viram ponto simples e aparece "Aproxime (+) para ver o número de cada ponto". Nunca "uns com número, outros sem" |
| 2 | Mapa do bloco · rótulos | Sobre pontos | Tiros (T1…) e nomes dos lotes só em lugar livre; pontos contam como área ocupada. O nome do lote aparece sempre |
| 3 | Cores | Fixas | Tokens do aplicativo (lote, tiro, ponto, rótulo): **o tema Sol vale no mapa do bloco** |
| 4 | Letras | 10 e 11 px | 12 px ou mais em tudo |
| 5 | Botões do mapa | 40 e 42 px | 44 px, canto e contorno do padrão |
| 6 | Entre tiros / Entre pontos | Dois cartões iguais | Mesmas cores do resto do aplicativo (entre tiros azul, entre pontos marrom) |
| 7 | Botões do planejamento em bloco | Fundo cinza, letra fina | Padrão do aplicativo; **"Usar bloco" é o botão principal** |
| 8 | Abertura | Tela saltava | Miolo invisível até estar montado (trava de 2,5 s); salto 0 |
| 9 | Código do mapa | Linhas de até 1.900 caracteres | Reescrito legível, mesma interface pública, mesmos identificadores e atributos de teste |

Sem mudança de método, de dados, de registros, de textos de outras telas nem
do mapa de cada lote.

## Conferido

| Verificação | Resultado |
| --- | --- |
| Rótulo sobre ponto (5 formatos × 3 estados) | 0 em 15 medições (antes 17 a 21) |
| Letras abaixo de 12 px no mapa do bloco | 0 (antes 38) |
| Alvos abaixo de 44 px nas telas do bloco, no celular | 0 (antes 4) |
| Salto de tela (CLS) | 0 em 5 formatos (antes 0,167 no notebook) |
| axe-core, todas as regras, 20 telas | 0 violações |
| `blocks-ui-browser` (51 lotes idênticos, cópia de segurança, coleta em bloco, GPX) | passa |
| `block-map-framing-browser` (40 grupos × 360, 390, 768 e 1280 px) | passa |
| `blocks-runtime-browser`, `all-fields-block-reference` (51 lotes, 749 pontos) | passam |
| `npm test`, `test:blocks`, sessões, `save-on-exit-browser` | passam |
| Build determinístico e `VERSAO.json` | conferidos |

Não rodados aqui: validadores em Python (`validate-runtime-blocks.py`) e o
build Android; a esteira do GitHub roda os primeiros no PR.

## Pendências que dependem do proprietário

1. Aprovar as imagens e o merge desta candidata.
2. Fonte única: o gerador ainda aplica módulos sobre o HTML compilado da 1.31;
   o projeto-fonte completo está no repositório `central-precos`
   (`ferramentas/schmidt`). Unificar acaba com os pontos de integração frágeis.
3. Fora do modo bloco continuam alvos pequenos antigos (etapas 2 a 5 com 36 px
   no celular de 360 px, caixas de seleção de 24 px, "?" de 36 px no notebook)
   e o subtítulo da marca com 9 px: dependem da fonte única ou de nova exceção.
