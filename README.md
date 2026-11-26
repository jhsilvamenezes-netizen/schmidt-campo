# SCHMIDT CAMPO

Planejamento de amostragem de solo e guia por GPS no celular: tiros e pontos por lote ou bloco de lotes,
mapa e guia de campo (a pé ou de moto). Funciona sem internet depois de aberto uma vez.

**[Abrir o app](https://jhsilvamenezes-netizen.github.io/schmidt-campo/)**

## Usar
1. Abra o link com internet uma vez.
2. Escolha o lote, confira o plano e inicie a guia na aba Monitorar.
3. Para instalar: Android/Chrome → menu → Instalar; iPhone/Safari → Compartilhar → Adicionar à Tela de Início.

Os pontos são planejados (simulação): confira em campo. O registro oficial continua no Cropwise.

## Para quem desenvolve
- Entrada: `docs/PAINEL.md` (estado, regras do proprietário, fila). Tudo de ponta a ponta: `docs/TRANSICAO.md`.
- Código: `src/app3` (telas), `src/engine3` (motor), `src/dados` (51 lotes e safra). Página gerada:
  `node scripts/build-3.mjs --root` (grava `index.html`, `motor.js`, `sw.js`).
- Testes: `npm --prefix audit ci`, depois `npm --prefix audit test` e `npm --prefix audit run test:browser`.
- Versões antigas (até a 2.5) ficam só no histórico do Git.
