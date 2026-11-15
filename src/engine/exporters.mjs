// Motor 2 · arquivos de saída: CSV, GPX, KML, GeoJSON (RFC 7946) e CSV do piloto (reescrita do módulo exporters).
// Todo arquivo diz que é simulação: pontos planejados, linhas estimadas, nada de rastro GNSS.
import { localToLonLat } from './projection.mjs';
import { ringSignedArea } from './geometry.mjs';

const fixed = (v, d = 2) => (v == null || !Number.isFinite(v) ? '' : v.toFixed(d));
const comma = (v, d = 2) => fixed(v, d).replace('.', ',');
const cell = v => String(v ?? '').replace(/[;\r\n]+/g, ' ');
const xml = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const BOM = '﻿';
const sampleStatus = (/** @type {any} */ _sc) => 'simulado';
const unitStatus = u => (u.kind === 'trajeto_gps_equipe' ? 'trajeto_importado' : 'simulado');

/** Distância (sobre o trecho) de cada ponto ao anterior do mesmo trecho; o 1º de cada trecho fica null. */
export function previousGaps(samples) {
  const byUnit = new Map();
  for (const s of samples) if (!s.offTrack) { if (!byUnit.has(s.unitId)) byUnit.set(s.unitId, []); byUnit.get(s.unitId).push(s); }
  const out = new Map();
  for (const list of byUnit.values()) { list.sort((a, b) => a.s - b.s); list.forEach((s, i) => out.set(s.id, i ? s.s - list[i - 1].s : null)); }
  return out;
}

export function toCSV(sc, field) {
  const gaps = previousGaps(sc.samples), rows = ['status;fazenda;lote;ponto;tiro_id;trecho_id;latitude;longitude;utm_e_m;utm_n_m;distancia_desde_inicio_m;distancia_desde_inicio_trecho_m;intervalo_ao_anterior_m;tipo_trajeto;confianca;fora_da_pista;ajuste_manual;politica_margem;fonte_geometria;versao_motor;gerado_em'];
  for (const s of sc.samples) {
    const [lon, lat] = localToLonLat(s.x, s.y, field.centroidUTM);
    rows.push([sampleStatus(sc), cell(field.farm), cell(field.code), s.number, cell(s.trackId), s.offTrack ? '' : cell(s.unitId), comma(lat, 7), comma(lon, 7),
      comma(field.centroidUTM[0] + s.x), comma(field.centroidUTM[1] + s.y), s.offTrack ? '' : comma(s.sTrack, 1), s.offTrack ? '' : comma(s.s, 1),
      comma(gaps.get(s.id) ?? null, 1), s.kind, s.confidence, s.offTrack ? 'sim' : 'nao', s.manual ? 'sim' : 'nao', sc.params.edgePolicy,
      'KML_2024_25_historico', sc.engineVersion, sc.generatedAt].join(';'));
  }
  return BOM + rows.join('\r\n') + '\r\n';
}

const lonLat = (field, xy) => localToLonLat(xy[0], xy[1], field.centroidUTM).map(v => v.toFixed(7));
const pointDesc = (route, p) => (p.fromEntryM === null ? `${route.trackId} · fora da linha · SIMULADO`
  : `${route.trackId} · ${Math.round(p.fromEntryM)} m da entrada · +${Math.round(p.deltaM)} m (≈ ${p.steps} passos) · SIMULADO`);

/** GPX 1.1 com pontos (wpt) e linhas estimadas (trk) das rotas. `appVersion` vai no campo creator. */
export function toGPX(routes, field, sc, appVersion) {
  const out = ['<?xml version="1.0" encoding="UTF-8"?>',
    `<gpx version="1.1" creator="SCHMIDT Monitoramento Espacial ${xml(appVersion)} (SIMULACAO)" xmlns="http://www.topografix.com/GPX/1/1">`,
    `<metadata><name>${xml(`${field.code} · ${routes.map(r => r.trackId).join(', ')} · simulado`)}</name>`,
    `<desc>${xml(`${sc.status}. Pontos planejados, não coletados. Motor ${sc.engineVersion}.`)}</desc><time>${sc.generatedAt}</time></metadata>`];
  for (const r of routes) for (const p of r.points) {
    const [lon, lat] = lonLat(field, [p.x, p.y]);
    out.push(`<wpt lat="${lat}" lon="${lon}"><name>${xml(`${r.trackId}-P${p.number}`)}</name><desc>${xml(pointDesc(r, p))}</desc><sym>Flag, Blue</sym><type>ponto_simulado</type></wpt>`);
  }
  for (const r of routes) {
    out.push(`<trk><name>${xml(r.trackId)}</name><desc>${xml(`${Math.round(r.totalLengthM)} m · linha estimada, não é rastro`)}</desc>`);
    for (const part of r.parts) out.push(`<trkseg>${part.line.map(xy => { const [lon, lat] = lonLat(field, xy); return `<trkpt lat="${lat}" lon="${lon}"/>`; }).join('')}</trkseg>`);
    out.push('</trk>');
  }
  out.push('</gpx>');
  return out.join('\n') + '\n';
}

