# AGENTS.md — SCHMIDT Campo / Codex

## DIRETRIZ INEGOCIÁVEL DO PROPRIETÁRIO — CONGELAMENTO TOTAL DA INTERFACE (08/11/2026)

**A partir desta data, está PROIBIDA qualquer alteração visual, estética ou estrutural da experiência existente até autorização explícita e posterior do proprietário.** Esta regra prevalece sobre qualquer diretriz genérica de modernização, usabilidade ou redesign neste documento, na Issue #1 e em prompts anteriores.

- **Preservar exatamente como está**: layout, organização/hierarquia das telas, menu e navegação, mapa e sua apresentação, cores, fontes, tamanhos, ícones, botões, espaçamentos, rótulos visíveis, CSS, comportamento visual, fluxos e telas do PWA e APK.
- **Permitido sem aprovação visual prévia**: auditoria; recuperação/versionamento de código-fonte; melhorias internas de arquitetura e manutenção; correções de segurança, assinatura e CI/CD; testes; verificações matemáticas e espaciais; validação de dados; backups; performance *sem mudança perceptível de UI*; correções de persistência/erro *que não mudem a apresentação ou o fluxo*. Continuar exigindo PR e testes e pedir aprovação para operações destrutivas ou publicação em produção.
- **Se uma correção funcional inevitavelmente alterar algo visual ou o fluxo**, NÃO implementar essa parte. Registrar problema, causa, impacto, alternativas e dependência de autorização; seguir com tarefas independentes.
- **Qualquer proposta de interface futura deve seguir ordem obrigatória**: (1) apresentar diagnóstico e objetivos; (2) gerar uma ou mais **imagens de prévia/projeção visual** das telas ou estados afetados, identificadas como simulação e sem tocar no site/APK; (3) apresentar comparação com a aparência atual e descrever precisamente o que mudaria; (4) aguardar aprovação expressa do proprietário para **a proposta específica**; (5) só então implementar em branch isolada, mostrar capturas do resultado e rodar testes de regressão antes de pensar em merge.
- **Silêncio não é autorização.** Aprovar uma proposta não autoriza alterações visuais diferentes, nem a publicação automática. Não usar "correção de UX", "refatoração" ou "melhoria técnica" como justificativa para modificar telas implicitamente.
- **Evidência de conservação**: obter screenshots de referência da versão 1.31.0 em resoluções móveis relevantes (ex.: 360, 390, 412 e 768 px, onde viável) e comparar com a candidata em mesmo estado/dados; configurar testes de regressão visual/golden screenshots e conferir diferenças. Na ausência de reprodução idêntica, registrar limitação e exigir revisão manual.
- **Não modificar `main`, a página publicada, nem criar Release/novo APK de distribuição sem validação e autorização do proprietário.**

### Sequência aprovada para esta fase (SEM ALTERAR VISUAL)
1. **Marco 0 — Preservação:** baseline de código/dados/versões e método de comparação do visual atual; checklist de funcionalidades.
2. **Marco 1 — Segurança e dados:** diagnóstico do keystore público, CI de teste sem publicação, plano de assinatura segura e exportação/restauração antes da migração.
3. **Marco 2 — Engenharia:** encontrar fonte geradora verdadeira, lockfiles e testes automatizados, estabilidade e desempenho de execução sem mudanças na interface.
4. **Marco 3 — Qualidade espacial e GPS:** verificar 51 lotes e alertas, parâmetros/projeções, navegação/GPS e dados locais; corrigir somente o que não provocar mudança visual, reportar bloqueios.
5. **Marco 4 — Entrega controlada:** PRs com evidências, plano de rollback; aprovação específica antes de merge ou distribuição.
6. **Marco visual futuro (bloqueado):** apenas conceito e imagens para validação, sem implementação até novo comando expresso.

## Escopo e fonte de verdade
### Continuidade com P6 preservado — 09/11/2026

Após a explicação da divergência, o proprietário determinou: “Pode seguir
porque estava dando certo pessoal fazer,depois eu ajeito se precisar essa
questão”. Preservar a configuração/referência operacional atual do P6, sem
alterar rumo/A/B ou introduzir bloqueio novo ao uso individual. A revisão da
divergência fica adiada, sem declarar homologação e sem bloquear os demais
lotes ou o estudo BB1/BC1. Não escolher uma direção nova automaticamente.
Isso não implanta o modo bloco nem autoriza mudanças visuais diferentes das
projeções aprovadas. Registro: `docs/CONTINUIDADE_P6_E_FASE_COMUM.md`.

### Confirmação de publicação do payload — 09/11/2026

