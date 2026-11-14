# Satélite opcional — candidata 1.35.0

Base: candidata de gestos 1.34.1 (PR #11). A opção aprovada é secundária:
Plano permanece padrão ao abrir, sem consulta externa automática. Satélite
fica ao final de Camadas e sobreposições no mapa individual e recolhido depois
das medidas no bloco. Voltar a Plano é imediato; não há rótulos antigo/novo.

## Implementação

- `src/ui/satellite-map.mjs`: câmera georreferenciada, controle opcional e provedor.
- Mapa individual expõe a câmera por integração única verificada no build; imagem acompanha inclusive a orientação girada. Bloco entrega o mesmo contrato de câmera.
- Esri World Imagery exporta em EPSG:32723. Cálculo, rumos e dados operacionais permanecem no sistema existente.
- Rede somente após seleção explícita. Requisições sem credenciais, respostas de outra origem recusadas e CSP limitada a services.arcgisonline.com, sem liberar scripts inline.
- Consulta adiada durante movimento; imagem inclui margem, é reutilizada quando cobre a câmera e recebe resolução nova no zoom. Respostas obsoletas não reativam uma opção desligada.
- No máximo duas imagens em memória, cada uma limitada a 4 MiB. Sem armazenamento persistente ou inclusão de imagens externas no service worker.
- Falha, timeout ou evento offline retornam ao Plano, conservando registros. A imagem não é necessária para operar.
- Créditos visíveis sobre o mapa mesmo com opções fechadas. Data da imagem não confirmada; não é imagem ao vivo nem prova da divisa ou safra.

## Validações

`node audit/satellite-map.test.mjs`: envelope da câmera, rotações, cache,
rejeição de câmera inválida e CSP restrita.

`node audit/satellite-browser.mjs`: os 51 individuais e 40 grupos sem rede no
Plano padrão e com ativação usando provedor simulado; bloco ativo com 58 pontos;
medidas/armazenamento preservados; créditos visíveis; falha do provedor; resposta
atrasada; offline e larguras móveis. O uso de uma imagem simulada nesse teste
verifica integração e estado, não a precisão de uma fotografia de cada lote.

Teste real separado: Esri no bloco BA1/BA2/BA3, autorizado pelo proprietário.
Imagem carregada no navegador da candidata, zoom, 58 pontos e volta a Plano
conferidos sem mudança dos registros. Capturas no pacote local de entrega.

Build determinístico, contratos, cálculo dos blocos, backup/restauração e
cenários de gravação ao sair também conferidos. O teste visual continua sem
máscaras adicionais e com a tolerância de 20 pixels/delta 1. As capturas de
tablet usam 2× nos dois lados, como já ocorria no Plano, para lidar com ruído
mínimo observado nas bordas arredondadas em Chromium.

## Limites e continuidade

Candidata, sem nova publicação ou APK nesta etapa. Integrar somente após revisar
os PRs dependentes, CI e o main atual. Ainda faltam ensaio físico Android/Safari,
consumo de bateria e rede de campo. Conferir termos/capacidade do serviço antes
de distribuição ampla; não prometer download offline da fotografia.

Revisão do Claude: conferir geometria da câmera girada, concorrência de imagens,
consulta somente por opção e retorno ao Plano. Próximas melhorias de toda a
ferramenta: `REVISAO_PRIORIDADES_MOBILE.md`.

## Revisão r2

O limite de bytes agora é aplicado durante o download, antes da decodificação.
Imagens inválidas são recusadas; consultas param em segundo plano e recursos
são liberados ao voltar a Plano. Detalhes e reprodução:
[REVISAO_MEMORIA_REDE_R2.md](REVISAO_MEMORIA_REDE_R2.md).
