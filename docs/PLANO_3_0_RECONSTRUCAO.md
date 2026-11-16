# 3.0 — reconstrução completa do link

Pedido do proprietário (15/11/2026): sem remendo, sem restos, sem sobreposição de versões. Tudo novo, em cada parte.

## Ponto de partida (2.5.0)

| Parte | Novo | Ainda da 1.31 |
|---|---|---|
| Motor | 11 módulos em `src/engine` | 16 módulos minificados (recomendação, rota, equipe, edição de pontos, exportação, projeção, catálogo de parâmetros, qualidade dos dados, vocabulário, presets, explicação, avaliação, trade-offs, número, erros, mapa de fundo) |
| Tela | 11 módulos de ajuste em `src/ui` | 15 módulos de tela + o principal (minificados) |
| Montagem | — | `build-preserved.mjs`: HTML 1.31 + 51 trocas de texto + 3 camadas de CSS |

## O que fica igual (contrato)

- **Método:** linear sem anéis; barra de 36,48 m; P6; 51 lotes; 40 opções de bloco.
- **Funções:** planejar, tiros, dados, auditoria, modo bloco, guia por GPS, fichas, exportações (CSV, GeoJSON, GPX,
  KML), cópia de segurança e restauração, versões do plano, satélite opcional, temas Sol e Noite, uso offline.
- **Dados salvos no aparelho:** quem atualizar não perde nada. O formato antigo é lido e convertido uma única vez.
- **Resultados:** o motor novo dá os mesmos números do atual, provado por teste diferencial, salvo as melhorias
  já aprovadas (plano equilibrado).

## Etapas

| Etapa | O que sai | Como se prova | Publica? |
|---|---|---|---|
| R1 · Contrato | Lista fechada de funções, telas e formatos de dados; testes de comportamento como rede de segurança | Testes atuais passando contra a 2.5 | Não |
| R2 · Motor completo | Os 16 módulos restantes reescritos em `src/engine`, com tipos estritos | Teste diferencial com o motor atual em todos os lotes e blocos | Não |
| R3 · Desenho da tela | Prévias das telas novas no celular (Mapa → Plano → Conferir e enviar), tipografia (5 tamanhos, 3 pesos), cores e ícones | **Aprovação do proprietário** antes de implementar | Não |
| R4 · Tela nova | `index.html` gerado só de `src/` (sem HTML 1.31, sem trocas de texto, sem camadas antigas de CSS); mapa novo com rótulos sem sobreposição | Testes de comportamento + paridade de resultados + contraste + medidas no celular | Não |
| R5 · Troca | Migração dos dados salvos, guardas visuais com referência nova aprovada, versão 3.0.0 | Bateria completa + CI + conferência no aparelho do proprietário | **Sim** |

Até a R5, o link continua na 2.5.0, que funciona. Correções urgentes no 2.5 entram à parte.

## Critérios da 3.0 (medidos)

- Nenhuma linha de código da 1.31 no arquivo publicado.
- Uma folha de estilo única, sem `!important` e sem camadas de versões.
- Link abrindo em menos de 3 s no 3G; resposta ao toque abaixo de 200 ms no celular lento.
- Dados salvos de 2.x abrindo sem perda.

## Andamento

### R2.1 · Base geométrica exata (15/11/2026)

| Peça | Origem | Validação |
|---|---|---|
| `src/engine/predicates.mjs` · lado exato de um ponto em relação a uma reta | robust-predicates 3.0.3 (Shewchuk, domínio público) | Caso quase colinear: a fórmula comum dá 0; a exata dá o lado certo |
| `src/engine/delaunay.mjs` · triangulação de Delaunay | delaunator 5.1.0 (Mapbox, ISC), com o predicado exato | Usada só como atalho; o resultado é conferido (linha abaixo) |
| `src/engine/voronoi.mjs` · cobertura exata (pior vazio, onde fica, área de cada ponto) | Próprio: Voronoi recortado pelo lote, com autoverificação (soma das áreas = lote; senão recalcula com todos os pares) | 153 planos e 2.880 pontos contra Shapely/GEOS: diferença máxima de 4,5·10⁻¹³ m (pior vazio) e 5,7·10⁻⁹ m² (área); 0,58 ms por plano |

