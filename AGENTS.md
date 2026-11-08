# AGENTS.md — SCHMIDT Campo / Codex

## Escopo e fonte de verdade
Você está trabalhando no projeto SCHMIDT Campo (PWA GitHub Pages e APK Android via Capacitor). Leia primeiro README.md, .github/workflows/app-android.yml, app/preparar.sh, app/package.json, manifest.webmanifest, sw.js e a Issue #1. Esta branch é somente de auditoria e evolução segura; não publique Releases, não modifique a branch main nem execute alteração irreversível sem critérios de aceite.

O index.html versionado na raiz é um **artefato compilado**; o README menciona `npm run build && npm run pacote-web`, mas os scripts/fontes geradores não constam na raiz deste repositório. **Não refatore o bundle minificado como se fosse o código-fonte original.** Procure o projeto-fonte, identifique sua origem e documente a falta se não estiver disponível.

## Prioridade P0 (obrigatória)
1. **Assinatura comprometida para confiança pública**: app/chave/schmidt-debug.keystore está no histórico público e app/preparar.sh o instala como debug.keystore. Nunca reutilize essa chave como mecanismo seguro de distribuição; não faça upload de uma chave de produção nem imprima segredos. A retirada do arquivo do HEAD não apaga o histórico. Proponha gestão de nova chave via GitHub Secrets e processo de migração.
2. Uma assinatura nova **pode exigir desinstalação** para instalações atuais. Planeje backup/exportação, teste restauração e comunique o risco de perda de dados. Não afirmar que atualização por cima funcionará nesse caso.
3. GitHub Actions publica assembleDebug diretamente em Release após push em main. Desacoplar build de teste de publicação de produção; introduzir gates, testes reais, assinatura release privada, checagem de integridade e versionCode monotônico. Não criar release de produção sem credenciais corretas.
4. Não exponha mais informações de fazendas, KML ou coordenadas ao público sem avaliar necessidade: o repositório e o Pages são públicos.

## Qualidade de engenharia
- Preservar todas as funcionalidades atuais (51 lotes, mapa, tiros, pontos, monitoramento, GPS, importação/exportação, offline, APK).
- Introduzir ferramentas e dependências somente quando justificadas; priorizar mudanças incrementais, determinísticas e testadas.
- Validar geometrias históricas 2024/25 separadamente da safra 2026/27. Lotes com alertas explícitos: BD3, BD4, RA9, RB8, RC8, P6. Divergências de área: P1, P2, P4, P5 e P6. Não substituir valores sem identificar área oficial vs geométrica vs operacional.
- Testar todos os 51 lotes, distâncias/geometrias, projeção de coordenadas, GPS com mocks, armazenamentos, backup e migração, exportação GPX/KML e paridade web/Android.
- Testar cache offline e atualização de service worker sem descartar registros.
- Revisar interface mobile do mapa e Modo Campo somente após cenários e critérios de aceitação. Diferenciar simulação de informação operacional homologada.

## Fluxo
- Trabalhar somente em branch de desenvolvimento e PR.
- Criar mudanças pequenas com testes, relatório de impacto e meios de reproduzir.
- Validar o que for realmente executado; diferenciar testes automatizados de testes físicos ainda pendentes.
- Registrar problemas bloqueantes (fontes ausentes, segredos, aprovação, riscos de migração), continuar tarefas independentes.
- Não lançar APK automaticamente durante auditoria; não tocar na assinatura antiga sem um plano concreto de preservação dos dados.

## Entrega
Para cada PR: resumo, evidências, testes executados/resultados, riscos de regressão, procedimento de rollback e mudanças para web/APK. A Issue #1 é o backlog principal; atualizar seu checklist e referenciá-la nos PRs.