# SCHMIDT Campo — estado e continuidade

Consulte primeiro [VERSAO.json](../VERSAO.json), [Issue #1](https://github.com/jhsilvamenezes-netizen/schmidt-campo/issues/1)
e o commit atual de main. O site é https://jhsilvamenezes-netizen.github.io/schmidt-campo/.
Este documento permite continuar a revisão com outro desenvolvedor ou assistente,
inclusive Claude. Não existe integração automática entre sessões.

## Alternar entre Codex e Claude

Leia [COORDENACAO.md](COORDENACAO.md): fila imediata, protocolo de revisão e
modelo de passagem. A Issue #1 continua sendo o backlog principal. Cada PR
atualiza estes registros junto com a mudança. Não existe execução automática
de uma sessão pela outra.

## Próxima evolução — plano 2.0 (14/11/2026)

A 1.35.0 r3 foi publicada após CI; merge
`a3c0a60ac34d1b01e31d0491fdb2f6626146f31b`. Issue #1 e PR #12 registram
conferência do endereço real, coleta sintética, backup e offline. Os trechos
anteriores que falam em candidata são históricos.

Próximo trabalho: [plano 2.0](PLANO_VERSAO_2_0.md), com 45 itens de trabalho, critérios,
parâmetros e sequência, incluindo [revisão aprofundada](APROFUNDAMENTO_2_0_WEB.md). [Texto de início para Claude](INICIO_CLAUDE_2_0.md).
Prioridade atual: link/site no navegador móvel; APK adiado e fora dos critérios
da 2.0 web. Começar por inventário e medição (01–03), preparar ensaio físico (04).
É planejamento: não houve nova alteração do app ou liberação Android.

## Evolução recente

| Etapa | Entregue |
|---|---|
| Preservação e dados | Baseline, backups com integridade, restauração, isolamento de gravação e proteção contra estado antigo. |
| Plano essencial | Informações e distâncias principais organizadas; barra de 36,48 m. |
| Blocos | 40 opções compatíveis, preservando 51 lotes individuais e registros separados. |
| 1.31.1 | Mapa conjunto, abertura de cada lote, consulta das distâncias e nomes simples. |
| 1.31.2 | Limites na seleção do grupo, abertura automática do mapa completo e Enquadrar explícito. |
| 1.31.3 | Retomada pelo histórico recupera a gravação via recarga segura; prévia móvel independente de ativação e erros de sessão mais claros. |
| 1.31.4 / 1.32.0 | Gravação pendente antes de encerrar a sessão; mapa com cores do tema, rótulos e controles revisados, resultado do bloco em cartões. PR #7. |
| 1.33.0 | Mais área para o mapa em tablet/notebook e identificação compacta no celular. PR #8. |
| 1.34.0 | Reposicionamento de Entrada no guia individual e tratamento de distância sobre ponto. PR #9. |

A documentação da 1.32 cita uma fonte em `central-precos/ferramentas/schmidt`,
mas seu acesso e sua equivalência ainda precisam ser verificados; uma consulta
posterior retornou 404. Não presumir recuperação ou migração concluída. index.html é um
artefato gerado por integração das fontes legíveis com o build preservado.
Não editar diretamente o bundle minificado.

## Caso móvel que motivou a última correção

O usuário informou somente uma tela aberta e mostrou BA1/BA2/BA3 com erro ao
salvar. Reproduzimos o erro em uma página da 1.31.2 após pagehide/pageshow
persistido simulados. A sessão era invalidada ao sair e não era recuperada ao
retornar. A 1.31.3 recarrega antes de ler e gravar dados atuais; não remove o lock
nem habilita gravação sobre memória antiga. A causa física ainda requer ensaio.
Relatório: [correção do celular](CORRECAO_CELULAR_1_31_3.md).

## Arquivos e testes principais

- src/platform/browser-session-lock.mjs: propriedade de gravação e lifecycle.
- src/platform/browser-write-barrier.mjs e legacy-integration.mjs: integração.
- src/application/block-planning.mjs: cálculo, registros e isolamento dos blocos.
- src/ui/block-planning.mjs e block-map.mjs: fluxo, prévia e enquadramento.
- scripts/build-preserved.mjs e block-transform.mjs: build verificável.
- audit/mobile-session-browser.mjs: reprodução antiga e casos corrigidos móveis.
- audit/session-lock-browser.mjs: concorrência, restauração e dados obsoletos.
- audit/blocks-ui-browser.mjs e block-map-framing-browser.mjs: blocos e mapa.

```sh
npm --prefix audit ci
npm --prefix audit test
npm --prefix audit run test:blocks
npm --prefix audit run test:sessions
node scripts/build-preserved.mjs --check
node scripts/build-block-candidate.mjs
node audit/all-fields-block-reference.mjs
node audit/blocks-runtime-browser.mjs
python audit/validate-runtime-blocks.py
node audit/blocks-ui-browser.mjs
node audit/block-map-framing-browser.mjs
```

Instalar Chromium do Playwright e as dependências Python de
 audit/requirements-blocks.txt. Os workflows do GitHub detalham o ambiente.
Não versionar resultados privados, GPX, backups ou novos anexos de campo.

## Pendências e próximos passos

1. Repetir o caso no telefone real: abrir, montar três lotes, sair/voltar pelo
   histórico, consultar mapa e salvar. Verificar toque, rotação e tela pequena.
2. Conferir GPS, orientação e desempenho em aparelhos da equipe e ao sol.
3. Android: build 1.31.3 código 15 sem assinatura, sem distribuição. Falta
   identidade privada estável e migração com backup verificado. A chave antiga
   não está disponível. Não reutilizar a chave histórica pública, não distribuir
   debug e não recomendar desinstalação para testar.
4. Recuperar a fonte geradora original completa.
5. Só definir recuo obrigatório com critério operacional aprovado; distância à
   borda é uma medida geométrica, não regra agronômica ou rota entre lotes.

## Limites a preservar

Metodologia linear existente; sem anéis. Barra 36,48 m. P6 sem alteração do
rumo/configuração e sem sua observação específica na interface. Preservar planos,
coletas, backup e offline. Consultar o escopo visual autorizado em AGENTS.md e na sessão atual; conservar
comparações e evidências para cada mudança, sem ampliar o escopo por hipótese.
Não substituir limites ou dados por hipótese; testes não homologam dados de campo.

## Trabalho entre frentes

Fazer fetch e criar branch própria a partir do main conferido. Nunca sobrescrever
mudanças não commitadas de outra frente. Antes de editar, registrar problema,
arquivos e teste esperado. Uma frente implementa; outra pode revisar reprodução,
segurança de dados e casos extremos. Evitar edição simultânea da mesma branch.
Repassar commit, diff, testes executados e pendências. Integrar por PR após CI;
não declarar publicação ou teste físico sem evidência do resultado.

## Revisão em andamento — gestos 1.34.1

Sobre a base 1.34.0, foi preparada a correção de pinça, arraste e zoom ancorado
no mapa conjunto. Ver [relatório e passagem](CORRECAO_GESTOS_1_34_1.md).
PRs #10 e #11 integrados em main após CI aprovada. Gestos e protocolo compartilhado
já fazem parte do projeto; merge de referência: f990ceb265ae495e5fd6efb675a08928db7cbff3.

## Candidata 1.35.0 — Satélite como última opção

Plano permanece padrão; Satélite foi integrado como opção secundária em
individuais e blocos, sem consulta externa até a seleção. Ver
[SATELITE_OPCIONAL_1_35_0.md](SATELITE_OPCIONAL_1_35_0.md) e
[prioridades de revisão móvel](REVISAO_PRIORIDADES_MOBILE.md).
Esta candidata depende da revisão de gestos do PR #11; não representa nova
publicação, APK ou validação em telefone físico.

### Revisão r2 da candidata 1.35.0

Leitura incremental limitada, validação PNG/JPEG, pausa de consultas em segundo
plano e liberação de recursos. Ver [REVISAO_MEMORIA_REDE_R2.md](REVISAO_MEMORIA_REDE_R2.md).
Mesmo visual e dados; entrega r2 separada da r1, ainda sem publicação.

## Integração autorizada — revisão r3

PR #12 retargetado para main e sincronizado com #10/#11. A revisão r3 também
rejeita decodificação de imagem que termine depois dos 10 segundos de prazo;
o bitmap é fechado antes do descarte. Teste reproduz atraso de 10,5 segundos.

Consultar o PR #12 e o workflow Pages para o estado efetivo de publicação;
esta anotação registra a preparação, não comprova deploy. Plano segue padrão,
Satélite opcional. Sem mudança de cálculos, dados ou distribuição Android.

Próxima sessão: conferir o commit de main e VERSAO.json no endereço público;
repetir pinça, coleta, saída/retorno e consulta de satélite em telefone físico.
Não confundir testes automatizados com homologação de campo. Evitar novos
refinos sem reprodução e critério mensurável; manter fontes legíveis e build verificável.
