# M0/M1 — Auditoria de preservação e segurança

**Resultados históricos da etapa `350f8d3`.** Para a candidata posterior que
altera somente lógica interna e identificador de cache, consultar
[CORRECOES_DADOS_GPS.md](CORRECOES_DADOS_GPS.md). A referência deste documento
não foi substituída.

Data: 08/11/2026. Branch: `codex/auditoria-evolucao-segura`.
Escopo aprovado: Issue #1, AGENTS.md e BASELINE_V1_31.md.
**Sem alteração visual, merge, deploy, Release ou APK novo.**

## M0 — Evidências e preservação

- Baseline imutável: `a1ad502c315b4b3d484444f9e2734400abd0b72a`, versão 1.31.0.
  `audit/baseline.json` registra tamanho e SHA-256 de dez arquivos do produto.
  HTML, CSS/JS embutidos, manifest, worker, ícones, splash, configuração Capacitor
  e dependências do aplicativo permanecem byte a byte iguais à referência.
- Contrato dos dados embutidos: 51 lotes, 18 Bananal e 33 RJ, origem histórica
  2024/25 e EPSG:32723 preservados. Nenhuma geometria/área foi substituída.
- Referências e candidata renderizadas em Chromium Linux, pt-BR/UTC, escala 1,
  data fixa 08/11/2026 12:00 UTC, perfis limpos, lote inicial BD3 e parâmetros
  padrão. Viewports: 360×800, 390×844, 412×915 e 768×1024.
- Capturas de Mapa, Planejar, Tiros, Monitoramento e Auditoria; mais GPS negado,
  indisponível e aproximado em 390×844. Pares locais em `audit/results/`;
  comparação com referência de Git no mesmo navegador. Não são capturas de
  Android físico nem acesso ao estado real de usuários no Pages.
- Primeira comparação detectou ruído de antialiasing em dez pixels da borda
  de seletores em 768 px (delta de um nível por canal), inspecionado manualmente.
  Tolerância explícita: até 20 pixels e delta máximo 1/255; sem máscaras.
  Arquivos de interface continuam protegidos também por igualdade SHA-256.
- APK original baixado somente para leitura em `/tmp`: 4.583.637 bytes,
  tag `app-v1.31.0-11`, publicada em 07/11/2026 14:01:34 UTC.
  SHA-256 calculado:
  `957d74cdab178b6e1f8b79eb62a7b7f9016c2055d5dcdebe24e11e3dc8c2f57e`,
  igual ao GitHub e ao baseline. Nenhum APK foi compilado ou instalado.

## Fonte geradora — bloqueio identificado

Busca no checkout, nomes de arquivos em todo o histórico e branches remotas:
somente `main` e esta branch; nenhum projeto gerador. Entre os repositórios
acessíveis desse proprietário, `schmidt-campo` é o único relacionado ao produto.
O README menciona `npm run build && npm run pacote-web`; faltam o package.json
da raiz, fontes e `scripts/pacote-web.mjs`. O bundle registra origem
`simulador_v0_2.html` e fingerprint, mas esse arquivo também não está no histórico.
Não se conclui que a fonte inexista em outro computador/conta. É necessário
localizar/fornecer essa fonte antes de corrigir rotinas compiladas. Não foi
reescrito nem refatorado o bundle. O lockfile adicionado é só das ferramentas de
auditoria; reprodutibilidade do projeto Android continua em M2.

## M1 — Código e diagnóstico

- Workflow candidato substitui promoção automática de `assembleDebug` a Release
  por CI com `contents: read`, sem secrets, build Android, upload de dados ou deploy.
  Executa contratos, navegador e sintaxe shell em PR/push desta branch ou manualmente.
  **O workflow antigo ainda existe em main**, pois main foi preservada. Não se
  afirma ter desativado a publicação da branch publicada remotamente.
