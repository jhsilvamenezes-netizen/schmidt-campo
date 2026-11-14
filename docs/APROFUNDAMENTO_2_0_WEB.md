# 2.0 web — caderno de análise espacial e design de orientação

Revisão de escopo: 14/11/2026. Complementa o [plano vigente](PLANO_VERSAO_2_0.md).
Uso exclusivamente para direcionamento: sem coleta, marcação ou controle de
execução. APK adiado. Estudos e propostas, não funcionalidades implantadas.
Este texto substitui o aprofundamento anterior centrado em coleta.

## 1. O que precisa ficar matematicamente inequívoco

| Informação | Definição a conferir | Evitar |
|---|---|---|
| Entre tiros | Distância perpendicular entre eixos paralelos da grade operacional | Medir entre pontas ou através de um vazio e chamar de espaçamento |
| Entre pontos | Intervalo entre vizinhos ordenados no mesmo trecho válido; ao longo da linha quando esta não é reta | Unir componentes separados ou trocar vizinho ao mudar zoom |
| Até a borda | Menor distância à fronteira válida do lote, incluindo buracos, em projeção adequada | Confundir com margem na ponta ou recuo obrigatório |
| Margem na ponta | Distância na direção do tiro entre extremidade do trecho e ponto | Apresentar como distância perpendicular à divisa |
| Até o alvo | Distância horizontal à coordenada consultada; método plano/elipsoidal documentado | Prometer distância percorrida ou caminho acessível |
| Desvio do tiro | Componente lateral em relação ao eixo orientado, com sinal consistente | Confundir com distância ao ponto ou mostrar esquerda/direita sem sentido definido |
| Avanço no trecho | Projeção longitudinal e posição relativa aos extremos válidos | Avançar automaticamente por uma lacuna externa ao lote |
| Rumo | Azimute com referência explícita e sentido; eixo equivale módulo 180°, deslocamento dirigido módulo 360° | Usar equivalência de eixo para inventar sentido de entrada |
| Área | Geométrica, oficial ou operacional, conforme origem; união do bloco evita dupla contagem | Somar sobreposição como área nova ou misturar tipos |
| Cobertura amostral | Distância da área válida ao conjunto de pontos, lacunas e regularidade | Declarar cobertura integral ou resultado agronômico |

Em plano métrico, para eixo com origem a e vetor unitário u, o avanço é
`t = (p-a)·u`; o desvio assinado é `u_x(p_y-a_y)-u_y(p_x-a_x)`.
Para distância ao segmento, limitar t ao intervalo válido antes de medir o resíduo.
Para distância lateral ao eixo infinito, não limitar t. Testar sinais em rumos
0°, 90°, 180° e 270° e transformação de câmera; explicitar a convenção adotada.

## 2. Métodos e ferramentas com ganho concreto

### Referência geográfica e exatidão

- **PROJ/pyproj:** conferir transformação de datum, zona UTM/hemisfério,
  ordem dos eixos, convergência meridiana e fator de escala. O dataset atual
  usa EPSG:32723 nos ensaios; arquivo novo não herda essa hipótese automaticamente.
- **Geodésica elipsoidal (pyproj.Geod ou GeographicLib):** referência independente
  para comprimentos/áreas e quantificação da diferença para o plano projetado.
  Registrar sistema/origem e não alternar métodos sem explicar o efeito.
- **QGIS:** inspeção técnica de limites, buracos, multipartes, CRS e sobreposição
  quando houver dúvida; projeto e dados privados permanecem locais.
- Separar erro numérico, distorção da projeção e qualidade da origem. Mais casas
  decimais não melhoram limite ou GPS. Não inventar confiança estatística de
  arquivo que não informa precisão. Não somar incertezas como independentes sem
  justificar o modelo. Arredondamento só na apresentação.
- Distância horizontal não é distância sobre terreno. Só estudar inclinação/3D
  com DEM/levantamento, datum vertical, resolução e validação adequados. Satélite
  ou relevo decorativo não fornecem isso por si só; 3D não é requisito da 2.0.

### Geometria computacional robusta

- **GEOS/Shapely:** referência para validade topológica, clipping linha/polígono,
  distância ponto-segmento, união de áreas e interseção. Parte dessas ferramentas
  já existe na auditoria; ampliar o ensaio, não adicionar outro motor paralelo.
- Manter buracos e componentes desconectados. Diagnosticar pequenas lascas,
  vértices repetidos e tangências. Um `buffer(0)`, simplificação ou snap não pode
  corrigir divisa silenciosamente: comparar área/limite e preservar original.
