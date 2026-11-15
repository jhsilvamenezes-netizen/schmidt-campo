# Evolução do motor e do uso móvel

Planejamento de 14/11/2026, após a 2.0.1. Base conferida no GitHub:
`118e6d63e957f0a34737463b18b4713b7f6edd2a`. Este documento organiza execução;
não representa novo motor, interface ou versão publicada.

## Diagnóstico crítico

O app é **2.0.1** e o motor declara **0.5.1-sim**. A numeração menor não comprova
obsolescência técnica. O inventário atual está em
`audit/upgrade-motor-mobile-inventory.json`: APIs do aplicativo real, navegador
Chromium, perfil local descartável. Não foram feitos benchmarks novos nesta etapa.

A fragilidade comprovada de manutenção é a ausência do projeto-fonte original
completo. O gerador atual é uma reconstrução parcial declarada: integra módulos
legíveis ao artefato imutável 1.31, conferindo pontos únicos, dados, CSP e hashes.
Isso protege a paridade, mas torna mudanças profundas mais trabalhosas e sujeitas
a conflitos. Atualizar apenas o rótulo do motor não resolve essa dependência.

Já há boas bases: APIs de geometria/projeção/recorte/alocação separadas, worker
para otimização e recomendação, cancelamento na preparação de blocos, cache de
cenários, testes de 51 lotes/40 grupos e conferência independente GEOS/PROJ.
Não se deve reconstruir tudo sem aproveitar essas garantias.

Problemas de produto ainda abertos: comparação de ajustes indisponível em bloco;
controles e regras de coleta legados ainda interferem no direcionamento;
E5/E6 completos e validação em aparelhos reais pendentes. As correções GPS da
2.0.1 estão entregues e não devem ser reabertas como se ainda estivessem ausentes.

## Onde procurar ganho real

| Evidência atual | Consequência | Intervenção proposta |
|---|---|---|
| Integração por substituições do bundle em `scripts/build-preserved.mjs` e `scripts/block-transform.mjs` | Fronteiras frágeis para alterar o núcleo e risco de divergência página/worker | Recuperar fonte recente; na ausência, extrair módulos identificados por etapas, com procedência e comparação diferencial |
| Distância ponto/divisa repetida em três módulos | Correções futuras podem divergir entre mapa, painel e comparação | Núcleo único que retorne distância, projeção na borda e identidade do segmento |
| `adjust-compare.mjs` calcula cenários no mesmo ciclo da interface | Custo de abrir comparação pode crescer com o plano | Medir duração/tarefas longas; mover para execução cancelável se necessário |
| `block-planning.mjs` usa busca limitada e grade alvo de 1.500 células | Melhor opção encontrada não significa ótimo global ou cobertura contínua garantida | Tornar orçamento, critério e resolução explícitos; verificar alternativas finalistas numa grade independente mais fina |
| `block-map.mjs` recria SVG e limites a cada desenho | Pode haver trabalho evitável durante gestos | Perfil de pan/zoom; separar geometria estável, câmera e rótulos antes de avaliar outro renderer |
| `lot-map.mjs` consulta caixas DOM para corrigir colisões | Pode forçar cálculo de layout durante desenho | Medir; agrupar leituras/escritas e invalidar só quando cena/câmera mudar |
| Benchmark existente compara cenários padrão | Não cobre toda preparação de blocos, gestos, cancelamento ou sessão longa | Ampliar matriz de medição com operações reais e limites de memória/cancelamento |

As linhas de desempenho são hipóteses apoiadas no código, não defeitos ou ganhos
já medidos. Uma sessão pode concluir que não compensa otimizar determinado trecho.

## Ordem de execução

