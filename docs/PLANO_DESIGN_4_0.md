# Design 4.0 — plano e andamento

Princípio: nada do que funciona pode quebrar. O 4.0 nasce atrás de uma chave (Mais → Design 4.0), é comparado lado a
lado com o atual e só vira padrão com aprovação do proprietário.

## Etapas

| Etapa | Conteúdo | Situação |
|---|---|---|
| 4.0-a | Rede de segurança: comparação de imagens (`audit/app3-visual-browser.mjs`, 24 telas, limite 0,2% de pixels, CLS ≤ 0,05), orçamento de tamanho (`audit/budget.test.mjs`); tokens OKLCH em 3 camadas (`src/app3/tokens4.mjs`) com teste WCAG 2 + APCA, ordem dos tons e daltonismo (`audit/tokens4.test.mjs`) | Feito (3.18) |
| 4.0-b | Componentes tonais (`src/app3/styles-4.css`): pílulas com toque ≥ 48 px, elevação tingida, números com algarismos de largura fixa, menu com cápsula cheia; vitrine no menu | Feito (3.18) |
| 4.0-c | Folha sobre o mapa com 3 alturas (baixa 34%, meia 56%, cheia) e alça arrastável (gesto rápido = próxima altura); guia de moto (≥ 9 km/h) com distância de 56–72 px | Feito (3.18) |
| 4.0-d | Cartografia: ~~textura de plantio~~ (retirada na 4.0.0: o plantio não segue o rumo dos tiros), sombra mais funda do talhão, halo dourado nos pontos (mais forte no selecionado). Alfinetes e desenho SVG + Canvas descartados: alfinete desloca o número do ponto exato e conflita com as medidas; o desenho atual já fica abaixo de 200 ms (1.18) | Feito (3.27) |
| 4.0-e | Movimento: troca de aba com View Transition só no conteúdo (alternativa: a animação de antes), alvo da guia pulsando, tela em pé na guia (onde o aparelho deixa), vibrações com nome (`VIBRA`); Web Share com arquivo já existia (Enviar, GPS). Tudo some com "reduzir movimento" | Feito (3.27) |
| 4.0-f | 4.0 vira padrão; o visual anterior fica uma versão como reserva (Mais → Visual anterior) | Feito (4.0.0) |

## Garantias de cada etapa

- Teste do GitHub verde (inclui comparação de imagens e orçamento).
- As 16 telas do design atual idênticas à referência enquanto o 4.0 estiver em prévia.
- axe 0 falhas e alvos de toque ≥ 44 px nos dois designs (`DESIGN=4 node audit/levantamento-tela.mjs`).
- 2.5 (legado) intocada; motor sem mudança.

## Atualizar referências de imagem

Só quando a mudança visual é intencional: `cd audit && node app3-visual-browser.mjs --update` (ou apagar os PNG da tela
que mudou e rodar de novo). A referência vale para a versão do navegador gravada em `audit/visual/meta.json`.

## 4.0-f · critério de aprovação (proprietário, 20/11): empatar ou ganhar em cada medida

Medido com `audit/design-compare.mjs`, sem tolerância. O script cobre 5 telas (Lotes, Mapa, Plano, Monitorar, menu)
em 4 situações (claro, escuro e Sol a 390 px; claro a 360 px).

| Medida | Visual anterior | 4.0 |
|---|---|---|
| Falhas do axe | 2 (escuro: Monitorar, menu) | 0 |
| Menor contraste de texto (WCAG) | 5,2 a 6,3 | 5,6 a 8,1 |
| Textos abaixo do mínimo de contraste | 0 | 0 |
| Textos cortados (reticências) | 1 (95% do lote, 360 px) | 0 |
| Fonte mínima | 12 px | 13 px |
| Alvos de toque < 44 px | 0 | 0 |
| Área do mapa no Mapa | 66,4% | 66,5% |
| Área do mapa no Plano e no Monitorar | 29,6% | 37,1% |
| Rolagem lateral | não | não |

O que precisou mudar para o 4.0 não perder em nada:
- cabeçalho 60 → 58 px e menu 68 → 64 px, como antes;
- resumo do Mapa na mesma altura de antes;
- medidas do Plano: margem interna 8 px, número que se ajusta à tela, rótulo que quebra linha, números alinhados pela base;
- troca de aba com View Transition retirada: bloqueava o toque por ~0,2 s.

A régua de "textos cortados" mede a largura real do texto, porque o scrollWidth não vê as reticências. Na primeira
versão do script, o corte no Sol escapou; isso foi corrigido.
