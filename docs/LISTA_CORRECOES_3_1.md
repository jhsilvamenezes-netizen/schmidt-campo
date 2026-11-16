# Lista consolidada de correções e melhorias (3.1)

Gerada de `docs/PLANO_3_1.md`, onde cada item tem prova e correção. Ordem: críticos → regressões → motor → visual e estrutura → funções da 2.5.

## Críticos: o app não abre ou perde dados (6)
- **C1** App não abre (tela em branco) se um lote tiver plano salvo com valor fora da faixa: estado antigo, trajeto importado da 2.5 ou arquivo de plano antigo
- **C2** Navegador sem armazenamento local (modo privado restrito) → app não abre
- **C3** Armazenamento cheio: não grava, mas mostra "Desfazer" como se tivesse gravado
- **C4** Plano da 2.5 com trajeto importado (`trackMode: importado`) quebra a 3.0 (mesma causa de C1)
- **C5** Digitar 1 ha por ponto num lote de 603 ha (BC2) trava o app de vez: passa do teto de 600 pontos, o plano fica gravado e ao reabrir a tela fica em branco
- **C6** Restaurar uma versão anterior aplica os valores sem conferir (mesmo risco do C1)

## Regressões, lentidão e falhas de uso (25)
- **N1** Trocar de lote travou mais que na 2.5
- **N2** Mudar "ha por ponto" trava a tela
- **N3** "Todos os lotes" congela a tela
- **N4** Toda troca de aba refaz o plano inteiro
- **N5** Na guia, cada posição do GPS refaz o plano e redesenha a tela inteira (gasta bateria e volta a rolagem ao topo)
- **N6** Botão voltar do Android sai do app com uma janela aberta
- **N7** Guia sem bússola: a seta aponta em relação ao norte, não para onde a pessoa está virada
- **N8** Guia sem aviso por voz
- **N9** Sem aviso de nova versão: a atualização só aparece depois de fechar o app duas vezes
- **N10** Sem "Atualizar dados dos lotes" (arquivo `monitoramento.fields.v1`)
- **N11** Sem escolha do rigor da área descoberta (tolerante, padrão, rigoroso)
- **N12** "−/+" de ha por ponto anda de 1 em 1 (na 2.5 era de 5 em 5)
- **N13** Sem lote salvo, abre no BA1 (a 2.5 abria no BD3)
- **N14** Acessibilidade: nome falado do botão do lote difere do texto; falta título principal
- **N15** Escala do mapa sobre o lote
- **N16** Rótulo de tiro escondido ou sob ponto (foto do BA2)
- **N17** "20,5" ha é recusado em silêncio: o valor volta sem aviso
- **N18** 10 toques seguidos no "+" travam 2,4 s no celular lento (cada toque recalcula tudo)
- **N19** GPS e tela acesa continuam ligados ao sair da aba Monitorar
- **N20** Teclado: o foco sai da janela aberta (9 de 15 Tabs) e não volta ao botão ao fechar
- **N21** Nome da fazenda cortado no topo em 360 px ("Rio de Janeiro")
- **N22** Celular deitado: mapa com 72 px de altura; o lote vira um ponto
- **N23** Link compartilhado sem prévia (título, descrição, imagem) e sem ícone para iPhone; a 2.5 tinha
- **N24** iPhone com o app instalado: topo embaixo da barra do relógio (falta a margem segura em cima)
- **N25** Botão Sol não informa se está ligado (leitor de tela)

## Mapa: funções da 2.5 (13)
- **M1** Orientação Norte / Talhão (girar para os tiros)
- **M2** Botões aproximar, afastar e enquadrar
- **M3** Mapa expandido com troca de fazenda e lote; "enquadrar todos os lotes" (visão da fazenda)
- **M4** Camada Cobertura (mapa de calor da distância ao ponto mais perto)
- **M5** Camada Distâncias no tiro (intervalos desenhados)
- **M6** Camadas: grade em metros, tiros, pontos, identificadores, medidas entre tiros e entre pontos, área de cada ponto, referência A/B, tiros não selecionados, imagem
- **M7** Satélite opcional (Plano padrão, sem consulta externa até escolher)
- **M8** Imagem de fundo georreferenciada, com força e remoção
- **M9** Régua para medir distância no mapa
- **M10** Exportar o mapa em SVG (vetorial)
- **M11** Medidas do ponto desenhadas ao tocar (até vizinhos e borda)
- **M12** Editor de pontos: arrastar no tiro, mover 10 m, ponto extra, remover extra, desfazer e refazer, ponto fora da pista
- **M13** Selo de qualidade dos dados abre os dados do lote

