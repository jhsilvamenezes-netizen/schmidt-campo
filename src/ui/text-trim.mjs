// 2.3: menos leitura em todas as abas. Cada regra abaixo tira ou encurta um texto que repetia o que a tela já
// mostra (selo "Simulação" no mapa, etapa marcada no topo, rótulo do campo) ou que explicava o óbvio.
// Os números, avisos de dados e ações ficam. O texto original continua no artefato de referência; aqui só se
// esconde (classe) ou se reescreve o nó-folha, depois de cada desenho.
const HIDE = 'sx-trim';
const nbsp = / /g;
const leaf = e => !e.children.length;
export const TRIM_RULES = [
  // Tiros, Dados e Auditoria: "Para que serve: …" (o nome da aba já diz).
  { sel: 'p.aba-intro', when: t => t.startsWith('Para que serve'), hide: true },
  // Tiros: o selo "Simulação · limites e tiros não conferidos" do mapa já avisa.
  { sel: 'p.tr-kind', when: t => /^Retas estimadas/.test(t), hide: true },
  // Tiros: "(de lado)" repetido em cada tiro; o rótulo "Entre tiros" já é a distância de lado.
  { sel: 'p.tr-viz > span', when: t => t === '(de lado)', hide: true },
  // Dados: rodapé em uma linha.
  { sel: 'p.sd-source', when: t => /^Fonte: .+?\. Informativo:/.test(t),
    text: t => t.replace(/^Fonte: (.+?)\. Informativo:.*?Limites do mapa: (.+?), não homologados\.$/, 'Fonte: $1 · limites $2, não homologados.') },
  // Passo a passo: "Passo N de 5 · …" + frase; o seletor de etapas no topo já mostra a etapa.
  { sel: 'div.fx-guide', when: t => /^Passo \d de \d/.test(t), hide: true },
  // Diagnóstico e Ajuste fino: frases de abertura de seção.
  { sel: '.stage-intro > p', when: t => /Onde a lavoura fica longe|^Ajuste quantidade, intervalo|^Configure os limites/.test(t),
    text: t => (/^(.+?\S)\. Onde a lavoura/.exec(t)?.[1] ?? null) },
  { sel: 'p.ml-expl', when: t => t.startsWith('Entre tiros: de um ao vizinho'), hide: true },
  { sel: 'p.fx-note', when: t => t.startsWith('d = lado do quadrado'),
    text: t => t.replace(/^d = lado do quadrado que cada ponto cobre \(√ área ÷ pontos = ([^)]+)\)\..*$/, 'd = √(área ÷ pontos) = $1.') },
  { sel: 'p.ml-expl', when: t => t.startsWith('O lote dividido entre os pontos'),
    html: e => { const b = e.querySelector('b'), m = /\(média ([^;)]+)/.exec(e.textContent); return b ? `Cada ponto representa <b>${b.textContent}</b>${m ? ` (média ${m[1]})` : ''}.` : null; } },
  // Ajuste fino: "não calibrado" em cada campo (a Auditoria lista os valores iniciais) e "Padrão: … · aceita …".
  { sel: 'span.param-uncal', when: t => t === 'não calibrado', hide: true },
  { sel: 'p.info', when: t => t.startsWith('Valores usados no roteiro'), hide: true },
  // Conferência: "Plano simulado" (selo do mapa) e notas longas.
  { sel: 'b', when: t => t === 'Plano simulado', hide: e => e.closest('li') || e.parentElement?.parentElement },
  { sel: 'p.fx-note', when: t => t.startsWith('Caminhada estimada dentro do lote'),
    text: t => { const m = /Maior: (.+)$/.exec(t); return `Caminhada dentro do lote, sem o trajeto até ele.${m ? ` Maior: ${m[1]}` : ''}`; } },
  { sel: 'dl.fx-kv dd', when: t => /, de um ao vizinho \(medido de lado\)$|, andando sobre o tiro$/.test(t),
    text: t => t.replace(/, de um ao vizinho \(medido de lado\)$|, andando sobre o tiro$/, '') },
  // Arquivos.
  { sel: 'p#storage-info', when: t => t.startsWith('Grava sozinho neste aparelho') && t.includes('Atenção'),
    text: t => { const h = /última às ([^)]+)\)/.exec(t)?.[1], kb = /· ([\d.,]+ [kMG]?B) usados/.exec(t)?.[1];
      return `Grava sozinho neste aparelho${h ? ` (última às ${h}` : ''}${kb ? ` · ${kb}` : ''}${h ? ')' : ''}. Faça cópia de segurança ao terminar.`; } },
  { sel: 'section.schmidt-backup > p', when: t => t.startsWith('Guarda em um arquivo:'),
    text: () => 'Tudo deste aparelho em um arquivo. Ao restaurar, o app mostra o conteúdo antes e guarda o estado atual.' },
  { sel: 'fieldset.schmidt-versoes p.fx-note', when: t => t.startsWith('Guardadas sozinhas'), text: () => 'Guardadas sozinhas: últimas 20 por lote.' },
  { sel: 'p.fx-note', when: t => t.startsWith('O planejamento não depende dele'), hide: true },
  // Monitor.
  { sel: 'p.mon-note', when: t => t.startsWith('“Ponto coletado” só marca'), text: () => 'Avaliação: registre no Cropwise.' },
  { sel: 'p.mg-meta > span', when: t => /^\d+ de \d+ coletados?$/.test(t), hide: true },
  { sel: 'ol.mon-steps > li', when: t => t.startsWith('Passos estimados com passo'), hide: true },
  { sel: 'p.mg-meta > span', when: t => t.startsWith('GPS desligado — '), text: () => 'GPS desligado' },
];

export function applyTextTrim(root, rules = TRIM_RULES) {
  let changed = 0;
  for (const r of rules) for (const e of root.querySelectorAll(r.sel)) {
    if (e.classList.contains(HIDE)) continue;
    const t = e.textContent.replace(nbsp, ' ').trim();
    if (!r.when(t)) continue;
    if (r.hide) { const target = typeof r.hide === 'function' ? r.hide(e) : e; if (target) { target.classList.add(HIDE); changed++; } continue; }
    if (r.html) { const h = r.html(e); if (h !== null) { e.innerHTML = h; changed++; } continue; }
    if (r.text && leaf(e)) {
      const v = r.text(t);
      if (v === null) { e.classList.add(HIDE); changed++; } else if (v !== t) { e.textContent = v; changed++; }
    }
  }
  return changed;
}

export function installSchmidtTextTrim({ document }) {
  const view = document.defaultView;
  if (!view || document.getElementById('schmidt-text-trim')) return false;
  const style = document.createElement('style');
  style.id = 'schmidt-text-trim';
  style.textContent = `.${HIDE}{display:none!important}`;
  document.head.append(style);
  let queued = false;
  const run = () => { queued = false; applyTextTrim(document.body); };
  const map = document.getElementById('map');
  new view.MutationObserver(list => {
    if (queued || list.every(m => map?.contains(m.target))) return;
    queued = true; view.requestAnimationFrame(run);
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  run();
  return true;
}
