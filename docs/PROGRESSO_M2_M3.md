# M2/M3 — Build protegido e validação espacial independente

08/11/2026 — branch de auditoria, PR #2. Interface congelada; sem merge,
alteração do Pages, assinatura, APK compilado/distribuído ou dados de aparelhos.

## Entrega das correções anteriores

O proprietário autorizou explicitamente o envio das correções locais ao mesmo
repositório público. A árvore de arquivos do commit local `ecd9e3d` foi conferida
e enviada sem diferenças em `cbb7b0cfe41f34b1e5234b01bbd582cab2b21634`.
A [CI #17](https://github.com/jhsilvamenezes-netizen/schmidt-campo/actions/runs/42493759891)
passou, incluindo preservação visual, contratos, backup/offline e os nove
cenários de aceite de persistência/GPS. O bloqueio de envio registrado na etapa
anterior foi resolvido pela autorização do proprietário. As evidências locais
anteriores são históricas; não são usadas para afirmar execução remota nova.

## M2 — Instalação determinística e preservação do projeto Android

- Acrescentado `app/package-lock.json` com versões e integridades da árvore
  completa. Instalação usa `npm ci --ignore-scripts`; não busca CLI por npx.
- `versionCode` é validado antes de gerar: inteiro decimal sem zero inicial,
  entre 1 e 2.100.000.000. O código 104 é só fixture do teste, não versão
  distribuída nem reserva de versionCode para produção.
- Lock de processo impede preparos simultâneos. `android/` ou `www/` existente,
  inclusive symlink pendente, causa recusa. O comando não apaga esses diretórios.
- Geração ocorre em staging próprio, limpo em falha. A instalação final não
  sobrescreve destinos. Caminhos Gradle são normalizados para `../node_modules`
  e verificados antes da movimentação; não ficam referências ao staging.
- A máscara de criação é fixada em `077`: saídas privadas do usuário, com
  permissões determinísticas em runners diferentes. A CI inicial detectou a
  diferença `0644`/`0600` causada pelo ambiente; o preparador foi corrigido em
  vez de remover ou afrouxar a verificação de modos.
- Preparação conserva CSP Android, permissões, ícones, splash, barras e recursos
  do preparador anterior. Nenhum layout nativo foi redesenhado.

### Dependências vulneráveis do CLI

A auditoria inicial do lockfile reportou cinco vulnerabilidades: três moderadas,
uma alta e uma crítica, transitivas às ferramentas de build. A ferramenta npm
sugeria troca de major do CLI/Capacitor. Preservamos as versões diretas existentes
de Capacitor 6 e dos cinco plugins nativos; atualizamos somente as ferramentas
transitivas com overrides fixados: `tar 7.5.22`, `glob 14.0.4`, `minimatch 11.0.5`.

`tar 7` expõe namespace sem o default esperado pelo CLI 6. O adaptador explícito
`app/cli-compat.cjs` fornece esse alias somente durante o build, sem alterar o
algoritmo de extração, a ponte web ou o código empacotado. Isso foi necessário:
o primeiro ensaio sem adaptador falhou; não foi considerado sucesso.
O adaptador também fixa `umask 077` para comandos como `cap sync` chamados fora
do preparador; assim a regra vale em todo o ensaio, inclusive com caller `022`.

`npm audit --audit-level=moderate --package-lock-only` passou com **zero
vulnerabilidades reportadas** na árvore nova na data do ensaio. Não significa
ausência de toda vulnerabilidade possível nem auditoria dos binários Android
ou das ferramentas Python. Atualizações futuras ainda exigem revalidação.

As versões foram consultadas no registro oficial npm. Exemplos dos avisos
verificados: [tar](https://github.com/advisories/GHSA-34x7-hfp2-rc4v),
[glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4),
[minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249).

### Prova de compatibilidade e limites

A referência foi gerada em diretório temporário pelo preparador anterior,
com a página corrigida atual e as dependências originais. O novo preparador,
com dependências corrigidas, gerou **63 arquivos com conteúdo e modos idênticos**.
O teste repete a verificação após `cap sync android`, verifica caminhos de
dependências e confirma recusa de uma segunda geração sobre o projeto.
`audit/android-baseline-v1_31.json` guarda hashes/modos, não os assets completos.

O preparador usa Linux/GNU (`flock`, `sed`, `mv -T -n`) e Node 22 ou 24. São os
ambientes suportados desta etapa. Não foi feita migração de Gradle, SDK ou
plugins, compilação/instalação do APK ou homologação visual no Android físico.
Lockfile determinístico não é promessa de APK reproduzível byte a byte: o build
nativo completo, Gradle/transitivos e assinatura permanecem em gates separados.

## M3 — Conferência com implementação independente

Foram fixadas ferramentas de auditoria Python separadas do aplicativo:
Shapely 2.1.2/GEOS 3.13.1 e pyproj 3.7.2/PROJ 9.5.1. A interpretação é explícita:
**EPSG:32723 corresponde a WGS84/UTM 23S**; não homologa automaticamente outro
datum, área oficial ou safra operacional.

O probe usa as APIs reais do bundle candidato para gerar os 51 cenários padrão,
áreas, projeção e exports. A verificação Python não reutiliza as rotinas do motor.

Resultado matemático nos dados públicos já existentes:

- 51 geometrias válidas no GEOS, sem reparo automático.
- 749 pontos de teste; nenhum fora do polígono pelo GEOS, com tolerância
  numérica de 1 micrômetro para fronteiras.
- Áreas planas e projeção coerentes com as bibliotecas independentes; diferenças
  numéricas menores que os limites de teste de 0,01 m² e 0,01 m.
- GPX/KML XML bem formados nos 51 lotes; GeoJSON e CSV também gerados pelas APIs
  existentes. Isso não valida todos os atributos, leitores de terceiros,
  compartilhamento nativo ou metodologia agronômica.
- Nenhum valor oficial/geométrico foi substituído e as áreas divergentes e seis
  alertas históricos seguem preservados.

### Anexo KML: revisão de origem ainda necessária

O KML do proprietário foi lido somente localmente, com parser protegido contra
entidades XML. Os 51 lotes foram identificados por `FARM_NAME`/`FIELD_NAME`.
Outras fazendas do arquivo foram excluídas da comparação e de qualquer evidência
pública. O anexo e os dados intermediários não são versionados nem enviados como
artefatos do Actions.

A conferência da origem detectou diferenças de contorno que **exigem revisão**.
Os resultados detalhados, nomes por lote, distâncias e hash do anexo ficam
somente em `audit/results/spatial-kml-private-report.json`, ignorado pelo Git.
Nenhuma divergência foi “corrigida” no mapa. O limiar de 0,05 m serve apenas para
sinalizar diferenças no ensaio, não é especificação de precisão do GPS nem
critério de aceitação agronômica/legal.

Para comparar componentes sobrepostos, a união ocorre só na cópia de auditoria
quando cada polígono-fonte é válido. Isso não modifica nem repara o dataset do
app ou o arquivo original. O comando com o anexo retorna código **2** quando a
origem requer revisão; esse resultado não foi anunciado como homologação.

A CI executa o ensaio independente nos dados públicos sem o anexo privado.
Passar esse gate não resolve diferenças de origem detectadas na comparação local.

## Reprodução

```sh
cd audit
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test:android
npx playwright install --with-deps chromium
npm run probe:spatial
python -m venv .venv
.venv/bin/python -m pip install -r requirements-spatial.txt
.venv/bin/python spatial-check.py
```

Com navegador já instalado, prefixar o probe com
`CHROMIUM_PATH=/usr/bin/chromium`. Para o anexo privado, acrescentar
`--kml /caminho/local/arquivo.kml` ao verificador. Não copiar o KML ou o arquivo
`spatial-runtime-private.json` para o repositório ou para artifacts públicos.

Os testes desta etapa incluem 14 contratos, 25 testes das correções e nove
testes de preparação Android; ensaios espaciais estão em comandos próprios.
Os 63 arquivos são verificados sem executar Gradle ou gerar APK. A CI foi
ampliada para repetir esses gates sem publicação.

## Pendências e sequência seguinte

M2/M3 avançaram, mas não estão encerrados. Continuam pendentes: fonte completa,
build Gradle/SDK e aparelho real, concorrência entre abas e todos os escritores
auxiliares, ciclo de atualização do service worker, causa das diferenças do KML,
GPS em campo, calibração e protocolo operacional, assinatura privada e migração.
Mudanças nos contornos ou apresentação continuam exigindo diagnóstico, imagens
de projeção, comparação e aprovação específica antes de implementação.

## Impacto e rollback

O HTML e service worker continuam exatamente os de `cbb7b0c`; o motor espacial,
CSS, mapas, dados e telas não foram alterados nesta etapa. Alterações do pacote
Android ficam em `engines`/`overrides`; dependências diretas e plugins foram
conferidos contra a referência. O projeto nativo completo ainda é gerado, com
recusa de sobrescrita, e não foi indevidamente marcado como fonte recuperada.

Reverter o commit desta etapa restaura o preparador/lockfiles/testes anteriores.
Projetos temporários usados para comparação são separados. Os diretórios de
ensaio antigos no workspace foram movidos para backup privado antes de gerar
a versão corrigida; nenhum conteúdo real de usuário foi apagado.
