# Revisão independente — SCHMIDT Campo 2.0.0

14/11/2026. Código examinado: main `2455c19d4a3cc3d5d65f028a7e6b708902290de3`,
PR #17, revisão `4b007f55b015078cdaee47aba54e979cd312a868`.
Comparação: 1.35.1, `2e4e2be9a44310b847155bdef9d7b78b9865ccd0`.
Não houve mudança do runtime, versão, dados ou site nesta revisão.

## Conclusão

A 2.0 entrega melhorias verificáveis: comparação de alternativas, avanço do guia
sem marcação e correção da altura do mapa móvel. Build, testes repetidos e fluxo
público passaram. **Há pendências de direcionamento e cobertura de teste; não
considerar toda a fila 2.0 concluída ou o campo homologado.** E5/E6 completos e
piloto físico continuam pendentes, inclusive conforme checkpoint pós-publicação.

## Achados priorizados

### F1 — P1: posição antiga mantém aparência de orientação atual

Reprodução: no monitor com GPS simulado válido, envelhecer `posAt` em 60 segundos
e atualizar a apresentação. O guia ainda exibe **505 m para o leste** e
**GPS bom (±4 m) · atualizado há 60 s**. Existe aviso de posição antiga e chegada
bloqueada, mas a direção/distância primárias e o rótulo de qualidade continuam.

Risco: qualidade espacial do último fix não significa disponibilidade atual.
A equipe pode usar uma instrução relativa a uma posição que já não ocupa.
O comportamento é herdado: o aviso de atraso e a apresentação legada já existiam
na 1.35.1. A afirmação de que fix velho “não orienta” deve distinguir rejeitar
callback antigo de expirar uma posição anteriormente aceita.

Referências: `src/gps/fix-policy.mjs:1` valida recebimento; integração em
`scripts/build-preserved.mjs:66`; apresentação legada do monitor em `index.html`.

Correção proposta: estado de validade temporal explícito na apresentação;
orientação dependente do GPS identificada como última posição ou suspensa até
fix novo. Manter consulta estática do plano. Testar passagem do tempo sem callback,
retomada, fix novo e precisão ruim. Não trocar apenas o texto do aviso.

### F2 — P2: alvo oscila na fronteira de chegada

Com precisão reportada de 4 m, emitir seis posições alternadas a 9,5/10,5 m
após o ponto 1. O raio é 10 m. O guia alterna cinco vezes entre “Você chegou ao
ponto 1” e “Próximo: ponto 2”, cerca de 505 m adiante.

Causa: `src/gps/guide-next.mjs:34` escolhe alvo a cada fix por um único limiar,
sem histerese ou confirmação. A nova escolha automática funciona nos trajetos
ideais testados, mas é sensível a ruído menor que a precisão reportada.

Correção proposta: estabilizar alvo com critérios justificados pela precisão e
movimento, mantendo retorno/seleção manual e reset por tiro/sessão. Estado
transitório de orientação não é marcação de execução nem coleta. Testar jitter,
avanço real, retorno e tiros próximos; não travar indefinidamente o alvo.

### F3 — P2: mensagens legadas competem com o uso exclusivo para direcionamento

Na chegada aparece “Faça a avaliação e toque em Ponto coletado”; contador de
coletados e botão continuam na tela. Isso é declarado na entrega, não regressão
oculta. `src/ui/monitor-direction.mjs:1` só muda ordem/destaque dos botões.
Havendo marcação histórica, `src/gps/guide-next.mjs:25` volta à ordem do legado,
podendo orientar a ponto atrás da pessoa, conforme teste já existente.

Proposta: separar explicitamente a consulta/direcionamento do fluxo legado, com
projeção de UI e compatibilidade. Preservar dados e funções antigas; não apagar
marcas nem depender de limpar armazenamento. Testar com backup legado marcado.

### F4 — P2: comparação de ajustes ainda não atende blocos

`src/ui/adjust-compare.mjs:71` oculta o recurso quando existe bloco ativo.
A comparação de alternativas funciona nos individuais; não concluir que o grupo
já tem a mesma possibilidade. Esta é limitação declarada de escopo, não quebra
do planejamento conjunto existente.

Próxima entrega: alternativas de grupo respeitando grade comum, referências,
cobertura e contagens por membro. Não basta remover a condição que oculta o painel.
Apresentar comparação visual de conjunto/membro com medidas reais (E3/E5/E6).

### F5 — P2: cobertura de testes não garante todas as afirmações

`audit/gps-guidance-browser.mjs:119` calcula `report.noMarks`, mas não faz assert
nem usa esse valor no exit code. O teste pode terminar com sucesso mesmo se esse
indicador for falso. Na execução desta revisão ele foi verdadeiro; não houve
marcação acidental observada.

