# Autoanálise da leitura e das decisões no SCHMIDT Campo

09/11/2026. Revisão heurística da candidata local `24d1a4e`, com implementação
em `b20c3dc`, confrontada com capturas originais e os módulos legíveis novos.
Não é ensaio com operadores: não houve participantes nem observação de campo.
Esta etapa não modifica a interface, o motor ou os dados e não amplia a
aprovação visual anterior. O envio do HTML permanece bloqueado conforme
`PLANO_ORGANIZACAO_APROVADA.md`; o “entendido” posterior não foi interpretado
como autorização explícita daquele envio.

## Leitura de quem chega pela primeira vez

O operador precisa reconhecer, nesta ordem: o lote correto; o que informar;
o que o plano resultante exige; o que precisa conferir; e como começar e
retomar a atividade. A organização deve ajudá-lo a responder essas perguntas
com a linguagem que o app já utiliza. Não há justificativa demonstrada para
acrescentar um tutorial obrigatório, outra navegação ou um novo painel geral.

A candidata aproxima hectares/pessoas do resultado e preserva controles,
explicações e alternativas. Os testes de paridade indicam conservação do
funcionamento nos estados ensaiados. Eles não demonstram, por si, que alguém
compreenderá mais rápido ou errará menos.

## Autocrítica da proposta implementada localmente

| Achado | Evidência ou limite | Consequência para a revisão |
| --- | --- | --- |
| As distâncias ainda exigem rolagem no celular. | Em 390x844, os cartões ocupam aproximadamente y=798–893; em 360x800, y=787–897. As capturas reais confirmam o corte. | O ganho de acesso aos parâmetros não resolveu a leitura conjunta de todo o essencial. Avaliar a hierarquia e as repetições antes de reduzir mais a fonte. |
| O desenho recolhido retira uma explicação espacial útil da leitura inicial. | O diagrama original diferencia lateral/ao longo; a candidata o mantém dentro dos detalhes do recomendado. | O que é secundário para um operador experiente pode ser necessário no primeiro uso. Testar compreensão das duas distâncias e da relação com o mapa antes de recolher outros apoios. |
| A nota de equipe identifica a diferença, mas não resolve a organização do trabalho. | Na captura, “1 pessoa para 5 tiros. Confira a divisão e o percurso”. | O usuário pode continuar sem saber quais tiros percorrer e quanto esforço considerar. Não afirmar que a distribuição por pessoa já foi calculada ou validada. |
| Um ajuste fora do padrão pode passar despercebido quando recolhido. | O resumo mostra o valor de barra ativo; a indicação original “Alterado” fica dentro do detalhe na captura personalizada. | O título precisa permitir reconhecer uma exceção, e o estado aberto deve explicar seu alcance. Isso é proposta, ainda sem novo texto ou indicador implementado. |
| Plano ativo e recomendado podem ter desenhos diferentes. | O ensaio aplica uma alternativa; a captura personalizada mostra feedback de mudança e uma recomendação com outra quantidade. O resumo novo lê o ativo corretamente. | A correção numérica não elimina a possível confusão visual ao rolar até o desenho recomendado. Testar se a pessoa consegue dizer qual plano será executado/exportado. |
| “Não calibrado” precisa de objeto e de ação claros. | O indicador vem da apresentação original dos parâmetros; não é laudo global do app. | Verificar se o usuário entende o que conferir. Não substituir pela promessa de que todo o lote está calibrado ou aprovado. |

As coordenadas acima são posições CSS na tela, não coordenadas geográficas.
Fontes locais: `audit/results/operational-plan/report-private.json`, capturas
`390-default.png`, `390-crew-one.png`, `390-custom.png` e `1280-default.png`.
A captura personalizada é de um estado já alterado e rolado, não deve ser
comparada pixel a pixel ao estado inicial como prova de benefício.

## Prioridades de compreensão

### 1. Ligar a entrada ao efeito no plano

A primeira dúvida provável é “o que muda quando altero hectares por ponto?”.
A resposta precisa relacionar densidade, mínimo e resultado efetivo. No exemplo
já existente: a área publicada de 469,90 ha com 20 ha/ponto produz mínimo de
24 pontos, por arredondamento para cima. As distâncias efetivas apresentadas
são 438 m entre tiros e 438–515 m entre pontos.

Esses números cumprem funções diferentes. “20 ha/ponto” não é distância,
nem garante quadrados idênticos ou área geométrica individual de exatamente
20 ha. A área usada na regra e as áreas efetivas do desenho precisam conservar
as suas definições/origens. Mudar a densidade não constitui validação agronômica
para uma cultura ou objetivo diferentes. Preservar a ajuda e os métodos atuais.

Pergunta de avaliação: “Explique o que esse valor significa e o que espera que
aconteça com a quantidade de pontos se ele mudar”. Não entregar a resposta na
tarefa nem considerar decorada uma fórmula como prova de compreensão.

### 2. Tornar lateral e longitudinal reconhecíveis na atividade

