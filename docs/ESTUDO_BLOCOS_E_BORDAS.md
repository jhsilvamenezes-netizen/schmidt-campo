# Planejamento por bloco e distâncias de borda

Continuação estruturada para implementação, após a publicação web r1:
[arquitetura individual/bloco](ARQUITETURA_PLANEJAMENTO_INDIVIDUAL_E_BLOCO.md).
Este diagnóstico é preservado como registro histórico.

Estudo local solicitado pelo proprietário em 09/11/2026. Nenhuma mudança de
interface, método de produção, contorno, plano salvo ou distribuição. A pergunta
à equipe sobre amostragem versus aplicação e o significado de borda continua
pendente; o estudo considera primeiro a amostragem e distingue as duas operações.

## Resultado BB1 / BC1

Na candidata atual, ambos têm o mesmo rumo de referência. Após colocar os
polígonos em um referencial métrico comum, há aproximadamente **2,81 m** entre
eles. A união geométrica permanece com dois componentes, sem borda compartilhada
exata nem sobreposição. Não preencher a separação com buffer, envoltória convexa
ou retângulo: isso inventaria área operacional e passagem.

Cada lote guarda coordenadas relativas à sua própria origem. Comparar ou unir
diretamente essas coordenadas locais produziria resultado incorreto. O estudo
translada cópias para uma origem comum; os dados originais não são alterados.

O cenário padrão tem 26 pontos no BB1 e 23 no BC1; os respectivos mínimos atuais
também são 26 e 23. A menor distância geométrica de um ponto à borda é cerca de
40,03 m e 40,73 m, respectivamente. São valores do cenário padrão da candidata,
não dos planos personalizados instalados. Não significam recuo homologado.

O mapa histórico não prova transitabilidade, ausência de cerca, drenagem,
estrada ou diferença de manejo. Mesmo uma borda compartilhada exigiria revisão.
O ganho de tempo não foi medido: não foi gerado um plano de bloco nem simulada
uma rota de campo para anunciar economia.

## Estratégia recomendada

1. Criar futuramente um plano de bloco que referencia os lotes, sem apagar suas
   identidades. Coleta, foto, ponto, histórico e exportação continuam indicando
   o lote de origem; a seleção e os planos individuais permanecem disponíveis.
2. Compartilhar rumo e fase da grade quando operação, acessos, terreno e manejo
   permitirem. Recortar os tiros por cada polígono e preservar furos/exclusões.
   Igual rumo sozinho não garante igual alinhamento da grade.
3. Manter no primeiro piloto o mínimo por lote e conferir a cobertura dentro
   de cada um. Não recalcular apenas pela área total: arredondamento e divisão
   espacial poderiam retirar amostras de um lote. O mínimo é restrição, não
   necessariamente o total que um novo desenho precisará.
4. Tratar o deslocamento entre lotes como ligação própria, condicionada a acesso
   confirmado. Não contar essa ligação como trecho amostral nem desenhar reta
   automática sobre área sem autorização de passagem.
5. Comparar individual versus bloco com mesmos objetivos: quantidade por lote,
   cobertura, caminhada dentro e fora dos lotes, transferências e manobras.
   Só anunciar ganho depois dessa comparação e do ensaio com a equipe.
6. Amostragem direcionada deve ser um modo explícito, com alvo e justificativa,
   preservando a identificação e sem se apresentar como grid uniforme.

Cultivo atual, manejo e condições precisam ser confirmados em campo; não usar
metadados históricos de variedade como autorização automática de agrupamento.

## Três distâncias que precisam de significado próprio

| Medida | Uso e verificação |
| --- | --- |
| Distância entre tiros e entre pontos | Valores efetivos do plano; continuar em destaque. |
| Margem no início/fim do trecho | Distância ao longo do tiro, diferente da menor distância à divisa. |
| Menor distância ponto–borda | Distância métrica ao contorno mais próximo, incluindo furos; detectar ponto externo separadamente. |

Uma linha horizontal pode colocar o ponto a 50 m da entrada no polígono,
mas a apenas 35,36 m de uma borda inclinada a 45°. Foi verificado em geometria
sintética. Portanto, não rotular a margem longitudinal como recuo mínimo.

A barra completa é **36,48 m**; a meia largura é **18,24 m**. Em uma situação
local ideal de borda paralela ao eixo e barra perpendicular, eixo a 20 m da
borda deixa 1,76 m além da ponta da barra. Isso é apenas um cálculo de folga:
não define recuo agronômico/legal, proteção ambiental, deriva, cabeceira ou
envelope de manobra. Não descontar meia barra da distância dos pontos de
amostragem. Bordas curvas, orientação da barra e obstáculos exigem cálculo
do envelope adequado e validação do equipamento.

## Comportamento atual reproduzido no módulo real

`audit/border-policy-browser.mjs` carrega a candidata em Chromium e chama
`SCHMIDT.modulos.__m_engine_sampling`, sem reimplementar as fórmulas:

| Trecho / configuração | Posições ao longo do trecho |
| --- | --- |
| 200 m, 4 pontos, meia margem | 25, 75, 125, 175 m |
| 200 m, 3 pontos, margem fixa 20 m | 20, 100, 180 m |
| 100 m, 3 pontos, margem fixa 50 m | Aproximadamente 16,67, 50, 83,33 m: fallback para meia margem |
| 200 m, 1 ponto, margem fixa 20 m | 100 m: centro |
| 200 m, 3 pontos, margem 20 m e deslocamento −20 m | 0, 80, 160 m |

Os casos de fallback e deslocamento demonstram que a margem
nominal não é uma restrição obrigatória. O teste da função de deslocamento
não afirma que o cenário padrão BB1/BC1 usa esse deslocamento. Uma futura
regra de **recuo mínimo obrigatório** precisa impedir seu relaxamento silencioso
e validar pontos após alocação, otimização, edição e importação. Se não houver
solução, deve indicar conflito, em vez de diminuir o recuo escondido.

Um recuo por buffer negativo pode fragmentar ou eliminar área estreita.
O planejamento deve reconhecer esse caso e conservar as exclusões. Na divisa
interna de um bloco, manter inicialmente o tratamento individual; só relaxá-lo
se a operação permitir expressamente e sem perder representatividade por lote.
Não alterar esse comportamento agora sem fechar o significado com a equipe.

## Validação executada e próxima etapa

- Oito testes sintéticos passaram: origens distintas, separação, borda comum,
  contato pontual, sobreposição, borda diagonal, furo, barra e geometria inválida
  estão cobertos nos oito casos de teste.
- Cinco casos da política atual passaram em Chromium, incluindo fallback e
  deslocamento. Não houve alteração de registros ou GPS real.
- Estudo BB1/BC1 executado contra o probe dos 51 lotes, com hash correspondente
  à candidata. Coordenadas e detalhes permanecem em `audit/results/`, ignorado.
- `node scripts/build-preserved.mjs --check` passou: runtime permanece igual.

Reprodução a partir de `audit/`, com as dependências já documentadas:

```sh
.venv/bin/python -m unittest block_geometry_test.py
npm run probe:spatial
.venv/bin/python block-study.py
node border-policy-browser.mjs
```

Próximo passo: confirmar com a equipe operação, acesso entre os dois lotes e
regra de borda; depois criar um protótipo de cálculo isolado com comparação
individual/bloco. Antes de qualquer nova interface, apresentar imagens
comparadas e obter aprovação específica. O bloqueio de envio registrado nesta
etapa foi resolvido posteriormente: a web r1 foi publicada. Isso não implantou
o modo bloco, que continua em estudo.
