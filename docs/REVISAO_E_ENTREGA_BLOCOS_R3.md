# Revisão e entrega de blocos — r3

Versão preparada: `1.31.0-r3-blocos-revisada`. Branch solicitada:
`codex/auditoria-evolucao-segura`. O proprietário pediu revisar, melhorar,
enviar e entregar após confirmar a existência do modo bloco na candidata.

## Resultado para a operação

Mantidos os 51 planos individuais e as 40 opções de bloco dos 16 grupos de
referência comum. O P6 conserva os valores e a configuração, sem sua observação
específica na apresentação. Nenhum anexo privado, coleta de aparelho ou chave
integra o envio. Pontos continuam simulados; acesso e percurso entre lotes
continuam a exigir conferência da equipe.

O operador entra em Plano, escolhe modo bloco, conjunto, Preparar e Usar.
Cada membro abre no mapa/monitoramento existentes. Retomar conserva as coletas
do próprio bloco; voltar ao individual recupera os dados individuais. GPX e
backup completo abrangem os pontos manuais atuais, sem copiar marcações entre
escopos. Algumas grades acrescentam pontos para manter a cobertura amostrada;
o acréscimo é informado antes da aplicação e não comprova economia de tempo.

## Problemas encontrados e corrigidos

| Situação | Correção e evidência |
| --- | --- |
| Alterar o conjunto enquanto a grade era calculada podia aplicar outro conjunto | Seleção e parâmetros bloqueados durante preparo; cancelamento sem salvar bloco testado na UI |
| Último valor digitado podia ainda estar no debounce individual | Salvar o parâmetro pendente antes do preparo/aplicação; evento seguido imediatamente de preparar testado |
| Parâmetro alterado depois do cálculo podia deixar o candidato desatualizado | Assinatura dos parâmetros/ajustes; aplicação recusada e novo preparo exigido, sem ativar o bloco |
| Controles de outras etapas ou restauração de versão podiam mudar a grade comum | Bloqueio dos controles e proteção no leitor/aplicador do motor, além da UI |
| Visão conjunta reconstruía somente os pontos originais do bloco | Snapshot do estado ativo, restauração de ajustes por assinatura e atualização após mover/adicionar/remover/desfazer |
| Distâncias e menor borda podiam continuar mostrando valores anteriores ao ajuste | Recalcular a apresentação pelos pontos em uso; GPX usa o mesmo modelo validado |
| Referência atualizada podia impedir retomada sem oferecer um novo preparo seguro | Revisão separada do bloco, conservando o registro/coletas anteriores no backup |
| Um membro incompatível eliminava pares válidos do mesmo grupo | Compatibilidade recalculada em cada subconjunto |
| Encerramento do GPS ocorria depois do snapshot | Encerrar antes da gravação na troca de escopo; último estado verificado em teste |
| Cálculo criava matrizes temporárias para cada célula/ponto | Reutilizar a busca de vizinhos do motor e copiar somente o vetor de distâncias antes de ordenar |

Não foi adicionada biblioteca de runtime. Os testes não comprovam desempenho
em telefone físico nem ganho de rendimento da atividade.

## Build e ativação preparados

`scripts/block-transform.mjs` contém a integração incremental com pontos
únicos verificados. O build preservado chama essa transformação quando
`VERSAO.json.runtimeBlocks` está ativo. Os arquivos `index.html`, `sw.js`
e `VERSAO.json` da **branch** já representam a r3: um merge aprovado terá
o runtime correto, em vez de publicar apenas scripts de auditoria.

O pacote separado usa o mesmo gerador; HTML e worker são idênticos aos da
branch. CSP, integridade e cache por conteúdo continuam ativos, sem
`skipWaiting`. A atualização espera fechar os clientes antigos e conserva
armazenamentos. A configuração da entrega está em `audit/block-candidate.json`.
R2 e seus pacotes anteriores são preservados.

`main` e o Pages continuam na r1 enquanto o PR aguarda aprovação. Não foi
criada Release, assinatura ou APK de distribuição. A chave antiga continua
indisponível; não se promete atualização Android por cima.

## Verificações locais

- 25 testes específicos de blocos e 52 contratos/testes existentes aprovados.
- 40 opções, 5.957 grades e 88 comparações bloco/lote conferidas por GEOS/NumPy:
  mínimos, pontos internos/únicos, recorte, eixo/fase comum, borda e cobertura
  nos centros das mesmas células. Cobertura contínua/datum não homologados.
- 13 verificações de uso: 51 snapshots individuais idênticos; preparo,
  cancelamento, invalidação, aplicação, ponto manual, GPX, coleta pelo
  monitoramento, backup/restauração em perfil limpo e recarga offline.
- Regressão visual das cinco telas em quatro larguras mais três estados GPS:
  nenhuma diferença além do escopo aprovado e da tolerância original de
  rasterização (até 20 pixels, delta 1). Não se declara igualdade visual no
  painel de Plano aprovado para mudança.
- Plano em cinco larguras, regressões de dados/GPS, oito cenários de
  concorrência e nove testes de preparação/paridade Android passaram.
- Atualização PWA da referência original e da r1 atualmente publicada passou:
  worker aguarda fechamento das abas, recarga offline mantém as três chaves,
  marcações, imagem e histórico. Execução local, sem alegar publicação remota.

Evidência agregada: `audit/block-review-r3-evidence-2026-11-09.json`.
Resultados completos privados: `audit/results/block-runtime-r3/` e diretórios
dos testes existentes; não são publicados pelo workflow.

## Reprodução e entrega

```sh
node --test audit/block-planning.test.mjs
node scripts/build-preserved.mjs --check
node scripts/build-block-candidate.mjs
cd audit
npm test
node all-fields-block-reference.mjs
node blocks-runtime-browser.mjs
.venv/bin/python validate-runtime-blocks.py
node blocks-ui-browser.mjs
```

Após commit limpo, executar `python scripts/package-block-candidate.py`.
Pacotes, planilha e capturas:
`/workspace/entregas-schmidt/1.31.0-r3-blocos-revisada/`.
O workflow `Candidata de blocos (sem deploy)` repete os testes e disponibiliza
o ZIP web como artefato de CI. Não publica backups, GPX, imagens de teste,
coordenadas extraídas de anexos ou chaves.

## Revisão e recuperação

Antes de ativar no link: aprovar o PR e conferir os checks no SHA enviado.
Após eventual merge: verificar implantação e hashes servidos antes de declarar
publicação. Nenhuma aprovação de merge é presumida pelo envio da branch.

Para voltar ao individual, usar o seletor de modo, conservando ambos os registros.
Antes de qualquer migração física, exportar backup completo e conferir sua
restauração. Rollback de código é um revert revisado do PR: conservar a chave
`monitoramento.v03` inteira, inclusive `planningBlocks`; não limpar dados nem
desinstalar o APK. A r1 lê os individuais da raiz, mas não oferece o seletor
de blocos. Conservar o backup r3 para retomar as marcações de bloco depois.
