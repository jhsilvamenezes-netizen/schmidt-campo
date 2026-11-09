# Organização operacional — estudo e projeção, sem implementação

09/11/2026. Diretriz do proprietário: **a didática já está clara**. O objetivo
é aproximar os controles e resultados necessários à atividade, recolhendo
informações menos frequentes sem esconder condições importantes. Preservar o
refinamento atual; não criar outro produto ou alterar método por preferência estética.

Interface permanece congelada. Este estudo não aprova alteração de HTML, CSS,
mapa, navegação ou cálculo. Projeção compartilhada na conversa é ilustrativa e
não é desenho georreferenciado. Seu escopo é o conteúdo do painel Plano; mapa,
menu e navegação são referências a preservar. Aprovação deve ser específica
antes de qualquer implementação, inclusive dos demais estados ainda sem projeção.

## Base efetivamente examinada

Capturas e controles do HTML original `a1ad502c`, viewport 390×844, Chromium
141.0.7390.37, perfil descartável, sem service worker. HTML/worker da candidata
foram conferidos por hash antes/depois e permanecem intactos.

O fluxo real tem cinco etapas: **Plano, Diagnóstico, Ajuste fino, Conferência,
Arquivos**. As seções legadas Tiros/Pontos/Qualidade não são três etapas extras:
são reunidas em Ajuste fino. O inventário usa a navegação renderizada e as APIs
existentes, não infere o layout a partir do HTML estático.

No primeiro Plano do exemplo, os controles Hectares por ponto e Pessoas em campo
ficam aproximadamente em y=1433 e y=1420, fora da visualização inicial de 844 px.
Antes deles aparecem ilustração, cobertura, caminhada, área por ponto e detalhes.
As explicações de distâncias e os controles já existem; o problema observado
é sua prioridade/posição, sem necessidade de reensinar os conceitos.

## Organização a avaliar nas projeções

| Informação | Papel na atividade | Critério de organização |
| --- | --- | --- |
| Lote e pendências de origem | Saber onde e com qual dado trabalhar | Contexto e alertas relevantes permanecem reconhecíveis. |
| Grid amostral / hectares por ponto | Definir a regra de quantidade | Controle próximo do número mínimo/resultante. Preservar a nomenclatura atual. |
| Pessoas em campo | Definir a capacidade e a distribuição do trabalho | Controle próximo da quantidade de tiros e da divisão de equipe. |
| Tiros, pontos e mínimo | Conferir o resultado do plano ativo | Resumo imediato ligado aos parâmetros utilizados. |
| Entre tiros / entre pontos | Orientar o trabalho e entender a malha | Exibir juntos, com eixos distintos e intervalo efetivo quando variável. |
| Desenho e explicação completos | Conferir o porquê do plano | Podem recolher mantendo acesso; preservar os pequenos sinais visuais necessários às distâncias. |
| Barra, margens, rumo manual e otimização | Ajustes de equipamento/lote ou exceções | Recolher apenas com resumo dos valores ativos e indicação de alteração/calibração pendente. |
| Erros de dados, cobertura insuficiente e conflito de equipe | Evitar decisão equivocada | Não esconder apenas por serem pouco frequentes. |

O critério não é "esconder tudo que muda pouco". Um parâmetro estável, mas não
conferido, continua relevante. Barra de 36,48 m e parâmetros do guia aparecem
como não calibrados no app; recolher não pode sugerir que foram homologados.
Uma configuração diferente do padrão deve continuar identificável no resumo.

A primeira projeção traz os dois controles antes do grande desenho, mantém
5 tiros / 24 pontos (mínimo 24), reúne as duas distâncias e sugere recolher o
desenho detalhado e os ajustes menos frequentes. Preserva as cinco etapas.
Não autoriza mudanças nas outras telas ou a adoção literal dos pixels gerados.

## Relação entre regras e números observados

Exemplo público já existente: BD3. Estes números não são nova homologação.

| Conceito | Valor observado | Interpretação |
| --- | ---: | --- |
| Área publicada | 469,90 ha | Base atual da regra de quantidade. Não é certificação de área oficial. |
| Área KML informada no cadastro | 466,79 ha | Metadado de origem mostrado na tela. |
| Área do polígono efetivamente usado | 466,826886 ha | Geometria usada no cálculo espacial; não substituir os dois valores anteriores. |
| Regra de 20 ha por ponto | mínimo 24 | `ceil(469,90 / 20)`. Não significa uma célula quadrada fixa no terreno. |
| Espaçamento lateral do plano | 437,76 m | Exibido como 438 m; 12 passadas de 36,48 m. |
| Espaçamento ao longo dos tiros | 438,19 a 515,06 m | Exibido como 438 a 515 m; varia com comprimento e alocação. |
| Caminhada dentro dos tiros | 10,824 km | Soma dos comprimentos internos utilizados nessa estimativa. |
| Transições estimadas | 1,850 km | Componente adicional entre tiros, sem homologar caminho transitável. |
| Total estimado do motor | 12,674 km | Soma dos dois componentes; exibido como 12,7 km. |

