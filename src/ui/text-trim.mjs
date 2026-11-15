// 2.3/2.4: menos leitura em todas as abas. Cada regra abaixo tira ou encurta um texto que repetia o que a tela já
// mostra (selo "Simulação" no mapa, etapa marcada no topo, rótulo do campo) ou que explicava o óbvio.
// Os números, avisos de dados e ações ficam. O texto original continua no artefato de referência; aqui só se
// esconde (classe) ou se reescreve o nó-folha, depois de cada desenho.
const HIDE = 'sx-trim';
const nbsp = / /g;
const leaf = e => !e.children.length;
// Esconde a nota e o subtítulo logo antes dela (seção que só diria "nada a fazer").
const withHeading = e => { const h = e.previousElementSibling; return h && /^H[2-6]$/.test(h.tagName) ? [e, h] : [e]; };
export const TRIM_RULES = [
  // Tiros, Dados e Auditoria: "Para que serve: …" (o nome da aba já diz).
  { sel: 'p.aba-intro', when: t => t.startsWith('Para que serve'), hide: true },
  // Tiros: retas estimadas pelo rumo (a Auditoria registra que a direção não foi conferida em campo).
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
  // Conferência: "Plano simulado" (aviso em Dados e Auditoria) e notas longas.
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
  // 2.4, lendo como quem usa no celular.
  // Mapa: a faixa "Simulação · limites e tiros não conferidos" ficava em todas as telas por cima do lote. O aviso de
  // limites não homologados segue em Dados e no selo. Outros estados da faixa (satélite) continuam aparecendo.
  { sel: '#geo-status', when: t => t.startsWith('Simulação ·'), hide: true, live: true },
  // Cartão do início: área do desenho (só técnica) e "24 pontos · 5 tiros" (a barra de baixo já mostra).
  { sel: '.lote-resumo .lr-tit small', when: t => /^\(desenho .+ ha\)$/.test(t), hide: true },
  { sel: '.lote-resumo p.lr-lin', when: t => /^\d+ pontos? · \d+ tiros?$/.test(t), hide: true },
  // Planejar › Plano: o lote já está no seletor; o "?" explica a densidade; o esquema logo abaixo mostra as distâncias.
  { sel: 'p.op-context', when: t => /^.+ · área da regra: /.test(t), text: t => t.replace(/^.+ · área da regra: /, 'Área: ') },
  { sel: 'small#op-density-help', when: t => t === 'Define o mínimo', hide: true },
  { sel: 'p.op-caption', when: t => t.startsWith('Mínimo pela área: '), text: t => t.replace('Mínimo pela área: ', 'Mínimo: ') },
  { sel: '.op-distance small', when: t => t === 'De um ao vizinho, de lado' || t === 'Ao longo do mesmo tiro', hide: true },
  // Etapas do Planejar: o resumo verde do topo já diz "sem área descoberta"; repetir abaixo não ajuda quem lê.
  { sel: '#param-stage-diagnostico p.v16-line', when: t => t.startsWith('Cada ponto cuida de'), hide: true },
  { sel: '#param-stage-diagnostico p', when: t => t.startsWith('Malha equilibrada:'), html: () => '<b>Malha equilibrada.</b>' },
  { sel: 'p.fx-note', when: t => t === 'Nenhuma mancha relevante.' || t.startsWith('Nada a corrigir.'), hide: withHeading },
  // Ajuste fino: "Padrão: Todos" embaixo de um campo que já mostra "Todos".
  { sel: 'small.param-meta', live: true, whenEl: e => { const m = /^Padrão: (.+)$/.exec(e.textContent.trim()), sel = e.closest('label')?.querySelector('select');
    return !!(m && sel && sel.selectedOptions[0]?.textContent.trim() === m[1].trim()); } },
  // Ajuste fino: título "Monitor em campo (calibração)" sem nenhum campo visível (só aparecem nas opções avançadas).
  { sel: 'fieldset.mon-calib', live: true, whenEl: e => ![...e.querySelectorAll('label')].some(l => getComputedStyle(l).display !== 'none') },
  // Conferência: o botão "Enviar plano aos monitores" está nesta mesma etapa.
  { sel: '.fx-verdict small', when: t => t === 'Envie o plano na etapa Arquivos.', hide: true },
  // Selo de dados: "Base histórica" não diz nada a quem usa; sem alerta do motor, o selo diz exatamente isso.
  { sel: '#v08-quality', when: t => t === 'Base histórica',
    fix: e => { e.textContent = 'Sem alertas'; e.setAttribute('aria-label', 'Sem alertas nos dados do lote. Limites do KML não homologados. Toque para ver os dados.'); return true; } },
  // Tiros: título repete o nome da aba.
  { sel: 'p.tr-sum', when: t => t === 'Cada tiro: pontos e distâncias', hide: true },
  // Dados.
  { sel: '.sd-quality', when: t => t.endsWith(' — interpretação não homologada. Os cálculos não foram alterados.'),
    text: t => /sobrepost|repetid/i.test(t) ? 'KML original com sobreposição (unificada). Limites não homologados.' : t.replace(/ — interpretação não homologada\. Os cálculos não foram alterados\.$/, ' (não homologado).') },
  { sel: 'p.sd-line', when: t => t.startsWith('Chuva registrada:') && t.includes('É a soma da planilha'),
    html: e => e.innerHTML.replace(/, todos antes do plantio\./, ', antes do plantio.').replace(/ É a soma da planilha, não o acumulado da safra\./, '') },
  // Auditoria › Dados do lote: cada nota do motor em uma linha curta.
  { sel: '.au-check li > span:not(.au-mark)', when: t => /A geometria usada aqui foi unificada|exatamente na direção do rumo|O mínimo de pontos usa a área publicada/.test(t),
    text: t => t.split(' · ').map(n => n
      .replace(/^No KML original: .+?\. A geometria usada aqui foi unificada e não tem sobreposição\.$/, 'KML original com sobreposição (unificada)')
      .replace(/^O ponto B da planilha fica a [\d,]+ m de A, exatamente na direção do rumo: foi gerado a partir do rumo\. A direção das linhas ainda não foi conferida em campo\.$/, 'Ponto B gerado pelo rumo; direção não conferida em campo')
      .replace(/^Área publicada ([\d.,]+) ha × desenho KML ([\d.,]+) ha\. O mínimo de pontos usa a área publicada\.$/, 'Área publicada $1 ha × desenho $2 ha (o mínimo usa a publicada)')).join(' · ') },
];

