# 2.0 web — melhorias que precisam entrar no estudo

Complemento do [plano principal](PLANO_VERSAO_2_0.md), em 14/11/2026.
Foco: link no navegador móvel; PWA opcional, APK adiado.
As tarefas 34–45 são propostas de investigação/implementação, não defeitos todos
confirmados nem funcionalidades entregues. Confirmar main e reproduzir antes de editar.

## O que a revisão do código mostrou

- `src/application/block-planning.mjs` já tem assinaturas de entrada/origem,
  revisão de registros e cache. O avanço é conferir a validade de ponta a ponta,
  incluindo edição, coleta, desenho e exportação, sem criar outro mecanismo paralelo.
- `src/platform/browser-session-lock.mjs` já protege a janela escritora com Web
  Locks. Sem essa API, gravações comuns seguem o legado e restauração exclusiva
  é recusada. Cobrir esse comportamento na matriz de navegadores; não prometer
  a mesma proteção onde a plataforma não oferece o recurso.
- `src/platform/service-worker.js` já verifica o HTML e espera fechar clientes
  antigos. Falta ampliar a evidência de prontidão offline e compatibilidade entre
  versão do app e schema de dados, especialmente para recuperação/rollback.
- `src/persistence/backup-service.mjs` já tem limite de arquivo, recuperação e
  tratamento de gravações. Backup com hash verifica integridade; não é criptografia,
  autenticação do autor ou cópia remota automática.

Não reimplementar esses recursos porque aparecem na lista. Acrescentar cobertura
e corrigir somente lacunas comprovadas. A inspeção acima é leitura de código,
não um novo ensaio em telefone ou auditoria completa de segurança.

## Tarefas complementares, com benefício e critério

