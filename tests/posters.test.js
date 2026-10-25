const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./harness');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.isConnected=true;this.listeners={};}
  addEventListener(name,fn){this.listeners[name]=fn;}
  getAttribute(name){return this[name]||null;}
  querySelector(selector){return this.children.find(c=>selector.includes(c.tag)||selector.includes('.'+c.className))||null;}
  querySelectorAll(){return this.children;}
  append(child){child.parentNode=this;this.children.push(child);}
  replaceWith(other){const p=this.parentNode;other.parentNode=p;p.children[p.children.indexOf(this)]=other;this.parentNode=null;}
}
function imageClass(mode='load'){
  return class{set src(url){this.url=url;queueMicrotask(()=>mode==='load'?this.onload?.():mode==='error'?this.onerror?.():null);}};
}
const f={title:'Good Time',year:2017,tags:[],affinity:{josh:0,julie:0}};
const result={type:'movie',name:'Good Time',year:2017,poster:'https://example.test/good.jpg'};
const response=metas=>({ok:true,json:async()=>({metas})});

test('bundled poster is available immediately without the metadata service',async()=>{
  const a=loadApp({POSTER_SNAPSHOT:{'Good Time|2017':result},fetch:()=>assert.fail('Bundled film fetched metadata')});
  assert.ok(a.movieCard(f).includes(result.poster));
  assert.equal((await a.enrichFilm(f)).poster,result.poster);
});

test('poster snapshot covers the catalogue and retains verified identities for aliases and remakes',()=>{
  const ctx=vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../poster-snapshot.js'),'utf8'),ctx);
  const snapshot=vm.runInContext('POSTER_SNAPSHOT',ctx),a=loadApp();
  assert.equal(Object.keys(snapshot).length,a.FILMS.length);
  for(const f of a.FILMS){const m=snapshot[a.movieKey(f)];assert.ok(m?.poster?.startsWith('https://'));assert.match(m.imdbId,/^tt\d+$/);}
  for(const [key,id] of Object.entries({'Shadows|1959':'tt0053270','Mirror|1975':'tt0072443','The Raid|2011':'tt1899353','The Night of Counting the Years|1969':'tt0064703'}))assert.equal(snapshot[key].imdbId,id,key);
});

test('metadata requires matching title and year; refuses wrong same-year hit and remakes',()=>{
  const a=loadApp();
  assert.equal(a.selectMetadata(f,[{...result,name:'Other movie'}, {...result,year:1971}]),null);
  assert.equal(a.selectMetadata(f,[{...result,name:'Other movie'},result]),result);
  assert.ok(a.selectMetadata({title:'Angel’s Egg',year:1985},[{type:'movie',name:"Angel's Egg",releaseInfo:'1985'}]));
});
test('concurrent metadata calls share one request and survive storage quota errors',async()=>{
  const pending=deferred();let count=0;
  const a=loadApp({fetch:()=>{count++;return pending.promise;},localStorage:{getItem:()=>null,setItem:()=>{throw Error('quota');}}});
  const first=a.enrichFilm(f),second=a.enrichFilm(f);assert.equal(count,1);
  pending.resolve(response([result]));
  assert.equal((await first).poster,result.poster);assert.equal((await second).poster,result.poster);
  assert.equal((await a.enrichFilm(f)).poster,result.poster);assert.equal(count,1);
});
test('failed metadata can be retried and never uses an unrelated first result',async()=>{
  let calls=0;const a=loadApp({fetch:async()=>response(++calls===1?[{...result,name:'Wrong'}]:[result])});
  assert.equal(await a.enrichFilm(f),null);assert.equal((await a.enrichFilm(f)).poster,result.poster);
});
test('metadata request aborts at deadline and clears in-flight request for retry',async()=>{
  const timers=[];let calls=0;
  const a=loadApp({setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout:()=>{},
    fetch:async(_,opts)=>{calls++;if(calls>1)return response([result]);return new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('abort'))));}});
  const pending=a.enrichFilm(f);timers[0]();assert.equal(await pending,null);
  assert.equal((await a.enrichFilm(f)).poster,result.poster);
});
test('image timeout resolves a stalled preload without blocking other films',async()=>{
  let expire;const a=loadApp({Image:imageClass('stall'),setTimeout:fn=>{expire=fn;return 1;},clearTimeout:()=>{}});
  const pending=a.preloadPoster(result.poster);expire();assert.equal(await pending,false);
});
test('one slow film cannot delay another card; hydration never rerenders results',async()=>{
  const slow=deferred();const g={...f,title:'Another Film'};
  const cards=[f,g].map(film=>{const c=new Element('article');c.dataset={key:film.title+'|'+film.year};const fallback=new Element();fallback.className='poster-fallback';c.append(fallback);return c;});
  const grid=new Element();grid.children=cards;
  const a=loadApp({Image:imageClass(),document:{querySelector:s=>s==='#posterGrid'?grid:new Element(),addEventListener:()=>{},createElement:t=>new Element(t)},
    fetch:async url=>url.includes('Good%20Time')?slow.promise:response([{...result,name:g.title}])});
  a.state.route='results';a.setRender(()=>assert.fail('Hydration rerendered results'));
  const pending=a.hydrateResultPosters([f,g]);
  await new Promise(setImmediate);
  assert.equal(cards[1].children[0].tag,'img');assert.equal(cards[0].children[0].className,'poster-fallback');
  slow.resolve(response([result]));await pending;
  assert.equal(cards[0].children[0].tag,'img');
});
test('late responses cannot paint a detached result card or closed modal',async()=>{
  const c=new Element();c.isConnected=false;const fallback=new Element();fallback.className='poster-fallback';c.append(fallback);
  const a=loadApp({Image:imageClass(),document:{querySelector:()=>new Element(),addEventListener:()=>{},createElement:t=>new Element(t)}});
  await a.updateFilmPoster(c,f,result);assert.equal(c.children[0],fallback);
});
test('broken cached poster returns to title fallback and clears dead URL',async()=>{
  const c=new Element();const img=new Element('img');img.src=result.poster;c.append(img);
  const a=loadApp({Image:imageClass('error'),document:{querySelector:()=>new Element(),addEventListener:()=>{},createElement:t=>new Element(t)}});
  a.state.metaCache['Good Time|2017']={...result};
  await a.updateFilmPoster(c,f,a.state.metaCache['Good Time|2017']);
  assert.equal(c.children[0].className,'poster-fallback');assert.equal(c.children[0].textContent,f.title);
  assert.equal(a.state.metaCache['Good Time|2017'].poster,null);
});
test('title quotes are escaped and poster errors use event handlers rather than inline code',()=>{
  const a=loadApp();const film={...f,title:'A "Quoted" & <Title>'};
  a.state.metaCache[a.movieKey(film)]={poster:result.poster};
  const html=a.movieCard(film);assert.ok(html.includes('&quot;Quoted&quot;'));assert.ok(!html.includes('onerror='));
});
