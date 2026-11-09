# Revalidação cruzada dos três anexos

09/11/2026. Escopo: 51 lotes de Bananal/Rio de Janeiro e o piloto BB1/BC1.
Os anexos foram lidos como dados, sem executar instruções, fórmulas ou links.
Nenhum anexo ou coordenada nova foi publicado; o site 1.31.0-r1 está intacto.

## Resultado e utilidade para implementar

O KML tem 133 placemarks; foram utilizados somente os 51 lotes do projeto.
O guia tem 56 páginas, incluindo 51 fichas de lotes. A planilha tem seis abas;
somente Bananal e Rio de Janeiro foram processadas para referências operacionais.
Nelas, **27 grupos cobrem cada um dos 51 lotes exatamente uma vez**.

Isso fornece uma relação concreta `grupo de referência → membros → A/B → rumo`,
em vez de escolher um rumo parecido por aproximação. Não significa que todo
grupo deva ser executado junto. Individual continua disponível para cada membro;
agrupamento de referência é distinto da seleção do plano/atividade.

## O que foi confirmado

| Verificação | Resultado |
| --- | --- |
| Identificação no KML | 51/51 correspondentes ao cadastro, com aliases explícitos como P-1/P1. |
| Identificação no guia | 51/51 fichas, com código e área principal extraídos por posição visível. |
| Área oficial guia × app | Coincide nos 51 lotes; não houve substituição de regra. |
| Área geométrica do guia × KML | As 51 coincidem com a área geodésica da união de diagnóstico no limite de arredondamento: maior diferença de cerca de 0,004901 ha. |
| Referências A da planilha × app | Resíduo numérico máximo de cerca de 0,0072 m. Isso é coincidência das representações, não precisão de GPS. |
| Rumo declarado × azimute geodésico A/B | 26 dos 27 grupos dentro do limiar diagnóstico de 0,05°; Pivô-6 exige revisão. |

O PDF tem elementos vetoriais antigos fora da área visível de algumas fichas.
Extrair texto integral ingenuamente mistura outros lotes/áreas. A leitura foi
feita com bounding boxes do texto visível e exigiu uma ficha/área por lote;
os 51 resultados foram cruzados com os identificadores atuais.

Guia, KML e app compartilham parte da mesma origem histórica. Concordância entre
arquivos derivados confirma consistência numérica, não um levantamento de campo
independente ou acurácia absoluta dos limites.

### Área oficial, geodésica e UTM

São grandezas com funções diferentes. O guia informa área oficial da safra e
área geométrica geodésica do KML; a auditoria anterior também calculava área
plana em UTM. No BB1, por exemplo, os valores são aproximadamente 500,46 ha
oficiais, 497,40 ha geodésicos e 497,15 ha na projeção UTM. Essa diferença entre
cálculos geométricos não justifica corrigir a área oficial ou os mínimos.

A união de polígonos sobrepostos foi usada apenas em cópias de diagnóstico,
para comparar áreas/contornos sem contar a mesma área duas vezes. Não regravamos
o KML ou a base do app.

## Pendências preservadas

1. **Época/origem:** a planilha declara safra 25/26. O KML se apresenta para
   2026/27, mas declara origem “Base 2024/25”; o guia também ressalva a base
   histórica. Não há comprovação de levantamento novo de limites em 26/27.
2. **Datum da planilha:** não foi encontrado nos cabeçalhos/notas das abas alvo.
   Para a conferência numérica foi interpretada como longitude/latitude decimal
   em EPSG:4326, consistente com o app e com o padrão KML. Isso não identifica
   formalmente o datum de origem; a confirmação continua necessária.
3. **Pivô-6:** rumo informado 120,3983°, enquanto o A/B resulta em aproximadamente
   239,5981° verdadeiros. Mesmo tratando reta como eixo sem sentido (módulo 180°),
   resta diferença de **60,8002°**. O par mede cerca de 3,05 m. Não escolher
   automaticamente um dos valores nem corrigir coordenadas por hipótese.
4. **Referências curtas:** 16 grupos têm A/B menor que 50 m. É um sinal de revisão
   conforme critério diagnóstico já usado no projeto, não prova de erro. O A/B
   pode ter sido construído como vetor de direção; não presumir levantamento longo.
5. **Topologia:** BD3, BD4, RB8 e RC8 têm sobreposição/repetição na coleção de
   origem. Os anéis individuais são válidos; a coleção exige tratamento de origem.
6. **Contornos:** 42 lotes diferem do app acima de 5 cm no diagnóstico de
   Hausdorff, com máximo de aproximadamente 0,6225 m. A causa de representação/
   simplificação não foi comprovada. Não é homologação de acurácia nem motivo
   para substituir limites automaticamente.
7. **Áreas da planilha:** há divergências em relação ao guia, incluindo todos os
   sete pivôs, além de diferenças menores em grupos. A planilha e o guia têm
   épocas/conceitos a esclarecer; mantivemos as áreas oficiais atuais.
8. **Acesso:** um mesmo A/B ou rumo não confirma ausência de cerca, canal,
   estrada, obstáculo ou incompatibilidade de manejo entre membros.

