# Escolha de bloco e mapa conjunto — estudo r4

Data: 09/11/2026. Status: **projeção local, sem implantação**.
Referência verificada: Pages 1.31.0-r3-blocos-revisada. A r4 identifica o estudo,
não uma nova versão publicada. Mantida a branch codex/auditoria-evolucao-segura.

## Diagnóstico reproduzido no link real

Em navegador isolado, a seleção BB1 + BC1 não atualizou o mapa principal:
ele continuou em BD3. Preparar mostrou o conjunto em uma miniatura secundária,
mas deixou BD3 no mapa principal. Aplicar mudou o mapa principal para BB1,
com BB1 + BC1 ainda na miniatura. A miniatura não identifica os lotes com
rótulos nem mostra cotas. As distâncias aparecem no texto do painel.

Portanto, o modo bloco funciona como planejamento comum e execução por membro,
mas sua apresentação conjunta ainda é insuficiente. Os testes operacionais
anteriores não demonstravam que o mapa principal mostrava o bloco inteiro.
A seleção entre 40 combinações prontas também força o operador a procurar uma
combinação na lista em vez de indicar os lotes que deseja executar.

Evidência: DIAGNOSTICO-ATUAL.json e três capturas Atual-*.png na entrega local.
O teste usa perfil temporário e dados sintéticos, sem acessar coletas da equipe.

## Proposta específica para aprovação visual

1. Na escolha de bloco, enquadrar os lotes compatíveis no mapa principal,
   mantendo suas divisas, nomes e seleção visível. Selecionar por toque no
   polígono ou botão do lote; apresentar apenas os compatíveis com o contexto
   atual. Individual permanece uma escolha explícita.
2. Exibir imediatamente a prévia calculada do conjunto, sem obrigar a procurar
   uma combinação e depois apertar Preparar. Manter uma confirmação Usar bloco
   para distinguir prévia de plano ativo. Um lote só permite uso individual;
   nenhum lote selecionado desabilita a confirmação.
3. Deixar entre tiros e entre pontos em dois cartões visíveis. A distância
   entre pontos é um intervalo real por trecho, não um valor uniforme fictício.
   No mapa, mostrar cotas representativas; ao focar um lote em execução,
   atualizar as cotas e identificar o escopo no cartão sem esconder o conjunto.
4. Recolher quantidades mínimas, distribuição por lote e distância mínima à
   borda em Detalhes por lote. A barra de 36,48 m permanece nesse detalhamento.
   Não introduzir recuo obrigatório, união de divisas ou passagem presumida.
5. Após aplicar, tocar num lote passa a focá-lo; Rever seleção retorna à escolha.
   Evitar que um toque durante a execução altere silenciosamente o bloco.

O HTML é uma simulação interativa específica desses estados, não substitui
os cinco passos de Plano nem implementa navegação/GPS/coleta. A navegação de
referência foi copiada para contextualizar; o protótipo só navega entre a
escolha e o mapa. Nenhum módulo do estudo é importado pelo runtime do app.
Na implementação futura, manter as demais telas e os demais parâmetros.

## Exemplos com cálculo real

Os planos foram calculados pelo motor do Pages r3 e pelas configurações do
estudo de blocos já validado. As geometrias desenhadas e as cotas vêm desses
planos. Não se trata de um desenho inventado ou de novos dados do KML privado.

| Seleção | Pontos | Entre tiros | Entre pontos no mesmo trecho |
|---|---:|---:|---:|
| BB1 + BC1 | 50 | 401,28 m | 417,17–512,05 m |
| BA1 + BA2 + BA3 | 58 | 364,80 m | 345,54–506,90 m |
| BA1 + BA2 | 27 | 437,76 m | 397,99–501,85 m |
| BA2 + BA3 | 47 | 364,80 m | 410,24–554,09 m |

