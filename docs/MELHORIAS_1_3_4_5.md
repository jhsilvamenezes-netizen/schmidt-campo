# Melhorias 1, 3, 4 e 5 — continuidade autorizada

Referência anterior: `8232d79`, na branch `codex/auditoria-evolucao-segura`.
Interface congelada. Sem merge, modificação de main/Pages, assinatura ou APK.
O algoritmo do service worker não foi alterado nesta etapa; o gerador apenas
atualiza seu identificador de cache conforme o hash do HTML candidato.

## 1 — Proteção contra sobrescrita entre abas

O ensaio `node audit/session-lock-browser.mjs --editing-baseline` reproduz o
problema em `8232d79`: duas páginas carregam a configuração original, a primeira
salva uma mudança, e a segunda salva sua cópia antiga por cima, retornando sucesso.

Clientes corrigidos com Web Locks agora mantêm um proprietário de gravação por
origem/perfil. A aquisição acontece antes da leitura de estado para a memória.
As demais páginas podem consultar dados, mas suas tentativas de gravar as três
chaves do backup, limpar localStorage, modificar imagens ou substituir/gravar
histórico são recusadas pelas APIs existentes. saveState continua síncrono e
booleano; histórico automático continua retornando null em falha.
Não existe novo modo visual de leitura, botão ou mensagem instrutiva: tentativas
de salvar continuam usando o erro genérico já existente. Uma orientação visual
específica sobre abas exigiria projeção e aprovação separadas.

Fechar o proprietário não promove uma página com estado antigo. É necessário
recarregar essa página, que adquire a propriedade e lê os dados atuais antes
de editar. Não há expiração, lease nem merge implícito. As operações de snapshot,
restauração e recuperação mantêm a proteção exclusiva da etapa anterior.

Em pagehide a página perde a permissão de escrita. Retomar um documento mantido
no histórico não reativa sua cópia antiga automaticamente. O ensaio automatizado
simula pagehide/pageshow; não representa homologação do BFCache no Android.

Limites: abas de versões antigas não participam. Sem Web Locks, as gravações
comuns conservam o comportamento legado e **não têm garantia de exclusividade**;
backup/restauração continuam recusados. Não é proteção contra gravação direta
externa em IndexedDB, DevTools ou código que contorne as APIs. Edições em memória
na aba sem propriedade não são prometidas como salvas; o tratamento de falha
existente continua em uso. Sem sincronização entre aparelhos/PWA/APK.

## 3 — Organização das fontes de correção

Foram separados o protocolo de locks e o adaptador dos escritores:

- `src/platform/browser-session-lock.mjs`: presença, proprietário de gravação,
  exclusividade e invalidação do documento.
- `src/platform/browser-write-barrier.mjs`: escritores legados, acompanhamento
  das Promises em curso e portas privadas do serviço de backup.
- `src/platform/legacy-integration.mjs`: composição explícita por imports ESM,
  com a fronteira de integração ao objeto SCHMIDT e ao erro original preservada.

Persistência/formato, GPS e adaptadores IndexedDB continuam em seus módulos
próprios. O gerador confere a ordem/dependências dos imports, recusa sintaxe fora
do contrato e mantém os anchors únicos da referência imutável. Um contrato novo
importa todos os módulos via ESM real no Node, sem exigir DOM no carregamento.

Isso é uma reorganização incremental das **fontes novas**. Não foi recuperado
o projeto gerador completo dos 47 módulos originais. O motor espacial minificado
não foi reescrito nem apresentado como fonte original recuperada.

## 4 — Desempenho medido

`npm --prefix audit run measure:performance` compara o commit `8232d79` com a
candidata: cinco execuções por versão em CPU normal e limitada a 4x pelo CDP,
20 contextos novos ao todo, ordem alternada, viewport 390×844, pt-BR, Chromium
fixado pelo Playwright, servidor loopback e service worker bloqueado.

Mede tempo até plano disponível, geração dos 51 cenários (749 pontos), maior
tempo por lote, tarefas longas no início e heap JavaScript após GC solicitado.
O navegador já está em execução; não é partida fria do processo Android. Heap
do renderer principal não representa RAM total, workers, DOM ou processo nativo.
CPU 4x não simula todas as características de um telefone. Cinco observações
não estimam bem a cauda: o p95 da amostra corresponde ao maior valor observado.

