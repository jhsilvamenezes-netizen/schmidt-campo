# Arquitetura de planejamento individual e tiros em bloco

Estudo de implementação, 09/11/2026. Sem integração ao aplicativo.
Objetivo: manter o lote sozinho disponível e permitir bloco quando houver
benefício demonstrado. Bloco é um plano que referencia lotes, não uma fusão
permanente dos cadastros. Não se promete economia antes de gerar e comparar rotas.

## Decisões que orientam a implementação

| Decisão | Consequência |
| --- | --- |
| Individual permanece disponível | Usar o motor e os planos individuais existentes, inclusive em lotes membros de blocos. |
| Bloco é opcional e separado | Simular, recalcular ou descartar não sobrescreve planos individuais nem coletas. |
| Tiros compartilham uma grade física | Mesmos rumo, origem, fase e espaçamento. Mesmo rumo em duas origens locais não basta. |
| Cada trecho/ponto tem um lote | Manter mínimos, regra de área, identidade, histórico e exportação por lote. |
| Transferência não é tiro amostral | Passagem entre lotes exige caminho permitido; não preencher a lacuna com área artificial. |
| Bloco pode ser pior | Comparar e permitir escolher individual; não aplicar bloco automaticamente. |
| Simulação não inicia execução | Ativar somente uma revisão validada, salva e escolhida explicitamente. |

Piloto: amostragem em retas por espaçamento, inicialmente BB1/BC1. Manter todos
os modos individuais atuais. Circular/importado, quantidade de tiros no conjunto
e amostragem direcionada em bloco exigem regras próprias antes de habilitação.

## Separar planejamento, consulta e execução

- **Plano individual:** parâmetros e desenho próprios do lote, preservados.
- **Plano de bloco:** entidade nova com membros e versões de origem. Um lote
  pode pertencer a vários rascunhos sem perder seu plano individual.
- **Consulta de um membro:** visualizar BB1 dentro do bloco não converte o
  plano para individual nem inicia outra atividade.
- **Execução:** referencia campanha e revisão imutável de um plano. Editar
  rascunho, navegar ou mudar seleção não altera a execução em andamento.

| Ação | Resultado esperado |
| --- | --- |
| Abrir BB1 sozinho | Carrega seu plano individual; não recalcula BC1. |
| Simular BB1 + BC1 | Cria candidato separado, conservando ambos os individuais. |
| Descartar bloco | Descarta somente o rascunho, sem apagar planos/coletas. |
| Voltar ao individual | Continua usando o plano preservado, sem ter que reconstruí-lo. |
| Alterar equipe, borda, acesso ou geometria | Invalida o candidato afetado e sua comparação; não muda uma execução silenciosamente. |

Não copiar marcações automaticamente entre planos por coincidência de posição.
Não assumir compartilhamento de dados entre PWA, APK, aparelhos ou campanhas.

## Componentes e contratos

| Componente futuro | Responsabilidade / limite |
| --- | --- |
| `PlanningRequest` | Congelar escopo, referências e condições de comparação. Contrato isolado já testado em audit/. |
| `FieldSnapshotProvider` | Ler geometria, regra e plano individual efetivamente em uso, sem salvar. |
| `IndividualPlannerAdapter` | Despachar ao motor existente; não mudar comportamento para acomodar bloco. |
| `SharedGridGenerator` | Gerar linhas comuns em referencial métrico; ainda não implementado. |
| `FieldClipper` | Recortar por lote, preservando furos/componentes/separações. |
| `PerFieldAllocator` | Atender o mínimo individual e validar cobertura por lote. |
| `ConstraintValidator` | Conferir pontos e restrições após geração, otimização, edição e importação. |
| `AccessGraph` | Ligações, sentidos e condições; teste de alcançabilidade não valida a polilinha real. |
| `TeamRoutePlanner` | Roteiro completo e distribuição sem duplicar tarefas; ainda não implementado. |
| `PlanComparator` | Comparar esforço completo sob o mesmo contexto; não inferir tempo economizado. |
| `PlanRepository` / backup | Revisões, execução e restauração integral; não persistir antes de especificar migração. |

O request guarda escopo, equipe, modalidade, partida/chegada, revisão da operação
e dos acessos. Para cada lote: chave, versões de geometria/parâmetros/regra,
mínimo e recuo exigido ou `null` quando indefinido. Versões devem derivar de
snapshots reais; não são rótulos digitados pelo usuário para certificar conteúdo.
Referências de partida/chegada devem representar também condições de cada pessoa.

A chave canônica de comparação não depende da ordem da seleção. Mudanças em
fontes, equipe, operação, recuo ou acessos a invalidam. Essa chave não é hash de
segurança e não prova validade geométrica ou operacional.

