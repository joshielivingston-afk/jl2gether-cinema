const fs = require('fs');
const vm = require('vm');

const context = { console };
vm.createContext(context);

for (const file of ['data.js', 'catalog-extra.js']) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const FILMS = JSON.parse(vm.runInContext('JSON.stringify(FILMS)', context));
const SNAPSHOT_PATH = 'ratings-snapshot.js';

function slugify(s) {
  return String(s).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
function movieKey(f) { return f.title + '|' + f.year; }
function parseCount(s='') {
  s=String(s).replace(/,/g,'').trim().toUpperCase();
  const n=parseFloat(s);
  if(!Number.isFinite(n)) return null;
  return s.endsWith('K')?n*1e3:s.endsWith('M')?n*1e6:s.endsWith('B')?n*1e9:n;
}
function stripTags(s='') {
  return s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ')
    .replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
}
function parseHistogram(html) {
  let avg=null;
  let m=html.match(/Weighted average of\s*([0-5](?:\.\d+)?)/i)
    || html.match(/class=["'][^"']*display-rating[^"']*["'][^>]*>\s*([0-5](?:\.\d+)?)/i)
    || html.match(/class=["'][^"']*average-rating[^"']*["'][^>]*>[\s\S]*?([0-5](?:\.\d+)?)/i);
  if(m) avg=parseFloat(m[1]);

  const histogram=[];
  const liRe=/<li[^>]*class=["'][^"']*rating-histogram-bar[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
  let li, i=0;
  while((li=liRe.exec(html))){
    const block=li[1];
    const title=(block.match(/(?:title|data-original-title)=["']([^"']+)["']/i)||[])[1] || stripTags(block);
    let pct=null,count=null;
    const pm=title.match(/(\d+(?:\.\d+)?)%/);
    if(pm) pct=parseFloat(pm[1]);
    const cm=title.match(/([\d,.]+\s*[KMB]?)\s+(?:ratings?|members?)/i);
    if(cm) count=parseCount(cm[1]);
    histogram.push({stars:(i+1)/2, percent:pct, count});
    i++;
  }
  if(!histogram.length){
    const rows=html.split(/\r?\n/).filter(line=>/^\|\s*(?:half-★|★+½?)\s*\|/.test(line));
    rows.forEach((line,i)=>{
      const m=line.match(/\[([\d,.]+\s*[KMB]?)\s+\((\d+(?:\.\d+)?)%\)\]/i);
      if(m) histogram.push({stars:(i+1)/2, percent:parseFloat(m[2]), count:parseCount(m[1])});
    });
  }
  return avg ? {avg, histogram} : null;
}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function fetchWithRetry(url, attempts=3) {
  for(let i=0;i<attempts;i++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    try {
      const res=await fetch(url,{
        headers:{
          'User-Agent':'Mozilla/5.0 (compatible; JL2GETHER-Rating-Snapshot/1.0)',
          'Accept':'text/html,application/xhtml+xml'
        },
        signal:controller.signal
      });
      clearTimeout(timer);
      if(res.ok) return res;
      if(res.status===429 || res.status>=500) await sleep(900*(i+1));
      else return res;
    } catch(e) {
      clearTimeout(timer);
      if(i===attempts-1) throw e;
      await sleep(900*(i+1));
    }
  }
}

async function fetchRating(film) {
  const base=film.slug || slugify(film.title);
  const candidates=[base, base + '-' + film.year];
  for(const slug of [...new Set(candidates)]){
    try{
      const res=await fetchWithRetry('https://r.jina.ai/https://letterboxd.com/csi/film/' + slug + '/rating-histogram/');
      if(res && res.ok){
        const parsed=parseHistogram(await res.text());
        if(parsed) return Object.assign(parsed,{slug});
      }
    }catch(e){}
  }
  return null;
}

function loadExisting() {
  if(!fs.existsSync(SNAPSHOT_PATH)) return {ratings:{}};
  const text=fs.readFileSync(SNAPSHOT_PATH,'utf8');
  const m=text.match(/const LETTERBOXD_RATINGS_SNAPSHOT = (\{[\s\S]*\});?\s*$/);
  if(!m) return {ratings:{}};
  try{return JSON.parse(m[1]);}catch{return {ratings:{}};}
}

async function main(){
  const refreshAll=process.argv.includes('--refresh-all');
  const existing=loadExisting();
  const ratings=Object.assign({},existing.ratings||{});
  const todo=FILMS.filter(f=>refreshAll || !ratings[movieKey(f)]);

  console.log('Catalogue: ' + FILMS.length + ' films. Fetching ' + todo.length + ' Letterboxd ratings.');

  let done=0, found=0;
  for(let i=0;i<todo.length;i+=4){
    const batch=todo.slice(i,i+4);
    const results=await Promise.all(batch.map(fetchRating));
    for(let j=0;j<batch.length;j++){
      const film=batch[j], rating=results[j];
      if(rating){
        ratings[movieKey(film)]=Object.assign({},rating,{fetchedAt:new Date().toISOString()});
        found++;
      } else {
        console.warn('No rating found: ' + film.title + ' (' + film.year + ')');
      }
      done++;
    }
    if(done%20===0 || done===todo.length) console.log(done + '/' + todo.length + ' checked; ' + found + ' found');
    await sleep(300);
  }

  const valid=new Set(FILMS.map(movieKey));
  for(const key of Object.keys(ratings)) if(!valid.has(key)) delete ratings[key];

  const snapshot={
    updatedAt:new Date().toISOString(),
    catalogueCount:FILMS.length,
    ratedCount:Object.keys(ratings).length,
    ratings
  };
  fs.writeFileSync(SNAPSHOT_PATH,'const LETTERBOXD_RATINGS_SNAPSHOT = ' + JSON.stringify(snapshot) + ';\n');
  console.log('Wrote ' + SNAPSHOT_PATH + ': ' + snapshot.ratedCount + '/' + snapshot.catalogueCount + ' ratings.');
}
main().catch(err=>{console.error(err);process.exit(1);});
