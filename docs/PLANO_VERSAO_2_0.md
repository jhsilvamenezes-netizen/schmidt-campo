# SCHMIDT Campo — plano de evolução para 2.0

Revisado em 14/11/2026. Base conferida: **1.35.0 r3**, main
`a3c0a60ac34d1b01e31d0491fdb2f6626146f31b`. Este é um plano para implementação,
não uma declaração de funcionalidades entregues. Revalidar main ao começar.

## O resultado esperado

Uma ferramenta confiável no celular para escolher lote ou bloco, entender o
plano, seguir tiros e pontos, coletar e retomar o trabalho, inclusive sem rede.
A **2.0 web** estará pronta quando isso for comprovado pelo link no navegador
dos celulares da equipe. Prioridade definida pelo proprietário em 14/11/2026:
melhorar o site e sua experiência móvel. Instalar como PWA é opcional; o fluxo
principal deve funcionar ao abrir o endereço. APK fica fora do caminho crítico
e não é requisito de entrega. O número da versão não substitui os critérios.

## Onde estamos

| Já entregue | O que ainda falta comprovar ou resolver |
|---|---|
| 51 lotes individuais e 40 opções de bloco; contornos, tiros, pontos e medidas | Operação real em telefone, ao sol e com rede/GPS instáveis |
| Pinça, arraste e enquadramento do mapa conjunto | Cobertura de gestos e leitura no conjunto de aparelhos utilizados |
| Plano padrão e Satélite opcional, com limites de rede e memória | Desempenho, bateria e disponibilidade da imagem em campo; satélite não é garantido offline |
| Backup com integridade, restauração, proteção de gravação e atualização offline testados | Recuperação no navegador com dados representativos e troca de telefone via backup |
| Fontes legíveis de correções e build determinístico sobre artefato preservado | Fonte original completa ou substituição gradual dos trechos legados, com paridade comprovada |
| CI aprovada e site publicado conferido | Compatibilidade nos navegadores utilizados e atualização pelo mesmo endereço |

