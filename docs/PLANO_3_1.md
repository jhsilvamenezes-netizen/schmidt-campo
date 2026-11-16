# Plano 3.1 · tiros e pontos mais assertivos, visual profissional, tudo da 2.5 de volta

Pedido do proprietário (16/11/2026): corrigir e trazer tudo o que já existia, bem superior; design menos amador;
mais assertividade em tiros e pontos; nada técnico na tela, só o resultado.

## 1. Varredura (3.0 publicada, 51 lotes, celular)

| Gargalo | Medido | Exemplo |
|---|---|---|
| Ponto colado na borda | 17 pontos em 14 lotes a menos de 15% do lado ideal | BA2: ponto a 14 m da borda |
| Tiro de canto com 1 ponto | 12 tiros em 7 lotes; a pessoa anda 0,1 km e as outras 2 km | BA2 T5, BE1 (3 tiros) |
| Área desigual por ponto (meta 20 ha) | de 5,7 a 31 ha; CV mediano 0,12, pior 0,65 | RB9: 8,5 a 31 ha |
| Mapa sempre com o norte para cima | lote inclinado ocupa metade da tela | BA2, BD3 |
| Rótulos e escala sem regra de colisão | escala sobre o lote em 6 lotes (360 px); rótulo sob ponto | BA2 da foto: T5 sob o 17, T3 sumido |
| Visual | cartões e botões genéricos, pouco contraste de hierarquia | todas as telas |
| Funções da 2.5 que faltam | ajuste manual de pontos, satélite, imagem de fundo, trajeto importado, nomes dos monitores, mancha de área descoberta no mapa, comparar espaçamentos, rumo manual, tiros escolhidos, tema Noite | — |
| Texto técnico na tela | "Como foi calculado", nomes de arquivo, origem do KML | menu Mais e Dados |

## 2. Motor assertivo (A)

Protótipo medido nos 51 lotes, ainda **sem** o critério A5:

| Medida | Hoje | Protótipo |
|---|---|---|
| CV da área por ponto (mediana / pior) | 0,12 / 0,65 | 0,07 / 0,26 |
| Tiros com 1 ponto | 12 | 4 |
| Lotes com ponto colado na borda | 14 | 2 |
| BA2 | 5 tiros, áreas 5,7–22,7 ha | 4 tiros, 13,1–23,3 ha, caminhada 8,6 km |

| Item | O que faz | Critério de aceite |
|---|---|---|
| A1 | Escolhe espaçamento e fase dos tiros pelo equilíbrio da área de cada ponto (Voronoi exato) | CV mediano ≤ 0,08 |
| A2 | Nenhum ponto a menos de 15% do lado ideal da borda | 0 casos nos 51 lotes |
| A3 | Sem tiro de canto com 1 ponto: o tiro sai ou o ponto vai para o vizinho | ≤ 1 caso |
| A4 | Equipe equilibrada: ninguém com menos de metade da caminhada da mais carregada | 51 lotes |
| A5 | Proteções: 95% do lote no máximo 5% pior e pior vazio no máximo igual ao de hoje | 0 lotes fora |
| A6 | Recomendação em segundo plano (worker), sem travar a tela | toque < 100 ms no celular lento |

## 3. Visual e organização (V) — prévia em `docs/previas-3-0/previa-3-1.png`

- V1 · Mapa em tela cheia, girado para os tiros ficarem na horizontal; bússola mostra o norte; botão "Norte para cima".
- V2 · Barra flutuante com miniatura do lote, nome e área; camadas (Plano, Satélite, Área de cada ponto) e menu.
- V3 · Painel deslizante com 3 alturas (resumo, plano, completo), como em app de mapa.
- V4 · Cartografia: cápsula do tiro fora dos pontos, ponto escuro com anel claro e sombra, escala em cápsula sem
  colisão, divisas da área de cada ponto em traço leve.
- V5 · Tipografia: números tabulares; 6 tamanhos; título 26/700; rótulos pequenos em caixa alta.
- V6 · Plano: indicadores em faixa única; regra e pessoas compactas; gráfico da área de cada ponto (meta 20 ha);
  cada tiro com a régua dos seus pontos.
- V7 · Enviar: verificação em lista com ✓; equipe com cartão por pessoa, tiros, pontos, borda de entrada e barra de km.
- V8 · Monitorar: tela escura própria para o campo; seta grande, distância em 64 px, barra do trecho entre pontos,
  "na linha" e "depois".
- V9 · Escolher lote com miniatura do desenho de cada lote, busca e recentes.
- V10 · Sem texto técnico (cálculo, arquivos, origem); só o resultado. Avisos só quando exigem ação.

## 4. Funções da 2.5 de volta, melhores (F)

F1 ajuste manual de pontos (arrastar no tiro, acrescentar ponto, desfazer) · F2 satélite opcional · F3 imagem de fundo ·
F4 trajeto de GPS importado · F5 nomes dos monitores nas fichas e no envio · F6 mancha da área descoberta no mapa ·
F7 comparar espaçamentos lado a lado antes de usar · F8 rumo manual e tiros escolhidos · F9 tema Noite.

## 5. Entregas

| Etapa | Conteúdo | Prova |
|---|---|---|
| 3.1-a | A1–A6 (motor assertivo) | 51 lotes: critérios da seção 2; testes diferenciais e de propriedades |
| 3.1-b | V1–V10 (visual novo) | 360/390/412 px, claro/escuro/Sol; 0 colisão de rótulo nos 51 lotes; contraste AA |
| 3.1-c | F1–F9 | testes de navegador por função; compatibilidade com os dados da 2.x |
| 3.1 | publicação | CI verde; hash conferido no link |