export function toKML(routes, field, sc) {
  const coords = line => line.map(xy => lonLat(field, xy).join(',')).join(' ');
  const out = ['<?xml version="1.0" encoding="UTF-8"?>', '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>',
    `<name>${xml(`${field.code} · simulado`)}</name><description>${xml(`${sc.status}. Motor ${sc.engineVersion}, ${sc.generatedAt}.`)}</description>`,
    '<Style id="lote"><LineStyle><color>ff2f7553</color><width>2</width></LineStyle><PolyStyle><color>332f7553</color></PolyStyle></Style>',
    '<Style id="tiro"><LineStyle><color>ff866f0b</color><width>3</width></LineStyle></Style>'];
  for (const polygon of field.geom) {
    const rings = polygon.map((ring, i) => { const tag = i ? 'innerBoundaryIs' : 'outerBoundaryIs'; return `<${tag}><LinearRing><coordinates>${coords(ring)}</coordinates></LinearRing></${tag}>`; });
    out.push(`<Placemark><name>${xml(field.code)}</name><styleUrl>#lote</styleUrl><Polygon>${rings.join('')}</Polygon></Placemark>`);
  }
  for (const r of routes) {
    out.push(`<Folder><name>${xml(`Tiro ${r.trackId}`)}</name>`);
    for (const part of r.parts) out.push(`<Placemark><name>${xml(`${r.trackId} parte ${part.index + 1}`)}</name><styleUrl>#tiro</styleUrl><LineString><coordinates>${coords(part.line)}</coordinates></LineString></Placemark>`);
    for (const p of r.points) out.push(`<Placemark><name>${xml(`P${p.number}`)}</name><description>${xml(pointDesc(r, p))}</description><Point><coordinates>${lonLat(field, [p.x, p.y]).join(',')}</coordinates></Point></Placemark>`);
    out.push('</Folder>');
  }
  out.push('</Document></kml>');
  return out.join('\n') + '\n';
}

/** CSV do piloto: pontos marcados (ou não) pela equipe, em ordem de horário. */
export function pilotCSV(marks, meta) {
  const rows = ['fazenda;lote;tiro;monitor;ponto;horario;minutos_desde_anterior;planejado_lat;planejado_lon;marcado_lat;marcado_lon;distancia_planejado_marcado_m;precisao_gps_m;gps;distancia_desde_entrada_m;passos_estimados;passo_m;versao_motor'];
  const sorted = marks.slice().sort((a, b) => a.at.localeCompare(b.at));
  sorted.forEach((m, i) => {
    const minutes = i ? (Date.parse(m.at) - Date.parse(sorted[i - 1].at)) / 6e4 : null;
    rows.push([meta.field.farm, meta.field.code, m.track, meta.monitor, m.number, m.at, fixed(minutes, 1), m.planned[0].toFixed(7), m.planned[1].toFixed(7),
      m.marked ? m.marked[0].toFixed(7) : '', m.marked ? m.marked[1].toFixed(7) : '', fixed(m.distM, 1), fixed(m.accuracyM, 1), m.marked ? 'sim' : 'nao',
      fixed(m.fromEntryM, 1), m.steps ?? '', meta.stepLengthM, meta.engineVersion].map(v => String(v ?? '').replace(/;/g, ',')).join(';'));
  });
  return BOM + rows.join('\r\n') + '\r\n';
}

/** Orientação RFC 7946: anel externo anti-horário, furos horários. */
export const rfc7946Rings = polygon => polygon.map((ring, i) => (ringSignedArea(ring) > 0 === (i === 0) ? ring : ring.slice().reverse()));

export function toGeoJSON(sc, field) {
  const ll = xy => localToLonLat(xy[0], xy[1], field.centroidUTM).map(v => +v.toFixed(8)), gaps = previousGaps(sc.samples), features = [];
  for (const polygon of field.geom) features.push({ type: 'Feature', properties: { tipo: 'limite_KML_historico', fazenda: field.farm, lote: field.code,
    fonte: 'KML_2024_25', homologado: false, area_publicada_ha: field.areaOfficialHa }, geometry: { type: 'Polygon', coordinates: rfc7946Rings(polygon).map(r => r.map(ll)) } });
  for (const u of sc.units) features.push({ type: 'Feature', properties: { tipo: 'trecho_tiro', status: unitStatus(u), papel: u.role, tiro_id: u.trackId,
    trecho_id: u.id, tipo_trajeto: u.kind, confianca: u.confidence, comprimento_m: +u.len.toFixed(1), fonte: u.source }, geometry: { type: 'LineString', coordinates: u.line.map(ll) } });
  for (const s of sc.samples) {
    const gap = gaps.get(s.id);
    features.push({ type: 'Feature', properties: { tipo: 'ponto_amostragem', status: sampleStatus(sc), ponto: s.number, tiro_id: s.trackId,
      trecho_id: s.offTrack ? null : s.unitId, distancia_desde_inicio_m: s.offTrack ? null : +s.sTrack.toFixed(1),
      distancia_desde_inicio_trecho_m: s.offTrack ? null : +s.s.toFixed(1), intervalo_ao_anterior_m: gap == null ? null : +gap.toFixed(1),
      tipo_trajeto: s.kind, confianca: s.confidence, fora_da_pista: s.offTrack, ajuste_manual: s.manual }, geometry: { type: 'Point', coordinates: ll([s.x, s.y]) } });
  }
  return { type: 'FeatureCollection', name: `monitoramento_${sampleStatus(sc)}_${field.code}`,
    metadata: { status: sc.status, versao_motor: sc.engineVersion, gerado_em: sc.generatedAt, crs_calculo: 'EPSG:32723', minimo_pontos: sc.minPoints,
      pontos_planejados: sc.samples.length, politica_margem: sc.params.edgePolicy, largura_barra_m: sc.params.boomWidthM,
      aviso: 'Simulação geométrica. Não é rastro GNSS nem plano agronômico homologado.' }, features };
}
