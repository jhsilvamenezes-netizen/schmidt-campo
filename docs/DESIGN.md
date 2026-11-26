# Sistema de design 4.0 (1 página)

As regras de toda tela nova. A fonte da verdade é o código: `src/app3/tokens4.mjs` (cores) e
`src/app3/styles-4.css` (componentes). Se esta página e o código divergirem, vale o código.

## Cores: só por papel, nunca hexadecimal solto
As cores são escalas OKLCH de 11 tons cada (do 50 ao 950): mata (verde), ouro, terra (neutro), erro e alerta.

| Papel | Uso |
|---|---|
| `bg` `sf` `sf2` | Fundo da tela, cartão e cartão secundário |
| `ink` `mu` `ln` | Texto principal, texto secundário e linha |
| `br` `act` `on-act` | Marca e ação (botão principal) |
| `hd` `hd-ink` | Cabeçalho |
| `tr` `pt` `ptf` `fl` | Mapa: tiro, ponto, preenchimento do ponto e contorno do lote |
| `ok`/`oks` `al`/`als` `er`/`ers` | Estados de ok, alerta e erro: cor do texto e fundo suave |

O tema escuro e o modo Sol usam os mesmos papéis. No satélite (`.sat-on`), os papéis do mapa são redefinidos.

## Medidas que o CI cobra
- **Contraste:** texto ≥ 4,5:1 (WCAG) e APCA ≥ 60/75; traço do mapa ≥ 3:1 (`audit/tokens4.test.mjs`).
- **Toque:** alvo ≥ 44 px (botão de 48–56 px).
- **Letra:** mínimo de 13 px; número grande fluido, por exemplo `min(18px, 4.6vw)`.
- **Página:** sem rolagem de lado; nenhum texto cortado; o mapa ocupa ≥ 66% na aba Mapa (`audit/design-compare.mjs`).

## Forma
- Cantos: `--r-sm` 12, `--r-md` 16, `--r-lg` 22 e `--r-xl` 28. Pílula: 999 px.
- Exceções a ajustar na próxima versão de tela (hoje com o valor escrito à mão): botão 18 px (sem token);
  menu inferior 22 px (= `--r-lg`); botões do mapa 16 px (= `--r-md`).
- Sombra: só `--e2`. Elevação é sombra; a 4.0 não usa borda de cartão.
- Sem `style=` inline: a CSP é por hash.

## Antes de entregar uma tela
1. Usar só papéis e tokens.
2. Conferir a tela clara, a escura, o modo Sol e a largura de 360 px (`app3-visual-browser`).
3. Rodar `design-compare`: empatar ou ganhar em cada medida.

## Tipografia (5.1)
- Tamanhos: 13 · 14 · 16 · 18 · 20 · 30 px (o número de destaque vai até 36 px em tela larga). Pesos: 400 · 600 · 700; 800 só na marca.
- Títulos de seção em maiúsculas com espaçamento .1em; números grandes −.02em; o resto, o do corpo.
- O teste `app3-browser.mjs` reprova tamanho ou peso fora da escala.
