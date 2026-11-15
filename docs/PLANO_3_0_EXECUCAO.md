# Plano de execução da 3.0 até a publicação

Ordem pedida pelo proprietário (15/11/2026): fazer tudo abaixo e **publicar ao final**, com CI verde.
Cada etapa: código em `src/app3`, teste no Node e no navegador (claro, escuro, 390 px), commit e checkpoint.

## R4.2 · Plano completo
| # | Item | Pronto quando |
|---|---|---|
| 1 | Desfazer em 1 toque ao trocar de plano (opção, regra, recomendado) | Aviso "Desfazer" por 6 s; volta o plano anterior |
| 2 | Escolha de lote com busca e lotes recentes | Busca por código/fazenda; 4 recentes no topo |
| 3 | Ajustes avançados completos: distância entre tiros, tiros em múltiplos da barra, largura da barra, repartição dos pontos, total de pontos, regra das pontas, buscar distribuição melhor, restaurar padrões | Cada ajuste recalcula, valida no catálogo e pode ser desfeito |
| 4 | Mapa com gestos: pinça, arrastar, duplo toque, botão enquadrar | Sem rolar a página junto; enquadra de novo ao trocar de lote |
| 5 | Tocar num ponto: nº, tiro, distância ao vizinho e à borda | Balão curto, fecha ao tocar fora |
| 6 | Cores do mapa conferidas para daltonismo e no Sol | Pontos e tiros distinguíveis em simulação de deuteranopia/protanopia; contraste ≥ 3:1 com o fundo |

## R4.3 · Monitorar (guia por GPS)
| # | Item | Pronto quando |
|---|---|---|
| 7 | Escolher tiro e sentido (entrada) | Lista de tiros da equipe; inverter sentido |
| 8 | Guia: seta grande, distância, próximo ponto à frente (política 2.0), aviso de tiro errado e de GPS fraco/antigo | Mesmas regras de `src/gps` (testadas) |
| 9 | Tela acesa durante a guia e vibração ao chegar | Wake Lock e vibração quando o aparelho permitir; sem erro quando não |
| 10 | Mapa da guia com a posição e o trecho | Posição e precisão no mapa |

## R4.4 · Arquivos, segurança e sem internet
| # | Item | Pronto quando |
|---|---|---|
| 11 | Fichas de campo para imprimir (todos os tiros) | Uma página por tiro, legível em P&B |
| 12 | Cópia de segurança e restauração (mesmo formato da 2.x) | Ida e volta sem perda; mostra o conteúdo antes de restaurar |
| 13 | Versões anteriores do lote (IndexedDB da 2.x) | Lista as 20 últimas e restaura |
| 14 | Dados da safra do lote | Mesmas informações da aba Dados da 2.5 |
| 15 | Todos os lotes (visão geral) | Lista com pontos, tiros e alerta de cada lote |
| 16 | Bloco de lotes | Mesmo critério da 2.5 (`src/application/block-planning.mjs`) |
| 17 | Funciona sem internet e atualiza sozinho | Service worker; aviso "nova versão" |
| 18 | Duas abas abertas não se sobrescrevem | Trava de sessão da 2.x |

## R5 · Troca e publicação
| # | Item | Pronto quando |
|---|---|---|
| 19 | Migração: estado e cópias da 2.x abrem na 3.0 | Teste com estado real gravado pela 2.5 |
| 20 | `index.html` passa a ser a 3.0; versão 3.0.0 | Bateria local + CI verde |
| 21 | Publicar e conferir o link | Pages concluído; sha do `index.html` no main = VERSAO.json |

## Correções e melhorias observadas na revisão da R4.1
- O texto "Calculando…" nunca aparece: recomendação roda na tela principal (≈ 135 ms). Mover para um worker se passar de 200 ms em celular lento.
- `editsByField` gravado como `undefined` ao abrir plano sem ajustes: remover a chave em vez de gravar vazio.
- Rótulo "pontos 20–24" quebrava linha: corrigido com espaço inseparável.
- Botão "Bloco" e aba Monitorar ainda avisam "próxima etapa": somem com os itens 7–10 e 16.
- Ícone do manifesto e tema da barra do navegador no escuro (`theme-color` por esquema).
