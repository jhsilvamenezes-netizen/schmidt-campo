# AGENTS.md: SCHMIDT CAMPO

Leia `docs/PAINEL.md` (estado, regras do proprietário, fila) e `docs/TRANSICAO.md` (código, testes, CI).

## Regras
- Base é a 4.x. Versões antigas (até a 2.5) saíram na 4.9 e ficam só no histórico do Git.
- Não inventar valor: o que não foi conferido fica "a confirmar". Pontos são simulação.
- Mudança de comportamento: medir antes e depois; deixar teste ou guarda que impeça voltar atrás.
- Visual novo: prévia com imagens (claro, escuro, Sol; 360 e 390 px) aprovada pelo proprietário antes de publicar.
- Publicar = merge na `main` com o CI verde (`validacao` e `blocos`). Conferir os hashes de `VERSAO.json`.
- Repositório e Pages são públicos: não expor dados novos de fazenda, KML ou coordenadas sem necessidade.
- A chave Android de depuração antiga continua no histórico público: nunca usá-la para distribuir.
