# SCHMIDT Campo — Baseline imutável para evolução técnica sem mudança visual

**Data de referência:** 2026-11-08  
**Versão de referência:** PWA / APK 1.31.0  
**Branch publicada:** `main` (preservar)  
**Commit de referência:** `a1ad502c315b4b3d484444f9e2734400abd0b72a`  
**Branch de preparação:** `codex/auditoria-evolucao-segura`  
**Backlog e regra de aprovação:** Issue #1 e `AGENTS.md`.

## Contrato de imutabilidade visual (exigência do proprietário)
Não alterar a aparência, estrutura das telas, disposição de elementos, navegação, mapa, controles, textos visíveis, CSS, ícones ou comportamento visual sem nova aprovação explícita. Pode executar melhorias **internas** em branch desde que preservem a apresentação e os fluxos.

**Mudança visual futura:** apenas após (a) diagnóstico, (b) imagens de projeção/mockup da mudança, (c) comparação com a tela original e (d) aprovação expressa para aquele escopo. Imagens são prévias, não implementação.

## Evidências técnicas verificadas na referência
| Item | Evidência |
| --- | --- |
| HTML publicado | `index.html` (blob Git `d96c996b8ba330cd0114ff7a710f7da342535814`); título `SCHMIDT · Planejamento de amostragem v1.31.0` |
| Manifesto PWA | `manifest.webmanifest` (blob `f903f3eb04aea381fa6ea5143903cd5a1a97adbf`) |
| Service worker | `sw.js` (blob `3c626226d82a2c4d76b9a360a4c775ebc66f5865`), cache `schmidt-1.31-394a31b413` |
| APK Release | `app-v1.31.0-11` publicado em 2026-11-07; nome `SCHMIDT-Campo.apk` |
| SHA-256 do APK informado pelo GitHub | `957d74cdab178b6e1f8b79eb62a7b7f9016c2055d5dcdebe24e11e3dc8c2f57e` |
| Workflow atual | `.github/workflows/app-android.yml` executa `assembleDebug` e publica Release em push para `main` |
| Chave antiga | `app/chave/schmidt-debug.keystore` já versionada publicamente; requer plano de substituição e migração antes de disponibilizar APK novo |
| Código-fonte gerador | README menciona `npm run build && npm run pacote-web`, mas esses artefatos originais não estão presentes na raiz publicada. Localizar antes de refatorar. |
| Geometrias | 51 lotes (18 Bananal, 33 RJ); base geométrica histórica 2024/25, não homologada |
| Alertas geométricos | BD3, BD4, RA9, RB8, RC8, P6 |
| Áreas divergentes em dados complementares | P1, P2, P4, P5, P6 |

## Checklist de baseline visual — **PENDENTE DE EXECUÇÃO**
Não afirmar que capturas ou testes visuais foram realizados apenas porque este documento existe.

- [ ] Abrir PWA v1.31.0 com estado inicial limpo; capturar imagens nos tamanhos 360x800, 390x844, 412x915 e 768x1024, conforme dispositivos/alvos suportados.
- [ ] Capturar estados **Mapa**, **Planejamento**, **Tiros**, **Monitoramento** e **Auditoria**, com um lote e configurações representativos e fixos.
- [ ] Capturar estados GPS negado/aproximado/indisponível com simuladores ou mocks, sem exposição de localização real.
- [ ] Registrar ambiente, navegador, escala, data e dataset usado para cada imagem.
- [ ] Capturar fluxo correspondente do APK Android no emulador, quando possível.
- [ ] Configurar comparação visual automatizada com tratamento documentado de diferenças de antialiasing/fontes; confirmar manualmente diferenças reais.
- [ ] Validar 100% de preservação do visual e de fluxos básicos antes de pedir merge.

## Fluxos de regressão (não visuais)
- [ ] Seleção de fazenda/lote; geometria carregada; configuração de tiros; geração/distribuição de pontos; persistência e reabertura.
- [ ] Motor espacial: todos os 51 lotes, projeção, área, distância, pontos fora de polígono, topologia e cenários extremos.
- [ ] GPS simulado: sinal, precisão, permissões, atraso, passagem de ponto, desvio do tiro, pausa/retomada.
- [ ] Backup/restore versionado; importação/exportação GPX/KML; offline + ciclo de atualização PWA.
- [ ] Paridade de regras essenciais entre PWA e APK.
- [ ] CI com testes antes de qualquer Release, assinatura privada e validação de integridade após migração segura.

## Portões de aprovação
1. **Auditoria técnica:** pode executar sem mexer no visual.
2. **Mudança interna em branch:** permitida, com teste e comparação de aparência.
3. **Mudança visual:** bloqueada até imagens apresentadas e aprovação explícita do proprietário.
4. **Merge e publicação:** nenhuma alteração deve atingir `main` ou o APK distribuído sem validação e autorização específica.
5. **Migração de assinatura:** requer documentação, backup/restauração verificados e aceitação do risco de reinstalação; jamais assumir atualização por cima.

## Estado desta etapa
- **Concluído:** identificação da versão publicada, commits e artefatos de referência; documentação das regras de congelamento visual e riscos prioritários.
- **Não concluído:** screenshots de referência, suíte de testes, localização do repositório-fonte completo, migração de assinatura e correção do pipeline. Não marcar etapas posteriores como feitas até evidência verificável.
