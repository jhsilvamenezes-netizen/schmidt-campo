// 3.25 · qualidade do GPS nos celulares da equipe, para calibrar com dado real (raio de chegada, precisão aceita).
// Só contagens em faixas: precisão, intervalo entre leituras e moto/a pé. SEM coordenadas e SEM marcar coleta.
// Fica no aparelho (estado salvo) e sai num arquivo de texto quando a pessoa compartilha. Sem DOM.

/** Limites superiores das faixas de precisão (m); a última faixa é "acima de 25 m". */
export const ACC_BINS = [3, 5, 8, 10, 15, 25];
/** Limites superiores das faixas de intervalo entre leituras (s); a última é "acima de 10 s". */
export const DT_BINS = [1, 2, 3, 5, 10];
const bin = (/** @type {number[]} */ edges, /** @type {number} */ v) => { const i = edges.findIndex(e => v <= e); return i < 0 ? edges.length : i; };
const zero = (/** @type {number} */ n) => Array(n + 1).fill(0);

/** Soma uma leitura. `dtS` = segundos desde a leitura anterior da mesma guia (null na primeira). Não muda `st`.
 * @param {any} st @param {{accuracyM:number, dtS:number|null, mode:string|null, day:string}} r */
export function statsAdd(st, r) {
  const s = st && st.v === 1 ? st : { v: 1, n: 0, acc: zero(ACC_BINS.length), dt: zero(DT_BINS.length), moto: 0, pe: 0, desde: r.day, ate: r.day };
  if (!Number.isFinite(r.accuracyM)) return s;
  const acc = s.acc.slice(), dt = s.dt.slice();
  acc[bin(ACC_BINS, r.accuracyM)]++;
  if (Number.isFinite(r.dtS) && Number(r.dtS) > 0) dt[bin(DT_BINS, Number(r.dtS))]++;
  return { ...s, n: s.n + 1, acc, dt, moto: s.moto + (r.mode === 'moto' ? 1 : 0), pe: s.pe + (r.mode === 'pe' ? 1 : 0), ate: r.day };
}

/** Faixa onde está o percentil `q` (0–1) do histograma: o limite superior da faixa (Infinity na última). */
export function binQuantile(/** @type {number[]} */ counts, /** @type {number[]} */ edges, /** @type {number} */ q) {
  const total = counts.reduce((a, b) => a + b, 0); if (!total) return null;
  let acc = 0;
  for (let i = 0; i < counts.length; i++) { acc += counts[i]; if (acc >= q * total - 1e-9) return i < edges.length ? edges[i] : Infinity; }
  return Infinity;
}
const br = (/** @type {string} */ d) => String(d).split('-').reverse().join('/');
const pct = (/** @type {number} */ a, /** @type {number} */ b) => (b ? Math.round((100 * a) / b) : 0);
const upTo = (/** @type {number[]} */ counts, /** @type {number[]} */ edges, /** @type {number} */ lim) => counts.slice(0, edges.indexOf(lim) + 1).reduce((a, b) => a + b, 0);

/** Resumo em frases curtas, com o que o dado diz sobre o raio de chegada e a precisão aceita (só o que foi medido).
 * @param {any} st @param {{arrivalRadiusM:number, gpsAccuracyMaxM:number}} monitor */
export function statsSummary(st, monitor) {
  if (!st || !st.n) return { n: 0, lines: ['Ainda sem leituras. Use a guia em campo; as leituras entram sozinhas.'] };
  const p50 = binQuantile(st.acc, ACC_BINS, 0.5), p90 = binQuantile(st.acc, ACC_BINS, 0.9), dts = st.dt.reduce((a, b) => a + b, 0);
  const fmt = (/** @type {number|null} */ v) => (v === Infinity ? 'acima de 25 m' : `até ${v} m`);
  const lines = [
    `${st.n.toLocaleString('pt-BR')} leituras (${st.desde === st.ate ? br(st.desde) : `${br(st.desde)} a ${br(st.ate)}`}).`,
    `Precisão: metade ${fmt(p50)}; 9 em 10 ${fmt(p90)}.`,
    `Até 5 m: ${pct(upTo(st.acc, ACC_BINS, 5), st.n)}% · até 10 m: ${pct(upTo(st.acc, ACC_BINS, 10), st.n)}% · até 15 m: ${pct(upTo(st.acc, ACC_BINS, 15), st.n)}%.`,
  ];
  if (dts) lines.push(`Leitura nova: até 1 s em ${pct(st.dt[0], dts)}%; mais de 5 s em ${pct(st.dt[4] + st.dt[5], dts)}%.`);
  if (st.moto + st.pe) lines.push(`De moto em ${pct(st.moto, st.moto + st.pe)}% das leituras.`);
  const over = st.n - upTo(st.acc, ACC_BINS, 15);
  lines.push(p90 !== null && p90 !== Infinity && p90 <= monitor.arrivalRadiusM
    ? `Raio de chegada de ${monitor.arrivalRadiusM} m: cobre 9 em 10 leituras.`
    : `Raio de chegada de ${monitor.arrivalRadiusM} m: menor que a precisão de 9 em 10 leituras; a chegada usa a precisão (até ${monitor.gpsAccuracyMaxM} m) e pede conferir pelos passos.`);
  if (over) lines.push(`${pct(over, st.n)}% das leituras acima de 15 m (GPS impreciso).`);
  return { n: st.n, p50, p90, lines };
}

/** Arquivo de texto (CSV com ;) para mandar: faixas e contagens, sem posição. */
export function statsCsv(/** @type {any} */ st, /** @type {string} */ appVersion) {
  const rows = ['tipo;faixa;leituras'];
  if (st?.n) {
    st.acc.forEach((/** @type {number} */ c, /** @type {number} */ i) => rows.push(`precisao_m;${i < ACC_BINS.length ? `<=${ACC_BINS[i]}` : `>${ACC_BINS.at(-1)}`};${c}`));
    st.dt.forEach((/** @type {number} */ c, /** @type {number} */ i) => rows.push(`intervalo_s;${i < DT_BINS.length ? `<=${DT_BINS[i]}` : `>${DT_BINS.at(-1)}`};${c}`));
    rows.push(`modo;moto;${st.moto}`, `modo;a_pe;${st.pe}`, `periodo;${st.desde}_a_${st.ate};${st.n}`);
  }
  rows.push(`versao;${appVersion};`);
  return rows.join('\n') + '\n';
}