Em resposta direta à pergunta que identificou o HTML da entrega 1.31.0-r1,
suas coordenadas/geometrias/dados agrícolas e os destinos públicos (este
repositório e seu Pages), o proprietário respondeu: **“Pode fazer oque precisar”**.
Prosseguir com envio, PR/CI e publicação web da candidata já aprovada, mantendo
os mesmos dados públicos. O envio do blob foi aceito após essa confirmação.
Não publicar anexos privados, chaves ou APK sem a migração preparada. Blocos,
recuo obrigatório e a validação nova dos parâmetros continuam estudos isolados.

### Entrega autorizada pelo proprietário — 09/11/2026

O proprietário pediu continuar as correções necessárias, confirmou a barra de
36,48 m e determinou: “apos isso imolemnye ao link e apk as mudanças necessárias”.
Essa ordem posterior autoriza enviar a candidata ao mesmo repositório
`jhsilvamenezes-netizen/schmidt-campo` e atualizar o Pages
`https://jhsilvamenezes-netizen.github.io/schmidt-campo/` por PR/main após os
gates de validação, com os mesmos dados já públicos. Não ampliar a exposição de
anexos privados. As restrições anteriores de publicação são históricas para
esta entrega expressamente autorizada; preservar revisão e recuperação dos dados.

O proprietário informou não possuir a chave do APK instalado. Preparar build
release isolado; não fingir atualização por cima, distribuir debug ou reutilizar
a chave exposta. Distribuição Android depende de uma identidade privada estável
e do procedimento de backup/migração; não desinstalar nem apagar dados.

### Implementação posterior autorizada — Plano essencial (09/11/2026)

Após as projeções comparadas e o pedido de manter distâncias em destaque e
retirar textos históricos, o proprietário determinou: “Pronto vamos por em
pratica”. Implementar na branch o painel Plano da prancha de informação
essencial, junto da limpeza textual já discutida, preservando Desfazer e erros.
Referência: `/workspace/generated_images/exec-f6ef9652-edea-4b15-8758-cccb82205e8f.png`
e `docs/INFORMACAO_ESSENCIAL_PLANO.md`. A paleta e fonte atuais permanecem;
outras telas, métodos, mapas, merge, Pages e APK não integram esse aceite.

### Exceção posterior autorizada em 09/11/2026 — somente Plano

Após as projeções comparativas apresentadas na conversa, o proprietário respondeu:
“Oque for de fato melhorar pode fazer,desde que faça sentido e vale a pena e ou nao vai deixar nada confuso”.
O escopo apresentado para esse aceite foi organizar a etapa inicial de **Plano**:
hectares por ponto e pessoas primeiro; quantidades/distâncias do plano em uso
juntas; desenho e ajustes secundários recolhidos; equipe e calibração perceptíveis.
Implementar somente essa organização na branch de auditoria, com capturas e
regressões. Não autoriza outras telas, cálculos, mapas, navegação, merge ou
publicação. Registro: `audit/visual-approval-2026-11-09.json`.

### Diretriz posterior — informação essencial (09/11/2026)

O proprietário reforçou que as distâncias entre tiros e entre pontos devem
permanecer bem visíveis e pediu retirar observações sobre padrões antigos/novos
e mudanças do software que poluam a operação. Nos refinamentos do Plano,
priorizar valores efetivos do cenário em uso e recolher conteúdo secundário.
Preservar recuperação/Desfazer, validação e pendências que influenciem a tarefa.
O registro da revisão e a prévia simplificada estão em
`docs/INFORMACAO_ESSENCIAL_PLANO.md`. Isso não autoriza publicação ou mudanças
de método, e não implica criar uma barra fixa global em outras telas.

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
- **Somente auditar** a interface mobile do mapa e Modo Campo, sem alterar CSS, telas, textos ou fluxos; registrar propostas para aprovação visual futura. Diferenciar simulação de informação operacional homologada apenas sem mudar o visual atual.

## Fluxo
- Trabalhar somente em branch de desenvolvimento e PR.
- Criar mudanças pequenas com testes, relatório de impacto e meios de reproduzir.
- Validar o que for realmente executado; diferenciar testes automatizados de testes físicos ainda pendentes.
- Registrar problemas bloqueantes (fontes ausentes, segredos, aprovação, riscos de migração), continuar tarefas independentes.
- Não lançar APK automaticamente durante auditoria; não tocar na assinatura antiga sem um plano concreto de preservação dos dados.

## Entrega
Para cada PR: resumo, evidências, testes executados/resultados, riscos de regressão, procedimento de rollback e mudanças para web/APK. A Issue #1 é o backlog principal; atualizar seu checklist e referenciá-la nos PRs.
