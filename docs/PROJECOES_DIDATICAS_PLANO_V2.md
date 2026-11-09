# Projeções didáticas do Plano — segunda revisão

09/11/2026. Atende ao pedido “Faça” após a autoanálise: preparar comparações
visuais de densidade, distâncias e equipe, com estados normal, equipe reduzida
e personalizado. **Proposta visual, não implementada nem aprovada para execução.**

## Prancha e comparação locais

Prancha escolhida:
`/workspace/generated_images/exec-29da0506-5df6-4a8a-8d45-d1619dc4458d.png`.
A imagem identifica a simulação e mostra somente o painel Plano. Mapa,
cabeçalho, navegação e cinco etapas estão fora do recorte e fora da proposta.
A prancha não prova que todo o conteúdo caberá na primeira tela do celular.

Comparação autônoma, com imagens incorporadas e sem rede externa:
`audit/results/didactic-projections/comparacao.html`. Contém a prancha e as
capturas reais do original e da candidata local nos três estados, incluindo
ajustes abertos. Esses arquivos ficam ignorados pelo Git, sem upload público.

Os rascunhos anteriores gerados nesta etapa, de tela inteira, não são a
referência final: sua reconstrução ilustrativa do mapa/cabeçalho não permite
avaliar conservação exata da apresentação. A prancha final restringe o recorte
ao painel e conserva as referências reais separadas. Não usar rascunhos para
aprovar mudanças globais, aferir distâncias ou afirmar encaixe de viewport.

## Conteúdo da proposta

- Relacionar hectares por ponto à quantidade mínima ao lado do controle.
- Identificar explicitamente o plano em uso antes de suas quantidades.
- Manter distâncias lateral/longitudinal juntas e o esquema didático perceptível.
- Orientar a equipe reduzida a planejar o percurso na seção Tiros existente,
  sem inventar atribuição por pessoa, caminhada individual ou tempo.
- Mostrar personalização e calibração pendente com os ajustes abertos.
- Identificar a recomendação não aplicada separadamente do plano ativo.
- Recolher origem/detalhes, preservando contexto da área usada na regra e os
  avisos globais existentes. Não remover dados ou explicações.

| Estado real de referência | Hectares/ponto | Pessoas | Plano em uso | Mínimo | Entre tiros | Entre pontos |
| --- | --- | --- | --- | --- | --- | --- |
| Normal | 20 | 5 | 5 tiros / 24 pontos | 24 | 438 m | 438 a 515 m |
| Equipe reduzida | 20 | 1 | 5 tiros / 24 pontos | 24 | 438 m | 438 a 515 m |
| Personalizado, barra 40 m | 10 | 1 | 9 tiros / 47 pontos | 47 | 280 m | 365 a 438 m |

No personalizado, a recomendação tem **7 tiros / 47 pontos** e não está em uso.
Esse estado vem de aplicar a opção existente de padrão antigo no perfil de
ensaio, após alterar densidade/barra. O rótulo legado da opção menciona 300 m;
a distância efetiva lida no cenário ativo é 280 m. A projeção usa o resultado
existente e não altera o método de arredondamento/alinhamento.

O marcador “não calibrado” não homologa o equipamento nem o lote. O esquema
mostra duas linhas para ensinar as direções; não representa a quantidade ou a
geometria dos tiros do plano. A legenda e as quantidades mantêm essa distinção.

## Evidência e limites

`node audit/visual-projection-reference.mjs` executou seis perfis descartáveis:
três estados em original/candidata, Chromium 141, viewport 390x844, pt-BR, UTC,
service worker bloqueado. Comparou parâmetros, pessoas, quantidades, mínimo e
medidas do cenário, sem erros JavaScript. O relatório detalhado e as capturas
ficam em `audit/results/didactic-projections/`, ignorado. Index e worker foram
conferidos por hash antes/depois e permanecem intactos.

A galeria foi aberta em Chromium: nove imagens decodificadas, zero requisições
HTTP externas e sem overflow horizontal em 390 px. É validação do artefato de
comparação, não de uma implementação funcional das projeções.

Participantes: zero. Ainda faltam avaliação por tarefas, encaixe real em
360/390/412 px e estados adicionais, acessibilidade e ensaio de aparelho/campo.
Os testes anteriores do app não foram reexecutados por esta etapa, pois seu
código de execução não mudou; o ensaio novo valida as referências necessárias
às projeções. Resultado agregado: `audit/didactic-projections-evidence-2026-11-09.json`.

## Próxima decisão

A aprovação específica precisa referir-se a esta prancha e ao painel Plano.
Só depois cabe implementar um recorte pequeno na branch e testar o resultado
real. Preservar a semântica existente de editar/recalcular, consultar e aplicar;
a identidade de um plano não pode ser inferida só por contagens iguais.
Nenhuma implementação, merge, Pages ou APK foi feita por esta etapa.
O bloqueio anterior de envio do HTML não foi reaberto nem contornado.
