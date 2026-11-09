// Empacota o mesmo build revisado em pasta isolada. Não publica.
import { buildCandidate } from './build-preserved.mjs';
import { readFile,writeFile,mkdir,copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const release=JSON.parse(await readFile(root+'audit/block-candidate.json','utf8'));
const out=root+'../entregas-schmidt/'+release.directory+'/';
const built=await buildCandidate({includeBlocks:true});
await mkdir(out,{recursive:true});
await writeFile(out+'index.html',built.html);
await writeFile(out+'sw.js',built.worker);
const version={...JSON.parse(await readFile(root+'VERSAO.json','utf8')),entrega:release.version,versaoDoApp:release.version,runtimeBlocks:true,
  htmlSha256:createHash('sha256').update(built.html).digest('hex'),workerSha256:createHash('sha256').update(built.worker).digest('hex')};
await writeFile(out+'VERSAO.json',JSON.stringify(version,null,2)+'\n');
for(const name of ['manifest.webmanifest','icone.svg','icone-180.png','icone-192.png','icone-512.png'])await copyFile(root+name,out+name);
await writeFile(out+'CANDIDATA.json',JSON.stringify({version:release.version,production:false,
  htmlSha256:createHash('sha256').update(built.html).digest('hex'),changes:built.changes,
  originalDatasetsUnchanged:true,publishedSiteChanged:false,apkPublished:false},null,2)+'\n');
console.log(out);