O operador precisa distinguir ir ao tiro vizinho de caminhar entre pontos do
mesmo tiro. Um intervalo resumido não é uma instrução única para todos os
pontos: o detalhe do tiro continua necessário. A referência espacial do desenho
já existente é um recurso didático a preservar.

Verificar a coerência entre resumo do lote, medida específica por tiro e valor
máximo exibido em outro contexto. Um intervalo e seu máximo podem estar ambos
corretos; a apresentação precisa permitir reconhecer o alcance de cada um.
Não harmonizar valores diferentes por substituição numérica indevida.

Pergunta: “Neste tiro, quanto você caminhará até o próximo ponto? E para chegar
ao tiro vizinho?”. Registrar onde a pessoa procurou e como interpretou a faixa.

### 3. Relacionar equipe a responsabilidade e esforço

A quantidade de pessoas não deve sugerir redução automática do mínimo. Os
casos uma pessoa/cinco tiros e equipe maior que os tiros precisam de leitura
própria, em vez de um aviso genérico para qualquer desigualdade.

Antes de propor uma atribuição automática, conferir se há método que represente
entrada/saída, transições, sentido e divisão de tiros. Dividir a caminhada total
pelo número de pessoas não comprova a caminhada individual. Estimativa de tempo
exige premissas operacionais ainda não validadas. O app já tem detalhes por tiro;
qualquer evolução deve aproveitar esse conhecimento e declarar os limites.

Pergunta: “Com essa equipe, explique como você organizaria a execução”.
A resposta não pode ser induzida como se houvesse distribuição automática pronta.

### 4. Separar escolhas, comparação e conferência

Ao consultar uma alternativa, o operador deve reconhecer se apenas a examinou
ou se a aplicou. Depois de editar/aplicar, o resumo, mapa, detalhe por tiro e
arquivo precisam se referir ao mesmo cenário ativo. A identidade dessa versão
é um requisito de consistência, não justificativa para adicionar códigos
internos à tela do operador.

Pergunta: “Qual plano está em uso agora? Se exportar, qual desenho sairá?”.
O ensaio automatizado de seis estados é uma proteção técnica; observar a
interpretação humana é uma verificação diferente.

### 5. Fazer pendências apontarem uma conferência concreta

Separar três assuntos: consistência da distribuição calculada, procedência dos
dados do lote e conferência física de equipamento/orientação. O verde de um
diagnóstico de distribuição não homologa limites, GPS ou calibração. Esse é
um risco de interpretação a investigar, não um erro de usuário já observado.

Perguntas: “O que esse diagnóstico confirma?” e “O que ainda precisa conferir
antes de executar?”. Um parâmetro personalizado pode ser válido; não tratá-lo
automaticamente como erro, assim como padrão numérico não prova calibração.

### 6. Dar propósito às cinco etapas existentes

| Etapa atual | Decisão que deve ajudar a resolver |
| --- | --- |
| Plano | Que plano vou preparar e qual resultado está em uso? |
| Diagnóstico | Onde a distribuição merece atenção e por quê? |
| Ajuste fino | Qual ajuste é necessário neste caso e qual seu efeito? |
| Conferência | Os parâmetros, dados e condições aplicáveis foram conferidos? |
| Arquivos | Estou levando o plano que escolhi e consigo recuperá-lo? |

Esse quadro é um critério de revisão; não propõe renomear as etapas nem muda
menus/botões. Texto repetido entre etapas só se justifica quando ajuda uma
nova decisão. Detalhe útil deve ter lugar previsível, sem ser repetido inteiro.

## Sequência de trabalho recomendada

1. Avaliar primeiro densidade/efeito, as duas distâncias e equipe/execução,
   reaproveitando o roteiro de tarefas e os estados existentes.
2. Preparar projeções comparadas com o original e a candidata local para os
   estados normal, equipe reduzida e ajuste personalizado. Mostrar também o
   resultado com detalhes abertos: recolher não pode ser a única aparência
   examinada. As novas projeções ainda não foram produzidas nesta etapa.
3. Escolher uma alteração pequena por vez e obter aprovação específica da
   projeção antes de implementar mudanças visuais adicionais.
4. Conferir paridade funcional e avaliar por tarefas neutras, com operadores
   novos e habituais. Registrar interpretação, ajuda, rolagens e recuperações
   de erro; não inventar ganho percentual nem uma pontuação de intuitividade.
5. Prosseguir para aparelho/campo e entrega controlada com as autorizações
   correspondentes. Nenhuma nova publicação ou contato com operadores foi feito.

O benefício esperado é uma leitura em que a pessoa consegue relacionar
entrada, resultado e ação. A validação depende das respostas e da execução
observadas; uma composição mais compacta ou uma opinião favorável isolada
não comprovam esse benefício.

## Etapa posterior — projeções preparadas

O pedido seguinte do proprietário resultou na prancha e nas comparações
registradas em [PROJECOES_DIDATICAS_PLANO_V2.md](PROJECOES_DIDATICAS_PLANO_V2.md).
Os estados normal, equipe reduzida e personalizado agora têm referências reais
comparáveis e proposta ilustrativa. Não houve nova implementação visual ou
aprovação implícita da prancha, nem execução com participantes.
