# Transição: SCHMIDT Campo de ponta a ponta

Para quem vai assumir ou ajudar no projeto (pessoa ou outra IA). Escrito em 25/11/2026, versão 4.2.0.

Ordem de leitura:
1. `docs/PAINEL.md`: estado e regras do proprietário.
2. Este arquivo.
3. `docs/ARQUITETURA_3.md`: camadas.
4. `docs/LEVANTAMENTO_3_9.md`: cada decisão medida, numerada.

O código é a fonte da verdade. Se este texto divergir dele, vale o código.

---

## 1. O que é
- PWA (app web instalável) que **planeja a amostragem de solo** em 51 lotes de duas fazendas (Bananal e Rio de Janeiro)
  e **guia a equipe no campo por GPS**.
- Funciona sem internet depois de aberto uma vez.
- Publicado no GitHub Pages: `https://jhsilvamenezes-netizen.github.io/schmidt-campo/`.
  - `index.html` da raiz é a 4.x.
  - `legado/` é a 2.5 congelada.
- **Método:** linear. Os **tiros** são retas que a pessoa caminha, paralelas ao rumo do pulverizador e espaçadas em
  múltiplos da barra (36,48 m). Os **pontos** ficam sobre os tiros.
- A quantidade de pontos vem da regra "1 ponto a cada N ha", arredondada para cima.
- Tudo é **simulação**: o ponto final é o que a equipe marca em campo.

## 2. Mapa do repositório
| Pasta / arquivo | O que é | Pode mudar? |
|---|---|---|
| `index.html`, `motor.js`, `sw.js` (raiz) | App publicado: arquivo único e gerado, mais o worker do motor e o service worker | **Só pelo build** (`node scripts/build-3.mjs --root`) |
| `VERSAO.json` | Versão, SHA-256 dos 3 arquivos publicados e lista do que entrou em cada versão | A cada versão |
| `src/engine3/` | Motor 4.x: geometria, tiros, pontos, cobertura exata (Voronoi), otimização, equipe e rota | Sim, com testes |
| `src/app3/` | Tela 4.x: serviços sem DOM (planner, monitor, map, views-*) e telas (`screen-*`, `main`) | Sim |
| `src/gps/` | Política do fix de GPS e próximo ponto | Sim |
| `src/engine/`, `src/application/block-planning.mjs`, `legado/` | Motor e tela da 2.5, **congelados** | **Não** (`build-preserved --check` reprova) |
| `src/persistence/`, `src/platform/` | Sessão, trava entre abas e adaptadores do navegador. Parte é usada pelo legado | Com cuidado |
| `app/` | Casca Android (Capacitor) e `package.json` próprio | Raramente |
| `audit/` | Todos os testes e auditorias, com `package.json` e Playwright | Sim |
| `scripts/` | `build-3.mjs` (build da 4.x), `build-preserved.mjs` (confere ou monta a 2.5), `bundle-engine.mjs`, `checkpoint.mjs` | Sim |
| `docs/` | Decisões, painel, design e esta transição. Cerca de 90 arquivos são histórico | Sim |
| `icone*` (raiz) | Ícones da 2.5 e do APK | **Não** |

## 3. De onde vêm os dados
- `scripts/build-3.mjs` (`build3`, linha ~70) lê os **dados dos 51 lotes e da safra de dentro de `legado/index.html`**,
  nos blocos `fields-data` e `safra-dados`.
- Cada lote tem:
  - geometria em metros (UTM 23S, relativa ao centroide);
  - área oficial;
  - **rumo da planilha** (`bearing`) e a correção de grade;
  - pontos A e B;
  - código e fazenda.
- **Por isso `legado/` não pode sair.** Ela é a fonte dos dados, além de ser a reserva da 2.5.
- O build ainda gera `recs-data`: a recomendação de cada lote para a regra padrão (5 pessoas), calculada na hora do
  build (`recsData`, linha ~57). Inclui a linha pronta da aba Lotes (4.2). Assim o celular não recalcula nada ao abrir.

