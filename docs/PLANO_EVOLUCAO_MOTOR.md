# Evolução do motor — plano após a 2.2.0

15/11/2026. Base: `main` 725b1dc (2.2.0, motor 2 na página e no worker). Autorização do
proprietário: executar as melhorias sem pedir permissão a cada etapa.

## 1. Exame (medido, não estimado)

Perfil no Node, motor 2, 51 lotes (média de 5 rodadas):

| Etapa | Tempo |
|---|---|
| Plano inteiro (tiros, recorte, pontos) | 7,6 ms |
| Cobertura (duas grades + vizinho mais próximo) | 56 ms |
| Avisos de qualidade dos dados | 13 ms |
| Entre tiros | 9 ms |
| Otimização ("Buscar distribuição melhor") | 24 ms por lote |

Preparar os 40 blocos: **16,9 s**, dos quais **12,9 s (77%)** vão em 17.130 cenários
completos. A busca só usa tiros e pontos de cada candidato, mas calcula cobertura em duas
grades, entre tiros, caminhada e avisos de cada um, e depois refaz a própria cobertura.

Outros pontos do exame:

- **Legado:** ainda são do motor 0.5.1 a validação de parâmetros, a qualidade dos dados, a
  recomendação, a rota, a edição, a equipe, a projeção e a exportação. O artefato carrega o
  motor antigo inteiro duas vezes (página e worker).
- **Cobertura:** o app afirma um "limite superior do vazio" (`maxUpperBoundM`), mas ninguém
  provou isso contra o vazio exato. Ele pode ser calculado com Voronoi.
- **Qualidade de código:** o motor 2 não tem checagem de tipos, e os testes comparam com o
  motor antigo em casos escolhidos, sem propriedades gerais (invariâncias, limites).

## 2. Unidades (ordem por ganho comprovável)

| Unidade | Entrega | Aceite |
|---|---|---|
| A. Busca do bloco sem desperdício | `planScenario` (só o plano) na preparação do bloco | 40 registros idênticos aos atuais; tempo medido antes/depois |
| B. Prova exata da cobertura | Vazio máximo exato por Voronoi (Shapely/GEOS) nos 51 lotes, comparado com `max` e `maxUpperBoundM` | O limite superior nunca é violado; se for, corrigir com teste |
| C. Tipos e propriedades | JSDoc + TypeScript 7 (`checkJs`) no motor; propriedades com fast-check | `tsc` sem erros; propriedades passam em milhares de casos gerados |
| D. Fim do motor antigo | Reescrever os módulos restantes e retirar o 0.5.1 do artefato | Mesmo teste diferencial; `index.html` menor; bateria completa |

Cada unidade fecha com teste que falharia antes, medida antes/depois, checkpoint, PR, CI e
publicação, conferindo o hash publicado.

## 3. Limites

Não mudam: método linear, barra de 36,48 m, P6, padrões, 51 lotes e 40 blocos. Uma diferença
de resultado só é aceita se for correção de defeito comprovado e explicada. Nada aqui
substitui o piloto em celular real.