| ID / prioridade | Melhoria e benefício real | Como estruturar e comprovar |
|---|---|---|
| 34 / P0 | **Saúde do armazenamento:** evitar que o operador confunda dados locais com dados protegidos fora do aparelho | Detectar disponibilidade real por leitura/gravação, tratar quota e erro. Usar `navigator.storage.estimate()` quando disponível; avaliar pedido contextual de persistência, sem prometer concessão. Testar recusa/ausência de API e pressão de espaço. Browser pode remover dados; backup externo continua necessário. Exibir somente a ação útil, conforme proposta visual aprovada |
| 35 / P1 | **Preparação para sair sem sinal:** saber se o trabalho está disponível offline antes de ir ao lote | Verificar recursos obrigatórios, plano e dados locais, não só `navigator.onLine` ou existência de worker. Distinguir primeiro acesso incompleto, base disponível e satélite indisponível. Abrir URL real após corte de rede e após encerramento do navegador; conferir plano e coleta |
| 36 / P0 | **Coleta ligada à revisão correta do plano:** impedir que uma coleta antiga seja atribuída a outro ponto após recalcular | Conferir vínculo entre ID do ponto, lote/bloco, versão do plano, assinatura dos parâmetros e geometria de origem. Criar revisão explícita quando alterar o plano em execução; preservar o anterior e exigir decisão sobre continuidade. Reordenar/renumerar desenho não pode mover a marcação para outra coordenada |
| 37 / P1 | **Prévia e aplicação consistentes:** o plano visto precisa ser o plano usado | Estados explícitos de edição, cálculo, prévia, aplicação e cancelamento; aproveitar assinaturas existentes. Resultado só aplica se revisão de entrada e seleção ainda forem atuais. Simular A → B → A com respostas fora de ordem e edição durante cálculo; não aplicar resultado obsoleto nem perder a coleta |
| 38 / P0 | **Ações resistentes à repetição:** toque duplo, voltar e repetir importação não duplicam trabalho | Definir identidade de operação onde necessário e transações/versão esperada; não depender apenas de desabilitar botão. Testar dois toques, retorno pelo histórico e repetição de restauração/importação. Desfazer deve restaurar a alteração pretendida sem apagar uma coleta posterior válida |
| 39 / P1 | **Confiança nas medidas:** associar número, direção e trecho corretos | Definir tolerâncias conforme unidade, escala e precisão da origem. Distinguir distância entre eixos, ao próximo ponto no mesmo trecho, à divisa e distância percorrida ao longo do tiro. Testar ponto sobre vértice, segmento muito curto, buraco, polígono separado, rumo invertido, rotação e exportação; comparar com biblioteca independente |
| 40 / P1 | **Cobertura com evidência de estabilidade:** evitar declarar melhor uma distribuição por efeito da grade de avaliação | Conservar a comparação atual e avaliar sensibilidade com grade independente mais fina e/ou deslocada, mesma área válida e pontos na borda/interior. Registrar maior lacuna, p95 e variação dos resultados. Se diferenças entre alternativas forem menores que a incerteza da avaliação, não proclamar vencedor nem substituir plano salvo automaticamente |
| 41 / P1 | **Mapa legível em movimento:** preservar a percepção de lote, tiro e ponto durante zoom/pan | Separar geometria operacional da geometria simplificada para desenho. Simplificação só na visualização, nunca no cálculo/exportação. Priorizar rótulos por espaço/zoom com estabilidade para não piscar; seleção considera área de toque em pixels e resolve ambiguidade de pontos próximos. Validar rumo, escala, medidas e seleção após rotação/resize |
| 42 / P1 | **Equipe e retomada sem ambiguidade:** saber quem faz o quê e o que falta | Verificar equilíbrio por pontos e extensão dos trechos, sem presumir que quantidades iguais custam o mesmo. Identidade de pessoa/atribuição consistente; resumo por lote/tiro com pendentes e concluídos. Simular pausa e redistribuição com coleta existente. Trabalhar em vários celulares continua exigindo processo explícito; sem backend não há sincronização automática |
| 43 / P1 | **Entrada de arquivos e texto segura e previsível:** nome/importação não executam conteúdo nem travam o celular | Revisar caminhos de KML/XML/JSON, SVG/imagens e nomes exibidos. Limitar bytes, quantidade de elementos/coordenadas, profundidade e tempo; tratar texto como texto; controlar URLs externas e rejeitar formato não suportado. Conferir `NaN`, unidades, lat/lon trocadas, IDs repetidos e CRS ausente. Arquivo reprovado não altera o estado anterior |
| 44 / P1 | **Atualização e recuperação compatíveis com os dados:** voltar o código não pode inutilizar o que já foi coletado | Definir quais versões de schema cada build lê/escreve; testar upgrade, aba antiga e volta a build anterior com schema novo. Se reversão de dados não for segura, usar recuperação por exportação compatível ou correção adiante, sem executar rollback cego. Conferir namespace dos caches/bancos na origem compartilhada do GitHub Pages |
| 45 / P1 | **Qualidade comprovada por tarefa:** medir o benefício para quem está no campo | Jornada com operadores: preparar, localizar próximo ponto, coletar, corrigir engano, perder sinal, retomar e exportar. Registrar erros, pedidos de ajuda, tempo, toques e recuperação; comparar mesma tarefa antes/depois. Diagnóstico exportável sem dados privados, teste de duração prolongada e falhas injetadas; sem telemetria remota automática |

P0 é prioridade para prevenir associação incorreta/perda de dados **quando a lacuna
for reproduzida**; uma hipótese pendente não equivale a defeito bloqueante.
Novos indicadores, confirmações e resumos são propostas de UI: projetar e comparar
antes de implementar, respeitando as autorizações do proprietário.

## Quatro decisões técnicas que evitam retrabalho

1. **Estado do trabalho separado da câmera.** Plano aplicado, coletas e revisões
   são domínio; zoom, pan, foco e imagem são apresentação. Chegada de GPS ou
   desenho de um frame não deve regenerar a distribuição nem gravar o plano.
2. **Validação em camadas.** Formato/unidade primeiro, consistência entre campos
   depois, condição operacional por último. Mensagem junto do que precisa de
   correção; não limpar o formulário. Ex.: um número finito pode ainda ser
   incompatível com o modo selecionado; um plano matemático válido pode depender
   de conferir acesso no campo. Não ativar validação estrita histórica sem migração.
