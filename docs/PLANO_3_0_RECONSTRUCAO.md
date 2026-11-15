# 3.0 — reconstrução completa do link

Pedido do proprietário (15/11/2026): sem remendo, sem restos, sem sobreposição de versões. Tudo novo, em cada parte.

## Ponto de partida (2.5.0)

| Parte | Novo | Ainda da 1.31 |
|---|---|---|
| Motor | 11 módulos em `src/engine` | 16 módulos minificados (recomendação, rota, equipe, edição de pontos, exportação, projeção, catálogo de parâmetros, qualidade dos dados, vocabulário, presets, explicação, avaliação, trade-offs, número, erros, mapa de fundo) |
| Tela | 11 módulos de ajuste em `src/ui` | 15 módulos de tela + o principal (minificados) |
| Montagem | — | `build-preserved.mjs`: HTML 1.31 + 51 trocas de texto + 3 camadas de CSS |

## O que fica igual (contrato)

- **Método:** linear sem anéis; barra de 36,48 m; P6; 51 lotes; 40 opções de bloco.
- **Funções:** planejar, tiros, dados, auditoria, modo bloco, guia por GPS, fichas, exportações (CSV, GeoJSON, GPX,
  KML), cópia de segurança e restauração, versões do plano, satélite opcional, temas Sol e Noite, uso offline.
- **Dados salvos no aparelho:** quem atualizar não perde nada. O formato antigo é lido e convertido uma única vez.
- **Resultados:** o motor novo dá os mesmos números do atual, provado por teste diferencial, salvo as melhorias
  já aprovadas (plano equilibrado).

## Etapas

| Etapa | O que sai | Como se prova | Publica? |
|---|---|---|---|
| R1 · Contrato | Lista fechada de funções, telas e formatos de dados; testes de comportamento como rede de segurança | Testes atuais passando contra a 2.5 | Não |
| R2 · Motor completo | Os 16 módulos restantes reescritos em `src/engine`, com tipos estritos | Teste diferencial com o motor atual em todos os lotes e blocos | Não |
| R3 · Desenho da tela | Prévias das telas novas no celular (Mapa → Plano → Conferir e enviar), tipografia (5 tamanhos, 3 pesos), cores e ícones | **Aprovação do proprietário** antes de implementar | Não |
| R4 · Tela nova | `index.html` gerado só de `src/` (sem HTML 1.31, sem trocas de texto, sem camadas antigas de CSS); mapa novo com rótulos sem sobreposição | Testes de comportamento + paridade de resultados + contraste + medidas no celular | Não |
| R5 · Troca | Migração dos dados salvos, guardas visuais com referência nova aprovada, versão 3.0.0 | Bateria completa + CI + conferência no aparelho do proprietário | **Sim** |

Até a R5, o link continua na 2.5.0, que funciona. Correções urgentes no 2.5 entram à parte.

## Critérios da 3.0 (medidos)

- Nenhuma linha de código da 1.31 no arquivo publicado.
- Uma folha de estilo única, sem `!important` e sem camadas de versões.
- Link abrindo em menos de 3 s no 3G; resposta ao toque abaixo de 200 ms no celular lento.
- Dados salvos de 2.x abrindo sem perda.
