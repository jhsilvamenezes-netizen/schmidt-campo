# Versões e arquivos de entrega

## Identificação

**1.31.0-r1 — SCHMIDT Campo, revisão segura 1**, preparada em 09/11/2026.
O sufixo r1 identifica esta entrega de arquivos; o número interno do aplicativo
continua 1.31.0. Não renomear um APK antigo como se fosse uma versão nova.
O identificador técnico fica em `VERSAO.json`, sem adicionar texto ao painel
operacional. Toda publicação precisa ser conferida pelo hash do conteúdo servido.

## Histórico preservado

| Identificação | Conteúdo | Estado |
| --- | --- | --- |
| 1.31.0 original | Web no commit `a1ad502c`; APK código 11 | Referência imutável; APK publicado preservado |
| 1.31.0-r1 | Correções de dados/GPS/concorrência, Plano aprovado e atualização PWA | Entrega autorizada; confirmação de CI e hash servido registrada na Issue #1 |
| Estudo de blocos e bordas | Validador isolado, testes e imagens de projeção | Documentação/protótipo; não integrado ao aplicativo |
| Estudo dos 37 parâmetros | Diagnóstico do motor e proposta de validação estrita | 13 testes aprovados; não integrado ao aplicativo |
| Android 1.31.0 código 12 | Build release sem assinatura | Intermediário compilado, sem distribuição; não é instalável de entrega |

O proprietário confirmou a publicação após a pergunta específica sobre o HTML,
seus dados agrícolas e os destinos públicos. O envio foi aceito pelo conector,
resolvendo o bloqueio anterior sem contorno por outro canal. Não interpretar
essa autorização como aprovação de funções ainda em estudo.

## Arquivos organizados

Pacotes locais em `/workspace/entregas-schmidt/1.31.0-r1/`:

- `SCHMIDT-Campo-Web-1.31.0-r1.zip`: arquivos executáveis da web, identificação
  da entrega e notas. Não é APK. Abrir HTML local não substitui o link HTTPS
  para uso do GPS.
- `SCHMIDT-Campo-Fonte-e-Testes-1.31.0-r1.zip`: snapshot dos arquivos versionados,
  com módulos recuperados/reconstruídos, testes e documentação. O projeto-fonte
  gerador original completo continua ausente; não apresentar esse snapshot como
  recuperação integral do projeto original.
- `SCHMIDT-Campo-Web-1.31.0-original.zip`: sete arquivos web originais conferidos
  com os hashes do baseline; referência para comparação, não instrução de
  reverter caches ou dados.
- `SHA256SUMS.txt`: integridade dos três arquivos, sem chaves ou senhas.

Os pacotes excluem anexos privados, imagens de ensaio, backups de usuários,
node_modules, SDK, caches, APK unsigned e todo arquivo de assinatura. As
projeções ficam disponíveis na conversa/workspace e são referenciadas nos docs.
Nenhum pacote inclui o keystore histórico; isso não apaga o histórico público.

Após a publicação, o snapshot final pode ser preparado em
`/workspace/entregas-schmidt/1.31.0-r1-publicada/` com
`python scripts/package-delivery.py --output /workspace/entregas-schmidt/1.31.0-r1-publicada`.
O diretório preliminar permanece preservado; o empacotador recusa substituir
arquivos de mesmo nome com bytes diferentes e conserva permissões executáveis
dos scripts no ZIP de fonte. O comprovante de publicação e hashes fica ao lado
dos pacotes finais, sem alterar o runtime.

## O que está pronto e o que continua em estudo

O runtime r1 mantém o mesmo conjunto de dados agrícolas já públicos. A barra
de referência é 36,48 m; configurações personalizadas salvas são conservadas.
Os testes da candidata e as limitações estão em
`audit/publication-readiness-2026-11-09.json` e
`docs/ENTREGA_WEB_E_ANDROID_2026_11_09.md`.

O modo bloco, o recuo obrigatório e a validação estrita dos 37 parâmetros **não
passaram a funcionar no aplicativo** por estarem documentados nos pacotes.
Consulte `PROPOSTA_BLOCOS_BORDAS_COMPARATIVO.md` e
`REVISAO_PARAMETROS_PLANO_BLOCOS.md`. Não há ganho de tempo homologado ou rota
conjunta gerada.

## Link e Android

Web: https://jhsilvamenezes-netizen.github.io/schmidt-campo/.
APK anterior: https://github.com/jhsilvamenezes-netizen/schmidt-campo/releases/download/app-v1.31.0-11/SCHMIDT-Campo.apk.

A confirmação da web exige CI remota, merge autorizado e comparação do hash
servido com `VERSAO.json`. Até isso acontecer, não chamar o link de atualizado.
Para atualizar o PWA após a publicação, fechar abas/janelas antigas e abrir
novamente com internet; não limpar os dados do site.

O proprietário não possui a chave do APK instalado. O build novo permanece sem
assinatura. Não desinstalar o atual nem publicar pacote com chave de debug para
contornar a falta: antes, preparar chave privada estável, backup verificado e
ensaio da migração. O APK código 11 continua com seu nome/download original.


## 1.31.1 — mapa de blocos e nomes simples

Mapa conjunto integrado, abertura de cada lote no mapa operacional, consulta
de distância à borda e termos simplificados. Cancelamento e leitura das cenas
revistos. [Relatório](ENTREGA_1_31_1.md). A identificação em `VERSAO.json` acompanha
o artefato; a publicação exige CI aprovada e conferência do Pages. APK código 13
compilado sem assinatura, com HTML idêntico; não distribuído.


## 1.31.2 — enquadramento do grupo

Limites visíveis ao selecionar o grupo; Usar bloco abre o mapa completo.
Botão Enquadrar explícito e medidas da borda e do próximo ponto sob consulta.
Sem mudança do método ou dos registros. [Relatório](REVISAO_ENQUADRAMENTO_1_31_2.md).


## 1.31.3 — gravação e mapa no celular

Retomada pelo histórico recarrega dados atuais e recupera a gravação. Prévia
do grupo acessível sem depender da ativação; erros de sessão distinguíveis
de falta real de espaço. [Relatório](CORRECAO_CELULAR_1_31_3.md) e
[continuidade](CONTINUIDADE.md). Android código 15 sem distribuição.


## 1.31.4 — gravar ao sair

Alteração feita logo antes de recarregar, fechar ou trocar de página volta a
ficar gravada: a sessão só perde a permissão depois de o aplicativo gravar o
pendente. Sem mudança de tela, método ou registros.
[Relatório](CORRECAO_GRAVAR_AO_SAIR_1_31_4.md).


## 1.32.0 — revisão do modo bloco

Mapa do bloco com cores do tema (Sol incluído), número dentro do ponto quando
cabe, letras de 12 px ou mais, botões de 44 px e do padrão, tela sem salto ao
abrir e código do mapa reescrito legível. Publicada em 12/11/2026 (PR #7). [Relatório](REVISAO_1_32_0.md).


## 1.33.0 — modo bloco em tablet, notebook e topo do celular

Mapa do bloco ocupa a área disponível no tablet e no notebook (número em
todos os pontos), selo do bloco em uma linha no celular e topo do guia sem
quebra. [Relatório](REVISAO_1_33_0.md).

