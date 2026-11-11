# Revisão do enquadramento do bloco — 1.31.2

O usuário relatou confusão: esperava ver todos os lotes ao escolher um grupo.
Na 1.31.1, escolher o grupo limpava o mapa conjunto; os limites só apareciam
após o cálculo. “Usar bloco” mantinha o painel Plano aberto sobre parte do mapa.

## Mudanças

- Escolher o grupo mostra imediatamente seus limites, sem inventar tiros ou
  pontos antes do cálculo e sem gravar um bloco por mera seleção.
- “Usar bloco” abre a visão completa no mapa, com todos os membros enquadrados.
- O botão “Enquadrar” fica escrito e recupera a visão conjunta após aproximação.
- Consultar um ponto destaca a posição e desenha os segmentos até a borda mais
  próxima e até o próximo ponto no mesmo trecho. Os números completos ficam na
  consulta; o desenho só recebe o texto quando o zoom oferece espaço legível.
- O resumo individual de metas fica oculto enquanto se consulta o mapa conjunto,
  para não confundir a quantidade de um lote com o total do bloco.

O mapa não muda rumos, distribuição, espaçamento, contornos ou coletas. Distância
à borda é uma medida geométrica, incluindo bordas internas; não define faixa
obrigatória, afastamento agronômico ou passagem entre lotes. Os registros e a
metodologia existentes continuam preservados, sem anéis.

## Testes e reprodução

```sh
npm --prefix audit test
npm --prefix audit run test:blocks
node scripts/build-preserved.mjs --check
node scripts/build-block-candidate.mjs
node audit/blocks-ui-browser.mjs
node audit/block-map-framing-browser.mjs
```

O teste específico confere as 40 seleções em quatro larguras (160 estados),
nomes e limites dentro do enquadramento, ausência de pontos não calculados,
abertura automática, consulta das medidas e retorno do zoom. O teste completo
confere os 51 individuais, coletas, backup/restauração, 40 blocos e offline.
Três testes geométricos verificam borda interna, projeção sobre segmento,
vértices repetidos e ponto sobre a divisa.

As capturas “antes” e “depois” usam perfis independentes para não interferir
na proteção de escritor único. Não há dados de operador nesses perfis.

A comparação com a 1.31.1 foi apresentada e a continuidade da entrega foi
aprovada. A publicação web exige PR e CI aprovados, seguida da conferência
do endereço real. APK sem distribuição até assinatura privada e migração.
