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

## 5. Novos achados da revisão (16/11, celular lento simulado: processador 6× mais lento)

| # | Achado | Medido / onde | Correção |
|---|---|---|---|
| N1 | Trocar de lote travou mais que na 2.5 | 0,47 s (mediana), até 0,65 s; a 2.5 tinha meta de 0,2 s | Voltar a usar as recomendações prontas da 2.5 (`schmidt-recs`, que a 3.0 deixou de levar) e calcular o resto em segundo plano |
| N2 | Mudar "ha por ponto" trava a tela | 0,58 s | Cálculo em segundo plano; mostrar o plano anterior até o novo ficar pronto |
| N3 | "Todos os lotes" congela a tela | 10 s | Usar as recomendações prontas; preencher a lista aos poucos |
| N4 | Toda troca de aba refaz o plano inteiro | 0,11–0,26 s por aba | Guardar o plano calculado; só recalcular quando lote ou ajuste mudar |
| N5 | Na guia, cada posição do GPS refaz o plano e redesenha a tela inteira (gasta bateria e volta a rolagem ao topo) | lido no código | Atualizar só seta, distância e posição no mapa |
| N6 | Botão voltar do Android sai do app com uma janela aberta | testado | Voltar fecha a janela; com nada aberto, volta para a aba anterior |
| N7 | Guia sem bússola: a seta aponta em relação ao norte, não para onde a pessoa está virada | a 2.5 tinha bússola | Bússola do aparelho, quando houver |
| N8 | Guia sem aviso por voz | a 2.5 falava "Próximo: ponto X, N metros" | Voz opcional na chegada e no tiro errado |
| N9 | Sem aviso de nova versão: a atualização só aparece depois de fechar o app duas vezes | testado na migração | Aviso "Nova versão" com botão "Atualizar agora" |
| N10 | Sem "Atualizar dados dos lotes" (arquivo `monitoramento.fields.v1`) | existia na 2.5 | Voltar no menu Mais |
| N11 | Sem escolha do rigor da área descoberta (tolerante, padrão, rigoroso) | existia na 2.5 | Voltar nos ajustes |
| N12 | "−/+" de ha por ponto anda de 1 em 1 (na 2.5 era de 5 em 5) | testado | Passo de 5, com digitação livre |
| N13 | Sem lote salvo, abre no BA1 (a 2.5 abria no BD3) | lido no código | Abrir no último lote usado; na primeira vez, BD3 |
| N14 | Acessibilidade: nome falado do botão do lote difere do texto; falta título principal | axe | Ajustar nome e título |
| N15 | Escala do mapa sobre o lote | 6 lotes a 360 px | Coberto por V4 |
| N16 | Rótulo de tiro escondido ou sob ponto (foto do BA2) | foto do proprietário | Coberto por V4, com teste de colisão nos 51 lotes |

Sem erro de execução: os 51 lotes abriram nas 4 abas sem nenhum erro no console.

## 6. Entregas (reordenadas: primeiro o que regrediu em relação à 2.5)

| Etapa | Conteúdo | Prova |
|---|---|---|
| 3.1-a | N1–N14 (regressões e desempenho) | Celular lento: trocar lote e aba < 0,2 s; nenhum travamento > 0,1 s na guia; testes de navegador |
| 3.1-b | A1–A6 (motor assertivo) | Critérios da seção 2 nos 51 lotes |
| 3.1-c | V1–V10 (visual novo, após aprovação da prévia) | 360/390/412 px; claro, escuro e Sol; 0 colisão de rótulo; contraste AA |
| 3.1-d | F1–F9 (funções da 2.5) | Teste por função; dados da 2.x compatíveis |
| 3.1 | Publicação | CI verde; hash conferido no link |
