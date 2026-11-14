# 2.0 — o que revisar em cada parâmetro

14/11/2026. Base: 1.35.1; conferir main ao executar. Matriz de propostas/testes,
não configurações novas, valores homologados ou alterações já implementadas.
Foco: direcionamento no link móvel, sem coleta/marcação pela equipe, APK adiado.
Complementa [plano](PLANO_VERSAO_2_0.md), [caderno](APROFUNDAMENTO_2_0_WEB.md) e
[fila E1–E8](EXECUCAO_2_0.md), sem criar outra fila de funcionalidades.

## O que realmente falta fechar

1. Um contrato único de parâmetro: significado, unidade interna/exibida, origem,
   dependências, modo em que atua e regra para dados legados.
2. Evidência geométrica independente: número, segmento, mapa e exportação
   concordam. Diferença de cálculo não é a mesma coisa que incerteza da origem.
3. Ajustes previsíveis: usuário sabe o que controla e o que é resultado; variar
   quantidade não deve competir silenciosamente com variar espaçamento.
4. Otimizador com objetivo explícito e limites: não trocar cobertura por aparência
   regular nem substituir plano existente automaticamente.
5. Apresentação cartográfica validada: cotas corretamente ancoradas, símbolos,
   rótulos, escala, orientação e seleção legíveis no celular.
6. Execução da fila com comparação antes/depois e retomada publicada. Os 45 itens
   estão planejados; não estão todos feitos. A maior lacuna não é outra lista.

## Inventário e condição de uso

As 35 linhas abaixo vêm do catálogo histórico
`audit/parameter-schema-reference.json`, não de uma certificação da configuração
atual. Há dois campos estruturais adicionais e contextos externos. Reconciliar
com a fonte/bundle vigente antes de aplicar validações. O arquivo
`audit/parameter-constraints.mjs` é estudo isolado, não validação ativa de runtime.
Não impor seus mínimos/máximos como regras agronômicas. Não alterar defaults
salvos, rumo/P6 ou método linear sem decisão explícita.

### A. Tiros, direção e alinhamento — E2/E3

| Parâmetro | Melhoria de cálculo/validação | Apresentação e comprovação |
|---|---|---|
| `trackMode` | Um modo define o controlador: espaçamento, quantidade ou importação compatível; dados de outro modo não concorrem. Não ativar anéis/circular | Seletor curto; testar ida/volta entre modos sem perder valores e explicar resultado impossível sem zerar formulário |
| `trackSpacingM` | Separar intervalo pedido, alinhado e efetivamente gerado; medir perpendicularmente a eixos; não somar vazio entre lotes | Mostrar valor real em m; conferir fixture analítica, GEOS e 51/40 cenários |
| `trackCount` | Inteiro e capacidade geométrica; definir se conta eixos ou trechos antes de aceitar pedido em área fragmentada | Mais/menos com prévia; quantidade que não cabe não vira resultado diferente sem explicação |
| `boomWidthM` | Referência 36,48 m; conferir unidade e efeitos nos múltiplos sem sobrescrever valores já salvos | Secundário quando não influencia decisão; testar número fracionário e arredondamento |
| `alignToBoom` | Relação inteira entre barra e intervalo segundo política atual; respeitar teto solicitado e medir residual numérico | Controle simples; mostrar o espaçamento efetivo. Testar perto de cada múltiplo sem usar igualdade ingênua de floats |
| `bearingDeg` | Distinguir automático/null de zero; norte verdadeiro/grade, eixo módulo 180° e sentido módulo 360°. Convergência PROJ; P6 preservado | Rumo e norte coerentes; testar 0/90/180/270 e inversão sem inverter entrada por hipótese |
| `trackPhaseM` | Origem A/B e deslocamento na grade comum documentados; equivalência periódica apenas quando respeita referências do cenário | Avançado com prévia; testar translação/eixo invertido e continuidade dos membros |
| `minPieceM` | Detectar que cortar um trecho pequeno pode deixar componente sem referência/ponto; não descartá-lo só para simplificar desenho | Recolhido; reportar efeito útil quando houver. Testar lascas, ilhas e tangências |
| `selectionMode` | Selecionar tiros por identidade estável, sem confundir seleção de planejamento com execução concluída | Distinguir todos/manual/divisão existente; alterar zoom não muda seleção |
| `selectionCount` | Reconciliar o rótulo histórico “Pessoas / tiros” com a regra real; pessoas e quantidade de tiros não são necessariamente intercambiáveis | Nomes separados se conceitos distintos; testar distribuição desigual e falta de tiros sem inventar rota/tempo |

### B. Pontos e margens — E2/E3

