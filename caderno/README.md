# Caderno Campo — Sistema independente de aplicações · V2

**Status:** candidata para revisão visual e funcional. Não publicar em `main` sem validação. Nenhum dado real agrícola acompanha o código público.

## Objetivo operacional

Transformar o caderno Excel em um registro móvel de aplicações, mantendo a OS como entidade principal e disponibilizando sua consulta por cada talhão correspondente. Entrada por colagem de texto do WhatsApp ou lançamento manual, com conferência humana antes do armazenamento.

## Estrutura de domínio

- **Fazenda → Talhões**: Rio de Janeiro e Bananal, cadastro da safra, cultura, variedade e área **cadastrada**.
- **Aplicação (registro único)**: identificador, OS, fazenda, início/fim, modalidade, situação, conjunto de talhões, produtos, observações, origem e, quando disponível, dados da aeronave.
- **Produto por aplicação**: nome comercial, dose informada (valor e unidade), quantidade usada total na OS, sobra total na OS, unidades e observação.
- **Relatório original**: texto guardado no registro parseado. Relatório de conferência associado pela fazenda, número, datas e conjunto de talhões.
- **Rastreabilidade**: log de criação, edição, importação, anulação, restauração e mudança de situação. Anulação preserva registro para revisão.

### Regras de integridade

1. Uma aplicação com cinco talhões é **um registro único** vinculado a cinco históricos; nunca somar o total da OS cinco vezes.
2. A mesma numeração de OS pode pertencer a fazendas diferentes, datas diferentes ou execuções distintas. Chave de equivalência considera fazenda + OS + início/fim + modalidade + conjunto de talhões.
3. **Não** preencher dose, unidade de consumo, área efetivamente tratada ou consumo individual por talhão por inferência.
4. Não misturar `kg`, `g`, `L` e `mL` em um único consolidado sem conversão e validação. O painel inicial usa frequência de registros, não soma de quantidades.
5. Arquivos importados mesclam dados, sem sobrescrever silenciosamente registros existentes. Toda nova OS precisa de confirmação do usuário.
6. Identificadores de talhão inválidos ficam no histórico como pendência; não são transformados em talhões oficiais nem têm área presumida.
7. Editar, anular e restaurar produzem evento no log. Backups JSON contêm o histórico completo, inclusive anulados.

## Arquitetura independente

```
Caderno_Campo_Independente_V2/
  index.html             interface PWA separada
  app.js                 fluxo de lançamento, visualização e navegação
  parser.js              leitura conservadora de relatórios WhatsApp
  core.js                regras e análises puras (testáveis)
  store.js               IndexedDB próprio: schmidt-caderno-campo-standalone-v2
  styles.css             estilo próprio, responsivo, mobile-first
  sw.js                  cache apenas de recursos do subdiretório
  manifest.webmanifest   aplicativo independente
  tests/                 testes de domínio, navegador e parser
```

Nenhuma importação de arquivos, CSS, rotas, armazenamento ou componentes do Schmidt Campo Monitoramento. A publicação segura definitiva deverá idealmente usar um **repositório e endereço próprios**. Enquanto isso, a candidata pode ficar isolada numa branch e no subdiretório `caderno/` sem modificar `main` ou a página atual.

## Fluxo do usuário

1. **Dados → Importar JSON** (histórico do caderno). Não publicar o JSON em repositório aberto.
2. **Lançar**: colar **um** relatório por vez; selecionar “Interpretar relatório”; corrigir OS, datas, talhões, produtos, quantidades, unidades e dados aéreos; confirmar.
3. **Histórico**: pesquisar OS, produto, talhão, fazenda, situação ou período; detalhes completos; editar ou anular com auditoria.
4. **Talhões**: selecionar fazenda e talhão para consultar as aplicações vinculadas.
5. **Análises**: filtrar período e fazenda e ler frequência de aplicações, tendências por mês, produtos mais registrados, modalidades e pendências.
6. **Dados → Exportar backup JSON** regularmente. CSV está disponível para análise externa; evitar abrir e salvar o arquivo CSV como substituto do JSON.

## Significado dos indicadores

| Indicador | O que representa | O que NÃO representa |
|---|---|---|
| Registros | Quantidade de lançamentos de OS | Número de tanques, passadas ou subáreas |
| Talhões atingidos | Talhões identificados em registros | Hectares efetivamente tratados |
| Produtos registrados | Ocorrências de itens nas OS | Massa/volume aplicado ou predominância agronômica |
| Aplicações por mês | Registros segundo a data de término | Cronograma planejado ou horas de operação |
| Em aberto | Situação escrita no caderno | Pendência no sistema de OS oficial |
| Integridade | Campos ausentes e cadastro inconsistente | Qualidade da aplicação ou nível de dano econômico |

**Fontes de estudo:** [FAO — boas práticas de registro](https://www.fao.org/fileadmin/templates/agphome/documents/Pests_Pesticides/Code/Old_guidelines/Ground_application.pdf); [EPA NSW — registro de aplicação](https://www.epa.nsw.gov.au/Your-environment/Pesticides/compulsory-record-keeping/Sample-pesticide-application-record); [web.dev — dados offline/PWA](https://web.dev/learn/pwa/offline-data?hl=pt-br); [WCAG 2.2 — alvos de toque](https://www.w3.org/TR/WCAG22/#target-size-minimum).

## Limitações e requisitos de produção

- Armazenamento **local via IndexedDB**; os dados **não sincronizam** entre celulares/notebooks.
- Não há autenticação, servidor remoto, backup automático na nuvem, relatórios legais auditáveis com assinatura nem integração com Cropwise.
- O armazenamento de um navegador pode ser limpo pelo usuário/sistema; exportar JSON frequentemente e após lançamentos críticos.
- O parser não substitui revisão humana. Produtos que aparecem sem unidade, dose ou área não são completados automaticamente.
- Aplicações futuras exigem cadastro de **área efetivamente tratada por talhão**, se a meta for indicadores de hectares, custo/ha, consumo/ha e histórico de doses efetivas.
- Antes de produção: homologar em Galaxy/Chrome real, testar restauração após fechamento, uso offline e exportação/importação com dados revisados; definir rotina de backup e acesso privado.

## Verificação

```sh
node --check core.js && node --check parser.js && node --check app.js
node tests/core.test.cjs
node tests/parser.test.cjs
```

O teste `tests/render_smoke.py` usa Chromium com armazenamento simulado porque a navegação HTTP/file externa é bloqueada no ambiente de verificação. Ele é útil para conferir renderização, fluxo colar → salvar → histórico e ausência de overflow, mas **não** substitui teste persistente real do IndexedDB.

## Próxima fase recomendada

1. Confirmar no celular o fluxo de conferência e a visualização de OS grandes.
2. Corrigir as pendências detectadas do histórico de importação antes de usar métricas por talhão.
3. Definir autenticação e sincronização (API + banco privado, controle de fazenda/usuário e migração), preservando offline-first e histórico de auditoria.
4. Só depois ampliar para indicadores avançados com área executada, equipamento, horário, operador, clima, alvo, produtos e unidades validadas.
