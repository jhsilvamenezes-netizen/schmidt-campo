# Plano 4.3+: visual, fluidez e limpeza contínua

Escrito em 25/11/2026. Cada item segue o mesmo protocolo:
1. Medir antes.
2. Mudar.
3. Medir depois.
4. Só publicar se ganhar sem perder nenhuma função.
5. Deixar um teste ou guarda que impeça voltar atrás.

## Como está hoje (4.2.1, celular lento simulado, CPU 6×)
| Medida | Valor |
|---|---|
| Abrir até aparecer o mapa | ~1,2 s (0,35 s num celular bom) |
| Trocar de aba | 10–90 ms |
| Trocar de lote | 100–200 ms |
| Maior travada | 50 ms |
| "Todos os lotes" | 0,14 s (era 1,2–1,7 s) |
| Tamanho do app | 736 KB, um arquivo só, funciona sem internet |

**Onde ainda pesa:** todo gesto no mapa (arrastar, pinça, girar) e toda leitura do GPS no guia **refazem o desenho
inteiro do mapa**. Num celular fraco, isso é a "leve travada" que sobra.

---

## Fase A: fluidez (primeiro, porque é a base do visual)
| # | O que | Por que | Como medir |
|---|---|---|---|
| A1 | **Gestos pela placa de vídeo:** durante a pinça e o arraste, só se aplica um `transform` no desenho já pronto; o mapa é refeito uma vez, ao soltar | Hoje cada movimento refaz o SVG inteiro. Com transform, o celular fraco fica a 60 quadros por segundo | Tempo de quadro durante a pinça (meta: ≤ 16 ms a 6×) |
| A2 | **Guia sem refazer a tela a cada leitura do GPS:** só os números e a posição mudam | Hoje cada leitura (1 por segundo) redesenha a aba toda | Tempo de CPU por leitura (meta: −70%) |
| A3 | **Movimento suave entre leituras:** o ponto azul e o giro do mapa deslizam entre uma leitura e a próxima, em vez de pular | Na moto, a cada segundo a tela "salta" alguns metros | Vídeo antes e depois; nenhum salto > 1 quadro |
| A4 | **Guarda de desempenho no CI** (como a de qualidade do motor): abrir, trocar aba, trocar lote e maior travada, com teto | Nenhuma versão nova fica mais lenta sem ninguém ver | O próprio teste |

## Fase B: visual mais avançado e bonito (sobre a Fase A)
| # | O que | Benefício |
|---|---|---|
| B1 | **Câmera animada:** trocar de lote, enquadrar e seguir com transição suave (zoom e giro animados, 250 ms, "reduzir movimento" desliga) | Sensação de app de navegação, sem saltos |
| B2 | **Mapa com hierarquia cartográfica:** tiro atual forte, demais tiros suaves; setinha de sentido no tiro em andamento; pontos já passados esmaecidos (sem marcar coleta, só pela posição) | Na moto, bater o olho e saber o rumo |
| B3 | **Números que não tremem:** algarismos de largura fixa na distância grande do guia | Hoje "1.182 m" para "1.179 m" mexe a linha |
| B4 | **Folha com física:** arrastar e soltar a folha de baixo segue a velocidade do dedo | Gesto natural, como nos apps nativos |
| B5 | **Modo Sol e escuro revisados no guia:** contraste máximo e um único elemento de destaque por tela | Uso em pleno sol |
| B6 | **Prévia aprovada antes:** imagens antes e depois de cada tela (claro, escuro, Sol, 360 px), aprovadas pelo proprietário antes de publicar | Nada muda sem você ver |

**Critério de aprovação, o mesmo da 4.0:** empatar ou ganhar em cada medida do `design-compare`:
- contraste;
- alvo de toque;
- letra mínima;
- área do mapa;
- nada cortado;
- sem rolagem lateral.

## Fase C: limpeza contínua (a cada versão)
- Arquivo, teste ou documento que nada usa sai na mesma versão. A checagem é automática: um script lista o que não
  tem referência.
- Funções que a equipe não usa saem, com o ok do proprietário (como na 4.2).
- **Branches antigos no GitHub:** 62 já mesclados e 6 não mesclados. Esta sessão não tem permissão para apagá-los
  (o GitHub recusou). Ver "Pendências do proprietário".

### Pendências do proprietário (limpeza que só você pode fazer)
1. **Apagar os branches mesclados.** GitHub → aba Branches → apagar os mesclados. Melhor ainda: Settings → General →
   marcar "Automatically delete head branches". Assim cada PR mesclado apaga o seu branch sozinho.
2. **Branches não mesclados, de 14 a 19/11, já superados pelas versões seguintes:**
   - `claude/3-1-u04-tiros`
   - `claude/3-1-u17-equipe`
   - `claude/4-0-abc`
   - `claude/pos-2-0`
   - `claude/pos-2-2`
   - `codex/revisao-2-0`

   Podem ser apagados.
3. **PR #24** ("2.2: corrige cancelamento…", aberto desde 15/11): já superado pela 3.x e 4.x. Fechar sem mesclar.
4. **PR #74** (Dependabot e CodeQL): revisar conforme `docs/TRANSICAO.md`, item E2.

## Ordem proposta
| Versão | Conteúdo | Observação |
|---|---|---|
| 4.3 | A1 + A2 + A4 | Fluidez, medida e guardada |
| 4.4 | A3 + B1 + B3 | Movimento e câmera |
| 4.5 | B2 + B4 + B5 | Com prévia aprovada antes (B6) |
