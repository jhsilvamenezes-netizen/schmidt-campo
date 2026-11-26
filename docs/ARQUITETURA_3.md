# Arquitetura da 3.x (SCHMIDT Campo)

Mapa curto das camadas. A regra de dependência é de cima para baixo; o teste `audit/app3-arquitetura.test.mjs`
reprova o que fugir dela.

| Camada | Pasta / arquivos | Pode usar | Não pode |
|---|---|---|---|
| Motor (geometria, plano, cobertura, equipe, guia) | `src/engine3/` | só `engine3/` | tela, navegador (document, window…) |
| GPS (política do fix, próximo ponto) | `src/gps/` | `gps/`, `engine3/` | tela, navegador |
| Serviços da tela, sem DOM | `app3/planner.mjs`, `monitor.mjs`, `worker.mjs`, `offline.mjs`, `format.mjs`, `views.mjs` + `views-mapa/plano/monitor/mais.mjs` (HTML em texto, um arquivo por aba), `map.mjs` (SVG em texto), `tokens4.mjs` | motor, GPS | `document.`, `window.`, `navigator.`, `localStorage.` |
| Telas (casca: DOM, eventos, vibrar, falar) | `app3/main.mjs`, `screen-*.mjs` | tudo acima | — |

- **Núcleo funcional, casca imperativa.** A decisão fica nos serviços sem DOM, testados no Node. A tela só executa o efeito.
  - Exemplo da guia: `speedStep` (velocidade), `modeStep` (moto ou a pé), `guideAlerts` (o que vibrar e falar) e
    `nearEndFlipped` (ponta mais perto). Todos estão em `monitor.mjs`.
  - `screen-monitor.mjs` só lê o GPS e a bússola, vibra e fala.
- **Worker.** `app3/worker.mjs` exporta `reply(mensagem)`. O build só liga `onmessage` a essa função, e a mesma função é
  testada no Node, com a resposta igual à do motor direto.
- **Motor direto nas telas.** Só nas exceções listadas no teste: arquivos (GPX/CSV), explicações e cópia de segurança.
  O caminho normal passa por `planner.mjs` (plano) ou `monitor.mjs` (guia).
- **Sem ciclos de importação** em `app3`, `engine3` e `gps`.
- **Sem legado.** A 2.5 saiu na 4.9. `src/engine/boundary.mjs` e `src/application/block-planning.mjs` (vindos da 2.x)
  são usados pela 4.x e evoluem com testes.

## Próximos passos (sem mudar a tela)
1. ~~Dividir `views.mjs` por tela~~ (3.24: `views.mjs` só com as peças comuns, 3 KB; uma aba por arquivo; 24 telas idênticas).
2. Separar em `planner.mjs` a regra do motor (`plusOne`, `middleOnes`, equilíbrio) dos textos da tela.
3. Estado da guia (`mon`) como objeto único do núcleo, com reinício explícito por tiro.