Evidências: [Issue #1](https://github.com/jhsilvamenezes-netizen/schmidt-campo/issues/1),
[PR #12](https://github.com/jhsilvamenezes-netizen/schmidt-campo/pull/12),
[auditoria](https://github.com/jhsilvamenezes-netizen/schmidt-campo/actions/runs/43581333770),
[blocos](https://github.com/jhsilvamenezes-netizen/schmidt-campo/actions/runs/43581333643).

## Regras que acompanham toda a evolução

- Preservar método linear, barra de 36,48 m, planos, coletas e separação entre individual e bloco. Sem método de anéis.
- P6 mantém rumo/configuração; a revisão da divergência continua adiada. Não escolher rumo novo nem reinserir observação operacional sem nova orientação.
- Distância à borda é medida; não estabelece recuo obrigatório. Fotografia não redefine divisas. Referência comum não comprova passagem física entre lotes.
- Plano inicia como padrão. Satélite segue opcional e secundário; não enviar coordenadas automaticamente ao provedor.
- Novas propostas de organização visual recebem projeções comparativas, com avaliação do escopo já aprovado antes da implementação. Este plano não aprova um redesenho específico.
- Não publicar anexos privados ou backups. Não distribuir APK com chave histórica pública ou recomendar desinstalar o app atual para testar.
- Melhorias internas têm reprodução, teste e resultado mensurável. Tecnologias novas entram quando resolvem um problema demonstrado.

## Ordem de execução

Prioridade P0 bloqueia a entrega correspondente por risco a dados/uso. P1 integra
o núcleo da 2.0. P2 depende de benefício demonstrado. Cada linha vira uma tarefa
pequena ou um PR; registrar estado na Issue #1, sem marcar proposta como feita.

### Etapa 1 — consolidar a base e medir (P0)

| ID | Fazer | Considerar concluído quando |
|---|---|---|
| 01 | Reconciliar versão, documentação, PRs e artefatos | main, VERSAO.json, pacote e site apontam para arquivos verificáveis; registros antigos identificados como históricos |
| 02 | Mapear a fonte que existe e os trechos legados | Há inventário de cálculo, persistência, GPS, câmera e UI; cada parte tem origem, teste e fronteira de substituição. Não chamar bundle de fonte recuperada |
| 03 | Medir abertura, cálculo, toque, desenho e memória | Comparação repetida da 1.35.0 com versão imediatamente anterior, mesmo aparelho/dados; tempos mediano/p95, tarefas longas e recursos registrados |
| 04 | Reproduzir a tarefa completa no navegador de dois celulares representativos | Individual e bloco: abrir → planejar → coletar → sair/voltar → backup → offline. Registrar modelo, RAM, sistema/navegador, tamanho, falhas e passos |

Gargalo já observado: na CI sintética, CPU limitada a 4×, mediana de abertura
532,6 → 636,9 ms contra a referência histórica `8232d79`; cálculo dos cenários
336,6 → 327,3 ms. Isso orienta a investigação da inicialização, mas não identifica
a causa nem mede telefone físico. Não remover recuperação de dados para abrir mais rápido.

### Etapa 2 — dados e recuperação (P0)

| ID | Fazer | Considerar concluído quando |
|---|---|---|
| 05 | Rever cada caminho de gravação | Nenhuma confirmação de sucesso antes de persistir; erro/quota/bloqueio deixam o estado recuperável; coletar e fechar imediatamente conserva a alteração |
| 06 | Versionar contratos de plano, coleta, geometria e backup | IDs estáveis; versão de schema e migrações explícitas; falhas não substituem dados válidos por vazios; reexecutar migração não duplica registros |
| 07 | Exercitar interrupções e concorrência | Fechamento durante salvar/restaurar, aba antiga, processo encerrado e arquivo incompleto não sobrescrevem estado atual; recuperação testada |
| 08 | Simplificar a recuperação para a equipe | Backup completo restaurado em perfil limpo e aparelho de teste, incluindo imagens/histórico e individual/bloco; instrução curta verificada por um operador |

Avaliar IndexedDB como repositório principal apenas se a medição demonstrar que
serialização/gravação síncrona é gargalo. Hoje já há IndexedDB e proteção de
gravação: migrar tudo sem necessidade criaria risco novo. Desenhar migração com
leitura compatível, cópia de segurança e retorno seguro antes de trocar armazenamento.

### Etapa 3 — método, parâmetros e geometrias (P1)

| ID | Fazer | Considerar concluído quando |
|---|---|---|
| 09 | Criar contrato único dos parâmetros realmente usados | UI, cálculo, importação e backup usam o mesmo significado, unidade e validação; atualizar o inventário histórico antes de ativar validação estrita |
| 10 | Conferir tiros e orientação | Rumo, referência A/B, fase e alinhamento da barra reproduzem o cenário preservado; clipping conserva trechos válidos em geometrias côncavas/multipartes |
| 11 | Conferir pontos e medidas | Pontos dentro do lote; sem duplicações indevidas; distância ao próximo ponto do mesmo trecho e menor distância à divisa verificadas independentemente; não medir através de lacuna como se fosse tiro contínuo |
| 12 | Tornar a regra de bloco explícita | Compatibilidade usa referências e parâmetros pertinentes; ordem da seleção não altera resultado; cada membro mantém identidade, registros e acesso individual; impedir mistura/duplicação acidental de alternativas sobrepostas |
| 13 | Conferir qualidade da distribuição | Comparar quantidade, maior lacuna, variação de espaçamento e distância de cobertura antes/depois; documentar quando são necessários pontos extras; rejeitar melhora em uma métrica que degrade cobertura sem critério aprovado |
| 14 | Rastrear dados e importações | CRS/datum, origem/safra e tipo de área identificados; KML/XLSX/JSON com unidades e IDs conferidos; arquivos inválidos/grandes/interrompidos não apagam o plano; geometria histórica não substitui atual silenciosamente |

Usar GEOS/PROJ ou equivalente independente nas verificações, com tolerâncias
documentadas na unidade correta. Testes gerados de invariantes podem ampliar
cobertura: mudar ordem dos membros, repetir cálculo, variar zoom e importar/exportar.
Isso não homologa limites legais, recomendação agronômica ou passagem entre lotes.

### Etapa 4 — uso móvel, mapa e didática (P1)

| ID | Fazer | Considerar concluído quando |
|---|---|---|
| 15 | Mostrar o necessário para iniciar | Operador encontra lote/bloco, área por ponto, equipe, quantidade e distâncias sem abrir ajustes avançados; comparar tempo/toques em tarefa observada |
| 16 | Garantir mapa completo e consulta de membros | Todos os membros cabem ao escolher/enquadrar bloco; cada lote abre com a mesma qualidade do individual; voltar ao conjunto preserva contexto |
| 17 | Refinar cotas e rótulos | Distâncias essenciais sempre legíveis no resumo; no desenho, prioridades por zoom evitam sobreposição. Número do ponto não encobre nome, rumo ou medida; revisar BD3/T5 e os 208 tiros do guia |
| 18 | Validar interação com uma mão | Alvos de pelo menos 44 px, teclado sem cobrir ação, foco visível, pinça/arraste sem coleta acidental, rotação sem perder estado; larguras 360/390/412/768 e altura reduzida |
| 19 | Padronizar texto, formato e acessibilidade | Vocabulário curto e consistente; vírgula decimal, m/ha/° e precisão adequados; contraste WCAG AA onde aplicável, leitura ampliada e leitor de tela; estados não dependem apenas de cor |
| 20 | Consolidar Plano/Satélite | Mesma câmera e coordenadas, atribuição visível, imagem não confundida com limite; falha/ausência de rede mantém planejamento; troca de lote e retomada não exibem imagem de outro escopo |

Propostas visuais: produzir antes/depois do MESMO lote, zoom, tema e largura;
explicar em uma frase o benefício. Evitar textos de histórico, comparação de
versão ou termos técnicos na tela de operação. Cotas adicionais só quando a
geometria e o espaço permitirem; resumo não deve esconder distâncias essenciais.

### Etapa 5 — GPS e orientação de campo (P1)

| ID | Fazer | Considerar concluído quando |
|---|---|---|
| 21 | Rever aquisição e qualidade de posição | Timestamp, ordem, idade, precisão e sessão verificados; permissão negada, retorno e baixa precisão não tornam posição antiga atual |
| 22 | Revisar chegada, desvio e rumo | Limiares compatíveis com precisão e velocidade observadas; GPS parado não cria rumo confiável; nenhum salto provoca coleta ou troca de tiro indevida |
| 23 | Testar energia e ciclo do navegador | Suspender/retomar, bloquear tela, modo economia e navegador encerrado conservam dados; observadores GPS e recursos de tela acordada encerrados quando deixam de ser necessários; APIs indisponíveis têm alternativa segura |

Não prometer precisão centimétrica com GPS comum. Filtragem/histerese são opções
depois de comparar trilhas simuladas e ensaio físico; conservar fix bruto e
incerteza, evitar filtro que produza aparência de precisão falsa. Navegação entre
lotes não implica rota segura de acesso. Sem rastreamento em segundo plano por padrão.

### Etapa 6 — arquitetura e desempenho avançado (P1/P2)

| ID | Fazer | Considerar concluído quando |
|---|---|---|
| 24 | Extrair progressivamente o legado para módulos legíveis | Motor espacial sem DOM, casos de uso, repositórios e apresentação com contratos claros; substituição por trecho, preservando resultados e build reproduzível |
| 25 | Unificar estado e câmera quando houver equivalência comprovada | Uma fonte de parâmetros/resumo e transformações de câmera verificadas; zoom/pan não recalculam plano nem gravam coleta |
| 26 | Reduzir trabalho repetido e custo de desenho | Invalidar cache por dados/versão/parâmetros/edições relevantes; cancelar trabalho obsoleto; agrupar desenho por frame; comparar tarefas longas, memória e resposta antes/depois |
| 27 | Adotar ferramentas adicionais só conforme medição | Tipagem gradual nas fronteiras, Web Worker para cálculo longo, índice espacial para consultas caras ou renderizador diferente somente com ganho e paridade demonstrados |
| 28 | Diagnosticar falhas sem expor dados | Relatório local/exportável com versão, etapa, duração e código de erro; sem coordenadas, coletas ou arquivos privados por padrão; nenhum envio remoto automático |

Direção arquitetural proposta: dados de origem → domínio (geometria/parâmetros)
→ casos de uso (planejar/coletar/restaurar) → adaptadores (armazenamento/GPS/rede)
→ apresentação. Validar IDs e schemas nas fronteiras. Não adotar framework,
microserviços, IA ou WebGL apenas para chamar a versão de avançada. Worker exige
tratamento de cancelamento, serialização e retorno; índice exige invalidação correta.

### Etapa 7 — link, PWA e entrega web (P1)

| ID | Fazer | Considerar concluído quando |
|---|---|---|
| 29 | Garantir acesso direto e permissões claras | HTTPS e mesmo endereço/origem preservados; GPS negado/retomado funciona sem bloquear planejamento; uso não exige instalar PWA; mudança futura de domínio tem plano para os dados locais |
| 30 | Consolidar atualização e offline da PWA | Primeiro acesso online e reabertura offline testados; worker novo espera clientes antigos e valida integridade; backup e registros sobrevivem à atualização; falta de espaço tem tratamento e recuperação |
| 31 | Rever navegadores e dependências web | Chrome Android como alvo inicial e demais navegadores conforme uso real; detectar suporte a armazenamento, GPS e outras APIs, oferecer fallback; lockfiles e dependências auditados sem troca ampla de plataforma |
| 32 | Consolidar CI e identificação de entrega | Gates proporcionais, testes separados de publicação, artefatos/hash verificáveis, versão coerente em título/manifesto/metadados; evitar rótulo 1.31.0 remanescente em versão mais nova |
| 33 | Liberar candidata web e piloto antes da 2.0 | Critérios abaixo atendidos no link real, problemas restantes classificados, rollback web e recuperação de dados ensaiados; instrução de atualização sem limpar dados |

**APK adiado:** preservar documentação de assinatura e migração, mas não investir
em build, Capacitor, SDK ou distribuição nesta fase. Retomar somente se surgir
necessidade concreta e nova priorização. A ausência da chave privada não bloqueia
a evolução ou a publicação do site.

Sincronização entre aparelhos, contas, edição colaborativa e mapas offline de
satélite ficam em avaliação posterior (P2). Exigem necessidade real, política de
conflitos/privacidade e condições/licenças do provedor; não fazem parte obrigatória
da 2.0. Offline atual não significa licença para baixar imagem em massa.

## Parâmetros: o que revisar sem confundir quem usa

| Grupo | O operador precisa entender | Regra de revisão |
|---|---|---|
| Identificação | Fazenda, lote(s), safra, plano ativo | IDs e origem claros; grupo não se confunde com lote |
| Equipe | Pessoas e divisão do trabalho | Inteiro positivo; preservar cadastro; distribuição justa não significa rota ótima |
| Intensidade | ha por ponto e total de pontos | Distinguir mínimo calculado, quantidade escolhida e quantidade efetiva; não arredondar para reduzir cobertura |
| Tiros | Rumo, espaçamento/quantidade, seleção e fase | Metros e graus explícitos; distância entre eixos, não entre pontas; referências conferidas |
| Barra | Largura e alinhamento | Referência 36,48 m; não sobrescrever valor salvo silenciosamente; explicar efeito só quando necessário |
| Pontos | Quantidade por tiro, intervalo desejado e intervalo real | Medida no trecho correto; lacunas e ajustes manuais entram na validação |
| Bordas | Distância geométrica e política de margem | Não impor recuo operacional sem definição aprovada |
| GPS | Idade, precisão, chegada e desvio | Regra coerente com a qualidade do fix; distinguir indisponível de zero |
| Cobertura/otimização | Qualidade da distribuição e custo de cálculo | Avançados recolhidos; comparar métricas e tempo, preservar limites e método |
| Imagens | Origem, disponibilidade e câmera | Imagem de referência; dados externos só após escolha |
| Arquivos | Tipo, versão, CRS, integridade e tamanho | Preview/validação antes de aplicar; preservar estado anterior quando falhar |

O inventário técnico histórico está em `audit/parameter-schema-reference.json`.
Contém 35 entradas no catálogo, além de campos estruturais e parâmetros de
contexto; documentos antigos citam 37 parâmetros de interface. Reconciliar a
contagem e a versão antes de usá-lo como contrato atual. Não transformar os
valores mínimos/máximos da proposta isolada em regra operacional homologada.
`audit/parameter-constraints.mjs` ainda é estudo, não validação ativa de runtime.
Revisar conversão de frações internas para porcentagem e pontos percentuais,
metros/ha/graus, ângulo normalizado e diferença entre rumo dirigido e eixo de tiro.
Preservar valor bruto e precisão interna; arredondar apenas para apresentação.

## Matriz de verificação e critérios para chamar de 2.0

| Verificação | Cobertura mínima proposta |
|---|---|
| Dados/método | 51 individuais e 40 grupos; geometria independente, IDs estáveis, cálculos determinísticos, edições manuais, exports GPX/KML e restauração |
| Mobile | 360/390/412/768 px, retrato/paisagem e teclado; dois telefones representativos, Sol/contraste/texto ampliado; tarefa completa observada |
| Resistência | Sem rede, provedor falhando/lento, quota, arquivo inválido, fechamento durante gravação/restauração, retomada e atualização com aba antiga |
| GPS | Negado, atrasado, fora de ordem, impreciso, parado, retomado e perda de sinal; simulação mais teste físico |
| Desempenho | Baseline atual e versão anterior; p50/p95, tarefas longas, resposta durante gesto, heap/recursos, requisições e consumo em sessão representativa |
| Link/PWA | Acesso direto por HTTPS, navegadores-alvo, permissões, instalação opcional, atualização com aba antiga, offline e recuperação por backup |

Critérios de liberação: nenhum defeito conhecido que provoque perda/duplicação
de coleta ou orientação incorreta; gates automatizados aprovados; piloto no link com
operadores concluído; limitações e recuperação documentadas. Metas iniciais para
avaliar, não promessas: controles ≥44 px, tarefa sem ajuda e sem erro crítico,
sem crescimento contínuo de recursos após ciclos repetidos. Definir orçamento
de tempo/FPS/bateria apenas após medição no aparelho-alvo e registrar os valores.
Uma falha de integridade bloqueia a entrega afetada; uma hipótese de melhoria
não justifica reescrever tudo ou bloquear correções independentes.

## Primeira tarefa para o Claude

Começar pelos itens **01–03**, em branch própria, e preparar o roteiro do item
04 para o telefone da equipe. Reproduzir a 1.35.0, comparar a abertura com a
versão anterior, instrumentar etapas e só então corrigir o maior custo comprovado.
Se a fonte original não aparecer, continuar pela extração incremental com testes,
sem substituir o app por um piloto antigo. Não tentar executar os 33 itens em um PR.

Cada entrega registra: problema, reprodução, alternativa escolhida, arquivos,
teste, resultado antes/depois, riscos, recuperação e próxima tarefa. Usar
[CONTINUIDADE.md](CONTINUIDADE.md), [COORDENACAO.md](COORDENACAO.md) e Issue #1.
Texto pronto de início: [INICIO_CLAUDE_2_0.md](INICIO_CLAUDE_2_0.md).

## Anexo — campos técnicos a reconciliar

Catálogo histórico de 35 entradas; nomes para localizar código e testes, não para expor todos na tela. Confirmar presença e significado na versão atual.

| Campo | Significado no catálogo histórico | Unidade |
|---|---|---|
| `trackMode` | Como gerar os tiros | — |
| `trackSpacingM` | Distância máxima entre tiros | m |
| `trackCount` | Quantidade de tiros | tiros |
| `selectionMode` | Tiros que recebem pontos | — |
| `selectionCount` | Pessoas / tiros | pessoas |
| `haPerPoint` | Hectares por ponto | ha |
| `pointMode` | Como repartir os pontos | — |
| `totalPoints` | Total de pontos | pontos |
| `pointsPerTrack` | Pontos por tiro | pontos |
| `targetSpacingM` | Distância desejada entre pontos | m |
| `boomWidthM` | Largura da barra | m |
| `alignToBoom` | Tiros em múltiplos da barra | — |
| `bearingDeg` | Direção dos tiros | ° |
| `minPieceM` | Trecho mínimo com ponto | m |
| `edgePolicy` | Distância das pontas | — |
| `edgeMarginM` | Margem fixa da borda | m |
| `maxAcceptableGapM` | Distância máxima aceitável entre pontos | m |
| `optimizer.mode` | Prioridade da busca | — |
| `optimizer.maxGapIncreaseFrac` | Busca: aumento máximo do maior intervalo | % |
| `optimizer.maxCvIncrease` | Busca: aumento máximo da irregularidade | p.p. |
| `gapToleranceFrac` | Folga sobre o intervalo-alvo | % |
| `snapToleranceM` | Encaixe ao arrastar ponto | m |
| `maxPointsCap` | Teto de pontos por lote | pontos |
| `monitor.stepLengthM` | Comprimento do passo | m |
| `monitor.arrivalRadiusM` | Distância para "chegou ao ponto" | m |
| `monitor.gpsAccuracyMaxM` | Precisão de GPS aceitável | m |
| `monitor.offLineWarnM` | Aviso de saída da linha | m |
| `trackPhaseM` | Deslocamento do conjunto de tiros | m |
| `coverage.gridTargetCells` | Cobertura: células da grade | células |
| `coverage.minStepM` | Cobertura: passo mínimo da grade | m |
| `coverage.maxStepM` | Cobertura: passo máximo da grade | m |
| `optimizer.edgeShiftFrac` | Busca: deslocamento máximo da margem | % |
| `optimizer.phaseSteps` | Busca: candidatos por trecho | candidatos |
| `optimizer.maxIterations` | Busca: rodadas | rodadas |
| `optimizer.searchGridCells` | Busca: células da grade | células |

Incluir também campos estruturais como `selectionIds`, `optimizer.allowCountMoves`, membros do bloco, referências A/B, geometria/CRS, IDs e edições; equipe também aparece em contexto externo ao catálogo; reconciliar sua relação com `selectionCount` (rótulo histórico “Pessoas / tiros”), sem assumir que são o mesmo conceito. O schema histórico lista modos que não fazem parte da metodologia aprovada: não ativar anéis/circular ao reconciliar o contrato. Valores legados precisam de diagnóstico e migração explícita, nunca descarte silencioso.
