# E1 — referência reproduzível da 1.35.1

Executado em 14/11/2026, Chromium 153, tela 390×844, rede local, sem service worker.
Não é medição em telefone físico. O CPU ×4 simula um aparelho mais lento.

## Reproduzir

```bash
node scripts/build-preserved.mjs --check          # 1.35.1, HTML cea2c21f… = VERSAO.json
PERF_REF=026d687 node audit/performance-browser.mjs  # 1.34.1 × atual, 5 rodadas por variante e CPU
```

Evidência: `audit/performance-evidence-2026-11-14.json` (só tempos e memória).

## Resultado (mediana / p95, ms)

| Medida | CPU | 1.34.1 | 1.35.1 |
|---|---|---|---|
| Abrir até o plano pronto | ×1 | 191 / 231 | 185 / 210 |
| Abrir até o plano pronto | ×4 | 761 / 884 | 788 / 810 |
| Trocar de lote até o mapa pintado (mediana de 5 lotes) | ×1 | 33 / 38 | 33 / 33 |
| Trocar de lote até o mapa pintado (mediana de 5 lotes) | ×4 | 111 / 123 | 114 / 115 |
| Calcular os 51 lotes (749 pontos) | ×4 | 373 / 420 | 386 / 427 |
| Memória após calcular | ×1 | 3,64 MB | 3,67 MB |

Leitura: sem regressão. As diferenças (±4%) estão dentro da variação entre rodadas.
Cinco rodadas não comprovam bateria nem aparelho real (fica para E7).

## Mudança no script

`audit/performance-browser.mjs` passou a aceitar `PERF_REF` (a versão anterior a comparar;
o padrão continua `8232d79`) e `PERF_OUT`. Também passou a medir o desenho: a troca de lote
até dois quadros pintados, sempre nos mesmos 5 lotes.
