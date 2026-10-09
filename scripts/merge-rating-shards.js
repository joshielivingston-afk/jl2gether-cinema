const fs=require('fs');
const path=require('path');
const vm=require('vm');

const dir=process.argv[2]||'rating-parts';
const context={console}; vm.createContext(context);
for(const file of ['data.js','catalog-extra.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const FILMS=JSON.parse(vm.runInContext('JSON.stringify(FILMS)',context));
const valid=new Set(FILMS.map(f=>f.title+'|'+f.year));

let existing={ratings:{}};
if(fs.existsSync('ratings-snapshot.js')){
  const text=fs.readFileSync('ratings-snapshot.js','utf8');
  const m=text.match(/const LETTERBOXD_RATINGS_SNAPSHOT = (\{[\s\S]*\});?\s*$/);
  if(m){try{existing=JSON.parse(m[1]);}catch{}}
}
const ratings={...(existing.ratings||{})};
const misses=[];
for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort()){
  const part=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
  Object.assign(ratings,part.ratings||{});
  misses.push(...(part.misses||[]));
}
for(const key of Object.keys(ratings)) if(!valid.has(key)) delete ratings[key];

const snapshot={
  updatedAt:new Date().toISOString(),
  catalogueCount:FILMS.length,
  ratedCount:Object.keys(ratings).length,
  missing:[...new Set(misses)].filter(k=>!ratings[k]),
  ratings
};
fs.writeFileSync('ratings-snapshot.js','const LETTERBOXD_RATINGS_SNAPSHOT = '+JSON.stringify(snapshot)+';\n');
console.log('Merged snapshot:',snapshot.ratedCount+'/'+snapshot.catalogueCount,'ratings; misses:',snapshot.missing.length);
