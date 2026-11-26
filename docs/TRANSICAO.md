# Transição: SCHMIDT Campo de ponta a ponta

Para quem vai assumir ou ajudar no projeto (pessoa ou outra IA). Atualizado em 26/11/2026, versão 4.9.0.

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
  - `index.html` da raiz é a 4.x. As versões até a 2.5 saíram na 4.9 e ficam só no histórico do Git.
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
| `src/dados/` | `lotes.json` (51 lotes) e `safra.json`: os dados que entram no app | Só com dado conferido |
| `src/engine/boundary.mjs`, `src/application/block-planning.mjs` | Contorno e planejamento em bloco (vieram da 2.x; a 4.x usa) | Sim, com testes |
| `src/platform/` | Trava entre abas e modelo do service worker | Com cuidado |
| `audit/` | Testes (`npm test`, `npm run test:browser`), referências de imagem (`visual/`) e resultados gravados (`gravado/`) | Sim |
| `scripts/` | `build-3.mjs` (build) e `bundle-engine.mjs` | Sim |
| `docs/` | Só documentos vivos (lista no `PAINEL.md`) | Sim |

## 3. De onde vêm os dados
- `scripts/build-3.mjs` (`build3`) lê os **dados dos 51 lotes e da safra** de `src/dados/lotes.json` e
  `src/dados/safra.json` (os mesmos bytes que vinham da 2.5; o `index.html` saiu idêntico na troca).
- Cada lote tem:
  - geometria em metros (UTM 23S, relativa ao centroide);
  - área oficial;
  - **rumo da planilha** (`bearing`) e a correção de grade;
  - pontos A e B;
  - código e fazenda.
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
  - Formato herdado da 2.x; a 4.x preserva o que não usa (quem tinha dados da 2.x abre igual).
- **Segurança:** CSP por hash. Nada de `style=` inline (o build reprova). Imagens só de `services.arcgisonline.com`
  (satélite opcional, desligado por padrão).
- **Sem internet:**
  - `sw.js` guarda `index.html`, `motor.js`, o manifesto e a fonte.
  - Versão nova fica esperando e só entra quando a pessoa toca em "Atualizar".

## 6. Testes e CI
```
npm --prefix audit ci
node scripts/build-3.mjs --check
npm --prefix audit test               # motor, guia, blocos, arquitetura, tipos, qualidade dos 51 lotes
npm --prefix audit run test:browser   # telas no navegador, contraste, 16 imagens de referência, acessibilidade (axe)
```
- Destaques:
  - `engine-quality.test.mjs`: retrato dos 51 lotes; qualquer piora reprova.
  - `app3-planner.test.mjs`: regras do motor e da guia; recomendação base = `audit/gravado/recomendacao-base.json`
    (mudou de propósito? regravar o arquivo no mesmo PR, com o porquê).
  - `app3-arquitetura.test.mjs`: camadas e ciclos.
  - `app3-visual-browser.mjs`: pixels e estrutura das telas (`--update` regrava).

| CI (`.github/workflows/testes.yml`) | O que roda |
|---|---|
| `validacao` | Build conferido e `npm test` |
| `blocos` | `npm run test:browser` |
| GitHub Pages | Publica a raiz da `main` a cada merge |

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
- Nada de segredo nem de identificação de modelo de IA nos commits.

---

## 9. Dúvidas de 25/11 (situação em 26/11)
- **A e B (`browser.mjs`, `legado/`):** encerradas na 4.9. A 2.5, o `browser.mjs` e os demais testes dela saíram; a 4.x
  é testada pelos `audit/app3-*-browser.mjs`, sem objeto global no bundle.
- **C:** a contagem de testes está no próprio CI; o histórico fica em `VERSAO.json` e `docs/LEVANTAMENTO_3_9.md`.
- **D:** um erro 500 do GitHub numa republicação não é erro do projeto; o merge seguinte publica de novo.
- **E:** atualizações de segurança do Dependabot: sim. PR #74: tirar o `ci.yml` (duplica `testes.yml`); `codeql.yml`
  pode ficar. Atualizar o Playwright troca o Chromium: regravar as imagens (`app3-visual-browser.mjs --update`).
- **F (prioridades):** guia no sol e na moto; traços sobre o satélite; nada cortado a 360 px; leitor de tela na guia.
