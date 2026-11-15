# 2.1.0 — comparar antes de usar no modo bloco (F4/U4)

15/11/2026. Responde ao achado F4 da revisão independente: a comparação de ajustes
existia só no lote individual.

## Como funciona

- **Sem cálculo novo:** a preparação do bloco já testava espaçamentos comuns (passadas de
  36,48 m) e fases. Para cada um, guardava o melhor, com a mesma grade comum, as mesmas
  células de cobertura e a mesma redistribuição de pontos. Antes devolvia só o recomendado.
- **Lista:** agora o rascunho mostra a melhor opção de **cada espaçamento**: tiros e pontos
  do conjunto, pontos acrescentados para manter a cobertura, pior cobertura em relação ao
  individual, ponto mais perto da borda e detalhe por lote.
- **"Escolher":** troca o rascunho e o mapa sem gravar. "Usar bloco" continua sendo **uma
  operação única** para todos os membros. Voltar ao individual devolve o plano individual intacto.
- **Opções que pioram a cobertura** de algum lote ficam recolhidas, com o motivo, e não
  podem ser escolhidas (a mesma regra que já impedia usar o bloco nesse caso).
- **A lista não é gravada** no bloco: é retirada antes de entrar no modo bloco.

## Provas

`audit/block-compare-browser.mjs`, 40 grupos a 390 px:

| Verificação | Resultado |
|---|---|
| Grupos preparados com comparação | 40/40 |
| Opções mostradas | 517 (355 bloqueadas por perda de cobertura) |
| Ordem por espaçamento; uma só "escolhida" = a recomendada; resumo igual ao rascunho | sem falha |
| Escolher outra opção não grava nada | sem falha |
| Usar bloco: tiros e pontos de cada lote iguais ao prometido | 7/7 grupos testados |
| Lista não gravada no bloco | sem falha |
| Sair do bloco: plano individual efetivo idêntico | 7/7 |
| Erros de página | 0 |

Também passaram `blocks-runtime-browser` (40 grupos), `blocks-ui-browser`,
`block-map-selection-browser` e os testes de unidade de blocos.

Visual: no celular, o quadro tem cerca de 920 px com 3 opções. As 9 bloqueadas,
recolhidas, ocupavam cerca de 3.000 px.
