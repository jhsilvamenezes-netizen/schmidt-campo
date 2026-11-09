# Plano essencial — implementação local

09/11/2026. Executa a ordem do proprietário “Pronto vamos por em pratica”,
após as projeções e a diretriz de informação essencial. Referência visual:
`/workspace/generated_images/exec-f6ef9652-edea-4b15-8758-cccb82205e8f.png`.
Escopo: etapa inicial de Plano e simplificação do retorno normal de alteração.
Sem mudança de mapa, navegação, paleta, família de fonte ou método de cálculo.

## Resultado no código real

- Densidade e pessoas mantêm os controles, IDs, steppers e eventos existentes.
  A ajuda curta relaciona hectares ao mínimo. O plano ativo fica identificado.
- Os valores completos das duas distâncias ficam visíveis na primeira abertura
  nos cinco tamanhos ensaiados: 360x800, 390x844, 412x915, 768x1024 e 1280x1024.
  Os cartões ficam abertos, seguidos pelo esquema de direções ilustrativo.
- A orientação de equipe fica após as distâncias, mantendo a posição desses
  valores quando muda o número de pessoas. O mínimo não é reduzido pela equipe.
- Contexto curto da área usada na regra fica visível. Origem detalhada, regra
  e áreas efetivas ficam em detalhes; os seletores desktop foram preservados.
- Ajustes e comparação ficam recolhidos inicialmente. Ao abrir comparação,
  as opções existentes ficam acessíveis. A recomendação indica se está em uso
  ou não aplicada. Não se usa igualdade de contagens para inferir aplicação.
- Foram retirados os rótulos históricos da alternativa e as observações de
  padrão/alteração dos metadados do Plano. Limites de entrada, ajuda, calibração
  e mensagens de erro permanecem. A correção gramatical de “1 tiros” é só visual.
- A notificação normal de mudança deixa de repetir números antes/depois.
  Quando cabível, mantém a ação original Desfazer com sua mesma closure e
  proteção de lote. Avisos pendentes e erros não passaram por um filtro global.

A disposição ajusta a prancha para o espaço real: estado ativo e contagens
compartilham a linha quando cabem, e a nota de equipe não desloca as distâncias.
Em 360 px, parte da explicação abaixo dos valores pode exigir rolagem; o teste
confere os números completos, não promete todos os detalhes na primeira tela.
Textos longos, zoom do sistema e importações precisam de avaliação adicional.

## Estrutura e preservação

`src/ui/plan-presentation.mjs` concentra a limpeza explícita dos textos de
apresentação. Não renomeia o ID interno `antigo`, não modifica defaults, nem
usa texto formatado como entrada de cálculo. O adaptador do Plano move nós
originais e lê o cenário ativo usando as funções de medida existentes.

O agrupamento dos detalhes da recomendação acontece também antes da próxima
pintura após o conteúdo legado ser reconstruído, para evitar sua abertura
transitória. Não há nova dependência de execução ou gravação de dados.

O builder mantém os pontos de integração verificados do artefato original,
recalcula CSP/cache sem afrouxar a política e aplica duas alterações delimitadas
somente ao retorno normal de regeneração. O tratamento de falha de armazenamento
continua reutilizado byte a byte. O gerador original completo ainda está ausente.

## Validação e revisão

Resultados do artefato final: `audit/plan-essential-execution-2026-11-09.json`.
Passaram 50 testes de contrato/módulo, 23 comparações visuais, paridade de
seis estados, proteção do desktop fora do Plano (zero pixels diferentes),
nove grupos de backup/GPS, oito cenários entre abas e nove testes de preparo
Android com paridade de 63 arquivos. A conferência GEOS/PROJ manteve 51
geometrias válidas e 749 pontos internos; quatro diagnósticos Python passaram.
Foram medidas 20 execuções de desempenho, sem alegação de ganho estatístico.
Reprodução:

```sh
node scripts/build-preserved.mjs --check
npm test --prefix audit
npm run test:plan --prefix audit
npm run test:browser --prefix audit
npm run test:corrections --prefix audit
npm run test:sessions --prefix audit
npm run test:android --prefix audit
npm run probe:spatial --prefix audit
node audit/readability-inventory.mjs
node audit/visual-projection-reference.mjs
```

O aceite do Plano verifica controles reais, teclado, ajuda, validação, troca
BA1/BD3, equipe reduzida, densidade/barra personalizadas, alternativa, Desfazer
real e avanço. Compara seis estados de cenário/armazenamento com o original.
A proteção por pixels também cobre o desktop fora do painel, além das 23
comparações já existentes. Não houve aumento de tolerância ou troca de baseline.

A amostragem de leitura foi repetida em normal/Sol: os apoios das distâncias
agora têm 13 px; não foram encontrados pares abaixo do limiar nos estados
coletados. Isso não é certificação completa de acessibilidade ou uso ao sol.
Checkboxes e suas áreas associadas ainda precisam de ensaio físico.

Capturas reais e comparação local ficam em
`audit/results/plan-essential-delivery/comparacao-real.html`. Os relatórios
intermediários, capturas e anexos não são enviados como artefatos públicos.

## Entrega e limites

Entrega nesta etapa: código e commits locais na branch de auditoria. O bloqueio
anterior de upload do HTML não foi contornado ou tratado como resolvido por
esta autorização de implementação. Sem novo envio remoto ou CI remota.
Sem merge, alteração do Pages, Release ou APK de distribuição.

Preparação Android/paridade de assets é distinta de executar um APK em aparelho.
Android/WebView físico, campo, migração de assinatura e atualização do worker
entre versões continuam pendentes. O offline ensaiado não homologa atualização.
A versão publicada e a base de dados permanecem as referências preservadas.

Rollback local: novo commit revertendo esta etapa e regeneração conferida,
sem apagar dados ou alterar schema. Não usar reset destrutivo nem confundir
reversão na branch com rollback de uma implantação que não foi autorizada.
