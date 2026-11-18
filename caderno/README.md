# Caderno Campo — V3 candidata (não publicada)

Aplicativo web independente para registrar aplicações agrícolas e consultar o histórico por fazenda e talhão. O repositório contém **somente código e testes fictícios**. Nenhuma planilha, relatório real ou base com consumo da safra deve ser publicado em GitHub Pages.

## Operação

1. Abra pelo navegador em uma origem HTTPS exclusiva do Caderno Campo (ou servidor local para desenvolvimento).
2. Em **Dados**, importe uma cópia JSON do caderno existente. Revise o resumo de inclusões, duplicados e quarentena.
3. Em **Lançar**, cole uma OS do WhatsApp ou preencha manualmente. Confirme fazenda, período, bloco de talhões e produtos.
4. Blocos e doses são **referências históricas**, nunca prescrições. Unidade do catálogo só passa ao registro quando confirmada explicitamente.
5. Consulte **Painel**, **Histórico**, **Talhões** e **Análises**. Para restaurar uma OS anulada, use Histórico → Incluir OS anuladas.
6. Exporte cópias JSON regularmente. O site não possui conta, autenticação ou sincronização remota.

## Melhorias concretas da V3

- Reconhecimento conservador de talhões: `RA12` e `P10` permanecem identificadores únicos, enquanto `BD12345` e `RA-RB-RC 7,8` expandem com regras próprias.
- Unidades reais (`KG` → `kg`, `G` → `g`, `ML` → `mL`) preservadas como valores distintos de doses e unidade cadastral. Sem rateio implícito entre talhões.
- Blocos mais utilizados na mesma fazenda; catálogo pesquisável; histórico contextual de doses **somente para consulta**.
- Interface focada em tarefas, com acesso direto às pendências, histórico e aplicações abertas; gráficos clicáveis para consultar registros.
- Importação sem descarte silencioso: relatórios estruturais inválidos entram em quarentena; duplicatas são relatadas; registros antigos com término ausente ou identificador inconsistente permanecem visíveis para revisão sem correção automática.
- Restauro da auditoria de backups; revisões de OS com estado anterior/posterior no evento; anulação/restauração acessíveis.
- Rascunhos separados do workspace no IndexedDB e validação antes de salvar; gravação concorrente com revisão otimista.
- Atualização do service worker sem `skipWaiting`/`clients.claim` forçados, minimizando risco de troca de versão durante um rascunho.
- Legibilidade melhorada em 360/390/1440px, versão mobile com cinco destinos e acesso a Dados pelo cabeçalho.

## Arquitetura

- `core.js`: regras e consultas, sem dependência da interface.
- `parser.js`: interpretação de relatórios e aliases.
- `store.js`: transações IndexedDB; atualiza o banco `schmidt-caderno-campo-standalone-v2` da versão 1 para a 2 sem apagar a base existente.
- `app.js`: UI e orquestração (ainda em processo de decomposição, sem adoção prematura de framework).
- `sw.js`: cache estático; não armazena dados da safra no Cache Storage.

> **Limites importantes:** um banco de nome diferente **não é isolamento de segurança por si só**. Hospedar em domínio/origem próprios e adotar autenticação/RLS antes de expor o aplicativo para equipes ou sincronizar dados entre dispositivos. Sem backend. Restauração e concorrência ainda precisam de testes reais no Android. Os resultados do protótipo em memória não substituem esses testes.

## Testes

```bash
node tests/core.test.cjs
node tests/parser.test.cjs
node tests/domain-v3.test.cjs
```

Teste visual `tests/render_v3.py` utiliza Chromium com armazenamento simulado e arquivo privado de referência que **não faz parte deste repositório**. Testes de IndexedDB e service worker em HTTPS real são pendências antes da publicação.

## Implantação

Esta pasta representa uma candidata de revisão, ainda sem merge ou publicação. Recomendado criar um repositório **e domínio próprios** para o Caderno Campo; manter o `SCHMIDT Campo` de monitoramento em projeto separado. Não usar o diretório/Pages atual como espaço definitivo de dados agrícolas.