## 4. A lógica do motor, passo a passo
| Passo | Onde | O que faz |
|---|---|---|
| 1. Parâmetros | `engine3/params.mjs`, `paramCatalog.mjs` | Valores padrão e faixas (ha por ponto, espaçamento, fase, margem…). Fora da faixa é recusado com aviso |
| 2. Tiros | `engine3/tracks.mjs` (`trackFrame`, rumo + correção de grade) | Retas paralelas ao rumo, a k passadas da barra, com fase a partir do ponto A |
| 3. Recorte | `engine3/clip.mjs` | Corta cada reta no contorno do lote (lote com buraco ou em partes vira trechos) |
| 4. Quantos pontos | `engine3/allocation.mjs` | Mínimo = ceil(área/ha por ponto). Reparte pelos tiros conforme o comprimento |
| 5. Onde no tiro | `engine3/sampling.mjs` (`positions`, `shiftedPositions`) | Espaçamento regular ao longo do trecho |
| 6. Plano básico | `engine3/plan.mjs` (`planCore`) | Junta 2 a 5 |
| 7. Plano equilibrado | `engine3/scenario.mjs` (`buildScenario`, ~110) | Desliza os pontos dentro do tiro (`optimize.mjs`) se o "95% do lote" melhorar ≥ 2%, **sem nunca aumentar o maior vazio exato** |
| 8. Guarda da bordadura | `scenario.mjs` (`borderGuard`, ~88) | Ponto a menos de 15 m da borda: o trecho desliza inteiro, com teto de +15% no maior vazio (4.0.2) |
| 9. Medidas | `engine3/metrics.mjs` (`coverage`), `voronoi.mjs` (`exactCoverage`) | "95% do lote" (p95 da distância ao ponto mais perto, em grade fina) e maior vazio **exato** (Voronoi recortado) |
| 10. Recomendação | `engine3/recommend.mjs` (`recommendPlan`) + `app3/planner.mjs` (`recommend`, `balanceSteps`) | Escolhe o espaçamento. Depois testa fases e espaçamentos vizinhos para igualar a área de cada ponto, sem piorar a cobertura (p95 ≤ +3%, maior vazio nunca maior, caminhada ≤ +10%). A bordadura desempata |
| 11. Sugestões | `planner.mjs`: `minimaxEdits`, `plusOne`, `plusOneHere` | "Distribuir melhor os pontos" (encurta o maior vazio) e "Ponto no maior vazio" (+1 ponto onde mais falta). Rodam no worker |
| 12. Equipe | `engine3/team.mjs` (`teamPlan`) | Reparte os tiros entre as pessoas. Na mesma pessoa, a ordem serpentina minimiza a caminhada |
| 13. Rota e guia | `engine3/guidance.mjs` (`buildRoute`); `app3/monitor.mjs` (`guideModel`, `nearEndFlipped`, `speedStep`, `modeStep`, `courseStep`, `guideAlerts`) | Ordem dos pontos no tiro, a ponta mais perto, distância andando, moto ou a pé, vibração e voz, e o rumo do deslocamento para girar o mapa |

O motor (`engine3`) não conhece a tela. A tela chama o motor por `planner.mjs` (plano) e `monitor.mjs` (guia).

## 5. A tela
- **4 abas:** Lotes, Mapa, Plano e Monitorar. Mais o menu "Mais": glossário, dados do lote, como foi calculado e todos os lotes.
- `main.mjs` (`startApp`) monta o estado e escolhe a recomendação:
  - pronta do arquivo, quando a regra é a padrão;
  - senão, calculada no `motor.js` (Web Worker).
- `render()` redesenha a aba. `drawMaps()` desenha os mapas SVG (`map.mjs`, `mapMarkup`).
- Guia com o mapa seguindo (4.1):
  - pinça de 0,25× a 12×;
  - "rumo para cima" gira o mapa pelo rumo do GPS ou da bússola, com os textos em pé.
- **Estado salvo** em `localStorage['monitoramento.v03']`:
  - lote, parâmetros e ajustes por lote, pessoas, modo Sol e camadas.
  - É o mesmo formato da 2.x, e a 4.x preserva o que não usa.
- **Segurança:** CSP por hash. Nada de `style=` inline (o build reprova). Imagens só de `services.arcgisonline.com`
  (satélite opcional, desligado por padrão).
- **Sem internet:**
  - `sw.js` guarda `index.html`, `motor.js`, o manifesto e a fonte.
  - Versão nova fica esperando e só entra quando a pessoa toca em "Atualizar".

