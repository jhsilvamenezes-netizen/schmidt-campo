#!/usr/bin/env bash
# Monta o projeto Android a partir do index.html da raiz (rodado pelo GitHub Actions; dá para rodar local com Android SDK).
set -euo pipefail
# Saídas privadas e determinísticas, independentemente do umask do runner.
umask 077
cd "$(dirname "$0")"
APP_SOURCE_DIR="$PWD"
VERSAO_CODIGO="${1:-1}"
if [[ ! "$VERSAO_CODIGO" =~ ^[1-9][0-9]*$ ]] || (( ${#VERSAO_CODIGO} > 10 )) || (( VERSAO_CODIGO > 2100000000 )); then
  echo "versionCode inválido: use inteiro de 1 a 2100000000." >&2
  exit 2
fi
# Um preparo nunca apaga um projeto nativo nem assets existentes.
exec 9> .preparar.lock
flock -n 9 || { echo "Já existe uma preparação Android em andamento." >&2; exit 2; }
if [[ -e android || -L android || -e www || -L www ]]; then
  echo "Preparo recusado: android/ ou www/ já existe. Preserve/revise esses diretórios antes de uma nova geração." >&2
  exit 2
fi
test -f package-lock.json
npm ci --ignore-scripts --no-audit --no-fund
APP_BUILD_STAGE="$(mktemp -d "${TMPDIR:-/tmp}/schmidt-android.XXXXXXXX")"
trap 'rm -rf -- "$APP_BUILD_STAGE"' EXIT
cp package.json package-lock.json capacitor.config.json "$APP_BUILD_STAGE/"
ln -s "$APP_SOURCE_DIR/node_modules" "$APP_BUILD_STAGE/node_modules"
cd "$APP_BUILD_STAGE"
mkdir -p www
# No app, a página não precisa do service worker (os arquivos já estão no aparelho): tira a marca da versão web.
# Política de segurança (CSP): o Capacitor injeta o próprio script de ponte na página; com as assinaturas (hashes)
# da versão web, o Android bloquearia essa ponte (sem salvar/compartilhar, sem botão Voltar). No app, que só abre
# este arquivo local, os scripts da própria página são liberados ('self' 'unsafe-inline'); o resto da CSP continua.
sed -e 's#<meta name="schmidt-web" content="1">##' -e 's#<link rel="manifest" href="manifest.webmanifest">##' \
    -e "s#script-src [^;]*;#script-src 'self' 'unsafe-inline';#" "$APP_SOURCE_DIR/../index.html" > www/index.html
grep -q "script-src 'self' 'unsafe-inline';" www/index.html
VERSAO_NOME="$(grep -o 'Planejamento de amostragem v[0-9.]*' www/index.html | head -1 | sed 's/.* v//')"
node --require "$APP_SOURCE_DIR/cli-compat.cjs" "$APP_SOURCE_DIR/node_modules/@capacitor/cli/bin/capacitor" add android
# O CLI resolve o symlink do node_modules. Rebaseia somente caminhos de build
# antes de mover o staging; nenhuma referência temporária deve sobreviver.
node - "$APP_SOURCE_DIR" <<'NODE'
const fs = require('node:fs'), path = require('node:path');
const moduleRoot = path.join(process.argv[2], 'node_modules');
const file = 'android/capacitor.settings.gradle';
let count = 0;
const text = fs.readFileSync(file, 'utf8').replace(/new File\('([^']*node_modules\/([^']+))'\)/g, (_, original, suffix) => {
  const resolved = path.resolve(moduleRoot, suffix);
  if (!resolved.startsWith(moduleRoot + path.sep) || !fs.existsSync(resolved)) throw new Error('Caminho nativo inválido');
  count++;
  return `new File('../node_modules/${suffix}')`;
});
if (!count) throw new Error('Dependências Android não encontradas');
fs.writeFileSync(file, text);
NODE
M=android/app/src/main/AndroidManifest.xml
# GPS: permissões que o Android pede na 1ª vez que a página usa a localização
sed -i 's#<uses-permission android:name="android.permission.INTERNET" />#<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n    <uses-feature android:name="android.hardware.location.gps" android:required="false" />#' "$M"
grep -q ACCESS_FINE_LOCATION "$M"
# Tela acesa e vibração (aviso de chegada ao ponto)
sed -i 's#<uses-permission android:name="android.permission.INTERNET" />#<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.VIBRATE" />#' "$M"
# Versão do app = versão do SCHMIDT; código cresce a cada compilação (o Android exige para atualizar)
G=android/app/build.gradle
sed -i -E "s/versionCode [0-9]+/versionCode ${VERSAO_CODIGO}/; s/versionName \"[^\"]*\"/versionName \"${VERSAO_NOME:-1.0}\"/" "$G"
# Barra de status na cor da marca (antes: cor padrão do Android)
S=android/app/src/main/res/values/styles.xml
sed -i 's#<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">#&\n        <item name="android:statusBarColor">\#0f4537</item>\n        <item name="android:navigationBarColor">\#0f4537</item>#' "$S"
grep -q statusBarColor "$S"
# Ícone: a marca SCHMIDT em todas as densidades
for d in android/app/src/main/res/mipmap-*dpi; do
  cp "$APP_SOURCE_DIR/../icone-192.png" "$d/ic_launcher.png"; cp "$APP_SOURCE_DIR/../icone-192.png" "$d/ic_launcher_round.png"; cp "$APP_SOURCE_DIR/../icone-192.png" "$d/ic_launcher_foreground.png"
done
rm -rf android/app/src/main/res/mipmap-anydpi-v26
# Abertura do app: fundo verde da marca (no lugar da tela padrão do Capacitor)
for f in android/app/src/main/res/drawable*/splash.png; do cp "$APP_SOURCE_DIR/splash.png" "$f"; done
# Auditoria: não instalar nem reutilizar a chave exposta no histórico público.
# Debug usa a chave de teste do ambiente; não distribuir nem instalar por cima
# do APK publicado. Migração release: docs/MIGRACAO_ASSINATURA.md.
mv -T -n www "$APP_SOURCE_DIR/www"
test ! -e www || { echo "Destino www/ passou a existir; nada foi sobrescrito." >&2; exit 2; }
mv -T -n android "$APP_SOURCE_DIR/android"
test ! -e android || { echo "Destino android/ passou a existir; nada foi sobrescrito." >&2; exit 2; }
echo "Projeto Android pronto: versão ${VERSAO_NOME} (código ${VERSAO_CODIGO})"
