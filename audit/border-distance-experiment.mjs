// Experimento rejeitado: mais lento na base atual. Não integra o app.
export function schmidtBlockBorderDistance(geom, samples) {
  let minimum=Infinity;
  const segments=[];
  for (const poly of geom) for (const ring of poly) for (let i=0;i<ring.length;i++) {
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1];
    segments.push({a,dx,dy,len:dx*dx+dy*dy});
  }
  for (const p of samples) for (const {a,dx,dy,len} of segments) {
    const t=len?Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/len)):0;
    minimum=Math.min(minimum,Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy));
  }
  return Number.isFinite(minimum)?minimum:null;
}

