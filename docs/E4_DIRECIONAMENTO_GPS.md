# E4 — direcionamento por GPS sem marcação (1.37.0)

Executado em 14/11/2026. Escopo da 2.0: a equipe usa o link só para planejar e se
orientar; não marca coleta. O legado de marcação foi preservado.

## Defeito comprovado (1.36.0 e anteriores)

| Situação | Antes | Depois |
|---|---|---|
| Parada no ponto 2, sem marcar nada | "Próximo: ponto 1, 515 m para o oeste" (manda voltar) | "Você chegou ao ponto 2" |
| Entre os pontos 1 e 2 | "Próximo: ponto 1" | "Próximo: ponto 2, 258 m para o leste" |
| Depois do ponto 2 | "Próximo: ponto 1, 618 m" | "Próximo: ponto 3, 412 m" |

Causa: o próximo ponto era sempre "o primeiro ainda não marcado". Sem marcação, o guia
nunca saía do ponto 1.

## Correção

- `src/gps/guide-next.mjs`. Enquanto nenhum ponto do tiro foi marcado:
  - a posição é projetada sobre o tiro;
  - o próximo ponto é o primeiro à frente, na ordem de caminhada, com a mesma tolerância de chegada (10 m);
  - depois do último ponto, o guia mantém o último e o app avisa "passou, volte".
- Com qualquer marcação, vale a ordem marcada (legado intacto).
- Duas integrações verificadas no build:
  - o motor (`guide`) usa a função nova;
  - o título do monitor mostra o ponto que o guia escolheu, e não um segundo cálculo.
- Nada é gravado e nenhuma execução é marcada.

## Provas

| Teste | Resultado |
|---|---|
| `audit/guide-next.test.mjs`: projeção, à frente, raio de chegada, fora da linha, depois do último, legado com marcação, vários trechos | 5/5 |
| `audit/gps-guidance-browser.mjs`: 51 lotes, GPS simulado a 390 px | 182 trechos com próximo ponto e distância corretos; 182 chegadas; 204 fixes inválidos ignorados (velho, futuro, precisão negativa, coordenada inválida); 51 avisos de GPS impreciso; 51 avisos de fora da linha com lado e metros certos; nenhuma marcação gravada |
| Mesmo teste na 1.36.0 | **falha** (guia preso no ponto 1): o teste detecta o defeito |

As posições são geradas em metros e convertidas pela projeção do app, conferida
com PROJ na E2 (2e-9 m). O teste não substitui a prova em telefone físico, que fica para a E8.

## Também nesta versão

- "Esquema das distâncias" fiel ao plano: 1 ou 2 linhas, 1 ou 3 pontos, seta só
  da medida que existe. O desenho padrão continua igual ao aprovado, byte a byte (teste).