BB1 + BC1 tem 26 + 24 pontos; mínimos individuais 26 + 23. A cota de 501 m
na imagem é a distância arredondada entre dois pontos reais de BB1, enquanto
417–512 m resume o conjunto. Os números diferentes têm escopos diferentes.
Não interpretar a cota representativa como distância de todos os pontos.
A menor distância ponto–borda mostrada no detalhe considera também buracos.
O desenho conserva linhas recortadas por lote, sem sugerir um trajeto contínuo
entre áreas onde a passagem física não foi confirmada.

## Engenharia proposta após aprovação

- Criar um adaptador de cena conjunta, somente de leitura, reunindo polígonos,
  tiros e pontos em coordenadas métricas comuns. Não substituir app.field ou
  app.sc por um lote fictício nem alterar as chaves dos dados individuais.
- Traduzir a seleção para o catálogo já existente de blocos compatíveis. A
  prévia deve usar o gerador atual com identificação de entradas e cancelamento
  de respostas atrasadas. Nunca desenhar linhas de um cálculo anterior sob os
  números de uma seleção nova; usar estado de cálculo e impedir confirmação
  enquanto não houver resultado válido.
- Aplicar atomicamente pelo controlador atual. Retomar o registro existente
  quando corresponder à mesma revisão; mudanças de membros/parâmetros geram
  revisão separada, sem transferir coletas silenciosamente. Mostrar confirmação
  explícita se houver operação ativa que precise ser substituída.
- Distinguir clique de seleção de clique de foco. No desenho, identificar
  pontos/tiros também pelo lote, evitando colisão de IDs repetidos. A execução
  e persistência continuam por membro. Proibir registrar coleta numa prévia.
- Escalonar rótulos/cotas conforme zoom e foco para não sobrepor divisas,
  controles ou pontos. Os cartões resumidos continuam visíveis na escolha;
  dados secundários ficam no detalhe. Não acrescentar avisos históricos.
- Validar todos os 40 grupos, os 51 planos individuais, edição manual,
  exportações, backups, retomada offline, atualização e perfis com coletas.
  Acrescentar testes de presença dos lotes no mapa principal e escopo das
  distâncias. Comparar capturas fora da área aprovada antes de propor merge.

## Validação executada desta projeção

`node audit/block-choice-review.mjs` reproduz o diagnóstico no link público.
`node audit/block-choice-projection.mjs` exporta os dez cenários reais.
`node audit/block-choice-projection-browser.mjs` verifica 48 condições:

- Contagens e mínimos de dez cenários, cotas métricas obtidas da geometria.
- Seleção no mapa/teclado, subconjuntos e retorno individual; 50 pontos no bloco
  BB1/BC1 continuam visíveis ao focar um membro.
- Medidas e ação visíveis sem rolagem horizontal em 360×800, 390×844 e
  1280×1024; quatro capturas da proposta, três da interface publicada.
- Zero erros de página/CSP, conexões externas, gravações em Storage/IndexedDB
  ou chamadas GPS na projeção. A aplicação nela é apenas simulada em memória.

Isso valida a projeção, não uma implementação r4 no app, nem ensaio físico ou
homologação de passagens. Os planos individuais são exemplos de referência,
não comparação de rendimento comprovada entre campo individual e bloco.

## Entrega e preservação

Arquivos em `/workspace/entregas-schmidt/estudo-escolha-bloco-r4/`:
COMPARATIVO.html, Projecao-Escolha-Pelo-Mapa.html, capturas e relatórios JSON.
Os arquivos de geometria de trabalho ficam ignorados em audit/results.
Não foram alterados src/, index.html, sw.js, VERSAO.json, main, Pages ou APK.
Não houve envio, merge nem publicação neste estudo.

A nova proposta segue AGENTS.md, regra: “aguardar aprovação expressa do
proprietário para a proposta específica”. O aceite anterior do runtime r3 não
é tratado como aprovação automática desta mudança no mapa e no fluxo.