| Etapa | Entrega concreta | Aceite para avançar |
|---|---|---|
| U0 — referência recente | Cenários/dados/artefatos 2.0.1 fixados; perfil de abertura, troca de lote, preparação de bloco, comparação, gestos e sessão longa | Resultados por cenário, dispositivo/navegador, mediana e cauda; scripts e limites documentados |
| U1 — medidas e contratos | Função única de ponto/divisa; contratos de metro local/UTM/lon-lat, direção e trecho | Paridade nos 51 lotes/40 grupos; furos, componentes separados, tangências e degenerados; oráculo independente |
| U2 — núcleo sustentável | Fachada de motor com entradas/saídas explícitas; primeiro módulo independente da integração textual | Extração fiel antes de otimizar; origem registrada, nenhuma dependência DOM/armazenamento; resultados e exports equivalentes |
| U3 — cálculos responsivos | Coordenador de tarefas com revisão do plano, cancelamento, descarte de resposta antiga e fallback | Troca rápida de lote/entrada/parâmetros nunca aplica resultado antigo; cancelamento e falha de worker exercitados; benefício medido |
| U4 — comparação completa em bloco | Alternativas na mesma grade comum; resumo conjunto e por membro; aplicar/desfazer o conjunto | 40 grupos, sem perder edição/dados individuais; falha em um membro não produz aplicação parcial; nenhuma piora escondida |
| U5 — escolha de alternativas | Busca determinística por espaçamento/fase/quantidade; cobertura e esforço apresentados separadamente | Restrições obrigatórias separadas de preferências; finalistas reavaliados; decisão explicável; mesma entrada gera mesma saída |
| U6 — projeto visual móvel | Comparações com geometria real para individual, bloco, consulta e ajustes | Mesmos dados/câmera no antes/depois; larguras 360/390/412/768, paisagem, Sol e estados de erro; avaliação do proprietário |
| U7 — implementação visual | Implementar uma tarefa móvel aprovada por vez; câmera/rótulos/controles coerentes | Capturas e testes por tarefa, foco/teclado/toque, medidas/exportação idênticas; repetir desempenho apenas quando relevante |
| U8 — liberação e campo | PR, CI, migração/backup/upgrade/rollback e piloto real | Nenhuma perda silenciosa, link confirmado e limitações claras; publicação conforme autorização aplicável |

U6 pode avançar em paralelo lógico ao estudo do núcleo, na mesma base fixada;
não exige esperar reconstruir todo o motor. U4 depende dos contratos e da estratégia
de aplicação; não é habilitada apenas retirando `!blockActive()`. Cada etapa deve
terminar com PR pequeno ou evidência de que a mudança não compensa.

**Primeira unidade recomendada:** U1, distância ponto/divisa compartilhada,
precedida da captura mínima U0 para esse caso. É pequena, verificável e útil ao
mapa, às medidas e às alternativas. Em seguida, perfil do preparo/ajustes e U2.
Não começar por trocar framework ou migrar toda a persistência.

## Contrato do motor evoluído

- Entrada identifica geometria/origem/CRS, parâmetros, ajustes manuais e revisão;
  unidades ficam explícitas. Distinguir revisão do cálculo da versão do aplicativo.
- Saída contém tiros, trechos, pontos, medidas, avisos e proveniência do cálculo;
  o desenho e os exports usam essa mesma saída, sem segunda matemática na tela.
- Fase e espaçamento comuns referenciam coordenadas absolutas do bloco, enquanto
  cálculos locais conservam identidade de lote/trecho. Compartilhar uma referência
  não prova continuidade física entre propriedades.
- Parâmetros salvos permanecem válidos; novos contratos começam com adaptadores
  e diagnóstico, sem impor silenciosamente limites diferentes aos dados existentes.
- Identidade estável de ponto/trecho não depende do zoom ou da ordem de desenho.
  Ao trocar algoritmo, ajustes antigos exigem migração verificada ou modo legado
  acessível; não apagar marcas/histórico por assinatura diferente.
- Limites numéricos com origem: erro de ponto flutuante, resolução de cobertura,
  arredondamento da tela e precisão do GPS são grandezas diferentes.
