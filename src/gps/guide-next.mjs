// 2.0 web (E4): próximo ponto do guia SEM marcação de coleta.
// Legado: "próximo" = primeiro ponto não marcado. Sem marcação (uso da 2.0: só direcionamento), o guia ficava
// preso no ponto 1 e, parado no ponto 2, mandava voltar ao 1. Aqui, enquanto NENHUM ponto do tiro foi marcado,
// o próximo é o primeiro ponto à frente da pessoa na ordem de caminhada, pela projeção da posição sobre a linha
// (com a mesma tolerância de chegada). Havendo qualquer marcação, vale a ordem marcada (legado intacto).
// Não grava nada e não marca execução.

// Projeção de um ponto numa polilinha: distância lateral e posição ao longo (s, metros desde o início).
export function schmidtProjectOnLine(line, xy) {
  let best = null, acc = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy, len = Math.sqrt(len2);
    const t = len2 ? Math.max(0, Math.min(1, ((xy[0] - a[0]) * dx + (xy[1] - a[1]) * dy) / len2)) : 0;
    const dist = Math.hypot(xy[0] - a[0] - t * dx, xy[1] - a[1] - t * dy);
    if (!best || dist < best.dist) best = { dist, s: acc + t * len };
    acc += len;
  }
  return best;
}

export function schmidtGuideNextPoint(route, pos, collected, params) {
  const points = route?.points || [];
  const pending = points.filter(p => !collected?.has(p.id));
  const legacy = pending[0];
  if (!legacy || pending.length !== points.length) return legacy;
  if (!Number.isFinite(pos?.x) || !Number.isFinite(pos?.y)) return legacy;
  let here = null;
  (route.parts || []).forEach((part, index) => {
    if (!Array.isArray(part?.line) || part.line.length < 2) return;
    const p = schmidtProjectOnLine(part.line, [pos.x, pos.y]);
    if (p && (!here || p.dist < here.dist)) here = { index, ...p };
  });
  if (!here) return legacy;
  const radius = Number.isFinite(params?.arrivalRadiusM) ? params.arrivalRadiusM : 10;
  const ahead = pending.find(p => Number.isInteger(p.partIndex) && Number.isFinite(p.fromEntryM)
    && (p.partIndex > here.index || (p.partIndex === here.index && p.fromEntryM >= here.s - radius)));
  return ahead ?? pending[pending.length - 1];
}
