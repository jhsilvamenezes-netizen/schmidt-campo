# Validação dos 51 individuais e alternativas em bloco

Ensaio local de 09/11/2026, branch `codex/auditoria-evolucao-segura`.
Não altera a interface, os planos salvos, as coletas, o site ou o APK.

## Resultado executado

Foram capturados os planos iniciais dos 51 lotes em um perfil Chromium
descartável: 749 pontos, todos os mínimos atendidos. A captura não representa
os ajustes nem as coletas existentes nos aparelhos da equipe. Revisitar BB1
após percorrer os 51 lotes reproduziu o mesmo plano.

A triagem abrange os 27 grupos das fontes (16 com vários lotes), seus
subconjuntos e os subconjuntos conectados de vizinhos com eixo compatível.
Gerou 202 alternativas únicas e ensaiou 3.153 grades:

| Resultado | Alternativas | Interpretação |
| --- | ---: | --- |
| Geometria e cobertura amostrada atenderam | 12 | Acesso e roteiro continuam pendentes |
| Geometria viável com perda na cobertura amostrada | 160 | Otimizar ou revisar antes de considerar |
| Exigem redistribuição no método restrito | 30 | Não prova impossibilidade com outro gerador |

As 12 alternativas são todos os 11 subconjuntos de dois ou mais membros de
**BB1, BB2, BC1 e BC2**, mais **RB4 + RB5**. São opções sobrepostas, não doze
atividades independentes para executar simultaneamente.

O conjunto BB1 + BB2 + BC1 + BC2 conserva 106 pontos: 26 + 26 + 23 + 31.
Sua grade usa 401,28 m entre eixos (11 barras de 36,48 m); os intervalos
efetivos entre pontos no mesmo trecho variam de aproximadamente 417,2 a
522,6 m. Isso não mede tempo nem comprova melhor rendimento operacional.
RB4 + RB5 conserva 32 pontos e requer conferência adicional da referência
A/B curta.

## Critérios e limites

- Busca de vizinhos até 100 m e diferença de eixo até 0,05°. Proximidade
  não autoriza passagem; a compatibilidade é reconferida com a referência
  comum de todos os membros, sem confiar apenas na cadeia de vizinhos.
- Geometrias históricas do KML são projetadas numericamente em UTM 23S.
  EPSG:4326 é hipótese de interpretação, não confirmação do datum da planilha.
  A união de partes sobrepostas ocorre somente na cópia diagnóstica.
- Espaçamentos existentes dos membros e fases em múltiplos da barra de
  36,48 m. Os pontos são projetados lateralmente na grade comum; não há
  redistribuição longitudinal ou otimização global de novos pontos.
- Preservar quantidade e mínimo de cada lote, posição única, pertencimento
  ao polígono e ao trecho recortado. Recuo de **50 m é valor de ensaio**,
  sem recomendação agronômica nem imposição aos individuais.
- P95 e máximo da distância ao ponto mais próximo são comparados em centros
  de células fixos por lote. Ambos devem não piorar em cada lote, com apenas
  0,000001 m de tolerância numérica. Isso não certifica cobertura contínua nem
  precisão de campo. A malha usa passo limitado a 15–150 m.
- Todos os subconjuntos conectados dos componentes encontrados foram
  examinados; o catálogo interrompe explicitamente se um componente tiver
  mais de dez membros. Não enumera todas as rotas físicas possíveis.
- P6 permanece individual com a configuração atual e revisão adiada pelo
  proprietário. Nenhuma direção é escolhida automaticamente para corrigir
  a divergência.

## Grupos completos das fontes