- Mudança do algoritmo precisa de comparação diferencial contra a 2.0.1, casos
  sintéticos e GEOS/PROJ. Uma diferença intencional é explicada e testada; igualdade
  com o legado não prova correção se os dois compartilharem o mesmo defeito.

## Qualidade espacial e escolhas inteligentes

1. **Topologia e trechos:** conferir furos, lotes com partes desconectadas,
   vértices repetidos, segmentos curtos, tangência e borda. Nenhuma ligação através
   do vazio deve virar percurso dentro do lote. Não reparar geometrias de origem
   automaticamente para satisfazer um algoritmo.
2. **Projeção:** manter cálculo em metros na projeção adequada aos dados atuais;
   converter somente nas fronteiras. Medidas UTM de grade não são promessas de
   precisão de campo. Não usar latitude/longitude diretamente como metros.
3. **Cobertura:** distinguir p95 e pior distância nas células testadas. Comparar
   na mesma grade por lote, e conferir finalistas numa segunda resolução/origem
   de amostragem. Registrar se o resultado muda com a resolução. Nenhum teste em
   grade finita prova cobertura contínua sem uma justificativa adicional.
4. **Alternativas:** manter uma pequena fronteira de opções não dominadas por
   pontos/tiros, cobertura e esforço. Restrições agronômicas só entram se fornecidas;
   não somar tudo numa nota arbitrária nem prometer “melhor plano absoluto”.
5. **Caminhada:** separar percurso ao longo dos tiros de deslocamento estimado
   entre trechos. Retas entre lotes não são acesso validado. Não otimizar travessia
   por estradas, cercas ou obstáculos sem dados correspondentes.
6. **Bordadura:** mostrar distância real à divisa, início/fim do tiro e ponto
   vizinho quando pertinente. Recuo obrigatório é uma regra operacional futura,
   não um valor inferido da imagem de satélite.
7. **Índices espaciais:** testar índice para vizinho mais próximo e segmentos
   somente onde U0 mostrar custo relevante; conferir paridade dos empates,
   atualização após edição e custo de construir/manter o índice.

Método linear, barra de 36,48 m e P6 atual continuam sendo as referências do
projeto. Anéis não integram a evolução. A origem histórica das geometrias e os
alertas existentes não são homologados pela modernização do software.

## Visual e didática no celular

O objetivo é reduzir o esforço para responder: **qual lote/bloco, onde entrar,
qual tiro/ponto e quais distâncias seguir agora**. Refinos de paleta, fonte e
componentes precisam servir a essas tarefas.

| Tarefa | Proposta a projetar | O que verificar |
|---|---|---|
| Escolher conjunto | Identificar individual/bloco, membros e resumo; enquadramento inicial de todos | Voltar do lote ao conjunto sem perder contexto; testar grupo com dois e mais membros |
| Ler mapa | Hierarquia consistente entre divisas, tiros, pontos, ponto escolhido e entrada | Número legível quando cabe; colisões controladas; não depender só de cor |
| Ver distâncias | Entre tiros/entre pontos sempre fáceis de localizar; borda/próximo ponto na consulta | Valores efetivos do plano ativo e trecho correto; sem duplicação que cubra o mapa |
| Ajustar plano | Comparar poucas alternativas com resumo e detalhes por lote recolhidos | Alteração previsível, aplicação e Desfazer claros, mapa continua útil |
| Usar GPS | Estado do sinal e alvo claros; plano legível durante perda de sinal | Direcionamento não exige marcação; histórico legado continua recuperável |
| Trabalhar sob sol | Refinar contraste, pesos e hierarquia usando os temas atuais como referência | Contraste medido, leitor de tela, foco visível, toque de ao menos 44 px quando viável |
| Usar satélite | Camada secundária opcional, sobreposições reconhecíveis, fallback Plano | Crédito/licenciamento/cache do provedor respeitados; sem exigir rede para o plano |
| Tela curta/teclado | Recolher ajustes e preservar mapa, ação principal e navegação visíveis | Barras do navegador, áreas seguras, paisagem, zoom de texto 200% e rotação |

