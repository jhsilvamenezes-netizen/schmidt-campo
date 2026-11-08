# Correções de dados e GPS — candidata preservando a interface

08/11/2026. Continuação do estudo em `ESTUDO_ARQUITETURA_V1_31.md` e da
autorização do proprietário para corrigir os problemas. Trabalho apenas na
branch de auditoria/PR #2; produção, assinatura e distribuição preservadas.

## O que foi corrigido

| Achado | Comportamento da candidata | Evidência de aceite |
| --- | --- | --- |
| A03: imagem omitida silenciosamente | Erro de leitura de imagem ou histórico interrompe a cópia, usando o tratamento de erro já existente. Não baixa arquivo incompleto como sucesso. | Falha simulada no IndexedDB real; zero downloads de cópia incompleta. |
| A04: JSON corrompido virava null | Diferencia chave ausente de JSON ilegível; exportação é recusada. Na reabertura, conserva os bytes inválidos e bloqueia o salvamento principal que os substituiria, reutilizando o aviso existente. | Bytes originais conservados antes/depois de exportar e reabrir; testes de módulo e navegador. |
| A05: restauração parcial por quota | Guarda snapshot durável antes de modificar dados, aplica transações por base e compensa falhas. Se a compensação falhar, mantém journal/marcador, bloqueia o salvamento principal e tenta recuperar na reabertura. | Quota na segunda chave, falha persistente de histórico, journal real e reabertura de estados prepared/committed. |
| A06: posição GPS antiga recebia horário novo | Usa timestamp de aquisição, descarta leitura antiga/futura/ausente/inválida ou fora de ordem e ignora callbacks de sessões encerradas. A ponte nativa não inventa timestamp ausente. | Mocks no guia real e testes de política; sem afirmar homologação de GPS físico. |
| A07: cópia maior que a própria importação aceita | Mantém teto de 80 MiB; verifica um limite inferior antes de converter imagens em base64 e confere o tamanho UTF-8 exato antes de baixar. | Três imagens com tamanho simulado de 25 MiB são recusadas antes da conversão/hash; testes no limite exato com Unicode. Não foi alocado um arquivo de 100 MiB. |
| A08: imagens residuais após restaurar v2 | Backup completo v2 substitui o conjunto de imagens/histórico, com snapshot anterior e cópia prévia do fluxo existente. Formato legado de configurações altera somente seu escopo. | Uma imagem de origem resulta em uma no destino; backup legado conserva imagens/preferências; flag legado forjada em v2 é ignorada. |

## Como foi implementado sem tratar o minificado como fonte original

A fonte original completa continua ausente. Em vez de refatorar o bundle,
foram escritas fontes novas, legíveis e testáveis em `src/`, com interfaces
explícitas para armazenamento e GPS. Um gerador parcial aplica essas fontes a
17 pontos de integração verificados no artefato original imutável. A referência
é obtida do Git local e validada por SHA-256; não foi substituída pelo piloto.

O corpo original do tratamento de erro foi extraído e reutilizado **byte a
byte**, sem acrescentar avisos, texto, markup, estilos ou botões. HTML fora do
módulo principal, CSS, dados, scripts auxiliares, ícones e manifesto permanecem
idênticos. CSP conserva a política restrita e recebe os hashes dos scripts
atualizados. `sw.js` muda somente o identificador de cache, para evitar reutilizar
o pacote antigo numa eventual entrega futura; sua política não mudou.

Logo, a candidata **muda JavaScript funcional e o identificador de cache**.
Não é correto continuar afirmando igualdade byte a byte do HTML/worker completos.
O baseline original permanece intacto e as capturas continuam comparando contra ele.

## Protocolo de restauração e limites

1. O fluxo existente continua apresentando prévia e baixando a cópia anterior.
2. Antes da primeira alteração, guarda os três valores brutos de localStorage,
   as imagens com Blobs e o histórico no banco privado `schmidt-restauracao`,
   store `journal`; o registro tem etapa `prepared`.
3. Grava o marcador `schmidt.restore.pending.v1` no localStorage. Se não puder
   gravar snapshot ou marcador, não começa a substituição dos dados do app.
4. Imagens e histórico são substituídos em transações nas respectivas bases;
   as três chaves locais são aplicadas e conferidas. A versão completa sem
   histórico representa conjunto vazio; configurações legadas conservam o
   histórico e imagens do destino.
5. Persiste etapa `committed` antes de remover o marcador e limpar o journal.
6. Erro antes do commit tenta restaurar o snapshot. Reabertura com `prepared`
   repõe o anterior; com `committed` conserva o novo e conclui a limpeza.
   Falha de compensação conserva a cópia durável para nova recuperação.

Isso é **compensação com recuperação**, não uma transação global atômica entre
localStorage e duas bases IndexedDB. Não promete sobreviver a corrupção do
próprio banco, limpeza pelo sistema, desinstalação ou falha física do aparelho.
Falha de limpeza pode deixar snapshot órfão local até futura restauração;
ele não é publicado nem incluído como dado operacional no backup normal.