| Parâmetro | Melhoria de cálculo/validação | Apresentação e comprovação |
|---|---|---|
| `haPerPoint` | Área usada identificada: oficial/geométrica/operacional; arredondamento do mínimo e cobertura coerentes com a regra atual | Valor editável e quantidade resultante; não recomendar número novo sem critério agronômico |
| `pointMode` | Total, por tiro ou intervalo têm uma fonte de controle ativa; definir precedência com intensidade e seleção | Alternativas claras; preservar configuração ao trocar, sem misturar campos inativos no cálculo |
| `totalPoints` | Inteiro/null com significado explícito; respeitar mínimo do plano e capacidade; total de bloco auditável por membro | Pedido e resultado efetivo claros. Testar pedido abaixo do mínimo, excedente e geometria fragmentada |
| `pointsPerTrack` | Especificar por eixo ou por trecho; não colocar todos os pontos no componente maior ignorando os demais | Avançado conforme modo; resultado por trecho verificável e sem duplicações |
| `targetSpacingM` | Intervalo ao longo do mesmo trecho válido; distribuir extremidades/resíduo conforme política e conferir valor real | Intervalo real ou faixa no resumo; cota de par específico nunca usa a faixa global do bloco |
| `edgePolicy` | Semântica explícita: margem de ponta ao longo do tiro não é menor distância à divisa; compatibilidade com quantidade | Nomes curtos e exemplo visual sob consulta; não impor recuo obrigatório |
| `edgeMarginM` | Viabilidade quando o trecho é menor que duas margens; não gerar intervalo negativo ou ponto externo | Mostrar conflito só quando existir; testar trechos curtos, buracos e ângulos de borda |
| `gapToleranceFrac` | Fração interna versus porcentagem exibida; tolerância relativa e absoluta não podem se confundir | Secundário; testar 0, limites e conversão 0,1 ↔ 10% sem arredondamento destrutivo |
| `maxAcceptableGapM` | null/ausente e valor finito têm regras diferentes; avaliar lacunas por trecho/membro, sem média esconder o pior | Só expor quando for critério útil; identificar lacuna que não pode ser resolvida com os demais limites |
| `snapToleranceM` | Distinguir raio em metros de alvo de toque em pixels; ajuste proposto deve permanecer em região válida e manter identidade | Prévia de deslocamento; testar zooms diferentes, divisa/buraco e cancelamento |
| `maxPointsCap` | Limite de capacidade não autoriza reduzir o mínimo silenciosamente. Recusar ou apresentar alternativa coerente antes de aplicar | Mensagem prática de conflito; testar cap menor que necessidade e responsividade no maior tamanho aceito |

### C. GPS e direcionamento — E4

Os nomes `monitor.*` são legados. Não significam que a equipe deve registrar
atividade nem justificam migração de schema só para trocar nomenclatura visível.

| Parâmetro | Melhoria de cálculo/validação | Apresentação e comprovação |
|---|---|---|
| `monitor.stepLengthM` | Passo é estimativa pessoal, não distância geodésica. Avaliar se agrega ao direcionamento e testar conversão/calibração | Metros prioritários; passos opcionais e aproximados, sem criar precisão falsa |
| `monitor.arrivalRadiusM` | Proximidade é apoio visual, nunca confirmação de execução. Estudar histerese considerando precisão/atraso do fix | Indicação discreta; testar oscilação na borda do raio, alvo vizinho e GPS ruim |
| `monitor.gpsAccuracyMaxM` | Precisão reportada não é exatidão garantida; combinar validade temporal/sessão com adequação ao tipo de instrução | Qualidade/indisponibilidade claras; plano consultável com GPS negado; sem orientação fina com posição inadequada |
| `monitor.offLineWarnM` | Desvio lateral assinado em eixo orientado; distância ao segmento/alvo não substitui esse valor. Limite coerente com qualidade GPS | Esquerda/direita sem oscilação; testar rumos cardeais, sentido inverso e trechos separados |

### D. Avaliação da cobertura — E2/E3

| Parâmetro | Melhoria de cálculo/validação | Apresentação e comprovação |
|---|---|---|
| `coverage.gridTargetCells` | Controla resolução/custo da avaliação, não densidade operacional dos pontos. Refinamento e origem deslocada para verificar convergência | Fica interno/avançado; comparar com grade independente e diagnóstico Voronoi recortado quando justificado |
| `coverage.minStepM` | Resolução mínima não deve ignorar faixa estreita/buraco; recurso finito e consistência com maxStep | Sem espalhar grade técnica na tela; incluir extremos/fronteira na auditoria |
| `coverage.maxStepM` | Limitar passo grosseiro, principalmente em bloco grande; min ≤ max e mesma região válida em comparação | Comparar métricas por membro e erro de estimativa; não declarar melhora abaixo da instabilidade observada |

### E. Busca e otimização — E3/E7

