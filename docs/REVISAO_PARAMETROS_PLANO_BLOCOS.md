# Revisão de cada parâmetro — plano, bloco e bordas

09/11/2026. Revisão solicitada pelo proprietário após as projeções de bloco.
Escopo: estudar significado, limites, dependências e apresentação. Não houve
aceite de implantação do bloco ou mudança do runtime neste trabalho.

## Resultado prático da revisão

O motor tem **35 entradas no catálogo** e 36 valores iniciais nas folhas de
configuração. Há 37 parâmetros distintos ao considerar a fase opcional dos
tiros e dois itens dos defaults que não estão no catálogo: seleção por IDs e
permissão de mover contagens. Pessoas em campo é um estado de interface
separado. Os parâmetros futuros de bloco/recuo não pertencem ao motor atual.

Três decisões precisam ficar claras na futura implementação:

1. A pessoa configura o objetivo e os limites; o resumo mostra o resultado real.
   Distância desejada não deve aparecer como distância efetiva quando diferem.
2. Cada modo tem parâmetros ativos próprios. Mudar equipe não deve, por si só,
   apagar pontos ou impor um tiro por pessoa. Qualquer alternativa que altere o
   desenho exige comparação e aplicação explícita.
3. Restrições obrigatórias (recuo, mínimo por lote, área permitida, acesso) não
   podem ser relaxadas pelo otimizador para melhorar uma métrica.

Os valores abaixo são os **defaults técnicos**, não recomendações agronômicas
novas, nem os valores de todos os planos instalados. O painel de recomendação
pode usar parâmetros diferentes. Não substituir configurações salvas por esta
tabela. O atributo `calibrado` do catálogo é metadado legado, não comprovação
de calibração em campo, precisão de GPS ou homologação.

## Plano e pontos

| Parâmetro | Inicial / domínio atual | Revisão e tratamento proposto |
| --- | --- | --- |
| `haPerPoint` | 20 ha/ponto; 1–1000 | Manter no início. O mínimo usa a área oficial da regra, arredondado para cima; não trocar pela área geométrica. Confirmar regra por cultura/operação. Número decimal válido não vira inteiro por causa do incremento do controle. |
| `pointMode` | `total`; total, por tiro, espaçamento | Mostrar o significado do modo ativo; não oferecer combinações contraditórias. O modo direcionado é proposta separada, não outro nome para grid uniforme. |
| `totalPoints` | Vazio = mínimo; validação na alocação | Inteiro positivo quando preenchido. No modo total, respeitar mínimo por lote e teto. Em bloco, a soma não compensa déficit em um lote. |
| `pointsPerTrack` | 5; inteiro 1–100 | Ativo no modo por tiro. Mesmo número por tiro pode produzir intervalos distintos; conferir mínimo por lote depois da alocação. |
| `targetSpacingM` | 400 m; 20–5000 | Distância desejada ao longo do tiro. Exibir a faixa realmente calculada; não prometer espaçamento exato quando há bordas, trechos curtos e restrições. |
| `maxAcceptableGapM` | Vazio; 0–5000 m | É limite de alerta, não distância-alvo. Vazio desativa; zero não significa desativado e merece aviso de configuração inútil. O protótipo preserva a semântica atual sem converter zero em vazio. |
| `gapToleranceFrac` | 0,10 = 10%; 0–1 | Folga de diagnóstico sobre o alvo. Não usar para relaxar recuo mínimo, mínimo por lote ou acesso. Exibir somente se necessário para interpretar um alerta. |
| `maxPointsCap` | 600; inteiro 1–5000 | Proteção computacional por lote. Não reduzir o mínimo para caber no teto nem multiplicar o teto indiscriminadamente ao montar blocos. Testar o custo agregado do bloco. |

## Tiros, direção e seleção

