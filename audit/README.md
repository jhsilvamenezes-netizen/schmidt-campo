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

`npm test` executa 13 contratos: dez arquivos preservados por SHA-256/tamanho,
contagem/proveniência dos lotes e barreiras de assinatura/publicação.
Não equivale a validar matematicamente os 51 polígonos.

O teste de navegador obtém os arquivos originais diretamente do commit imutável,
serve original e candidata em origens locais distintas e compara 20 estados
(cinco telas em quatro viewports) mais três cenários GPS em 390 px. Dados limpos,
lote inicial BD3, parâmetros padrão, pt-BR, UTC, escala 1 e data fixa. Nenhum CSS,
controle, texto ou região da tela é injetado/ocultado para passar no comparador.
Fontes/antialiasing podem variar por ambiente: compara-se no mesmo navegador.
O Chromium usa renderização por software e perfil de cor sRGB para reduzir ruído.
Aceita-se no máximo 20 pixels, cada canal com diferença de no máximo 1/255;
qualquer outra divergência interrompe o teste e exige inspeção manual.
Não atualizar o baseline nem ampliar a tolerância para aceitar mudanças visuais.

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