## Plano: funções da 2.5 (17)
- **P1** Como gerar os tiros: por espaçamento, por quantidade de tiros ou trajetos importados
- **P2** Direção dos tiros (rumo manual) e "Rumo da planilha"
- **P3** Importar trajeto (GeoJSON ou CSV; pista do pulverizador, trajeto da equipe, curva desenhada)
- **P4** Trecho mínimo com ponto (m)
- **P5** Tiros que recebem pontos: todos, um por pessoa, escolhidos à mão
- **P6** Distância máxima aceitável entre pontos (alerta)
- **P7** Prioridade da busca (qualidade, regularidade, esforço) e seus limites (% do maior intervalo, p.p. da irregularidade)
- **P8** Parâmetros do guia: passo, raio de chegada, precisão do GPS, aviso de saída da linha
- **P9** Comparar antes de aplicar · 5 opções de espaçamento (tiros, pontos, entre tiros, entre pontos, borda, cobertura, caminhada)
- **P10** Desenho e comparação de planos, "Ver no mapa" de cada opção
- **P11** Esquema das distâncias (1 ou 2 linhas, 1 ou 3 pontos conforme o plano)
- **P12** Cartão "Entre pontos" diz "Um em cada tiro" quando é o caso
- **P13** Diagnóstico: malha entre tiros × entre pontos × ideal, "malha equilibrada/alongada", área de cada ponto, mancha descoberta no mapa
- **P14** Rigor da área descoberta (tolerante, padrão, rigoroso)
- **P15** Analisar todos os lotes pelo mesmo critério, com plano de ação
- **P16** Bloco: escolher qualquer combinação do grupo, ver mapa do grupo, exportar GPX do bloco, comparar opções
- **P17** Indicador de bloco ativo no topo

## Tiros: funções da 2.5 (3)
- **T1** Por tiro: borda · intervalos · borda (ex.: 219 · 438 · 438 · 219 m) e vizinhos de cada lado
- **T2** Escolher os tiros que recebem pontos tocando na lista
- **T3** Tocar no tiro mostra o tiro no mapa

## Conferir e arquivos: funções da 2.5 (5)
- **Q1** Compartilhar resumo pelo menu do celular (WhatsApp)
- **Q2** Baixar dados atuais dos lotes; atualizar dados (`monitoramento.fields.v1`)
- **Q3** Mostrar ou esconder o botão Monitorar
- **Q4** Aviso "Atualizar agora" quando há versão nova
- **Q5** Dados do lote: linha do tempo de chuva e plantio, pendências da planilha, cadastro completo

## Monitorar: funções da 2.5 (9)
- **G1** "Onde estou? Mostrar o tiro mais perto"
- **G2** Voz
- **G3** Girar o mapa com a bússola
- **G4** Mapa seguindo você
- **G5** Nome do monitor (vai na ficha)
- **G6** Enviar, GPX, KML e ficha só do meu tiro
- **G7** Distância até o próximo ponto ou a borda ao chegar; "Depois deste: ponto X a N m"
- **G8** Alerta falado e escrito de tiro errado e de "passou do ponto"
- **G9** Marcação de ponto coletado, relatório do piloto, trajeto caminhado

## Tablet e notebook (2)
- **L1** Tablet e notebook com mapa grande e painel lateral
- **L2** Tablet deitado com mapa e painel lado a lado

