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
  `;
  document.head.append(style);
  return true;
}
