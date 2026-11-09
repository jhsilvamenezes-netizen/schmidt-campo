# M1 — Preservação antes da troca de assinatura

Estado: plano executável em validação; **migração e distribuição bloqueadas**.
Nenhuma chave nova foi criada. Nenhuma instalação ou dado real foi alterado.

## Diagnóstico

`app/chave/schmidt-debug.keystore` foi introduzido no commit `a0be44c`
e está no histórico público. `app/preparar.sh` copiava essa chave para o perfil
Android de quem compila. Removê-la da versão candidata não revoga cópias e não
limpa o histórico. Não reescrever esse histórico como parte desta auditoria.

A candidata deixa de copiar a chave. Builds locais de debug, se executados,
usam a identidade de teste do ambiente e não servem como atualização/distribuição.
O APK existente e sua assinatura continuam intactos no GitHub Releases.

**Identidades diferentes constatadas em 08/11/2026:** o certificado público
extraído do APK 1.31.0 com `keytool -printcert -jarfile` tem SHA-256
`2E84866D96161191956B6C76FD6CC1F672C2BCA1EBD9B9695B734F1C766D9580`.
O certificado da chave histórica (blob `3226a61e133a3c8c411188ddfe4cb10814636cb3`)
tem SHA-256 `6762ED29B163CC9A8A822B544EDD5477D0810173C0DDC94735D64D369D4C03E7`.
Ambos são Android Debug, mas não são a mesma identidade. O motivo dessa
divergência não foi estabelecido. Não confundir hash do arquivo APK com hash do
certificado. Antes de migrar, inventariar as assinaturas das versões realmente
instaladas; nem reutilizar a chave pública garante atualização sobre o APK 1.31.0.
`keytool` aqui inspeciona o certificado JAR; verificação completa das assinaturas
Android v2/v3 com `apksigner` ainda está pendente.

## Ensaio de preservação (antes de qualquer desinstalação)

1. Em **cada origem separadamente** (PWA, navegador e APK), abrir Plano →
   Arquivos → Fazer cópia de segurança. Guardar o JSON fora do aparelho em
   armazenamento privado. Não anexar backups reais a Issues, PRs ou Actions.
2. Registrar versão, origem/aparelho, tamanho, SHA-256 externo do arquivo e
   contagens de parâmetros, ajustes, monitores, coletas, diário, imagens e versões.
   Exportar também lotes importados e planos individuais pelos controles existentes.
3. Em perfil descartável com a versão 1.31.0, abrir Restaurar de um arquivo,
   conferir a prévia e confirmar. Guardar a cópia anterior baixada pelo aplicativo.
4. Reabrir e exportar novamente. Comparar `dados`, `imagens` e `historico`,
   incluindo bytes de imagens, lotes importados, planos, coletas e diário.
   Comparar o conteúdo, pois data, manifesto e ordem podem variar.
5. Repetir em Android físico com o APK antigo e em ambiente isolado com a futura
   candidata. Confirmar compartilhamento de arquivos e importação entre origens.
   **O ensaio Chromium não substitui esse teste físico.**
6. Se faltar qualquer categoria, houver erro de armazenamento ou contagens
   divergentes, parar a migração. Manter a instalação antiga e suas cópias.

O backup atual `schmidt.backup.v2` inclui três chaves: `monitoramento.v03`,
`schmidt.v07.map.preferences`, `schmidt.lotes.importados`, imagens da base
IndexedDB `monitoramento-imagens` e histórico de `schmidt/versoes`.
Preferências auxiliares `schmidt.monitor.oculto`, `schmidt.v16.rigor`,
`schmidt.flow.step` e a data da última cópia não constam nele; registrar à parte.
O hash interno detecta corrupção acidental, não autentica autoria.
Exportação de imagens contém um `catch` que pode omitir imagens se IndexedDB
falhar; restauração escreve várias bases sem transação única. São riscos
preexistentes: exigir contagens verificadas e cópia anterior, sem prometer
restauração atômica nem perda zero. Correções dependem da fonte geradora.

## Nova identidade e gates futuros

Após validar o ensaio acima e obter aprovação específica do proprietário:

1. Gerar chave release privada fora do repositório; manter cópias cifradas e
   responsáveis definidos. Configurar GitHub Environment de produção com
   revisores, acesso restrito e secrets para keystore, alias e senhas. Nunca usar
   esses secrets em `pull_request` ou `pull_request_target` de código não revisado.
2. Implementar workflow separado, manual, sobre commit aprovado, com permissões
   mínimas. Testes devem passar antes de disponibilizar secrets. Não há workflow
   de produção habilitado nesta fase.
3. Fixar dependências/fontes do build e usar `assembleRelease`; validar com
   `apksigner verify --print-certs`, confrontando fingerprint esperada privada.
   Conferir applicationId `io.github.jhsilvamenezes.schmidtcampo` (config atual),
   versionName e versionCode via ferramenta Android.
4. Consultar o maior versionCode efetivamente distribuído, reservar código
   superior e impedir reutilização. `github.run_number` isolado não garante isso
   entre workflows. Registrar versão, commit, certificado e SHA-256 do APK.
5. Ensaiar instalação/restore em aparelho descartável. Assinatura nova **não
   garante instalação por cima**: tratar reinstalação como provável, sem mandar
   desinstalar até existir backup verificado fora do aparelho e aceite do risco.
6. Submeter evidências e APK para aprovação específica antes de merge, tag,
   Release, Pages ou distribuição. Não promover debug a `latest`.

## Retorno e limites

Antes de migrar, cancelar preserva integralmente a instalação antiga. Depois de
trocar a assinatura, retornar pode exigir outra reinstalação: preservar tanto o
backup anterior quanto o posterior e verificar compatibilidade antes de importar.
Não apagar dados, revogar/rotacionar identidades nem remover Releases nesta fase.
No código, o rollback é reverter apenas os commits desta branch; não reativar
publicação automática de debug em produção.
