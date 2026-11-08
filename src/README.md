# Fontes novas de correção sobre a referência atual

Estes módulos foram escritos para corrigir problemas comprovados na versão
1.31.0. **Não são a recuperação do projeto-fonte original completo.** O piloto
antigo não é usado como substituto do aplicativo recente.

- `persistence/backup-service.mjs`: leitura estrita, limites, journal, compensação
  e recuperação da restauração, com dependências de armazenamento injetadas.
- `persistence/backup-format.mjs`: formato v2 compatível e validação adicional.
- `gps/fix-policy.mjs`: idade/ordem de aquisição e isolamento de sessões GPS.
- `platform/browser-backup-adapters.mjs`: transações nas bases existentes e
  journal privado em IndexedDB, sem manipular interface.
- `platform/legacy-integration.mjs`: conexão explícita com APIs do bundle atual.
- `platform/browser-session-lock.mjs`: presença por Web Locks e barreira dos
  escritores para snapshot/restauração; escopo e limites em
  `docs/CONCORRENCIA_RESTAURACAO.md`.

`node scripts/build-preserved.mjs` lê o HTML original diretamente do commit
imutável registrado em `audit/baseline.json` e gera a candidata. Exige esse
commit no checkout, sem baixar nada. `--inspect` é somente leitura;
`--check` verifica se os arquivos gerados correspondem às fontes atuais.

O gerador exige pontos de integração únicos e falha se a referência mudar.
Não editar o HTML minificado manualmente. Ele mantém todos os blocos fora do
módulo principal, CSS e datasets; reutiliza byte a byte o corpo original do
tratamento de erro, recalcula CSP e identifica o cache pelo conteúdo novo.
O escopo async reaproveita recurso já usado no baseline e evita exigir
top-level await dos WebViews. Os módulos legados restantes continuam no
artefato de referência; não alegar que todo o build original foi recuperado.

Testes em `audit/`. Interfaces e campos não devem ser alterados implicitamente
ao corrigir regras. Nenhum novo diálogo, controle ou texto foi introduzido.
