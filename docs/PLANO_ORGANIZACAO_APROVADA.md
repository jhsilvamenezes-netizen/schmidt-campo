# Organização aprovada do Plano — 09/11/2026

O proprietário autorizou a organização da etapa inicial de Plano depois das
projeções comparadas com a tela original. O aceite e o escopo estão em
`audit/visual-approval-2026-11-09.json` e na exceção de `AGENTS.md`.
Essa autorização não estende o escopo às outras telas nem à publicação.

## Resultado

Hectares por ponto e pessoas aparecem antes da recomendação, lado a lado,
inclusive na coluna estreita do desktop e em 360 px. Os controles são os nós
originais, com os mesmos eventos, steppers, ajuda e validações.

Quantidades, mínimo por área e distâncias transversais/longitudinais aparecem
juntos e vêm do **cenário ativo**, usando `malhaDoPlano`/`faixa` existentes.
O desenho recolhido é explicitamente identificado como **recomendado**:
escolher outra alternativa não deve fazer o resumo exibir números da sugestão.
Nenhum método, mínimo, distribuição ou parâmetro é recalculado pelo adaptador.

Ajustes de barra/equipe e explicações continuam disponíveis em detalhes nativos.
A informação de calibração permanece perceptível no título recolhido; a origem
é o indicador existente, sem inferir calibração física. Erros de validação
abrem os detalhes. Quando pessoas e tiros diferem, uma nota pede conferência
da divisão/percurso, sem reduzir pontos ou forçar um tiro por pessoa.

O campo de origem/áreas/rumo permanece acessível, assim como comparação,
aplicação explícita de alternativas e acesso ao desenho/áreas no mapa.
As setas dos detalhes usam o estilo já existente; cores usam os tokens do app,
inclusive no modo Sol. Nenhuma dependência de execução foi adicionada.

## Limites técnicos

`src/application/operational-summary.mjs` é uma leitura sem escrita do cenário.
`src/ui/operational-plan.mjs` concentra a movimentação de nós e o CSS,
limitado a `#param-stage-inicio`. A montagem ocorre depois da inicialização
legada; se faltar uma porta essencial, a organização original permanece.

O builder integra esses módulos ao artefato original por âncora única e
recalcula hashes CSP/cache, conservando a política de segurança, os datasets e
os blocos estáticos. A igualdade desses blocos **não significa igualdade da
aparência em execução**: Plano tem a mudança aprovada. O gerador original
completo continua ausente; não foi reescrito o motor minificado.

A recomendação pode renderizar novamente seu conteúdo; um observador limitado
recoloca somente os detalhes de apresentação. Os eventos continuam delegados
à raiz original. Atualizações do resumo são agrupadas por quadro, sem gravar
armazenamento nem mudar o schema de backup.

## Verificação e reprodução

```sh
node scripts/build-preserved.mjs --check
npm test --prefix audit
npm run test:plan --prefix audit
npm run test:browser --prefix audit
npm run test:corrections --prefix audit
npm run test:sessions --prefix audit
npm run test:android --prefix audit
npm run probe:spatial --prefix audit
# Em audit, com o ambiente Python documentado:
.venv/bin/python -m unittest geometry_diagnostics_test.py
.venv/bin/python spatial-check.py
```

Resultados agregados em `audit/operational-plan-evidence-2026-11-09.json`.
No aceite local: 47 testes de contrato/módulo, 23 comparações visuais,
cinco larguras do Plano, nove grupos de backup/GPS, oito cenários entre abas,
nove testes Android com paridade de 63 arquivos e quatro diagnósticos Python
passaram. GEOS/PROJ confirmou 51 geometrias válidas e 749 pontos internos;
os exports dos 51 cenários foram gerados. Vinte execuções de desempenho
foram medidas contra `8232d79`, em CPU 1x/4x, sem afirmar ganho estatístico.
O npm audit do lock Android retornou zero vulnerabilidades.

