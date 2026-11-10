// Adaptador de leitura para o estudo r5. Não integra o runtime nem grava planos.
export const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
export function closestBorder(point,geom) {
  let best={metres:Infinity,xy:null};
  for(const poly of geom)for(const ring of poly)for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
    const t=length?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/length)):0;
    const xy=[a[0]+dx*t,a[1]+dy*t],metres=distance(point,xy);
    if(metres<best.metres)best={metres,xy};
  }
  return best;
}
export function buildMapScene(fields,plans,{id,kind,spacingM}) {
  const anchor=fields[0].centroidUTM;
  const members=fields.map((field,i)=>{
    const plan=plans[i],offset=field.centroidUTM.map((n,j)=>n-anchor[j]);
    const xy=p=>p.map((n,j)=>n+offset[j]);
    const geom=field.geom.map(poly=>poly.map(ring=>ring.map(xy)));
    const units=plan.units.map(u=>({id:field.key+'::'+u.id,sourceId:u.id,field:field.key,track:u.trackId,line:u.line.map(xy),lengthM:u.len}));
    const points=plan.samples.map(p=>({id:field.key+'::'+p.id,sourceId:p.id,number:p.number,field:field.key,unit:field.key+'::'+p.unitId,track:p.trackId,s:p.s,xy:xy([p.x,p.y]),border:closestBorder([p.x,p.y],field.geom)}));
    const byUnit=new Map();
    for(const p of points){p.border.xy=xy(p.border.xy);if(!byUnit.has(p.unit))byUnit.set(p.unit,[]);byUnit.get(p.unit).push(p);}
    for(const siblings of byUnit.values()){
      siblings.sort((a,b)=>a.s-b.s);
      for(const [n,p]of siblings.entries()){p.next=n+1<siblings.length?siblings[n+1].id:null;p.previous=n>0?siblings[n-1].id:null;p.nextM=p.next?distance(p.xy,siblings[n+1].xy):null;}
    }
    const gaps=points.filter(p=>p.nextM!==null).map(p=>p.nextM);
    const vertices=geom.flat(2),bounds=[Math.min(...vertices.map(p=>p[0])),Math.min(...vertices.map(p=>p[1])),Math.max(...vertices.map(p=>p[0])),Math.max(...vertices.map(p=>p[1]))];
    let across=null;
    const {u,v}=plan.frame,dot=(p,q)=>p[0]*q[0]+p[1]*q[1];
    for(let a=0;!across&&a<plan.units.length;a++)for(let b=a+1;!across&&b<plan.units.length;b++){
      const one=plan.units[a],two=plan.units[b];if(one.trackId===two.trackId)continue;
      const oa=dot(one.line[0],v),ob=dot(two.line[0],v);if(Math.abs(Math.abs(oa-ob)-spacingM)>.001)continue;
      const aa=one.line.map(p=>dot(p,u)),bb=two.line.map(p=>dot(p,u));
      const low=Math.max(Math.min(...aa),Math.min(...bb)),high=Math.min(Math.max(...aa),Math.max(...bb));if(high-low<50)continue;
      const t=low+.68*(high-low);across={a:xy([u[0]*t+v[0]*oa,u[1]*t+v[1]*oa]),b:xy([u[0]*t+v[0]*ob,u[1]*t+v[1]*ob]),metres:spacingM};
    }
    return {key:field.key,code:field.code,farm:field.farm,geom,units,points,bounds,across,minimum:plan.minPoints??plan.minimum,spacingM,along:gaps.length?[Math.min(...gaps),Math.max(...gaps)]:null};
  });
  const gaps=members.flatMap(m=>m.points.filter(p=>p.nextM!==null).map(p=>p.nextM));
  return {id,kind,members,spacingM,points:members.reduce((n,f)=>n+f.points.length,0),along:gaps.length?[Math.min(...gaps),Math.max(...gaps)]:null};
}
export function sceneView(scene,key=null) {
  const members=key?scene.members.filter(m=>m.key===key):scene.members;
  if(!members.length)throw Error('Lote não pertence à cena');
  return {...scene,members,points:members.reduce((n,m)=>n+m.points.length,0),along:key?members[0].along:scene.along};
}
