# Retomada quando acabar o limite de uma IA

É possível reduzir muito a perda mantendo o trabalho no GitHub. Não há troca
automática entre Codex e Claude nem acesso automático ao conteúdo da outra
sessão. É preciso abrir a outra IA com acesso ao mesmo repositório e pedir retomada.
Um corte abrupto ainda pode perder o que não foi enviado desde o último checkpoint.

## O que precisa ficar salvo

- **Branch/commits:** código e testes, inclusive WIP claramente identificado.
- **docs/RETOMADA.json:** registro canônico de tarefa, responsável, estado,
  próxima ação, testes declarados, bloqueios/decisões e snapshot do Git.
- **docs/RETOMADA.md:** leitura rápida, gerada a partir do JSON.
- **PR da tarefa:** diff e CI real do commit; Issue #1 aponta a frente atual.
- **docs/EXECUCAO_2_0.md:** fila/dependências. Um ponto de retomada vigente por
  branch ativa, não uma cópia de toda a conversa.

O registro tem commit anterior ao próprio checkpoint. Ao recuperar, conferir
primeiro o HEAD remoto que contém o registro e depois o commit de código
observado nele. Nunca executar reset para “voltar ao checkpoint”.

## Frequência prática

Publicar no início da tarefa, após cada unidade de implementação/teste e antes
de qualquer pausa. Para trabalhos longos, procurar intervalos de 10–15 minutos
ou menores quando o limite estiver próximo; o horário não dispara sozinho.
Não esperar terminar toda a tarefa para abrir PR ou salvar código.

Comando local (Node, sem dependência nova):

```bash
node scripts/checkpoint.mjs --task E2 --owner Claude --status em_andamento --next 'Comparar distância à borda no caso com buraco'
```

Para iniciar outra frente, usar sua branch própria. Atualizar `tests`, `blockers`
e `decisions` no JSON com resultados reais antes de gerar o resumo. Estados:
`pronto_para_iniciar`, `em_andamento`, `bloqueado`, `pronto_para_revisao`.

O comando identifica branch/commit/arquivos rastreados alterados e conta arquivos
não rastreados. **Não executa testes, não faz commit, não faz push, não envia nada
pela rede e não verifica a verdade do resultado declarado.** Não certifica
publicação; resultados/CI precisam de evidência. Não incluir backups, anexos,
coordenadas privadas, chaves ou senhas no registro ou commit.

Depois de gerar, revisar diff e selecionar os arquivos públicos da tarefa. O
assistente deve commitar/enviar esses arquivos e os dois registros no mesmo
checkpoint usando o mecanismo GitHub disponível. Conferir o SHA remoto. Evitar
`git add .`, que pode incluir arquivos locais impróprios. O comando é um apoio
reproduzível, não um serviço automático rodando em segundo plano.

## Quando a sessão parar

Na outra IA, enviar:

> Retome SCHMIDT Campo pelo GitHub. Leia primeiro docs/RETOMADA.md e JSON na
> branch/PR da tarefa, depois docs/EXECUCAO_2_0.md e AGENTS.md. Confira o HEAD
> remoto e o diff; preserve alterações locais. Continue a próxima ação registrada,
> verificando o resultado de testes/CI ainda pendentes. Não recomece tudo nem
> trate WIP como aprovado. Uso exclusivo para direcionamento pelo link móvel.

Se o registro não foi enviado, outra máquina não terá os arquivos. Conferir
últimos commits, PR e runs de CI; se necessário, recuperar um patch revisado do
workspace anterior. Não inventar o estado perdido. Mudanças não commitadas não
são recuperáveis só pela descrição de uma tarefa.

## O que pode ser automatizado depois

O gerador já automatiza o resumo Git local. Cadência de execução/publicação por
cron, hook ou processo externo só deve ser adotada depois de definir ambiente,
autenticação e revisão do conteúdo. Um daemon não sabe se um arquivo pode ser
publicado, não evita o limite da IA e não termina raciocínio/código interrompido.
CI continua no GitHub após envio; a próxima sessão deve ler o run pelo commit.