## Motor assertivo (6)
- **A1** Escolhe espaçamento e fase dos tiros pelo equilíbrio da área de cada ponto (Voronoi exato)
- **A2** Nenhum ponto a menos de 15% do lado ideal da borda
- **A3** Sem tiro de canto com 1 ponto: o tiro sai ou o ponto vai para o vizinho
- **A4** Equipe equilibrada: ninguém com menos de metade da caminhada da mais carregada
- **A5** Proteções: 95% do lote no máximo 5% pior e pior vazio no máximo igual ao de hoje
- **A6** Recomendação em segundo plano (worker), sem travar a tela

## Visual novo (10)
- **V1** Mapa em tela cheia, girado para os tiros ficarem na horizontal; bússola mostra o norte; botão "Norte para cima".
- **V2** Barra flutuante com miniatura do lote, nome e área; camadas (Plano, Satélite, Área de cada ponto) e menu.
- **V3** Painel deslizante com 3 alturas (resumo, plano, completo), como em app de mapa.
- **V4** Cartografia: cápsula do tiro fora dos pontos, ponto escuro com anel claro e sombra, escala em cápsula sem
- **V5** Tipografia: números tabulares; 6 tamanhos; título 26/700; rótulos pequenos em caixa alta.
- **V6** Plano: indicadores em faixa única; regra e pessoas compactas; gráfico da área de cada ponto (meta 20 ha);
- **V7** Enviar: verificação em lista com ✓; equipe com cartão por pessoa, tiros, pontos, borda de entrada e barra de km.
- **V8** Monitorar: tela escura própria para o campo; seta grande, distância em 64 px, barra do trecho entre pontos,
- **V9** Escolher lote com miniatura do desenho de cada lote, busca e recentes.
- **V10** Sem texto técnico (cálculo, arquivos, origem); só o resultado. Avisos só quando exigem ação.

## Sistema de design (8)
- **D1** Alvos de toque menores que 44 px
- **D2** Números dos pontos em 9–10 px (a 2.5 tinha regra aprovada de 12 px ou mais no mapa)
- **D3** 8 tamanhos de letra (combinado: 5), 8 raios, 7 espaçamentos
- **D4** Botão "Ver plano" repete a aba Plano
- **D5** Selo "Sem alertas" parece botão sem ser (23 px de altura)
- **D6** Notebook: coluna de 480 px no centro, mapa em 22% da tela
- **D7** Tablet: linhas esticadas, números longe dos rótulos, mapa pequeno
- **D8** Mapa: tiro de 83 m com 1 ponto no canto do BA2 visível como erro

## Código e estrutura (8)
- **K1** Tela inteira numa função só de 343 linhas (estado, desenho, eventos, GPS, cópia, bloco)
- **K2** Cada mudança redesenha a tela inteira (perde foco, rolagem e o que está digitado)
- **K3** 12 trechos sem tipo (`any`) e 17 linhas acima de 200 colunas
- **K4** 7 erros engolidos sem aviso (`catch` vazio)
- **K5** Lembranças fora da cópia de segurança (lotes recentes, bloco ativo, última cópia)
- **K6** Arquivo sem compactação (464 KB; 144 KB pela rede) com comentários do código
- **K7** Testes da tela só no navegador; a lógica da tela não tem teste de unidade
- **K8** Publicada sem conferir paridade com a 2.5 (a lista existia em `CONTRATO_3_0.md`, mas não foi verificada)

## Pontos quentes do código (5)
- **H1** `scripts/build-preserved.mjs` (monta a 2.5)
- **H2** Lógica do bloco (`src/application/block-planning.mjs`, 374 linhas sem tipo) acoplada à tela do bloco da 2.5
- **H3** `src/app3/main.mjs`
- **H4** `scripts/build-3.mjs` com a lista de módulos escrita à mão
- **H5** Estilos (`styles.css`) mudam junto com tudo

## Funções da 2.5 em resumo (detalhadas em M, P, Q, G) (9)
- **F1** ajuste manual de pontos (arrastar no tiro, acrescentar ponto, desfazer)
- **F2** satélite opcional
- **F3** imagem de fundo
- **F4** trajeto de GPS importado
- **F5** nomes dos monitores nas fichas e no envio
- **F6** mancha da área descoberta no mapa
- **F7** comparar espaçamentos lado a lado antes de usar
- **F8** rumo manual e tiros escolhidos
- **F9** tema Noite.
