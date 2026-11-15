// 3.0 · gestos do mapa: arrastar, pinça, duplo toque e roda do mouse. Mantém { k, x, y } (escala e deslocamento em
// pixels da tela) e chama onChange; toque curto sem arrastar vira onTap(alvo). Sem dependências.
export function attachGestures(el, { onChange, onTap, getView, setView }) {
  const pts = new Map();
  /** @type {any} */ let start = null;
  let moved = false, lastTap = 0;
  /** @type {any} */ let downTarget = null;
  const local = e => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const zoomAt = (/** @type {number[]} */ [px, py], /** @type {number} */ f) => { const v = getView(), k = Math.max(1, Math.min(12, v.k * f)), g = k / v.k; setView({ k, x: px - (px - v.x) * g, y: py - (py - v.y) * g }); onChange(); };
  el.addEventListener('pointerdown', e => {
    if (/** @type {Element} */ (e.target).closest?.('button')) return;
    if (!pts.size) downTarget = e.target;
    el.setPointerCapture?.(e.pointerId); pts.set(e.pointerId, local(e)); moved = false;
    start = { view: { ...getView() }, pts: new Map([...pts].map(([k, v]) => [k, [...v]])) };
  });
  el.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, local(e));
    const s = start, cur = [...pts.values()], ini = [...s.pts.values()];
    if (cur.length === 1 && ini.length === 1) {
      const dx = cur[0][0] - ini[0][0], dy = cur[0][1] - ini[0][1];
      if (!moved && Math.hypot(dx, dy) < 6) return;
      moved = true; setView({ k: s.view.k, x: s.view.x + dx, y: s.view.y + dy }); onChange();
    } else if (cur.length >= 2 && ini.length >= 2) {
      moved = true;
      const d0 = Math.hypot(ini[0][0] - ini[1][0], ini[0][1] - ini[1][1]) || 1, d1 = Math.hypot(cur[0][0] - cur[1][0], cur[0][1] - cur[1][1]);
      const c0 = [(ini[0][0] + ini[1][0]) / 2, (ini[0][1] + ini[1][1]) / 2], c1 = [(cur[0][0] + cur[1][0]) / 2, (cur[0][1] + cur[1][1]) / 2];
      const k = Math.max(1, Math.min(12, s.view.k * (d1 / d0))), g = k / s.view.k;
      setView({ k, x: c1[0] - (c0[0] - s.view.x) * g, y: c1[1] - (c0[1] - s.view.y) * g }); onChange();
    }
  });
  const end = e => {
    if (!pts.has(e.pointerId)) return;
    const at = pts.get(e.pointerId); pts.delete(e.pointerId);
    if (pts.size) { start = { view: { ...getView() }, pts: new Map([...pts].map(([k, v]) => [k, [...v]])) }; return; }
    if (!moved && e.type === 'pointerup') {
      const now = Date.now();
      if (now - lastTap < 300) { lastTap = 0; zoomAt(at, 2); return; }
      lastTap = now; onTap(downTarget || e.target, at);
    }
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', e => { e.preventDefault(); zoomAt(local(e), e.deltaY < 0 ? 1.25 : 0.8); }, { passive: false });
}
