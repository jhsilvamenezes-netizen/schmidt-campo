# Fila de execução — direcionamento 2.0 web

Base de passagem: **1.35.1 publicada**, main
`2e4e2be9a44310b847155bdef9d7b78b9865ccd0`, PR #14. Conferir novamente.
Estado desta fila: pronta para começar; os itens abaixo não foram implementados.
Plano e caderno: [01–45](PLANO_VERSAO_2_0.md), [métodos/design](APROFUNDAMENTO_2_0_WEB.md).

## Primeiras entregas, na ordem

| Entrega | Itens do plano | Resultado concreto e teste | Estado |
|---|---|---|---|
| E1 — referência reproduzível | 01–03 | Inventário fonte/legado, versão/cenários fixos, tempos mediano/p95 de abertura e desenho contra versão anterior; scripts reproduzíveis e relatório sem dados privados | A iniciar |
| E2 — medidas de direcionamento | 05–14,20,23 | Tabela por caso com motor vs GEOS/PROJ, unidade/tolerância e erro; testar 51 lotes/40 grupos e consulta após editar plano; corrigir primeiro erro reproduzido | A iniciar após referência E1 |
| E3 — cobertura e ajustes | 15–19,22 | Estabilidade da avaliação e alternativas de fase/espaçamento/quantidade; todos os parâmetros preservados e sem impor regra agronômica | A iniciar após E2 |
| E4 — GPS e consulta | 24–27 | Fix inválido não orienta; distinguir rumo/curso e desvio lateral/avanço; seleção manual estável, sem marcar execução | A iniciar; casos sintéticos podem avançar após E1 |
| E5 — desenho com dados reais | 28–35 | Projeção determinística sobre mesmo cenário antes/depois: lote, bloco, medidas, ajustes de tiros/pontos, temas, rótulos e larguras móveis; conferir escopo aprovado | A iniciar; depende de medidas E2 |
| E6 — implementação móvel | 28–35,40,42 | Entregar cada refino aprovado por PR pequeno; comparação visual, gestos/teclado e mesma geometria de cálculo/exportação | A iniciar após E5 |
| E7 — robustez do link | 36–44 | Offline real, importação limitada, cache invalidado, retomada/rollback e recursos limitados; corrigir gargalo medido com paridade | A iniciar; falhas confirmadas podem ser corrigidas antes |
| E8 — piloto e liberação | 04,45 | Roteiro de direcionamento em dois celulares, erros/tempo/legibilidade registrados; CI e URL real conferidos | Roteiro pode ser preparado já; aparelho depende da equipe |

Não tentar executar tudo em uma alteração. E1 termina com uma próxima ação de
código verificável; não repetir inventários indefinidamente nem esperar telefone
para corrigir uma falha interna já reproduzida. Se não existir erro em um caso,
registrar a evidência e avançar. Não declarar evolução 2.0 concluída só pela versão.

## Critérios adicionais para incluir na execução

Estes refinam tarefas existentes; não são projetos extras nem motivos para
adicionar bibliotecas sem necessidade.

- **Contrato de coordenadas e unidades nas fronteiras:** coordenada local/UTM/
  geográfica e metro/ha/grau não podem ser intercambiados por nome genérico.
  Tipagem gradual/JSDoc e validação em importação/câmera/exportação; teste de erro
  de eixo, zona e unidade sem modificar o dado original (E2).
- **Precisão e tolerâncias com origem:** distinguir arredondamento visual, erro
  numérico, distorção e qualidade do limite/GPS. Registrar a justificativa da
  tolerância de cada comparação; evitar “erro zero” baseado em igualdade visual (E2).
- **Identidade dos trechos desconectados:** um mesmo tiro em dois componentes
  não autoriza ligar pontos através do vazio; índice/ordem/export têm que conservar
  a identidade de cada trecho, inclusive depois de ajustes (E2/E3).
- **Revisão do plano determinística:** parâmetros, origem, edição e versão do
  algoritmo definem a revisão. Plano não muda porque o desenho ordenou objetos
  ou formatou decimais; resultado de processamento antigo não se aplica (E3/E7).
- **Testes metamórficos:** translação/rotação preservam distância; inverter
  sentido troca convenção dirigida mas não espaçamento do eixo; mudar ordem
  equivalente de membros mantém geometria. Não assumir equivalência onde entrada
  ou referências dirigidas fazem diferença (E2).
- **Orçamento de desenho e capacidade:** evitar espalhar arrays enormes em
  Math.min/max, trabalho repetido e listeners/URLs sem liberação; testar tamanhos
  aceitos e cancelamento. Renderer/Worker só com ganho medido e mesma seleção (E7).
- **Viewport real do navegador móvel:** barra de endereço recolhida/expandida,
  safe areas, teclado, rotação e altura reduzida não cobrem mapa/cotas/controles.
  VisualViewport/dvh com fallback conforme suporte, sem exigir instalação (E5/E6).
- **Reprodução visual baseada em geometria verdadeira:** mockup de IA não é
  oráculo de escala, espaçamento ou limite. Gerar comparação de DOM/SVG com câmera
  e dados fixos antes de aceitar a versão implementada (E5/E6).
- **Regressão versus baseline recente:** referência histórica permanece, mas
  comparar também com a última versão publicada. Separar tempo de carregar,
  recuperar dados, calcular e desenhar; cinco amostras não comprovam bateria (E1/E7).
- **Handoff resistente à interrupção:** cada frente publica código/estado em
  intervalos curtos; teste/CI em andamento fica identificado pelo ID e commit.
  Resultado não observado fica “não executado/pendente”, nunca “passou” (todas).

## Rotina de retomada em cada entrega

1. Ler [RETOMADA.md](RETOMADA.md), JSON e branch/PR indicado. Conferir HEAD e
   trabalho local antes de fetch/merge; nunca resetar trabalho alheio.
2. Registrar dono e tarefa. Uma frente por branch; revisor usa branch separada.
3. Reproduzir a última evidência. Executar a próxima ação registrada, não reiniciar
   o estudo inteiro nem implementar de uma vez as 45 linhas.
4. Depois de cada unidade de código/teste, gerar checkpoint, revisar os arquivos
   exatos a enviar e publicar commit na branch. Abrir/atualizar PR cedo.
5. Antes da pausa, publicar mesmo uma alteração incompleta útil, claramente
   marcada WIP e com teste falhando/pendente. Nunca integrar WIP em main.

## Segurança do produto e limites

Direcionamento exclusivo pelo link; sem coleta/marcação pela equipe. Preservar
legado e configurações. Método linear sem anéis, barra 36,48 m, P6 atual,
Plano padrão/Satélite opcional, sem inferir divisas ou acesso de fotografia.
APK adiado. Novas alterações visuais exigem comparação e conferir a aprovação
aplicável. A nova sessão recebe os mesmos limites, decisões e evidências.

Guia para evitar perda por limite: [CONTINUIDADE_SEM_PERDER_TRABALHO.md](CONTINUIDADE_SEM_PERDER_TRABALHO.md).

[Matriz por parâmetro](MATRIZ_PARAMETROS_2_0.md): 35 campos do catálogo, estruturais e contextos, com cálculo/validação, apresentação e prova.
