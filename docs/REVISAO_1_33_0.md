# 1.33.0 — modo bloco em todas as telas (tablet, notebook e topo do celular)

Continuação da 1.32.0, sob a liberação do proprietário de 12/11/2026
(`AGENTS.md`). Revisão dos fluxos do modo bloco que faltavam: lote aberto
dentro do bloco, guia de campo dentro do bloco, tablet e notebook.

## Medido antes (1.32.0)

| Tela | Problema |
|---|---|
| Notebook 1440 px, bloco em uso | Mapa do bloco com 390 px de altura fixa numa área de ~800 px: desenho pequeno, pontos sem número, metade da área vazia |
| Tablet 768 px, bloco em uso | Mesmo caso: mapa de 390 px e mais de 400 px vazios abaixo |
| Celular 390 px, guia de campo dentro do bloco | Topo apertado: "Voltar ao plano" e o selo do bloco quebravam em 3 linhas cada |
| Celular 390 px, bloco em uso | Selo "Bloco · BA1 + BA2 + BA3" em 3 linhas |

## O que mudou

| # | Onde | Antes | Agora |
|---|---|---|---|
| 1 | Mapa do bloco no notebook | 390 px | Até 66% da altura da janela (máx. 680 px): no bloco BA1+BA2+BA3, **número em todos os 58 pontos** já na visão inteira |
| 2 | Mapa do bloco no tablet | 390 px | Até 56% da altura (máx. 560 px) |
| 3 | Selo do bloco no celular | Nome de todos os lotes, em 3 linhas | "Bloco · 3 lotes" em uma linha (o nome completo continua no botão para leitor de tela; os lotes aparecem nas abas logo abaixo) |
| 4 | Guia de campo dentro do bloco, celular | "Voltar ao plano" em 3 linhas | Uma linha (o selo sai do topo só no guia; as abas mostram o bloco) |

Sem mudança de método, dados, registros, do mapa de cada lote ou do guia.

## Conferido

| Verificação | Resultado |
|---|---|
| Fluxo completo do bloco (prévia, usar, abrir lote, guia, tiro) em 390, 768 e 1440 px | sem erro de JavaScript, sem rolagem lateral |
| `blocks-ui-browser`, `blocks-runtime-browser`, `block-map-framing-browser` (40 grupos × 4 larguras), `all-fields-block-reference` | passam |
| `operational-plan-browser`, sessões, `save-on-exit-browser`, `npm test`, `test:blocks` | passam |
| Build determinístico e `VERSAO.json` | conferidos |

Pendências que continuam: APK (chave privada), subtítulo da marca de 9 px no
celular, "?" de 36 px no notebook e o selo "Norte para cima" sob os botões
quando as ferramentas do mapa estão abertas no guia.
