# 1.34.0 — mapa do guia de campo sem rótulo coberto

Medição no celular de 390 px, em todos os 208 tiros dos 51 lotes, com o guia
aberto em cada tiro.

| Problema (1.33.0) | Tiros afetados | 1.34.0 |
|---|---|---|
| Rótulo "Entrada" coberto pelo 1º ponto | 56 de 208 | 0 |
| Distância entre pontos escrita em cima de ponto | 2 | 0 (oculta; a faixa "Entre pontos" do guia mostra o valor) |
| Texto sobre texto | 1 (BD3/T5) | 1 (sem mudança) |

Mapa do plano: medido nos 51 lotes, sem texto sobre ponto nem sobre texto
(sem mudança).

Como: `src/ui/lot-map.mjs` atua depois de cada desenho do mapa
(`mapa:desenhado`). Tenta o rótulo "Entrada" abaixo da seta (original), acima,
à esquerda, à direita e mais abaixo; fica na primeira posição livre e dentro do
mapa, ou volta ao original. Sem mudança de cálculo, dados ou fluxo.

Conferido: testes de blocos, Plano, sessões, gravação ao sair, contratos e
build determinístico passam.
