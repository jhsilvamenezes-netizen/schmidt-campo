# SCHMIDT Campo — estado e continuidade

Consulte primeiro [VERSAO.json](../VERSAO.json), [Issue #1](https://github.com/jhsilvamenezes-netizen/schmidt-campo/issues/1)
e o commit atual de main. O site é https://jhsilvamenezes-netizen.github.io/schmidt-campo/.
Este documento permite continuar a revisão com outro desenvolvedor ou assistente,
inclusive Claude. Não existe integração automática entre sessões.

## Evolução recente

| Etapa | Entregue |
|---|---|
| Preservação e dados | Baseline, backups com integridade, restauração, isolamento de gravação e proteção contra estado antigo. |
| Plano essencial | Informações e distâncias principais organizadas; barra de 36,48 m. |
| Blocos | 40 opções compatíveis, preservando 51 lotes individuais e registros separados. |
| 1.31.1 | Mapa conjunto, abertura de cada lote, consulta das distâncias e nomes simples. |
| 1.31.2 | Limites na seleção do grupo, abertura automática do mapa completo e Enquadrar explícito. |
| 1.31.3 | Retomada pelo histórico recupera a gravação via recarga segura; prévia móvel independente de ativação e erros de sessão mais claros. |

O código gerador original completo ainda não foi recuperado. index.html é um
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
coletas, backup e offline. Novas mudanças visuais precisam de comparação e aceite.
Não substituir limites ou dados por hipótese; testes não homologam dados de campo.

## Trabalho entre frentes

Fazer fetch e criar branch própria a partir do main conferido. Nunca sobrescrever
mudanças não commitadas de outra frente. Antes de editar, registrar problema,
arquivos e teste esperado. Uma frente implementa; outra pode revisar reprodução,
segurança de dados e casos extremos. Evitar edição simultânea da mesma branch.
Repassar commit, diff, testes executados e pendências. Integrar por PR após CI;
não declarar publicação ou teste físico sem evidência do resultado.