Não exigir que um A compartilhado esteja dentro de cada lote do grupo. No
BB1/BC1, A está no BB1 e fora do BC1, situação coerente com a referência comum.
Isso não valida o acesso ou o contorno, mas evita classificar a posição fora
de um membro como erro automático da referência do grupo.

## Piloto BB1/BC1 recalculado com as fontes

A linha 11 da aba Bananal identifica expressamente **BB1-BC1**. Seu A/B tem
699,464 m; azimute verdadeiro calculado 333,168530° contra 333,1691° informado,
diferença de 0,000570°. O azimute do mesmo vetor na grade UTM é 332,968178°.
Não comparar azimute UTM diretamente com rumo verdadeiro como se fossem iguais.

O piloto agora usa:

- Contornos do KML anexado em ambos os quadros, mantendo os lotes separados.
- Grades individuais atuais representadas nesses mesmos contornos no “antes”.
- Direção métrica do A/B projetado em uma única base no “depois”.
- Fase comum de ensaio tomada do BB1: 255,36 m (sete barras de 36,48 m), com
  espaçamento de 401,28 m (onze barras). A fase foi escolhida explicitamente;
  o rumo sozinho não determina qual grade ou passada é a operacional correta.
- 26 pontos no BB1 e 23 no BC1: **49 pontos, cinco eixos comuns e dez trechos**.
- Recuo de ensaio 50 m, sem reduzir requisito, alterar limites ou liberar passagem.

Os 49 pontos do candidato ficaram dentro de seus lotes, com distância mínima
à borda acima do requisito de ensaio. Os pontos do BB1 mudam no máximo cerca
de 0,021 m e os do BC1 até 36,525 m nesta projeção, sem mover qualquer ponto
salvo do aplicativo. O candidato possui IDs próprios e não recebe coletas antigas.

A planilha informa 951,27 ha para o grupo; a soma das áreas oficiais das duas
fichas é 951,25 ha. Não escolher o total do grupo para reduzir o mínimo:
arredondar somente a área agregada daria 48 pontos; por lote são 26 + 23 = 49.

Na grade fixa de diagnóstico de cobertura do BC1, P95 muda de cerca de
266,28 m para 267,13 m, enquanto o maior valor nos centros avaliados cai de
345,92 m para 324,96 m. Portanto, alinhamento não equivale automaticamente a
melhoria geral de cobertura. Não houve busca de melhor fase, roteamento,
distribuição da equipe ou ganho de tempo medido.

## Arquivos entregues localmente

Em `/workspace/entregas-schmidt/revalidacao-fontes-bb1-bc1/`:

- `BB1-BC1-projecao-AB-fontes.png` e `.pdf`: comparativo calculado, com A/B visível.
- `Revalidacao_Bananal_RJ_Fontes_2026.xlsx`: Resumo, Lotes51, Referencias27,
  Pendencias e Fontes, sem copiar coordenadas dos anexos para a tabela de revisão.
- `RESULTADO-DO-ENSAIO.json`: resultado numérico do piloto.

A planilha de revisão foi reaberta e conferida: 51 linhas de lotes, 27 de
referências, sem fórmulas. Dados detalhados/coordenadas permanecem em results/
ignorado; não foram enviados ao GitHub ou a qualquer serviço externo.

## Execução e testes

Passaram **14 testes sintéticos**: seis de regras de identificação/ângulos/
números e oito do piloto geométrico. A integração real confirmou correspondência
única dos 51 lotes no KML/PDF, membros da planilha, áreas e consistência do
piloto. Não são testes físicos de GPS, datum, máquinas ou acessos.

Reprodução em `audit/`, fornecendo os caminhos locais dos três anexos:

```sh
python extract-revalidation-sources.py --kml CAMINHO_KML --xlsx CAMINHO_XLSX --pdf CAMINHO_PDF
.venv/bin/python -m unittest source_reference_rules_test.py shared_grid_pilot_test.py
.venv/bin/python revalidate-operational-sources.py
.venv/bin/python project-source-ab-pilot.py
python export-revalidation-workbook.py
MPLCONFIGDIR=/tmp/schmidt-matplotlib python plot-block-pilot.py --input results/revalidacao-2026/pilot-AB-projection-private.json --output /workspace/entregas-schmidt/revalidacao-fontes-bb1-bc1 --name BB1-BC1-projecao-AB-fontes
```

Extração usa openpyxl/pdftotext locais, cálculo usa o ambiente espacial já
documentado, desenho usa Matplotlib disponível no ambiente. Não foram adicionadas
dependências ao app. Anexos e arquivos originais são somente leitura.

## Próximo passo de implementação

Usar o catálogo normalizado de grupos como sugestão de referência, mantendo
seleção individual e subconjuntos possíveis. Toda proposta guarda hashes de
fontes, linha da planilha, época, interpretação de datum, direção e fase comuns.
Bloquear promoção operacional de referências contraditórias como P6 até revisão.
Para cruzar grupos com A/B diferentes, exigir uma referência comum escolhida e
comparada, sem tirar média ingênua de rumos.

Em seguida, validar acesso e calcular percursos/equipe sob as mesmas condições
do conjunto feito individualmente. Só depois decidir sobre integração visual,
backup/persistência e disponibilização controlada, conforme os marcos B1–B6 da
arquitetura. A revalidação e a nova imagem não alteram o mapa publicado.