O bloqueio cobre o salvamento principal `saveState`. Concorrência entre abas,
edições paralelas durante a operação e todos os escritores auxiliares ainda
precisam de ensaios; não se afirma bloqueio global de todas as operações.
Um perfil que já iniciou com JSON corrompido preserva o original e alerta pelo
mecanismo existente, mas pode exigir recuperação assistida: não transforma
bytes ilegíveis em um backup falsamente completo para liberar a restauração.

Se o journal não puder ser lido/recuperado, conserva o marcador, impede o
salvamento principal e usa o mesmo tratamento de erro. Continua exigido backup
fora do aparelho antes de qualquer migração de assinatura ou reinstalação.

## Reprodução e evidência

```sh
node scripts/build-preserved.mjs --check
cd audit
npm ci --ignore-scripts --no-audit --no-fund
npm test
npx playwright install --with-deps chromium
npm run test:browser
npm run test:corrections
```

Com Chromium do ambiente: prefixar os dois comandos de navegador com
`CHROMIUM_PATH=/usr/bin/chromium`. Os testes usam servidor em loopback e perfis
descartáveis. Nada é instalado em aparelhos reais.

- `npm test`: 14 contratos de build/preservação/CSP/dados/CI e 25 testes das
  correções de persistência/GPS.
- `test:browser`: 23 comparações contra a referência, mais cópia, restauração
  e offline. A tolerância de antialiasing continua a mesma, sem máscaras.
- `test:corrections`: aceita somente os comportamentos corrigidos, com os
  IndexedDB reais do navegador, interrupções simuladas e mocks GPS. Também
  computa os 51 cenários padrão; não é validação espacial independente.
- `npm run study`: agora serve explicitamente o baseline histórico para
  reproduzir os defeitos antigos. Não é teste de aceite da candidata.

Os relatórios finais ficam em `audit/results/` (ignorado). O resumo público
`audit/corrections-evidence-2026-11-08.json` contém hashes, contagens e resultados,
sem dados de cópias reais, imagens ou coordenadas. Falha se o HTML mudar durante
a execução. Status de CI e commit da entrega são registrados no PR.

## Resultado local final

**14 contratos, 25 testes de correção e 9 cenários de aceite no navegador
passaram.** Os 51 cenários padrão geraram 749 pontos, sem coordenadas não
finitas nem pontos fora dos polígonos no teste interno. Backup/restore,
reabertura offline, CSP, build determinístico, sintaxe shell e diff sem erros
foram verificados.

**23 comparações visuais aprovadas:** 22 idênticas e uma com 10 pixels de
antialiasing (delta máximo de 1/255), na borda dos seletores em Auditoria/768 px.
Diferença inspecionada e dentro da tolerância já existente de 20 pixels; não
houve aumento de tolerância nem máscara. HTML/CSS/dados fora do módulo principal
são idênticos à referência. Zero erros JavaScript não tratados. Chromium
156.0.8078.79 e Node 24.22.1 no Linux. A CI remota é verificação adicional separada e ainda não executou estas correções.
Uma rodada com 33 pixels (delta 1) foi rejeitada; capturas repetidas do próprio
baseline também variaram. A configuração final desativa otimizações Skia no
navegador de teste, mantendo a mesma tolerância e sem alterar CSS.

## Entrega local pronta; envio ao GitHub bloqueado

As correções e evidências estão no checkout/commit local. Ainda não foram
aplicadas à branch remota ou ao PR: a revisão automática rejeitou o envio do
HTML por conter coordenadas e dados operacionais agrícolas em repositório
público, exigindo autorização explícita para esse payload/destino. O bloqueio
permaneceu mesmo após comprovar, via GitHub conectado, que a conta autenticada
é proprietária de `jhsilvamenezes-netizen/schmidt-campo` e que os três blocos de
dados e toda apresentação fora do módulo são idênticos ao `main` já público.
Não houve tentativa de contornar o bloqueio por outro transporte. A autorização
pendente é somente para enviar o commit à branch de auditoria desse repositório,
sem merge, Pages, nova assinatura ou APK. A CI remota aprovada anteriormente
refere-se ao estudo antigo, não às correções locais deste documento.

## O que continua pendente

Fontes completas dos 47 módulos, build nativo determinístico, Android físico,
iOS, concorrência/armazenamento sob carga e múltiplas abas, geodésia/topologia
independente, GPS em campo, assinatura privada e migração continuam nos gates
do estudo. Corrigir estes seis achados não encerra todos os 15 itens nem M0/M1.
Mudança visual futura continua exigindo projeção, comparação e aprovação expressa.

## Rollback e impacto

Não houve publicação, merge, APK novo ou mudança de assinatura. Para revisão,
reverter o commit das correções devolve os artefatos candidatos à referência da
fase anterior. Em perfil de teste com recuperação pendente, concluir/exportar
a recuperação com esta candidata antes de retornar à antiga: a versão 1.31
não conhece o journal novo. Não apagar journal/marcador manualmente nem limpar
dados para “resolver” uma falha.

Web/APK futuros usam o mesmo JavaScript gerado e bases anteriores, com uma nova
base privada de recuperação. Assinatura, applicationId, versões de dependências
Android, interface, dados espaciais e regras do motor não foram alterados.
