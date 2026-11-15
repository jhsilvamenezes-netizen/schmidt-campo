# Reescrita do motor — primeira entrega de código

Base publicada: 2.0.1, main 118e6d6. O proprietário solicitou explicitamente
reescrever o motor de forma estruturada. Esta candidata inicia a substituição
real por `src/engine/boundary.mjs`; o restante do núcleo legado continua ativo.
Não representa conclusão da reescrita nem nova versão publicada.

## Componente implementado

Consulta de bordas independente de DOM, armazenamento e estado global, com
snapshot privado da geometria, resultado contendo distância/projeção/segmento,
empates determinísticos e índice hierárquico de caixas (BVH). Furos e componentes
desconectados mantêm suas identidades. Segmentos degenerados são considerados.

O aplicativo usa busca direta nas distâncias agregadas e na consulta única.
O ensaio de construir BVH por chamada deu mediana de 7,33 ms contra 3,79 ms
no legado (139 casos/15 rodadas em Node). Portanto a BVH ficou opt-in, para
uso com snapshot reaproveitado após medição específica. Menos comparações não
foi tratado como prova de aplicativo mais rápido. A API preparada
permite reaproveitar o índice explicitamente; não há cache global dependente de
objetos mutáveis. Alterar a geometria exige construir novo snapshot. A seleção
usa distância real; a tolerância conservadora na poda serve só para evitar
excluir candidatos por arredondamento numérico.

Mapa, resumo de bloco e alternativas passam a chamar o mesmo núcleo. A versão
global 0.5.1-sim ainda identifica o restante do motor; não foi renomeada para
sugerir que toda a geração de tiros/pontos já foi substituída.

## Evidência e reprodução

- `node --test audit/boundary-engine.test.mjs`: casos analíticos, furos, partes,
  empate, degenerados, entrada inválida, isolamento e transformações; mais 4.000
  consultas determinísticas comparadas com busca exaustiva.
- `node audit/direction-measures-probe.mjs` e `python audit/direction-measures.py`:
  conferência independente do aplicativo integrado com GEOS/PROJ.
- `node audit/boundary-engine-real.mjs`: 51 lotes, 40 grupos, 2.284 consultas;
  comparação com medidas registradas e consistência dos três adaptadores.
- `node audit/boundary-engine-benchmark.mjs`: 15 rodadas por variante, ordem
  alternada e aquecimento, comparação do caminho compartilhado final com o legado. Mede apenas esta
  operação em Node, sem extrapolar para FPS, bateria ou velocidade total do app.
- Contratos, módulos/blocos e consulta do mapa após edição são reexecutados.

Resultados agregados: `audit/motor-stage1-evidence.json`. Dados intermediários
continuam em `audit/results`, ignorado pelo Git. A nova regressão real integra
CI depois da extração espacial, sem publicar coordenadas novas.

## Próximas unidades

1. Validar esta candidata em CI e revisar custo de construção/consulta no navegador.
2. Extrair contratos de geometria, tolerâncias, projeção e polilinhas com paridade.
3. Reescrever recorte, alocação e geração de tiros/pontos em módulos próprios,
   com oráculo independente e versões explícitas dos resultados.
4. Unificar execução/cancelamento/revisão entre página e worker.
5. Completar busca de alternativas e aplicação/desfazer do bloco inteiro.
6. Projetar e comparar a interface móvel usando os resultados do novo motor.

Fila detalhada e critérios: `UPGRADE_MOTOR_E_MOBILE.md`. Preservar método linear,
barra de 36,48 m, P6, parâmetros e dados. Uma alteração visual ou matemática
intencional deve ter sua diferença justificada e validada. Não promover este
componente isolado como motor completo reescrito.
