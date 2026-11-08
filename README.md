# SCHMIDT · Planejamento de amostragem (link de campo)

Versão da ferramenta SCHMIDT publicada num link https, para a equipe usar o **GPS** no guia de campo.

**Link:** https://jhsilvamenezes-netizen.github.io/schmidt-campo/

- Abra o link no **Chrome**, uma vez, com sinal. Depois ele abre **sem internet** (fica guardado no aparelho).
- No menu ⋮ do Chrome: **Adicionar à tela inicial** (abre como um app).
- O GPS só funciona pelo link. O arquivo aberto direto do WhatsApp não recebe a localização: é uma regra do Chrome.
- Tiros e pontos são **planejados/simulados**: confira em campo. "Ponto coletado" marca só o progresso no celular;
  o registro oficial continua no Cropwise.

## iPhone

Use o **link acima no Safari** (no iPhone, o GPS e o "sem internet" funcionam pelo Safari):

1. Abra o link no Safari, com sinal.
2. Toque em **Compartilhar** (quadrado com seta) › **Adicionar à Tela de Início**. Fica um ícone SCHMIDT que abre em tela cheia.
3. No guia, toque em **Onde estou?** e **Permitir** a localização. Para a seta girar com o celular, toque em
   "Girar mapa com a bússola" e permita o acesso ao movimento.

Não há app de loja para iPhone: a Apple só permite instalar app pela App Store/TestFlight, o que exige conta de
desenvolvedor paga (US$ 99/ano) e revisão da Apple.

## App Android (APK)

**Baixar:** https://github.com/jhsilvamenezes-netizen/schmidt-campo/releases/latest/download/SCHMIDT-Campo.apk

- Abra o link no celular, baixe e toque no arquivo. O Android pede para permitir instalar "de fonte desconhecida":
  permita para o Chrome (ou o app que baixou).
- Na 1ª vez que usar o GPS no guia, toque em **Permitir** (localização precisa).
- Antes de atualizar ou reinstalar, faça uma cópia de segurança em Plano › Arquivos e guarde fora do aparelho. Instalar por cima depende da compatibilidade de assinatura; uma troca de assinatura pode exigir reinstalação. Não desinstale antes de verificar a cópia e o procedimento de migração.
- O APK distribuído permanece preservado. Nesta branch de auditoria, o GitHub Actions apenas valida; nova distribuição exige aprovação do proprietário.
- No app, os arquivos (GPX, KML, cópia de segurança, trajeto caminhado) abrem o **Compartilhar** do Android:
  mande para o WhatsApp, Drive ou e-mail. "Imprimir fichas" gera um arquivo .html: abra no Chrome e use
  ⋮ › Compartilhar › Imprimir.
- Botão **Voltar** do Android fecha o que estiver aberto; na tela inicial, toque duas vezes para sair.
- A tela fica acesa enquanto o GPS do guia estiver ligado.

Os arquivos são gerados a partir do projeto principal (`npm run build && npm run pacote-web`); não edite aqui.

## Desenvolvimento da candidata

O projeto-fonte gerador completo ainda não foi recuperado. As fontes novas de
correção em `src/` são integradas à referência atual por
`node scripts/build-preserved.mjs`; não editar o bundle minificado manualmente.
Validação e limitações: [correções de dados/GPS](docs/CORRECOES_DADOS_GPS.md),
[fontes de correção](src/README.md) e [testes](audit/README.md).
