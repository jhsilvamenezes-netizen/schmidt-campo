# SCHMIDT Campo 2.0 web — planejamento e direcionamento

Revisão de escopo em 14/11/2026. Base publicada conferida anteriormente:
1.35.1, main `2e4e2be9a44310b847155bdef9d7b78b9865ccd0`.
Conferir main novamente antes de implementar.

## Premissa corrigida pelo proprietário

**Uso exclusivamente para direcionamento. A equipe não vai coletar ou marcar
dados.** Fluxo-alvo: escolher lote/bloco → entender tiros, pontos e distâncias
→ orientar-se no campo → consultar o plano.

Coleta, concluídos, produtividade registrada e sincronização de marcações deixam
de ser objetivos. Preservar dados e funcionalidades legados por compatibilidade,
sem apagá-los. Retirar controles existentes exige análise e projeção próprias.

Foco no link e navegador móvel; PWA opcional, APK adiado. Esta revisão substitui
a premissa de coleta e redistribui os 45 itens. **IDs anteriores não identificam
necessariamente as mesmas tarefas.** Mais itens não são uma meta de produto.

## O resultado esperado

O operador entende conjunto e lote, identifica o tiro/ponto consultado, vê as
distâncias relevantes e recebe orientação coerente com a precisão dos dados e
GPS. Mapa legível, gestos estáveis, plano disponível após preparação offline e
consulta sem obrigação de registrar execução.

Método linear sem anéis; barra 36,48 m; P6 com rumo/configuração preservados.
Plano padrão; Satélite opcional. Fotografia não redefine divisa. Recuo obrigatório
exige definição aprovada. Referência comum não comprova passagem entre lotes.

## Roteiro com critérios de conclusão

Cada item é proposta/verificação, não defeito confirmado. P0 corresponde a erro
reproduzido de medida/orientação; P1 ao núcleo da evolução; P2 a extensão dependente
de benefício. Implementar em PRs pequenos, preservando parâmetros/dados.

### 1 — referência de trabalho

| ID | Fazer | Concluído quando |
|---|---|---|
| 01 | Fixar escopo e baseline | Registrar commit, datasets, versão e cenários de direcionamento sem coleta |
| 02 | Mapear fonte e custo | Identificar motor/câmera/GPS/UI/legado e medir abertura/desenho contra versão anterior; não editar bundle como fonte |
| 03 | Reconciliar parâmetros | Unidade, origem, efeito e dependências conferidos; catálogo histórico não vira restrição nova automaticamente |
| 04 | Observar uso em dois celulares | Operador escolhe bloco, consulta medidas, encontra orientação e retoma sem sinal; registrar dúvidas, erros, toques e legibilidade |

### 2 — coordenadas, rumo e topologia (P0/P1)

| ID | Fazer | Concluído quando |
|---|---|---|
| 05 | Conferir CRS/datum | Zona, hemisfério, eixos, unidades e origem por dataset; transformação comparada ao PROJ |
| 06 | Diagnosticar geometria | Anéis, buracos, autointerseção, duplicações e multipartes verificados; nenhum reparo silencioso de limite |
| 07 | Separar áreas e perímetro | Área geométrica, oficial e usada no plano identificadas; não misturar referências nos totais |
| 08 | Comparar medidas projetadas/geodésicas | Erro de projeção quantificado em área/distância e método consistente para uso operacional |
| 09 | Especificar rumo | Norte verdadeiro, norte de grade e orientação da tela distintos; convergência conferida; não inferir norte magnético |
| 10 | Validar referência de bloco | A/B, eixo e tolerâncias coerentes; rumo invertido não confunde sentido de entrada; P6 preservado |

### 3 — tiros, pontos, bordas e distribuição (P0/P1)

| ID | Fazer | Concluído quando |
|---|---|---|
| 11 | Conferir recorte dos tiros | Preservar componentes e buracos; não ligar segmentos através de área externa |
| 12 | Medir espaçamentos efetivos | Distância perpendicular entre eixos e intervalo entre pontos no mesmo trecho conferidos; solicitado, alinhado e real distintos |
| 13 | Conferir distância à borda | Menor distância à divisa, margem de ponta e distância na direção do tiro têm definições próprias; sem impor recuo |
| 14 | Validar pontos | Dentro do lote, sem duplicações indevidas; identidade/trecho corretos na seleção e exportação |
| 15 | Validar avaliação da cobertura | Refinar/deslocar grade e testar extremos; quantificar sensibilidade da estimativa |
| 16 | Comparar cobertura por membro | Lote mal atendido não escondido por média de bloco; amostragem não equivale a aplicação integral |
| 17 | Rever otimizador | Restrições e prioridades explícitas; comparar lacuna, variação, distância de cobertura e quantidade, com resultado reproduzível |
| 18 | Conferir fase/alinhamento | Grade comum respeita referência de barra 36,48 m e valores salvos; efeito na cobertura demonstrado |
| 19 | Analisar sensibilidade | Perturbações coerentes com precisão conhecida identificam instabilidade; não fabricar incerteza estatística sem modelo |
| 20 | Validar 51 lotes e 40 grupos | Contornos, membros, medidas e exports preservados; câmera não altera cálculo |
| 21 | Distinguir orientação de acesso | Trecho separado/divisa não vira rota; entrada só com referência confiável; nenhum atalho inventado |
| 22 | Planejar divisão por pessoas | Quantidade/extensão estimadas sem registrar execução, produtividade ou concluídos; não prometer tempo exato |
| 23 | Unificar revisão/desenho/exportação | Mesmo cenário vigente nos três; resultado obsoleto descartado; round-trip preserva geometria e IDs |

