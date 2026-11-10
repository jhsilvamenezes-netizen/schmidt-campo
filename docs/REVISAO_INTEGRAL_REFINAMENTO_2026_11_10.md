# Revisão integral e critérios de refinamento — SCHMIDT Campo

10/11/2026. Revisão verbal/técnica e roteiro verificável. Não constitui
implementação nem aprovação de um novo layout. Referências: versão publicada
r3, projeção local r5 e módulos legíveis atuais. O fonte gerador original
completo ainda não foi recuperado, conforme src/README.md.

## Escopo corrigido pelo proprietário

Somente a metodologia operacional atual, individual e em bloco. Anéis estão
excluídos da evolução. As referências anteriores a circular/importado abaixo
são inventário histórico do legado, não propostas de novos métodos. Não
converter registros antigos ou alterar controles publicados por esta revisão.

## Direção do produto

O operador deve conseguir responder: onde estou planejando, qual método está
ativo, quais lotes participam, o que preciso fazer e quais medidas orientam a
atividade. Cada informação deve contribuir para uma dessas decisões.
A mesma qualidade deve existir no individual, no bloco e no foco de um membro;
isso exige consistência de dados, interação e apresentação, além da aparência.

A r5 é evidência de viabilidade do mapa conjunto. Seus ensaios não abrangem a
integração com coleta/GPS, todos os métodos de planejamento, todos os gestos,
todos os estados de erro nem uso físico em campo. Não extrapolar seus resultados.

## Inventário de melhorias com critérios de aceite

| ID | Prioridade | Refinamento proposto | Verificação antes de concluir |
| --- | --- | --- | --- |
| V01 | Alta | Identificar modo, método, revisão ativa e área de trabalho; detalhes técnicos ficam fora do fluxo normal | Operador distingue prévia, plano em uso e lote em foco sem consultar ajuda |
| V02 | Alta | Separar seleção de membros e foco do mapa | Focar BC1 conserva os 24 pontos do bloco; Individual carrega 23 apenas por ação explícita |
| V03 | Alta | Hierarquia: tarefa, mapa, distâncias, detalhe contextual, conferência | Medidas essenciais visíveis; nenhum controle fixo encobre ponto, cartão ou ação ao rolar |
| V04 | Alta | Usar vocabulário da metodologia operacional atual | Rótulo, unidade e origem da medida corretos em cada método; não chamar trajeto curvo de eixo paralelo |
| V05 | Alta | Revisar pessoas, ha/ponto, quantidade mínima e grade como decisões relacionadas | Alteração explica seu efeito no resultado; reduzir equipe não reduz mínimo de amostras |
| V06 | Alta | Campo numérico com unidade, limites e erro junto do campo | Decimal com vírgula, vazio, zero, extremo e valor inválido tratados sem gravação silenciosa |
| V07 | Média | Reutilizar paleta, tipografia, espaçamento e componentes atuais | Valores de estilo inventariados; contraste medido; escala de texto ampliada sem perda de funções |
| V08 | Alta | Diferenciar selecionado, em foco, coletado, pendente e indisponível por mais que cor | Teste em escala de cinza, teclado e leitura dos rótulos; estado inequívoco |
| V09 | Alta | Melhorar alvo de toque, foco e leitura dos detalhes | Toque com alvos próximos não escolhe ponto errado; alternativa por lista; foco preservado após render |
| V10 | Alta | Gestos de mapa completos | Arraste, zoom, dois dedos, cancelamento, saída da área e rotação não disparam coleta/seleção acidental |
| V11 | Alta | Rótulos por prioridade e densidade | Todos os nomes de lote acessíveis; números aparecem por espaço/zoom; ponto selecionado sempre identificado |
| V12 | Média | Preservar enquadramento por contexto | Abrir um detalhe não perde zoom; voltar ao conjunto reenquadra de maneira previsível |
| D01 | Alta | Resumo único para mapa, cartões, lista e exportação | Mesma revisão e mesmos valores em todas as representações, inclusive após edição manual |
| D02 | Alta | Distância lateral, intervalo no trecho e borda com escopos distintos | Não calcular intervalo atravessando buraco, fragmento ou outro lote; distância à borda não vira recuo obrigatório |
| D03 | Alta | Compatibilidade explícita da metodologia atual com operação em bloco | Matriz de métodos define combinações admitidas; não liberar por proximidade ou referência isolada |
| D04 | Alta | Separar área oficial, geométrica e operacional | Identificar a origem onde afeta cálculo; não substituir silenciosamente uma pela outra |
| D05 | Alta | Integridade de registros e revisão | Mudar integrantes ou parâmetros não atribui coleta antiga a ponto novo; backup restaura o mesmo escopo |
| D06 | Alta | GPS com precisão e temporalidade | Fix antigo, perda de sinal e retorno não produzem posição confiável falsa nem coleta automática indevida |
| C01 | Alta | Separar cálculo, cena, interação, desenho e persistência | Foco/zoom não chama cálculo nem grava; módulos testáveis sem DOM quando possível |
| C02 | Alta | Estados explícitos de prévia e operação | Resultado atrasado descartado; confirmação só aplica a assinatura de entradas validada |
| C03 | Média | Tipagem gradual dos contratos | JSDoc/checkJs ou TypeScript sem emissão verifica unidades, IDs, revisões e entradas; adoção sem migração global |
| C04 | Média | Renderizar somente o necessário | Medir custo de arraste/zoom antes/depois; agrupar atualizações em requestAnimationFrame; preservar foco |
| C05 | Média | Cache por revisão, não por rótulo do lote | Mudança de geometria, método ou parâmetros invalida resultado; foco visual reutiliza cena válida |
| C06 | Alta | Build reproduzível e fronteira com legado | Gerador passa --check; CSP, dados e assets Android coerentes; nenhum ajuste manual no bundle minificado |
| Q01 | Alta | Testes por tarefa e por risco | Cobrir fluxos críticos e casos adversos, sem usar quantidade de asserções como medida de usabilidade |
| Q02 | Alta | Usabilidade com operadores | Registrar sucesso, enganos e tempo nas tarefas; nenhum teste com pessoas é declarado sem execução |
| Q03 | Alta | Entrega recuperável | Artefatos identificados, hashes, cópia de segurança, plano de retorno e aprovação da entrega concreta |