3. **Preservação antes de otimização.** Reusar assinaturas/cache existentes;
   tipar fronteiras e extrair funções puras gradualmente. Web Worker só para custo
   demonstrado, com revisão de entrada, cancelamento e descarte de resposta velha.
   Desenho adaptativo só se eliminar gargalo sem mudar medida/seleção.
4. **PWA é uma melhoria do link.** Detectar capacidades, manter fluxo direto no
   navegador e explicar o limite offline. Sem Web Locks/armazenamento/permissão,
   a alternativa não pode aparentar exclusividade ou gravação que não possui.

## Cenários que devem entrar na matriz de teste

| Cenário | Resultado esperado |
|---|---|
| Coletar, mudar espaçamento e recalcular | Coleta continua ligada ao plano original; novo plano não herda marcação por posição no array |
| Calcular bloco A, escolher B e voltar a A | Somente resultado atual aplicável; sem imagem ou resumo do grupo errado |
| Dois toques em coletar, aplicar ou importar | Efeito definido e verificável, sem duplicação ou alternância acidental |
| Pouco espaço, persistência recusada ou navegador encerrado | Erro distinguido de sucesso; dados já gravados recuperáveis; instrução prática de backup |
| Preparar trabalho online e sair sem sinal | Teste de prontidão corresponde ao que realmente abre; satélite opcional não bloqueia |
| Trocar de aba, voltar pelo histórico ou manter build antigo aberto | Estado atual recarregado antes de obter escrita; manter exclusividade onde disponível |
| Importar nome com marcação HTML e arquivo excessivo | Nada executado; operação rejeitada/limitada antes de comprometer estado e responsividade |
| Reverter código após migração de schema | Compatibilidade provada ou recuperação documentada; nenhuma regravação destrutiva silenciosa |
| Ponto perto da borda ou dois pontos muito próximos na tela | Cota e seleção correspondem ao ponto correto; precisão apresentada não supera os dados |
| Sessão prolongada com GPS e várias trocas de lote | Sem crescimento contínuo de observadores/URLs/cache; coletar continua responsivo e persistente |

Não usar limpeza real do aparelho da equipe como teste. Usar perfil isolado e
dados sintéticos para falhas; testar dados representativos de forma privada.
Registrar duração e volume do ensaio prolongado em vez de afirmar “estável por
horas” sem execução. Recursos internos como logs/revisões não devem poluir a tela.

## Como encaixar na execução sem transformar tudo em uma reescrita

| Lote de trabalho | Itens | Entrega verificável |
|---|---|---|
| A — diagnosticar | 01–04 + reprodução de 34–38 | Baseline atual, custo de abertura e relatório de validade do plano/coleta; corrigir a primeira falha comprovada |
| B — dar segurança ao trabalho | 05–14 + 34–40 + 43–44 conforme dependência | Contratos e revisões testados; offline e recuperação; evidência geométrica independente |
| C — reduzir esforço | 15–23 + 41–42 | Projeções comparadas, escolha do proprietário e ensaio de tarefa no telefone |
| D — otimizar e liberar | 24–33 + 45 | Ganhos medidos, piloto no link, dados preservados e plano de recuperação compatível |

Os itens complementares aprofundam os anteriores; não são 12 projetos separados.
Uma PR pode cumprir um critério de mais de um item. Registrar dependência e custo
antes de ampliar escopo. Não atrasar uma correção segura para esperar a 2.0 inteira.

## O que permanece fora da entrega obrigatória

Contas, servidor, sincronização entre aparelhos, inteligência artificial, rotas
automáticas e satélite offline em massa dependem de necessidade validada,
privacidade, custo e condições de uso. Não são pré-requisitos da 2.0 web. Se a
equipe confirmar necessidade de vários aparelhos, primeiro estudar IDs,+conflitos e sincronização eventual; não adotar “última gravação vence” para coletas.
Não prometer predição de solo, ganho agronômico ou orientação mais precisa do que
a medição permite. APK continua adiado.
