// 1.32: acabamento geral que vale para todas as telas. Só estilo; nenhum cálculo, dado ou fluxo.
// As regras antigas ficam em camadas (@layer); regra normal fora de camada vence regra normal de camada.
// Onde a regra antiga é !important, a correção vai na camada "tokens" (entre !important vence a primeira camada).
export function installSchmidtRefinements(document) {
  if (document.getElementById('schmidt-refinements')) return false;
  const style = document.createElement('style');
  style.id = 'schmidt-refinements';
  style.textContent = `
    /* Controles deslizantes e "Voltar ao rumo da planilha": alvo de toque de 44 px (eram 36 e 40) */
    input[type=range]{min-height:var(--sx-touch)}
    @layer tokens{#bearing-reset{min-height:44px!important}}
    /* 2.4 (celular até 599 px): o mapa é o resultado do planejamento e ficava com 19% da tela atrás da folha.
       Folha meia-altura mais baixa (Ampliar continua levando à altura cheia) e Fazenda/Lote sem o rótulo visível
       (o seletor já mostra "Bananal"/"BD3"; o rótulo segue para leitor de tela). */
    @media (max-width:599px){
      .mobile-context label{font-size:0;gap:0;line-height:0}
      /* subtítulo da marca com 9 px: ilegível ao sol; o logotipo basta no celular */
      .brand-subtitle{display:none}
      /* Moldura da folha mais enxuta (abas 61→50, linha Ampliar 53→46, etapas 61→52, sem os títulos das etapas,
         que repetem a etapa marcada): cabe mapa maior e as distâncias do Plano seguem visíveis sem rolar (regra aprovada). */
      .sheet:not([data-state=collapsed]) .v08-dock{height:50px}
      .v08-panel-actions{min-height:46px;padding:1px 8px}
      #panel-plano .param-sections{padding-top:4px;padding-bottom:4px}
      /* títulos das etapas repetem o nome da etapa marcada logo acima */
      #panel-plano .stage-intro{display:none}
      .sheet[data-state=half]{height:min(60dvh,520px)}
      /* mapa compacto (folha aberta): escala sem caixa, para não esconder o primeiro tiro */
      .map-wrap.fx-fit .m-scale-bg{fill-opacity:0;stroke:none}
    }
    /* 2.3: tablet (600–999 px) também mostra a legenda do mapa; antes só o notebook. Monitor, mapa em tela cheia
       e mapa do bloco continuam sem ela. */
    @media (min-width:600px) and (max-width:999px){
      body:not(.mode-monitor):not(.map-theater) .map-area:not(.schmidt-joint-map)>.legend{display:flex}
    }
  `;
  document.head.append(style);
  // 2.5: o botão de ferramentas do mapa era o caractere "☷", que alguns Android desenham como quadrado vazio.
  // Vira um ícone desenhado (mesmo traço dos ícones das abas); o nome acessível continua o mesmo.
  const tools = document.getElementById('geo-tools-toggle');
  if (tools && tools.textContent.trim() === '☷') {
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: '22', height: '22', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'aria-hidden': 'true' })) svg.setAttribute(k, v);
    for (const d of ['M4 7h10', 'M18 7h2', 'M4 17h2', 'M10 17h10']) { const path = document.createElementNS(NS, 'path'); path.setAttribute('d', d); svg.append(path); }
    for (const [cx, cy] of [[16, 7], [8, 17]]) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', String(cx)); c.setAttribute('cy', String(cy)); c.setAttribute('r', '2'); svg.append(c); }
    tools.replaceChildren(svg);
  }
  return true;
}
