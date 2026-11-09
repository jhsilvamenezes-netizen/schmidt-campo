# Proposta de blocos e bordas para avaliação visual

09/11/2026. O proprietário pediu aprofundar o estudo, reduzir erros e apresentar
antes/depois em imagem **antes de decidir implantar**. Este trabalho é local:
não autoriza nem implementa a nova interface, o modo bloco ou publicação.

## Imagens entregues

- Comparação principal: `/workspace/generated_images/exec-67128d2e-ebbe-4fe0-afb6-4dfa9525fd3d.png`.
- Configuração e conflito de borda: `/workspace/generated_images/exec-dc392ad0-fd28-4505-a23a-acc03c9bd049.png`.
- Captura original real BB1: `audit/results/block-projection/original-BB1.png`.
- Captura da candidata local BB1: `audit/results/block-projection/candidate-BB1.png`.

As pranchas são montagens ilustrativas produzidas a partir das referências;
não são capturas de uma funcionalidade implementada nem prova de igualdade
de pixels. A captura original foi feita contra os bytes do baseline publicado
`a1ad502c`, em Chromium, viewport 390 × 844, lote BB1, com perfil descartável.
O original e a candidata exibiram cinco tiros e 26 pontos no mesmo estado.
A candidata mostrou 401 m entre tiros e 417 a 501 m entre pontos; esses números
não foram reutilizados na projeção do bloco, pois seu plano não foi calculado.
As imagens detalhadas e dados continuam locais, sem upload ao repositório.

## Proposta visual delimitada

Na etapa Plano, opção **Lote único / Bloco**, seleção única dos lotes do bloco,
densidade e equipe, base de pontos por lote, distâncias efetivas em destaque.
Até haver cálculo conjunto válido, as distâncias do bloco mostram **A calcular**.
Os 49 pontos são a soma dos planos individuais atuais, não uma solução conjunta
já validada, nem a promessa de que nenhuma amostra adicional será necessária.

Uma única linha **Bordas e acesso** agrega as pendências; não duplicar o mesmo
aviso em outra faixa. O número duas na prancha significa as categorias borda e
acesso daquele estado ilustrativo, não um contador fixo de erros. A confirmação
de compatibilidade da operação integra a revisão de acesso/operação, sem
presumir que a mesma variedade histórica basta. Ajustes comuns ficam recolhidos.
O bloco de pulverizador fica secundário, com referência 36,48 m, sem converter
18,24 m em recuo automático dos pontos.

O detalhe de bordas permite informar o recuo mínimo ponto–divisa; considera
limites internos e furos. Se houver conflito, mostra sua quantidade e lotes
afetados e oferece rever configuração. A prévia usa 50 m somente como ensaio.
Oito pontos individuais atuais conflitam, quatro em cada lote; os pontos
permanecem armazenados e o requisito não é reduzido escondido. Isso não é
avaliação de um plano conjunto gerado.

Mapas, demais etapas, paleta, fonte de sistema, navegação e registro de coletas
não integram uma proposta de redesenho. A prancha amplia o painel à direita
para facilitar sua avaliação; dimensões e encaixe real em 360/390/412/768 px
precisam de ensaio no protótipo aprovado. Não há novo fluxo implementado.

## Engenharia refinada e executada fora do app

`audit/block_constraints.py` é um validador isolado que recebe os pontos locais
de cada lote, seus mínimos e um recuo explicitamente definido. Nenhuma rotina
de produção o importa. Ele:

- Verifica cada lote na origem correta e recusa entradas inválidas, não finitas,
  anéis abertos e identidades de pontos duplicadas dentro do mesmo lote.
- Preserva a divisa interna e verifica furos. Ponto externo continua inválido,
  inclusive quando o recuo informado é zero.
- Confere o mínimo por lote, sem compensar falta em um pela sobra em outro.
- Não reduz um recuo inviável, não move pontos e não muda os dados originais.
- Distingue modo direcionado de uniforme; não declara cobertura uniforme só
  porque contagem e recuo passaram.
- Mantém acesso, operação compatível e recuo indefinido como pendências.
  Sobreposição exige revisão; proximidade geométrica não cria acesso.
- Retorna apenas o estado do snapshot. Mesmo `snapshot-valid` não afirma
  geração de rota, validação de passagem, homologação ou economia de tempo.

A tolerância explícita é 0,000001 m apenas na comparação numérica do recuo;
não representa precisão do mapa ou GPS e não torna ponto externo válido.
Não foi criado buffer para cobrir a separação entre BB1 e BC1. Não foram
alterados geometrias, áreas oficiais, regras antigas ou registros salvos.

## Evidência executada

- **28 testes sintéticos passaram**: 11 geométricos e 17 do validador. Incluem
  origens locais distintas, contato pontual, sobreposição, furos, ponto externo,
  limite de recuo inviável, edição de ponto, mínimo por lote, entradas inválidas,
  modo direcionado e confirmações explícitas.
- Rechecados **51 lotes e 749 pontos** do probe correspondente ao hash atual,
  nenhum ponto fora de seu polígono, todos os mínimos atuais atendidos.
- Nos pontos individuais BB1/BC1, ensaios de 20, 30 e 40 m não apresentam
  conflito de recuo. Com 50 m, há oito conflitos. Esses valores não recomendam
  um recuo de campo e não verificam cobertura uniforme ou rota conjunta.
- Capturas original/candidata realizadas sem erros de página e sem modificar
  o runtime. Os cinco casos da política antiga já reproduzidos no navegador
  permanecem documentados em `ESTUDO_BLOCOS_E_BORDAS.md`.

Reprodução, a partir de `audit/`:

```sh
.venv/bin/python -m unittest block_geometry_test.py block_constraints_test.py
npm run probe:spatial
.venv/bin/python block-safety-study.py
node block-projection-reference.mjs
```

## Plano para implementar depois da decisão

1. Confirmar amostragem versus aplicação, recuo por operação e passagem física.
   O estudo prioriza amostragem; não simula envelope de aplicação/deriva.
2. Construir o gerador isolado de bloco em referencial comum, rumo e fase de
   grade compartilhados, mantendo recorte por lote, furos e mínimos individuais.
   Revalidar após otimização, deslocamento, edição e importação. Não aceitar
   rota externa por proximidade nem declarar válida uma solução fragmentada.
3. Comparar planos individuais e conjunto em cobertura, distâncias reais,
   comprimento caminhado dentro/fora dos lotes e transferências permitidas.
   Se nenhuma solução cumprir as regras, informar conflito. Sem ganho presumido.
4. Somente com aprovação visual, integrar o painel aprovado na branch. Guardar
   bloco como entidade própria, referenciando lotes e pontos por lote, sem
   sobrescrever planos legados. Especificar versão de schema e restore antes de
   persistir; usar as barreiras de escrita/backup existentes.
5. Ensaiar snapshots de backup/restore com bloco, coexistência de planos,
   exportações identificadas por lote, concorrência, offline e regressão visual
   das telas protegidas. Validar navegação e campo com a equipe.

Nenhuma aprovação é presumida pela apresentação das imagens. O site, o APK,
o runtime candidato e os dados atuais permanecem preservados neste estudo.
