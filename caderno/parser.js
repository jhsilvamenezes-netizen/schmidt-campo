/* SCHMIDT Caderno — leitor conservador de relatórios WhatsApp.
 * Não estima dose, área tratada nem unidade ausente. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CampoParser = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const RJ = new Set(['P', 'RA', 'RB', 'RC']);
  const BA = new Set(['BA', 'BB', 'BC', 'BD', 'BE']);
  const PRE = '(?:RA|RB|RC|BA|BB|BC|BD|BE|P)';
  const normalize = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  const deaccent = normalize;
  const digits = s => String(s || '').replace(/[^\d]/g, '');
  const isoDate = (v, fallbackYear = '2026') => {
    const m = String(v || '').match(/(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/);
    if (!m) return '';
    const y = m[3] ? (+m[3] < 100 ? 2000 + (+m[3]) : +m[3]) : +fallbackYear;
    const dt = new Date(Date.UTC(y, +m[2] - 1, +m[1]));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== +m[2] - 1 || dt.getUTCDate() !== +m[1]) return '';
    return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  };
  const lotFarm = lot => {
    const m = normalize(lot).match(/^([A-Z]+)\d+$/);
    return !m ? '' : BA.has(m[1]) ? 'Bananal' : RJ.has(m[1]) ? 'Rio de Janeiro' : '';
  };
  const parseLots = input => {
    let s = normalize(input).replace(/PIVOS?/g, 'P').replace(/[–—]/g, '-');
    const out = [];
    const add = (pref, nums) => {
      const p = pref.trim();
      let parts = [];
      let st = String(nums).replace(/\s/g, '').replace(/\//g, ',');
      for (const x of st.split(',')) {
        if (!x) continue;
        const range = x.match(/^([1-9])-([1-9])$/);
        if (range) {
          const a=+range[1],b=+range[2];
          for (let i=Math.min(a,b); i<=Math.max(a,b);i++) parts.push(i);
        } else if (/^[1-9]{2,}$/.test(x)) parts.push(...x.split('').map(Number));
        else if (/^[1-9]$/.test(x)) parts.push(+x);
      }
      for (const n of parts) { const val=p+n; if (!out.includes(val)) out.push(val); }
    };
    // Ex.: "RA - RB - RC 7, 8" = seis lotes.
    s = s.replace(/((?:RA|RB|RC|BA|BB|BC|BD|BE)(?:\s*-\s*(?:RA|RB|RC|BA|BB|BC|BD|BE))+)[\s:]+([1-9][\d,\s-]*)/g,(whole, pp, nn) => {
      const prefixes=pp.split(/\s*-\s*/);
      const last=nn.match(/^[\d,\s-]+/)[0];
      prefixes.forEach(p=>add(p,last));
      return ' ';
    });
    const re = new RegExp(`(${PRE})\\s*(\\d[\\d,\\s-]*)(?=\\s*(?:${PRE}|$|\\/))`, 'g');
    let m;
    while ((m=re.exec(s))) {
      let num=m[2].replace(/\s+/g,'');
      num=num.replace(/[-,]+$/,'');
      add(m[1], num);
    }
    // "BB1-BC1" é uma separação entre dois talhões, não um intervalo numérico.
    if (!out.length) {
      const fallback = new RegExp(`(${PRE})\\s*([1-9])`, 'g');
      while ((m=fallback.exec(s))) add(m[1],m[2]);
    }
    return out;
  };
  const lineProduct = raw => {
    let s = String(raw || '').replace(/\*/g,'').trim();
    if (!s || /^(?:-+|_+)$/.test(s)) return null;
    s=s.replace(/\s*[-_]{2,}\s*/g,'  ').replace(/\s*[:=]\s*/g,'  ');
    const m=s.match(/^(.+?)\s+([\d]+(?:[.,][\d]+)?)\s*(KG|G|ML|L|LT|LTS)?\s*$/i);
    if (!m) return null;
    const name=m[1].trim();
    if (!name || /^(?:DATA|OS|LOTE|HORIMETRO|PILOTO|AVIAO)/i.test(normalize(name))) return null;
    return {name, qty: m[2].replace(',','.'), unit: m[3] ? normalize(m[3]).replace(/^LTS?$/,'L') : ''};
  };
  const getField = (text, name) => {
    const e=new RegExp(`^\\s*\\*?\\s*${name}\\s*\\*?\\s*:\\s*\\*?\\s*(.+)$`,'im');
    const m=text.match(e);
    return m ? m[1].replace(/\*/g,'').trim() : '';
  };
  const section = (text, begin, finish) => {
    const lines=text.split(/\r?\n/), norm=lines.map(deaccent);
    const start=norm.findIndex(l=>begin.test(l));
    if(start<0)return [];
    let end=lines.length;
    for(let j=start+1;j<lines.length;j++)if(finish.test(norm[j])){end=j;break;}
    return lines.slice(start+1,end).map(lineProduct).filter(Boolean);
  };
  const matchName = (name, catalog = []) => {
    const k=normalize(name).replace(/[^A-Z0-9]/g,'');
    if(!k)return name;
    const aliases={'ZAPP':'Zapp SG','PROFOL':'Profol Produtividade','RADIANT':'Radiant 100','FOX X PRO':'Fox Xpro'};
    const alias=aliases[normalize(name)];
    if(alias) return catalog.find(p=>normalize(p.name)===normalize(alias))?.name || alias;
    for(const p of catalog) {
      const names=[p.name,...String(p.aliases||'').split(/[,;/]/)];
      if(names.some(x=>normalize(x).replace(/[^A-Z0-9]/g,'')===k)) return p.name;
    }
    return name.trim();
  };
  function parse(text, catalog=[]) {
    if(typeof text!=='string' || !text.trim()) return {error:'Cole um relatório de aplicação.'};
    const raw = text.trim();
    const firstReport = raw.match(/RELAT[OÓ]RIO DE APLICA[CÇ][AÃ]O/gi) || [];
    if(firstReport.length>1) return {error:'Há mais de um relatório. Cole uma OS de cada vez para conferir os dados.'};
    const osMatch = raw.match(/\bOS\s*\*?\s*:\s*\*?\s*(\d{1,8})/i) || raw.match(/\bOS\s*(\d{1,8})/i);
    const os = osMatch?.[1] || '';
    const lotText = getField(raw,'LOTE(?:S)?');
    const lots = parseLots(lotText);
    const inferred = [...new Set(lots.map(lotFarm).filter(Boolean))];
    const farm=inferred.length===1?inferred[0]:'';
    const start=isoDate(getField(raw,'Data\\s+de\\s+In[ií]cio'));
    const end=isoDate(getField(raw,'Data\\s+de\\s+T[eé]rmino'));
    const type=/APLICA[CÇ][AÃ]O\s+A[EÉ]REA/i.test(raw)?'Aérea':'Terrestre';
    const used=section(raw,/PRODUTOS\s+USADOS\s+NA\s+OS/,/SOBRA\s+DE\s+PRODUTOS|RELATORIO DE APLICACAO/);
    const left=section(raw,/SOBRA\s+DE\s+PRODUTOS\s+DA\s+OS/,/RELATORIO DE APLICACAO/);
    const products=used.map(p=>{
      const name=matchName(p.name,catalog);
      const remainder=left.find(q=>normalize(matchName(q.name,catalog))===normalize(name));
      return {name,dose:null,doseText:'',used:p.qty,usedUnit:p.unit,left:remainder?.qty??'',leftUnit:remainder?.unit??'',note:''};
    });
    const equipment={aircraft:getField(raw,'Avi[aã]o'),pilot:getField(raw,'Piloto'),meterStart:getField(raw,'Hor[ií]metro\\s+Inicial'),meterEnd:getField(raw,'Hor[ií]metro\\s+Final')};
    const warnings=[];
    if(!os) warnings.push('Número da OS não identificado.');
    if(!lotText||!lots.length) warnings.push('Talhões não identificados.');
    if(inferred.length>1)warnings.push('Lotes de fazendas diferentes: confirme antes de salvar.');
    if(!start||!end)warnings.push('Uma ou mais datas não foram identificadas.');
    if(start&&end&&start>end)warnings.push('A data de início é posterior ao término.');
    if(!products.length)warnings.push('Não foi possível identificar produtos e quantidades.');
    if(products.some(p=>!p.usedUnit))warnings.push('Há quantidades sem unidade no relatório original; não foram estimadas.');
    if(!left.length) warnings.push('Sobras não informadas; ficaram em branco.');
    if(type==='Aérea' && !equipment.aircraft)warnings.push('Identificação da aeronave não informada.');
    return {value:{os,farm,lots,start,end,type,products,notes:'',equipment,raw,complete:true,origin:'Relatório WhatsApp'},warnings};
  }
  return {parse,parseLots,lotFarm,isoDate,lineProduct,normalize,matchName};
});
