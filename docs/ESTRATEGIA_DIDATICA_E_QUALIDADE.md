# Estratégia de organização, didática e qualidade

09/11/2026 — estudo sobre a candidata `319d951`, sem implementação visual.
Complementa `ESTUDO_ORGANIZACAO_OPERACIONAL.md`. A didática atual é preservada;
o objetivo é tornar as decisões da atividade mais fáceis de localizar, conferir
e executar. A interface, o método, os contornos e a versão publicada permanecem
congelados. Recomendações abaixo são critérios de projeto, não funcionalidades
entregues nem aprovação implícita de um novo layout.

## 1. Organizar pela decisão, preservando a linguagem do app

Agrupar o que o operador precisa relacionar: hectares por ponto e mínimo;
pessoas e carga de trabalho; tiros/pontos e distâncias efetivas. Explicações,
diagramas e nomes já compreensíveis continuam disponíveis. A imagem anterior
do painel Plano é uma hipótese inicial. Foi acrescentada uma segunda projeção,
com uma pessoa para cinco tiros e calibração pendente perceptível no resumo.
Ambas são simulações sem implementação. Estados personalizados, origem pendente
e os demais cenários ainda precisam de imagens/avaliação próprias.

A estratégia é mostrar primeiro os controles/resultados de uso frequente,
abrir detalhes por necessidade e manter exceções importantes perceptíveis.
Não se cria outro menu, um tutorial obrigatório ou modos separados de usuário.
O GOV.UK orienta usar detalhes recolhíveis para conteúdo secundário e avaliar
com usuários se um accordion ajuda; conteúdo necessário a todos não deve ficar
escondido. Aplicamos o princípio ao SCHMIDT, sem copiar a identidade daquele
sistema. [Details](https://design-system.service.gov.uk/components/details/),
[Accordion](https://design-system.service.gov.uk/components/accordion/).

## 2. Recolher com contexto e condição

| Situação | Tratamento a avaliar em projeção | Condição de qualidade |
| --- | --- | --- |
| Parâmetro estável e conferido | Detalhe recolhido com resumo curto | Valor ativo e acesso continuam identificáveis. |
| Parâmetro personalizado | Resumo evidencia que há ajuste | Recolher não apaga nem reaplica padrões. |
| Calibração pendente | Pendência perceptível, explicação detalhada acessível | Padrão numérico não é apresentado como calibrado. |
| Erro ou conflito de origem/equipe | Condição importante permanece perceptível | Não depender de abrir todos os detalhes para descobri-la. |
| Comparação de alternativas | Consulta sob demanda | Plano em uso continua distinguível da alternativa. |

Reutilizar padrões já existentes e HTML semântico. Para controles personalizados
de abrir/fechar, testar teclado, nome acessível, estado expandido e foco. Em
elementos nativos, verificar a semântica exposta pelo navegador, evitando ARIA
manual redundante. Referência: [WAI Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).

Não criar recolhimentos aninhados que dificultem achar ajustes. A redução de
informação simultânea deve diminuir procura, sem acrescentar caminhos ocultos.
Essas condições são requisitos para as próximas imagens, sem novos controles
ou mensagens implementados nesta etapa.

## 3. Uma definição para cada medida e cada estado do plano

O trabalho interno de maior valor é preparar um modelo de resumo operacional
com definições compartilhadas pelas telas e exports. Não foi implementado agora.
Antes de codificá-lo, documentar:

- Identidade/revisão do plano ativo e da recomendação em comparação.
- Parâmetros solicitados e valores efetivamente realizados pelo cálculo.
- Unidade, origem da área e método de cada indicador.
- Distância lateral entre tiros, intervalo ao longo do tiro e margens.
- Caminhada no tiro, transições estimadas e carga individual/coletiva.
- Validade matemática, procedência e calibração operacional como condições
  distintas, sem transformar uma checagem aprovada em homologação geral.

O resumo deve ser derivado dos resultados existentes, sem duplicar o motor.
Mapa, Conferência, detalhe por tiro e arquivo precisam apontar para a mesma
revisão. Casos de uso coordenam leitura/cálculo/salvamento; a interface apresenta
esse resultado. Preservar a diferença entre editar, comparar e aplicar um plano.

Regras já observadas continuam válidas: ha/ponto define quantidade mínima;
menos pessoas não autoriza reduzir amostras; distâncias efetivas podem variar;
área publicada, metadado KML e geometria não são intercambiáveis. Mostrar mais
casas decimais não aumenta a precisão física da informação.

## 4. Tecnologia com função concreta

| Tecnologia/técnica | Benefício para este projeto | Decisão e alcance |
| --- | --- | --- |
| HTML semântico, componentes e valores de estilo reutilizáveis | Consistência e manutenção da identidade existente | Reutilizar os padrões atuais; qualquer mudança perceptível depende de projeção/aprovação. |
| JSDoc + verificação TypeScript sem emissão | Detectar contratos incorretos entre módulos, medidas e adaptadores | Recomendada progressivamente nas fontes legíveis novas; sem reescrever o bundle ou trocar framework por este motivo. |
| Casos de uso e estados explícitos | Evitar misturar plano ativo, comparação e resultado atrasado | Desenhar contrato primeiro, preservar APIs e versões atuais dos dados. |
| Playwright visual + árvore acessível | Verificar aparência, rótulos, estados e navegação | Comparação visual já existe; capturas ARIA do baseline agora complementam o estudo. Não são certificação de acessibilidade. |
| Testes baseados em propriedades | Explorar combinações de parâmetros e reduzir um caso que falha | fast-check é candidato para testes, ainda não instalado. Usar sementes reproduzíveis e propriedades justificadas. |
| Web Workers e controle de revisão das tarefas | Manter interação responsiva durante busca/cálculo | O app já usa worker. Auditar cancelamento, respostas antigas e fallback antes de ampliar paralelismo. |
| GEOS/PROJ como oráculos independentes | Conferir geometria/projeção com outra implementação | Já utilizados na auditoria; ampliar cenários sem transportar bibliotecas pesadas para o celular automaticamente. |
| Índices espaciais ou WebAssembly | Possível benefício com geometrias/importações grandes | Condicional a perfil de custo, tamanho, memória, compatibilidade e testes de paridade. |
| Atualização de Capacitor/SDK e ferramentas | Manutenção de segurança e compatibilidade | Frente separada, com versões suportadas verificadas, backup, paridade e ensaio Android; sem migração neste estudo. |
| IA no desenvolvimento | Apoiar análise, documentação e geração de cenários | Revisão e testes continuam necessários; resultados operacionais precisam de método e procedência verificáveis. |

JSDoc/TypeScript permitem adoção gradual em JavaScript, conforme a
[documentação oficial](https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html).
[Playwright](https://playwright.dev/docs/aria-snapshots) permite comparar a árvore
acessível. [fast-check](https://fast-check.dev/docs/introduction/) gera casos e
reduz entradas que reproduzem falhas. [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
executam tarefas fora da thread da interface. A aplicação dessas capacidades
acima é recomendação deste estudo; não é garantia automática de qualidade.

Uma tecnologia entra quando resolve necessidade demonstrada, mantém offline e
compatibilidade, tem custo aceitável no aparelho, licença/manutenção avaliadas,
versão fixada e rollback/testes. Nenhuma dependência nova foi instalada aqui.
O gerador original completo continua ausente: a evolução é incremental nas
fontes legíveis, preservando procedência e o artefato de referência.

## 5. Qualidade de interação mensurável

No baseline 390×844, foram registradas **59 observações de controles dentro das
cinco etapas de Planejar**. Nenhuma caixa medida ficou abaixo de 24×24 CSS px;
quatro ficaram abaixo de 44 px em uma dimensão: três checkboxes de 24×24 e um
range de 36 px de altura. Isso não abrange todos os controles do mapa/guia e
não conclui conformidade: área associada a rótulos, espaçamento, exceções,
teclado, semântica e dispositivos reais ainda precisam de avaliação.

A WCAG 2.2 AA 2.5.8 usa 24×24 CSS px ou condições de exceção/espaçamento.
Não chamar 44 px de mínimo AA. Para uso em campo, 44–48 px pode ser um objetivo
ergonômico do projeto, a validar com os usuários e sem ampliar controles por
automatismo. Referência: [W3C — Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Medir contraste pelas cores realmente aplicadas e semântica no DOM, não pela
imagem de projeção gerada. A referência de contraste de texto normal é 4,5:1,
com condições/exceções e 3:1 para texto grande. Essa auditoria de contraste
completa não foi executada nesta etapa. Mudanças necessárias devem ser projetadas
e aprovadas, preservando a identidade. Referência:
[W3C — Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Conferir ainda foco perceptível/não oculto, ordem de leitura e anúncios durante
recalcular. Um cabeçalho fixo não pode impedir localizar o campo focado; evitar
avisos que leiam todo o painel a cada tecla se o ensaio com leitor mostrar esse
problema. [W3C — Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum).
Cinco capturas ARIA foram geradas localmente; não substituem teste com leitor.
Ao transformá-las em regressões, fixar relógio/dados ou delimitar campos dinâmicos
justificados. Não mascarar alertas ou diferenças de métricas para obter igualdade.

## 6. Desempenho voltado à tarefa

O benchmark anterior de abertura/51 cenários é uma base, não mede toda a resposta
às interações. Próximo ensaio: alterar amostragem/equipe, recalcular, trocar lote
durante busca e conferir tempo até feedback e estabilidade do plano correto.
Verificar descarte de resultados de revisões antigas e cancelamento do trabalho
obsoleto. Cache deve considerar dados, parâmetros, edição e versão do método;
primeiro conferir o que o app já faz, sem sobrepor caches.

INP avalia resposta a interações. A orientação de referência é até 200 ms no
percentil 75 de visitas, segmentadas por dispositivo. Cinco execuções de
laboratório ou a mediana de abertura não demonstram esse resultado. Medir
interações em aparelhos representativos antes de estabelecer um orçamento de
projeto. Nenhum INP de campo foi medido aqui.
[web.dev — Optimize INP](https://web.dev/articles/optimize-inp).

## 7. Qualidade espacial e operacional

Preservar as checagens independentes e a correção de grade já conferida. Para
melhorar assertividade, verificar procedência/safra/CRS das áreas, interpretação
dos rumos e trajetos reais. Acrescentar testes de cantos, vazios, múltiplos
componentes, limites, intervalos e direção/reversão. Não substituir contornos
ou assumir pista de máquina com base em um trajeto da equipe.

Estudar a estabilidade das medidas de cobertura ao refinar a malha de análise,
com orçamento de processamento; não confundir P95 calculado por amostragem com
garantia contínua sobre todo o terreno. Separar erro numérico, aproximação do
método e incerteza do dado. Uma eventual mudança de método precisa de justificativa
técnica, comparação e aprovação do escopo afetado, inclusive visual.

Precisão de GPS, bússola, orientação da lavoura e desempenho real continuam no
protocolo físico. Se houver necessidade de maior precisão, definir primeiro o
requisito operacional e avaliar receptor/integração GNSS adequado. Software e
aparência do mapa não comprovam precisão de sensor ou limite oficial.

## 8. Validar benefício antes de ampliar

Usar tarefas reais e instruções neutras. Primeiro comparar as imagens quanto
à localização/compreensão; depois de aprovação específica, testar uma candidata
funcional isolada. Comparação funcional exige mesma tarefa, dados, aparelho e
condições. Não comparar tempo de exportação de software com uma imagem estática.

Medir conclusão correta, tempo, toques, rolagens, retornos, ajuda e interpretações
equivocadas. Preservar o que já funciona bem. Não definir ganho percentual ou
homologar intuitividade sem observar participantes. O roteiro está em
`ROTEIRO_AVALIACAO_OPERACIONAL.md`; nenhuma sessão com equipe foi realizada.
Base metodológica: [GOV.UK — Usability testing](https://www.gov.uk/service-manual/user-research/using-moderated-usability-testing).

## Sequência recomendada

1. Formalizar definições e os critérios acima, usando o inventário já executado.
2. Completar projeções comparadas com o original para os estados necessários.
3. Avaliar as imagens com tarefas de localização/compreensão e obter aprovação
   expressa do layout específico antes de implementar.
4. Implementar um escopo pequeno, preservar referências antigas e testar cálculos,
   dados, interação, árvore acessível, visual, offline e paridade Android.
5. Fazer o piloto em aparelho/campo, revisar resultados e somente então tratar
   de aprovação de merge/distribuição, assinatura e migração.

Esta sequência mantém as cinco etapas atuais e separa decisão de design,
execução técnica e homologação operacional. Atualizar screenshots de referência
exige vincular a mudança aprovada; não apagar diferenças para fazer o teste passar.
Fontes oficiais consultadas em 09/11/2026, catalogadas em
`audit/strategy-evidence-2026-11-09.json`. Nenhuma tela, regra ou versão publicada
foi alterada. O script de inventário recebeu apenas leituras adicionais e arquivos
locais de acessibilidade, mantendo o HTML/worker por hash.
