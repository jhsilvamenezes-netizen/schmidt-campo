# Correções 2.0.1 — direcionamento pelo link

Base: 2.0.0, main `2455c19d4a3cc3d5d65f028a7e6b708902290de3`.
Autorização: após a revisão #18, o proprietário pediu corrigir e entregar o link
atualizado. Publicação somente depois dos testes e CI do PR.

## O que muda

- **F1 — GPS vencido:** após 15 s sem posição nova, na próxima atualização do
  monitor (a cada 5 s), mostra “Aguardando posição atual”. Retira seta, distância
  dinâmica e marcador atual. As medidas estáticas do plano continuam disponíveis.
  “GPS bom” deixa de aparecer nesse estado. Uma nova posição válida retoma o guia.
  A seleção de tiro também deixa de usar distâncias/marcador de uma posição antiga.
- **F2 — oscilação de alvo:** memória temporária da sessão mantém o ponto em uma
  faixa de histerese conforme a precisão informada pelo GPS, limitada a 10 m e
  à metade do raio de chegada para permitir retornar ao próprio ponto. Para
  precisão de 4 m, o ensaio de 9,5/10,5 m após o ponto conserva o alvo; avançar
  16 m seleciona o próximo; voltar 5 m permite retornar ao anterior. Isso não
  aumenta o raio de chegada e não marca execução. O alerta de chegada não se
  repete quando o ruído cruza apenas o raio do mesmo alvo. Trocar lote, plano,
  tiro, entrada ou sessão GPS reinicia essa memória.
- **F3 — texto de chegada:** em lugar de pedir avaliação/coleta, orienta consultar
  a distância até o próximo ponto ou a borda. A separação completa das funções
  legadas ainda está pendente; botões, contagens e dados históricos permanecem.
- **F5 — regressões:** o teste GPS passa a falhar se as marcações persistidas
  mudarem; novo teste verifica histórico sintético tanto na memória como no
  armazenamento. O gate novo também exige estabilidade, expiração por timer,
  retorno do sinal e apresentação em 360, 390, 412 e 768 px. A conferência
  independente das medidas (GEOS/PROJ, 51 lotes/40 grupos) passa a integrar a CI.
- **F6 — continuidade:** fila de execução e checkpoint passam a distinguir
  entregas efetivas, correções desta versão e trabalho ainda pendente.

O cálculo dos planos, coordenadas, barra de 36,48 m, P6, método linear e defaults
permanecem. Plano é o mapa padrão; Satélite continua opcional. Não houve APK.

## Validação e reprodução

Resultados observados e hashes finais: `audit/fix-2-0-1-evidence.json`.

```sh
node scripts/build-preserved.mjs --check
npm --prefix audit test
npm --prefix audit run test:blocks
node scripts/build-block-candidate.mjs
node audit/gps-stability-browser.mjs
node audit/gps-guidance-browser.mjs
node audit/blocks-runtime-browser.mjs
node audit/block-map-framing-browser.mjs
node audit/block-map-gestures-browser.mjs
node audit/direction-measures-probe.mjs
python audit/direction-measures.py
UPGRADE_REF=2455c19d4a3cc3d5d65f028a7e6b708902290de3 node audit/worker-upgrade-browser.mjs
```

Capturas reais e resultados detalhados ficam em `audit/results`, ignorado pelo
Git. O ensaio móvel usa Chromium e GPS sintético; não equivale a teste físico.
Falhas de integração encontradas durante o desenvolvimento foram corrigidas
antes da candidata final; considerar somente a rodada final e a CI do commit.

## Pendências para Claude/Codex

1. **F4:** comparação de ajustes em bloco. Não remover a condição `!blockActive()`
   da comparação individual sem projetar alternativas sobre a referência comum,
   testar todos os membros, medir e aplicar/desfazer como uma única operação.
2. **F3 restante:** separar explicitamente direcionamento de controles legados,
   preservando histórico, exportação e acesso às funções existentes. Hoje marcas
   antigas ainda fazem o guia seguir a ordem legada. Preparar comparação visual
   e conferir escopo antes de uma mudança ampla de apresentação.
3. Campo: verificar histerese, precisão/atraso e retorno em dois aparelhos reais.
   A faixa adotada é uma proteção de software, não precisão agronômica certificada.
4. E5/E6 completos, acessibilidade humana, sol e desempenho físico continuam
   abertos. Não declarar toda a fila 2.0 concluída por causa da versão.

## Recuperação

Se houver regressão, reverter o PR 2.0.1 por novo commit e publicar novamente os
artefatos da base 2.0.0, sem limpar localStorage/IndexedDB. O worker verifica o
HTML e aguarda fechamento das abas antigas. Não pedir desinstalação nem apagar
os dados para atualizar. Aguardar a atualização, fechar as abas antigas e abrir
o mesmo link conserva o armazenamento existente.
