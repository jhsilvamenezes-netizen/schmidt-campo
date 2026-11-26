// 3.0 · telas em HTML (sem estilo inline: CSP). Recebem dados prontos do planner; não calculam nada.
// 3.24 · aqui ficam só as peças comuns (ícones, medidas, selos, folha); cada aba tem o seu arquivo views-*.mjs.
import { esc } from './format.mjs';

export const ICONS = {
  mapa: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  plano: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  enviar: '<path d="M4 12l16-8-6 16-3-7z"/><path d="M11 13l9-9"/>',
  lotes: '<path d="M3 7l6-3 6 2 6-2v13l-6 3-6-2-6 2z"/><path d="M9 4l-1 16M15 6l1 16M3 13l18-1"/>',
  monitorar: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" class="fill"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  mais: '<circle cx="5" cy="12" r="1.6" class="fill"/><circle cx="12" cy="12" r="1.6" class="fill"/><circle cx="19" cy="12" r="1.6" class="fill"/>',
};
/** 4.0-c · alça da folha (só aparece no design 4.0): toque alterna a altura; arrastar escolhe baixa, meia ou cheia. */
export const GRAB = '<button class="grabber" type="button" data-act="sheet-cycle" aria-label="Mudar a altura do painel"></button>';

/** 3.12 · cada medida é um botão: tocar abre a frase do glossário (rótulo sublinhado em pontos indica que explica). */
const metric = (label, value, term = label) => `<button class="m" data-term="${term}"><small>${label}</small> <b>${esc(value)}</b></button>`;
export const metrics = f => `<div class="m3">${metric('Entre tiros', f.entreTiros)}${metric('Entre pontos', f.entrePontos)}${metric('95% do lote', f.p95)}</div>`;
export const chip = (level, text) => `<span class="chip ${level}">${esc(text)}</span>`;

/** Selo do lote: alertas do motor (dados) ou "Sem alertas". */
export const sw = (act, label, on, hint = '') => `<button class="lrow" data-act="${act}" role="switch" aria-checked="${!!on}"><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</span><i class="tg" aria-hidden="true"></i></button>`;

export const sheet = (title, body) => `<div class="ov" data-close><section class="sheet menu" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grab"></div><div class="row-sb"><h2 class="big md">${esc(title)}</h2><button class="close" data-close aria-label="Fechar">×</button></div>${body}</section></div>`;

export const menuBody = items => items.map(([id, label]) => `<button class="lnk" data-open="${id}">${esc(label)}</button>`).join('');
