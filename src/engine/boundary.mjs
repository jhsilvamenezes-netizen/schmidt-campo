// Motor espacial novo: coordenadas cartesianas em metros; nenhuma dependência DOM/estado.
// Snapshot privado da geometria: editar a entrada depois não invalida consultas em andamento.
// BVH exata para consultas em lote. Empates preservam a primeira aresta da entrada.
export function createSchmidtBoundaryIndex(geometry, { indexed = true } = {}) {
  const segments = [];
  for (const [polygon, rings] of geometry.entries()) for (const [ring, vertices] of rings.entries()) {
    for (let edge = 0; edge < vertices.length; edge++) {
      const a = vertices[edge], b = vertices[(edge + 1) % vertices.length];
      if (![a[0], a[1], b[0], b[1]].every(Number.isFinite)) throw new TypeError('Coordenada de borda inválida');
      segments.push({ ax:a[0], ay:a[1], bx:b[0], by:b[1], polygon, ring, edge, order:segments.length });
    }
  }
  const bounds = items => {
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    for(const s of items){x0=Math.min(x0,s.ax,s.bx);y0=Math.min(y0,s.ay,s.by);x1=Math.max(x1,s.ax,s.bx);y1=Math.max(y1,s.ay,s.by)}
    return {x0,y0,x1,y1};
  };
  const build = items => {
    const node=bounds(items);
    if(items.length<=8){node.items=items;return node}
    const x=node.x1-node.x0>=node.y1-node.y0;
    items.sort((a,b)=>(x?(a.ax+a.bx)-(b.ax+b.bx):(a.ay+a.by)-(b.ay+b.by))||a.order-b.order);
    const half=Math.floor(items.length/2);
    node.left=build(items.slice(0,half));node.right=build(items.slice(half));return node;
  };
  const tree=indexed&&segments.length>16?build([...segments]):null;
  const nearest = (point, stats) => {
    const [x,y]=point;
    if(!Number.isFinite(x)||!Number.isFinite(y))throw new TypeError('Ponto de consulta inválido');
    let best=null;
    const visit=s=>{
      if(stats)stats.segmentTests=(stats.segmentTests||0)+1;
      const dx=s.bx-s.ax,dy=s.by-s.ay,len=dx*dx+dy*dy;
      const t=len?Math.max(0,Math.min(1,((x-s.ax)*dx+(y-s.ay)*dy)/len)):0;
      const xy=[s.ax+t*dx,s.ay+t*dy],metres=Math.hypot(x-xy[0],y-xy[1]);
      if(!best||metres<best.metres||(metres===best.metres&&s.order<best.order))
        best={metres,xy,polygon:s.polygon,ring:s.ring,edge:s.edge,t,order:s.order};
    };
    const lower=n=>Math.hypot(Math.max(n.x0-x,0,x-n.x1),Math.max(n.y0-y,0,y-n.y1));
    const search=n=>{
      // Folga só na poda numérica, nunca na escolha/ordenação do resultado.
      const epsilon=32*Number.EPSILON*Math.max(1,Math.abs(x),Math.abs(y),Math.abs(n.x0),Math.abs(n.y0),Math.abs(n.x1),Math.abs(n.y1));
      if(best&&lower(n)>best.metres+epsilon)return;
      if(n.items){for(const s of n.items)visit(s);return}
      const leftFirst=lower(n.left)<=lower(n.right);
      search(leftFirst?n.left:n.right);search(leftFirst?n.right:n.left);
    };
    if(tree)search(tree);else for(const s of segments)visit(s);
    if(!best)return null;
    const {order,...result}=best;return result;
  };
  return Object.freeze({segmentCount:segments.length,nearest});
}

export function schmidtBoundaryMinimum(geometry, samples) {
  if(!samples?.length)return null;
  // Caminho escalar sem alocar resultados por ponto. O índice preparado é opt-in:
  // construir a BVH por chamada foi mais lento na base atual (benchmark documentado).
  let minimum=Infinity;
  for(const p of samples)for(const poly of geometry)for(const ring of poly)for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;
    const t=len?Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/len)):0;
    minimum=Math.min(minimum,Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy));
  }
  return Number.isFinite(minimum)?minimum:null;
}
