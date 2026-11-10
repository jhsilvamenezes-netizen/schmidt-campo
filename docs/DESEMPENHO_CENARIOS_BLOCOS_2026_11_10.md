# Reutilização segura de cenários — 10/11/2026

Implementada na candidata local `1.31.0-r3-desempenho-candidata`, sem publicação.
Mantida a metodologia operacional atual, individual e em bloco, sem anéis.

## Problema e mudança

O painel reconstruía todos os cenários dos membros em cada atualização de seu
resumo e miniatura, inclusive após mudanças que não alteram a grade. O custo
foi isolado e medido com o motor real antes de aceitar a otimização.

`createSchmidtBlockScenarioReader`, no módulo application/block-planning.mjs,
mantém somente o último conjunto calculado. O painel de blocos usa esse leitor.
A chave inclui os dados completos dos membros em ordem, a referência comum,
os parâmetros e as edições dos pontos. Não depende apenas do nome do lote ou
da identidade de um objeto, pois os snapshots criam objetos novos.

- Coletas e novo snapshot com os mesmos dados geométricos reaproveitam a cena.
- Alterações nos dados do lote, integrantes/ordem, origem, parâmetros ou edições
  invalidam o resultado e passam novamente pelo motor e suas validações.
- Edição inválida gera erro; não devolve a cena anterior como fallback.
- Ao voltar ao modo individual, o painel limpa o cache.
- Cache de uma entrada: não cresce com o número de blocos visitados.
- Persistência, backup e exportação continuam nos caminhos anteriores; o cache
  não grava dados e seus cenários são consumidos somente para leitura pelo painel.

Nenhuma mudança em HTML/CSS estáticos, controles, texto visível, métodos,
quantidades, coordenadas, cobertura ou barra de 36,48 m. A projeção r5 continua
separada; esta alteração não implanta seu desenho.

## Medição real e seus limites

Chromium isolado, motor da candidata e BB1 + BC1. Aquecimento, nove lotes de
30 leituras, alternando a ordem de execução sem/com cache. As duas alternativas
recebem snapshots clonados; a medição inclui construir/verificar a chave.

| Etapa medida | Mediana de 30 leituras |
| --- | ---: |
| Reconstruir os cenários em todas as leituras | 33,8 ms |
| Reutilizar a última cena quando válida | 0,8 ms |

Aproximadamente 97,6% de redução nessa rotina repetida, nesta execução. Não é
medida do tempo total do aplicativo, de renderização completa, do primeiro
cálculo ou de um telefone físico. Não elimina o trabalho de reconstruir o SVG
nem de calcular as medidas de borda; essas continuam oportunidades distintas.
A primeira leitura ou uma invalidação continua pagando pelo cálculo completo.

## Validação executada

- Cinco testes novos: snapshot/coleta, parâmetros/geometria/origem, edição manual
  válida, edição inválida, troca de ordem e limpeza explícita.
- Motor real: 40 blocos, 88 pares bloco/membro, leitura inicial e reutilizada.
  Todos os campos operacionais coincidem. Excluído apenas `generatedAt` da
  comparação: duas execuções geram horários diferentes naturalmente; o cache
  preserva o horário da cena que efetivamente calculou.
- Troca BB1 → BC1 no painel manteve seu texto; retorno ao individual aprovado.
- HTML/CSS fora dos scripts idênticos à candidata anterior; zero erros de página.
- 52 testes gerais, 25 testes de blocos e dois de cancelamento continuaram
  aprovados; com os cinco novos, **84 testes de módulo/contrato aprovados**.
- Artefatos locais regenerados; build determinístico --check e diff --check
  aprovados. VERSAO.json atualizado com os hashes da candidata.

Reprodução:

```
node audit/block-scenario-cache.test.mjs
node audit/block-scenario-cache-browser.mjs
node audit/block-planning.test.mjs
node audit/block-bottlenecks.test.mjs
npm --prefix audit test
node scripts/build-preserved.mjs --check
```

Medições e resultado completo em `audit/results/scenario-cache/report.json`.
Não houve envio ao GitHub, merge, implantação Pages ou geração/distribuição APK.

## Continuidade da revisão

A redução de cálculos repetidos foi aceita porque houve ganho local e paridade.
Desenho incremental do mapa, gestos/foco da projeção e custo de serialização
continuam frentes separadas. Não se declara todo o projeto otimizado. Novas
mudanças devem repetir reprodução, medição, testes de invalidação e conferência
operacional; não introduzir bibliotecas ou alterar armazenamento por hipótese.