Saída futura do gerador:

```text
PlanBundle
  planId, revision, campaignId, schemaVersion, engineVersion
  scope, samplingMode, sourceComparisonKey
  fieldRefs[]       versões exatas e mínimos individuais
  commonGrid?       CRS, origem, rumo, fase, espaçamento e proveniência
  segments[]        id, gridLineId, fieldKey, componentId, geometria
  samples[]         id, fieldKey, segmentId, posição e origem
  transfers[]       caminho permitido, sentido, revisão e distância
  assignments[]     pessoa, sequência, pontos e transferências
  validation        conflitos por lote e verificações executadas
  metrics           por lote, bloco e pessoa; distâncias efetivas
```

IDs são associados a plano/revisão e lote: P1 de BB1 não é P1 de BC1. Trechos
da mesma linha em lotes diferentes têm `gridLineId` comum e identidades próprias.
Observações referenciam campanha, plano/revisão, lote e ponto. Dados legados
permanecem associados ao plano legado; transportar coleta para revisão nova
exige correspondência explícita, sem deduzir pela proximidade espacial.

## Algoritmo da grade comum

1. Congelar os planos individuais efetivamente usados e mínimos da regra por
   lote. Não substituir áreas oficiais por geométricas nem parâmetros por defaults.
2. Confirmar compatibilidade da operação atual; variedade histórica não basta.
3. Transportar cópias das geometrias locais para origem métrica comum e
   determinística. Hoje a base usa UTM 23S; não aplicar esse CRS a bases futuras
   incompatíveis sem transformação verificada.
4. Fixar rumo, fase e espaçamento com proveniência. Para eixo θ a partir do
   Norte: `u=(sin θ, cos θ)`, normal `n=(cos θ, −sin θ)`, linhas
   `n·(p−origem)=fase+k×espaçamento`. Conferir convenção/correção de grade contra
   o motor atual, evitando aplicar a correção duas vezes.
5. Recortar cada linha em cada lote original. Preservar furos/componentes e a
   lacuna aproximada de 2,81 m entre BB1 e BC1; não inventar passagem com buffer,
   retângulo ou envoltória convexa.
6. Determinar intervalos admissíveis para pontos. Margem ao longo do tiro não
   substitui menor distância à divisa. Offset/erosão precisa de testes para
   furos, fragmentação e área estreita; não reparar limites silenciosamente.
7. Alocar por lote, conferindo mínimo e cobertura. Falta em um lote não pode
   ser compensada pela sobra em outro. Se não couber, devolver conflito.
8. Buscar alternativas dentro dos limites, com orçamento de candidatos/tempo
   e cancelamento. Revalidar após deslocamentos, otimização, edição e importação.
9. Construir e validar transferências, roteiro completo e distribuição da equipe.
10. Comparar com o conjunto dos planos individuais no mesmo contexto.

Não chamar de tiros em bloco a simples execução de `buildScenario` duas vezes
com o mesmo rumo. Se for útil organizar apenas a ordem dos planos individuais,
essa alternativa deve ter escopo próprio, sem se apresentar como grade comum.

A barra de referência é 36,48 m. Espaçamento incompatível com alinhamento à
barra exige conflito; meia barra não vira recuo dos pontos automaticamente.
O estudo não define recuo agronômico/legal ou envelope de pulverização.

## Acessos e conectividade

Cada ligação tem ID, lote de origem/destino, sentido, estado pendente/confirmado,
revisão do caminho e distância. Uma ligação confirmada exige respaldo de campo
e validação geométrica; apenas preencher uma referência não realiza essa prova.

- Pendência não cria conexão pela proximidade dos polígonos.
- Uma passagem entre dois lotes não libera um terceiro.
- Passagem só de ida não atende um roteiro que precise voltar.
- Alcançar todos a partir do início é pré-condição, não prova de roteiro que
  visite todos: A→B e A→C sem retorno é um contraexemplo.
- Transferências podem sair da área amostral somente em caminhos permitidos.
- Furos e componentes dentro do mesmo lote também exigem rotas internas;
  conectividade entre lotes não resolve esses obstáculos.

## Comparação honesta do rendimento

Comparar o conjunto dos lotes feitos individualmente com o mesmo conjunto em
bloco. Fixar equipe, campanha, modalidade, partida/chegada por pessoa, acessos,
regras de cobertura/densidade/recuo e versões das fontes. Incluir na alternativa
individual os deslocamentos realmente necessários, sem omitir ou multiplicar viagens.

```text
distância total = caminhada nos trechos amostrais
               + transferências entre trechos do mesmo lote
               + transferências entre lotes
               + aproximação e retorno definidos para a atividade
```

