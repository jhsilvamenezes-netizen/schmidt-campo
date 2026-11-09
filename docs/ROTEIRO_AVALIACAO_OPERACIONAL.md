# Roteiro de avaliação — organização e execução

Preparado em 09/11/2026. **Ainda não executado com participantes.** A primeira
projeção e este roteiro não autorizam implementação visual ou distribuição.
Não houve contato com operadores ou envio de mensagens nesta etapa.

## Etapa A — imagens, antes de implementação

Comparar captura original e projeção com mesmo contexto, lote e números. Ambas
são imagens para esse ensaio. Explicar que a projeção é simulada; seu mapa não
é um arquivo georreferenciado. Alternar a ordem de apresentação entre sessões.

Tarefas neutras, sem indicar onde clicar ou entregar a resposta:

1. Identifique a regra de amostragem e a equipe considerada nesse plano.
2. Informe quantos tiros/pontos estão previstos e qual é o mínimo.
3. Explique a distância entre tiros e o intervalo entre pontos neste exemplo.
4. Mostre onde procuraria os ajustes menos frequentes e como saberia se algum
   parâmetro importante está personalizado ou pendente.
5. Indique se há algo que precisa de conferência antes do trabalho em campo.

Registrar localização correta, interpretação, tempo de procura e necessidade
de ajuda. Não registrar essas indicações como toques/executações de um app.
Não simular sucesso de cálculos, salvamento, GPS ou exportação por uma imagem.

## Etapa B — software, após aprovação visual específica

Usar perfis descartáveis, backup conferido e mesma versão dos dados. Não limpar
armazenamento operacional nem instalar sobre o APK usado pela equipe. Registrar
hash/versão, viewport, aparelho, WebView/Chrome, condições e estado inicial.

| Tarefa entregue ao participante | O que observar, sem sugerir resposta |
| --- | --- |
| Prepare o plano com a regra e equipe fornecidas para a sessão. | Encontra controles, aplica os valores válidos e reconhece o plano em uso. |
| Sua equipe diminuiu. Reorganize o trabalho e explique o impacto. | Não presume redução de amostras/tiros; confere divisão e esforço. |
| Descubra quanto percorrerá entre pontos no T1 e lateralmente até o tiro vizinho. | Distingue as duas medidas e o detalhe específico do tiro. |
| Avalie uma alternativa e depois compartilhe o plano que decidiu usar. | Comparação não é confundida com aplicação; resumo e arquivo correspondem. |
| Confira uma pendência de dados/calibração fornecida no cenário. | Condição não desaparece em uma seção recolhida nem vira homologação geral. |
| Continue depois de sair/retornar ou abrir outra aba no cenário controlado. | Entende qual estado está salvo, preserva dados e identifica falha de gravação. |

O moderador define antes da sessão os dados e o resultado verificável de cada
tarefa. Separar erros de uso, nomenclatura, navegação, cálculo e persistência.
Não mudar o critério de sucesso depois de observar uma preferência estética.

Coletar por tarefa: conclusão correta, tempo, toques, rolagens, retornos, ajuda,
interpretação equivocada e comentário do participante. Registrar onde precisou
intervir. Apresentar contagens e distribuição dos tempos; amostra pequena não
autoriza afirmar superioridade estatística ou percentual geral de ganho.

## Etapa C — aparelho e campo

Usar `PROTOCOLO_ANDROID_CAMPO.md`: funcionamento sob sol e com uma mão; luvas
quando fizerem parte da operação; sinal/precisão, orientação, retomada, RAM,
bateria e offline. Requisitos de precisão e referência de terreno devem ser
definidos pelo responsável antes de avaliar GNSS. Não usar o ensaio para alterar
contornos ou homologar áreas sem procedência.

## Registro e decisão

Modelo de colunas, ainda sem resultados preenchidos:

```text
sessao_anonima,papel,versao_hash,dispositivo,etapa,tarefa,
conclusao_correta,tempo_s,toques,rolagens,retornos,ajuda,
interpretacao_equivocada,evidencia_privada,observacao
```

Manter dados de participantes, coordenadas e identificação operacional em
ambiente privado. Testes automatizados podem usar dados sintéticos/públicos
já autorizados. Não adicionar telemetria externa implicitamente.

A decisão combina os resultados com a revisão técnica: acesso aos essenciais,
visibilidade das pendências, consistência do plano/arquivo e preservação dos
dados. Conformidade visual isolada não prova usabilidade; opinião positiva
isolada não prova consistência matemática. A aprovação do proprietário deve
identificar o escopo visual, e merge/publicação continuam sujeitos a autorização.

Referência de método, consultada em 09/11/2026:
[GOV.UK — Using moderated usability testing](https://www.gov.uk/service-manual/user-research/using-moderated-usability-testing).