A CI inclui o aceite novo sem receber capacidade de publicação.
O aceite de Plano compara seis estados reais de cenário/estado persistido
com os bytes originais: inicial, equipe reduzida, barra personalizada,
densidade alterada, alternativa aplicada e recarga.

As 23 capturas originais continuam derivadas do commit imutável. Nas quatro de
Plano, só o interior da etapa inicial e suas margens é região aprovada; mapa,
cabeçalho e navegação continuam comparados. As outras 19 são comparadas por
inteiro. A tolerância segue 20 pixels e delta máximo 1/255. Plano usa escala
2x em ambas as versões: em 1x o Chromium 141 apresentou diferença de
rasterização na navegação apesar de suas posições/fontes/estilos idênticos.
Isso foi diagnosticado antes do aceite, sem editar CSS da referência.
Há pequeno ruído de antialiasing intermitente em 768 px; os testes não passam
se ultrapassar a tolerância. Não se substituem os originais pela candidata.

Capturas reais locais, ignoradas pelo Git:

- `audit/results/390-plano-original.png` e `390-plano-candidata.png`:
  comparação em 390x844, escala 2x, mesmo estado inicial.
- `audit/results/operational-plan/360-default.png`, `390-default.png`,
  `390-crew-one.png`, `390-custom.png` e `1280-default.png`: estados de aceite.

As projeções anteriores eram ilustrativas; estas capturas vêm do código real.
Não são enviadas ao repositório público nem como artefatos da CI.

## Pendências e reversão

Em celulares pequenos, as distâncias podem exigir rolar o painel. Não se afirma
que todos os controles cabem simultaneamente na primeira tela. O botão Ampliar
continua o existente. A organização precisa de avaliação com operadores e de
ensaio em aparelho/Android físico; teclado Chromium não equivale a certificação
WCAG ou teste com leitor de tela. GPS/campo e homologação dos dados permanecem
pendentes conforme os protocolos anteriores.

A versão publicada permanece intacta. O retorno à organização anterior pode
ser feito por um novo commit revertendo esta etapa na branch, conservando as
correções de dados anteriores. Não existe migração de dados desta etapa.
Uma eventual implantação e seu rollback/cache precisam de autorização e
validação próprias; não confundir o teste de reabertura offline com validação
de atualização do worker em produção. Sem merge, Pages, Release ou APK novo.

## Entrega local e bloqueio de envio

A implementação foi registrada localmente em `b20c3dc`. A revisão automática
recusou a criação do blob HTML no GitHub, exigindo autorização explícita para
o payload com dados agrícolas/coordenadas e o destino específico. A autorização
anterior registrada em `docs/PROGRESSO_M2_M3.md` foi considerada insuficiente
pelo revisor automático nesta tentativa.

Antes de repetir, comprovou-se igualdade byte a byte dos três scripts de dados
com `e779f28`. Remover apenas os dois módulos de apresentação e a chamada
instaladora, normalizando CSP, reproduz exatamente o HTML anterior da branch.
Nenhum dado de anexo privado ou captura seria enviado. A segunda tentativa
continuou recusada; não se usou outro mecanismo para contornar a revisão.

O código e as evidências permanecem locais e revisáveis. A branch remota segue
em `e779f28`, o PR #2 não recebeu esta implementação e não houve nova execução
remota de CI para ela. As validações acima são locais. Aguardando autorização
explícita para enviar o HTML corrigido ao mesmo repositório público, somente
na branch de auditoria. Não equivale a autorizar merge ou publicação.

## Autoanálise posterior solicitada pelo proprietário

[AUTOANALISE_DIDATICA_PLANO.md](AUTOANALISE_DIDATICA_PLANO.md) confronta a
candidata real com a leitura de primeiro uso, reconhecendo limites da própria
proposta: distâncias abaixo da primeira dobra, responsabilidade da equipe,
ajustes personalizados recolhidos e distinção entre cenário ativo e recomendado.
É revisão heurística documentada, sem mudanças adicionais de execução e sem
confundir testes automatizados com sessões já realizadas com operadores.
