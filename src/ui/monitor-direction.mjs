// 2.0 web: no monitor, o direcionamento vem antes da marcação de coleta (a equipe não marca coleta).
// "Ligar GPS" passa a ser o primeiro botão e o destacado enquanto o GPS está desligado; "Ponto coletado"
// continua igual e funcionando, só sem o destaque. Nenhum evento, texto ou gravação é alterado.
export function installSchmidtMonitorDirection({ document }) {
  const gps = document.getElementById('gps-toggle');
  const collect = document.getElementById('mon-collect');
  if (!gps || !collect || gps.dataset.schmidtDirection) return false;
  gps.dataset.schmidtDirection = '1';
  collect.classList.remove('primary');
  if (collect.parentNode === gps.parentNode) collect.parentNode.insertBefore(gps, collect);
  // Destaque só enquanto desligado: ligado, o botão vira "Desligar GPS" e não deve chamar atenção.
  const sync = () => gps.classList.toggle('primary', !/Desligar/.test(gps.textContent || ''));
  sync();
  new document.defaultView.MutationObserver(sync).observe(gps, { childList: true, characterData: true, subtree: true });
  return true;
}