A propriedade com lotes aleatórios (fast-check, 300 casos, incluindo pontos colineares) passa: áreas somam o lote,
nenhuma distância real passa do pior vazio exato, e o exato fica entre o máximo e o limite superior da grade.
Achado durante a validação: com pontos quase colineares, o Delaunay descarta um ponto. A autoverificação pega e
corrige.

### R2.3 · Otimização: estudo crítico (15/11/2026)

Nos 51 lotes reais, todas as estratégias mantêm os pontos por tiro e só mudam a posição ao longo do tiro.
Ganho medido em relação ao plano regular:

| Estratégia | Pior vazio (exato) | p95 | Tempo por lote | Decisão |
|---|---|---|---|---|
| **2.5 atual**: p95 com pior vazio travado (busca em 7 posições, 2 rodadas) | igual | **−6,4%**, nunca pior | ~5 ms | **Mantida** |
| Min-max exato (menor pior vazio) | −2,5% | pior em 11 lotes | 59 ms | Descartada |
| Áreas iguais por ponto | pior em 30 lotes | pior em 18 lotes | 89 ms | Descartada |
| Combinação pior vazio + áreas | igual | pior em 15 lotes | 88 ms | Descartada |
| p95 com busca contínua (varredura + seção áurea) e pior vazio exato travado | igual | −4,1% | 90 ms | Descartada: ganha menos e é 18× mais lenta |

Conclusão: a estratégia da 2.5 já está perto do melhor possível com essas regras. O que entrou é a garantia exata:
o plano equilibrado só é usado se o **pior vazio exato** (Voronoi) não passar o do plano regular. Antes isso era
conferido na grade. O resultado continua o mesmo (31 lotes, −11,3% na mediana), agora provado.

### R2.2 · Contorno e projeção: estudo crítico (15/11/2026)

| Item | Medido nos 51 lotes | Decisão |
|---|---|---|
| G3 · distorção da projeção UTM 23S | Longitudes de −46,10 a −45,93 (cerca de 1° do meridiano central). Fator de escala k entre 0,99973 e 0,99978: distância 0,022–0,027% e área 0,044–0,055% (BD3: 466,79 → 467,03 ha) | Não implementar: irrelevante para o plano |
| Área publicada × KML | Publicada maior em 0,05–0,67% (mediana 0,66%, quase constante) | Achado de dados, não explicado pela projeção: a área publicada vem de outra base ou de outro cálculo |
| G2 · contorno inválido | 0 de 51 (Shapely `is_valid`) | Sem reparo automático (mudaria a divisa sem o proprietário saber; regra: não inferir bordas). Arquivo importado com defeito é recusado, com o local do problema |

### R2.4 · Motor completo e fim do motor antigo no arquivo (15/11/2026)

| Item | Resultado |
|---|---|
| Módulos reescritos | 15: vocabulário, erros, números, projeção, compensações, guia, explicação, equipe, atalhos, edição, qualidade do cadastro, catálogo de parâmetros, recomendação, arquivos de saída e índice |
| Prova | `audit/engine-rest-diff.test.mjs`: 14 testes diferenciais contra o motor 0.5.1 nos 51 lotes (CSV, GPX, KML e GeoJSON comparados byte a byte); no CI (`test:blocks`) |
| Tipos | `tsc` estrito sem erro nos 30 módulos |
| Empacotador | Cada módulo no seu escopo: nomes internos repetidos não colidem mais (antes só o primeiro nome de cada declaração era conferido) |
| Arquivo publicado | Página e worker sem nenhum módulo do motor 0.5.1; regra do P6 (rumo aprovado) agora dentro do motor, sem remendo de texto |
