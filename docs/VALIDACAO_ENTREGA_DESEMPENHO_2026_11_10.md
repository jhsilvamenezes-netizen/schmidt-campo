# Validação da candidata de desempenho — 10/11/2026

Candidata: `1.31.0-r3-desempenho-candidata`. Branch:
`codex/auditoria-evolucao-segura`. Estado: validada localmente, não publicada.

## Resultado desta rodada

A validação usou os bytes copiados para a pasta de entrega, não somente funções
isoladas ou a base antiga. Os relatórios anteriores foram preservados.

| Verificação executada | Resultado |
| --- | --- |
| Regenerar 40 blocos pelo motor da candidata | 5.957 grades avaliadas; mínimos por membro respeitados |
| GEOS independente: 88 pares bloco/membro | Zero pontos fora, zero trechos fora, zero duplicações internas |
| Eixos, fase e bordas | Conferidos numericamente com a referência comum |
| Cobertura contra o individual | P95 e máximo sem piora além da tolerância nos centros amostrados |
| 51 planos individuais | Snapshots idênticos à referência do ensaio |
| Troca de membro, retorno e retomada | Registros individuais e de bloco preservados e separados |
| Preparo/cancelamento e alteração de parâmetros | Não aplica resultado invalidado nem salva bloco cancelado |
| Edição manual | Miniatura e distâncias atualizadas; edição preservada na restauração |
| Coleta pela UI e GPX | Coleta no escopo correto e exportação de todos os membros |
| Backup | Hash cobre individuais/blocos; restauração em perfil limpo mantém coleta e edição |
| 40 opções ativas em 360 px | Layout comporta opções e permite retorno ao individual |
| Recarga offline | Candidata abre com as 40 opções após instalar seu worker |
| Erros de página | Zero nos ensaios de runtime e UI |
| Testes de blocos nesta rodada | 25 existentes + 2 cancelamento + 5 cache aprovados |
| Build e integridade | --check aprovado; hashes do HTML/worker coincidem com VERSAO.json |

A suíte geral de 52 testes já passou nos mesmos fontes da candidata na etapa
anterior. Esta rodada ampliou os ensaios de integração; não alterou cálculo,
layout ou persistência para fazer um teste passar. O maior quociente de cobertura
registrado foi 1,000000000001912, dentro da tolerância relativa 1e-6; não é piora
operacional demonstrada.

## Melhoria da própria validação

Os runners de runtime/UI e o verificador espacial agora aceitam diretórios
explícitos por variáveis SCHMIDT_CANDIDATE_DIR e SCHMIDT_RESULTS_DIR. Os padrões
anteriores foram preservados. Isso permite validar uma entrega específica sem
sobrescrever a evidência r3 anterior. `npm --prefix audit run test:blocks` reúne
os testes antigos e novos; o workflow de blocos foi atualizado para chamá-lo.
A CI remota ainda não foi executada para estes arquivos locais.

## Reprodução do ensaio completo

```
export SCHMIDT_CANDIDATE_DIR=/workspace/entregas-schmidt/1.31.0-r3-desempenho-candidata
export SCHMIDT_RESULTS_DIR=/workspace/schmidt-campo/audit/results/desempenho-validacao
node audit/blocks-runtime-browser.mjs
audit/.venv/bin/python audit/validate-runtime-blocks.py
node audit/blocks-ui-browser.mjs
npm --prefix audit run test:blocks
node scripts/build-preserved.mjs --check
```

## Entrega e limites

Pacote web local acompanhado de identificação, manifesto de hashes, resumo dos
checks e este relatório. Não inclui backups sintéticos, dados locais de operadores,
chaves ou anexos privados. Nenhum merge, implantação Pages ou APK distribuído.

A interface do pacote continua a r3, com correções internas de cancelamento e
reutilização segura de cenários. A r5 permanece projeção: este pacote não afirma
conter o mapa conjunto detalhado proposto. As imagens comparativas e o HTML
interativo da r5 continuam disponíveis na entrega `estudo-mapa-bloco-r5`.

Ensaios automatizados não substituem campo, procedência dos limites, confirmação
de passagens nem homologação agronômica. Não há nova modalidade de anéis.