## Metodologia operacional atual — individual e em bloco

A evolução fica restrita à metodologia já utilizada: tiros orientados pela
referência do lote, espaçamento e fase, pontos no mesmo trecho, barra de
36,48 m quando aplicável e operação individual ou em bloco compatível.
Anéis não integram o plano de evolução. Não adicionar novos métodos.

- Distância entre eixos não é caminhada; intervalo no trecho não atravessa
  divisas, buracos ou fragmentos.
- Pontos editados continuam vinculados ao lote e à revisão correta.
- O bloco conserva o mínimo de cada membro e a avaliação de cobertura.
- Trocar foco no mapa não muda o plano nem recalcula pontos.
- Registros legados não devem ser convertidos ou apagados automaticamente.

## Achados concretos desta revisão

1. `src/ui/block-planning.mjs` reúne criação de controles, preparação, desenho,
   estados e exportação. A integração do novo mapa merece extração incremental
   do desenho e dos modelos de leitura, com teste de contrato do controlador.
2. `audit/block-map-quality-client.js` usa um estado transitório e redesenha o
   SVG no arraste. Tem pointerdown/move/up, mas não um ciclo completo de captura,
   pointercancel e multi-touch. São lacunas da projeção, não falhas novas
   comprovadas na versão publicada.
3. O redesenho substitui nós interativos; preservação do foco deve ganhar teste
   dedicado antes da integração. O ensaio anterior de Enter num ponto não
   equivale a navegação completa com teclado ou leitor de tela.
4. As medições da r5 vieram de cenários padrão. Métodos alternativos, registros
   editados, cenários vazios, fonte ampliada e aparelhos físicos precisam de
   matrizes específicas. Os 1.929 checks anteriores não demonstram esses casos.
5. A r5 embute os 91 cenários para comparação offline. O app deve carregar ou
   derivar somente o necessário, com cache por revisão; medir antes de adotar
   índice espacial, Canvas ou WebGL.
6. Os estudos r4/r5 estão em arquivos locais ainda não versionados neste
   checkout. Organizar esses estudos em commit/PR próprio antes de integração,
   sem incluir audit/results, anexos privados ou dados de operadores.

## Tecnologia selecionada por benefício verificável