Preparar projeções **com a geometria real e os mesmos parâmetros**, identificando
referência e proposta, antes de implementar uma nova organização. O proprietário também solicitou a reescrita efetiva do motor. A primeira
unidade implementada está em REESCRITA_MOTOR_ETAPA_1.md. A nova organização
visual continua a ser apresentada com comparação antes de sua implementação. Isso mantém o fluxo de comparação solicitado
pelo proprietário, sem impedir estudo e trabalho interno já autorizado.

## Tecnologia: escolher pelo problema

- Fontes ESM legíveis, interfaces tipadas gradualmente (JSDoc/TypeScript conforme
  custo) e build determinístico: prioridade sobre mudança de framework.
- Web Worker para tarefas pesadas já existe. Evoluir protocolo de revisão,
  cancelamento e medição antes de introduzir outro mecanismo. AbortSignal sozinho
  não interrompe um laço síncrono de worker sem cooperação ou encerramento.
- Índice de segmentos/pontos e cache limitado por revisão podem ajudar; medir
  acertos, invalidação e memória. Evitar cache sem limite e assinatura incompleta.
- SVG continua candidato principal nos tamanhos atuais. Transformar camadas e
  atualizar rótulos seletivamente pode bastar. Canvas/WebGL/MapLibre exigem prova
  de ganho, seleção acessível, rótulos equivalentes e custo offline aceitável.
- GEOS/PROJ permanecem referência independente de auditoria. WASM no navegador
  só se resolver falha ou custo demonstrado; seu peso e precisão não melhoram a
  procedência de um limite ou o GPS do aparelho.
- Backend, login, sincronização de coletas e nova migração de banco não são
  requisitos desta ferramenta de direcionamento. Avaliar dependência nova com
  versão fixa, licença, manutenção, tamanho e funcionamento offline.

## Portões e limites

U0 define orçamento inicial com dados reais. Metas propostas de experiência,
**a validar antes de usar como gate**: resposta visual de controle simples até
100 ms, INP p75 até 200 ms em sessões reais suficientes, tarefas longas acima de
50 ms identificadas e cancelamento de cálculo pesado perceptível em até 250 ms.
Tempo de preparação tem que apresentar progresso/cancelamento e ser medido à
parte. CPU ×4 e cinco rodadas ajudam comparar, mas não representam um telefone
nem estimam com confiança a cauda de uma população.

Para cada PR: problema reproduzível, alteração, teste que captura o risco, efeito
sobre dados e medidas, comparação móvel quando aplicável e rollback. Medir as
operações afetadas; ampliar a bateria apenas quando houver mudança/falha que
justifique. Piloto em dois celulares testa sol, GPS, bateria, rotação e retomada.
Não anunciar campo homologado, ganho de velocidade ou precisão sem esses dados.

## Continuidade com Claude/Codex

Este documento refina a fila E1–E8 em `EXECUCAO_2_0.md` e a matriz de parâmetros;
não cria uma lista concorrente nem reabre entregas concluídas. Ler RETOMADA e
conferir main/PR antes de editar. Uma frente ativa por branch; registrar após
cada unidade o que mudou, testes observados e próxima ação, enviando ao GitHub.

Quem assumir pode propor solução melhor, corrigir o plano e ampliar o escopo
quando houver benefício demonstrado. Deve registrar por que muda a prioridade,
o que substitui e os critérios de aceite. “Mais avançado” significa entregar
uma tarefa melhor com custo e risco proporcionais, não adicionar tecnologia
para preencher uma lista. O limite de uma IA não transfere arquivos automaticamente;
somente commits enviados e contexto registrado ficam disponíveis à próxima.
