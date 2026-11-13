# Mapa conjunto — gestos, revisão e próxima passagem

Base: 1.34.0, main d8b64e26680490660b591fd420452574497049e7.
Candidata: 1.34.1. Sem publicação ou APK nesta revisão.

## Problema e correção

A visão conjunta reconhecia somente um ponteiro. A pinça de dois dedos não
alterava a escala; o ensaio da 1.34.0 mediu razão 1.0 ao afastar os dedos.

A câmera agora acompanha até dois ponteiros e usa o meio dos dedos como
âncora. Ao retirar um dedo, o arraste continua da posição atual. A captura fica
no SVG estável, pois pontos e linhas são recriados no desenho. Gesto não deve
selecionar ponto por acidente. O toque simples consulta diretamente no
`pointerup`, sem depender da síntese de `click` após uma sequência cancelada;
o caso que falhou no teste móvel passou com esse tratamento. Cancelamento, perda de foco, mudança de tamanho,
troca de lote e Enquadrar encerram ou reajustam a interação.

Roda/trackpad aproximam na posição do cursor; botões mantêm a área central.
Limites de zoom continuam 0,6 a 8. Não muda a geometria, o método, o número de
pontos ou a persistência. O visual e os rótulos refinados pelo Claude ficam
preservados; não é uma substituição pelo mapa antigo da 1.31.3.

## Validação reproduzível

```sh
node scripts/build-preserved.mjs --check
npm --prefix audit test
npm --prefix audit run test:blocks
node audit/block-map-gestures-browser.mjs
node audit/block-map-framing-browser.mjs
node audit/save-on-exit-browser.mjs
```

O novo ensaio de gestos faz parte do workflow de blocos. Confere os 40 grupos
preparados em prévia: limites corretos, pinça 2× com âncora estável, arraste
com o dedo restante, ausência de seleção acidental, quantidade de tiros/pontos,
medidas e armazenamento inalterados, roda e recuperação do enquadramento.
Ao final, verifica cancelamento seguido de novo arraste, toque simples em um
ponto e enquadramento em retrato/paisagem/tablet. O teste de enquadramento
separado confere 40 grupos em quatro larguras e uso de um bloco ativo.

Resultados finais e limitações devem acompanhar o PR. São testes Chromium,
com eventos de toque pelo protocolo do navegador, não ensaio físico Android.
Nenhuma coordenada nova, backup privado ou estado de teste deve ser publicado.

## Passagem para o Claude

1. Revisar especialmente captura de ponteiros, retirada de um dedo e cancelamento.
2. Reexecutar o teste de gestos sobre o commit do PR. Conferir o mapa individual
   separadamente: este patch atua no SVG conjunto.
3. Validar em telefone físico e verificar trackpad/Safari quando disponíveis.
4. Próxima prioridade visual: rótulos BD3/T5 e associação dos nomes aos lotes,
   com teste dos 208 tiros e imagens comparáveis. Não alterar métodos para
   resolver problema de leitura da tela.
5. Consultar também o PR #10, que organiza a continuidade compartilhada.

Recuperação: antes de qualquer integração, basta manter main na 1.34.0.
Caso integrado, reverter o commit da mudança pelo fluxo de PR, reconstruindo e
validando os artefatos. Não apagar dados nem reutilizar bundles antigos sem
verificar versão e worker.

## Resultado local concluído

Build determinístico e 87 testes de contratos/blocos passaram. O ensaio final
de gestos passou nos 40 grupos, incluindo os cenários adicionais de cancelamento,
toque e orientação, sem erros JavaScript. Enquadramento em quatro larguras e
os três cenários de gravação ao sair passaram. Falta executar a revisão remota
do PR e o ensaio físico; não houve nova publicação do site.