Comparar também maior percurso por pessoa, número de amostras por lote,
cobertura, conflitos e manobras. Mais amostras podem aumentar trabalho mesmo
com menor caminhada. Menos metros totais podem sobrecarregar uma pessoa.
Distâncias faltantes, cobertura rejeitada, mínimos não atendidos, rota não
validada ou contexto obsoleto impedem ordenar alternativas por ganho.

Os estados de validação precisam vir dos avaliadores sobre o snapshot atual;
não confiar em booleanos de um arquivo importado. Importar ou editar um plano
exige recalcular as verificações antes de compará-lo ou permitir sua execução.

O comparador reporta diferenças sem recomendar bloco automaticamente. Não
converte metros em economia de tempo. Estimativas futuras exigem hipóteses de
velocidade, tempo de coleta, pausas, equipamento e transferências; ganho real
exige ensaio comparável com a equipe. Cobertura deve ser avaliada por lote;
P95 global sozinho pode esconder um canto sem amostra.

## Estados e persistência

Fluxo proposto: **rascunho → requisitos conferidos → calculando → candidato →
validado/comparável → aplicado → execução**. Pendências/conflitos retornam para
revisão; mudança de fontes torna candidato/comparação obsoletos. Cancelamento ou
erro preserva o plano ativo anterior. Consulta e edição de rascunho não trocam
o escopo de uma execução já iniciada.

O backup atual é `schmidt.backup.v2`, com três chaves e bases de imagens/histórico.
Não criar chave/store de bloco que ele ignore. Antes de persistir, especificar
formato novo, manifesto/hash, validação, journal/rollback, locks e leitura de
backups anteriores. O schema final ainda não foi implementado.

Não aplicar metade de um bloco se salvar um membro falhar. Testar quota,
interrupção, referências faltantes, restauração e upgrade de IndexedDB com abas
abertas. Excluir rascunho não remove fotos/histórico de uma execução. Na primeira
fase o protótipo permanece em memória/arquivos de ensaio, sem gravar no app.

## Marcos de implementação e critérios de aceite

| Marco | Entrega | Aceite |
| --- | --- | --- |
| B0 — Contratos | Escopos, snapshots, comparação e grafo | Individual preservado; testes de contratos. Parcialmente executado neste estudo. |
| B1 — Grade comum isolada | Gerador sem UI/storage, BB1/BC1 e geometrias sintéticas | Rumo/fase comuns; recorte, recuo e mínimo por lote; nenhum ponto fora. |
| B2 — Percurso e equipe | Rotas e ligações permitidas | Caminho completo, sentidos/retorno e obstáculos; nenhuma tarefa duplicada. |
| B3 — Comparação | Individual versus bloco nas mesmas condições | Cobertura por lote e todos os componentes de esforço; bloco pode perder. |
| B4 — Persistência | Plano/revisão/execução e backup | Migração, restore, rollback e concorrência sem perder dados legados. |
| B5 — Piloto visual | Projeções atualizadas e integração aprovada em branch | Aprovação específica, cinco larguras e regressão das telas protegidas. |
| B6 — Campo | Ensaio assistido e decisão de liberação | Acesso, orientação, coleta, tempo/esforço e retorno em aparelho real. |

Falhas nos marcos do bloco mantêm o individual utilizável. Não implementar UI
de execução antes de B1–B4. Limitar candidatos/tempo e medir RAM/cancelamento
antes de ampliar de dois para mais lotes. Evitar refatoração geral do minificado;
usar adaptadores nas fronteiras das fontes parcialmente reconstruídas.

## Evidência executada e limites

**14 testes do contrato isolado passaram**: coexistência de escopos, preservação
de entradas, reordenação, invalidação, recuo indefinido, acesso pendente, terceiro
lote, sentidos/retorno, limites da alcançabilidade, comparação completa,
sobrecarga por pessoa, dados insuficientes e aumento de amostras. Valores de
distância desses testes são sintéticos; não medem ganho de BB1/BC1.

Ainda necessários no gerador/roteador: invariância de origem, fase comum em
origens distintas, furos/múltiplos componentes, faixa eliminada por recuo,
contato pontual, borda inclinada, rotas sem volta, bloqueio de acesso e cancelamento.
Quando integrar, repetir a paridade individual e os testes dos 51 lotes.

O contrato não calcula hashes do conteúdo referenciado, cobertura ou geometria
das ligações. Gerador conjunto, roteador, persistência e UI **não estão prontos**.
Nenhum módulo novo é importado por `src/` ou pelo build do site.

Reprodução em `audit/`: `npm run test:planning-contract`.
O runtime publicado 1.31.0-r1 e os pacotes existentes permanecem intactos.