O Diagnóstico usa `sqrt(área publicada / pontos)` para a distância ideal: cerca
de 442,48 m nesse caso. Áreas de influência são calculadas no desenho e usam
outra base. A diferença é de referência/método; não foi tratada como erro de
aritmética nem corrigida. Uma organização coesa precisa deixar a origem de cada
medida verificável e usar a mesma definição nas telas que exibem a mesma métrica.

Assim, a caminhada por pessoa na Conferência e a caminhada agregada da
recomendação não devem ser interpretadas automaticamente como a mesma coisa.
Antes de mudar qualquer número/texto, definir inclusão de transições, entrada,
saída, deslocamento até o lote e esforço coletivo versus individual.

Foram exercitados 10, 20 e 40 ha/ponto **mantendo os tiros fixos**, isolando a
alocação: mínimos/resultados de 47, 24 e 12 pontos. Não simula toda a busca de
recomendação que pode alterar também a malha. Pela interface real, reduzir a
equipe a uma pessoa com a opção de limitar tiros ligada manteve 5 tiros e 24
pontos; o app orientou comparar uma alternativa. Logo, pessoas não podem ser
apresentadas como garantia de quantidade de tiros ou redução da amostragem.

Separar conceitualmente duas decisões: qualidade/distribuição da amostragem e
logística da equipe. Uma pessoa pode precisar percorrer vários tiros; mudar a
equipe exige conferir a carga e as transições, sem prometer redução de pontos.

## Áreas, linhas e orientação

1. **Procedência:** distinguir área publicada, área informada pelo KML e área
   da geometria em uso, com safra e CRS. Geometria válida não prova limite oficial.
2. **Topologia:** conservar verificações de vazios, sobreposição, duplicação e
   componentes. Os seis alertas e as diferenças de origem continuam pendentes;
   não reparar/simplificar contornos automaticamente para obter um resultado melhor.
3. **Origem da linha:** distinguir referência pela planilha, pista GNSS de máquina,
   trajeto executado pela equipe e curva desenhada. Um rastro da equipe não comprova
   a pista do pulverizador; pivô não autoriza inventar trajetos circulares.
4. **Referência angular:** preservar a correção UTM existente. Na auditoria dos
   51 lotes, 238 grupos com dois ou mais pontos em 49 lotes foram coerentes com
   `rumo + correção de grade` até erro numérico de aproximadamente 5,7e-14°.
   Outros 73 grupos não permitiram inferir eixo por esse método. Comparação módulo
   180° verifica o eixo, não o sentido de caminhada.
5. **Oráculo independente:** PROJ conferiu a correção de grade dos 51 centros
   informados. Maior diferença observada: aproximadamente 0,0000766°. Não é erro
   de GPS medido, validação do rumo da lavoura ou precisão prometida em campo.
6. **Referências A/B:** conferir seu significado e a linha resultante. Uma origem
   A de uma referência pode ficar fora do lote; isso não torna automaticamente a
   linha inválida. Pontos de coleta e recortes têm outros critérios de inclusão.
7. **Uso real:** Norte da grade, Norte verdadeiro e bússola magnética precisam
   de interpretação consistente. Latência/precisão do GPS, bússola e rastro real
   ainda exigem ensaio no aparelho e no terreno; não ajustar por aparência do mapa.

## Coesão do estado e critérios antes de implementar

Resumo, mapa, distâncias por tiro, Conferência e arquivo exportado devem se referir
ao mesmo plano/assinatura e parâmetros. Preservar a distinção entre recomendação
em comparação e plano efetivamente em uso. Alterar a organização não pode aplicar
uma recomendação silenciosamente ou sobrescrever ajustes manuais existentes.

Ainda precisam de projeções próprias: configuração personalizada, equipe menor
que a quantidade de tiros, alerta espacial/origem, calibração pendente e guia
em campo. A imagem inicial não aprova implicitamente esses estados.

Depois de uma aprovação visual específica: implementar somente o escopo aprovado,
comparar cada tela com a referência e testar densidade/equipe, mínimo de pontos,
distâncias, seleção e reversão de rumo, geometria, persistência e exports.
Performance ou simplificação visual não justificam alterar regras operacionais.

## Reprodução e artefatos

```sh
npm --prefix audit run study:layout
audit/.venv/bin/python audit/orientation-study.py
```

Python usa as versões de `audit/requirements-spatial.txt`. O estudo do navegador
exige o commit original no Git, lê suas APIs reais, usa perfis descartáveis e
comprova preservação do HTML/worker da candidata. Dados detalhados, originais
capturados e projeções locais ficam em `audit/results/layout-study/` e na área
de imagens geradas da conversa; não são anexados a artifacts públicos.

Resumo sem coordenadas: `audit/layout-study-evidence-2026-11-09.json`.
Nenhuma tela, controle, regra, contorno, main, Pages ou APK foi alterado.
