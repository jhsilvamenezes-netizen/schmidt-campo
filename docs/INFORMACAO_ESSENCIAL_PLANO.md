# Informação essencial no Plano

09/11/2026. Refinamento solicitado após o proprietário avaliar as projeções.
Objetivo: distâncias entre tiros/pontos bem visíveis, apenas informação que
ajude a executar, decidir, conferir ou recuperar uma ação.

## Critério de leitura

O bloco principal mantém hectares por ponto, pessoas, plano em uso, mínimo,
quantidades e as duas distâncias. Os cartões de distância ficam abertos,
com títulos inequívocos e esquema de direções perceptível. Informações
secundárias não devem empurrar esses valores para fora da primeira leitura.

O encaixe completo dos valores em 360x800 e 390x844 é um critério para o próximo
protótipo funcional, não um resultado provado pela imagem. Não reduzir mapa,
menus ou tipografia automaticamente para atingir esse objetivo. “Sempre bem
visível” não foi interpretado como nova barra fixa global em todas as telas.

As medidas têm contextos distintos: distância lateral ao tiro vizinho,
intervalo ao longo do tiro, distância GPS até um alvo e caminhada total.
Não trocar seus valores nem reduzi-los ao rótulo genérico “distância”.

## Revisão concreta da informação existente

| Conteúdo identificado | Tratamento proposto | O que preservar |
| --- | --- | --- |
| Nome de alternativa “padrão antigo” e explicação da versão 0.10 | Retirar o histórico da operação; usar identificação operacional neutra, como “Distribuição alternativa”. | Opção, cálculo, parâmetros e acesso à comparação. |
| Aviso longo com tiros/pontos/cobertura/caminhada antes e depois | Evitar repetir resultados já atualizados no resumo; feedback mínimo quando necessário. | Ação Desfazer e seu vínculo com o plano/lote correto. Não apagar a funcionalidade ao remover o texto. |
| “Alterado · padrão: 36,48 m” ao lado da barra 40 | Exibir o valor vigente; retirar a observação histórica da leitura principal. | Campo editável, validação, unidade e ajuda que seja necessária. |
| Texto “personalizado” apenas para anunciar diferença do padrão | Retirar da prévia; o detalhe aberto se chama “Ajustes”. | Valores ativos e as condições operacionais aplicáveis. |
| Explicação repetida de que consultar não aplica | Na prévia, retirar a frase redundante onde “Recomendado · não aplicado” e “Usar este plano” já deixam a condição explícita. | Identificação de plano em uso versus comparação. Não prometer alteração da lógica de edição/recalcular. |
| Mínimo, erro de entrada, falha de gravação/GPS, calibração pendente ou equipe incompatível | Manter quando aplicável, com objeto e ação claros. | A capacidade de perceber e resolver a condição. Não tratar toda advertência como poluição. |
| Origem detalhada de área/rumo e explicação longa | Acesso sob demanda, conservando contexto da área usada na regra e alertas relevantes. | Rastreabilidade e distinção entre área publicada, geométrica e operacional. |

O rótulo “300 m” da alternativa histórica também merece cuidado: no estado
ensaiado com barra 40 m, a distância efetiva é 280 m. Apagar somente “antigo”
e manter um nome numérico que pareça descrever o resultado não resolve a
inconsistência de leitura. A comparação deve usar as medidas efetivas.

## Lógica e estrutura para uma implementação coesa

Os textos históricos foram localizados no artefato e o aviso normal de mudança
na função legada `qe`. Esta função também encaminha mensagens/ações pendentes;
o canal de status é compartilhado com erros e outras operações. Não aplicar
uma supressão global de avisos nem uma lista de palavras proibidas sobre todo
o DOM. A alteração deve ser limitada à categoria de apresentação correspondente.

O identificador interno da alternativa, `antigo`, não é um rótulo visível:
não renomeá-lo por estética, evitando quebrar ações, testes ou compatibilidade.
Os valores de referência do catálogo continuam úteis para resolver parâmetros;
remover sua explicação da tela não autoriza modificar defaults, limites,
backup ou regras do motor.

Continuar derivando resumo e distâncias do cenário ativo com as funções
existentes. A recomendação deve conservar sua identidade própria. Contagens
iguais não provam que dois desenhos sejam o mesmo plano. Não recalcular a
geometria para produzir nomes ou mensagens de interface.

## Prévia refinada e comparação

Prancha de informação essencial:
`/workspace/generated_images/exec-f6ef9652-edea-4b15-8758-cccb82205e8f.png`.
Ela mantém os três estados e todos os valores já conferidos. Retira o aviso
de valor alterado/padrão, o marcador de personalização e a frase redundante da
comparação. Mantém distâncias, mínimo, estado ativo, orientação de equipe,
calibração e aplicação explícita de uma recomendação.

Comparação local com as referências reais:
`audit/results/didactic-projections/comparacao-essencial.html`.
As referências permanecem intactas; seus textos originais não foram retocados.
Nenhuma prévia de reposicionamento do aviso global/Desfazer foi produzida nesta
etapa. A simplificação desse aviso continua sendo um item identificado para
revisão específica, sem declarar mudança implementada.

Esta etapa fez inspeção do código e refinamento da projeção/documentação.
Não alterou index, worker, motor ou controles do aplicativo, não reexecutou
os testes anteriores como se fossem novos resultados e não publicou arquivos.
Os ensaios de seis perfis da etapa anterior continuam sendo as referências dos
valores; não equivalem a teste de usabilidade com participantes.

## Execução posterior autorizada

A ordem seguinte do proprietário foi implementada localmente e documentada em
[EXECUCAO_PLANO_ESSENCIAL.md](EXECUCAO_PLANO_ESSENCIAL.md), com capturas reais e
verificações de preservação. A descrição anterior continua sendo o registro da
etapa de projeção, não uma afirmação de que o código atual ficou inalterado.
