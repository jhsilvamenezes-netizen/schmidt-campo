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
      .sheet[data-state=half]{height:min(50dvh,460px)}
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
  return true;
}
