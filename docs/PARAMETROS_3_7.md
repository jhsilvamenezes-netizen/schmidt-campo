# Revisão dos parâmetros — 3.7.0

Cada parâmetro do motor da 3.x (`src/engine3/params.mjs` e `paramCatalog.mjs`): o que faz, valor padrão, se já foi
conferido em campo ("calibrado") e o gargalo encontrado. Medições nos 51 lotes, 20 ha por ponto, 5 pessoas.

## 1. Regra e pontos

| Parâmetro | Padrão | O que faz | Calibrado | Gargalo / observação |
|---|---|---|---|---|
| Hectares por ponto | 20 ha | Mínimo de pontos = área ÷ regra, arredondando para cima | sim | Nenhum. A 3.5 trouxe atalhos 10–30 ha |
| Como repartir os pontos | total | Proporcional ao tamanho de cada tiro | sim | É o que gera os 9 tiros de 1 ponto (tiro curto recebe 1) |
| Total de pontos | vazio = mínimo | Nunca reduz sozinho | sim | O motor fica sempre no mínimo (0 lotes acima) |
| Trecho mínimo com ponto | 60 m | Parte de tiro menor que isto não recebe ponto | **não** | Valor inicial, sem conferência em campo |
| Teto de pontos | 600 | Proteção contra digitação | sim | Faltava no bloco da 3.0 (corrigido na 3.0.11) |

## 2. Tiros

| Parâmetro | Padrão | O que faz | Calibrado | Gargalo / observação |
|---|---|---|---|---|
| Distância entre tiros | escolhida pela recomendação | Passadas inteiras da barra, 3 a 24 | sim | A busca só olha 0,5–1,6 × o lado ideal |
| Largura da barra | 36,48 m | M4040 | sim | — |
| Tiros em múltiplos da barra | sim | Imita as passadas da máquina a partir do ponto A | **não** | Estimativa; depende do ponto A da planilha |
| Direção dos tiros | da planilha | Graus a partir do Norte | **não** | P6 tem "rumo fraco" na planilha |
| Deslocamento do conjunto | escolhido | Fase dos tiros em passadas a partir de A | sim | — |

## 3. Bordas e intervalos

| Parâmetro | Padrão | O que faz | Calibrado | Gargalo / observação |
|---|---|---|---|---|
| Distância das pontas | meia margem | 1º ponto a meio intervalo da borda | **não** | Igual em todos os lados; lotes compridos pedem margem por lado (proposta M7) |
| Margem fixa | 50 m | Só com "margem fixa" | **não** | — |
| Folga sobre o intervalo-alvo | 10% | Acima disto o tiro ganha alerta | **não** | — |
| Distância máxima aceitável | sem limite | Alerta de intervalo grande | **não** | Sugestão: preencher com 1,5 × lado ideal (~670 m a 20 ha) |

## 4. Busca de distribuição (motor)

| Parâmetro | Padrão | O que faz | Gargalo / observação |
|---|---|---|---|
| Prioridade | qualidade espacial | Reduz áreas longe de ponto | — |
| Rodadas / candidatos por trecho | 6 / 9 | Custo da busca | O plano equilibrado usa 2 / 7 por candidato: **80% do tempo da recomendação** |
| Aumento máximo do maior intervalo | 10% | Limite da busca | A busca antiga só olhava o 95% e piorava o maior vazio (corrigido na 3.2) |
| Grade de cobertura | 1.500 células | Resolução do "95% do lote" | O maior vazio usa Voronoi exato; o 95% usa grade (aproximação conhecida) |

**Gargalo medido (51 lotes):** recomendar = 1,8 s (plano base) + 7,9 s (equilíbrio). No equilíbrio, 1.776 candidatos
e quase todo o tempo é montar o cenário completo de cada um. **3.7:** triagem barata (35× mais rápida, resultado
idêntico) descarta antes quem criaria tiro de 1 ponto: equilíbrio 7,9 → 6,9 s (−13%).

## 5. Campo (Monitorar)

| Parâmetro | Padrão | O que faz | Calibrado | Gargalo / observação |
|---|---|---|---|---|
| Distância para "chegou" | 10 m | Raio de chegada | **não** | **Menor que a precisão aceita (15 m)**: com GPS de ±12 m a chegada fica incerta. O app avisa "confira pelos passos" |
| Precisão de GPS aceitável | 15 m | Acima disto, aviso de GPS impreciso | **não** | Etiqueta GPS ± m colorida desde a 3.4 |
| Aviso de saída da linha | 25 m | Fora da linha, aviso e vibração (3.5) | **não** | — |
| Comprimento do passo | 0,75 m | Metros → passos no roteiro | **não** | Varia por pessoa; ideal calibrar com 100 m medidos |
| Encaixe ao arrastar ponto | 30 m | Ponto solto puxado para a linha | **não** | — |

## 6. O que fica para validar em campo

1. Trecho mínimo (60 m), margem das pontas e direção: os três mexem nos tiros de 1 ponto.
2. Raio de chegada × precisão do GPS: medir com 2–3 celulares da equipe.
3. Comprimento do passo de cada monitor.
