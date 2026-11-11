# Bloco no celular — 1.31.3

## Problema

O relato mostra BA1/BA2/BA3 em prévia, mensagem de falha ao salvar e o painel
Plano cobrindo o mapa. Foi informado que havia somente uma tela aberta.
O erro foi reproduzido em uma única página da 1.31.2 com eventos simulados de
saída e retorno persistido: pagehide invalidava a sessão permanentemente, mas
pageshow não recarregava o documento. A gravação permanecia bloqueada.
Isso demonstra um defeito no código; não prova o caminho exato do aparelho.

## Correção

- Ao retornar de um documento preservado no histórico, recarregar uma vez para
  adquirir a permissão e ler os dados atuais. A abertura normal não recarrega.
- Não promover o estado antigo da memória a escritor. Outra janela continua
  protegida contra sobrescrita e a recarga lê os registros mais recentes.
- Distinguir bloqueio de sessão, operação em andamento e falha real de espaço.
  O tratamento original de erros reais e quota permanece preservado.
- Acrescentar Ver mapa do grupo no planejamento: a prévia dos três lotes pode
  ser aberta no celular sem depender de salvar/ativar o bloco.
- Usar bloco só ativa depois de salvar. Falha de armazenamento mantém o individual.

Não alterar áreas, rumos, distribuição, método, coletas ou esquema de backup.

## Validação

```sh
npm --prefix audit test
npm --prefix audit run test:blocks
npm --prefix audit run test:sessions
node audit/blocks-ui-browser.mjs
node scripts/build-preserved.mjs --check
```

Regressões: caso antigo reproduzido numa página; retorno corrigido com dados
preservados; BA1/BA2/BA3 salvos e enquadrados no modo móvel; outra janela sem
permissão não sobrescreve o proprietário; quota simulada continua impedindo
ativação e permite consultar a prévia. Emulação Android, viewport 393 × 851,
toque habilitado. Eventos de histórico simulados, não homologação física.

A CI mantém também os gates de backup, restauração, concorrência, atualização
offline, geometria, preservação visual e preparação Android. APK sem distribuição.
Após atualizar, fechar a aba antiga e reabrir com internet, sem limpar dados.
Se o aviso persistir no aparelho, registrar a nova mensagem, versão e sequência
real de navegação, sem solicitar ou publicar dados privados do operador.