| Parâmetro | Inicial / domínio atual | Revisão e tratamento proposto |
| --- | --- | --- |
| `trackMode` | Espaçamento; quantidade, circular, importado | Parâmetros e rótulos dependem do modo: tiros, anéis ou trajetos. Não fingir que importado obedece automaticamente à barra ou à grade nova. |
| `trackSpacingM` | 300 m; 40–2000 | Limite solicitado entre tiros no modo por espaçamento. Com barra de 36,48 m, o default pode resultar em 291,84 m (8 passadas); mostrar o valor efetivo. Recusar limite menor que uma barra quando o alinhamento está ativo. |
| `trackCount` | 5; inteiro 1–60 | Ativo no modo por quantidade; não é automaticamente o tamanho da equipe. Conferir quantidade efetiva após recorte e seleção. |
| `selectionMode` | Todos; quantidade, manual | Não confundir todos os tiros gerados com os selecionados para amostragem. Verificar cobertura e mínimos após seleção. |
| `selectionCount` | 5; inteiro 1–60 | Número selecionado no modo por quantidade; o rótulo legado menciona pessoas/tiros, mas o estado de equipe é outro. Não sincronizar escondido. |
| `selectionIds` | Lista vazia; até 500 IDs | Seleção manual exige itens existentes, distintos e válidos. O protótipo verifica formato e duplicidade; existência no cenário gerado ainda exige integração com o gerador. |
| `bearingDeg` | Vazio = referência; 0–180° | Eixo de linha, não direção de caminhada; 0° e 180° são equivalentes para uma reta. Preservar referência e correção de grade existentes. Não calcular média aritmética simples de rumos de lotes. |
| `trackPhaseM` | Ausente; −5000 a 5000 m | Desloca a grade; sistema/recomendação. Em bloco, fase precisa usar um referencial métrico comum. Mesmo rumo com origens locais diferentes não garante tiros alinhados. |
| `minPieceM` | 60 m; 0–1000 | Trechos menores podem ficar sem amostras. Conferir área/componentes descobertos e mínimo depois do corte; não esconder perda de representatividade com um bom P95 global. |
| `boomWidthM` | **36,48 m**; 1–80 | Referência confirmada pelo proprietário. Guardar em ajustes, preservar configurações personalizadas; não usar meia barra como recuo dos pontos. |
| `alignToBoom` | Sim; booleano | Múltiplos da barra são estimativa de alinhamento, não rastro de máquina homologado. Exigir booleano real; não aceitar número ou texto como alternativa equivalente. |

## Bordas e otimização

| Parâmetro | Inicial / domínio atual | Revisão e tratamento proposto |
| --- | --- | --- |
| `edgePolicy` | Meia margem; margens iguais, fixa | Distribuição longitudinal. Separar do recuo obrigatório ponto–divisa. Os fallbacks atuais estão reproduzidos no estudo anterior. |
| `edgeMarginM` | 50 m; 0–1000 | Só atua na política fixa. Não é default de recuo obrigatório. Um trecho curto ou deslocamento pode impedir essa margem; o futuro recuo precisa ser verificado depois de todas as operações. |
| `optimizer.mode` | Qualidade espacial; regularidade, esforço | A prioridade escolhe uma solução entre as admissíveis, sem violar restrições. Regularidade não precisa executar busca. O protótipo de parâmetros não certifica a solução espacial. |
| `optimizer.maxGapIncreaseFrac` | 0,10 = 10%; 0–1 | Fração interna, porcentagem na UI. Não aceitar 10 internamente como sinônimo de 0,10. |
| `optimizer.maxCvIncrease` | 0,05 = 5 p.p.; 0–1 | Aumento do CV; não confundir pontos percentuais com aumento percentual relativo. Ajuste avançado. |
| `optimizer.edgeShiftFrac` | 0,50 = 50%; 0–1 | Busca pode deslocar pontos. Aplicar um filtro obrigatório de recuo após deslocamentos; não usar essa liberdade para apagar conflitos. |
| `optimizer.phaseSteps` | 9; inteiro 1–41 | Número de candidatos por trecho. Parâmetro técnico; mais candidatos não garantem melhor solução global. |
| `optimizer.maxIterations` | 6; inteiro 1–30 | Limite de rodadas de busca. Não aumentar sem medir tempo/RAM em aparelho e cancelamento. |
| `optimizer.allowCountMoves` | Sim; booleano | Permite mudar a distribuição das contagens. Em bloco, preservar mínimos e identificação por lote; texto `"false"` não deve ser tratado como falso. |
| `optimizer.searchGridCells` | 700; inteiro 100–5000 | Grade reduzida da busca; não é o grid amostral nem o total de amostras. Permanecer técnico. |

## Cobertura e uso em campo

| Parâmetro | Inicial / domínio atual | Revisão e tratamento proposto |
| --- | --- | --- |
| `coverage.gridTargetCells` | 1500; inteiro 200–20000 | Resolução de avaliação de cobertura, distinta da densidade ha/ponto. Comparar soluções com a mesma configuração. |
| `coverage.minStepM` | 15 m; 5–500 | Passo mínimo da grade de avaliação. Deve ser menor ou igual ao máximo. |
| `coverage.maxStepM` | 150 m; 5–2000 | Passo máximo; não aceitar inversão do intervalo. P95 é aproximação dependente da grade, não homologação agronômica. |
| `snapToleranceM` | 30 m; 1–500 | Encaixe ao arrastar ponto. Após encaixe/edição, verificar lote, recuo, cobertura e identificação; não atravessar divisa para encaixar. |
| `monitor.stepLengthM` | 0,75 m; 0,30–1,50 | Conversão aproximada metros/passos. Calibrar por pessoa se necessário; não alterar distância geométrica ou confirmar chegada por contagem de passos. |
| `monitor.arrivalRadiusM` | 10 m; 1–100 | Proximidade para aviso, distinta do recuo de borda e da distância entre pontos. Não equivale a posição comprovada no alvo. |
| `monitor.gpsAccuracyMaxM` | 15 m; 1–200 | Limiar de aviso de precisão; GPS aceitável não garante posição dentro do recuo. Raio de chegada menor que a incerteza exige interpretação cuidadosa, não correção automática de coordenadas. |
| `monitor.offLineWarnM` | 25 m; 1–500 | Aviso de afastamento do tiro; não é corredor de passagem autorizado ou tolerância de pulverização. |
| Pessoas em campo (`qMonitors`) | 5; estado da UI entre 1 e 20 | Aceitar inteiro, sem arredondar entrada fracionária silenciosamente. Pode haver uma pessoa para vários tiros, com percurso próprio. Não é `selectionCount`. |

