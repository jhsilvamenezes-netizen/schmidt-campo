# Refinamento integrado do site e do app

09/11/2026. Diagnóstico e prioridades sobre a candidata local `5b58caa`.
Não implementa outra paleta, fonte, tela ou método. Complementa as projeções
já discutidas; o primeiro escopo funcional a consolidar continua sendo Plano.

## Evidência acrescentada nesta etapa

Executado `node audit/readability-inventory.mjs` em Chromium 141, viewport
390x844, pt-BR, UTC e perfis descartáveis. Modos normal e Sol, usando os
controles reais: estado inicial, equipe com uma pessoa, ajustes abertos e
entrada inválida. Não há leitura de localização ou armazenamento operacional.

Foram coletadas 63 observações de texto por tema; são observações repetidas
em estados diferentes, não 63 cores ou componentes distintos. As 126 amostras
avaliáveis ficaram acima dos limiares de contraste usados: 4,5:1 para texto
normal e 3:1 para texto grande. O menor contraste observado foi 5,68:1 no modo
normal e 11,58:1 em Sol. São pares de texto/fundo calculados, não uma auditoria
WCAG completa, do mapa, de todas as telas ou de uso ao sol real. O coletor
exclui pares com fundo/efeitos complexos que não consegue avaliar com segurança.

O apoio sob as distâncias tem **11 px**, apesar do contraste adequado. Isso
justifica avaliar legibilidade com pessoas e aparelho; não constitui sozinho
uma falha normativa. Há outros apoios/rótulos de 12 px. Valores das distâncias
estão em 20 px; os campos principais, em 18 px. A fonte permanece a família
system-ui existente, com alternativas do sistema operacional.

Entre 18 caixas de controles renderizados no estado medido, dois checkboxes
têm 24x24 px: limitar tiros à equipe e alinhar à barra. Os rótulos associados
podem ampliar a área acionável; o inventário não classificou isso como falha.
Precisa-se medir a área efetiva, espaçamento e operação com uma mão/luvas.

Nos dois temas, os ensaios confirmaram: entrada inválida identificada; barra
`36,48` aceita como 36.48; sequência rápida de densidades 10, 40, 20 terminou
com densidade 20 e mínimo 24. Esse caso não prova cancelamento de todo worker
ou ausência de corrida ao trocar lotes. Index e worker ficaram idênticos por hash.

## Prioridades por benefício

| Frente | Refinamento proposto | Evidência e critério de aceite |
| --- | --- | --- |
| Organização | Concluir o bloco principal do Plano: densidade, pessoas, mínimo, quantidades e distâncias. Demais explicações sob demanda. | As capturas anteriores cortam parte das distâncias. Verificar valores inteiros visíveis em 360/390 px sem encolher mapa, navegação ou fontes para forçar encaixe. |
| Letras | Preservar a família atual e organizar pesos/tamanhos por função: valor, rótulo, explicação. Avaliar aumento dos apoios de 11 px. | Contraste amostral passou; tamanho pequeno ainda exige leitura real. Não aumentar todas as legendas do mapa indiscriminadamente. |
| Paleta | Preservar o verde da identidade; reservar cores de estado para condições com significado, acompanhadas de texto/ícone quando necessário. Aproveitar o modo Sol. | Os pares analisados não justificam uma troca ampla de cores. Avaliar bordas, foco, seleção, ícones e diferenciação sem depender só de cor. |
| Formatação | Uniformizar apresentação em português e associação entre valor/unidade: ha/ponto, m, km, ° e quantidades inteiras. Manter intervalos e critérios de arredondamento coerentes. | Reutilizar formatadores existentes; texto exibido não deve ser convertido de volta em entrada de cálculo. Não fingir precisão física com casas decimais adicionais. |
| Estados e mensagens | Valor ativo perceptível, comparação identificada e retorno mínimo útil. Retirar histórico de versões e observações repetidas conforme a diretriz anterior. | Não esconder falha de gravação/GPS, mínimo ou calibração. Preservar Desfazer e confirmar a identidade do plano após recarga/exportação. |
| Interação | Conferir foco, teclado decimal, área de toque e resposta após digitação, troca de lote e rotação. | O caso rápido/decimal passou; faltam outros campos, lotes e condições. Medir antes de introduzir debounce/cache adicionais. |
| Código | Aprofundar contratos entre cenário, resumo e adaptadores; tipagem gradual nas fontes legíveis e testes de combinações/limites. | Os módulos novos já separam leitura, persistência e plataforma. A fonte geradora completa ainda falta: não justificar uma reescrita do bundle ou troca de framework pela aparência. |
| PWA e Android | Validar a mesma base em offline, teclado aberto, áreas seguras, botão Voltar, retomada, permissões, exportação e compartilhamento. | A página é compartilhada via Capacitor, mas navegador e WebView não são o mesmo ambiente. Exige aparelho/emulador e preservação de dados antes de qualquer migração. |

Esses itens são diagnóstico e direção de refinamento, não uma alteração visual
ampla autorizada. Uma nova escolha de letras, tamanhos, paleta ou outra tela
precisa de projeção comparada e aceite específico antes de implementação.

## Organização do código que apoia essas escolhas

1. Manter o motor como produtor do cenário; apresentação lê resultados e não
   replica fórmulas de área, amostragem, distância ou distribuição.
2. Definir contratos explícitos para resultados e unidades nas fronteiras dos
   módulos legíveis. Não misturar distância da malha, até um alvo GPS e caminhada.
3. Distinguir estado em edição, cenário efetivamente ativo e recomendação em
   comparação. Exportação, mapa e resumo precisam apontar para o mesmo resultado.
4. Testar resultados obsoletos em sequências rápidas e mudança de lote antes de
   ampliar workers ou caches. O app já usa worker e não precisa de outro por padrão.
5. Preservar adaptadores web/Android e testes de backup, concorrência e ciclo de
   vida. Não adicionar dependências de execução sem uma necessidade demonstrada.

Tipagem gradual/contratos não foram implantados nesta etapa. Sua adoção deve
ser pequena, reproduzível e útil às fontes que realmente mantemos. A evolução
não depende de acrescentar IA em execução, backend ou outra biblioteca visual.

## Sequência recomendada

Primeiro consolidar a organização do Plano já projetada e validar leitura,
formatação e ações no código real. Depois testar os mesmos critérios nas outras
etapas, com projeções próprias para o que mudar. Em paralelo, aprofundar testes
de contratos, resposta às interações e preservação dos dados sem mudança visual.
Por fim, ensaiar em Android/aparelho/campo e preparar entrega controlada.

As prioridades de assinatura/migração e atualização segura do worker continuam
nos documentos anteriores. Nenhum estudo estético substitui esses portões.
Não houve mudança de código do app, merge, Pages, APK, contato com operadores
ou tentativa de contornar o bloqueio anterior de upload do HTML.

Evidência agregada: `audit/readability-evidence-2026-11-09.json`.
Inventário completo: `audit/results/readability-private.json`, ignorado pelo Git.
