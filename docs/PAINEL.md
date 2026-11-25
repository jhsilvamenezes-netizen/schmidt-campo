# Painel do SCHMIDT Campo

Página única de entrada, para ler em 1 minuto. Atualizar a cada versão publicada.
Atualizado em 23/11/2026.

## Estado
- **No ar:** 4.2.0 (https://jhsilvamenezes-netizen.github.io/schmidt-campo/). Os hashes de `index.html`,
  `motor.js` e `sw.js` batem com `VERSAO.json`.
- **Design:** 4.0 é o único (o visual anterior saiu na 4.2.0).
- **Transição completa (código, lógica, testes, CI, respostas):** `docs/TRANSICAO.md`.
- **Guardas automáticas no CI:**
  - qualidade dos 51 lotes (`audit/engine-quality.*`);
  - camadas do código (`app3-arquitetura`);
  - 24 telas (`app3-visual-browser`);
  - contraste;
  - legado 2.5 intocado (`build-preserved --check`).

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
| Legado | `legado/`, `src/engine/` e `src/application/block-planning.mjs` não mudam |

## Fila (por valor, com o porquê)
1. Teste da equipe com a guia de moto (giro e pinça) e ajuste fino a partir disso.
2. PR #74 (Dependabot/CodeQL): revisar conforme `docs/TRANSICAO.md` E2.

Feito em 23/11: este painel e `docs/DESIGN.md`. Os 93 documentos antigos não foram movidos, porque scripts
e testes apontam para eles; a tabela abaixo diz quais estão vivos.

## Aguardando o proprietário
- Laudos de solo com coordenada e mapas de colheita. Destravam a densidade pelo semivariograma e a
  amostragem por manchas (seção 22 do levantamento).
- Licença da Esri (a confirmar).

## Documentos vivos (o resto é histórico)
| Documento | Para quê |
|---|---|
| `docs/PAINEL.md` | Esta página |
| `docs/TRANSICAO.md` | Tudo de ponta a ponta, para quem assume o projeto |
| `docs/ARQUITETURA_3.md` | Camadas, módulos e onde mexer |
| `docs/LEVANTAMENTO_3_9.md` | Decisões medidas da 3.9 em diante (seções numeradas) |
| `docs/DESIGN.md` | Regras de design para tela nova (1 página) |
| `docs/PLANO_DESIGN_4_0.md` | Design 4.0 e a comparação com o anterior |
| `VERSAO.json` | Versão, hashes e o que entrou em cada versão |

## Como publicar
1. Subir `APP_VERSION` (`scripts/build-3.mjs`) e `ENGINE_LABEL` (`src/app3/planner.mjs`).
2. Rodar `node scripts/build-3.mjs --root`.
3. Atualizar `VERSAO.json`.
4. Rodar a bateria completa.
5. Abrir o PR e fazer o merge com o CI verde.
6. Conferir os hashes em `main`.
