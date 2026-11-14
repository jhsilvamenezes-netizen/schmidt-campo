# Revisão r2 — memória e rede no celular

Revisão interna da candidata 1.35.0; mesmo visual, método e formato de dados.
Não altera a versão publicada. O pacote r1 permanece disponível separadamente.

## Correções implementadas

1. **Transferência limitada durante a leitura.** O código anterior conferia o tamanho depois de `response.blob()`, quando o corpo inteiro já estava em memória. A nova leitura com Streams API interrompe ao ultrapassar 4 MiB para imagem ou 64 KiB para metadados, mesmo sem Content-Length ou com um valor incorreto. Libera o reader em erro/cancelamento.
2. **Validação antes de mostrar a imagem.** Analisa o cabeçalho PNG/JPEG antes de decodificar; recusa dimensões excessivas ou diferentes do envelope informado. A decodificação nativa confirma o arquivo e o bitmap temporário é fechado. Imagem inválida mantém o Plano, em vez de indicar um carregamento bem-sucedido.
3. **Segundo plano.** Cancela consultas e agendamentos quando a página fica oculta. Ao retornar, reutiliza uma imagem adequada ou refaz a consulta para a câmera atual. Sem downloads iniciados enquanto a página está oculta.
4. **Recursos liberados.** Ao retornar a Plano, inclusive por falha, libera os URLs das imagens. Reutiliza o nó SVG existente quando a câmera não exige recriar a camada, evitando inserções redundantes.

O módulo `src/platform/bounded-response.mjs` pode ser testado sem DOM e não traz
biblioteca adicional. A integração permanece em `src/ui/satellite-map.mjs`.

## Evidência e limites

Dez testes novos cobrem corpo fragmentado, limite exato, servidor sem tamanho
ou com tamanho falso, cancelamento pendente, falha de rede e cabeçalhos de
imagem inválidos/excessivos. No ensaio sintético de 1.000 blocos de 1 KiB com
limite de 4 KiB, a fonte produz no máximo seis blocos antes do cancelamento
(inclui antecipação do stream), em vez de o leitor consumir o corpo inteiro.
Isso não mede os buffers do sistema nem garante o mesmo tráfego em toda rede.

A suíte móvel usa imagens PNG válidas com as dimensões requisitadas. Confere
51 individuais, 40 grupos, imagens inválidas, metadados excessivos, retorno do
segundo plano, liberação de URLs e dados preservados. A imagem Esri real do
bloco BA1/BA2/BA3 também foi conferida no novo caminho de leitura/decodificação.

Não foi medida economia de bateria, FPS ou uso total de memória em telefone
físico; não apresentar percentuais de ganho. Plano continua padrão e Satélite
opcional. Nenhuma alteração de coleta, distância, geometria, rumo ou navegação.

## Passagem para o Claude

Revisar limites de leitura, cancelamento durante corpo/decodificação, dimensões
PNG/JPEG e pausa/retomada. Reexecutar `node audit/bounded-response.test.mjs`,
`node audit/satellite-map.test.mjs`, `node audit/satellite-browser.mjs` e os
contratos/blocos. O workflow já inclui a nova suíte. Em seguida, priorizar o
ensaio físico de coleta → fechar → retomar e GPS; não ampliar esta revisão
para uma reescrita visual ou mudança do método.
