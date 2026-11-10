# Mapa conjunto e mapa de cada lote — estudo r5

10/11/2026. Branch `codex/auditoria-evolucao-segura`.
**Projeção local funcional, não uma versão publicada ou candidata de produção.**
A referência publicada permanece 1.31.0-r3-blocos-revisada. A r4 anterior foi
mantida para rastreabilidade; esta proposta substitui seu desenho simplificado.

## Problema e resultado esperado

O mapa principal da r3 continua mostrando só um membro do bloco; a miniatura
conjunta não tem a mesma informação operacional do mapa individual. A projeção
r4 confirmou a ideia da escolha pelo mapa, mas sua geometria simplificada não
oferecia identificação/detalhe suficientes para a atividade.

A r5 usa um mesmo componente de mapa detalhado para o conjunto, cada membro
do bloco e o plano individual. Polígonos completos, divisas internas, tiros,
pontos, nomes, escala métrica e orientação são preservados. Não funde lotes e
não substitui os cálculos do app. Os cenários são gerados pelo motor atual da r3.

## Três ações que precisam continuar distintas

| Ação | O que muda | O que permanece |
| --- | --- | --- |
| Conjunto | Enquadramento e resumo do bloco | Planos, geometrias e identificação de todos os membros |
| BB1 ou BC1 na faixa do mapa | Amplia só o membro e apresenta suas medidas | Mesma revisão, grade e pontos do bloco |
| Individual no controle de modo | Carrega o plano individual do lote em foco | Registro do bloco preservado; nenhuma conversão de coletas |

Exemplo concreto: BC1 dentro de BB1 + BC1 tem **24 pontos**. O plano individual
padrão de BC1 tem **23**. Apertar BC1 na faixa do mapa não pode recalcular para
23. Esse contrato é verificado no navegador. O conjunto tem 50 pontos: BB1 26
e BC1 24. A distância entre tiros permanece 401,28 m nos dois membros.
No conjunto, os intervalos entre pontos no mesmo trecho variam de 417,17 a
512,05 m; em BC1, de aproximadamente 423 a 512 m. A interface identifica o escopo.

## Organização visual e informação

- **Decisão de planejamento:** modo, membros e quantidade total; Alterar lotes
  abre os membros compatíveis. Combinação incompleta não mostra um mapa antigo
  como se fosse seu resultado e não permite confirmar.
- **Leitura do mapa:** Conjunto e botões de cada lote, sem esconder o terceiro
  membro numa faixa cortada. Ao ampliar um membro, Ver bloco mantém o contexto
  disponível fora da área cartográfica, sem encobrir pontos.
- **Leitura operacional:** cartões permanentes de distância lateral entre
  tiros e intervalo real entre pontos no trecho, com lote/bloco identificado.
- **Detalhe contextual:** toque ou teclado no ponto revela lote, ID, tiro,
  próximo ponto do mesmo trecho e perpendicular à borda. As cotas no mapa têm
  os mesmos valores do cartão. No exemplo BC1/P1: 492,4 m até P2 e 235,3 m à borda.
- **Conferência secundária:** distribuição por lote, mínimos, borda mínima,
  referência da barra 36,48 m e consulta de ponto por lista ficam recolhidas.
  Não se introduz recuo obrigatório ou texto de histórico de versões na operação.

Os nomes de lote têm prioridade cartográfica. Quando precisam sair do interior,
uma linha de chamada liga o rótulo a um ponto interno do lote. Depois entram
os nomes de tiros e os números de pontos. A colocação usa candidatos em pixels
com rejeição de sobreposição e reserva a área dos controles. A visão geral
mostra todos os pontos, mas pode omitir números quando não há espaço; ampliar,
selecionar um ponto ou usar a consulta por lista mantém a identificação acessível.
Não alegar que todas as numerações cabem simultaneamente na menor tela.

## Métodos e ferramentas avaliados

| Escolha | Aplicação e justificativa |
| --- | --- |
| Modelo de cena separado do plano | `audit/block-map-scene.mjs`: projeção de leitura derivada de polígonos/cenários, sem dependência de DOM, Storage ou GPS. A troca de foco não chama o gerador. |
| Coordenadas métricas comuns | Translação pelo centro de referência da cena; preserva distâncias, orientação, anéis e fragmentos sem introduzir outra reprojeção ou arredondar dados do motor. |
| SVG e `viewBox` | Mesma representação vetorial nas três visões; largura de traço, texto e áreas de toque em pixels. Zoom, arraste, reenquadramento, norte e escala associados à transformação efetiva. |
| Descarte de rótulos por colisão | Priorização e busca de posições livres, com linhas de chamada para nomes. Rótulos são apresentação; pontos e medidas continuam completos. |
| Índice de pontos por trecho | Agrupa e ordena uma vez por trecho; evita buscas/sorts repetidos por ponto e impede ligar IDs repetidos de lotes diferentes. |
| IDs qualificados no desenho | `lote::id` distingue P1/T1 repetidos no conjunto sem renomear os IDs persistidos do app. |
| Playwright/Chromium | Exercita mapas, alternância de contexto, teclado, seleção inválida, controles, contagens, rótulos, capturas e ausência de gravações/conexões. |
| Shapely/GEOS | Oráculo independente para coordenadas, contenção, recorte de linhas e distâncias ao próximo ponto e às bordas. |

