# Auditoria de preservação M0/M1

Ferramentas isoladas do PWA/APK. Não são o projeto-fonte gerador.

```sh
cd audit
npm ci --ignore-scripts --no-audit --no-fund
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

Com Chromium já instalado, usar `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`.
Para diagnosticar apenas backup/offline: `node browser.mjs --functional`.
O servidor escuta somente em loopback, em portas temporárias; perfis são descartáveis.
O checkout precisa conter o commit de referência de `baseline.json` (`fetch-depth: 0`
na CI). Nenhum servidor externo, APK ou dado de usuário é necessário ao teste.

`npm test` executa 15 contratos, 28 testes de correção, quatro do resumo operacional e três de apresentação: sete arquivos preservados
por SHA-256/tamanho, build determinístico do HTML/worker, apresentação/dados
comparados ao original, CSP e barreiras de assinatura/publicação, além das
regressões de backup/GPS.
O pacote Android agora preserva as versões diretas e recebe exceções explícitas
somente para ferramentas de build, com paridade nativa e auditoria; seu JSON
completo deixa de ser um dos arquivos guardados por igualdade de bytes.
Não equivale a validar matematicamente os 51 polígonos.

O teste de navegador obtém os arquivos originais diretamente do commit imutável,
serve original e candidata em origens locais distintas e compara 20 estados
(cinco telas em quatro viewports) mais três cenários GPS em 390 px. Dados limpos,
lote inicial BD3, parâmetros padrão, pt-BR, UTC e data fixa. Escala 1, exceto
Plano em escala 2 tanto na referência quanto na candidata. No Chromium 141,
a mudança da altura fracionária do conteúdo rolável provoca diferenças de
rasterização 1x na navegação intacta; a captura 2x elimina esse artefato.
Nenhum CSS, controle ou texto é injetado/ocultado para passar no comparador.
Desde a autorização visual de 09/11/2026, somente o interior da etapa inicial
de Plano e suas margens pertence ao escopo de mudança: ali as diferenças são
contadas, não comparadas por igualdade. O mapa, cabeçalho e navegação acima da
etapa continuam comparados por pixels. As outras 19 capturas são integrais.
As quatro referências de Plano continuam vindo do commit original, sem substituição.
Fontes/antialiasing podem variar por ambiente: compara-se no mesmo navegador.
O Chromium usa renderização por software e perfil de cor sRGB para reduzir ruído.
Aceita-se no máximo 20 pixels, cada canal com diferença de no máximo 1/255;
qualquer outra divergência interrompe o teste e exige inspeção manual.
Não atualizar o baseline nem ampliar a tolerância para aceitar mudanças visuais.

`npm run test:plan` verifica cinco larguras (360, 390, 412, 768 e 1280 px),
controle por teclado, ajuda, validação, steppers, equipe reduzida, barra e
densidade personalizadas, aplicação de alternativa e avanço para Diagnóstico.
Compara também seis estados reais do cenário e dos dados persistidos com a
versão original, incluindo recarga. Capturas e relatório ficam somente em
`results/operational-plan/`. Não substitui avaliação com operadores ou Android físico.

`results/` contém pares PNG, fingerprints e resultado JSON. É ignorado pelo Git
e **não é enviado como artefato público pela CI**, para evitar ampliar exposição
de dados do mapa. Guardar evidências reais em armazenamento privado. Os dados
de ensaio são sintéticos; a base de lotes é lida do próprio bundle, sem duplicá-la
no repositório. `report.json` só marca `passed` após todos os cenários passarem.

Backup usa os controles reais de exportação/importação, mede hash, corrupção,
cancelamento, cópia anterior, restauração em outro perfil e reabertura.
Imagens/histórico são semeados nas bases reais IndexedDB apenas no perfil de
teste. A navegação à etapa Arquivos usa a API já existente; este ensaio não testa
todos os cliques intermediários. A comparação confirma que as imagens e registros
do ensaio sobrevivem; não garante comportamento diante de falta de espaço,
base corrompida, falha de hardware ou migração Android.

O service worker é bloqueado nas capturas para controlar o estado; há um teste
separado com o worker real habilitado, reabertura offline e sentinela no
localStorage. Atualização/rollback do worker entre versões permanece pendente.
Mocks GPS usam posição 0,0 e precisão 1000 m, permissão negada ou indisponibilidade;
não são teste físico nem homologação operacional.

## Estudo de arquitetura e falhas

`CHROMIUM_PATH=/usr/bin/chromium npm run study` executa
`architecture-study.mjs --baseline` contra o bundle original imutável. Inventaria módulos, caracteriza
cenários padrão dos 51 lotes e reproduz falhas conhecidas de backup/restauração
e timestamp GPS, apenas em perfis descartáveis. Observa também a política do
worker em sandbox JavaScript. Evidência local em `results/architecture-report.json`.

É ferramenta de diagnóstico: algumas asserções comprovam comportamentos
inadequados do produto. Não faz parte do gate de aceite da CI e não significa
que os problemas foram corrigidos. Quando corrigidos, os cenários deverão ser
convertidos em testes que exijam preservação segura. Detalhes e prioridades em
`docs/ESTUDO_ARQUITETURA_V1_31.md`. Nenhuma coordenada é escrita no relatório.

## Aceite da candidata corrigida

`CHROMIUM_PATH=/usr/bin/chromium npm run test:corrections` executa os cenários
seguros contra a candidata, incluindo IndexedDB real, journal, rollback,
reabertura, legado e isolamento de sessões GPS. Foi adicionado à CI de validação.
`corrections-report.json` é local e ignorado; não publica cópias/imagens.
O diagnóstico histórico permanece separado. Para regenerar o artefato:
`node scripts/build-preserved.mjs` a partir da raiz. Fonte original completa
ainda ausente; novas fontes e integração parcial descritas em `src/README.md`.

## Build Android e conferência espacial independente

`npm run test:android` testa versionCode, diretórios/symlinks existentes, geração
e sync reais com comparação de 63 arquivos/modos. Instala dependências de build
em diretórios temporários; requer Linux/GNU, Node 22 ou 24 e acesso ao npm/cache.
Não compila ou distribui APK. `app/preparar.sh` recusa sobrescrever projetos.

`npm run probe:spatial` escreve `results/spatial-runtime-private.json` com dados
intermediários locais. Depois, `python spatial-check.py` compara com GEOS/PROJ.
Instalação isolada: `python -m venv .venv` e
`.venv/bin/python -m pip install -r requirements-spatial.txt`. As dependências são
somente de auditoria. A CI usa Python 3.12 e versões fixadas dessas ferramentas.

O argumento `--kml` é opcional, para arquivo local privado; diferenças de origem
produzem status de revisão e código 2 em `spatial-kml-private-report.json`.
Não anexar esse arquivo, o KML ou coordenadas intermediárias a artefatos públicos.
A matemática pode passar e a comparação de origem permanecer pendente.

## Inventário amostral de leitura

`node readability-inventory.mjs` coleta estilos e contraste de pares de texto/fundo
simples no Plano, em normal/Sol, e ensaia entrada inválida, vírgula decimal e
uma sequência rápida de densidades em perfis descartáveis. Não modifica o app.
É diagnóstico, não gate completo de acessibilidade: status indica execução do
inventário/ensaios, e os pares abaixo do limiar são reportados separadamente.
Não mede luz solar real, todas as telas ou a área acionável completa dos rótulos.
Relatório local em `results/readability-private.json`; critérios e prioridades
em `docs/REFINAMENTO_INTEGRADO_SITE_APP.md`.

O aceite atual de Plano também exige valores de distância completos na abertura
em cinco viewports, paridade de seis estados com o original, troca de lote e
Desfazer real. Em 1280 px, compara por pixels tudo fora do recorte autorizado
do painel, em escala 2x; continua usando tolerância 20 pixels/delta 1.

## Atualização entre versões

`npm run test:upgrade` executa `worker-upgrade-browser.mjs` contra a versão
publicada e a candidata na mesma origem. Ensaios: rejeitar HTML antigo no cache
novo, esperar duas abas antigas fecharem, preservar um cache não relacionado,
ativar e reabrir offline, comparar backup com três chaves/coleta/imagem/histórico
e conferir a barra padrão 36,48 m nos 51 lotes. É Chromium, sem dispositivo físico.
O worker agora tem fonte própria e sua política autorizada difere do baseline;
a igualdade do HTML/CSS/dados estáticos continua protegida pelos contratos.
# Estudo de blocos e bordas

`block-study.py` confere BB1/BC1 em referencial comum e mede distâncias de
pontos às bordas, sem alterar os dados. Requer o probe espacial da candidata.
`block_geometry_test.py` tem 11 testes sintéticos; `border-policy-browser.mjs`
exercita cinco casos do módulo real de distribuição. São estudos isolados,
não novos modos de planejamento. Ver `docs/ESTUDO_BLOCOS_E_BORDAS.md`.

O refinamento posterior acrescentou `block_constraints.py` e
`block_constraints_test.py`, totalizando 28 testes de estudo com os 11 de
geometria. `block-safety-study.py` confere os snapshots atuais dos 51 lotes e
os conflitos de recuo no par BB1/BC1. `block-projection-reference.mjs` captura
as referências reais para a projeção; as capturas permanecem em results/.
Ver `docs/PROPOSTA_BLOCOS_BORDAS_COMPARATIVO.md`. Nada é importado pelo runtime.

## Revisão dos parâmetros

`npm run test:parameters` executa 13 testes da proposta isolada de validação
estrita. `parameter-review-browser.mjs` inventaria o catálogo do módulo real e
reproduz 16 casos, verificando que cenário ativo e localStorage não mudam.
`parameter-schema-reference.json` é uma referência sem dados geográficos,
vinculada ao hash da candidata; não é um novo arquivo de configuração do app.
Ver `docs/REVISAO_PARAMETROS_PLANO_BLOCOS.md` para a matriz dos 37 parâmetros,
limites, dependências e separação de equipe, borda e bloco. Nada foi integrado
ao aplicativo ou ao workflow de publicação.