| Parâmetro | Melhoria de cálculo/validação | Apresentação e comprovação |
|---|---|---|
| `optimizer.mode` | Objetivo explícito e restrições; comparar regularidade, lacuna, cobertura e quantidade. Alternativas Pareto durante estudo | Resultado com benefício compreensível, sem escore técnico decorativo. Não alterar rumo/método |
| `optimizer.maxGapIncreaseFrac` | Teto relativo de piora da lacuna; separar de limite absoluto. Validar também por membro | Avançado; teste impede ganho agregado à custa de piora fora do teto |
| `optimizer.maxCvIncrease` | Confirmar escala do CV e unidade exibida antes de usar “p.p.” ou “%”; diferença absoluta não é percentual relativo | Valor técnico recolhido; fixtures com intervalos conhecidos e conversão conferida |
| `optimizer.edgeShiftFrac` | Limite de deslocamento das margens sem sair do trecho válido; não equivale a recuo legal/agronômico | Mostrar efeito na prévia, não algoritmo; testar trecho curto e borda oblíqua |
| `optimizer.phaseSteps` | Busca grossa seguida de refinamento local se houver ganho; baseline e candidato comparados na mesma métrica | Interno; medir benefício marginal e determinismo, sem mudar resultado conforme taxa de frames |
| `optimizer.maxIterations` | Parada por convergência/orçamento e cancelamento; timeout não deve aplicar plano incompleto como ótimo | Recalcular/cancelar sem travar; testar resposta tardia e manter última prévia válida |
| `optimizer.searchGridCells` | Grade da busca e grade independente de avaliação final com papéis separados; não sobreajustar à mesma amostragem | Interno; candidato só vence após validação comparável e confirmação de tolerâncias |

## Campos estruturais e contexto que também precisam de contrato

| Campo/contexto | O que falta conferir |
|---|---|
| `selectionIds` | IDs válidos e únicos, ligados aos tiros/trechos do plano; não reutilizar índice de array como identidade |
| `optimizer.allowCountMoves` | Autoriza variar quantidade só dentro de limites explícitos; respeitar escolhas fixas, mínimo e cap |
| Pessoas/equipe | Relacionar à seleção/divisão real sem prometer produtividade medida; não reintroduzir coleta/marcação |
| CRS/datum/origem/safra | Proveniência e transformação por dataset; não assumir UTM 23S para todo arquivo futuro |
| A/B e referência de bloco | Eixo/sentido/tolerância coerentes, P6 preservado, sem inferir acesso físico por referência comum |
| Geometria/área | Oficial, geométrica e usada no plano distintas; união evita dupla contagem; validar buracos/multipartes |
| Revisão do algoritmo/plano | Cálculo, cache, edição, desenho e exportação usam mesma assinatura; descartar resultado obsoleto |
| Câmera/zoom/tema | Não alteram plano; cotas/escala/seleção equivalentes; rótulos têm estabilidade por zoom |
| Satélite | Plano padrão; opt-in, atribuição, erro/limites e câmera coerentes; imagem não é levantamento |
| Offline/permissões | Verificar plano disponível de verdade; ausência de GPS/rede não impede consulta; APIs têm fallback |

## Como aplicar sem poluir a interface

O básico deve apresentar **um controlador por vez**: espaçamento ou quantidade
de tiros; modo de pontos com área/total/intervalo conforme a regra vigente;
resultado real e acesso ao mapa. Campos incompatíveis não competem silenciosamente.
Preservar valores de modos inativos para retorno, mas não usá-los indevidamente.

Resumo operacional: lote/bloco, tiros, pontos, entre tiros, entre pontos e rumo
quando pertinente. No desenho: cotas ancoradas ao trecho correto, halos, símbolos
além da cor, rótulos por zoom e escala coerente. Detalhes de otimização, schema,
versão e diagnóstico ficam recolhidos/fora do fluxo. Navegação não exige coleta.

Nenhum parâmetro novo de erro, limiar GPS ou peso de objetivo deve ser adicionado
sem necessidade. Se houver mais de uma opção coerente, comparar efeito numérico
mais tarefa no telefone; biblioteca ou algoritmo mais complexo não vence por nome.

## Tecnologias e respectivas provas

- GEOS/Shapely e PROJ/pyproj na auditoria independente; geodésica elipsoidal
  quando pertinente. Não adicionar pacote GIS pesado ao navegador só para testar.
- Testes de propriedade/metamórficos: translação, rotação, repetição, ordem de
  membros equivalente e câmera invariável. Não pressupor invariância de direção
  de entrada ao inverter um eixo dirigido.
- Convergência de grade e análise de sensibilidade; Pareto com restrições para
  comparar alternativas. Sem modelos de erro, não apresentar probabilidade fictícia.
- Tipagem gradual/unidades explícitas, funções puras e contratos de fronteira.
  Worker/índice espacial/desenho por frame apenas após medir e provar paridade.
- Playwright para tarefa/gestos/capturas com geometria real, PROJ/GEOS para números;
  ensaio físico para leitura/GPS. Mockup gerado por IA não valida nenhum cálculo.

Para cada linha, E1/E2 registra: fonte atual, unidade, modo/dependências, caso de
borda, teste independente, tolerância, evidência antes/depois e estado de execução.
Se já estiver correto, registrar e seguir; não reescrever para aparentar evolução.
