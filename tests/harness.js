const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const catalogue=['data.js','catalog-extra.js','catalog-v04.js','catalog-v05.js','catalog-shelves.js','profile-data.js','ratings-snapshot.js'];
function loadApp(overrides={}){
  const storage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
  const element={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}};
  const sandbox={console,setTimeout,clearTimeout,AbortController,URL,localStorage:storage,sessionStorage:storage,
    document:{querySelector:sel=>sel==='#app'?element:null,querySelectorAll:()=>[],addEventListener:()=>{}},
    window:{scrollTo:()=>{}},Image:class{},fetch:async()=>{throw Error('No network in regression checks');},...overrides};
  vm.createContext(sandbox);
  for(const f of catalogue)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox,{filename:f});
  let code=fs.readFileSync(process.env.APP_SOURCE||path.join(root,'app.js'),'utf8');
  code=code.replace(/  render\(\);\s*\}\)\(\);\s*$/,`  globalThis.testApp={state,FILMS,MOODS,VIBES,MOOD_MAP,CATEGORY_MAP,MOOD_GATES,VIBE_GATES,
    relevantToCategory,chooseResults,personalScore,movieKey,enrichFilm,preloadPoster,
    selectMetadata:typeof selectMetadata==='function'?selectMetadata:null,
    updateFilmPoster:typeof updateFilmPoster==='function'?updateFilmPoster:null,
    hydrateResultPosters,movieCard,getProfile,profileRecord,
    setRender(fn){renderResults=fn;},
    seed(value){let x=value;Math.random=()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296;};}};
})();`);
  vm.runInContext(code,sandbox,{filename:'app.js'});
  sandbox.testApp.setRender(()=>{});
  return sandbox.testApp;
}
module.exports={loadApp};
