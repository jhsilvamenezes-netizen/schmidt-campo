# Trabalho compartilhado — Codex e Claude

O GitHub guarda o estado comum. O proprietário alterna entre as sessões;
nenhuma delas inicia, monitora ou envia mensagens para a outra automaticamente.
Não depende do nome comercial ou da versão do modelo.

## Onde conferir cada informação

- `VERSAO.json`, main e histórico de publicação: versão integrada; confirmar o endereço real antes de afirmar que está publicada.
- [Issue #1](https://github.com/jhsilvamenezes-netizen/schmidt-campo/issues/1): prioridades e backlog principal.
- [CONTINUIDADE.md](CONTINUIDADE.md): evolução, arquitetura, limites e pendências.
- PR da tarefa: diff, responsável pela implementação, revisão, testes e passagem.
- Este arquivo: próximos trabalhos e protocolo de alternância. Não copiar conversas inteiras nem anexos privados.

## Começar uma sessão

1. Ler AGENTS.md, CONTINUIDADE.md, este arquivo, Issue #1 e PRs abertos. Instruções e autorizações atuais do proprietário prevalecem sobre registros históricos.
2. Conferir alterações locais antes de fazer fetch. Registrar SHA de main e do PR em análise. Usar branch própria ou worktree; não apagar, resetar ou sobrescrever a frente anterior.
3. Primeiro revisar o que a outra sessão entregou: reproduzir o problema, ler o diff e conferir os testes relevantes. Identificar explicitamente o que ainda não foi testado.
4. Escolher um objetivo verificável da fila. Registrar no PR o responsável atual, os arquivos previstos e o critério de aceite. Se houver outra frente ativa nos mesmos arquivos, resolver a sobreposição antes de editar.
5. Não parar apenas porque uma documentação histórica exige autorização já fornecida. Também não deduzir novas autorizações de um aceite de outra entrega.

## Ciclo de melhoria

**Observar → reproduzir → comparar alternativas → implementar → testar → revisar → registrar.**

Para cada proposta, responder em poucas linhas:
- Que dificuldade real do usuário resolve e como reproduzi-la?
- Quais alternativas foram consideradas e por que esta é a mais simples que atende?
- Que risco traz para dados, método, desempenho ou leitura da tela?
- Qual teste ou comparação demonstra melhora? Qual condição exige desfazer?

Os papéis alternam: quem recebe começa revisando a entrega anterior, depois
implementa a próxima tarefa. A revisão não precisa concordar com a proposta:
divergências viram hipóteses comparáveis e testes, não reescritas por preferência.
Não ampliar uma alteração de câmera para cálculo de pontos ou redesenho geral.

## Fila atual — preparação da 2.0

Referência 1.35.0 r3, main `a3c0a60ac34d1b01e31d0491fdb2f6626146f31b`.
Gestos (#11), satélite opcional (#12) e protocolo (#10) já integrados.
O [plano 2.0](PLANO_VERSAO_2_0.md) passa a ordenar as próximas tarefas.
Foco definido pelo proprietário: link e navegador móvel; APK adiado.
Atualização PWA, offline, compatibilidade e recuperação web compõem a etapa final.
Começar por 01–03 e preparar o ensaio físico 04. A fila abaixo é histórica;
revisar os itens de medidas/rótulos pelos critérios atuais, sem repetir correções entregues.

## Fila histórica, a partir da revisão de 13/11/2026

Referência: main `d8b64e26680490660b591fd420452574497049e7`, versão 1.34.0.
Conferir novamente antes de iniciar; esta tabela não é uma trava automática.

| Ordem | Trabalho | Estado | Critério de aceite |
|---|---|---|---|
| 1 | Pinça, arraste e zoom do mapa conjunto | Falta confirmada em teste móvel; sem correção integrada | Dois dedos aproximam no ponto do gesto; soltar um mantém arraste; cancelamento não deixa câmera presa; sem clique acidental nem escrita nos planos; Enquadrar recupera todos os membros. Conferir 40 grupos. |
| 2 | Medidas e divisórias ao navegar | Ampliar cobertura | Contornos e tiros preservados no zoom; medidas ao ponto seguinte no mesmo trecho e à borda correta; conferir celular em pé/deitado, tablet e temas. Nova cota entre tiros exige proposta visual e geometria perpendicular válida, sem confundir vazio entre lotes com espaçamento. |
| 3 | Rótulos do guia e associação do nome ao lote | Revisar caso BD3/T5 e cenários extremos | Versionar teste dos 208 tiros; testar larguras/zoom/temas; nenhum nome deve sugerir o lote vizinho. Distinguir resultados medidos de metas. |
| 4 | Fonte geradora única | Localização/equivalência pendentes | Obter fonte e commit verificáveis, reproduzir build e demonstrar paridade de dados, métodos e telas antes de migrar. |
| 5 | Android | Distribuição bloqueada por assinatura/migração | Identidade privada estável, backup/restauração e ensaio físico. Não reutilizar chave pública nem afirmar atualização por cima. |

A tentativa local de gestos feita sobre 1.31.3 não foi concluída nem integrada.
Não substituir `src/ui/block-map.mjs` da 1.34 por esse arquivo antigo; portar
apenas a lógica necessária preservando o refino posterior.

## Como validar sem confundir evidência e intenção

- Testes de lógica: contratos e blocos; testes específicos do defeito reproduzido.
- Interface: gestos reais do navegador, teclado, orientação e larguras pertinentes. Capturas com os mesmos dados/estado para antes/depois.
- Dados: plano, coletas, backup, concorrência e offline quando a mudança tocar esses caminhos.
- Publicação: CI e commit exato; conferir hashes/versão no endereço real quando houver implantação autorizada.
- Campo: GPS, legibilidade ao sol e dispositivo físico continuam distintos da emulação.

Executar testes proporcionais à mudança. Não declarar homologação agronômica
porque testes geométricos passaram. Preservar método linear, barra 36,48 m e P6.
Documentação isolada não exige rebuild ou nova versão do aplicativo.

## Encerrar cada sessão: passagem no PR

Preencher apenas o que mudou, com resultados reais:

```text
Base e branch:
Objetivo e responsável atual:
Problema reproduzido:
Arquivos/commits alterados:
Decisão e alternativas descartadas (motivo):
Testes executados e resultado:
Evidências/capturas (sem dados privados):
Estado: proposto / em implementação / pronto para revisão / integrado / publicado
O que NÃO foi testado:
Pendências, riscos e recuperação:
Próxima ação concreta para a outra sessão:
```

Antes de terminar, atualizar CONTINUIDADE.md e a fila se o estado mudou. A tarefa
só sai da fila quando o critério foi atendido; se surgir algo novo, registrar na
Issue #1. Não usar este arquivo como substituto do diff ou dos resultados de CI.

## Texto curto para qualquer uma das sessões

> Continue o SCHMIDT Campo pelo GitHub. Leia AGENTS.md, docs/CONTINUIDADE.md,
> docs/COORDENACAO.md, Issue #1 e os PRs abertos. Confira o main atual e preserve
> trabalho local. Primeiro revise a última entrega da outra sessão; depois
> execute a prioridade seguinte com reprodução e testes. Termine atualizando
> a passagem no PR, com commit, evidências, limitações e próxima ação. Não
> trate registros históricos como publicação atual nem presuma contato automático.