| Técnica | Aplicação recomendada | Condição para adoção |
| --- | --- | --- |
| Componentes e variáveis de estilo | Consistência de campos, cartões, botões e estados | Reutilizar valores existentes; comparação visual por componente e tela |
| Máquina de estados explícita | Prévia/cálculo/pronto/ativo/erro/cancelamento | Tabela de transições e testes; biblioteca somente se reduzir complexidade |
| SVG com camadas e controle de rótulos | Escala atual e acessibilidade do mapa | Perfil real de desempenho; medir custo dos eventos e memória |
| Web Worker | Cálculo pesado sem bloquear interação | Medir gargalo; cancelar por revisão; testar fallback e resultados atrasados |
| Índice espacial | Busca de pontos e colisões em dados grandes | Benchmark demonstra benefício; resultados iguais ao método de referência |
| Canvas/WebGL/OpenLayers/MapLibre | Volumes ou bases cartográficas maiores | Necessidade comprovada, offline, licença, memória, acessibilidade e manutenção avaliados |
| Testes baseados em propriedades | Translações, permutações de lotes, revisões e exportação/restauração | Semente reproduzível e exemplo mínimo quando falhar |
| GEOS/PROJ | Oráculo independente de geometria/projeção | Unidades/CRS identificados e tolerâncias numéricas documentadas |
| Playwright e comparação visual | Regressões de tarefas, estados e layout | Mesmos dados, viewport, fonte e revisão; inspeção humana das diferenças |
| Instrumentação de desempenho | Responsividade e vazamento de recursos | Baseline no mesmo aparelho/dataset; relatar mediana e percentil, não só melhor execução |

Não há justificativa atual para reescrita global ou adição indiscriminada de
frameworks. Nenhuma dependência nova foi instalada nesta revisão. Referências
já consultadas constam de ESTUDO_MAPA_BLOCO_DETALHADO_R5.md e
ESTRATEGIA_DIDATICA_E_QUALIDADE.md; este documento não alega nova pesquisa web.

## Check a cada mudança

Antes de editar: registrar problema, estado de reprodução, resultado esperado,
escopo, dados afetados e teste que distinguirá sucesso de falha.

Depois da mudança:

1. Conferir diff e limites do escopo; separar proposta visual de correção interna.
2. Executar teste do comportamento e do caso adverso relevante.
3. Conferir mapa, resumo e persistência contra a mesma revisão do plano.
4. Quando visual: capturar antes/depois e conferir toque, foco, texto ampliado,
   menor tela suportada, barras fixas, estados vazio/carregando/erro/offline.
5. Quando houver dados: validar backup/restauração, edição manual e retomada.
6. Quando houver cálculo: comparar com referência independente e invariantes.
7. Quando houver trabalho assíncrono: cancelar, trocar seleção rapidamente,
   reabrir e conferir ausência de resultado obsoleto.
8. Registrar comando, resultado, evidência, limitações e pendências. Falha não
   vira aceite por enfraquecimento de assert ou remoção do caso.
9. Repetir somente os checks afetados; ampliar a suíte conforme o risco e as
   regras de entrega. Após aprovação dos checks, seguir ao próximo item.

Ficha mínima: `ID | problema | mudança | teste/comando | resultado | evidência |
limitação | estado (proposto/em execução/verificado/bloqueado)`.

## Sequência de execução

1. Consolidar transições da metodologia atual, individual e em bloco, inventário de componentes e
   critérios acima. Esta revisão fornece a primeira versão, não encerra a matriz.
2. Refinar projeções dos estados ausentes: troca de método, edição manual,
   carregamento/cancelamento, erro e retomada, com comparação ao original.
3. Apresentar a proposta visual específica para aprovação conforme a diretriz
   do proprietário; implementar em incrementos revisáveis depois do aceite.
4. Integrar modelo de leitura e mapa comum, depois fluxo de escolha e detalhes.
   Cada incremento passa pelos checks pertinentes antes do próximo.
5. Ensaiar com operadores: escolher bloco, ampliar membro, interpretar medidas,
   consultar ponto, voltar ao individual e retomar após interrupção. Medir e
   corrigir dificuldades observadas, sem inventar resultados de campo.
6. Revisar pacote web e requisitos Android; publicação e assinatura/migração
   continuam decisões de entrega, separadas da aprovação do desenho.

## Resultado desta etapa

Revisão documental e inspeção dos módulos e evidências existentes. Não foram
alterados cálculos, interface publicada, dados, fonte de runtime ou APK.
Não foram repetidas suítes de execução: não houve mudança executável nesta
etapa. Os resultados anteriores continuam identificados como anteriores.
