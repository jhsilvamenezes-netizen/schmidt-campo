# Design 4.0 — plano e andamento

Princípio: nada do que funciona pode quebrar. O 4.0 nasce atrás de uma chave (Mais → Design 4.0), é comparado lado a
lado com o atual e só vira padrão com aprovação do proprietário.

## Etapas

| Etapa | Conteúdo | Situação |
|---|---|---|
| 4.0-a | Rede de segurança: comparação de imagens (`audit/app3-visual-browser.mjs`, 24 telas, limite 0,2% de pixels, CLS ≤ 0,05), orçamento de tamanho (`audit/budget.test.mjs`); tokens OKLCH em 3 camadas (`src/app3/tokens4.mjs`) com teste WCAG 2 + APCA, ordem dos tons e daltonismo (`audit/tokens4.test.mjs`) | Feito (3.18) |
| 4.0-b | Componentes tonais (`src/app3/styles-4.css`): pílulas com toque ≥ 48 px, elevação tingida, números com algarismos de largura fixa, menu com cápsula cheia; vitrine no menu | Feito (3.18) |
| 4.0-c | Folha sobre o mapa com 3 alturas (baixa 34%, meia 56%, cheia) e alça arrastável (gesto rápido = próxima altura); guia de moto (≥ 9 km/h) com distância de 56–72 px | Feito (3.18) |
| 4.0-d | Cartografia: textura de plantio, sombra do talhão, alfinetes numerados, halos; desenho híbrido SVG + Canvas | Próxima |
| 4.0-e | Movimento (View Transitions com alternativa), vibração por padrões nomeados, Web Share com arquivo, tela travada em pé na guia | — |
| 4.0-f | 4.0 vira padrão; o atual fica uma versão como reserva; satélite sem internet só com decisão do proprietário | — |

## Garantias de cada etapa

- Teste do GitHub verde (inclui comparação de imagens e orçamento).
- As 16 telas do design atual idênticas à referência enquanto o 4.0 estiver em prévia.
- axe 0 falhas e alvos de toque ≥ 44 px nos dois designs (`DESIGN=4 node audit/levantamento-tela.mjs`).
- 2.5 (legado) intocada; motor sem mudança.

## Atualizar referências de imagem

Só quando a mudança visual é intencional: `cd audit && node app3-visual-browser.mjs --update` (ou apagar os PNG da tela
que mudou e rodar de novo). A referência vale para a versão do navegador gravada em `audit/visual/meta.json`.
