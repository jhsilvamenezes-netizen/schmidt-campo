// 2.1 (F4/U4): "Comparar antes de usar" no rascunho do bloco. Cada opção é a melhor de um espaçamento comum,
// já calculada pela preparação (mesma grade, mesmas células de cobertura, mesma redistribuição de pontos).
// Escolher só troca o rascunho e o mapa; "Usar bloco" continua sendo uma operação única para todos os lotes.
// Opção que piora a cobertura de algum lote aparece com o motivo e não pode ser escolhida.
const CSS = `
#block-planning .bc{border:1px solid var(--sx-line);border-radius:var(--sx-r);background:var(--sx-surface)}
#block-planning .bc>summary{min-height:var(--sx-touch);display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;font-weight:700;color:var(--sx-brand);font-size:var(--sx-fs-14)}
#block-planning .bc>summary small{font-weight:400;color:var(--sx-muted);font-size:var(--sx-fs-13)}
#block-planning .bc-body{padding:0 10px 10px;display:grid;gap:8px}
#block-planning .bc-help{font-size:var(--sx-fs-13);line-height:18px;color:var(--sx-muted);margin:0}
#block-planning .bc-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
#block-planning .bc-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:start;border:1px solid var(--sx-line);border-radius:var(--sx-r);padding:8px}
#block-planning .bc-row.is-current{border-color:var(--sx-brand);box-shadow:inset 3px 0 0 var(--sx-brand)}
#block-planning .bc-head{margin:0;font-size:var(--sx-fs-13);line-height:18px;color:var(--sx-ink-2)}
#block-planning .bc-head strong{font-size:var(--sx-fs-20);line-height:25px;color:var(--sx-brand);margin-right:6px}
#block-planning .bc-tag{font-size:var(--sx-fs-12);font-weight:700;color:var(--sx-brand);padding:4px 0}
#block-planning .bc-line{grid-column:1/-1;margin:0;font-size:var(--sx-fs-14);line-height:19px;color:var(--sx-ink)}
#block-planning .bc-line.is-counts{font-weight:700;color:var(--sx-head)}
#block-planning .bc-line.is-warn{color:var(--sx-warn);font-weight:650}
#block-planning .bc-members{grid-column:1/-1;font-size:var(--sx-fs-13)}
#block-planning .bc-members summary{min-height:var(--sx-touch);display:flex;align-items:center;cursor:pointer;color:var(--sx-brand);font-weight:650}
#block-planning .bc-members ul{margin:0;padding-left:18px;color:var(--sx-ink-2);line-height:20px}
#block-planning .bc-row button{min-width:88px}
#block-planning .bc-blocked>summary{min-height:var(--sx-touch);display:flex;align-items:center;cursor:pointer;color:var(--sx-brand);font-weight:650;font-size:var(--sx-fs-14)}
#block-planning .bc-blocked>.bc-list{margin-top:8px}
`;

export function schmidtBlockCompareElement({ document, alternatives, currentSpacingM, open = false, onChoose }) {
  if (!document.getElementById('block-compare-style')) {
    const style = document.createElement('style'); style.id = 'block-compare-style'; style.textContent = CSS; document.head.append(style);
  }
  const make = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text != null) n.textContent = text; return n; };
  const num = (v, d = 0) => v.toLocaleString('pt-BR', { maximumFractionDigits: d });
  const box = make('details', 'bc'); box.id = 'block-compare'; box.open = open;
  const summary = make('summary', null, 'Comparar antes de usar ');
  summary.append(make('small', null, `· ${alternatives.filter(a => !a.summary.coverageTradeoff).length} sem perda de cobertura`));
  const body = make('div', 'bc-body');
  body.append(make('p', 'bc-help', 'Mesma referência comum e mesmo mínimo de pontos em cada lote; só muda a distância entre tiros. Escolher troca o desenho; o bloco só passa a valer ao tocar em Usar bloco.'));
  // Primeiro as opções que podem ser usadas; as que pioram a cobertura ficam recolhidas (motivo visível ao abrir).
  const list = make('ol', 'bc-list'), blockedList = make('ol', 'bc-list');
  const blocked = make('details', 'bc-blocked');
  for (const alt of alternatives) {
    const s = alt.summary, current = Math.abs(s.spacingM - currentSpacingM) < 1e-6;
    const li = make('li', 'bc-row' + (current ? ' is-current' : ''));
    li.dataset.bcSpacing = String(s.spacingM); li.dataset.bcTracks = String(s.tracks); li.dataset.bcPoints = String(s.points);
    const head = make('p', 'bc-head'); head.append(make('strong', null, `${num(s.spacingM, 2)} m`), `entre tiros · ${s.passes} passadas${alt.chosen ? ' · recomendada' : ''}`);
    li.append(head);
    if (current) li.append(make('span', 'bc-tag', 'escolhida'));
    else {
      const choose = make('button', null, s.coverageTradeoff ? 'Revisar' : 'Escolher'); choose.type = 'button';
      choose.disabled = s.coverageTradeoff;
      choose.setAttribute('aria-label', `Escolher ${num(s.spacingM, 2)} metros entre tiros`);
      choose.onclick = () => onChoose(alt);
      li.append(choose);
    }
    li.append(make('p', 'bc-line is-counts', `${s.tracks} tiros · ${s.points} pontos${s.added ? ` · ${s.added} a mais para manter a cobertura` : ''}`));
    li.append(make('p', 'bc-line' + (s.coverageTradeoff ? ' is-warn' : ''), s.coverageTradeoff
      ? `Cobertura pior que no individual no lote ${s.worstCode} (+${num((s.worstRatio - 1) * 100, 1)}%): não pode ser usada sem revisão`
      : 'Nenhum lote fica com cobertura pior que no plano individual'));
    if (Number.isFinite(s.borderM)) li.append(make('p', 'bc-line', `Ponto mais perto da borda: ${num(s.borderM, 1)} m`));
    const per = make('details', 'bc-members'); per.append(make('summary', null, 'Por lote'));
    const ul = make('ul');
    for (const f of s.perField) ul.append(make('li', null, `${f.code}: ${f.tracks} tiros · ${f.points} pontos${f.added ? ` (+${f.added})` : ''}`));
    per.append(ul); li.append(per);
    (s.coverageTradeoff && !current ? blockedList : list).append(li);
  }
  body.append(list);
  const n = blockedList.children.length;
  if (n) {
    blocked.append(make('summary', null, `Ver ${n} ${n === 1 ? 'opção que piora' : 'opções que pioram'} a cobertura de algum lote`), blockedList);
    body.append(blocked);
  }
  box.append(summary, body);
  return box;
}
