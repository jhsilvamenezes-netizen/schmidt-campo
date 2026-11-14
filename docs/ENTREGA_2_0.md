# SCHMIDT Campo 2.0 web — entrega (14/11/2026)

Uso: planejamento e direcionamento pelo link, principalmente no navegador do celular.
Sem coleta, marcação, controle de execução, produtividade ou APK. Dados e funções legadas preservados.

## O que a 2.0 entrega

| Área | O que mudou | Versão |
|---|---|---|
| Medidas | Entre tiros, entre pontos, borda, rumo/norte de grade e exportações conferidos com GEOS/PROJ em 51 lotes e 40 blocos: erro 0 m (projeção: 2e-9 m). Limites documentados | E2 |
| Ajustes | "Comparar antes de aplicar": passadas ou quantidades vizinhas com tiros, pontos, distâncias, borda, cobertura e caminhada, sem mudar o plano; "Usar" com Desfazer | 1.36.0 |
| Clareza | "Entre pontos" nunca vazio ("Um em cada tiro"); esquema das distâncias com as linhas e pontos reais; texto sem "anéis" | 1.36.0–1.37.0 |
| GPS | Sem marcação, o guia orienta ao próximo ponto à frente e anuncia a chegada em cada ponto (antes ficava preso no ponto 1); fix velho ou inválido não orienta; avisos de imprecisão e de fora da linha | 1.37.0 |
| Monitor no celular | Mapa na altura certa ao voltar das abas do plano (antes cortado); "Ligar GPS" como ação principal | 2.0.0 |
| Link | Atualização real da 1.37.0 para a 2.0.0 sem perder dados, coleta legada, imagem e histórico; abre sem internet | 2.0.0 |

Preservado: método linear sem anéis, barra de 36,48 m, configuração do P6, 51 lotes,
40 opções de bloco, parâmetros e dados; Plano padrão e Satélite opcional. Nenhuma divisa é
deduzida da foto, nenhum recuo é imposto e nenhum acesso entre lotes é inventado.

## Provas (navegador automatizado, sem telefone físico)

| Prova | Resultado |
|---|---|
| Medidas × GEOS/PROJ (`direction-measures.py`) | 24 verificações, erro ≤ 2e-9 m; mutações detectadas |
| Comparar antes de aplicar (`adjust-compare-browser.mjs`) | prévia = aplicado em 51/51 lotes |
| GPS simulado (`gps-guidance-browser.mjs`) | 182 trechos e 182 chegadas; 204 fixes inválidos ignorados; monitor com mapa de 348 px e "Ligar GPS" em destaque |
| Atualização 1.37.0 → 2.0.0 (`UPGRADE_REF=0966b08 worker-upgrade-browser.mjs`) | aprovada; offline com dados preservados |
| Acessibilidade (axe, WCAG 2.1 AA) em todas as telas, 360 e 1440 px | 0 violações; sem rolagem lateral; sem erro de página |
| Tempos (E1) | sem regressão contra a 1.34.1 |

## Limites e próximos passos

- Falta prova em telefone físico, com GPS real e bateria (E8, piloto).
- O teste de congelamento visual `browser.mjs` (fora do CI) tem ruído preexistente de 1/255.
- A tela de chegada mantém "toque em Ponto coletado" (fluxo legado preservado).