## Parâmetros novos do bloco: decisões ainda necessárias

| Item | Regra refinada |
| --- | --- |
| Lotes do bloco | Seleção explícita e estável. Não criar área nova entre polígonos nem unir só por proximidade. |
| Operação e cultura | Confirmar operação atual. Dados históricos de variedade não confirmam compatibilidade de manejo. |
| Uniforme / direcionada | Modos identificáveis, mantendo alvo/origem quando direcionado. Não declarar cobertura uniforme pelo simples total de pontos. |
| Recuo mínimo | Indefinido até decisão operacional. Medir menor distância à divisa, incluindo furos e inicialmente divisões internas; jamais preencher automaticamente com 50 m ou 18,24 m. |
| Divisa interna | Mantida no primeiro piloto. Qualquer flexibilização exige regra explícita e verificação da representatividade por lote. |
| Acesso | Em blocos maiores, modelar ligações permitidas entre lotes. Um único booleano de confirmação não descreve a conectividade nem uma rota segura; o validador atual não certifica rotas. |
| Mínimo por lote | Preservar regra e arredondamento individual. 49 é a base atual de BB1/BC1, não uma solução conjunta já pronta. |
| Rumo e fase comuns | Usar o mesmo sistema de referência e unidade, respeitando a malha em cada polígono. Não transferir coordenadas locais sem transformação. |
| Resultado | Publicar internamente só um resultado coerente: valores reais, regras usadas, versão do cálculo e conflitos. Distâncias de bloco continuam “A calcular” nas prévias. |
| Persistência | Plano de bloco separado, referências por lote e versão de schema. Não sobrescrever os planos individuais; definir backup/restore antes de integração. |

## Inconsistências reproduzidas e melhoria testada

`audit/parameter-review-browser.mjs` exercitou **16 casos no motor real**,
sem mudar parâmetros ativos ou localStorage do perfil de teste:

- `alignToBoom: 2`, `trackPhaseM: true` e `optimizer.allowCountMoves: "false"`
  passam pela checagem atual e pela construção do cenário. Isso demonstra
  aceitação de tipo inválido, não que toda interface produza essas entradas.
- Cobertura com mínimo 100 m e máximo 10 m é aceita no caminho direto. O
  sanitizador possui uma defesa para essa inversão, mas não é equivalente ao
  contrato do construtor. Unificar a regra sem apagar valores escondido.
- Barra 80 m com máximo solicitado de 40 m é aceita e resulta em espaçamento
  80 m: os limites individuais estão válidos, a combinação não atende o pedido.
- O catálogo aceita booleano/nulo em alguns campos numéricos; camadas abaixo
  recusam densidade/total inválidos. Não afirmar que todos esses casos viram
  cenário válido. A defesa precisa ser consistente já na entrada.
- Total fracionário e booleano são corretamente recusados pela alocação.
  Não substituir uma defesa já existente sem preservar esses casos.

Foi criado **somente no estudo** `audit/parameter-constraints.mjs`, com
tipos estritos, limites existentes e dependências cruzadas. **13 testes
automatizados passaram**, incluindo varredura dos campos numéricos, booleanos,
opcionais, seleção manual, cobertura, teto, mínimo, pessoas e percentuais.
A referência de catálogo corresponde ao SHA-256 exato da candidata.

O protótipo ainda não verifica existência dos IDs no cenário gerado, cobertura
espacial, desenho de rota ou todo o pipeline de importação/UI. Sucesso nele não
equivale a plano operacional aprovado. Não foi integrado ao aplicativo porque
essa integração afeta o tratamento de erros e depende do escopo visual final.

Reprodução em `audit/`:

```sh
npm run test:parameters
node parameter-review-browser.mjs
```

## Ordem sugerida para avançar

Primeiro, fechar definições de operação, recuo e acesso com a equipe. Em seguida,
integrar a validação consistente no protótipo de cálculo e conferir mínimos,
cobertura, edição, importação e otimização. Só então atualizar as projeções
necessárias e decidir sobre implantação. O resumo deve privilegiar lote/bloco,
equipe, contagens, distâncias e pendências; parâmetros técnicos ficam em ajustes
ou diagnóstico. As imagens anteriores continuam sendo propostas para avaliação.

Os cálculos espaciais, defaults, planos salvos, interface, site e APK não foram
modificados nesta revisão. Não foi feito novo envio público ou publicação.