export function applyTextTrim(root, rules = TRIM_RULES) {
  let changed = 0;
  rules.forEach((r, i) => { for (const e of root.querySelectorAll(r.sel)) {
    const t = e.textContent.replace(nbsp, ' ').trim();
    // Regra "live": o elemento troca de texto (ex.: faixa do mapa mostra o estado do satélite); some só enquanto casar.
    if (r.live) { const on = r.whenEl ? r.whenEl(e) : r.when(t); if (on !== (e.dataset.sxTrim === String(i))) { e.classList.toggle(HIDE, on); on ? (e.dataset.sxTrim = String(i)) : delete e.dataset.sxTrim; changed++; } continue; }
    if (e.classList.contains(HIDE)) continue;
    if (!r.when(t)) continue;
    if (r.hide) { const target = typeof r.hide === 'function' ? r.hide(e) : e; for (const x of [target].flat()) if (x) { x.classList.add(HIDE); changed++; } continue; }
    if (r.fix) { if (r.fix(e)) changed++; continue; }
    if (r.html) { const h = r.html(e); if (h !== null) { e.innerHTML = h; changed++; } continue; }
    if (r.text && leaf(e)) {
      const v = r.text(t);
      if (v === null) { e.classList.add(HIDE); changed++; } else if (v !== t) { e.textContent = v; changed++; }
    }
  } });
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
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden', 'open'] });
  // Trocar a opção de um seletor não muda o DOM: reavalia as regras "live" (ex.: "Padrão: …") a cada troca.
  document.addEventListener('change', () => { if (!queued) { queued = true; view.requestAnimationFrame(run); } }, true);
  run();
  return true;
}
