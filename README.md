# SCHMIDT Campo

Planeje os tiros e pontos de amostragem, acompanhe as coletas e consulte o mapa
no celular. Você pode trabalhar em um lote ou em um bloco de lotes compatíveis.

**[Abrir o site](https://jhsilvamenezes-netizen.github.io/schmidt-campo/)**

## Começar

1. Abra o site com internet uma vez para carregar o aplicativo.
2. Escolha a fazenda e o lote.
3. Em **Planejar**, confira a quantidade de pontos e as distâncias.
4. Para trabalhar em bloco, escolha os lotes, monte o bloco e confira o resultado.
5. Use o mapa e a tela **Tiros** para acompanhar a atividade.

Os pontos são planejados. Confira as condições no campo. A marcação de coleta
registra o progresso neste aparelho; o registro oficial continua no Cropwise.

## Usar sem internet

Depois de carregar o site, ele pode abrir offline. Para instalar como aplicativo:

- **Android/Chrome:** menu do navegador → Adicionar à tela inicial ou Instalar.
- **iPhone/Safari:** Compartilhar → Adicionar à Tela de Início.

Abra pelo endereço do site e permita a localização para usar o GPS.
Para receber uma atualização, feche as janelas antigas e reabra com internet.
Não limpe os dados do site para atualizar.

## Guardar os dados

Em **Plano → Arquivos**, faça uma cópia de segurança e guarde fora do aparelho.
Faça isso antes de trocar de celular ou reinstalar. Os dados do site e do APK
não são compartilhados automaticamente.

## APK Android

[Baixar o APK disponível](https://github.com/jhsilvamenezes-netizen/schmidt-campo/releases/latest/download/SCHMIDT-Campo.apk).
Esse arquivo é a versão Android anterior. As melhorias desta branch ainda não
foram distribuídas em um novo APK.

A chave de assinatura antiga não está disponível. Um novo APK precisa de
assinatura própria e de migração com backup testado. Não desinstale o aplicativo
atual antes de guardar e conferir seus dados.

## Para quem desenvolve

- [Estado do projeto e continuidade](docs/CONTINUIDADE.md)
- [Versão e identificação dos arquivos](VERSAO.json)
- [Código e funcionamento do build](src/README.md)
- [Testes](audit/README.md)
- [Histórico de entregas](docs/VERSOES_E_ENTREGAS.md)
- [Tarefas do projeto](https://github.com/jhsilvamenezes-netizen/schmidt-campo/issues/1)
- [Regras do projeto](AGENTS.md)

`index.html` é gerado: altere as fontes legíveis, não o código compilado.
O projeto-fonte original completo ainda não foi recuperado.

```sh
node scripts/build-preserved.mjs
npm --prefix audit test
npm --prefix audit run test:blocks
```

A identificação em VERSAO.json informa se os arquivos desta branch são uma
versão publicada ou uma versão em preparação. Estudos e imagens de proposta
não significam que a mudança já está no site ou no APK.

## Continuidade do desenvolvimento

Para alternar entre Codex e Claude, use o [protocolo compartilhado](docs/COORDENACAO.md)
e o [estado do projeto](docs/CONTINUIDADE.md). Cada entrega deixa no PR os commits,
testes, pendências e a próxima ação.

## Próxima evolução

[Plano da versão 2.0](docs/PLANO_VERSAO_2_0.md): foco no link e navegador móvel, 45 itens, parâmetros e critérios de entrega web. APK adiado.
[Mensagem para iniciar com Claude](docs/INICIO_CLAUDE_2_0.md). Plano proposto; não representa nova versão publicada.

[Revisão aprofundada da 2.0 web](docs/APROFUNDAMENTO_2_0_WEB.md): vínculo de coletas, prontidão offline e critérios avançados.
