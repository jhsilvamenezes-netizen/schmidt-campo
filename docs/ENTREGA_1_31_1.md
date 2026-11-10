# SCHMIDT Campo 1.31.1

## Mudanças

O bloco passa a mostrar os contornos, tiros e pontos de todos os seus lotes no
mapa principal. As abas abrem cada lote no mapa operacional existente. Consultar
um ponto mostra sua identificação, a distância ao próximo ponto do mesmo trecho
(quando existe) e à borda mais próxima. As distâncias entre tiros e entre pontos
continuam visíveis. O mapa conjunto é de consulta; a coleta usa o lote selecionado.

“Bloco de lotes”, “Montar bloco” e “Bloco completo” substituem termos mais formais.
O README explica o uso, backup e instalação de forma direta. Identificadores de
dados não foram renomeados e os registros individuais e do bloco permanecem separados.

Prévia invalidada por mudança de parâmetros é retirada antes de ativação.
O cancelamento também é respeitado na última pausa do cálculo. A leitura das
cenas evita recalcular desenhos inalterados. Não há mudança de metodologia,
contornos, rumo do P6 ou barra de 36,48 m. Não foram introduzidos anéis.

## Verificação

Comandos de reprodução:

```sh
npm --prefix audit test
npm --prefix audit run test:blocks
npm --prefix audit run test:android
node scripts/build-preserved.mjs --check
node scripts/build-block-candidate.mjs
node audit/all-fields-block-reference.mjs
node audit/blocks-runtime-browser.mjs
python audit/validate-runtime-blocks.py
node audit/blocks-ui-browser.mjs
npm --prefix audit run test:browser
npm --prefix audit run test:upgrade
```

Passaram 84 testes de módulos/contratos, nove de preparação Android, 15 grupos
de interface e 23 comparações visuais. As 40 opções resultaram em 88 comparações
espaciais independentes: nenhum ponto ou segmento externo, nenhuma duplicação
interna, eixos/fases e bordas conferidos. Atualização offline preservou registros,
imagem e histórico. Uma primeira comparação em Tiros registrou 33 pixels com
delta máximo 1/255; a repetição isolada passou sem alteração de código ou tolerância.

Os resultados executados e a identificação da entrega ficam no relatório agregado
da versão. Os ensaios usam perfis descartáveis; coordenadas intermediárias,
backups, GPX e capturas de campo não são incluídos no repositório.

## Limites e recuperação

Distância à borda é a menor distância geométrica ao contorno, não recuo obrigatório.
Linhas e alinhamento não provam acesso físico entre lotes. GPS e legibilidade em
aparelho real ainda exigem ensaio com a equipe. A fonte original completa continua
pendente; as alterações usam módulos legíveis e o build preservado.

O APK instalado permanece na versão anterior. A nova compilação deve permanecer
sem distribuição até haver assinatura privada estável e backup/migração conferidos.
Não reutilizar a chave pública, não distribuir debug e não recomendar desinstalação.

A publicação web ocorre por PR e CI. Para recuperação, reverter o PR mantendo os
dados locais e gerar o worker correspondente. Nunca limpar dados para atualizar.
O PWA espera o fechamento das janelas antigas antes de ativar a versão nova.

