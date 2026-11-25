# Repositório de ideias: SCHMIDT Campo

Tudo o que já pensamos, guardado num lugar só. Nada daqui entra no app sem a decisão do proprietário, uma prévia
aprovada e uma medida que prove o ganho.

**Escopo de hoje:** planejar a amostragem e guiar a equipe no campo.
**Visão de longo prazo (proprietário, 25/11):** ser a ferramenta oficial da fazenda para monitoramento e qualidade das
operações agrícolas.

Situação de cada ideia: **feito**, **aprovado** (vai entrar), **prévia** (imagem pronta, esperando decisão),
**ideia** (guardada) ou **descartado** (com o motivo).

---

## 1. Ideias para a ferramenta atual (amostragem e guia)
| Código | Ideia | Situação |
|---|---|---|
| P1+P2 | Aba Lotes: sem o cartão repetido; lista em tabela | **descartado**: a equipe validou e gosta da estrutura atual (25/11) |
| P3 | Aba Plano em 3 blocos (Resultado, Regra e Detalhes) | **descartado**: estrutura atual validada pela equipe; refinar dentro dela (25/11) |
| P4 | Textos cortados ou quebrados ("Plano conferido · Todos os tir…", "95% do lote" em 2 linhas a 360 px) | aprovado: refinamento |
| N1 | "Ponto inacessível": sugere o lugar válido mais perto no mesmo tiro (bordadura e espaçamento), com motivo opcional | prévia |
| N2 / M2 | Tempo estimado da equipe e o número de pessoas que basta para um prazo (velocidades "a confirmar" até medir em campo) | prévia |
| N3 | "Relatar problema": texto pronto (versão, lote, tela, o que houve; sem localização) para o WhatsApp | prévia |
| N4 | Guia econômica: com a tela apagada, só voz e vibração | ideia |
| N5 | Aviso de GPS ruim (> 15 m) antes de iniciar a guia | prévia |
| M3 | Calibrar o filtro de Kalman com o tremor real do campo | ideia |
| M4 | Modo noite (vermelho escuro) | **descartado**: destoa da identidade visual firmada (25/11) |
| M5 | "Próximo tiro a 250 m, à esquerda" quando a pessoa está entre os tiros | prévia |
| Z1 | **Zonas de vigor (Sentinel-2, NDVI de várias safras) como visão opcional no mapa.** Não muda pontos. Ver a seção 3 | ideia: validar antes |
| — | Densidade de pontos pelo semivariograma (laudos antigos com coordenada) | ideia: depende de laudos |
| — | Filtro de Kalman no GPS | **feito** (4.6.0) |
| — | Mapa que segue e gira com o rumo; pinça; setas no tiro; números de largura fixa | **feito** (4.1–4.5) |
| — | Marcar ponto coletado, cadastro de pessoas, resumo por pessoa, envio do arquivo de GPS, KML novo, drone | **descartado** (decisão do proprietário) |
| — | Cópia de segurança, versões, arquivos e fichas, qualidade do GPS, vitrine | **descartado** (saíram na 4.2) |

---

## 2. Visão de longo prazo: ferramenta oficial da fazenda
Módulos sonhados pelo proprietário. Cada um usa a mesma base que já existe: lotes, mapa, GPS com filtro, guia, sem
internet e tela de campo.

| Módulo | O que registraria | O que reaproveita do app atual | O que precisaria de novo |
|---|---|---|---|
| **Pragas e doenças** | Ponto de monitoramento, praga ou doença, nível (por planta ou metro), foto, nível de ação | Plano de pontos, guia por GPS, mapa | Catálogo de pragas e doenças da fazenda; níveis de controle definidos pelo agrônomo; registro no campo (hoje o app **não** registra) |
| **Stand** | Plantas por metro, falhas e duplas, população final versus meta | Pontos espalhados por lote, guia | Contagem no campo; meta por cultivar (os dados da safra já trazem sementes/ha e meta) |
| **Qualidade de plantio** | Profundidade da semente, espaçamento, falhas, velocidade da plantadeira | Mesmo esquema de pontos | Fichas de avaliação por operação |
| **Preparo do solo** | Profundidade da grade e do subsolador, uniformidade | Pontos e guia | Medida de profundidade por ponto; limites por operação |
| **Distribuição de corretivos e adubos** | Uniformidade da aplicação de calcário (pó) e granulado (KCl etc.): teste de bandejas, coeficiente de variação, faixa efetiva | Mapa dos tiros (a barra de 36,48 m já é a referência das passadas) | Protocolo de bandejas; cálculo do coeficiente de variação; registro por aplicador |
| **Painel da fazenda** | Visão por lote e por safra de tudo acima | Lotes e mapa | Registro e sincronização entre aparelhos; decisão sobre servidor |

**Ponto de virada técnico:** hoje o app só **planeja e guia**. Ele não **registra** nada no campo, por decisão do
proprietário. Todos os módulos acima precisam de registro. Quando chegar a hora, é a primeira decisão a tomar, porque
envolve:
1. onde os dados ficam (só no celular ou num servidor da fazenda);
2. quem vê o quê;
3. como juntar o que vários celulares coletaram.

**O que separa o app de uma plataforma como o Protector (25/11):** o celular monitora, a equipe **sincroniza**, os
dados **sobem para uma plataforma** e viram um **painel com os índices** (por lote, por praga e ao longo do tempo).
Para chegar lá é preciso agregar:
1. registro no campo;
2. sincronização entre aparelhos (que funcione sem sinal e envie depois);
3. um servidor da fazenda;
4. o painel.

É um projeto novo sobre a base atual, não um ajuste.

**Referência de mercado:** plataformas de monitoramento como o Protector (Syngenta Cropwise). Para superar, o
diferencial possível é ser feito sob medida para a fazenda: os lotes e rumos reais, a barra de 36,48 m como base,
funcionar sem internet no campo e ser rápido em celular simples. Funções e preços de plataformas de terceiros ficam
"a confirmar" até alguém conferir na fonte.

---

## 3. Zonas de vigor (Z1): como validar antes de decidir
- **O que é:** com as fotos do satélite Sentinel-2 (gratuito, desde 2017, a cada ~5 dias), calcular o NDVI de várias
  safras e achar as partes do lote que se repetem fortes, médias ou fracas.
- **Como entraria:** só como **camada opcional** no mapa ("Zonas de vigor"), ao lado de Satélite e Área. **Não muda
  pontos nem plano** (decisão de 25/11).
- **Validação (antes de pôr no app):**
  1. Gerar as zonas de 3 a 5 lotes que o proprietário conhece bem.
  2. O proprietário confere se as manchas batem com o que ele vê no campo (baixadas, solo pior, reboleiras).
  3. Medir se as zonas são estáveis entre safras (se cada ano dá um desenho diferente, a camada não serve).
  4. Só entra se a resposta for "sim, ajuda a enxergar o lote".
- **Depende de:** ok do proprietário para acessar o servidor público das imagens.

---

## Como usar este arquivo
- Toda ideia nova entra aqui primeiro, com a situação "ideia".
- Para sair do papel: prévia em imagem, aprovação do proprietário, medida e teste.
- Ideias descartadas ficam aqui com o motivo, para não voltarem sem necessidade.
