"""Figura técnica gerada dos cálculos; não edita screenshots nem o app."""
from pathlib import Path
import argparse
import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--input', type=Path, default=ROOT / 'audit/results/block-pilot/projection-private.json')
parser.add_argument('--output', type=Path, default=ROOT.parent / 'entregas-schmidt/estudo-bloco-bb1-bc1')
parser.add_argument('--name', default='BB1-BC1-comparativo-projecao')
args = parser.parse_args()
data = json.loads(args.input.read_text())
OUT = args.output
OUT.mkdir(parents=True, exist_ok=True)
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 12})
green, cyan, brown, muted = '#17594a', '#096f86', '#95521c', '#56685f'
fig = plt.figure(figsize=(15, 12), facecolor='#f3f7f4')
fig.text(.5, .965, data.get('title', 'BB1 + BC1 · projeção de tiros em bloco'), ha='center', fontsize=24, weight='bold', color=green)
fig.text(.5, .935, data.get('subtitle', 'Contornos históricos do app · simulação local para avaliação · sem implantação'), ha='center', fontsize=12, color=muted)
all_coords = np.array([p for polys in data['geometries'].values() for poly in polys for p in poly[0]])
x0, y0 = all_coords.min(axis=0); x1, y1 = all_coords.max(axis=0)
pad = 160


def draw(ax, version, zoom=False):
    ax.set_facecolor('#ffffff')
    for code, polys in data['geometries'].items():
        for poly in polys:
            xy = np.array(poly[0])
            ax.fill(xy[:, 0], xy[:, 1], color='#e3f0ea' if code == 'BB1' else '#eaf0ec', zorder=1)
            ax.plot(xy[:, 0], xy[:, 1], color=green, linewidth=1.7 if not zoom else 2.2, zorder=3)
            for hole in poly[1:]:
                h = np.array(hole); ax.fill(h[:, 0], h[:, 1], color='white', zorder=2)
        if version == 'before':
            segments = data['before'][code]['segments']; samples = data['before'][code]['samples']
        else:
            segments = [s for s in data['after']['grid']['segments'] if s['field'] == code]
            samples = data['after']['samples'][code]
        for s in segments:
            xy = np.array(s['line']); ax.plot(xy[:, 0], xy[:, 1], color=cyan, linewidth=1.5 if not zoom else 2.1, zorder=4)
        ax.scatter([p['x'] for p in samples], [p['y'] for p in samples], s=31, color=brown, edgecolor='white', linewidth=.7, zorder=5)
        if not zoom:
            center = np.array(polys[0][0]).mean(axis=0)
            ax.text(center[0], center[1], code, ha='center', va='center', color=green, weight='bold', fontsize=14,
                    bbox={'boxstyle': 'round,pad=.3', 'facecolor': 'white', 'edgecolor': '#cadbd0', 'alpha': .95}, zorder=6)
    ax.set_aspect('equal'); ax.set_xticks([]); ax.set_yticks([])
    if not zoom and 'axisReference' in data:
        a, b = np.array(data['axisReference'])
        ax.plot([a[0], b[0]], [a[1], b[1]], color='#6b3fa0', linestyle='--', linewidth=1.6, zorder=7)
        ax.scatter([a[0], b[0]], [a[1], b[1]], marker='s', s=18, color='#6b3fa0', zorder=8)
        for label, p in [('A', a), ('B', b)]:
            ax.annotate(label, p, xytext=(7, 4), textcoords='offset points', color='#6b3fa0', fontsize=10, weight='bold', zorder=9)
    for spine in ax.spines.values(): spine.set_color('#cadbd0')
    if zoom:
        x, y = data['zoomCenter']; ax.set_xlim(x - 105, x + 105); ax.set_ylim(y - 58, y + 58)
    else:
        ax.set_xlim(x0 - pad, x1 + pad); ax.set_ylim(y0 - pad, y1 + pad)
        ax.annotate('N', xy=(.94, .97), xytext=(.94, .86), xycoords='axes fraction', ha='center', color=green,
                    arrowprops={'arrowstyle': '-|>', 'color': green, 'lw': 1.4}, fontsize=11, weight='bold')
        start_x, start_y = x0 + 90, y0 + 80
        ax.plot([start_x, start_x + 500], [start_y, start_y], color=green, linewidth=2.4)
        ax.text(start_x + 250, start_y + 50, '500 m', ha='center', fontsize=9, color=green)
        x, y = data['zoomCenter']
        ax.plot([x - 105, x + 105, x + 105, x - 105, x - 105], [y - 58, y - 58, y + 58, y + 58, y - 58], color='#c27a1c', linewidth=1.2, zorder=7)


for x, version, title in [(.065, 'before', data.get('beforeTitle', 'ANTES · planos individuais')), (.535, 'after', data.get('afterTitle', 'PROJEÇÃO · referência comum no BB1'))]:
    ax = fig.add_axes([x, .32, .40, .54]); draw(ax, version)
    fig.text(x + .20, .885, title, ha='center', color=green, weight='bold', fontsize=15)
    fig.text(x + .20, .290, 'BB1: 26 pontos    ·    BC1: 23 pontos', ha='center', color=green, fontsize=13, weight='bold')
    text = '5 tiros por lote · grades deslocadas na divisa' if version == 'before' else '5 eixos comuns · 10 trechos no total'
    fig.text(x + .20, .267, text, ha='center', color=muted, fontsize=11)
    inset = fig.add_axes([x + .035, .107, .33, .13]); draw(inset, version, zoom=True)
    label = 'Divisa ampliada · desencontro de ≈36,5 m' if version == 'before' else 'Divisa ampliada · eixos alinhados, limites mantidos'
    fig.text(x + .20, .244, label, ha='center', fontsize=10.5, color=green)

handles = [Line2D([0], [0], color=cyan, lw=2, label='Tiros'),
           Line2D([0], [0], marker='o', color='none', markerfacecolor=brown, markersize=6, label='Pontos'),
           Line2D([0], [0], color=green, lw=2, label='Limites dos lotes')]
if 'axisReference' in data:
    handles.append(Line2D([0], [0], color='#6b3fa0', linestyle='--', lw=1.6, label='Referência A–B'))
fig.legend(handles=handles, loc='upper center', bbox_to_anchor=(.5, .922), ncol=len(handles), frameon=False, fontsize=10)
fig.text(.5, .074, '401,28 m entre eixos · 49 pontos no total · nenhuma linha de passagem liberada', ha='center', color=green, fontsize=12, weight='bold')
fig.text(.5, .045, data.get('footerNote', 'Recuo de ensaio: 50 m (não é recomendação). Acesso, percurso e ganho de tempo ainda não validados.'), ha='center', color=muted, fontsize=10.5)
fig.savefig(OUT / f'{args.name}.png', dpi=180, facecolor=fig.get_facecolor())
fig.savefig(OUT / f'{args.name}.pdf', facecolor=fig.get_facecolor())
plt.close(fig)
(OUT / 'RESULTADO-DO-ENSAIO.json').write_text(json.dumps(data['report'], ensure_ascii=False, indent=2) + '\n')
print(str(OUT / f'{args.name}.png'))
