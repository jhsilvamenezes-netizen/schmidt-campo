// 1.34: acabamento do mapa de cada lote, aplicado DEPOIS de cada desenho (evento "mapa:desenhado").
// O desenho em si continua no artefato de referência; aqui só se corrige rótulo que caiu em cima de ponto.
// Medido na 1.33.0 (celular 390 px): em 56 de 208 tiros o rótulo "Entrada" ficava coberto pelo 1º ponto.
export function installSchmidtLotMap({ document, events }) {
  const map = document.getElementById('map');
  if (!map || !events?.on) return false;
  const style = document.createElement('style');
  style.textContent = '#map .m-gap.schmidt-hidden-label{display:none}';
  document.head.append(style);

  const overlaps = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  // Maior círculo de cada ponto visível (o anel do próximo ponto conta); pontos de outros tiros são marcas pequenas.
  const pointBoxes = () => [...map.querySelectorAll('.m-pt')].map(g => [...g.querySelectorAll('circle:not(.m-pt-hit)')]
    .map(c => c.getBoundingClientRect()).sort((a, b) => b.width - a.width)[0]).filter(Boolean);

  // Posições do rótulo em volta da seta de entrada, na ordem de preferência: abaixo (a original), acima,
  // à esquerda e à direita. Fica na primeira que não cobre ponto, não cobre distância e cabe no mapa.
  const ENTRY_SPOTS = [[0, 26, 'middle'], [0, -20, 'middle'], [-16, 5, 'end'], [16, 5, 'start'], [0, 44, 'middle']];
  function placeEntryLabels() {
    const labels = [...map.querySelectorAll('.m-entry text')];
    if (!labels.length) return 0;
    const bounds = map.getBoundingClientRect(), points = pointBoxes();
    const others = [...map.querySelectorAll('.m-gap')].map(t => t.getBoundingClientRect());
    let moved = 0;
    for (const label of labels) {
      for (const [x, y, anchor] of ENTRY_SPOTS) {
        label.setAttribute('x', x); label.setAttribute('y', y); label.style.textAnchor = anchor;
        const box = label.getBoundingClientRect();
        const inside = box.left >= bounds.left + 2 && box.right <= bounds.right - 2 && box.top >= bounds.top + 2 && box.bottom <= bounds.bottom - 2;
        if (inside && !points.some(p => overlaps(box, p)) && !others.some(o => overlaps(box, o))) { if (y !== 26 || x !== 0) moved++; break; }
        if (anchor === 'middle' && y === 44) { label.setAttribute('x', 0); label.setAttribute('y', 26); label.style.textAnchor = 'middle'; } // nada livre: volta ao original
      }
    }
    return moved;
  }
  // Distância escrita em cima de um ponto atrapalha mais do que ajuda: a faixa "Entre pontos" do guia já a mostra.
  function hideCoveredDistances() {
    const points = pointBoxes();
    let hidden = 0;
    for (const text of map.querySelectorAll('.m-gap.is-guia')) {
      const covered = points.some(p => overlaps(text.getBoundingClientRect(), p));
      text.classList.toggle('schmidt-hidden-label', covered);
      if (covered) hidden++;
    }
    return hidden;
  }
  const refine = () => { map.dataset.entryMoved = String(placeEntryLabels()); map.dataset.gapHidden = String(hideCoveredDistances()); };
  events.on('mapa:desenhado', refine);
  refine();
  return true;
}
