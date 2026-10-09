const fs = require('fs');
const vm = require('vm');

const shardIndex = Number(process.argv[2]);
const shardTotal = Number(process.argv[3]);
const output = process.argv[4] || ('rating-shard-' + shardIndex + '.json');
if(!Number.isInteger(shardIndex) || !Number.isInteger(shardTotal) || shardIndex < 0 || shardIndex >= shardTotal) {
  throw new Error('Usage: node snapshot-shard.js <index> <total> <output>');
}

const context={console};
vm.createContext(context);
for(const file of ['data.js','catalog-extra.js']) {
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
const FILMS=JSON.parse(vm.runInContext('JSON.stringify(FILMS)',context));

function movieKey(f){return f.title+'|'+f.year;}
function slugify(s){
  return String(s).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'')
    .replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
function parseCount(s=''){
  s=String(s).replace(/,/g,'').trim().toUpperCase();
  const n=parseFloat(s); if(!Number.isFinite(n)) return null;
  return s.endsWith('K')?n*1e3:s.endsWith('M')?n*1e6:s.endsWith('B')?n*1e9:n;
}
function parseRating(text){
  const avgMatch=text.match(/Weighted average of\s*([0-5](?:\.\d+)?)/i)
    || text.match(/Average:\s*([0-5](?:\.\d+)?)/i);
  if(!avgMatch) return null;
  const histogram=[];
  const rows=text.split(/\r?\n/).filter(line=>/^\|\s*(?:half-★|★+½?)\s*\|/.test(line));
  rows.forEach((line,i)=>{
    const m=line.match(/\[([\d,.]+\s*[KMB]?)\s+\((\d+(?:\.\d+)?)%\)\]/i);
    if(m) histogram.push({stars:(i+1)/2,percent:parseFloat(m[2]),count:parseCount(m[1])});
  });
  return {avg:parseFloat(avgMatch[1]),histogram};
}
function loadExisting(){
  if(!fs.existsSync('ratings-snapshot.js')) return {ratings:{}};
  const text=fs.readFileSync('ratings-snapshot.js','utf8');
  const m=text.match(/const LETTERBOXD_RATINGS_SNAPSHOT = (\{[\s\S]*\});?\s*$/);
  if(!m) return {ratings:{}};
  try{return JSON.parse(m[1]);}catch{return {ratings:{}};}
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let lastRequestAt=0;
async function readerFetch(url){
  const wait=Math.max(0,3150-(Date.now()-lastRequestAt));
  if(wait) await sleep(wait);
  lastRequestAt=Date.now();
  for(let attempt=1;attempt<=3;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),30000);
    try{
      const res=await fetch(url,{headers:{'Accept':'text/plain'},signal:controller.signal});
      const text=await res.text();
      clearTimeout(timer);
      if(res.ok && !/rate limit|too many requests/i.test(text)) return text;
      if(attempt<3) await sleep(4000*attempt);
    }catch(e){
      clearTimeout(timer);
      if(attempt===3) throw e;
      await sleep(4000*attempt);
    }
  }
  return '';
}
async function fetchRating(film){
  const base=film.slug||slugify(film.title);
  const candidates=film.slug
    ? [film.slug,film.slug+'-'+film.year]
    : [base+'-'+film.year,base];
  for(const slug of [...new Set(candidates)]){
    const target='https://letterboxd.com/csi/film/'+slug+'/rating-histogram/';
    try{
      const text=await readerFetch('https://r.jina.ai/'+target);
      const parsed=parseRating(text);
      if(parsed) return {...parsed,slug,fetchedAt:new Date().toISOString()};
    }catch(e){
      console.warn('Fetch error',film.title,slug,e.message);
    }
  }
  return null;
}

(async()=>{
  const existing=loadExisting().ratings||{};
  const refreshAll=process.env.REFRESH_ALL==='1';
  const mine=FILMS.filter((_,i)=>i%shardTotal===shardIndex)
    .filter(f=>refreshAll || !existing[movieKey(f)]);
  const ratings={},misses=[];
  console.log('Shard '+shardIndex+'/'+shardTotal+': '+mine.length+' films to fetch.');
  for(let i=0;i<mine.length;i++){
    const film=mine[i];
    const rating=await fetchRating(film);
    if(rating){
      ratings[movieKey(film)]=rating;
      console.log('OK',film.title,film.year,rating.avg);
    }else{
      misses.push(movieKey(film));
      console.warn('MISS',film.title,film.year);
    }
  }
  fs.writeFileSync(output,JSON.stringify({shardIndex,shardTotal,ratings,misses},null,2));
  console.log('Wrote '+output+': '+Object.keys(ratings).length+' ratings, '+misses.length+' misses.');
})().catch(e=>{console.error(e);process.exit(1);});