- Predicados robustos e tolerâncias dimensionais: separar tolerância de cálculo,
  equivalência de referências, encaixe de edição e critério operacional. Documentar
  unidades e efeitos perto do limite; não usar um epsilon global para tudo.
- Índice espacial (R-tree/STRtree ou equivalente) para consultas de proximidade
  e limites quando o perfil mostrar custo. Testar resultado igual ao método
  exaustivo e invalidar índice ao mudar geometria. Aceleração não muda o método.
- Geometria simplificada só para desenho. Cálculo, cotas e exportação usam a base
  analítica; simplificação deve respeitar limite de erro visual e topologia.

### Distribuição e cobertura mais confiáveis

- Avaliar **por lote e por trecho**, além do bloco: total/mínimo de pontos,
  menor distância à borda, lacunas máximas, dispersão de intervalos, extensão
  dos tiros, distância máxima e p95 da área aos pontos. Explicitar a ponderação
  por área e não calcular cobertura em terreno excluído.
- Estudar **Voronoi recortado ao lote** para localizar bolsões distantes dos
  pontos. Vértices, interseções com a fronteira e extremos formam candidatos
  para verificar lacunas; comparar com avaliação por grade e referência independente.
  Voronoi é ferramenta de diagnóstico, não substitui a metodologia linear.
- Testar **convergência da grade**: refinar passo, deslocar origem e incluir
  divisas/buracos. Uma grade grossa pode ignorar faixa estreita. Registrar diferença
  entre avaliações e não declarar ganho menor que a instabilidade da estimativa.
- **Otimização com restrições e múltiplos objetivos:** rumo/referências/método
  preservados; comparar fase, espaçamento permitido e distribuição de pontos.
  Conservar alternativas não dominadas (Pareto) durante o estudo; escolher com
  prioridade explícita. Um escore único não deve esconder piora num lote.
- Análise de sensibilidade: variar parâmetros dentro de intervalos justificados
  e verificar estabilidade. Monte Carlo só com modelo de erro fundamentado;
  sem ele, apresentar cenários determinísticos como cenários, não probabilidades.
- Não otimizar caminho entre lotes sem acesso/obstáculos conhecidos. Quantidade
  de pessoas pode apoiar divisão estimada por extensão/pontos, sem controle de
  concluídos ou promessa de tempo exato. Não confundir percurso hipotético com seguro.

## 3. GPS como apoio ao direcionamento

Fix fresco, timestamp/ordem válidos e precisão reportada coerente. Curso do
movimento, orientação de tela e sensor do telefone são informações diferentes.
Quando parado, não inventar azimute de deslocamento. Geometria válida não torna
um fix ruim adequado para uma instrução fina perto da divisa.

Estudar histerese na escolha de tiro/ponto para evitar oscilação entre vizinhos;
manter seleção manual. Filtro só após ensaio de trilha, sem esconder atraso ou
incerteza. Não inferir tarefa executada por proximidade, chegada ou deslocamento.
Retomar página não pode reutilizar posição antiga como atual. GPS negado permite
consulta normal do plano. O navegador não garante acompanhamento com tela bloqueada.

## 4. Doze frentes de design com benefício demonstrável

São propostas variadas para comparar; não é necessário implementar todas.
Antes/depois devem usar o mesmo lote/bloco, zoom, tema e largura. Não fabricar
medidas para tornar a projeção mais bonita. A aprovação de escopo acompanha cada
mudança; este documento não implementa nem aprova um novo layout.