| Grupo | Resultado do conjunto completo |
| --- | --- |
| BA1 + BA2 + BA3 | Redistribuir neste método |
| BB1 + BC1 | Atendeu os critérios amostrados |
| BB2 + BC2 | Atendeu os critérios amostrados |
| BC3 + BC4 | Geometria viável; perda de cobertura |
| BD1 + BD2 | Redistribuir neste método |
| BD3 + BD4 | Redistribuir neste método |
| BE1 + BE2 + BE3 | Redistribuir neste método |
| RA1 + RA2 + RA3 | Geometria viável; perda de cobertura |
| RA4 + RA5 + RA6 | Geometria viável; perda de cobertura |
| RA7 + RA8 | Redistribuir neste método |
| RB1 + RB2 + RB3 | Geometria viável; perda de cobertura |
| RB4 + RB5 + RB6 | Geometria viável; perda de cobertura |
| RB7 + RB8 | Redistribuir neste método |
| RC1 + RC2 + RC3 | Geometria viável; perda de cobertura |
| RC4 + RC5 + RC6 | Geometria viável; perda de cobertura |
| RC7 + RC8 | Geometria viável; perda de cobertura |

Resultados de cada uma das 202 alternativas e seus membros estão na planilha
local `Validacao_Todos_Lotes_Individual_Bloco.xlsx`. O grupo completo pode
falhar mesmo quando algum subconjunto atende, como RB4 + RB5.

## Prévia e preservação

`Previa_Individual_Bloco.html` é uma projeção local interativa, identificada
como somente leitura, separada do aplicativo. Oferece os 51 individuais e
as 12 candidatas; permite entrar no individual de um membro e voltar à
mesma alternativa. Mostra pontos, mínimos e distâncias efetivas. RA9 tem
um ponto por trecho: informa ausência de intervalo, sem inventar distância.

O seletor interno `planning_scope_selection.py` devolve uma cópia exata do
individual solicitado. Blocos exigem catálogo e fingerprints válidos e
continuam com `executionEnabled: false`. Não grava nem converte planos,
e não transfere IDs de coletas. Mudar a fonte ou referência invalida a
comparação do bloco sem impedir a consulta do individual.

Testes executados:

- 36 testes Python de catálogo, seleção, fases, recorte e referências;
- 14 contratos JavaScript de escopo, acessos e comparação;
- 72 verificações renderizadas no Chromium: 51 individuais, 12 alternativas,
  ida e volta e resoluções 360, 390 e 1280 px. Sem erros, transbordamento
  horizontal, chamadas externas, gravação em Storage/IndexedDB ou GPS.
- HTML de produção preservado por SHA-256
  `4b162e63190a95780b993be853c6dd357adeafa08b9238a419ed02317921c76e`.

Os artefatos ficam em `/workspace/entregas-schmidt/validacao-todos-lotes-blocos/`.
As imagens `Previa-Individual-BB1.png` e `Previa-Bloco-4-Lotes.png` são capturas
da projeção, não capturas de uma funcionalidade implantada no aplicativo.
Os anexos privados e coordenadas derivadas não são enviados ao repositório.

## Reprodução e próxima integração

Com as extrações locais descritas em `REVALIDACAO_KML_GUIA_PLANILHA_2026.md`
e dependências já instaladas:

```sh
cd audit
node all-fields-block-reference.mjs
.venv/bin/python validate-all-blocks.py
python export-all-blocks.py
.venv/bin/python -m unittest block_catalog_test.py planning_scope_selection_test.py phase_comparison_test.py shared_grid_pilot_test.py source_reference_rules_test.py
npm run test:planning-contract
node all-blocks-preview-browser.mjs
```

O exportador usa openpyxl no Python de sistema; o validador usa Shapely,
NumPy e pyproj no ambiente de auditoria. A captura inicial e o Chromium
precisam de ambiente que permita processos de navegador. Dados privados
ausentes interrompem a reprodução em vez de usar outra fazenda silenciosamente.

A integração operacional ainda precisa de acesso e sentido de passagem
confirmados, roteiro completo, comparação de esforço/tempo e validação da
base/datum. A apresentação no app exige comparação visual com a versão
atual e aprovação específica. Esta etapa não faz merge, publicação ou APK.
Rollback: retirar estes scripts/projeção de auditoria; não há migração ou
mudança de dados do aplicativo para desfazer.
