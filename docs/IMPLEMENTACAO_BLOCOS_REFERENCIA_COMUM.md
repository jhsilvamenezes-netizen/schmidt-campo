# Implementação local: individual e bloco por referência comum

Registro histórico da r2. A revisão r3, suas correções, integração preparada
e testes estão em [Revisão e entrega r3](REVISAO_E_ENTREGA_BLOCOS_R3.md).

Entrega `1.31.0-r2-blocos-candidata`, em 09/11/2026, na branch
`codex/auditoria-evolucao-segura`. Implementação solicitada pelo proprietário
após as projeções. Não é publicação no Pages nem APK de distribuição.

## Comportamento implementado

O Plano mantém as informações essenciais do individual antes do novo seletor.
Em Planejamento, selecionar **Bloco por referência comum**, escolher os lotes,
**Preparar bloco** e **Usar bloco**. A visão conjunta mostra contornos, tiros,
pontos, espaçamento entre eixos, intervalos entre pontos e a menor distância
real de ponto à borda. Os botões de membros abrem o lote no mapa e no
monitoramento existentes. O botão no cabeçalho identifica o bloco ativo e
volta à etapa correta do planejamento.

São 16 grupos de referência comum, abrangendo 40 dos 51 lotes. Incluindo os
pares de cada grupo de três, o seletor oferece 40 opções. Os demais 11 lotes
continuam individuais; todos os 51 permanecem disponíveis no modo individual.
O catálogo exige mesma fazenda/referência, A absoluto a até 0,05 m (dados
embarcados arredondados) e eixo informado a até 0,05°. Não une lotes apenas
porque são próximos. Referências diferentes, como os dois pares da projeção
BB1/BB2/BC1/BC2, não são promovidas automaticamente a coordenadas iguais.

Cada bloco tem seus próprios parâmetros, ajustes, nomes e marcações. Na
primeira entrada suas coletas estão vazias. **Retomar** mantém as marcações
anteriores daquele mesmo bloco; voltar ao individual recupera seus mapas
originais. Atividades sobrepostas não são somadas nem sincronizadas como se
fossem uma única coleta. Um bloco ativo por vez evita aplicação parcial de
dois escopos.

O monitoramento usa a tela, a escolha do tiro e a marcação já existentes.
O GPX conjunto exporta pontos identificados por lote/ID e como simulados,
sem inventar rota de passagem entre bordas. A exportação antiga de plano
individual fica desabilitada dentro do bloco porque não transporta a origem
e a correção de grade comuns; exportar o backup completo ou o GPX do bloco.

O P6 conserva exatamente o plano e os valores anteriores. Sua observação
específica deixa de aparecer nesta candidata, conforme solicitado. O dado
bruto e os registros históricos da auditoria permanecem preservados.

## Geração e critérios

`src/application/block-planning.mjs` usa o motor real do aplicativo para
repartir novamente os pontos, em vez de só deslocar os pontos antigos do
ensaio anterior. Os membros usam a mesma origem absoluta, rumo e correção
UTM de grade. Cada lote continua recortado em sua própria geometria e conserva
o mínimo individual. O motor não pode substituir uma grade vazia por uma
linha central sem a fase comum.

A barra confirmada é de 36,48 m. A busca testa espaçamentos inteiros da barra
e fases discretas, incluindo os espaçamentos individuais; mantém as seis
melhores alternativas e uma por espaçamento para a etapa de redistribuição.
Não alega ótimo global. Ajustes manuais individuais válidos participam da
referência de cobertura, sem copiar suas coletas para o bloco. Um trajeto
importado ou ajuste inválido exige conferência e conserva o individual.

P95 e máximo são comparados por lote nos mesmos centros de células, com
passo por área/1.500 limitado a 15–150 m. Quando preciso, a busca acrescenta
pontos dentro do teto configurado e do orçamento limitado por lote. Mostra
esse acréscimo ao operador. Se algum lote ainda perder cobertura amostrada,
**Usar bloco fica desabilitado**, sem afirmar que o bloco seja impossível.
A tolerância relativa numérica é de 0,000001, não precisão de GPS.

