#!/usr/bin/env bash
# Monta o projeto Android a partir do index.html da raiz (rodado pelo GitHub Actions; dá para rodar local com Android SDK).
set -euo pipefail
cd "$(dirname "$0")"
VERSAO_CODIGO="${1:-1}"
rm -rf www android
mkdir -p www
# No app, a página não precisa do service worker (os arquivos já estão no aparelho): tira a marca da versão web.
# Política de segurança (CSP): o Capacitor injeta o próprio script de ponte na página; com as assinaturas (hashes)
# da versão web, o Android bloquearia essa ponte (sem salvar/compartilhar, sem botão Voltar). No app, que só abre
# este arquivo local, os scripts da própria página são liberados ('self' 'unsafe-inline'); o resto da CSP continua.
sed -e 's#<meta name="schmidt-web" content="1">##' -e 's#<link rel="manifest" href="manifest.webmanifest">##' \
    -e "s#script-src [^;]*;#script-src 'self' 'unsafe-inline';#" ../index.html > www/index.html
grep -q "script-src 'self' 'unsafe-inline';" www/index.html
VERSAO_NOME="$(grep -o 'Planejamento de amostragem v[0-9.]*' www/index.html | head -1 | sed 's/.* v//')"
npm install --no-audit --no-fund
npx cap add android
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
  cp ../icone-192.png "$d/ic_launcher.png"; cp ../icone-192.png "$d/ic_launcher_round.png"; cp ../icone-192.png "$d/ic_launcher_foreground.png"
done
rm -rf android/app/src/main/res/mipmap-anydpi-v26
# Abertura do app: fundo verde da marca (no lugar da tela padrão do Capacitor)
for f in android/app/src/main/res/drawable*/splash.png; do cp splash.png "$f"; done
# Assinatura fixa: sem ela, cada compilação teria uma chave nova e a atualização exigiria desinstalar (perdendo os planos salvos)
if [ -f chave/schmidt-debug.keystore ]; then mkdir -p ~/.android && cp chave/schmidt-debug.keystore ~/.android/debug.keystore; fi
echo "Projeto Android pronto: versão ${VERSAO_NOME} (código ${VERSAO_CODIGO})"