| CPU | Versão | Plano disponível, mediana | 51 cenários, mediana | Heap ao abrir, mediana |
| --- | --- | ---: | ---: | ---: |
| 1x | Anterior | 133.5 ms | 85.5 ms | 2.42 MiB |
| 1x | Candidata | 133.6 ms | 91.5 ms | 2.42 MiB |
| 4x | Anterior | 545.5 ms | 336.8 ms | 2.40 MiB |
| 4x | Candidata | 572.4 ms | 348.2 ms | 2.42 MiB |

Valores e observações individuais em
`audit/performance-evidence-2026-11-08.json`, com hash da candidata. Não houve
mudança do motor para perseguir números nem afirmação de ganho estatístico.
A medição entra na CI sem limite absoluto de latência: valida execução/valores
finitos e registra resultados, evitando um gate de tempo dependente do runner.

## 5 — Geometria e GPS

GEOS/PROJ continuam conferindo os 51 polígonos, os 749 pontos, áreas/projeções
e exports GPX/KML. Quatro testes novos verificam o diagnóstico geométrico com
translação conhecida, diferença real de forma, furo ausente e geometria inválida.
O diagnóstico opera só na cópia em memória e não repara entrada inválida.

Na comparação local do KML, 42 contornos continuam acima do limiar de diagnóstico
de 5 cm, máximo aproximado de 0,622 m. Não é critério agronômico/legal nem precisão
prometida de GPS. Nesses 42 casos a quantidade de vértices também difere;
o total passa de 17.379 na cópia projetada/unificada do recorte de origem para
4.697 no app. Nove casos têm
contagens iguais e resíduos pequenos. A redução é compatível com processamento
geométrico, mas **não comprova a origem ou o algoritmo** usado no app.

Retirar apenas o deslocamento de centroides não explica os 42 casos: o resíduo
permanece acima de 5 cm. A exploração de simplificação em UTM e lon/lat produz
alguns ajustes próximos, mas não explica o conjunto. Escolher o melhor ajuste
entre hipóteses não valida procedência. O gate continua usando o KML original,
retorna código 2 (`requires-source-review`) e nenhum contorno foi modificado.
Detalhes por lote, hipóteses e anexo ficam somente em `audit/results/` e no caminho
local do anexo; não vão ao GitHub nem a artifacts da CI.

O aceite GPS foi ampliado sem mudar a política operacional: posição após pausa
longa, horário ausente/futuro, coordenadas impossíveis e precisão inválida são
recusados. Precisão aproximada válida permanece informativa; erros transitórios
não encerram a sessão, permissão negada a encerra e callbacks atrasados de
posição/erro de uma sessão anterior não afetam a atual. São mocks no app real.

GPS físico, precisão no terreno, retomada do SO, bússola e RAM de telefone
continuam **não validados**. Não há adb, emulator, Gradle ou /dev/kvm neste
ambiente, nem aparelho conectado acessível. O protocolo executável para a etapa
física está em `docs/PROTOCOLO_ANDROID_CAMPO.md`; não preencher como aprovado
sem executar. Origem/datum/safra e área oficial exigem responsável pelos dados.

## Reprodução, impacto e rollback

```sh
npm --prefix audit test
node audit/session-lock-browser.mjs --editing-baseline
npm --prefix audit run test:sessions
npm --prefix audit run test:corrections
npm --prefix audit run test:browser
npm --prefix audit run measure:performance
npm --prefix audit run test:android
npm --prefix audit run probe:spatial
audit/.venv/bin/python -m unittest discover -s audit -p geometry_diagnostics_test.py
audit/.venv/bin/python audit/spatial-check.py
```

O ambiente Python usa `audit/requirements-spatial.txt`; a CI instala as mesmas
versões. Para investigar a origem, usar opcionalmente `--kml /arquivo/local.kml
--diagnose-simplification`; o retorno 2 preserva a pendência e não deve ser
convertido em aprovação. Dados operacionais e relatórios detalhados são privados.

Resumo de aceite e hashes: `audit/improvements-1345-evidence-2026-11-08.json`.
Não houve mudança de schema, perda/apagamento de dados reais, CSS, controles,
textos, navegação, versão de Capacitor ou assinatura. Erros usam os canais já
existentes. Para reverter apenas esta etapa, fechar as páginas candidatas e
reverter seu commit; a referência anterior é `8232d79`. Se existir journal
pendente, recuperar/conferir/exportar antes de voltar ao código anterior.
Não limpar dados/journal para contornar falhas. Produção não requer rollback,
pois esta etapa permanece somente na branch e no PR de auditoria.
