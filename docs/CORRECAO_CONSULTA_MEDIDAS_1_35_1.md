# Consulta de medidas coerente com o plano — candidata 1.35.1

## Problema reproduzido

Na 1.35.0 r3, consultar um ponto guardava o conteúdo textual do painel. Uma
atualização do mesmo grupo podia mudar posição, ordem ou geometria sem atualizar
essa consulta. O desenho usava o cenário novo, mas o painel mantinha a distância
antiga e até o nome do antigo próximo ponto. Remover o ponto também deixava
informação antiga visível. Isso afeta direcionamento, não depende de coleta.

Reprodução sintética em Chromium: quadrado de 1000 m, ponto a 100 m da borda e
vizinho a 400 m. Editar o ponto mantendo IDs/objetos muda as medidas para 200 m
e 300 m e muda o vizinho para P3. O teste antes da correção falhou mostrando
100 m/400 m/P2. Não são dados de fazenda nem medição em telefone físico.

## Correção

`src/ui/block-map.mjs` resolve novamente a consulta pelo membro e ID do ponto
no cenário recebido a cada update. Atualiza vizinho e borda usando os dados
vigentes. Se o ponto não existe mais, fecha e limpa a consulta. Não altera
rumos, distribuição, parâmetros, contornos, CSS ou navegação. Não implementa a
projeção de design nem transforma consulta em marcação de execução.

## Validação

- `node audit/block-map-selection-browser.mjs`: cinco cenários em navegador;
  mudança de posição/vizinho, borda interna e ordem, remoção e zoom sem mutação.
- `npm --prefix audit test`: 52 testes de contrato/lógica passaram após atualizar
  hashes e identificação. A primeira execução encontrou hashes do build antigo;
  metadados foram regenerados e a suíte repetida com sucesso.
- `npm --prefix audit run test:blocks`: 35 testes passaram.
- Build determinístico conferido; dados originais preservados pelos contratos.
- A suíte de CI de blocos passou a executar o teste novo automaticamente.

A validação numérica usa fixture analítica com distâncias conhecidas; não houve
novo levantamento, alteração do motor geométrico ou homologação de campo. O
ensaio integrado de gestos e o estado da CI devem ser conferidos no PR.

## Entrega e recuperação

Candidata isolada 1.35.1. Consultar PR/Issue #1 para estado de integração e
publicação; este documento não comprova deploy. Reverter o commit/PR restaura
o comportamento anterior sem migração de dados; não limpar armazenamento.
APK adiado. Continuidade: revisar fonte/diff e depois ampliar a conferência de
medidas espaciais do plano 2.0 no PR #13, com uso exclusivamente para orientação.
