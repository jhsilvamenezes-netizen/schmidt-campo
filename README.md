# SCHMIDT · Planejamento de amostragem (link de campo)

Versão da ferramenta SCHMIDT publicada num link https, para a equipe usar o **GPS** no guia de campo.

**Link:** https://jhsilvamenezes-netizen.github.io/schmidt-campo/

- Abra o link no **Chrome**, uma vez, com sinal. Depois ele abre **sem internet** (fica guardado no aparelho).
- No menu ⋮ do Chrome: **Adicionar à tela inicial** (abre como um app).
- O GPS só funciona pelo link. O arquivo aberto direto do WhatsApp não recebe a localização: é uma regra do Chrome.
- Tiros e pontos são **planejados/simulados**: confira em campo. "Ponto coletado" marca só o progresso no celular;
  o registro oficial continua no Cropwise.

## App Android (APK)

**Baixar:** https://github.com/jhsilvamenezes-netizen/schmidt-campo/releases/latest/download/SCHMIDT-Campo.apk

- Abra o link no celular, baixe e toque no arquivo. O Android pede para permitir instalar "de fonte desconhecida":
  permita para o Chrome (ou o app que baixou).
- Na 1ª vez que usar o GPS no guia, toque em **Permitir** (localização precisa).
- Versão nova: baixe de novo e instale por cima; os planos salvos continuam (a assinatura do app é sempre a mesma).
- O APK é compilado aqui mesmo, pelo GitHub Actions, a cada versão publicada (`.github/workflows/app-android.yml`).
- No app, imprimir fichas e baixar arquivos (GPX, KML, cópia de segurança) podem não funcionar como no Chrome:
  para isso, use o link acima.

Os arquivos são gerados a partir do projeto principal (`npm run build && npm run pacote-web`); não edite aqui.
