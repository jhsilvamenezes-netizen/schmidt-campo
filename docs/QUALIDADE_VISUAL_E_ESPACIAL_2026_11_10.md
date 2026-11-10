# Qualidade visual e espacial como um único contrato

10/11/2026. Complemento executado à candidata local e à projeção r5.
Metodologia atual: tiros orientados pela referência, pontos por trecho,
individual/bloco e barra de 36,48 m quando aplicável. Sem anéis.

## Nova conferência realizada

Script: `audit/block-operational-quality.py`, usando Shapely/GEOS sobre os
cenários r3 locais. A equivalência dos cenários com a candidata atual foi
verificada na etapa de cache; este script não recalcula a busca de grade.

- 40 blocos, 56 ocorrências de pares de membros (incluem pares repetidos em
  subconjuntos; não são 56 pares únicos nem 56 vistorias físicas).
- Nenhuma sobreposição maior que 1 m² entre os membros analisados.
- Nenhuma coincidência de pontos entre membros, tolerância numérica 1e-6 m.
- Em todos esses pares, o segmento entre os pontos mais próximos atravessa
  algum espaço fora da união dos polígonos. Isso não significa impossibilidade
  de trabalho em bloco e não define por si só o percurso operacional.
- Separação mínima entre polígonos: aproximadamente 1,98 a 2.017,37 m nesta
  coleção. Blocos por referência podem incluir membros distantes; alinhamento
  compatível não prova contiguidade nem ganho de tempo.

BB1 + BC1: separação mínima das divisas **2,81 m** na base; pontos de membros
opostos mais próximos **465,21 m**; a ligação reta entre esses pontos percorre
aproximadamente **3,22 m fora dos polígonos**. São três medidas diferentes.
Não são largura de estrada medida em campo, recomendação de recuo, distância
entre tiros ou percurso aprovado. Não alterar a geometria para fazer coincidir
as bordas nem reduzir pontos com base nessas medidas isoladas.

Relatório completo: `audit/results/operational-quality/cross-lot-quality.json`.
Nenhum parâmetro, ponto, limite ou coleta foi alterado por esta conferência.

## Consequência para o refinamento gráfico

A apresentação deve permitir entender a mesma geometria que os cálculos usam.

| Elemento | Tratamento proposto | Critério verificável |
| --- | --- | --- |
| Divisas | Preservar contornos e separações; identidade por lote | Nenhuma união visual obtida fundindo geometrias ou estendendo tiros |
| Visão conjunta | Enquadrar todos os integrantes; acesso rápido a cada um | Nomes acessíveis e contagem correta, inclusive em grupos dispersos |
| Visão do membro | Ampliar mantendo os pontos do bloco | Nenhum recálculo ou troca silenciosa para o plano individual |
| Tiros | Peso e contraste próprios; selecionar destaca só o contexto | Trechos recortados no lote; não ligar extremidades através de espaços externos |
| Pontos | Hierarquia entre comum, selecionado e coletado | Forma/rótulo acompanha cor; seleção inequívoca com pontos próximos |
| Rótulos | Prioridade lote → tiro → ponto selecionado; demais conforme zoom | Evitar colisão e encobrimento; lista alternativa mantém acesso a todos |
| Medidas | Unidade, escopo e precisão de apresentação coerentes | Intervalo no trecho, distância lateral e borda não se confundem |
| Distância entre lotes | Informação contextual em detalhe quando útil | Não virar trajeto sugerido ou indicador de acesso confirmado |
| Tipografia | Valores principais legíveis e alinhados, unidade consistente | Texto ampliado e viewport pequeno sem cortar dados ou ações |
| Cores e superfícies | Reutilizar identidade atual, com contraste medido | Não depender de cor para estados; conferir sol/aparelho antes de homologar |
| Controles | Zoom/foco/seleção com estados claros e alvos confortáveis | Arraste e cancelamento de gesto não acionam coleta |
| Qualidade vetorial | Geometria precisa, linhas/textos nítidos por escala | Zoom não distorce distância; escala acompanha transformação real |

Não desenhar uma estrada, passagem, recuo ou rota que a base não fornece.
Uma separação de poucos metros pode ser subpixel na visão conjunta. O detalhe
ampliado e a informação contextual devem explicar isso sem distorcer o mapa.
As propostas visuais acima ainda precisam de comparação específica antes de
integração conforme a diretriz do proprietário; este relatório não é um aceite.

## Assertividade da distribuição: o que validar

1. **Referência e unidade:** origem, rumo e sistema de coordenadas coerentes;
   comparação da fase em coordenadas comuns, não somente da aparência das linhas.
2. **Quantidade por membro:** respeitar mínimo individual; o total do bloco não
   compensa um membro insuficiente. Não otimizar apenas para menos pontos.
3. **Posicionamento:** contenção no próprio lote, divisas e furos preservados,
   IDs únicos por contexto e tratamento explícito de edições manuais.
4. **Espaçamento:** separar passo dos eixos e intervalos reais dentro de cada
   trecho. Não medir através de um buraco ou outro lote como se fosse um trecho.
5. **Cobertura:** comparar distâncias das células aos pontos com a referência
   individual. P95 e máximo nos centros amostrados não são garantia de cobertura
   contínua ótima nem prova de representatividade agronômica.
6. **Operação:** entradas, obstáculos e circulação precisam de confirmação
   física; não presumir caminho reto ou redução de tempo pela referência comum.
7. **Especialidade agronômica:** densidade, representatividade e objetivo da
   amostragem dependem de critérios do responsável técnico. Não deduzir método
   agronômico melhor apenas da regularidade geométrica ou de recomendações web.
8. **Apresentação:** mapa, cartões, lista e exportação devem consumir a mesma
   revisão de dados. Precisão numérica não deve ser apresentada como precisão GPS.

## Estado de implementação e próximos passos concretos

Já implementados na candidata local: cancelamento consistente e reutilização
segura dos cenários. Já disponível como projeção: mapa conjunto e foco por lote,
com pontos, tiros, cotas e detalhes. Novo nesta etapa: diagnóstico independente
entre membros e contrato visual/espacial acima.

Continuam pendentes de execução: avaliação com operadores/aparelhos, contraste
medido da proposta completa, gestos completos e integração visual aprovada.
Não há nova versão publicada, novo APK ou alegação de homologação agronômica.

Antes de integrar o desenho, incluir projeções dos casos que mais exigem o
layout: dois lotes separados por faixa estreita, três membros, membros distantes,
mapa denso, ponto selecionado, coleta existente, fonte ampliada e retomada offline.
Cada caso deve ter resultado visual e critério técnico, sem reduzir a conferência
a uma contagem de testes ou a uma imagem esteticamente agradável.
