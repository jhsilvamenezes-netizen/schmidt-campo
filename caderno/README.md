# SCHMIDT · Caderno de Campo Web (protótipo V1)

Aplicativo web **independente** do SCHMIDT Campo existente, preparado para publicação em uma pasta `/caderno/` dentro do GitHub Pages. Não modifica menu, mapa, arquivos ou interface da aplicação principal.

## Funcionalidades implementadas

- Painel com fazendas, registros por talhão e pendências conforme histórico.
- Consultas por fazenda e talhão, com área, cultura e cultivar importadas do Excel.
- Histórico por OS, filtro por fazenda, situação, talhão e produto.
- Campo de colagem de **uma** mensagem do WhatsApp por vez: reconhece número da OS, datas, talhões compactados, produtos, uso, sobras e modalidade aérea (aeronave, piloto e horímetro).
- Conferência e edição manual obrigatórias antes de gravar.
- Mesma OS aparece no histórico de todos os talhões envolvidos, mas **o consumo é total da OS**, sem rateio ou dose inventada.
- Proteção contra duplicidade da mesma OS, fazenda, datas, modalidade e conjunto de talhões.
- Arquivos de backup e restauração JSON; exportação CSV de aplicações.
- Instalação via navegador e cache offline de arquivos da interface (PWA).

## Como usar

1. Abra o aplicativo em um navegador: após publicação, o endereço planejado é `https://jhsilvamenezes-netizen.github.io/schmidt-campo/caderno/`.
2. Na aba **Dados**, importe o arquivo `caderno-2026-27-importacao.json`, disponibilizado **separadamente pelo ChatGPT e nunca commitado** ao repositório público.
3. Na aba **Lançar**, cole uma mensagem de OS, confira os dados reconhecidos e escolha **Confirmar e registrar**.
4. Use **Fazendas** para consultar o histórico por talhão. Exporte backup regularmente em **Dados**.

## Dados de referência

O arquivo JSON separado foi obtido do caderno `Caderno_de_Campo_RJ_Bananal_17-11-2026_FINAL.xlsx`:

| Origem | Quantidade |
| --- | ---: |
| Cadastro | 49 talhões |
| Produtos | 77 produtos |
| Lançar | 75 grupos de aplicação, com 214 itens de produto |
| Conferência de relatórios | 18 relatórios |

RA9 e RB9 aparecem no histórico, mas não no cadastro original; o app os exibe como **não cadastrados**. A OS 52 pode existir em ambas as fazendas sem colisão. A importação mescla sem sobrescrever as entradas locais.

## Limitações importantes

- **Não é um banco de dados compartilhado.** As informações ficam no armazenamento local do navegador que recebeu a importação. Não são sincronizadas entre celular e notebook; limpeza do navegador ou troca de aparelho pode apagar o histórico sem backup.
- O GitHub Pages é público: **não** inclua JSON de dados agrícolas, OS, localização sensível ou outros anexos privados no repositório/site. `robots noindex` não protege dados confidenciais.
- Não há autenticação ou edição colaborativa. Para sincronização entre dispositivos, planejar API/banco de dados com controle de acesso e backup (ex.: Supabase com políticas RLS corretamente verificadas).
- Unidades ausentes, especialmente em relatos aéreos, continuam **não informadas**. Dose/ha não é deduzida de volume total.
- As pendências seguem o campo **Concluída** do Excel, mesmo quando existe relatório posterior com status distinto; o usuário pode conferir e corrigir manualmente.
- Um relatório por vez; formatos novos de WhatsApp devem passar por teste do parser antes de serem aceitos automaticamente.
- Interface ainda depende de validação visual final em navegadores reais (testes automatizados de navegador não disponíveis no ambiente de elaboração).

## Executar e testar

Hospede esta pasta em qualquer servidor HTTP estático; não há compilação nem dependências. Para teste do leitor:

```sh
node tests/parser.test.cjs
```

A atualização do `sw.js` deve incrementar `CACHE` ao mudar os arquivos publicados, para evitar cópias antigas offline.

## Publicação e segurança

Uma branch/PR isolada deve preceder qualquer inclusão na `main` do repositório existente. O fluxo atual de Actions da aplicação principal tem implicações de distribuição: **não faça push ou merge às cegas**. Nenhum dado histórico privado deve ser enviado ao GitHub.
