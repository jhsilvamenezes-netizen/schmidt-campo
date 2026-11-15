# Contrato da 3.0 (R1) e prévias (R3)

Levantamento feito na página publicada (2.5, celular 390 px, lote BD3), 15/11/2026.

## Palavras visíveis por tela

| Tela 2.5 | Palavras | Tela 3.0 (prévia) | Palavras |
|---|---|---|---|
| Mapa | 45 | Mapa | 29 |
| Planejar: Plano, Diagnóstico, Ajuste fino (etapas 1–3) | 600 | Plano | 92 |
| Planejar: Conferência e Arquivos (etapas 4–5) | 346 | Enviar | 72 |
| Tiros | 108 | dentro do Plano | — |
| Dados | 117 | Menu ⋯ › Dados da safra | sob demanda |
| Auditoria | 1.297 | Menu ⋯ › Como foi calculado | sob demanda |

## Funções que ficam (todas)

| Função (2.5) | Lugar na 3.0 |
|---|---|
| Fazenda e lote (2 seletores) | Um botão "BD3 · Bananal" no topo |
| Mapa com lote, tiros, pontos, norte e escala | Mapa (início) e topo do Plano |
| Resumo (pontos, tiros, entre tiros, entre pontos, 95% do lote, alertas) | Painel do Mapa |
| Hectares por ponto, pessoas em campo, Lote/Bloco | Plano |
| Plano recomendado e outras opções (Usar, desfazer) | Plano |
| Lista de tiros (comprimento, pontos, intervalo) | Plano |
| Ajuste fino (geração dos tiros, distância, repartição, busca, restaurar) | Plano › Ajustes avançados |
| Diagnóstico (área descoberta, malha, área por ponto) | Conferência no Enviar; detalhe em Como foi calculado |
| Conferência e divisão da equipe | Enviar |
| Enviar plano, fichas de campo, copiar resumo, CSV, GeoJSON | Enviar |
| Abrir plano recebido, cópia de segurança, restaurar, versões | Menu ⋯ |
| Dados dos lotes (baixar e atualizar), imagem de fundo | Menu ⋯ |
| Todos os lotes (visão geral) | Menu ⋯ |
| Dados da safra, origem dos dados, alertas | Menu ⋯ › Dados da safra (o selo "Sem alertas" abre direto) |
| Auditoria: explicação, glossário, parâmetros, versão | Menu ⋯ › Como foi calculado |
| Monitorar (guia por GPS) e Sol | Barra inferior e topo |

## Dados que continuam abrindo sem perda

Estado salvo `monitoramento.v03`, versões do plano (IndexedDB), cópia de segurança, plano enviado,
`monitoramento.fields.v1`, imagens de fundo. Arquivos de saída idênticos (provado em `audit/engine-rest-diff.test.mjs`).

## Desenho (R3)

- 4 abas: Mapa · Plano · Enviar · Monitorar. As 5 etapas e as abas Tiros, Dados e Auditoria saem.
- Texto: 5 tamanhos (12, 14, 16, 20, 28) e 3 pesos (400, 600, 700). Cores da marca; tema escuro próprio.
- Prévias: `docs/previas-3-0/` (claro e escuro). **Aguardando aprovação do proprietário (R3).**

## R4.1 · tela nova funcionando (15/11/2026)

`node scripts/build-3.mjs` gera `build/3/index.html` só de `src/` (motor 2 + `src/app3`). Não vai ao link até a R5.

| Item | Resultado |
|---|---|
| Arquivo | 329 KB (2.5: 895 KB); abre em ~0,2 s no teste |
| Telas | Mapa, Plano, Enviar e Mais (dados do lote, como foi calculado, abrir plano recebido) |
| Palavras | Mapa 33 · Plano 95 · Enviar 76 (limites no teste: 40 · 110 · 90) |
| Compatível com a 2.x | Mesmo estado salvo (`monitoramento.v03`), mesmo arquivo de plano (`monitoramento.plano.v1`), mesmos CSV, GeoJSON, GPX e KML |
| Provas | `audit/app3-planner.test.mjs` (51 lotes; recomendação idêntica ao motor 0.5.1; BD3 com os números da 2.5) e `audit/app3-browser.mjs` (claro e escuro, sem erro nem rolagem lateral), ambos no CI |

Falta (R4.2 a R4.4): bloco de lotes, ajustes avançados completos, gestos no mapa e satélite, ajuste manual de pontos,
guia por GPS (Monitorar), fichas de campo, cópia de segurança, versões, dados da safra, funcionamento sem internet.
