# Fila de execução 3.1 · trabalho dividido entre Claude e ChatGPT

**Fonte única do que fazer.** Itens e provas: [PLANO_3_1.md](PLANO_3_1.md) · lista curta:
[LISTA_CORRECOES_3_1.md](LISTA_CORRECOES_3_1.md) · evidências: [evidencias-3-1/](evidencias-3-1/).
Uso: **99% celular** (360–412 px, em pé). Tablet e notebook só para configurar e ver com mais espaço: prioridade baixa.

## Regra de ouro
A 3.0 perdeu o que a 2.5 já fazia. **Nenhuma unidade está pronta se a função equivalente da 2.5 não estiver igual
ou melhor**, comparada lado a lado no celular (`legado/` × raiz) e registrada com imagem no PR.

## Protocolo de sincronia (as duas IAs seguem igual)
1. **Antes de começar:** `git fetch`; ler esta fila, `RETOMADA.md` e os PRs abertos. Revisar a última unidade entregue
   pela outra IA (rodar os testes dela) antes de pegar uma nova.
2. **Pegar uma unidade:** mudar a linha dela abaixo para `em andamento · <Claude|ChatGPT> · <branch>` num commit só
   (`fila: pega Uxx`) e enviar **antes** de editar código. Se já estiver com outra IA, escolher outra.
3. **Branch:** `claude/3-1-uxx-nome` ou `chatgpt/3-1-uxx-nome`, sempre a partir do `main` atualizado. Uma unidade por PR.
4. **Arquivos:** editar só os listados na unidade. Se precisar de outro, anotar no PR e conferir se nenhuma unidade
   em andamento usa o mesmo arquivo.
5. **Antes de pedir revisão:** `node scripts/build-3.mjs --root`; `npm --prefix audit run test:blocks`;
   `node audit/app3-browser.mjs`; teste novo da unidade; imagem antes/depois a 390 px (claro e escuro).
6. **Entregar:** PR com o que mudou, prova (testes e imagens), o que não foi testado e o próximo passo. Linha da fila
   para `pronto para revisão · PR #n`. Checkpoint: `node scripts/checkpoint.mjs --task "Uxx ..." --owner <IA> --status pronto_para_revisao --next "..."`.
7. **Publicar:** só com o pedido do proprietário e o CI verde. Conferir o hash do `index.html` no `main` = `VERSAO.json`.
8. **Visual novo (V1–V10):** só depois de o proprietário aprovar a prévia. Até lá, corrigir sem mudar o desenho geral.

## Ordem e unidades

Estado: `livre` · `em andamento · IA · branch` · `pronto para revisão · PR` · `feito · versão`.

