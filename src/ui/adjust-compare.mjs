import { schmidtAlternativeSummary, schmidtTrackAlternatives } from '../application/adjust-alternatives.mjs';

// E3 (2.0 web): "Comparar antes de aplicar" na etapa Tiros. Mostra, para distâncias/quantidades vizinhas,
// o que muda em tiros, pontos, entre tiros, entre pontos, borda, cobertura e caminhada, SEM alterar o plano.
// "Usar" escreve no mesmo campo que a pessoa digitaria: o app aplica, grava e oferece Desfazer como sempre.
// Fica recolhido e só calcula quando aberto. Não aparece no modo bloco nem com trajetos importados.
export function installSchmidtAdjustCompare({ document, schmidt, events, measurements }) {
  const stage = document.getElementById('param-stage-tiros');
  const spacing = document.getElementById('trackSpacingM');
  const count = document.getElementById('trackCount');
  const row = spacing?.closest('.row2');
  if (!stage || !spacing || !count || !row || !events?.on || !measurements?.malhaDoPlano || stage.querySelector('.ac')) return false;

  // Texto antigo da etapa citava anéis; o método vigente é linear (retas), sem anéis.
  const intro = stage.querySelector('.stage-intro > p');
  if (intro) intro.textContent = intro.textContent.replace('Retas e anéis são estimativas', 'Retas são estimativas');

  const make = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text != null) n.textContent = text; return n; };
  const num = (v, d = 0) => v.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const style = make('style');
  style.textContent = `
    #param-stage-tiros .ac{margin:10px 0 4px;border:1px solid var(--sx-line);border-radius:var(--sx-r);background:var(--sx-surface)}
    #param-stage-tiros .ac>summary{min-height:var(--sx-touch);display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;font-weight:700;color:var(--sx-brand);font-size:var(--sx-fs-14)}
    #param-stage-tiros .ac>summary small{font-weight:400;color:var(--sx-muted);font-size:var(--sx-fs-13)}
    #param-stage-tiros .ac-body{padding:0 10px 10px}
    #param-stage-tiros .ac-help,#param-stage-tiros .ac-note{font-size:var(--sx-fs-13);line-height:18px;color:var(--sx-muted);margin:0 0 8px}
    #param-stage-tiros .ac-note{color:var(--sx-warn)}
    #param-stage-tiros .ac-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
    #param-stage-tiros .ac-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:start;border:1px solid var(--sx-line);border-radius:var(--sx-r);padding:8px}
    #param-stage-tiros .ac-row.is-current{border-color:var(--sx-brand);box-shadow:inset 3px 0 0 var(--sx-brand)}
    #param-stage-tiros .ac-head{margin:0;font-size:var(--sx-fs-13);line-height:18px;color:var(--sx-ink-2)}
    #param-stage-tiros .ac-head strong{font-size:var(--sx-fs-20);line-height:25px;color:var(--sx-brand);margin-right:6px}
    #param-stage-tiros .ac-counts{grid-column:1/-1;margin:0;font-weight:700;font-size:var(--sx-fs-14);color:var(--sx-head)}
    #param-stage-tiros .ac-nums{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;margin:0}
    #param-stage-tiros .ac-nums div{min-width:0}
    #param-stage-tiros .ac-nums dt{font-size:var(--sx-fs-12);line-height:16px;color:var(--sx-muted)}
    #param-stage-tiros .ac-nums dd{margin:0;font-size:var(--sx-fs-14);line-height:19px;font-weight:400;color:var(--sx-ink-2)}
    #param-stage-tiros .ac-nums dd.is-diff{font-weight:750;color:var(--sx-brand)}
    #param-stage-tiros .ac-row.is-current .ac-nums dd{font-weight:650;color:var(--sx-ink)}
    #param-stage-tiros .ac-tag{font-size:var(--sx-fs-12);font-weight:700;color:var(--sx-brand);padding:4px 0}
    #param-stage-tiros .ac-use{min-height:var(--sx-touch);min-width:72px;padding:0 14px;font:inherit;font-weight:700;font-size:var(--sx-fs-14);color:var(--sx-brand);background:var(--sx-surface);border:1px solid var(--sx-line-strong);border-radius:var(--sx-r);cursor:pointer}
    #param-stage-tiros .ac-use:focus-visible,#param-stage-tiros .ac>summary:focus-visible{outline:3px solid var(--sx-brand);outline-offset:2px}
  `;
  document.head.append(style);

  const box = make('details', 'ac');
  const summary = make('summary', null, 'Comparar antes de aplicar ');
  const summaryCount = make('small');
  summary.append(summaryCount);
  const body = make('div', 'ac-body');
  const help = make('p', 'ac-help');
  const note = make('p', 'ac-note', 'Pontos movidos ou acrescentados à mão não entram nas opções; ao usar uma delas, o app avisa e permite desfazer.');
  const list = make('ol', 'ac-list');
  list.setAttribute('aria-live', 'polite');
  body.append(help, note, list);
  box.append(summary, body);
  row.after(box);

  const engine = () => schmidt.modulos?.__m_engine_scenario;
  const blockActive = () => !!schmidt.blocks?.controller?.active;
  let lastScenario = null, pending = false;

  function labelFor(alt, s) {
    if (alt.kind === 'quantidade') return [`${alt.count} ${alt.count === 1 ? 'tiro' : 'tiros'}`, s.across ? `${s.across} entre tiros` : 'tiro único'];
    return [s.across, alt.passes ? `entre tiros · ${alt.passes} passadas` : 'entre tiros'];
  }

  function render() {
    pending = false;
    const app = schmidt.app, sc = app?.sc, field = app?.field;
    const alts = sc && field && !blockActive() ? schmidtTrackAlternatives(sc.params) : [];
    box.hidden = alts.length < 2;
    if (box.hidden) { lastScenario = null; return; }
    summaryCount.textContent = `· ${alts.length} opções`;
    const byQuantity = alts[0].kind === 'quantidade';
    help.textContent = byQuantity
      ? 'Mesmo lote e mesma regra de pontos; só muda a quantidade de tiros. Em negrito, o que fica diferente do plano em uso. O plano só muda ao tocar em Usar, e dá para desfazer.'
      : 'Mesmo lote e mesma regra de pontos; só muda a distância entre tiros. Em negrito, o que fica diferente do plano em uso. O plano só muda ao tocar em Usar, e dá para desfazer.';
    note.hidden = !sc.samples.some(p => p.manual || p.extra || p.offTrack);
    if (!box.open || lastScenario === sc) return;
    lastScenario = sc;
    const current = schmidtAlternativeSummary(sc, field.geom, measurements);
    const rows = alts.map(alt => {
      let s;
      try { s = alt.current ? current : schmidtAlternativeSummary(engine().buildScenario(field, { ...sc.params, ...alt.override }), field.geom, measurements); }
      catch { return null; } // combinação que o motor recusa não vira opção
      return { alt, s };
    }).filter(Boolean);
    list.replaceChildren(...rows.map(({ alt, s }) => {
      const li = make('li', 'ac-row' + (alt.current ? ' is-current' : ''));
      const [main, sub] = labelFor(alt, s);
      const head = make('p', 'ac-head'); head.append(make('strong', null, main), sub);
      li.append(head);
      if (alt.current) li.append(make('span', 'ac-tag', 'em uso'));
      else {
        const use = make('button', 'ac-use', 'Usar'); use.type = 'button';
        use.setAttribute('aria-label', `Usar ${main} ${sub}`);
        use.dataset.acInput = alt.input.id; use.dataset.acValue = String(alt.input.value);
        use.onclick = () => apply(alt);
        li.append(use);
      }
      li.append(make('p', 'ac-counts', `${s.tracks} ${s.tracks === 1 ? 'tiro' : 'tiros'} · ${s.points} ${s.points === 1 ? 'ponto' : 'pontos'}`));
      const dl = make('dl', 'ac-nums');
      const item = (label, value, ref) => { const d = make('div'); const dd = make('dd', value !== ref && !alt.current ? 'is-diff' : null, value); d.append(make('dt', null, label), dd); dl.append(d); };
      const fmtBorder = v => v == null ? '—' : `${num(v)} m`;
      const fmtP95 = v => v == null ? '—' : `${num(v)} m`;
      const fmtKm = v => v == null ? '—' : `${num(v, 1)} km`;
      item('Entre pontos', s.along, current.along);
      item('Ponto mais perto da borda', fmtBorder(s.borderM), fmtBorder(current.borderM));
      item('95% do lote a menos de', fmtP95(s.p95M), fmtP95(current.p95M));
      item('Caminhada total', fmtKm(s.walkKm), fmtKm(current.walkKm));
      li.append(dl);
      li.dataset.acTracks = String(s.tracks); li.dataset.acPoints = String(s.points);
      return li;
    }));
  }

  function apply(alt) {
    const input = document.getElementById(alt.input.id);
    if (!input || blockActive()) return;
    input.value = alt.kind === 'quantidade' ? String(alt.input.value) : num(alt.input.value, 2);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const schedule = () => { if (pending) return; pending = true; (document.defaultView.requestAnimationFrame || setTimeout)(render); };
  for (const event of ['plano:mudou', 'aba:mudou', 'etapa:mudou']) events.on(event, schedule);
  box.addEventListener('toggle', schedule);
  document.getElementById('trackMode')?.addEventListener('change', schedule);
  schedule();
  return true;
}
