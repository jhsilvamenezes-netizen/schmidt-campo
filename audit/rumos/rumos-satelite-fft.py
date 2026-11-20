import json, numpy as np
from PIL import Image, ImageDraw, ImageFilter
r = json.load(open('/tmp/claude-0/sp/req.json'))
T = 256
out = []
for x in r:
    im = Image.open(f"/tmp/claude-0/sp/img/{x['id']}.jpg").convert('L'); W, H = im.size
    x0, y0, x1, y1 = x['box']; mx = (x1 - x0) / W; my = (y1 - y0) / H; m = (mx + my) / 2
    mask = Image.new('L', (W, H), 0); d = ImageDraw.Draw(mask)
    for pg in x['geom']:
        d.polygon([((p[0] - x0) / mx, (y1 - p[1]) / my) for p in pg[0]], fill=255)
        for hole in pg[1:]: d.polygon([((p[0] - x0) / mx, (y1 - p[1]) / my) for p in hole], fill=0)
    k = int(60 / m) | 1
    mk = np.array(mask.filter(ImageFilter.MinFilter(min(k, 61)))) > 0
    g = np.asarray(im, dtype=float)
    win = np.outer(np.hanning(T), np.hanning(T)); acc = np.zeros((T, T)); n = 0
    for i in range(0, H - T, T // 2):
        for j in range(0, W - T, T // 2):
            if mk[i:i+T, j:j+T].all():
                t = g[i:i+T, j:j+T]; t = (t - t.mean()) * win
                acc += np.abs(np.fft.fftshift(np.fft.fft2(t))) ** 2; n += 1
    if not n: out.append({'k': x['k'], 'n': 0}); continue
    f = np.fft.fftshift(np.fft.fftfreq(T, d=m)); FX, FY = np.meshgrid(f, f)
    R = np.hypot(FX, FY); P = np.where(R > 0, 1 / np.maximum(R, 1e-9), 0)
    # varredura de ângulo: soma da potência numa faixa de período 30–45 m (espaçamento da barra 36,48 m) e harmônica 18 m
    ang = (np.degrees(np.arctan2(FX, -FY)) + 180) % 180  # azimute do vetor de onda (leste=x, norte=-y)
    band = ((P > 30) & (P < 45)) | ((P > 16.5) & (P < 20))
    prof = np.array([acc[band & (np.minimum(abs(ang - a), 180 - abs(ang - a)) < 1.5)].sum() for a in range(180)])
    a = int(prof.argmax()); strength = prof.max() / np.median(prof)
    sel = band & (np.minimum(abs(ang - a), 180 - abs(ang - a)) < 1.5); pk = P[sel][acc[sel].argmax()]
    lines = (a + 90) % 180
    plan = ((x['bearing'] + x['corr']) % 180)
    diff = abs(lines - plan) % 180; diff = min(diff, 180 - diff)
    out.append({'k': x['k'], 'n': n, 'linhas': lines, 'plano': round(plan, 1), 'dif': round(diff, 1), 'forca': round(float(strength), 1), 'periodo': round(float(pk), 1), 'mpx': round(m, 2)})
json.dump(out, open('/tmp/claude-0/sp/fft.json', 'w'))
for o in sorted(out, key=lambda o: -o.get('dif', 99)):
    print(o)