## 6. Testes: o que existe e quanto
Bateria completa (a mesma do CI, job `blocos`):
```
node scripts/build-3.mjs --check && npm --prefix audit test && npm --prefix audit run test:blocks \
 && node audit/checkpoint.test.mjs && node scripts/build-preserved.mjs --check && cd audit \
 && python3 contraste-paleta.py && node app3-browser.mjs && node app3-robust-browser.mjs \
 && node app3-map-measures-browser.mjs && node app3-perf-browser.mjs && node app3-monitor-browser.mjs \
 && node migration-browser.mjs && node --test tokens4.test.mjs budget.test.mjs && node app3-visual-browser.mjs
```

Contagem em 25/11 (4.2.0):

| Grupo | Quantidade |
|---|---|
| Testes `node:test` aprovados | **195** |
| Suítes de navegador (Playwright) | **7** |
| Telas comparadas por imagem | **16** |
| Contratos em `npm test` | 4 scripts |

- O `npm test` sozinho (4 contratos de preservação) não é o total.
- Destaques:
  - `engine-quality.test.mjs`: retrato dos 51 lotes; qualquer piora reprova.
  - `app3-arquitetura.test.mjs`: camadas e ciclos.
  - `app3-planner.test.mjs`: regras do motor.
  - `app3-visual-browser.mjs`: pixels e estrutura das telas.

## 7. CI e publicação
| Workflow | Job | Quando | O que roda |
|---|---|---|---|
| `.github/workflows/blocos-candidata.yml` | `blocos` | Todo PR | A bateria acima. Depois monta a 2.5 na raiz (só no CI) e roda os testes da tela antiga |
| `.github/workflows/app-android.yml` | `validacao` | Todo PR | `npm test` e checagens da 2.5 e do APK, incluindo `audit/browser.mjs` com a 2.5 na raiz |
| GitHub Pages (`pages build and deployment`) | — | Push em `main` | Publica a raiz da `main` (pasta `/`) |

Publicar uma versão:
1. Subir `APP_VERSION` (`scripts/build-3.mjs`) e `ENGINE_LABEL` (`src/app3/planner.mjs`).
2. Rodar `node scripts/build-3.mjs --root`.
3. Atualizar `VERSAO.json` (hashes e nota).
4. Rodar a bateria.
5. Abrir o PR.
6. Com o CI verde, fazer o merge.
7. Conferir se os hashes em `main` batem com o `VERSAO.json`.

## 8. Regras que não se discutem
- Estão em `docs/PAINEL.md`: método linear, P6, rumo da planilha, bordadura (41 ideal, 15 mínimo), tiro por qualquer
  ponta, tiro de 1 ponto só no bico, não inventar dado e não inferir divisa.
- O que não foi conferido aparece como "a confirmar".
- Legado e ícones intocados.
- Nada de segredo nem de identificação de modelo de IA nos commits.

---

## 9. Respostas às dúvidas de 25/11

### A. Teste de navegador `audit/browser.mjs`
- **A1. Nem o app nem o teste estão errados.**
  - `audit/browser.mjs` é o teste da **2.5** (tela antiga), que expunha `window.SCHMIDT`.
  - A 4.x é um módulo fechado e não expõe `SCHMIDT` de propósito.
  - No CI, o workflow `app-android.yml` roda `node scripts/build-preserved.mjs --root` **antes**: isso coloca a 2.5 na
    raiz só dentro do CI, e aí `SCHMIDT` existe.
  - Rodado contra a raiz publicada (4.x), ele falha por desenho.
  - Para rodar localmente:
    ```
    node scripts/build-preserved.mjs --root && npm --prefix audit run test:browser; node scripts/build-3.mjs --root
    ```
    O último comando devolve a 4.x à raiz. Não commitar a raiz com a 2.5.
- **A2.** Não expor nada. A 4.x é testada pelos `audit/app3-*-browser.mjs`, que leem o DOM e o `localStorage`, sem
  objeto global. Nenhum gancho de teste no bundle.
- **A3.** Não trocar as referências de `browser.mjs`. Ele continua testando a 2.5 como está, enquanto a 2.5 existir.

### B. Versão publicada e `legado/`
- **B1.** O Pages serve a raiz da `main`. A versão no ar é a do `VERSAO.json` da `main` (**4.1.0** em 25/11; **4.2.0**
  quando este PR entrar).
  - `legado/index.html` (2.5.0) é a tela antiga, acessível em `/legado/`.