| ID | Prioridade | Unidade | Itens | Arquivos principais | Pronto quando | Estado |
|---|---|---|---|---|---|---|
| U00 | P0 | Teste de paridade com a 2.5 | K8 | `audit/paridade-2-5.test.mjs` (novo) | Lista dos 186 controles da 2.5 com o equivalente na 3.0 ou "pendente Uxx"; CI falha se faltar sem marcação | livre |
| U01 | P0 | **3.0.1 — críticos** | C1–C6, N17 | `src/app3/{main,store,planner}.mjs` | O app sempre abre (estado inválido, sem armazenamento, teto de pontos); "não gravou" avisado; testes de cada caso | feito · 3.0.1 (PR #29) |
| U02 | P0 | Separar a tela em módulos (destrava trabalho em paralelo) | K1, K2, K4, H3, H4 | `src/app3/` (novos módulos por tela), `scripts/build-3.mjs` | Mesmo comportamento (todos os testes passam); cada tela num arquivo; atualização só do que mudou | feito · 3.0.4 (PR #32) |
| U03 | P1 | **Medidas no mapa como na 2.5** (pedido do proprietário) | M5, M6, M11, N15, N16, D2, D8 | `src/app3/map.mjs` | Legenda ligada às cores (entre tiros, entre pontos, ha por ponto); intervalos e área de cada ponto desenhados; toque no ponto desenha as medidas; números ≥ 12 px; 0 colisão nos 51 lotes | feito · 3.0.2 (PR #30) |
| U04 | P1 | **Tiros completos** | T1–T3, P11, P12 | `src/app3/views-plano.mjs` (após U02) | Por tiro: vizinhos, régua, borda · intervalos · borda; tocar mostra no mapa; esquema das distâncias | pronto para revisão · Claude · 3.0.10 |
| U05 | P1 | Desempenho no celular | N1–N5, N18, A6 | `src/app3/planner.mjs`, worker novo, `scripts/build-3.mjs` | Celular lento (6×): trocar lote e aba < 0,2 s; "Todos os lotes" sem travar; 10 toques sem travar | feito · 3.0.5 + 3.0.8 (mudar a regra: maior travada 0,19 s com o motor em segundo plano) |
| U06 | P1 | Ferramentas do mapa | M1, M2, M4, M13 | `src/app3/map.mjs`, `gestures.mjs` | Norte/Talhão, aproximar, afastar, enquadrar, cobertura | livre |
| U07 | P1 | Celular: deitado, iPhone, prévia do link | N22, N23, N24, N21 | `src/app3/{styles.css,shell.html}` | Deitado com mapa útil; topo seguro no iPhone; prévia no WhatsApp | livre |
| U08 | P1 | Monitorar completo | N7, N8, N19, G1–G8 | `src/app3/monitor*.mjs` | Bússola, voz, seguir, "onde estou", nome, arquivos do próprio tiro; GPS pausa fora da aba | em andamento · Claude · 3.0.7 (bússola, voz, pausa do GPS; falta: "onde estou", nome e arquivos do tiro) |
| U09 | P1 | Acessibilidade e toque | N6, N14, N20, N25, D1 | `src/app3/main.mjs` (ou módulos de U02), `styles.css` | Voltar fecha janela; foco preso e devolvido; alvos ≥ 44 px; axe sem falhas | livre |
| U10 | P2 | Plano: ajustes completos | P1, P2, P4–P8, P14, N11–N13 | `src/app3/advanced.mjs` | Todos os ajustes da 2.5 no celular, conferidos pelo catálogo | livre |
| U11 | P2 | Comparar espaçamentos e diagnóstico | P9, P10, P13, P15, F6, M3 | `src/app3/` (tela de comparação) | 5 opções lado a lado com prévia no mapa; mancha descoberta; visão da fazenda | livre |
| U12 | P2 | Editor de pontos | M12, F1 | `src/app3/editor.mjs` (novo) | Arrastar no tiro, ±10 m, extra, remover, desfazer e refazer | livre |
| U13 | P2 | Arquivos e dados | Q1–Q5, N9, N10, M9, M10, G5, G6 | `src/app3/` (menu Mais) | Compartilhar direto, dados dos lotes, "Atualizar agora", régua, SVG | livre |
| U14 | P2 | Bloco completo e no motor | P16, P17, H2 | `src/engine/blocks.mjs` (novo) | Teste diferencial com o bloco da 2.5; combinações, mapa do grupo, GPX | livre |
| U15 | P2 | Trajeto importado | P3, F4, C4 | `src/app3/import.mjs` (novo) | GeoJSON/CSV como na 2.5; plano da 2.5 com trajeto abre | livre |
| U16 | P2 | Satélite e imagem de fundo | M7, M8 | `src/app3/basemap.mjs` (novo) | Mesmas regras da 2.5 (sem consulta externa até escolher) | livre |
| U17 | P3 | Motor assertivo | A1–A5 | `src/engine/` | Critérios da seção 2 do plano nos 51 lotes | pronto para revisão · Claude · 3.0.8 (A1+A5 feitos: variação mediana 11,6% → 7,7%; A6 motor em segundo plano; 3.0.9 A4 equipe repartida. A2/A3 medidos: tirar tiro de 1 ponto ou afastar da borda piora a cobertura 28–58% → ficam, por proteção) |
| U18 | P3 | Visual novo (após aprovação da prévia) | V1–V10, D3–D5, K3, K6, K7, H5 | `src/app3/` | Prévia aprovada; 360/390/412; claro, escuro, Sol | aguardando aprovação |
| U19 | P4 | Tablet e notebook | L1, L2, D6, D7 | `src/app3/styles.css` | Painel lateral ≥ 900 px; tablet deitado | livre |
| U20 | P4 | Congelar a 2.5 | H1, K5 | `scripts/build-preserved.mjs` | 2.5 só reserva; lembranças da 3.0 na cópia de segurança | livre |

**Dependências:** U02 antes de U04, U09 e U10–U13 (evita duas IAs no mesmo `main.mjs`). U01 e U03 podem começar já
(arquivos diferentes). U18 depende da aprovação do proprietário.

## Divisão sugerida para começar
- **Claude:** U01 (críticos) → U02 (módulos) → U05 (desempenho).
- **ChatGPT:** U00 (paridade) → U03 (medidas no mapa) → U07 (celular deitado/iPhone).
