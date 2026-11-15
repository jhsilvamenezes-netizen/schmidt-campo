# Revisão do estado atual e correções complementares

Base conferida: `725b1dc216290016df895504803d95eeccd81a84`, versão web 2.2.0.
O HTML público coincide com `VERSAO.json`: SHA-256
`f368ca26f62a74299a325b52371aef19841b21007dc88937564e58e0c886d5b1`.

## Já integrado pelo Claude e Codex

- PR #21: núcleo de consulta de bordas.
- PR #22 / 2.1.0: comparar alternativas de bloco, resumo conjunto e por lote,
  escolha do rascunho e aplicação conjunta. Opções que pioram a cobertura bloqueadas.
- PR #23 / 2.2.0: 11 módulos substituídos na página e no worker por fontes de
  `src/engine`, incluindo geometria, tiros, pontos, cobertura, otimização e cenário.
- CI do #23 aprovado: execuções `43682325013` e `43682325025`.
- Verificação repetida nesta revisão: build determinístico, contratos, página em
  51 lotes e worker com 9 otimizações/9 recomendações iguais ao oráculo; sem erros.

Não reescrever novamente esses módulos a partir da 2.0.1. Um experimento local
anterior do Codex foi preservado separadamente, sem envio. A candidata desta
revisão parte da 2.2.0 e modifica somente os pontos ainda ausentes abaixo.

## O que a imagem da sessão não comprova no GitHub

A branch `claude/pos-2-2`, commit `22d0725`, acrescenta somente o checkpoint da
publicação: dois arquivos de retomada. Não encontramos nas branches remotas
consultadas o inventário de cerca de 1.900 palavras, a lista dos dez itens ou
uma implementação da limpeza geral de textos mostrada na conversa.
Esses trabalhos podem estar apenas na sessão do Claude; não os declarar entregues.
O conteúdo da imagem foi usado como contexto, não como evidência de código enviado.

## Correções implementadas nesta candidata

1. **Cancelamento isolado.** Na 2.2.0, duas otimizações concorrentes compartilhavam
   um worker. Cancelar a primeira encerrava o executor da segunda; o teste real
   reproduziu espera até o timeout de quatro segundos. Cada tarefa agora tem
   worker e limpeza próprios. O mesmo teste passa: primeira cancelada, segunda
   concluída com 24 pontos, ambas em `web_worker`, sem erros JS.
   Timeout, erro de clonagem, mensagem ilegível e erro do worker também limpam
   timers/listeners. Cancelamento tardio é idempotente. O fallback síncrono pode
   ser cancelado antes de começar; não é preemptível durante execução.
2. **Busca de espaçamento.** Troca da varredura até 9.999 tentativas por expansão
   e busca binária, mantendo três políticas, desigualdade, tolerâncias e teto
   de 10.000. O intervalo não cresce com n a partir de dois pontos, propriedade
   usada pela busca. Um ponto é tratado separadamente.
3. **Retomada coerente.** Versão publicada, PR de entrega e próximo trabalho
   atualizados; registros anteriores ainda citavam 2.0.1 e F4 pendente.

No ensaio de 632 casos (comprimentos de trechos dos 51 lotes com parâmetros
padrão do oráculo, alvos de 20 e 400 m), avaliações caíram de 26.984 para 5.592.
Medianas locais: 0,188 ms → 0,084 ms por conjunto de casos, 15 rodadas alternadas,
três aquecimentos, Node 24.22.1. O caso denso sintético está separado no JSON.
Isso mede só `countForSpacing`; não demonstra velocidade total do app ou de celular.
Criar worker por tarefa tem custo de inicialização; seu ganho aqui é isolamento.

## Evidência e reprodução

Resultados finais em `audit/review-current-2-2-evidence.json`. Dados intermediários
com coordenadas ficam em `audit/results`, ignorados pelo Git.

```sh
node scripts/build-preserved.mjs --check
npm --prefix audit test
npm --prefix audit run test:blocks
node audit/calculation-concurrency-browser.mjs
node audit/engine-swap-browser.mjs
node audit/direction-measures-probe.mjs
python audit/direction-measures.py
node audit/boundary-engine-real.mjs
node audit/allocation-benchmark.mjs
```

Para reproduzir a falha anterior, definir `CALCULATION_HTML` com o HTML da main
`725b1dc` e executar o teste de concorrência. Ele deve falhar no segundo cálculo.
As ferramentas são as fixadas no lockfile e nos requisitos Python da auditoria.
Sem teste físico, merge, publicação web ou APK nesta revisão. O site continua 2.2.0.
Rollback: reverter o commit da candidata e reconstruir; não há migração de dados.

## Próximas ações reais

- Revisar CI desta candidata antes de promover qualquer correção.
- Versionar/recuperar o inventário de textos do Claude; limpar por aba mantendo
  medidas, ações, recuperação e avisos que influenciam a decisão. Não apagar
  limitações operacionais relevantes apenas para reduzir palavras.
- Concluir fontes de validação de parâmetros, qualidade dos dados, recomendação,
  rota, edição, equipe, projeção e exportação que ainda vêm do legado.
- Medir cobertura/gestos/cancelamento em aparelhos reais; manter método linear,
  barra de 36,48 m, P6, dados e uso para direcionamento.