| Frente | Proposta visual | Benefício e validação |
|---|---|---|
| V1 — mapa principal | Ampliar a área útil sem ocultar contexto; painel recolhível de ajustes | Mais terreno visível; sem controles cobertos por navegação/teclado |
| V2 — bloco e membro | Mapa de todos com divisas distintas; foco no membro e retorno ao conjunto; miniatura de contexto só se ajudar | Entender onde o lote está no bloco; medir tempo/toques e espaço ocupado |
| V3 — medidas essenciais | Faixa compacta de entre tiros e entre pontos, próxima ao mapa; valor real e unidade legíveis | Encontrar distâncias ao olhar, sem depender de abrir detalhes |
| V4 — cotas por significado | Cota perpendicular para tiros, longitudinal para pontos, chamada específica para borda | Reconhecer o tipo de distância sem confundir com trajeto |
| V5 — orientação | Norte, seta do sentido consultado e identificação do tiro/alvo; símbolos distintos | Saber para onde olhar/seguir; norte e sentido não se contradizem |
| V6 — linguagem cartográfica | Espessuras, tracejados, formas e halos para divisa, tiro, ponto e referência consultada | Legível sem depender só de cor; não simular concluído/pendente |
| V7 — cores funcionais | Paleta curta com semântica constante em Plano/Sol/Satélite; variantes comparadas | Contraste medido, leitura ao sol e ausência de cores decorativas concorrentes |
| V8 — tipografia e números | Hierarquia curta, algarismos alinháveis, vírgula decimal e unidades consistentes | Leitura rápida, precisão apropriada, texto ampliado sem truncar medida |
| V9 — rótulos por zoom | Prioridade estável por espaço, halo e deslocamento com associação inequívoca | Não cobrir divisa/ponto; sem piscar ou parecer pertencer ao lote vizinho |
| V10 — consulta por toque | Toque amplia medida do ponto/trecho; resolver alvos próximos com chamada clara | Selecionar sem arrastar ou registrar execução; alvos móveis adequados |
| V11 — preparo e estados | Estados discretos de plano disponível, recalculando, GPS indisponível e offline; detalhes técnicos recolhidos | Entender o que está disponível e a ação necessária, sem poluição |
| V12 — prancha de orientação | Resumo compartilhável/imprimível de lote/bloco, tiros, escala, rumo e distâncias | Apoio antes do campo; identificar versão/plano e evitar compartilhamento público involuntário |

Não acrescentar cores por pessoa/estado sem necessidade. Distâncias essenciais
permanecem acessíveis; cotas completas no desenho dependem do espaço e zoom.
Informações da revisão, algoritmo, schema e “antigo/novo” ficam fora da operação.
Miniatura, modo ampliado, folha de orientação e opções de tema devem competir em
projeções pelo benefício, não ocupar a tela simultaneamente por padrão.

## 5. Protocolo de comprovação

| Camada | Casos e evidência |
|---|---|
| Coordenadas | Round-trip, eixos invertidos, zona/hemisfério incorretos, rumo de grade/verdadeiro; referências independentes |
| Topologia | Côncavo, buraco, ilha, tangência, segmento curto, ponto sobre divisa/vértice, sobreposição e vazio entre membros |
| Medidas | Fixtures analíticas simples, GEOS/PROJ, mesma medida após zoom/rotação e exportação; tolerância dimensional documentada |
| Distribuição | 51 lotes/40 grupos, ordem dos membros, eixo invertido, fase, extremos e estabilidade da avaliação de cobertura |
| Propriedades | Repetir cálculo dá mesmo resultado; câmera não muda cenário; ordem de membros mantém geometria equivalente quando sentido não importa; export/import conserva coordenadas dentro da precisão declarada |
| GPS | Atraso, ordem, imprecisão, parado, retomada e alvos próximos; testar sinais de desvio com rumos cardeais e sentido inverso |
| Visual | 360/390/412/768 px, retrato/paisagem, texto ampliado, temas e satélite; 208 tiros e caso BD3/T5 |
| Uso real | Selecionar bloco, enquadrar, focar lote, ler cotas, orientar-se e retomar offline; nenhum passo de coleta/registro |

Definir tolerâncias depois de distinguir erro de implementação e qualidade da
origem. Registrar hipótese, configuração, resultado numérico, imagem e limite da
conclusão. Ensaios independentes não são levantamento topográfico homologado.

## 6. Aplicação ao código atual

`src/application/block-planning.mjs` já tem assinatura de origem/entrada, revisões
e cache. `src/ui/block-map.mjs` já oferece visão conjunta/gestos; satélite publica
frames da câmera. `audit/spatial-check.py`, `audit/validate-runtime-blocks.py` e
requirements espaciais já apoiam verificações independentes. Aproveitar essas
bases e auditar paridade em vez de substituir tudo.

Extrair funções puras com unidades/fronteiras explícitas. Worker, índice espacial
e mudança de renderizador só com gargalo demonstrado; resultado antigo deve ser
descartado por revisão da entrada. Sem bibliotecas GIS pesadas no navegador apenas
para executar validação que pode ocorrer na auditoria. Não transformar diagnóstico
em reparo automático nem atribuir exatidão maior ao uso de uma biblioteca nova.

Leitura de código e planejamento não equivalem a novos testes executados.
Nenhuma alteração do motor, UI ou versão publicada decorre deste documento.
