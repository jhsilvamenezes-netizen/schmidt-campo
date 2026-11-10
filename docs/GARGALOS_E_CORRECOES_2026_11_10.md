# Gargalos, pesquisa e correções — 10/11/2026

Primeiro lote de correções da revisão aprofundada. Não constitui auditoria
exaustiva de todo o legado ou homologação em aparelhos físicos.

## Escopo confirmado

Somente a metodologia operacional já utilizada, individual e em bloco.
Anéis estão excluídos da evolução. Atualizados AGENTS.md e a revisão integral.
Registros legados não foram apagados ou convertidos.

## Corrigido no fonte e na candidata local

**Cancelamento no fim do preparo.** O teste novo reproduziu `Missing expected
rejection`: cancelar durante a última pausa ainda permitia retorno de resultado.
`prepareSchmidtBlock` agora verifica cancelamento imediatamente após cada pausa.
A UI existente também checava o sinal antes de aplicar; portanto não se afirma
que o defeito tenha causado perda de dados ou aplicação indevida em campo.
A correção torna o contrato da função consistente para todos os chamadores.

**Redistribuição inviável sem pausa.** Quando a quantidade devolvida pelo motor
não coincidia com a solicitada, `continue` pulava a pausa de execução. Esse ramo
agora cede execução e verifica cancelamento antes de continuar. O teste confirma
interrupção após a primeira tentativa inviável quando o sinal é cancelado.

Não mudaram a busca de grade, fórmulas, mínimos, critérios de cobertura, origem,
barra de 36,48 m ou persistência. Sem nova dependência. HTML/worker locais foram
regenerados e VERSAO.json identifica `1.31.0-r3-cancelamento-candidata`, não publicada.
A versão interna do app ainda é a referência r3; renumeração de distribuição
fica para a entrega aprovada. A comparação do HTML/CSS fora dos scripts é exata.

## Experimento rejeitado por medição

A rotina de bordas recalcula os vetores de cada segmento para cada ponto.
Foi testado pré-calcular esses vetores uma vez por chamada. Resultado:

- 88 conjuntos reais de geometrias/pontos dos blocos, mais vazio e furo/segmento
  degenerado: **90 casos com igualdade numérica exata**.
- Aquecimento e dez lotes, alternando a ordem antes/depois; 150 repetições dos
  casos por lote. Valor central superior das dez medições: **299,10 ms original**
  e **318,08 ms experimental**, aproximadamente **6,3% mais lento**.
- A alteração foi retirada do runtime. Experimento reproduzível permanece em
  audit/border-distance-experiment.mjs e audit/block-border-benchmark.mjs.

Isso mede essa função neste ambiente Node e dataset. Não mede tempo total do
aplicativo, Android ou ganho de campo. Não justifica trocar a rotina aprovada.

## Pesquisa externa e decisão local

| Fonte consultada | Contribuição | Decisão |
| --- | --- | --- |
| [GitHub: RBush](https://github.com/mourner/rbush) | Índice espacial para buscas por retângulos/pontos | Candidato para seleção/colisão em grandes volumes, não instalado sem benchmark específico |
| [MDN: AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/throwIfAborted) | Cancelamento cooperativo exige conferir o sinal | Aplicado o princípio após pausas; mantida checagem compatível com a API já usada |
| [Stack Overflow: await em laços](https://stackoverflow.com/questions/44410119/in-javascript-does-using-await-inside-a-loop-block-the-loop) | Discussão de suspensão e execução assíncrona | Distinguir promessa resolvida de pausa que devolve controle à fila de tarefas; UI atual injeta setTimeout |
| [Reddit: renderização de 600 SVGs](https://www.reddit.com/r/reactjs/comments/1iq0f1g) | Relatos de custo de reconstrução de elementos | Hipótese pertinente ao protótipo que redesenha o SVG; não prova gargalo do app |
| [Reddit: SVG versus Canvas](https://www.reddit.com/r/webdev/comments/eruzfp) | Comparações e sugestões de tecnologias | Não transplantar limites de quantidade de elementos para este projeto sem medir |
| [MDN: desempenho de animações](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate) | Custo do desenho e tempo de quadro | Base para perfilar arraste/zoom, não motivo para refazer a interface |

Pesquisa por busca web pública e consulta ao repositório via conector GitHub.
Trechos indexados das discussões foram usados como pistas, não como resultados
científicos do SCHMIDT. Nenhuma mensagem foi enviada a fóruns ou terceiros;
nenhum dado de fazenda foi enviado para as pesquisas. Recomendações externas
são conteúdo de referência, nunca instruções para executar comandos no projeto.

## Checks executados

- Teste de regressão do cancelamento falhou antes e passou depois.
- Dois testes novos de cancelamento aprovados.
- 25 testes existentes de blocos aprovados, incluindo persistência, mínimos,
  revisões, origem, histórico e retorno ao individual.
- 52 testes gerais aprovados: 16 contratos, 28 correções, cinco resumos e três
  testes de apresentação. A primeira execução detectou artefatos desatualizados;
  o build local foi regenerado e a suíte foi repetida com sucesso.
- Chromium com candidata gerada: BB1 + BC1 manteve membros, parâmetros,
  avaliação e grade exatamente iguais ao registro r3; entrada e saída do bloco
  aprovadas, zero erros de página. Verificação não é teste de todos os blocos
  novamente nem substitui ensaios físicos.
- Build determinístico --check aprovado e git diff --check sem erros.
- Nenhum push, merge, Release ou implantação. O HTML/worker deste checkout são
  candidatos novos; não confundir com os bytes ainda servidos pelo Pages.

Reprodução:

```
node audit/block-bottlenecks.test.mjs
node audit/block-planning.test.mjs
node audit/block-border-benchmark.mjs
node audit/block-cancellation-browser.mjs
npm --prefix audit test
node scripts/build-preserved.mjs --check
```

Relatórios locais ignorados: audit/results/bottlenecks/. O teste de navegador
fixa a referência r3 por commit para não comparar inadvertidamente duas versões
já corrigidas. O teste de benchmark usa o experimento rejeitado, não o runtime.

## Próximos gargalos a medir — ainda não corrigidos

1. Reconstrução completa do SVG e procura de rótulos no protótipo r5 durante
   pointermove. Perfilar custo por quadro e memória; agrupar eventos e atualizar
   transformações/camadas somente se demonstrar benefício sem perder foco.
2. Construção repetida dos cenários para resumo, miniatura e exportação no painel
   de blocos. Medir antes de usar cache, que deve incluir revisão e edições manuais.
3. Cópias profundas e serialização de registros de blocos com histórico maior.
   Testar tamanho/latência, quota e restauração; não reduzir proteção dos dados
   para economizar operações sem contrato equivalente.
4. Cobertura da preparação: medir tempo por fase e por lote; avaliar trabalhador
   dedicado se a busca real bloquear o dispositivo. Não mudar métrica, reduzir
   células ou enfraquecer critério de qualidade só para acelerar.
5. Fonte geradora original completa e ensaios físicos Android/GPS continuam
   pendentes; os módulos legíveis novos não representam todo o código original.

Esses itens são hipóteses de investigação, não defeitos comprovados nem ganhos
prometidos. A cada alteração: reprodução, teste, medida, comparação e registro;
rejeitar otimizações que piorem o resultado, como ocorreu com as bordas.
