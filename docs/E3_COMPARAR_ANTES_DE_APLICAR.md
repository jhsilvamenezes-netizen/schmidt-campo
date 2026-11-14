# E3 — comparar antes de aplicar (1.36.0)

Executado em 14/11/2026 sobre a 1.35.1. Escopo: planejamento pelo link no celular.
Não há coleta, marcação, controle de execução nem APK.

## Reprodução (antes)

| Achado | Tipo | Evidência |
|---|---|---|
| No Ajuste fino, mudar a distância entre tiros aplica na hora. Não há como ver o efeito antes | Oportunidade (pedido do dono) | 5 → 8 tiros ao digitar 292 m; só depois aparece "Desfazer" |
| O aviso de mudança não lista o antes e o depois | Decisão aprovada (`INFORMACAO_ESSENCIAL_PLANO.md`), **mantida** | `build-preserved.mjs`: "retorno-do-plano-sem-histórico-com-desfazer" |
| "Comparar com outras opções" mostra 2 opções fixas, sem entre tiros, entre pontos ou borda | Oportunidade | Cartão de recomendação |
| Cartão "Entre pontos" **vazio** quando cada tiro tem 1 ponto | **Defeito comprovado** | RA9 e RB9; teste novo falhava antes da correção |
| Texto da etapa Tiros cita "anéis", mas o método é linear, sem anéis | Defeito de texto | `#param-stage-tiros .stage-intro` |

## Entrega

- `src/application/adjust-alternatives.mjs` (sem tela). Calcula as opções vizinhas:
  - 2 passadas de 36,48 m de cada lado (ou ±1 e ±2 tiros no modo quantidade);
  - sempre dentro dos limites do formulário (40 a 2.000 m; 1 a 60 tiros).
  Entre tiros e entre pontos vêm de `readOperationalSummary`, o mesmo texto do cartão "Plano em uso".
- `src/ui/adjust-compare.mjs`. Quadro recolhido na etapa Tiros:
  - só calcula ao ser aberto (até 60 ms nos 51 lotes, CPU ×1);
  - não aparece no modo bloco nem com trajetos importados;
  - "Usar" escreve no mesmo campo que a pessoa digitaria: o app aplica, grava e oferece Desfazer como sempre;
  - em negrito verde, o que fica diferente do plano em uso (peso e cor, não só cor).
- `readOperationalSummary`: "Um em cada tiro" no lugar do vazio. Sem faixa entre tiros, mostra "—".

Preservado: método linear, barra de 36,48 m, P6, 51 lotes, 40 blocos, parâmetros e
dados. Nenhum valor é trocado sem a pessoa tocar em "Usar".

## Provas

| Teste | Resultado |
|---|---|
| `audit/adjust-alternatives.test.mjs` (limites, passadas exatas 1–54, furos, mesmo texto do cartão) | 7/7 |
| `audit/operational-summary.test.mjs` (caso RA9/RB9) | 6/6; falhava antes |
| `audit/adjust-compare-browser.mjs`, 51 lotes a 390 px | abrir não grava; linha "em uso" = cartão; **Usar = prévia em 51/51** (mesmo texto e números); Desfazer volta (50, mais 1 pelo campo, sem mudança perceptível); modo quantidade ok; sem erro de página |
| axe-core (WCAG 2.1 AA + boas práticas) no quadro aberto, temas padrão e Sol | 0 violações |
| Visual: 390 px, 1440 px, Sol | sem corte nem rolagem lateral; botões de 44 px |

| Bateria do CI (`blocos-candidata.yml`) + `operational-plan-browser` | todas passaram |
| `browser.mjs` (congelamento visual, fora do CI) | ruído de 1/255 em 34–44 px, variando de tela entre execuções; **a 1.35.1 falha igual**. Preexistente |

O app não tem modo escuro do sistema: o tema alternativo é o "Sol", conferido acima.

## Próximo

- "Esquema das distâncias" sempre desenha 3 pontos por tiro, mesmo quando o lote
  tem 1 (RA9). Desenhar com a quantidade real.
- E4: GPS sintético (24–27).
