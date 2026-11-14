# Próximas melhorias — uso móvel primeiro

Esta fila contém propostas e verificações; não afirma que todas sejam defeitos
confirmados. O backlog principal permanece na Issue #1. Registrar reprodução,
antes/depois e resultado a cada entrega; não reescrever trechos estáveis por estilo.

| Prioridade | Segmento | Ação objetiva | Como comprovar |
|---|---|---|---|
| 1 | Coleta no campo | Percorrer escolher lote → planejar → navegar → coletar → fechar → retomar; revisar confirmação de gravação e recuperação de erro | Sem perda/duplicação; coleta reaparece após reabrir; falha de armazenamento não se apresenta como sucesso |
| 1 | Mapa e orientação | Rever rótulos BD3/T5, associação de nomes às divisas, seleção e medidas no mesmo trecho | Casos reproduzíveis, 208 tiros em teste versionado, 51 individuais/40 grupos, retrato/paisagem |
| 1 | GPS | Conferir atraso, baixa precisão, mudança de rumo e retorno da permissão no aparelho | Posição inválida/antiga não tratada como atual; direção não cria rota fictícia entre lotes |
| 2 | Clareza do planejamento | Avaliar se equipe, quantidade de pontos e distâncias podem ser encontrados sem procurar; manter ajustes pouco usados recolhidos | Observar tarefa real e contar toques/retornos; nenhuma distância essencial escondida |
| 2 | Operação com uma mão | Rever alcance dos controles, teclado numérico, foco e botões cobertos pela navegação | Alvos mínimos 44 px, foco visível, nenhuma ação bloqueada por teclado/rodapé nas larguras usuais |
| 2 | Rede, bateria e memória | Medir antes de otimizar; evitar recálculo geométrico e download por atualização GPS | Tempo de abertura, resposta ao toque, quadros durante arraste, imagens/requisições por minuto e memória; comparar mesmo aparelho/dados |
| 2 | Acessibilidade e Sol | Revisar contraste, texto ampliado, leitores de tela, estados selecionados e uso sem depender só de cor | Teclado, zoom de texto, ferramentas automatizadas e leitura real ao sol; automação não substitui ensaio humano |
| 3 | Fonte e arquitetura | Confirmar fonte geradora e equivalência; separar câmera, cálculo, persistência e interface | Build reproduzível, paridade do motor/backup, migração incremental e rollback |
| 3 | Entrega e continuidade | Unificar estado de cada PR, versão, testes e pendências entre Codex/Claude | Commit exato, pacote íntegro e link real conferido quando publicado; sem declarar candidata como produção |
| Dependência | Android | Preparar assinatura privada e migração segura | Backup restaurado em aparelho de teste; não reutilizar chave pública nem prometer atualização por cima |

## Regras práticas

- Primeiro remover erro e perda de dados; depois melhorar leitura e reduzir esforço.
- Uma mudança deve ter benefício observável. Biblioteca nova só com necessidade demonstrada.
- Preservar método linear, barra 36,48 m, rumos, P6 e dados. Não derivar divisa da fotografia.
- Satélite é opção secundária; Plano continua a alternativa normal e independente da rede.
- Novas mudanças visuais devem respeitar o escopo aprovado e ter comparação equivalente.
- Avaliar com quem usa no campo: concluir uma tarefa real é mais importante que acrescentar funções.
