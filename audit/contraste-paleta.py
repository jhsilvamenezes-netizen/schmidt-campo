# 3.1 · contraste WCAG da paleta (claro, escuro e Sol): texto 4,5:1, traços do mapa 3:1. Sai com erro se algum par falhar.
import re,sys
css=open(__import__('pathlib').Path(__file__).resolve().parent.parent/'src/app3/styles.css').read()
def toks(block):
    return dict(re.findall(r'--([a-z0-9-]+):(#[0-9a-fA-F]{3,6})',block))
light=toks(css[css.index(':root{'):css.index('@media (prefers')])
dark={**light,**toks(css[css.index(':root:not(.sun){'):css.index(':root.sun{')])}
sun={**light,**toks(css[css.index(':root.sun{'):css.index(':root.sun{')+600])}
def lum(h):
    h=h.lstrip('#'); h=''.join(c*2 for c in h) if len(h)==3 else h
    c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    c=[x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4 for x in c]
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def cr(a,b): la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+0.05)/(lb+0.05)
pairs=[('ink','bg',4.5),('ink','sf',4.5),('mu','sf',4.5),('mu','bg',4.5),('mu','sf2',4.5),('br','sf',4.5),('br','bg',4.5),('on-br','br',4.5),('br','br2',4.5),
('pt','bg',4.5),('pt','fd',4.5),('tr','bg',4.5),('tr','fd',4.5),('pti','ptf',4.5),('ptr','fd',3),('fl','fd',3),('tr','fd',3),('ok','oks',4.5),('al','als',4.5),('er','ers',4.5),('ink','br2',4.5),('hd-ink','hd',4.5),('pti','ptf',4.5),('ptr','fd',3),('fl','mapbg',3),('ink','mapbg',4.5),('pt','fd',4.5),('tr','fd',3),('ink','sf2',4.5),('br','sf2',4.5)]
bad=0
for name,t in [('claro',light),('escuro',dark),('sol',sun)]:
    for a,b,m in pairs:
        if a in t and b in t:
            r=cr(t[a],t[b])
            if r<m: bad+=1; print(f'{name}: {a} sobre {b} = {r:.2f} (mín {m})')
print('falhas:',bad)
sys.exit(1 if bad else 0)
