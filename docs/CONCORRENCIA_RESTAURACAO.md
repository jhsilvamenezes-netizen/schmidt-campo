# M2/M3 — Proteção da restauração entre abas

08/11/2026, somente na branch `codex/auditoria-evolucao-segura`, PR #2.
Não constitui autorização para merge, Pages, Release ou distribuição de APK.

## Problema reproduzido

O commit anterior `75ce803` já tinha journal e rollback, mas o sinalizador
`active` existia só na memória de cada página. No Chromium real, uma restauração
foi pausada depois de uma transação IndexedDB concluir, com o marcador pendente
ainda presente. Ao abrir outra página da mesma origem, ela tratou o journal
ativo como interrupção e removeu o marcador. O ensaio `--baseline` confirma esse
comportamento no HTML anterior; não modifica o baseline nem dados de aparelhos.

## Correção interna

Cada página corrigida mantém um Web Lock compartilhado enquanto permanece aberta.
Backup, restauração e recuperação pendente precisam de lock exclusivo. Um segundo
lock serializa a tentativa de conversão, evitando que duas páginas abandonem a
presença ao mesmo tempo. Com outra página já aberta, a operação é recusada antes
de ler o snapshot ou escrever journal/dados. Depois de fechar as outras páginas,
a mesma operação pode ser repetida. Não há expiração ou tomada de posse por timer.

Uma página aberta durante a seção exclusiva aguarda antes de inicializar o app.
Se o proprietário da operação fechar, o navegador libera o lock; a página que
aguardava recupera o journal preparado. A recuperação feita dentro de restore
reutiliza a seção exclusiva, sem pedir recursivamente o mesmo lock.

Na própria página, escritores assíncronos de imagens e versões são acompanhados
desde a entrada nas APIs existentes. O snapshot aguarda os já iniciados; novos
escritores são recusados durante a seção crítica. Escritas das três chaves de
backup em localStorage também são bloqueadas nesse intervalo. As portas privadas
do serviço usam as mesmas bases e schemas, permitindo commit/rollback protegido.
O histórico automático mantém seu contrato de retornar null em falha.

Nenhum diálogo, texto, CSS, tela, controle ou navegação foi acrescentado. Falhas
usam o canal existente. A recusa aparece pela mensagem de erro já existente;
não há uma nova mensagem instrutiva sobre abas. Alterar essa apresentação depende
da aprovação visual específica do proprietário.

## Limites explícitos

- A proteção é cooperativa entre clientes corrigidos na mesma origem/perfil.
  Páginas antigas publicadas não participam do protocolo. Fechar todas as abas
  antigas será requisito de uma futura implantação aprovada; ainda não implantada.
- Edição normal simultânea e sobrescrita de configurações entre duas abas
  continuam pendentes. Este mecanismo protege as operações de snapshot/restauração;
  não implementa edição colaborativa, merge ou resolução de conflitos.
- Sem Web Locks, o app continua inicializando normalmente, mas backup/restauração
  são recusados. Havendo recuperação pendente, gravações continuam bloqueadas.
  Não existe fallback de lease inseguro. WebView Android físico ainda não ensaiado.
- Uma aba suspensa ainda aberta pode impedir backup/restauração até ser fechada.
  Não prometemos detectar uma aba antiga ou garantir integridade contra código
  externo que escreva diretamente nas bases, contornando as APIs do aplicativo.
- Sincronização entre aparelhos/PWA/APK, falta de espaço e falha definitiva de
  IndexedDB continuam sujeitos às regras e limitações do journal já documentadas.

## Reprodução e evidências

```sh
npm --prefix audit test
npm --prefix audit exec -- playwright install chromium
node audit/session-lock-browser.mjs --baseline
npm --prefix audit run test:sessions
npm --prefix audit run test:corrections
npm --prefix audit run test:browser
```

O baseline exige o commit `75ce803` no checkout. A CI executa o aceite da
candidata, sem baseline privado, anexos, upload de screenshots, dados de campo,
segredos ou publicação. Os relatórios completos e PNGs ficam em `audit/results/`,
ignorado pelo Git. O resumo público contém somente hashes, contagens e resultados.

Resultados finais e navegador estão em `audit/session-lock-evidence-2026-11-08.json`.
As 23 comparações finais passaram: 22 idênticas e uma com 10 pixels de diferença
(delta máximo 1/255) em Auditoria/768 px, no Chromium 141.0.7390.37 fixado pelo
Playwright 1.56.1, mesmo navegador da CI. O Chromium 156 do ambiente produziu
rodadas rejeitadas com 44 e 33 pixels nas bordas; uma rodada no Chromium 141
também foi rejeitada com 33 pixels, delta 1/255. Essas rodadas não são resultados
aprovados. O controle adicional original contra original em Tiros/390 px passou
com zero pixels; não elimina a limitação de repetibilidade do rasterizador.
Nenhuma tolerância, máscara, referência, CSS ou screenshot foi alterado para passar.
Contratos/módulos: 14 + 28 testes. Os testes novos verificam recusa sem escrita,
recuperação dentro da mesma seção exclusiva e abertura sem recuperação pendente.
Os ensaios reais incluem abertura durante restore, recusa com vizinho carregado,
liberação após fechamento, encerramento abrupto com journal preparado, drenagem
de histórico em andamento e ausência de Web Locks. Validação em campo/Android
não foi realizada e não é inferida do ensaio Chromium.

## Impacto e rollback

O gerador continua preservando byte a byte apresentação e dados fora do módulo
principal; CSP permanece por hash e o cache recebe nova identificação do conteúdo.
Sem migração de schema ou alteração do motor espacial/assinatura/plugins Android.

Para reverter esta etapa, fechar as páginas candidatas e usar o commit `75ce803`
na branch de auditoria. Se houver marcador de recuperação pendente, recuperar
primeiro usando a candidata protegida e conferir/exportar os dados antes do
retorno. Não apagar marcador/journal ou limpar armazenamento para contornar falha.
A versão publicada permanece intacta; esta etapa não exige rollback em produção.
