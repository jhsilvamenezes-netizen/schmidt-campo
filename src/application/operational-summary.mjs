// Somente apresentação: o cenário ativo e as medidas vêm do motor existente.
export const SCHMIDT_BOOM_WIDTH_M = 36.48;
export function readOperationalSummary(sc, peopleValue, measurements) {
  if (!sc || !Array.isArray(sc.selected) || !Array.isArray(sc.samples)) return null;
  const tracks = sc.selected.length;
  const points = sc.samples.length;
  const mode = sc.params?.trackMode;
  const unit = mode === 'circular' ? 'anel' : mode === 'importado' ? 'trajeto' : 'tiro';
  const units = mode === 'circular' ? 'anéis' : unit+'s';
  const people = /^\d+$/.test(String(peopleValue).trim()) ? Number(peopleValue) : null;
  const mesh = measurements.malhaDoPlano(sc);
  return {
    boomNeedsReview: !!sc.params?.alignToBoom && mode !== 'importado' && typeof sc.params?.boomWidthM === 'number' && Number.isFinite(sc.params.boomWidthM) && Math.abs(sc.params.boomWidthM - SCHMIDT_BOOM_WIDTH_M) > 1e-9,
    tracks, points, minimum: sc.minPoints, people,
    counts: `${tracks} ${tracks === 1 ? unit : units} · ${points} ${points === 1 ? 'ponto' : 'pontos'}`,
    acrossLabel: `Entre ${units}`,
    alongHint: `Ao longo do mesmo ${unit}`,
    across: tracks === 0 ? '—' : tracks > 1 ? (mesh.entreTiros ? measurements.faixa(mesh.entreTiros) : '—') : `${unit === 'anel' ? 'Anel' : unit === 'trajeto' ? 'Trajeto' : 'Tiro'} único`,
    // Sem intervalo ao longo de nenhum tiro (um ponto em cada): o cartão diz isso em vez de ficar vazio.
    along: points === 0 ? '—' : points > 1 ? (mesh.entrePontos ? measurements.faixa(mesh.entrePontos) : `Um em cada ${unit}`) : 'Ponto único',
    crew: people > 0 && people <= 20 && people !== tracks
      ? `Equipe: ${people} ${people === 1 ? 'pessoa' : 'pessoas'} para ${tracks} ${tracks === 1 ? unit : units}. Planeje o percurso em Tiros.` : '',
  };
}