Fortalecer a verificação por mapas/IDs de marcações antes/depois, preservando
registros legados; mutação deliberada deve falhar. Acrescentar casos de jitter e
expiração por tempo. A auditoria específica `direction-measures.py` é executável,
mas não está chamada nos workflows; há outras verificações espaciais na CI.
Não confundir CI verde com cobertura dos cenários adversos acima.

### F6 — P2: retomada e fila continuam com metadados desatualizados

No main, `docs/RETOMADA.json:3` ainda manda concluir/publicar a 2.0, diz
`publishedVersion: 1.35.1` e aponta entrega #14. A branch `claude/pos-2-0` tem
checkpoint mais recente (`6a877f1`) reconhecendo a publicação, mas esses campos
continuam antigos. A fila `EXECUCAO_2_0.md` ainda diz que E1/E2 não foram feitas.

Risco: outra IA repetir tarefas ou escolher baseline errado. Atualizar versão,
base, PR e status por evidência; apontar uma branch vigente na Issue #1. A sessão
não deve usar apenas título/data do checkpoint como prova de publicação.

## O que foi conferido nesta sessão

| Verificação | Resultado |
|---|---|
| Código versus site | 2.0.0; HTML publicado idêntico ao checkout por SHA-256 |
| Build | `build-preserved.mjs --check` passou |
| Contratos/lógica | `npm --prefix audit test`: 55 execuções passaram |
| Blocos e módulos | `npm --prefix audit run test:blocks`: 58 execuções passaram; parte sobrepõe a suíte anterior |
| Comparação de ajustes | 51 lotes, 255 linhas, 51 aplicações; 50 Desfazer + 1 retorno pelo campo; quantidade passou; zero falhas |
| GPS existente | 51 lotes, 182 avanços, 182 chegadas, 204 fixes inválidos ignorados, 51 avisos de precisão e 51 de desvio; zero falhas |
| Varredura móvel | 20 estados (5 abas × 360/390/412/768 px), sem overflow horizontal ou erro JS |
| Adversos adicionais | Jitter: 5 trocas em 6 fixes; posição de 60 s segue rotulada “GPS bom”; mensagens de coleta confirmadas |
| Atualização | 1.35.1 → 2.0.0: espera de abas, integridade, offline e preservação de dados/imagem/histórico passaram |
| Link real | 3 membros/58 pontos, consulta, zoom e offline; Plano padrão sem consultas Esri; registros preservados com normalização do lote ativo conferida |

As evidências GEOS/PROJ da E2 foram examinadas e a CI do PR #17 estava aprovada.
Não foi repetido localmente o Python específico de E2 nesta sessão; o relatório
versionado aponta para o HTML da 1.35.1. Não afirmar nova medição independente
apenas por ler a evidência. Nenhuma coordenada do aparelho da equipe foi usada.

## Desempenho medido novamente

Chromium 141.0.7390.37, loopback sem SW, 20 execuções totais; cinco por combinação
versão/CPU, ordem alternada. Baseline recente 1.35.1, não o relatório E1 anterior.

| Mediana | 1.35.1 | 2.0.0 |
|---|---:|---:|
| Abrir, CPU normal | 162,9 ms | 159,7 ms |
| Abrir, CPU ×4 | 784,8 ms | 745,0 ms |
| Desenho, CPU ×4 | 132,2 ms | 118,4 ms |
| Heap após cenários, CPU ×4 | 3.547.028 bytes | 3.574.564 bytes |

Não indicou regressão relevante neste ensaio. Amostra pequena e máquina simulada
não comprovam FPS/bateria no telefone. O painel de comparação foi rápido no teste
(max. 105 ms), mas os cinco cartões são longos: avaliar prioridade das métricas
no piloto. “Caminhada total” merece qualificação de estimativa, não rota validada.

## Reprodução e próximo passo

```bash
npm --prefix audit test
npm --prefix audit run test:blocks
node audit/adjust-compare-browser.mjs
node audit/gps-guidance-browser.mjs
UPGRADE_REF=2e4e2be9a44310b847155bdef9d7b78b9865ccd0 node audit/worker-upgrade-browser.mjs
PERF_REF=2e4e2be9a44310b847155bdef9d7b78b9865ccd0 node audit/performance-browser.mjs
node audit/review-2-0-browser.mjs
```

O último comando é um probe de revisão: grava capturas/resultados em
`audit/results/revisao-2-0/`, não afirma que os achados foram corrigidos. Não está
ligado como gate de CI. Falha de execução/JS produz exit code não zero.

Prioridade: F1, F2, adequação F3, grupo F4 e testes/continuidade F5/F6 em PRs
pequenos. Não alterar rumo, barra/P6, método, dados ou limites por hipótese.
Capturas e pacote completo são locais; não foram publicados dados privados.
Ainda faltam telefone físico, GPS real, bateria, acessibilidade humana e tarefa
observada ao sol. Não é certificação de cada combinação possível de parâmetros.