- Keystore removido apenas da candidata e cópia para `~/.android/debug.keystore`
  removida do preparo. Histórico público e APK antigo permanecem intactos.
  Ignore de keystore/JKS/APK/AAB protege contra inclusão acidental futura.
- Certificados públicos inspecionados: chave histórica e APK publicado têm
  fingerprints diferentes. Causa ainda não estabelecida; detalhes e gates em
  `MIGRACAO_ASSINATURA.md`. Não presumir atualização por cima nem que todas as
  instalações tenham a mesma assinatura.
- Exportação/restauração real ensaiada com estado sintético: parâmetros,
  monitores, coleta, diário, preferências, lote importado, imagem e histórico.
  Hash do backup confrontado com SHA-256 do Node. Arquivo adulterado recusado;
  cancelar preserva dados; confirmar baixa cópia anterior, restaura em perfil
  separado e preserva conteúdo após reabertura/reexportação.
- PWA reaberto offline pelo worker real, 51 lotes disponíveis e sentinela de
  localStorage preservada. Isso não valida atualização entre versões do worker.
- Riscos preexistentes registrados: possível omissão silenciosa de imagens em
  erro de leitura; restauração sem transação única entre bases; preferências
  auxiliares fora da cópia. Fonte e ensaios de falha são necessários para correção.
  A orientação antiga do README sobre instalar sempre por cima não se aplica
  à migração de assinatura e não comprova compatibilidade das versões instaladas.

## Checklist verificável e limites

- [x] Baseline de código, dados, versão, hashes e identidade do APK preservado.
- [x] Método reproduzível de captura/comparação sem mudança de interface.
- [x] Contratos de preservação e dados executados localmente.
- [x] Exportação, corrupção, cancelamento, restauração/reabertura e offline no Chromium.
- [x] CI sem publicação implementada na candidata; plano de assinatura e dados documentado.
- [ ] Recuperar e preservar fonte geradora verdadeira (M0/M2; bloqueio externo).
- [ ] Validar instalação, compartilhamento e restauração no Android físico/emulador.
- [ ] Validar matematicamente os 51 lotes, distâncias, GPS em movimento e exports GPX/KML (M3).
- [ ] Validar falta de espaço, falhas de IndexedDB e atualização/rollback do worker.
- [ ] Definir nova chave privada, inventário das assinaturas e versionCode distribuído.
- [ ] Homologação humana e autorização específica para merge/migração/distribuição.

M0 e M1 têm entregas verificáveis, mas não devem ser marcados integralmente
concluídos enquanto fonte, Android e demais gates de preservação estiverem pendentes.

## Reprodução e rollback

Comandos em `audit/README.md`. Não executar `app/preparar.sh` nem instalar APK
para reproduzir esta auditoria. Os testes usam perfis descartáveis e nenhuma
informação real de usuário. PNGs/backups ficam fora do Git e de artefatos públicos.
Reverter os commits desta branch restaura o estado anterior do código; nenhum
rollback de dados/produção é necessário, pois não foram tocados. Não reativar
publicação automática de debug como parte de uma entrega futura.

Mudanças para web: nenhuma nos arquivos executados pelo PWA.
Mudanças para APK: apenas preparo/CI de futuras compilações; APK distribuído intacto.
Execução local final: **13/13 contratos, 23/23 comparações visuais (zero pixels
alterados), 5 cenários funcionais e zero erros JavaScript**. Chromium
156.0.8078.79, Node 24.22.1, Linux, renderização por software/sRGB. Também passaram
`bash -n app/preparar.sh` e `git diff --check`. Evidência estruturada sem dados
operacionais: `audit/evidence-2026-11-08.json`. A CI usa Node 22 e o Chromium
fixado pelo Playwright; seu status remoto deve ser avaliado separadamente.
Uma execução intermediária teve ruído de 44 pixels (delta 1); foi rejeitada pela
tolerância. Em vez de ampliá-la, fixou-se renderização por software/sRGB; a
execução final passou sem diferenças. A evidência não valida Android físico.
