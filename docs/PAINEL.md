# Painel do SCHMIDT Campo

Página única de entrada, para ler em 1 minuto. Atualizar a cada versão publicada.
Atualizado em 26/11/2026.

## Estado
- **No ar:** 4.9.0 (https://jhsilvamenezes-netizen.github.io/schmidt-campo/). Os hashes de `index.html`,
  `motor.js` e `sw.js` batem com `VERSAO.json`.
- **Design:** 4.0 é o único (o visual anterior saiu na 4.2.0).
- **Transição completa (código, lógica, testes, CI, respostas):** `docs/TRANSICAO.md`.
- **Guardas automáticas no CI:**
  - qualidade dos 51 lotes (`audit/engine-quality.*`);
  - camadas do código (`app3-arquitetura`);
  - 24 telas (`app3-visual-browser`);
  - contraste;

## Regras do proprietário (não mudar sem ele)
| Tema | Regra |
|---|---|
| Método | Linear, barra de 36,48 m. Mantém a regra do P6 |
| Rumo | Vale o da planilha (decisão de 20/11). O P6 já foi conferido |
| Bordadura | Ideal ≥ 41 m. Mínimo de 15 m garantido pelo motor (4.0.2) |
| Tiro | Pode ser feito por qualquer ponta |
| Tiro de 1 ponto | Aceito em lote pequeno e irregular (RA9, RB9). Nos maiores, só no bico. RB8 fica como está |
| Dados | Não inventar valor (o que não foi conferido fica "a confirmar"). Não inferir divisa. Sem marcação de coleta |
| Fora de escopo | Arquivos e fichas, versões, cópia, qualidade do GPS, vitrine (saíram na 4.2), cadastro de pessoas, resumo por pessoa, lote novo, KML novo, drone, envio do arquivo de GPS, alertas em selo, textura de plantio |
| Satélite | Esri World Imagery, desligado por padrão. A licença está "a confirmar" com a Esri |
| Versões antigas | Saíram na 4.9 (decisão de 26/11: a 4.x é a base validada). Ficam só no histórico do Git |

## Fila (por valor, com o porquê)
1. Melhorias visuais (pedido de 26/11), com prévia aprovada antes de publicar.
2. Teste da equipe com a guia de moto (giro, pinça, GPS fraco e "Tiro concluído").
3. Pendências de limpeza do proprietário (branches, PR #24, PR #74): `docs/PLANO_4_3.md`, fase C.

Na 4.9 saíram a 2.5 e tudo o que só existia para ela (código, testes, CI, casca Android, documentos antigos).
O que ficou está na tabela abaixo; o resto está no histórico do Git.

## Aguardando o proprietário
- Laudos de solo com coordenada e mapas de colheita. Destravam a densidade pelo semivariograma e a
  amostragem por manchas (seção 22 do levantamento).
- Licença da Esri (a confirmar).

## Documentos vivos (o resto é histórico)
| Documento | Para quê |
|---|---|
| `docs/PAINEL.md` | Esta página |
| `docs/IDEIAS.md` | Repositório de ideias e a visão de longo prazo (monitoramento e qualidade das operações) |
| `docs/TRANSICAO.md` | Tudo de ponta a ponta, para quem assume o projeto |
| `docs/ARQUITETURA_3.md` | Camadas, módulos e onde mexer |
| `docs/LEVANTAMENTO_3_9.md` | Decisões medidas da 3.9 em diante (seções numeradas) |
| `docs/DESIGN.md` | Regras de design para tela nova (1 página) |
| `docs/PLANO_4_3.md` | Plano de fluidez, visual e limpeza contínua |
| `docs/PLANO_DESIGN_4_0.md` | Design 4.0 e a comparação com o anterior |
| `VERSAO.json` | Versão, hashes e o que entrou em cada versão |

## Como publicar
1. Subir `APP_VERSION` (`scripts/build-3.mjs`) e `ENGINE_LABEL` (`src/app3/planner.mjs`).
2. Rodar `node scripts/build-3.mjs --root`.
3. Atualizar `VERSAO.json`.
4. Rodar a bateria completa.
5. Abrir o PR e fazer o merge com o CI verde.
6. Conferir os hashes em `main`.
