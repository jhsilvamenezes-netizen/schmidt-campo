# 1.31.4 — alteração feita logo antes de sair volta a ficar gravada

## Problema

Na 1.31.3, o que a pessoa alterava (ex.: hectares por ponto) e, em seguida,
recarregava, fechava a aba ou trocava de página **não ficava gravado**. Na
1.31.0 ficava: o aplicativo grava o pendente ao sair ("gravar ao sair").

| Caso (celular 390 px) | 1.31.0 | 1.31.3 | 1.31.4 |
| --- | --- | --- | --- |
| Altera e recarrega na hora | grava | **perde** | grava |
| Altera e fecha a aba | grava | **perde** | grava |
| Altera, sai da página e volta | grava | **perde** | grava |
| Altera e espera 2 s | grava | grava | grava |

No celular, quando o aplicativo vai para segundo plano, o navegador avisa antes
(`visibilitychange`) e a gravação acontecia; a perda aparecia ao recarregar,
fechar ou navegar logo depois de alterar.

## Causa

`installSchmidtSessionLifecycle` registrava a invalidação da sessão no
`pagehide` antes de o aplicativo registrar os seus gravadores de saída.
Ouvintes do mesmo alvo rodam na ordem de registro: a sessão perdia a permissão
(`canWrite() = false`), a barreira de escrita recusava o `setItem` e o pendente
era descartado.

## Correção (sem mudança de tela, texto ou fluxo)

- `src/platform/browser-session-lock.mjs`: opção `deferEnd`; a função devolve
  quem arma o encerramento. Sem a opção, o comportamento é o anterior.
- `src/platform/legacy-integration.mjs`: o encerramento é armado por um
  temporizador agendado no fim da inicialização (`finally`), portanto depois de
  o aplicativo registrar os gravadores, inclusive nos retornos de erro.
- A invalidação no `pagehide` e a recarga no retorno pelo histórico continuam:
  só mudou a ordem (grava primeiro, invalida depois).

## Conferido

| Verificação | Resultado |
| --- | --- |
| `audit/save-on-exit-browser.mjs` (novo, 3 casos) | falha na 1.31.3, passa na 1.31.4 |
| `audit/mobile-session.test.mjs` (1 caso novo de ordem) | 3 de 3 |
| `audit/session-lock-browser.mjs` (duas janelas, aba antiga, pagehide) | passa |
| `audit/mobile-session-browser.mjs` (retorno pelo histórico, bloco no celular) | 4 de 4, sem erros |
| `npm test`, `test:blocks` | passam |
| `node scripts/build-preserved.mjs --check` | build determinístico conferido |

Apresentação estática preservada (o gerador confere). Android: sem novo build;
a distribuição continua dependendo da chave privada e da migração.
