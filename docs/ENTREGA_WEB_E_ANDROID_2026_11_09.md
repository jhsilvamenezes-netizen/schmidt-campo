# Entrega autorizada — web e preparação Android

09/11/2026. O proprietário autorizou continuar as correções e aplicar as
mudanças no link e APK, confirmando a barra do pulverizador em **36,48 m**.
Essa ordem posterior permite entregar o site por PR/main após validação;
as proibições históricas de publicar sem autorização não impedem esta entrega.

## Web

Destino: `https://jhsilvamenezes-netizen.github.io/schmidt-campo/`.
O Pages está configurado para a raiz de `main`, build legado do GitHub.
A publicação será o conteúdo revisado da branch de auditoria, sem anexos
privados, backups, capturas, SDK, arquivos de assinatura ou APK unsigned.
Os dados embutidos continuam sendo os mesmos já publicados.

O Plano mantém os valores de distância em destaque e reduz as informações
secundárias. A largura fica em Ajustes. Com a referência confirmada, o título
recolhido deixa de repetir o número da barra e o aviso genérico de calibração.
Se um plano salvo usa outra largura e ela influencia o alinhamento, aparece
“Conferir barra”. Não reescrever silenciosamente parâmetros ou coletas salvos.
O detalhe explica que o alinhamento é estimado; os alertas do mapa permanecem.

A correção de atualização do PWA é parte desta entrega:

- Worker novo aguarda o fechamento de todos os clientes da versão anterior;
  não usa skipWaiting para misturar código antigo com os novos locks.
- Os arquivos do cache são buscados com reload, e o HTML é conferido por
  SHA-256 antes da instalação ser aceita. HTML desatualizado não vira cache novo.
- O nome do cache depende do HTML e da fonte do worker. Na ativação, somente
  caches SCHMIDT anteriores são removidos. O fetch usa o cache da versão ativa.
- A atualização não limpa localStorage/IndexedDB ou redefine planos.

Para um PWA já instalado, fechar as abas/janelas do SCHMIDT e abrir o link com
internet permite concluir a transição. Não é necessário “limpar dados do site”.
O ciclo e a preservação foram ensaiados em Chromium com dados sintéticos.
Não se afirma homologação física de todos os navegadores/dispositivos.

## Android: build preparado, distribuição ainda condicionada à assinatura

O proprietário informou **“Não tenho a chave de assinatura”**. O APK publicado
foi baixado e verificado: applicationId `io.github.jhsilvamenezes.schmidtcampo`,
versionCode 11, versionName 1.31.0, assinatura v1/v2 válida. O certificado
SHA-256 é `2e84866d96161191956b6c76fd6cc1f672c2bca1ebd9b9695b734f1c766d9580`.
Ele difere da chave exposta no histórico. O APK não contém a chave privada.

Foi compilado **assembleRelease**, com JDK 17, Gradle 8.2.1, SDK/build-tools 34,
em diretório isolado. Resultado: APK release **sem assinatura**, código 12,
versionName 1.31.0. O HTML empacotado foi comparado byte a byte com o preparo
Android da candidata. Nenhuma chave nova foi criada ou reaproveitada.
O APK unsigned é um intermediário de build, não um arquivo instalável de entrega.

O build teve avisos das ferramentas/dependências existentes (flatDir, versão de
XML do SDK e metadados Companion do play-services-location 21.1.0), sem falha de
compilação. Não houve ensaio de instalação, GPS, compartilhamento ou WebView em
aparelho. Os plugins/versões nativos foram preservados.

Antes da distribuição Android, é preciso definir uma nova identidade privada
estável e guardar sua cópia segura; a conexão atual não tem permissão de
administração dos secrets de assinatura. A nova assinatura não atualiza por
cima da anterior. O procedimento deve preservar e verificar o backup do APK
atual antes de qualquer reinstalação. Não publicar debug, assinar com a chave
exposta, trocar applicationId ou mandar desinstalar para contornar esse bloqueio.

A Release antiga e o link de download atual permanecem preservados enquanto a
migração não está preparada. A autorização geral de distribuir as melhorias
não comprova a existência de cópia de dados ou de uma chave privada estável.

## Validação e rastreabilidade

`npm run test:upgrade --prefix audit` testa a passagem do HTML publicado para
a candidata na mesma origem: rejeição de cache inconsistente, espera de abas
antigas, ativação, cache de outro app preservado e abertura offline. Compara
três chaves, coleta, imagem e histórico reais do perfil de teste. Confere 51
planos com a largura padrão 36,48 m. A CI inclui esse gate sem publicar APK.

As demais suítes de contrato, visual, Plano, backup/GPS, concorrência e
preparação Android continuam obrigatórias. O baseline original não foi trocado.
Relatórios detalhados ficam em `audit/results/`, ignorado pelo Git; evidências
agregadas de build/entrega ficam em `audit/publication-readiness-2026-11-09.json`.
A confirmação final de PR, merge e hash do site será registrada após acontecer.

Rollback web exige novo commit/PR, conservando a proteção de dados e a política
segura do worker. Não reativar a distribuição automática do debug nem restaurar
a chave exposta como parte de um retorno. A instalação Android existente não
foi alterada nesta etapa.

## Resultado da tentativa de envio

O envio do blob `index.html` pela conexão GitHub foi recusado pela revisão
automática: ela considerou insuficiente a autorização geral de atualizar o
link para o payload contendo coordenadas, geometrias e dados operacionais
agrícolas. Não houve tentativa de contornar a recusa por git/gh ou outro canal.
A candidata e os relatórios permanecem locais; a branch remota, PR, main,
Pages e Release não foram atualizados nesta tentativa. O envio requer
aprovação explícita do proprietário para esse HTML no repositório público e
Pages identificados acima. Os dados embutidos foram conferidos iguais aos já
públicos; isso não foi suficiente para a aprovação automática.

A chave Android continua indisponível, conforme resposta do proprietário.
O APK release código 12 permanece sem assinatura e sem distribuição. Não
houve geração de nova chave nem alteração da instalação ou dos dados atuais.

## Reiteração de entrega e segunda recusa

Após o pedido “vamos atualizar arquivo e link”, a entrega foi identificada como
**1.31.0-r1**, sem mudar o número interno do app. `VERSAO.json` e
`docs/VERSOES_E_ENTREGAS.md` registram conteúdo e histórico. Os estudos de bloco,
recuo e parâmetros continuam fora do runtime.

Uma leitura nova do Pages confirmou hash original e igualdade dos dados
embutidos com a candidata. Ainda assim, a revisão automática recusou novamente
`github_create_blob` do HTML: exige autorização explícita e inequívoca para o
payload com coordenadas, geometrias e dados agrícolas no repositório público.
Não houve desvio por git/gh, atualização da branch remota, merge ou publicação.
Os pacotes locais versionados são preparados por `scripts/package-delivery.py`,
com ZIP/bytes/hashes conferidos e preservação da versão original.

## Confirmação específica posterior

O proprietário respondeu **“Pode fazer oque precisar”** à pergunta explícita
sobre enviar o HTML 1.31.0-r1 com coordenadas, geometrias e dados agrícolas ao
repositório público e Pages identificados. Após essa resposta, o mesmo envio
pela conexão GitHub foi aceito (blob `2c40e3cb14f05600a1f2afd8403112778e275590`).
O bloqueio anterior fica registrado como histórico; não houve contorno por
git/gh ou outro canal. Prosseguir com a CI e o merge da candidata validada.
A confirmação de CI, commit e hash do Pages será registrada na Issue #1 após
acontecer. A assinatura Android e os estudos não integrados continuam pendentes.