No perfil inicial testado, os 16 grupos completos passam de 657 para 709
pontos. Os 52 adicionais preservam a comparação de cobertura amostrada;
isso não comprova menor caminhada ou ganho de tempo. Os 92 pontos dos
11 individuais restantes não são modificados. As 40 opções incluem membros
repetidos e não devem ser executadas simultaneamente como atividades distintas.

O parâmetro longitudinal de borda existente não é confundido com uma distância
normal mínima ao contorno. A interface mostra a menor distância medida,
incluindo furos; não impõe os 50 m do ensaio anterior como regra agronômica.
Conferir acesso, obstáculos, distância necessária da borda e orientação em
campo continua sendo responsabilidade da operação. O datum histórico não
foi homologado e não há cálculo de rota automática entre os lotes.

## Persistência e recuperação

O registro `planningBlocks`, schema `schmidt.blocks.v1`, fica dentro da chave
`monitoramento.v03`, já coberta pelo backup v2, hash, locks e journal atuais.
O estado canônico mantém `paramsByField`, `editsByField` e `monitor`
individuais na raiz; cada bloco guarda cópias próprias dessas três coleções.
Uma gravação síncrona salva o registro completo antes de ativá-lo em memória.
O serializador nunca grava os mapas do bloco como mapas individuais.

Falha de quota ao entrar preserva o individual. Falha ao sair mantém o bloco
aberto e suas coletas, sem fingir salvamento. A recarga abre o individual;
o bloco salvo pode ser retomado. Mudança da geometria/referência invalida sua
retomada e exige novo preparo. Backups legados sem `planningBlocks` continuam
válidos; registros novos são validados no exportador e importador.

O histórico legado de versões por lote não recebe revisões do bloco sob a
identidade individual. Parâmetros, ajustes e marcações do bloco são salvos
no registro próprio e no backup; não há ainda navegação de versões antigas
de bloco. O GPS é interrompido ao trocar o escopo para não misturar sessões.
Parâmetros de desenho ficam bloqueados enquanto o bloco está ativo para
preservar a grade comum; os controles individuais voltam ao sair.

## Verificação executada

- 16 testes Node: referências, subconjuntos, borda com furo, cancelamento,
  isolamento, quota de entrada/saída, invalidação e backup legado/novo.
- Geração pelo motor real das 40 opções: 5.957 grades de fase/espaçamento,
  além dos ensaios de quantidades na redistribuição.
- Conferência independente em Shapely/NumPy de 88 pares bloco/lote: mínimos,
  unicidade de pontos, pertencimento, recorte de trechos, eixos/fase absolutos,
  P95/máximo nos centros das células e distância real à borda.
- Teste do navegador compara exatamente os 51 planos individuais ao snapshot
  anterior e exercita preparar/aplicar, troca de membro, GPX, coleta real pela
  UI, backup com hash, restauração em perfil limpo e recarga offline.
- Nenhuma certificação de cobertura contínua, ensaio físico de GPS/Android,
  validação de acesso ou medição de tempo de campo foi realizada.

Os resultados de execução ficam em `audit/results/block-runtime/` (ignorados,
incluem coordenadas locais). A evidência agregada versionada não contém essas
coordenadas. Capturas comparadas e a candidata web ficam em
`/workspace/entregas-schmidt/1.31.0-r2-blocos-candidata/`.

## Reprodução, entrega e rollback

```sh
node --test audit/block-planning.test.mjs
node scripts/build-block-candidate.mjs
cd audit
node blocks-runtime-browser.mjs
.venv/bin/python validate-runtime-blocks.py
node blocks-ui-browser.mjs
```

O builder usa a fonte preservada e pontos de integração únicos, atualiza a
CSP e gera um worker de cache próprio com integridade. Escreve exclusivamente
na pasta da candidata, sem substituir `index.html`/`sw.js` da raiz. Não há nova
dependência de runtime. Testar servindo a pasta em origem local isolada; não
trocar o site publicado para experimentar.

Rollback de código: retirar estes módulos/builder da branch. Nenhuma mudança
foi aplicada aos dispositivos da equipe. Na candidata, voltar ao individual
mantém os mapas individuais; fazer backup completo antes de qualquer migração
futura. O Android permanece sem atualização distribuída por ausência de uma
chave privada de assinatura estável.