- **B2.** **`legado/` fica, obrigatoriamente:**
  1. o build da 4.x lê dela os dados dos 51 lotes e da safra (`scripts/build-3.mjs`, `build3`);
  2. é a reserva da 2.5 pedida pelo proprietário;
  3. `scripts/build-preserved.mjs --check`, a bateria e o CI (`app-android.yml`, `browser.mjs`) dependem dela.

### C. Documentação
- **C1.** São 195 testes `node:test` + 7 suítes de navegador + 16 telas visuais + 4 contratos (`npm test`).
  - Os 4 que a ferramenta viu são só os contratos.
  - A contagem fica documentada na seção 6 deste arquivo; não precisa de outro lugar.
- **C2.** Não há pendência aberta da 4.0.0.
  - A única condição da 4.0 era o visual anterior ficar de reserva **por uma versão**. Ele foi removido na **4.2.0**,
    com o ok do proprietário (25/11).
  - Registro em `docs/LEVANTAMENTO_3_9.md`, seção 26.
- **C3.** Não criar `CHANGELOG.md`. O histórico já existe em `VERSAO.json` (`incluidoNoRuntime`, uma linha por versão)
  e em `docs/LEVANTAMENTO_3_9.md`. Um terceiro lugar duplicaria e ficaria desatualizado.

### D. Publicação no Pages
- **D1.** O site esteve no ar com a 4.1.0: publicação nº 77, em 24/11, com sucesso.
  - Em 25/11, às 15:53, alguém disparou de novo a publicação do mesmo commit (nº 78). Ela falhou com
    **erro 500 do próprio GitHub** ("Failed to create deployment (status: 500)… Please re-run").
  - Não é erro de build nem de configuração: branch `main`, pasta `/` e `index.html` na raiz estão certos.
  - O próximo merge publica de novo.
  - Se o 404 continuar depois disso, conferir em Settings → Pages se a fonte continua "Deploy from a branch: main /
    (root)". Ela pode ter sido alterada na mesma hora da republicação.

### E. Segurança e automação
- **E1.** Ligar as **atualizações de segurança do Dependabot**: sim. Só abrem PR quando há falha de segurança conhecida
  e o CI testa cada uma.
- **E2. PR #74: revisar antes; não mesclar como está.**
  - **`ci.yml`:** duplica o que já existe.
    - `app-android.yml` já roda `npm test`, e `blocos-candidata.yml` roda a bateria inteira.
    - Além disso usa Node 20, e o projeto usa Node 22.
    - Recomendação: **tirar `ci.yml`**.
  - **`codeql.yml`:** pode ficar. É barato e útil. Pode ser preciso excluir `legado/` e `build/` da análise para evitar
    alertas da 2.5 congelada.
  - **`dependabot.yml`:**
    - Manter `github-actions` e `npm` em `/audit`.
    - Em `/app` (Android), pôr intervalo mensal: mexe no APK e pede teste no aparelho.
    - Atenção: atualizar o Playwright em `/audit` troca a versão do Chromium. Aí a comparação de imagens passa a
      conferir só a estrutura até as referências serem regravadas (`node app3-visual-browser.mjs --update`).
- **E3.** O `ci.yml` e o `codeql.yml` já estão no PR #74 (commit `91285b1`). O que falta é decidir o conteúdo (E2), não
  o escopo do token.
  - Qualquer mudança em `.github/workflows/` exige o escopo `workflow` ou a edição pela interface do GitHub.
  - Decisão do proprietário: preferir a interface do GitHub ou o Claude Code (que já publica por PR com o CI verde) a
    ampliar o token da ferramenta.

### F. Decisões gerais
- **F1.** Não corrigir `browser.mjs`: ele está certo para a 2.5 (veja A1). Nenhum branch necessário.
- **F2.** Prioridades além do axe:
  1. **Guia (Monitorar) no sol e na moto:** contraste do modo Sol, alvo de toque ≥ 44 px e texto grande da distância.
     É onde a equipe usa com pressa.
  2. **Mapa com satélite ligado:** contraste dos traços sobre a foto. Já calibrado em 7 fotos reais; manter o teste.
  3. **Celular pequeno (360 px):** nada cortado. Já coberto pelo `app3-visual-browser`.
  4. **Leitor de tela na guia:** o rótulo da bússola e as mensagens `aria-live`.
