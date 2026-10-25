// Public movie metadata only. Keep stable title/year matches; never guess a remake.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({});
for(const f of ['data.js','catalog-extra.js','catalog-v04.js','catalog-v05.js','catalog-shelves.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const films=vm.runInContext('FILMS',ctx);
const output=path.join(root,'poster-snapshot.js');
const overrides=JSON.parse(fs.readFileSync(path.join(root,'poster-overrides.json'),'utf8'));
let snapshot={};
if(fs.existsSync(output)){vm.runInContext(fs.readFileSync(output,'utf8'),ctx);snapshot=vm.runInContext('POSTER_SNAPSHOT',ctx);}
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
async function json(url){const r=await fetch(url,{signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error(r.status);return r.json();}
async function lookup(f){
  const override=overrides[`${f.title}|${f.year}`];
  // IMDb suggestions are used at snapshot time; no browser CORS dependency.
  try{
    const data=await json(`https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(override?.imdbId||f.title.toLowerCase())}.json`);
    const m=(data.d||[]).find(m=>m.i?.imageUrl && (override?
      m.id===override.imdbId && m.l===override.providerTitle && Number(m.y)===override.providerYear:
      ['movie','tvMovie','short'].includes(m.qid)&&norm(m.l)===norm(f.title)&&Number(m.y)===f.year));
    if(m)return {poster:m.i.imageUrl.replace(/\._V1_.*\.jpg$/,'._V1_SX300.jpg'),imdbId:m.id,name:m.l};
  }catch{}
  try{
    const data=await json(`https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(f.title)}.json`);
    const m=(data.metas||[]).find(m=>m.type==='movie'&&norm(m.name)===norm(f.title)&&Number(m.year||String(m.releaseInfo||'').slice(0,4))===f.year&&m.poster);
    if(m)return {poster:m.poster,imdbId:m.imdb_id||m.id,name:m.name};
  }catch{}
  return null;
}
async function main(){
  let cursor=0,completed=0;
  const pending=films.filter(f=>{
    const key=`${f.title}|${f.year}`;
    return !snapshot[key]?.poster || (overrides[key] && snapshot[key].imdbId!==overrides[key].imdbId);
  });
  await Promise.all(Array.from({length:6},async()=>{
    while(cursor<pending.length){const f=pending[cursor++],m=await lookup(f);if(m)snapshot[`${f.title}|${f.year}`]=m;
      completed++;if(completed%100===0)console.log(`${completed}/${pending.length} looked up`);
    }
  }));
  const sorted=Object.fromEntries(Object.entries(snapshot).sort(([a],[b])=>a.localeCompare(b)));
  fs.writeFileSync(output,'// Exact title/year public poster metadata. Regenerate with npm run snapshot:posters.\nconst POSTER_SNAPSHOT = '+JSON.stringify(sorted,null,2)+';\n');
  console.log(`${Object.keys(snapshot).length}/${films.length} films have matched posters.`);
  console.log('Unmatched:',films.filter(f=>!snapshot[`${f.title}|${f.year}`]).map(f=>`${f.title} (${f.year})`).join('; '));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