Não foi instalada dependência nova. Canvas/WebGL e bibliotecas de mapa como
OpenLayers/MapLibre são alternativas a avaliar se medições demonstrarem limite
real de SVG, necessidade de base geográfica ou volume importado maior. Não se
propõe trocar o motor ou adicionar mapas online para resolver esta apresentação.
Um mapa com cores ou biblioteca mais sofisticadas não prova correção espacial.

Referências oficiais efetivamente consultadas nesta etapa:

- [MDN: SVG viewBox](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox): sistema de coordenadas e transformação do viewport.
- [W3C: Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): tamanho/espaçamento de alvos. A projeção usa controles explícitos e consulta alternativa por lista; pontos densos ainda exigem avaliação em toque real. Não é certificação WCAG.

As consultas HTTP à API de OpenLayers e ao manual de rótulos QGIS retornaram
403; não foram usadas como evidência de conteúdo lido. A decisão de manter SVG
se baseia no app existente e nos ensaios locais, não numa alegação de consulta
bem-sucedida desses manuais. Metadados em results/block-map-quality-r5/references.json.

## Validação executada

- **51 cenários individuais + 40 blocos**, gerados pelo motor atual, sem mudar
  parâmetros ou geometrias publicadas. Há 88 pares bloco/membro, totalizando
  139 membros considerados nos 91 cenários.
- **197 visualizações e 1.929 verificações no navegador:** conjunto, membros,
  individual, pontos efetivamente desenhados, IDs únicos, presença dos nomes de
  todos os lotes e de rótulos de tiros/pontos, ausência de colisão entre rótulos
  e de pontos encobertos por controles. Inclui seleção incompleta e retorno ao
  plano individual. Não representa avaliação por 197 operadores.
- Todos os cenários/focos foram percorridos em 390×844; BB1/BC1 também foi
  verificado em 360×800, 412×915, 768×1024 e 1280×1024. Nos cinco tamanhos,
  cartões de distância visíveis, mapa útil de pelo menos 330 px e sem rolagem
  horizontal. Capturas inspecionadas manualmente, incluindo três lotes e desktop.
- **GEOS:** 2.284 posições de pontos e medidas à borda; 623 trechos; 1.661
  intervalos no mesmo trecho; 138 medidas entre eixos com endpoints sobre os
  tiros. Coordenadas e recortes idênticos ao plano de origem, tolerância de
  1e-6 m para verificações numéricas. Não indica precisão física micrométrica.
- Os dados reais desses cenários não contêm furos. Caso sintético verifica a
  borda interna; testes de contrato verificam fragmentos, IDs repetidos entre
  lotes, imutabilidade das entradas e foco sem recálculo: **5 testes passaram**.
- Zero erros JS/CSP, conexões externas e chamadas de gravação/GPS na projeção.
  HTML, worker e identificação da versão do app mantiveram os hashes anteriores.

Comandos de reprodução, após preparar os registros locais r3:

```
node audit/block-map-quality-export.mjs
node audit/block-map-quality-browser.mjs
audit/.venv/bin/python audit/block-map-quality-spatial.py
node audit/block-map-scene.test.mjs
```

O arquivo interativo tem aproximadamente 1,33 MB porque inclui os 91 cenários
para comparação offline. Isso é um pacote de estudo; na integração futura,
gerar/carregar somente a cena necessária e aproveitar os dados/caches do app.

## Plano de implementação depois da aprovação desta proposta

1. Integrar o contrato de cena de leitura ao renderer do app, com as mesmas
   camadas e interações para individual e bloco; manter motor e persistência.
2. Separar estado de planejamento, revisão ativa, foco do mapa e seleção de
   ponto. Nenhum foco de lote pode trocar a revisão ou recalcular a grade.
3. Associar prévia assíncrona à assinatura das entradas; descartar respostas
   antigas e impedir confirmação até o cálculo válido. Aplicar pelo controlador
   atual de blocos, retomando registros existentes e preservando coletas.
4. Ligar seleção de ponto/tiro às ações existentes somente no escopo ativo.
   Prévia não recebe coletas. Manter exportações com identificação por lote.
5. Repetir regressões dos 51 individuais/40 blocos, edição manual, backup,
   retomada offline, GPS com mocks e atualização PWA. Comparar visual fora do
   escopo autorizado, avaliar toque/gestos, contraste e legibilidade em aparelho.
6. Só então preparar PR e capturas da implementação para a revisão de entrega.

A projeção não implementa coleta, navegação operacional, GPS, sincronização,
worker de cálculo, multi-touch completo ou migração de dados. Não foi ensaiada
em aparelho no campo. Passagens físicas, qualidade da origem dos contornos e
fonte geradora original completa continuam questões independentes.

## Entrega e preservação

Entrega local: `/workspace/entregas-schmidt/estudo-mapa-bloco-r5/`.
Contém comparação, HTML interativo, capturas, relatórios, este estudo e manifesto.
Dados de trabalho ficam ignorados em `audit/results/block-map-quality-r5`.
Não foram alterados `src/`, `index.html`, `sw.js`, `VERSAO.json`, main, Pages ou
APK; não houve push, merge ou publicação desta proposta.

Segue a ordem de AGENTS.md: “aguardar aprovação expressa do proprietário para
a proposta específica”. O pedido atual é tratado como aprofundamento do estudo
e da projeção, sem presumir aceite do novo desenho nem aprovação de publicação.
