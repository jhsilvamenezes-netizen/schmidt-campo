# 2.4.0 — celular primeiro

Uso principal: celular. Cada mudança foi pensada como quem usa o link no campo.
Escopo mantido: só planejamento e direcionamento; método linear, barra de 36,48 m, P6, 51 lotes, 40 blocos,
Plano padrão e Satélite opcional.

## 1. Mapa ao planejar (390 px)

| Medida | 2.3 | 2.4 |
|---|---:|---:|
| Mapa visível em Planejar e Tiros | 162 px (19%) | 220 px (26%) |
| Tamanho do lote nesse mapa | 108 × 116 px | 151 × 162 px |
| Distâncias do Plano sem rolar (360 a 412 px) | sim | sim (regra aprovada mantida) |

Como:
- folha meia-altura mais baixa;
- moldura enxuta: abas, linha Ampliar e etapas mais baixas, sem os títulos das etapas;
- Fazenda/Lote sem rótulo visível (o leitor de tela continua lendo);
- escala curta e sem caixa no mapa baixo.

## 2. Menos texto

| Onde | Saiu ou mudou |
|---|---|
| Mapa (todas as telas) | Faixa "Simulação · limites e tiros não conferidos" saiu. O aviso de limites não homologados segue em Dados. |
| Cartão do início | Saíram "(desenho …)" e "N pontos · N tiros" (a barra de baixo já mostra). |
| Selo de dados | "Base histórica" virou "Sem alertas". |
| Plano | Agora "Área: …" e "Mínimo: …". Saíram "Define o mínimo" e as legendas que repetiam o esquema. |
| Diagnóstico | Saíram a linha repetida do resumo, "Nenhuma mancha" e "Nada a corrigir" (o resumo verde já diz). |
| Ajuste fino | "Padrão: X" some quando o campo já mostra X. Título de calibração vazio some. |
| Conferência | Saiu "Envie na etapa Arquivos" (o botão Enviar está na própria etapa). |
| Tiros, Dados, Auditoria | Saíram títulos repetidos. Notas dos dados ficaram em uma linha cada. |

Altura das etapas (folha ampliada, 390 px):

| Etapa | Antes | Depois |
|---|---:|---:|
| Diagnóstico | 1.027 px | 787 px |
| Ajuste fino | 1.444 px | 1.185 px |
| Conferência | 1.471 px | 1.387 px |
| Arquivos | 1.744 px | 1.699 px |

## 3. Código e motor

| Item | Antes | Depois |
|---|---|---|
| Desenhos do mapa ao abrir Tiros | 7 | 1 (desenho idêntico não troca a tela) |
| Motor no arquivo | 2 cópias (página e worker) | 1 cópia, lida pelo worker |
| Tamanho do link | 909 KB (297 KB comprimido) | 850 KB (278 KB comprimido) |
| Resultado do worker | — | idêntico (51 lotes; 9 otimizações e 9 recomendações) |

## 4. Guardas

- Os testes de imagem aceitam só as áreas aprovadas da 2.4. No celular fica protegido o cabeçalho; no tablet e no
  desktop, tudo fora das áreas declaradas.
- A regra "distâncias do Plano visíveis sem rolar" continua testada em 360, 390 e 412 px.

## 5. Pendente

- Unidade D: tirar do arquivo as partes do motor antigo que ainda restam (validação de parâmetros, qualidade dos
  dados, recomendação e rota).
- Resposta ao abrir Tiros: cerca de 300 ms no celular lento (o restante é a montagem da lista).