### 4 — GPS para orientação (P1)

| ID | Fazer | Concluído quando |
|---|---|---|
| 24 | Validar posição | Fix antigo/impreciso/fora de ordem não tratado como atual; plano consultável com GPS negado |
| 25 | Estabilizar rumo | Curso do deslocamento distinto da orientação do telefone; parado não gera direção confiável fictícia |
| 26 | Consultar destino | Selecionar tiro/ponto para orientação sem marcar realização; evitar oscilação entre alvos e manter controle manual |
| 27 | Validar desvio lateral/avanço | Projeção no segmento e esquerda/direita conferidos; distância ao alvo não substitui desvio lateral; precisão compatível com fix |

### 5 — mapa, design e didática (P1)

| ID | Fazer | Concluído quando |
|---|---|---|
| 28 | Conjunto e membro | Enquadrar todos, focar lote e retornar com contexto; qualidade equivalente ao individual |
| 29 | Hierarquia essencial | Lote/bloco, tiro/ponto consultado, entre tiros/entre pontos e orientação reconhecidos ao olhar; secundários recolhidos |
| 30 | Cotas e símbolos | Tipos de medida têm linguagem coerente, unidade e diferenciação além da cor; não cobrem ponto/divisa |
| 31 | Rótulos e escala | Prioridade estável por zoom/espaço; revisar BD3/T5 e 208 tiros; escala coerente com câmera/projeção |
| 32 | Gestos e seleção | Pinça/arraste sem seleção acidental; alvos ≥44 px quando aplicável; pontos próximos selecionáveis sem ambiguidade |
| 33 | Paleta e tipografia | Contraste Sol/satélite, texto ampliado, números legíveis, símbolos e acessibilidade conferidos |
| 34 | Projeções comparativas | Mesmo lote/bloco/estado em 360/390/412/768 px; comparar antes/depois e conferir aprovação antes da implementação |
| 35 | Prancha de orientação | Propor saída compartilhável/imprimível com identificação, rumo, escala e medidas; sem publicar coordenadas privadas |

### 6 — link, desempenho e entrega (P1/P2)

| ID | Fazer | Concluído quando |
|---|---|---|
| 36 | Prontidão offline | Plano/recursos realmente abrem sem rede após preparo; satélite e instalação PWA não obrigatórios |
| 37 | Estado de cálculo/consulta | A → B → A, resize e retomada não exibem resultado antigo como vigente; câmera não grava plano |
| 38 | Importação/exportação resistente | Limites, CRS, unidades, IDs e texto validados antes de aplicar; entrada inválida não destrói cenário nem executa conteúdo |
| 39 | Preservação do existente | Falha/quota/upgrade não apaga plano ou dados legados; coleta histórica não vira requisito do fluxo novo |
| 40 | Compatibilidade web | APIs detectadas, permissões/retomada/baixo consumo testados; fluxo principal pelo link |
| 41 | Cálculo otimizado | Funções puras/cache corretos; índice/Worker só com ganho medido, cancelamento e revisão de entrada |
| 42 | Desenho otimizado | Geometria visual separada da analítica; menos trabalho por frame sem alterar medida, seleção ou exportação |
| 43 | Diagnóstico/testes de propriedade | Versão/erro/duração exportáveis sem dados privados; invariantes cobrem casos extremos |
| 44 | Entrega e recuperação | Build/HTML/worker/versão coerentes; rollback compatível com schema; não limpar armazenamento |
| 45 | Piloto e liberação | Operadores entendem direção, medidas e limites; erro/tempo comparados; CI/site real conferidos; APK não bloqueia |

## Métodos e visual para estudar

O [caderno espacial e visual](APROFUNDAMENTO_2_0_WEB.md) detalha definições,
ferramentas independentes, algoritmos, testes e 12 frentes de design.
Mais casas decimais não aumentam a exatidão da origem/GPS. Medida de terreno
não pode ser inferida do relevo desenhado ou de imagem sem modelo adequado.

## Primeira entrega do Claude

Executar 01–03 e preparar 04. Auditar 05–14 e 20/23 com ferramentas independentes;
corrigir primeiro erro reproduzido que afete medida/orientação. Em seguida,
produzir projeções dos itens 28–35 com números verificados. Implementar em PRs
pequenos e validar os 51 lotes/40 grupos antes do piloto.

Critérios: medida/desenho/exportação coerentes, nenhum rumo baseado em fix
inválido, consulta offline após preparo e tarefa entendida sem depender de cor ou
registro de execução. Fixar tolerâncias e metas de desempenho após medir no
aparelho-alvo. Testes matemáticos não homologam limites ou acesso físico.

[Texto para Claude](INICIO_CLAUDE_2_0.md) · [Continuidade](CONTINUIDADE.md) ·
[Coordenação](COORDENACAO.md) · [Issue #1](https://github.com/jhsilvamenezes-netizen/schmidt-campo/issues/1).
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

## Execução e interrupção de sessão

[Oito entregas e critérios extras](EXECUCAO_2_0.md). [Registro vigente](RETOMADA.md).
[Como salvar progresso e trocar de IA](CONTINUIDADE_SEM_PERDER_TRABALHO.md).

[Matriz por parâmetro](MATRIZ_PARAMETROS_2_0.md): 35 campos do catálogo, estruturais e contextos, com cálculo/validação, apresentação e prova.
