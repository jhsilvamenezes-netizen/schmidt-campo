# 3.0.0 — tela nova, feita do zero

## O que é

A página do link passa a ser gerada só de `src/`: motor 2 (`src/engine`) e tela nova (`src/app3`), sem código,
HTML ou CSS da 1.31. Desenho aprovado pelo proprietário em 15/11/2026 (`docs/previas-3-0/`).

| | 2.5 | 3.0 |
|---|---|---|
| Arquivo | 895 KB | 464 KB |
| Telas | 5 abas + 5 etapas no Planejar | 4 abas: Mapa · Plano · Enviar · Monitorar |
| Palavras (BD3, celular) | Mapa 45 · Planejar 600 · Conferência e Arquivos 346 · Auditoria 1.297 | Mapa 33 · Plano 95 · Enviar 76 · resto sob demanda |
| Origem do código | HTML 1.31 + 50 integrações por troca de texto | `src/` inteiro, módulos com escopo próprio, CSP por hash |

## Funções

- **Mapa:** lote, tiros e pontos numerados.
  - Gestos: pinça, arraste, duplo toque e enquadrar.
  - Tocar num ponto mostra o vizinho anterior e o seguinte (andando no tiro) e a distância à borda.
- **Plano:** regra (ha por ponto), pessoas, plano recomendado, outras opções, lista de tiros.
  - Ajustes avançados conferidos pelo catálogo do motor, com Desfazer.
  - Bloco de lotes: mesmo cálculo da 2.x; só usa opção sem perda de cobertura.
- **Enviar:** conferência, divisão da equipe, arquivo do plano, fichas de campo para imprimir, resumo para o WhatsApp.
  - Arquivos GPX, KML, CSV e GeoJSON, iguais byte a byte aos da 2.x.
- **Monitorar:** guia por GPS, sem marcação de coleta.
  - Seta, distância, entrada do tiro, saída da linha, tiro errado, GPS fraco ou antigo.
  - Tela acesa e vibração ao chegar.
- **Mais:** todos os lotes, dados do lote e da safra, como foi calculado, versões anteriores, cópia de segurança,
  abrir plano recebido.
- **Sem internet** depois da primeira abertura; atualização sem troca no meio do uso.
- **Trava entre abas:** a segunda janela não grava e avisa.

## Compatibilidade

- Mesmo estado salvo (`monitoramento.v03`) e mesmo arquivo de plano (`monitoramento.plano.v1`).
- Mesma cópia de segurança (`schmidt.backup.v2`), mesmas versões anteriores e mesmos registros de bloco.
- Testado nos dois sentidos: o que a 2.5 grava, a 3.0 abre igual, e o contrário.
- Quem tem a 2.5 instalada recebe a 3.0 ao reabrir o app.
- A **2.5 continua publicada como reserva** em `…/schmidt-campo/legado/`, com os mesmos dados do aparelho.

## Provas

| Teste | O que confere |
|---|---|
| `audit/engine-rest-diff.test.mjs` | 15 módulos do motor 2 = motor 0.5.1 nos 51 lotes |
| `audit/app3-planner.test.mjs` | Recomendação idêntica nos 51 lotes, conferência, equipe, guia, arquivo de plano, cores do mapa |
| `audit/app3-browser.mjs` | Claro e escuro, 390 px, sem erro nem rolagem lateral, limites de palavras, desfazer, ajustes, gestos, GPS simulado, cópia de segurança, versões, bloco, sem internet, duas abas |
| `audit/migration-browser.mjs` | 2.5 ⇄ 3.0 no mesmo endereço e atualização do service worker |
| Testes da 2.5 | Continuam no CI contra a página guardada em `legado/` |
