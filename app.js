(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const app = $('#app');

  const state = {
    viewer: localStorage.getItem('jl2.viewer') || null,
    route: 'home',
    category: null,
    results: [],
    revealMeta: {},
    revealRating: {},
    hideWatched: false,
    sort: 'fit',
    imported: {
      josh: loadJSON('jl2.import.josh', {}),
      julie: loadJSON('jl2.import.julie', {})
    },
    metaCache: loadJSON('jl2.meta', {}),
    ratingCache: loadJSON('jl2.lb', {}),
    resultSeed: Math.random(),
    seenHistory: (() => { try { return JSON.parse(sessionStorage.getItem('jl2.seen')||'{}'); } catch { return {}; } })(),
    reactions: loadJSON('jl2.reactions', {}),
    resultRoles: {},
    moodSelection: [],
    dealer: null
  };

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  }
  function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function slugify(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }

  function profileKey(title, year=null) {
    const base=String(title||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,"'").replace(/[–—]/g,'-').replace(/[^a-z0-9]+/g,'');
    return year ? `${base}|${Number(year)}` : base;
  }

  function builtinProfile(viewer) {
    return (typeof BUILTIN_PROFILE_SNAPSHOT!=='undefined' && BUILTIN_PROFILE_SNAPSHOT[viewer]) || {stats:{},films:{},tagTaste:{}};
  }

  function profileRecord(viewer, film) {
    if(!viewer || viewer==='both') return null;
    const key=profileKey(film.title,film.year);
    const base=builtinProfile(viewer).films?.[key] || null;
    const db=state.imported[viewer]||{};
    let local=db[key] || db[`${film.title.toLowerCase()}|${film.year}`] || db[film.title.toLowerCase()] || null;
    if(local && local.watched==null && (local.watches||local.lastWatched||local.rating!=null)) local={...local,watched:true};
    if(!base) return local;
    if(!local) return base;
    return {
      ...base,...local,
      lists:[...new Set([...(base.lists||[]),...(local.lists||[])])],
      watched:!!(base.watched||local.watched),
      liked:!!(base.liked||local.liked),
      watchlist:!!(base.watchlist||local.watchlist),
      favorite:!!(base.favorite||local.favorite)
    };
  }

  function getProfile(viewer=state.viewer) {
    const blendTaste=(who)=>{
      const seed=PROFILE_SEEDS[who];
      const hist=builtinProfile(who).tagTaste||{};
      const keys=new Set([...Object.keys(seed.taste),...Object.keys(hist)]);
      return Object.fromEntries([...keys].map(k=>[k,Math.max(0,(seed.taste[k]||0)+(hist[k]?.bias||0)*.85)]));
    };
    if (viewer === 'both') {
      const jt=blendTaste('josh'), ut=blendTaste('julie');
      return {
        label:'JL²GETHER', alias:'Joshie + Julie',
        favorites:[...new Set([...PROFILE_SEEDS.josh.favorites,...PROFILE_SEEDS.julie.favorites])],
        taste:Object.fromEntries([...new Set([...Object.keys(jt),...Object.keys(ut)])].map(k => [k,(jt[k]||0)*.65+(ut[k]||0)*.35]))
      };
    }
    return {...PROFILE_SEEDS[viewer],taste:blendTaste(viewer)};
  }

  function watchedInfo(film) {
    if (state.viewer === 'both') {
      const j = profileRecord('josh',film), u = profileRecord('julie',film);
      const jw=!!j?.watched, uw=!!u?.watched;
      return { watched:jw||uw, josh:j, julie:u, both:jw&&uw };
    }
    const r = profileRecord(state.viewer,film);
    return { watched:!!r?.watched, [state.viewer]:r };
  }

  const STRONG_LISTS={
    josh:{'joshs-top-films':3.5,'worth-a-rewatch':1.8,'essential-y2k-vibes':1.4},
    julie:{'favs':3.5,'dream-a-little-dream-of-me':1.0}
  };

  function recordStrength(who, film) {
    const r=profileRecord(who,film); if(!r) return 0;
    const mean=Number(builtinProfile(who).stats?.ratingMean||4);
    let s=0;
    if(Number.isFinite(Number(r.rating))){
      const rating=Number(r.rating);
      s+=(rating-mean)*2.8;
      if(rating>=4.5)s+=1.1;
      if(rating<3)s-=4.5;
    }
    if(r.liked)s+=.9;
    if(r.favorite)s+=3.6;
    if(r.watchlist && !r.watched)s+=1.35;
    for(const list of (r.lists||[])) s+=(STRONG_LISTS[who]?.[list]||.12);
    return s;
  }

  function recencyBonus(record) {
    // Only true diary watch dates qualify. The baked 2026 exports have no diary rows,
    // so snapshot "Date" fields are deliberately not treated as watch dates.
    if (!record?.lastWatched) return 0;
    const years = (Date.now() - new Date(record.lastWatched).getTime()) / 31557600000;
    if (years > 5) return .7;
    if (years > 3) return .45;
    if (years > 1.5) return .2;
    return -.8;
  }

  function nostalgiaMode(){ const ids=state.category?.moodIds||[state.category?.id]; return ids.some(id=>['nostalgic','homesick'].includes(id)); }

  function reactionKey(film, viewer=state.viewer){ return `${viewer||'none'}|${movieKey(film)}`; }
  
  function getReaction(film){ return state.reactions[reactionKey(film)] || null; }
  
  function storeReaction(film, value){
    const key=reactionKey(film), old=state.reactions[key]||{};
    state.reactions[key]={...old,viewer:state.viewer,filmKey:movieKey(film),tags:[...(film.tags||[])],value,updatedAt:new Date().toISOString()};
    saveJSON('jl2.reactions',state.reactions);
  }
  
  function toggleReactionReason(film, reason){
    const key=reactionKey(film), old=state.reactions[key]||{viewer:state.viewer,filmKey:movieKey(film),tags:[...(film.tags||[])],value:null};
    const reasons=new Set(old.reasons||[]);
    if(reasons.has(reason))reasons.delete(reason);else reasons.add(reason);
    state.reactions[key]={...old,reasons:[...reasons],updatedAt:new Date().toISOString()};
    saveJSON('jl2.reactions',state.reactions);
  }
  
  function feedbackScore(film){
    const weights={loved:1.55,good:.65,meh:-.45,bad:-1.5};
    let score=0;
    for(const r of Object.values(state.reactions||{})){
      if(r.viewer!==state.viewer || !r.value || r.filmKey===movieKey(film))continue;
      const overlap=(film.tags||[]).filter(t=>(r.tags||[]).includes(t)).length;
      score+=overlap*(weights[r.value]||0)*.42;
      if((r.reasons||[]).includes('more-like-this'))score+=overlap*.55;
      if((r.reasons||[]).includes('atmosphere')){
        const atmospheric=new Set(['liminal','dream','night-city','beautiful-damage','esoteric','underground','cosmic','surreal']);
        score+=(film.tags||[]).filter(t=>atmospheric.has(t)&&(r.tags||[]).includes(t)).length*.45;
      }
      if((r.reasons||[]).includes('too-slow') && hasAny(film,['slow','meditative','liminal']))score-=.8;
      if((r.reasons||[]).includes('too-obvious') && (getCachedRating(film)?.avg||0)>=4.05)score-=.35;
      // "wrong mood" is deliberately not learned as a permanent dislike.
    }
    return Math.max(-6,Math.min(6,score));
  }
  
  function individualFit(who,film,tags=[]){
    const r=profileRecord(who,film);
    let score=(film.affinity?.[who]||0)*1.2+recordStrength(who,film)*1.15;
    for(const t of tags) if(film.tags.includes(t)) score+=2.5;
    if(!r?.watched)score+=1.1;
    if(r?.watched && Number(r.rating||0)<3)score-=5;
    if(r?.favorite)score+=2;
    return score;
  }
  
  function pickJointRoleFilms(pool,tags){
    const roles=[
      ['The Bridge',f=>Math.min(individualFit('josh',f,tags),individualFit('julie',f,tags))*1.2 + (profileRecord('josh',f)?.watched&&profileRecord('julie',f)?.watched?1:0)],
      ['Joshie’s Case for Julie',f=>individualFit('josh',f,tags)*1.2+individualFit('julie',f,tags)*.28+(Number(profileRecord('josh',f)?.rating||0)>=4?2.2:0)+(!profileRecord('julie',f)?.watched?1:0)],
      ['Julie’s Case for Joshie',f=>individualFit('julie',f,tags)*1.2+individualFit('josh',f,tags)*.28+(Number(profileRecord('julie',f)?.rating||0)>=4?2.2:0)+(!profileRecord('josh',f)?.watched?1:0)],
      ['Mutual Wildcard',f=>(!profileRecord('josh',f)?.watched&&!profileRecord('julie',f)?.watched?2.5:0)+hasAny(f,['weird','underground','esoteric','dream','experimental'])*2+(individualFit('josh',f,tags)+individualFit('julie',f,tags))*.3],
      ['Safest Bet',f=>individualFit('josh',f,tags)+individualFit('julie',f,tags)+(getCachedRating(f)?.avg||3.4)*.55]
    ];
    const chosen=[], used=new Set(); state.resultRoles={};
    for(const [role,fn] of roles){
      const ranked=pool.filter(f=>!used.has(movieKey(f))).map(f=>({f,score:fn(f)+Math.random()*.8})).sort((a,b)=>b.score-a.score);
      if(!ranked.length)continue;
      const top=ranked.slice(0,Math.min(5,ranked.length));
      const pick=top[Math.floor(Math.random()*Math.min(3,top.length))]?.f||ranked[0].f;
      chosen.push(pick); used.add(movieKey(pick)); state.resultRoles[movieKey(pick)]=role;
    }
    return chosen;
  }
  
  function referenceFilms(who,film){
    return FILMS.map(x=>{
      if(x===film)return null;
      const r=profileRecord(who,x);
      if(!r?.watched || (!r.liked && Number(r.rating||0)<4 && !r.favorite))return null;
      const overlap=(x.tags||[]).filter(t=>(film.tags||[]).includes(t)).length;
      if(!overlap)return null;
      return {film:x,record:r,score:overlap*2+recordStrength(who,x)};
    }).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,2);
  }
  
  function whyThisFilm(f){
    const role=state.resultRoles[movieKey(f)];
    const roleText={
      'The Bridge':'This is the bridge pick: unusually strong terrain for both of you.',
      'Joshie’s Case for Julie':'This is Joshie’s case for Julie: it leans toward Joshie’s proven territory without abandoning Julie’s signal.',
      'Julie’s Case for Joshie':'This is Julie’s case for Joshie: it leans toward Julie’s proven territory while keeping a foothold in Joshie’s.',
      'Mutual Wildcard':'This is the mutual wildcard: less proven, more exploratory, but still connected to both profiles.',
      'Safest Bet':'This is the safest bet: the broadest combined fit in this batch.'
    };
    const describe=(who,label)=>{
      const refs=referenceFilms(who,f);
      if(!refs.length)return null;
      return `${label}: ${refs.map(x=>`${x.film.title}${x.record.rating?` (${x.record.rating}★)`:''}`).join(' + ')}`;
    };
    if(state.viewer==='both'){
      const bits=[roleText[role],describe('josh','Joshie trail'),describe('julie','Julie trail')].filter(Boolean);
      return bits.join(' ');
    }
    const refs=referenceFilms(state.viewer,f);
    const who=state.viewer==='josh'?'Joshie':'Julie';
    if(refs.length) return `${who} trail: ${refs.map(x=>`${x.film.title}${x.record.rating?` (${x.record.rating}★)`:''}`).join(' + ')} share the strongest taste signals with this one.`;
    return `This one rose through ${who}’s profile from its ${f.tags.slice(0,3).join(', ')} signals rather than general popularity.`;
  }

  function personalScore(film, desiredTags=[]) {
    const profile = getProfile();
    let s = 0;
    // Category relevance is gated elsewhere; taste only ranks films inside the room.
    for (const t of film.tags) s += (profile.taste[t] || 0) * .43;
    for (const t of desiredTags) if (film.tags.includes(t)) s += 4.4;

    if (state.viewer === 'both') {
      const j=profileRecord('josh',film), u=profileRecord('julie',film);
      const js=recordStrength('josh',film), us=recordStrength('julie',film);
      s += film.affinity.josh * 1.05 + film.affinity.julie * .72;
      s += js*1.05 + us*.72;
      if(j?.watched && u?.watched){
        const jr=Number(j.rating||0), ur=Number(u.rating||0);
        if(jr>=4 && ur>=4)s+=nostalgiaMode()?5.2:1.2;
        if((jr&&jr<3)||(ur&&ur<3))s-=5.5;
      } else if(j?.watched || u?.watched) {
        const seen=j?.watched?j:u, unseen=j?.watched?u:j;
        if(Number(seen?.rating)>=4)s+=2.4; // one can show the other a proven favorite
        if(unseen?.watchlist)s+=1.8;
      } else {
        s+=2.4;
        if(j?.watchlist)s+=.8;
        if(u?.watchlist)s+=.7;
      }
    } else {
      const who=state.viewer, other=who==='josh'?'julie':'josh';
      const own = film.affinity[who] || 0;
      const otherAffinity = film.affinity[other] || 0;
      s += own * 1.25 + recordStrength(who,film)*1.45;
      if (otherAffinity - own >= 2) s -= 1.1;
      if (own - otherAffinity >= 2) s += .7;

      const r=profileRecord(who,film);
      if(r?.watched){
        const rating=Number(r.rating||0);
        if(nostalgiaMode()){
          if(rating>=4.5)s+=5.5;
          else if(rating>=4)s+=3.2;
          if(r.favorite)s+=2.5;
          if((r.lists||[]).some(x=>STRONG_LISTS[who]?.[x]))s+=1.4;
        } else {
          if(rating>=4.5)s+=.8;
          if(rating&&rating<3)s-=6;
        }
        s+=recencyBonus(r);
      } else {
        s+=2.5;
        if(r?.watchlist)s+=1.2;
      }
    }
    s += feedbackScore(film);
    return s;
  }

  function seededShuffle(arr) {
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  const GENERIC_SIMILAR_TAGS = new Set(['90s','2000s','2010s','2020s','dark','tender','stylish','playful']);
  const VIBE_GATES = {
    '25th-hour': f => hasAny(f,['25th-hour','dream','liminal']),
    'unwatchable': f => f.tags.includes('unwatchable'),
    'c-films': f => f.tags.includes('c-films'),
    'y2k-club': f => f.tags.includes('y2k-club'),
    '90s-kinetic': f => f.tags.includes('90s') && hasAny(f,['kinetic','counterculture','weird','y2k','cyber']),
    '70s-rocket': f => f.tags.includes('70s') && hasAny(f,['kinetic','rocket-fuel','crime','paranoid','angry']),
    'liminal': f => f.tags.includes('liminal'),
    'dream-logic': f => f.tags.includes('dream'),
    'rocket-fuel': f => hasAny(f,['rocket-fuel','kinetic','elegant-panic']),
    'brainfuck': f => f.tags.includes('brainfuck'),
    'esoteric': f => hasAny(f,['esoteric','underground']),
    'docs-inspire': f => hasAny(f,['docs-inspire','documentary']) && !f.tags.includes('docs-weird'),
    'docs-weird': f => f.tags.includes('docs-weird'),
    'underground-art': f => f.tags.includes('underground'),
    'night-city': f => f.tags.includes('night-city'),
    'beautiful-damage': f => f.tags.includes('beautiful-damage'),
    'tender-weirdos': f => f.tags.includes('tender-weirdos') || (f.tags.includes('tender') && f.tags.includes('weird')),
    'end-times': f => f.tags.includes('end-times'),
    'elegant-panic': f => f.tags.includes('elegant-panic') || (f.tags.includes('kinetic') && hasAny(f,['stylish','night-city','crime']))
  };
  function hasAny(f,tags){ return tags.some(t=>f.tags.includes(t)); }
  function relevantToCategory(film,tags){
    const c=state.category;
    if(!c || c.type==='random' || c.type==='decade' || c.type==='director') return true;
    if(c.type==='vibe') return (VIBE_GATES[c.id] || (x=>hasAny(x,tags)))(film);
    if(c.type==='mood') { const groups=c.tagGroups||[]; return groups.length>1 ? groups.every(g=>hasAny(film,g)) : hasAny(film,tags); }
    if(c.type==='similar') {
      const anchor=FILMS.find(x=>x.title===c.id);
      if(!anchor) return true;
      const signature=anchor.tags.filter(t=>!GENERIC_SIMILAR_TAGS.has(t));
      return hasAny(film, signature.length ? signature : anchor.tags);
    }
    return true;
  }
  function historyKey(){ const c=state.category||{}; return `${state.viewer}|${c.type||'random'}|${c.id||c.label||'all'}`; }
  function rememberResults(films){
    const k=historyKey(), old=state.seenHistory[k]||[];
    state.seenHistory[k]=[...films.map(movieKey),...old.filter(x=>!films.some(f=>movieKey(f)===x))].slice(0,24);
    try { sessionStorage.setItem('jl2.seen',JSON.stringify(state.seenHistory)); } catch {}
  }

  function chooseResults(tags, predicate=()=>true) {
    let pool = FILMS.filter(predicate).filter(f=>relevantToCategory(f,tags));
    if(pool.length<5 && state.category?.type==='mood' && (state.category?.tagGroups||[]).length>1){
      pool=FILMS.filter(predicate).filter(f=>hasAny(f,tags));
    }
    if (state.hideWatched) pool = pool.filter(f=>!watchedInfo(f).watched);
  
    const recent = new Set(state.seenHistory[historyKey()]||[]);
    let fresh = pool.filter(f=>!recent.has(movieKey(f)));
    if (fresh.length < 5) {
      const keepLast = new Set((state.seenHistory[historyKey()]||[]).slice(0,5));
      fresh = pool.filter(f=>!keepLast.has(movieKey(f)));
    }
    if (fresh.length < 5) fresh = pool;
  
    let chosen;
    state.resultRoles={};
    if(state.viewer==='both' && fresh.length>=5){
      chosen=pickJointRoleFilms(fresh,tags);
    } else {
      let scored = fresh.map(f=>({film:f,score:personalScore(f,tags)})).sort((a,b)=>b.score-a.score);
      const windowSize=Math.min(scored.length, Math.max(18, Math.ceil(scored.length*.42)));
      const window=scored.slice(0,windowSize).map(x=>x.film);
      chosen=diversify(weightedShuffle(window, tags),5);
    }
  
    if (state.sort === 'rating') chosen.sort((a,b)=>(getCachedRating(b)?.avg||0)-(getCachedRating(a)?.avg||0));
    if (state.sort === 'cult') chosen.sort((a,b)=>cultHeat(b)-cultHeat(a));
    if (state.sort === 'year-new') chosen.sort((a,b)=>b.year-a.year);
    if (state.sort === 'year-old') chosen.sort((a,b)=>a.year-b.year);
    state.results = chosen.slice(0,5);
    rememberResults(state.results);
    renderResults();
    state.results.forEach(enrichFilm);
  }

  function weightedShuffle(pool,tags){
    return [...pool]
      .map(f=>({f, key: Math.random() + Math.min(2,personalScore(f,tags)/40)}))
      .sort((a,b)=>b.key-a.key)
      .map(x=>x.f);
  }

  function diversify(pool,n) {
    const out=[]; const directorCount={};
    for(const f of pool) {
      const d=f.director.split(',')[0];
      if ((directorCount[d]||0)>=1 && out.length<n-1) continue;
      out.push(f); directorCount[d]=(directorCount[d]||0)+1;
      if(out.length>=n) break;
    }
    return out;
  }

  function getCachedRating(film){
    const snap=(typeof LETTERBOXD_RATINGS_SNAPSHOT!=='undefined' && LETTERBOXD_RATINGS_SNAPSHOT.ratings?.[movieKey(film)]) || null;
    return snap || state.ratingCache[film.slug||slugify(film.title)] || null;
  }
  function cultHeat(film) {
    const r=getCachedRating(film); if(!r) return 0;
    const five=(r.histogram||[]).find(x=>x.stars===5)?.percent||0;
    return (r.avg||0)+five/20;
  }

  function renderShell(inner) {
    app.innerHTML = `
      <div class="shell">
        <header class="topbar">
          <div class="brand" id="brand"><h1>JL²GETHER</h1><small>the back room</small></div>
          <div class="header-actions">
            ${state.viewer ? `<button class="tiny-btn" id="switchViewer">${getProfile().label}</button>` : ''}
            <button class="icon-btn" id="settingsBtn" aria-label="Settings">⚙</button>
          </div>
        </header>
        ${inner}
        <div class="footer">A private taste engine. Imported Letterboxd data stays in this browser. Posters and metadata are fetched only when needed; Letterboxd averages come from a baked snapshot refreshed from GitHub.</div>
      </div>`;
    $('#brand')?.addEventListener('click',()=>{state.route=state.viewer?'home':'landing';render();});
    $('#switchViewer')?.addEventListener('click',()=>{state.viewer=null;localStorage.removeItem('jl2.viewer');state.route='landing';render();});
    $('#settingsBtn')?.addEventListener('click',()=>{state.route='settings';render();});
  }

  function renderLanding(){
    renderShell(`
      <section class="hero">
        <div class="eyebrow">down the alley · third door · basement level</div>
        <h2>Who’s in the theater?</h2>
        <p>The projector already knows the catalog. You tell it who showed up.</p>
      </section>
      <section class="viewer-grid">
        ${viewerCard('josh','Joshie','Bubble','Stranger, deeper, more liminal; 90s electricity welcome.')}
        ${viewerCard('julie','Julie','Birdie','Emotional, stylish, kinetic, darkly funny; no dead air.')}
        ${viewerCard('both','JL²GETHER','Joshie + Julie','Shared frequency, weighted a little toward Joshie.')}
      </section>`);
    $$('.viewer-card').forEach(b=>b.addEventListener('click',()=>{state.viewer=b.dataset.viewer;localStorage.setItem('jl2.viewer',state.viewer);state.route='home';render();}));
  }
  function viewerCard(id,name,alias,note){return `<button class="viewer-card" data-viewer="${id}"><span class="viewer-name">${name}</span><span class="viewer-note">${note}</span><span class="viewer-alias">${alias}</span></button>`}

  function renderHome(){
    const p=getProfile();
    renderShell(`
      <section class="room">
        <div class="room-head"><div><div class="viewer-pill">Tonight: ${p.label}</div><h2>Pick the doorway.</h2></div><p>Five films at a time. Back out and enter again to reshuffle the room.</p></div>
        <div class="route-grid-primary">
          ${routeCard('mood','☁','Mood','What does the movie need to do to you tonight?','hero-route')}
          ${routeCard('vibe','◉','Vibe','Enter one of the strange rooms behind the screen.','hero-route')}
        </div>
        <div class="route-grid-secondary">
          ${routeCard('similar','≈','Similar movie','Start from a film.','small-route')}
          ${routeCard('decade','⌛','Decade','Choose an era.','small-route')}
          ${routeCard('director','🎬','Directors','Follow an auteur.','small-route')}
        </div>
        <button class="route-card dealer-route" data-route="random"><span><span class="glyph">🎟</span><h3>Dealer’s choice</h3><p>Give the projectionist the keys.</p></span><span>→</span></button>
      </section>`);
    $$('.route-card').forEach(b=>b.addEventListener('click',()=>{const r=b.dataset.route;if(r==='random'){state.route='dealer';state.dealer={strikes:0,film:null,revealed:false};renderDealer();}else{state.route=r;render();}}));
  }
  function routeCard(id,glyph,title,desc,klass=''){return `<button class="route-card ${klass}" data-route="${id}"><span class="glyph">${glyph}</span><h3>${title}</h3><p>${desc}</p></button>`}

  function renderMoodMixer(){
    const selected=state.moodSelection||[];
    renderShell(`<section class="room"><div class="room-head"><div><div class="viewer-pill">${getProfile().label}</div><h2>What are you feeling?</h2></div><p>Pick one mood, or collide two of them. The stranger intersections are often the good ones.</p></div>
      <div class="choice-grid">${MOODS.map(([id,label,emoji,note])=>`<button class="choice mood-choice ${selected.includes(id)?'selected':''}" data-id="${escapeAttr(id)}"><span class="emoji">${emoji}</span><strong>${label}</strong><small>${note}</small></button>`).join('')}</div>
      <div class="mood-mixer-bar"><span id="moodMixReadout">${selected.length?selected.map(id=>MOODS.find(x=>x[0]===id)?.[1]).join(' + '):'choose one or two'}</span><button class="primary-btn" id="enterMood" ${selected.length?'':'disabled'}>enter this mood →</button></div>
    </section>`);
    $('.mood-choice').forEach(btn=>btn.addEventListener('click',()=>{
      const id=btn.dataset.id, arr=[...(state.moodSelection||[])], i=arr.indexOf(id);
      if(i>=0)arr.splice(i,1); else { if(arr.length>=2)arr.shift(); arr.push(id); }
      state.moodSelection=arr; renderMoodMixer();
    }));
    $('#enterMood')?.addEventListener('click',()=>{
      const ids=[...(state.moodSelection||[])]; if(!ids.length)return;
      const items=ids.map(id=>MOODS.find(x=>x[0]===id)).filter(Boolean);
      const groups=ids.map(id=>MOOD_MAP[id]||[]);
      state.category={type:'mood',label:items.map(x=>x[1]).join(' + '),id:ids.join('+'),moodIds:ids,tagGroups:groups,tags:[...new Set(groups.flat())]};
      state.route='results'; chooseResults(state.category.tags);
    });
  }

  function renderChoices(type,title,subtitle,items){
    renderShell(`<section class="room"><div class="room-head"><div><div class="viewer-pill">${getProfile().label}</div><h2>${title}</h2></div><p>${subtitle}</p></div><div class="choice-grid">${items.map(([id,label,emoji,note])=>`<button class="choice" data-id="${escapeAttr(id)}"><span class="emoji">${emoji||'•'}</span><strong>${label}</strong><small>${note||''}</small></button>`).join('')}</div></section>`);
    $$('.choice').forEach(btn=>btn.addEventListener('click',()=>openChoice(type,btn.dataset.id)));
  }

  function openChoice(type,id){
    if(type==='mood'){
      const item=MOODS.find(x=>x[0]===id); state.category={type,label:item[1],id,tags:MOOD_MAP[id]||[]}; state.route='results'; chooseResults(state.category.tags); return;
    }
    if(type==='vibe'){
      const item=VIBES.find(x=>x[0]===id); state.category={type,label:item[1],id,tags:CATEGORY_MAP[id]||[]}; state.route='results'; chooseResults(state.category.tags); return;
    }
    if(type==='decade'){
      const start=Number(id.slice(0,4)); state.category={type,label:id,id,tags:[]}; state.route='results'; chooseResults([],f=>f.year>=start&&f.year<start+10); return;
    }
    if(type==='director'){
      state.category={type,label:id,id,tags:[]}; state.route='results'; chooseResults([],f=>directorMatches(f,id)); return;
    }
    if(type==='similar'){
      const anchor=FILMS.find(f=>f.title===id); const tags=anchor?.tags||[]; state.category={type,label:`Like ${id}`,id,tags}; state.route='results'; chooseResults(tags,f=>f.title!==id); return;
    }
  }

  function anchorScore(f,viewer=state.viewer){
    if(viewer==='both'){
      const j=profileRecord('josh',f),u=profileRecord('julie',f);
      const shared=(j?.watched&&u?.watched&&Number(j.rating||0)>=4&&Number(u.rating||0)>=4)?5:0;
      return recordStrength('josh',f)*.65+recordStrength('julie',f)*.35+shared+Math.min(f.affinity.josh,f.affinity.julie)*.6;
    }
    const r=profileRecord(viewer,f);
    if(!r?.watched) return -99;
    return recordStrength(viewer,f)*1.7+(f.affinity[viewer]||0);
  }

  function dynamicAnchors(viewer=state.viewer){
    let pool=FILMS.map(f=>({f,score:anchorScore(f,viewer)})).filter(x=>x.score>1.5).sort((a,b)=>b.score-a.score).slice(0,90);
    pool=seededShuffle(pool.slice(0,Math.min(pool.length,60))).concat(pool.slice(60));
    const out=[],decades={},directors={},tagUse={};
    for(const {f} of pool){
      const decade=Math.floor(f.year/10)*10;
      const director=f.director.split(',')[0].trim();
      const signature=f.tags.find(t=>!['90s','2000s','2010s','2020s','dark','tender','playful','stylish'].includes(t))||f.tags[0]||'misc';
      if((decades[decade]||0)>=3)continue;
      if((directors[director]||0)>=1)continue;
      if((tagUse[signature]||0)>=3)continue;
      out.push(f.title);
      decades[decade]=(decades[decade]||0)+1;
      directors[director]=(directors[director]||0)+1;
      tagUse[signature]=(tagUse[signature]||0)+1;
      if(out.length>=20)break;
    }
    const fallback=SIMILAR_ANCHORS[viewer]||SIMILAR_ANCHORS.both;
    for(const t of seededShuffle(fallback))if(!out.includes(t)&&FILMS.some(f=>f.title===t)){out.push(t);if(out.length>=20)break;}
    return out.slice(0,20);
  }

  function renderSimilar(){
    const anchors=dynamicAnchors();
    renderShell(`<section class="room"><div class="room-head"><div><div class="viewer-pill">${getProfile().label}</div><h2>Start from a movie</h2></div><p>Use a familiar doorway, or search the entire catalogue for an adjacent frequency.</p></div>
      <div class="similar-search"><input id="similarSearch" type="search" autocomplete="off" placeholder="search title, director, year…"><div id="similarSearchResults" class="similar-results"></div></div>
      <div class="section-title"><h3>High-signal doorways</h3><div class="rule"></div></div>
      <div class="choice-grid">${anchors.map(t=>`<button class="choice similar-anchor" data-id="${escapeAttr(t)}"><span class="emoji">≈</span><strong>${t}</strong><small>find the adjacent frequency</small></button>`).join('')}</div>
    </section>`);
    const open=id=>openChoice('similar',id);
    $('.similar-anchor').forEach(btn=>btn.addEventListener('click',()=>open(btn.dataset.id)));
    const input=$('#similarSearch'), results=$('#similarSearchResults');
    input.addEventListener('input',()=>{
      const q=input.value.trim().toLowerCase();
      if(q.length<2){results.innerHTML='';return;}
      const hits=FILMS.filter(f=>`${f.title} ${f.director} ${f.year}`.toLowerCase().includes(q)).slice(0,20);
      results.innerHTML=hits.map(f=>`<button class="search-hit" data-key="${escapeAttr(movieKey(f))}"><strong>${f.title}</strong><span>${f.year} · ${f.director}</span></button>`).join('')||'<div class="privacy-note">Nothing in this room matches.</div>';
      $('.search-hit',results).forEach(btn=>btn.addEventListener('click',()=>{const f=FILMS.find(x=>movieKey(x)===btn.dataset.key);if(f)open(f.title);}));
    });
    setTimeout(()=>input.focus({preventScroll:true}),0);
  }

  function directorMatches(f,d){
    const needle=d.toLowerCase();
    if(needle==='safdie brothers') return f.director.toLowerCase().includes('safdie');
    return f.director.toLowerCase().includes(needle);
  }

  function directorNames(f){
    const raw=f.director.split(',').map(x=>x.trim()).filter(Boolean);
    return raw.length?raw:[f.director];
  }

  function directorHistoryScore(name,viewer){
    const films=FILMS.filter(f=>directorMatches(f,name));
    const scoreFor=(who)=>{
      const mean=Number(builtinProfile(who).stats?.ratingMean||4);
      const recs=films.map(f=>profileRecord(who,f)).filter(Boolean);
      const watched=recs.filter(r=>r.watched);
      const rated=watched.filter(r=>Number.isFinite(Number(r.rating)));
      const avg=rated.length?rated.reduce((a,r)=>a+Number(r.rating),0)/rated.length:null;
      const liked=watched.filter(r=>r.liked).length;
      const favorites=watched.filter(r=>r.favorite).length;
      const watchlist=recs.filter(r=>r.watchlist&&!r.watched).length;
      let score=watched.length*1.35+liked*.5+favorites*2+watchlist*.18;
      if(avg!=null)score+=(avg-mean)*4;
      return {score,watched:watched.length,avg,liked,watchlist};
    };
    if(viewer==='both'){
      const j=scoreFor('josh'),u=scoreFor('julie');
      return {score:j.score*.65+u.score*.35+Math.min(j.watched,u.watched)*.7,watched:j.watched+u.watched,avg:null,detail:`Joshie ${j.watched} · Julie ${u.watched}`};
    }
    const x=scoreFor(viewer);
    return {...x,detail:`${x.watched} watched${x.avg!=null?` · ${x.avg.toFixed(1)}★ avg`:''}`};
  }

  function renderDirectors(){
    const names=new Set();
    FILMS.forEach(f=>directorNames(f).forEach(d=>names.add(d)));
    (DIRECTOR_SEEDS[state.viewer]||DIRECTOR_SEEDS.both).forEach(d=>names.add(d));
    let ranked=[...names].map(d=>{
      const count=FILMS.filter(f=>directorMatches(f,d)).length;
      const hist=directorHistoryScore(d,state.viewer);
      return {d,count,...hist};
    }).filter(x=>x.count>=5).sort((a,b)=>b.score-a.score);
    const preferred=new Set(DIRECTOR_SEEDS[state.viewer]||DIRECTOR_SEEDS.both);
    ranked.sort((a,b)=>(b.score+(preferred.has(b.d)?1.5:0))-(a.score+(preferred.has(a.d)?1.5:0)));
    ranked=ranked.slice(0,18);
    renderChoices('director','Director corridors','Ranked from your actual 2026 Letterboxd history where the local catalogue has enough films to make a proper corridor.',ranked.map(x=>[x.d,x.d,'🎬',`${x.count} in the room · ${x.detail}`]));
  }

  function pickDealerFilm(exclude=null){
    const recent=new Set(state.seenHistory['dealer']||[]);
    let pool=FILMS.filter(f=>movieKey(f)!==exclude&&!recent.has(movieKey(f)));
    if(pool.length<12)pool=FILMS.filter(f=>movieKey(f)!==exclude);
    const ranked=pool.map(f=>({f,score:personalScore(f,[])+Math.random()*3})).sort((a,b)=>b.score-a.score).slice(0,35);
    return ranked[Math.floor(Math.random()*Math.min(12,ranked.length))]?.f||ranked[0]?.f||FILMS[0];
  }
  
  function renderDealer(){
    if(!state.dealer)state.dealer={strikes:0,film:null,revealed:false};
    if(!state.dealer.film)state.dealer.film=pickDealerFilm();
    const f=state.dealer.film, meta=state.metaCache[movieKey(f)]||{}, left=Math.max(0,3-state.dealer.strikes);
    renderShell(`<section class="dealer-room"><div class="eyebrow">dealer’s choice · ${getProfile().label}</div><h2>${state.dealer.revealed?'The projectionist has spoken.':'One sealed ticket.'}</h2>
      ${state.dealer.revealed?`<div class="dealer-reveal">${meta.poster?`<img src="${escapeAttr(meta.poster)}" alt="${escapeAttr(f.title)} poster">`:`<div class="poster-fallback">${f.title}</div>`}<div><div class="movie-kicker">${f.emoji} ${f.vibe}</div><h3>${f.title}</h3><p>${whyThisFilm(f)}</p><div class="dealer-actions"><button class="primary-btn" id="acceptDealer">accept fate</button>${left>0?`<button class="ghost-btn" id="burnDealer">burn ticket · ${left} reject${left===1?'':'s'} left</button>`:'<span class="secret">no refunds left</span>'}</div></div></div>`
      :`<button class="sealed-ticket" id="breakSeal"><span>JL²GETHER · THE BACK ROOM</span><strong>NO REFUNDS</strong><small>break seal</small></button><p class="privacy-note">You may burn three tickets. The fourth one is between you and God.</p>`}
      <button class="ghost-btn dealer-leave" id="leaveDealer">← leave the booth</button>
    </section>`);
    $('#leaveDealer').addEventListener('click',()=>{state.route='home';state.dealer=null;render();});
    $('#breakSeal')?.addEventListener('click',()=>{state.dealer.revealed=true;state.seenHistory['dealer']=[movieKey(f),...(state.seenHistory['dealer']||[])].slice(0,30);sessionStorage.setItem('jl2.seen',JSON.stringify(state.seenHistory));Promise.resolve(enrichFilm(f)).then(()=>{if(state.route==='dealer')renderDealer();});});
    $('#acceptDealer')?.addEventListener('click',()=>openMovie(f));
    $('#burnDealer')?.addEventListener('click',()=>{state.dealer.strikes++;const old=movieKey(f);state.dealer.film=pickDealerFilm(old);state.dealer.revealed=false;renderDealer();});
  }

  function renderResults(){
    const title=state.category?.label||'Tonight';
    renderShell(`<section class="room">
      <div class="result-head">
        <div><div class="crumbs"><button class="ghost-btn" id="backBtn">← back</button> &nbsp; ${getProfile().label}</div><h2>${title}</h2></div>
        <div class="controls">
          <label><input type="checkbox" id="hideWatched" ${state.hideWatched?'checked':''}> hide watched</label>
          <select id="sortSel" aria-label="Sort">
            <option value="fit" ${state.sort==='fit'?'selected':''}>best fit</option>
            <option value="rating" ${state.sort==='rating'?'selected':''}>Letterboxd avg</option>
            <option value="cult" ${state.sort==='cult'?'selected':''}>cult heat</option>
            <option value="year-new" ${state.sort==='year-new'?'selected':''}>newest</option>
            <option value="year-old" ${state.sort==='year-old'?'selected':''}>oldest</option>
          </select>
          <button class="primary-btn" id="refreshBtn">reshuffle ↻</button>
        </div>
      </div>
      <div class="poster-grid" id="posterGrid">${state.results.map(movieCard).join('')}</div>
    </section>`);
    $('#backBtn').addEventListener('click',()=>{state.route=state.category?.type||'home';render();});
    $('#refreshBtn').addEventListener('click',()=>rerunCategory());
    $('#hideWatched').addEventListener('change',e=>{state.hideWatched=e.target.checked;rerunCategory();});
    $('#sortSel').addEventListener('change',e=>{state.sort=e.target.value;rerunCategory();});
    bindMovieCards();
  }

  function rerunCategory(){
    const c=state.category;if(!c)return;
    if(c.type==='mood') chooseResults(c.tags);
    else if(c.type==='vibe') chooseResults(c.tags);
    else if(c.type==='similar'){const a=FILMS.find(f=>f.title===c.id);chooseResults(a?.tags||[],f=>f.title!==c.id);}
    else if(c.type==='decade'){const start=Number(c.id.slice(0,4));chooseResults([],f=>f.year>=start&&f.year<start+10);}
    else if(c.type==='director') chooseResults([],f=>directorMatches(f,c.id));
    else chooseResults([]);
  }

  function movieCard(f){
    const key=movieKey(f), meta=state.metaCache[key], wi=watchedInfo(f);
    const img=meta?.poster;
    return `<article class="poster-card" data-key="${escapeAttr(key)}" title="${escapeAttr(f.title)}">
      ${img?`<img src="${escapeAttr(img)}" alt="${escapeAttr(f.title)} poster" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'poster-fallback',textContent:${JSON.stringify(f.title)}}))">`:`<div class="poster-fallback">${f.title}</div>`}
      ${wi.watched?'<i class="watched-dot" title="watched"></i>':''}
      ${state.resultRoles[key]?`<div class="role-badge">${state.resultRoles[key]}</div>`:''}
      <div class="spark"><span>${f.emoji} ${f.vibe}</span></div>
    </article>`;
  }

  function movieKey(f){ return `${f.title}|${f.year}`; }
  function bindMovieCards(){
    $$('.poster-card').forEach(card=>card.addEventListener('click',()=>{const f=FILMS.find(x=>movieKey(x)===card.dataset.key); if(f)openMovie(f);}));
  }

  async function enrichFilm(f){
    const key=movieKey(f); if(state.metaCache[key]?.poster) return;
    try {
      const q=encodeURIComponent(f.title);
      const r=await fetch(`https://v3-cinemeta.strem.io/catalog/movie/top/search=${q}.json`,{cache:'force-cache'});
      if(!r.ok) throw new Error('metadata');
      const data=await r.json();
      const metas=(data.metas||[]).filter(m=>m.type==='movie');
      let m=metas.find(x=>Number((x.releaseInfo||'').slice(0,4))===f.year || Number(x.year)===f.year) || metas[0];
      if(!m) return;
      state.metaCache[key]={ poster:m.poster||m.background||null, imdbId:m.imdb_id||m.id||null, description:m.description||null, name:m.name||f.title };
      saveJSON('jl2.meta',state.metaCache);
      if(state.route==='results' && state.results.includes(f)) renderResults();
    } catch(e) { /* fallback stays */ }
  }

  function renderReactionPanel(f,modal){
    const r=getReaction(f), reasons=new Set(r?.reasons||[]);
    const box=$('#reactionBox',modal); if(!box)return;
    box.innerHTML=`<div class="reaction-box"><div class="eyebrow">after the screening · teach the projectionist</div><div class="reaction-main">
      ${[['loved','Loved it'],['good','Good'],['meh','Meh'],['bad','Bad pick']].map(([id,label])=>`<button class="reaction-btn ${r?.value===id?'active':''}" data-reaction="${id}">${label}</button>`).join('')}
    </div><div class="reaction-reasons">
      ${[['atmosphere','loved the atmosphere'],['more-like-this','more like this'],['too-slow','too slow'],['too-obvious','too obvious'],['wrong-mood','wrong mood']].map(([id,label])=>`<button class="reason-btn ${reasons.has(id)?'active':''}" data-reason="${id}">${label}</button>`).join('')}
    </div><small>Saved only in this browser. “Wrong mood” does not become a permanent dislike.</small></div>`;
    $('.reaction-btn',box).forEach(btn=>btn.addEventListener('click',()=>{storeReaction(f,btn.dataset.reaction);renderReactionPanel(f,modal);}));
    $('.reason-btn',box).forEach(btn=>btn.addEventListener('click',()=>{toggleReactionReason(f,btn.dataset.reason);renderReactionPanel(f,modal);}));
  }

  function openMovie(f){
    const key=movieKey(f); const meta=state.metaCache[key]||{}; const wi=watchedInfo(f);
    const role=state.resultRoles[key];
    const modal=document.createElement('div'); modal.className='modal-backdrop';
    modal.innerHTML=`<div class="modal" role="dialog" aria-modal="true"><div class="modal-grid">
      <div class="modal-poster">${meta.poster?`<img src="${escapeAttr(meta.poster)}" alt="${escapeAttr(f.title)} poster">`:`<div class="poster-fallback">${f.title}</div>`}</div>
      <div class="modal-body">
        <button class="modal-close" aria-label="Close">×</button>
        <div class="movie-kicker">${f.emoji} ${f.vibe}${role?` · ${role}`:''}</div>
        <h2 class="movie-title">${f.title}</h2>
        <div class="secret-line">
          <span class="secret" id="metaSecret"><button>reveal year + director</button></span>
          <span class="secret" id="ratingSecret"><button>reveal Letterboxd</button></span>
          ${wi.watched?`<span class="secret">✓ watched ${watchText(wi)}</span>`:''}
        </div>
        <div class="copy">${perfectSentence(f,meta)}</div>
        <div class="lobby-note">${buzzLine(f)}</div>
        <div class="why-box"><div class="eyebrow">why the projectionist pulled it</div>${whyThisFilm(f)}</div>
        <div class="detail-tags">${f.tags.slice(0,8).map(t=>`<span>${t}</span>`).join('')}</div>
        <div id="ratingBox"></div><div id="reactionBox"></div>
        <div class="file-row"><a class="ghost-btn" target="_blank" rel="noopener" href="https://letterboxd.com/film/${f.slug||slugify(f.title)}/">open on Letterboxd ↗</a><button class="tiny-btn" id="anotherLike">more like this</button></div>
      </div></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
    $('.modal-close',modal).addEventListener('click',()=>modal.remove());
    $('#metaSecret',modal).addEventListener('click',()=>{$('#metaSecret',modal).innerHTML=`${f.year} · ${f.director}`;});
    $('#ratingSecret',modal).addEventListener('click',()=>{
      const r=getCachedRating(f), el=$('#ratingSecret',modal);
      el.innerHTML=r?.avg?`LB ${Number(r.avg).toFixed(2)} / 5`:'rating unavailable in snapshot'; renderRatingBox(f,modal,r);
    });
    $('#anotherLike',modal).addEventListener('click',()=>{modal.remove();state.category={type:'similar',label:`Like ${f.title}`,id:f.title,tags:f.tags};state.route='results';chooseResults(f.tags,x=>x.title!==f.title);});
    renderReactionPanel(f,modal); enrichFilm(f).then(()=>{});
  }

  function perfectSentence(f,meta){
    const syn=(meta.description||'').trim();
    if(syn) {
      const first=syn.split(/(?<=[.!?])\s+/)[0];
      return `${first} — ${sentenceCase(f.vibe)}.`;
    }
    return `A ${f.tags.slice(0,3).join(', ')} film tuned to ${f.vibe}.`;
  }
  function sentenceCase(s){return s.charAt(0).toUpperCase()+s.slice(1)}
  function buzzLine(f){
    const t=f.tags;
    if(t.includes('c-films')) return 'Word around the lobby: the craft may be broken, but the commitment is so total it loops back into cult pleasure.';
    if(t.includes('unwatchable')) return 'Word around the lobby: admired as much for what it puts you through as for what it achieves; not casual viewing.';
    if(t.includes('y2k-club')) return 'Word around the lobby: remembered for the clothes, music, nighttime texture and a cultural moment that now feels impossible to fake.';
    if(t.includes('dream')) return 'Word around the lobby: people tend to describe it less as a plot than as a place their mind visited for a while.';
    if(t.includes('documentary')) return 'Word around the lobby: the subject is the hook, but the personality and point of view are what make it stick.';
    if(t.includes('kinetic')) return 'Word around the lobby: praised for momentum and formal swagger—one of those movies that changes your pulse while it is running.';
    if(t.includes('tender')) return 'Word around the lobby: its devotees talk about the people more than the premise; it earns affection without becoming soft.';
    return 'Word around the lobby: the people who love it tend to love the particular atmosphere more than any single plot beat.';
  }
  function watchText(wi){
    if(state.viewer==='both'){
      const bits=[]; if(wi.josh)bits.push(`Joshie ${wi.josh.rating?wi.josh.rating+'★':''}`); if(wi.julie)bits.push(`Julie ${wi.julie.rating?wi.julie.rating+'★':''}`); return bits.join(' · ');
    }
    const r=wi[state.viewer]; return r?.rating?`${r.rating}★`:'';
  }

  async function ensureLetterboxdRating(f){ return getCachedRating(f); }

  function parseHistogram(html){
    const doc=new DOMParser().parseFromString(html,'text/html');
    const ratingEl=doc.querySelector('.display-rating');
    let avg=ratingEl?parseFloat(ratingEl.textContent):null;
    if(!avg){const m=html.match(/Weighted average of\s*([0-5](?:\.\d+)?)/i)||html.match(/Average:\s*([0-5](?:\.\d+)?)/i); if(m)avg=parseFloat(m[1]);}
    const bars=[...doc.querySelectorAll('li.rating-histogram-bar')];
    const histogram=[];
    bars.forEach((bar,i)=>{
      const stars=(i+1)/2; const a=bar.querySelector('a[title],a'); const title=a?.getAttribute('title')||a?.textContent||'';
      let pct=null,count=null; let pm=title.match(/(\d+(?:\.\d+)?)%/); if(pm)pct=parseFloat(pm[1]);
      let cm=title.match(/([\d,.]+[KMB]?)\s+(?:ratings?|members?)/i); if(cm)count=parseCount(cm[1]);
      histogram.push({stars,percent:pct,count});
    });
    if(!avg) return null;
    return {avg,histogram,updatedAt:new Date().toISOString()};
  }
  function parseCount(s){s=String(s).replace(/,/g,'').toUpperCase();const n=parseFloat(s);return s.endsWith('K')?n*1e3:s.endsWith('M')?n*1e6:s.endsWith('B')?n*1e9:n;}

  function renderRatingBox(f,modal,r){
    const box=$('#ratingBox',modal); if(!r){box.innerHTML='';return;}
    const rows=(r.histogram||[]).filter(x=>x.percent!=null);
    const five=rows.find(x=>x.stars===5)?.percent;
    box.innerHTML=`<div class="rating-box"><div class="rating-head"><div><div class="eyebrow">Letterboxd distribution</div><div class="rating-number">${Number(r.avg).toFixed(2)}</div></div>${five!=null?`<div class="secret">5★ share: ${five}%</div>`:''}</div>${rows.length?`<div class="histogram">${rows.map(x=>`<div class="hist-row"><span>${x.stars}★</span><div class="hist-track"><div class="hist-fill" style="width:${Math.min(100,x.percent||0)}%"></div></div><span>${x.percent||0}%</span></div>`).join('')}</div>`:`<p class="privacy-note">Average loaded; histogram was not exposed by the proxy.</p>`}</div>`;
  }

  function renderSettings(){
    const jLocal=Object.keys(state.imported.josh||{}).length, uLocal=Object.keys(state.imported.julie||{}).length;
    const js=builtinProfile('josh').stats||{}, us=builtinProfile('julie').stats||{};
    const ov=(typeof BUILTIN_PROFILE_SNAPSHOT!=='undefined'&&BUILTIN_PROFILE_SNAPSHOT.overlap)||{};
    renderShell(`<section class="settings"><div class="eyebrow">projection booth</div><h2>Data & privacy</h2>
      <p>v0.4 ships with the Letterboxd exports you supplied on 7 October 2026 already distilled into the app. Only movie-history data is baked in: watched status, ratings, likes, watchlist membership and your film lists.</p>
      <div class="import-box"><h3>Joshie</h3><div class="status">${js.watched||0} watched · ${js.rated||0} rated · ${js.liked||0} liked · ${js.watchlist||0} watchlist</div><div class="file-row"><input type="file" id="joshFile" accept=".csv,.zip" multiple><button class="primary-btn" id="joshImport">update from newer export</button></div><div class="status">${jLocal?`${jLocal} local override records`:'using the baked 2026 snapshot'}</div></div>
      <div class="import-box"><h3>Julie</h3><div class="status">${us.watched||0} watched · ${us.rated||0} rated · ${us.liked||0} liked · ${us.watchlist||0} watchlist</div><div class="file-row"><input type="file" id="julieFile" accept=".csv,.zip" multiple><button class="primary-btn" id="julieImport">update from newer export</button></div><div class="status">${uLocal?`${uLocal} local override records`:'using the baked 2026 snapshot'}</div></div>
      <div class="import-box"><h3>JL²GETHER signal</h3><div class="status">${ov.watchedTogether||0} films watched by both · ${ov.ratedBoth||0} rated by both · ${ov.sharedHigh||0} shared 4★+ · ${ov.sharedLiked||0} liked by both</div></div>
      <p class="privacy-note">Julie’s account information is used only inside this app profile, as requested. New imports are parsed in your browser and stored locally. The provided raw export ZIPs are not needed by the running app.</p>
      <p class="privacy-note">Important: both supplied exports have empty diary histories. That means this build does not pretend to know reliable last-watch dates or repeat counts. Nostalgia uses favorites, ratings, likes, lists and watched status instead.</p>
      <div class="section-title"><h3>Sync reality</h3><div class="rule"></div></div>
      <p>The historical snapshot is now built in. A later version can add Letterboxd RSS for new activity; until then, importing a newer export here will override the baked snapshot for matching films.</p>
      <button class="ghost-btn" id="clearData">clear local update overrides</button>
    </section>`);
    $('#joshImport').addEventListener('click',()=>importFiles('josh',$('#joshFile').files));
    $('#julieImport').addEventListener('click',()=>importFiles('julie',$('#julieFile').files));
    $('#clearData').addEventListener('click',()=>{if(confirm('Clear only newer local import overrides? The baked 2026 profile snapshot will remain.')){state.imported={josh:{},julie:{}};localStorage.removeItem('jl2.import.josh');localStorage.removeItem('jl2.import.julie');renderSettings();}});
  }


  async function ensureJSZip(){
    if(window.JSZip) return true;
    return new Promise(resolve=>{
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
      script.onload=()=>resolve(true);
      script.onerror=()=>resolve(false);
      document.head.appendChild(script);
      setTimeout(()=>resolve(!!window.JSZip),8000);
    });
  }

  async function importFiles(who,fileList){
    if(!fileList?.length){alert('Choose the Letterboxd export ZIP or CSV files first.');return;}
    let packets=[];
    if ([...fileList].some(f=>f.name.toLowerCase().endsWith('.zip'))) await ensureJSZip();
    for(const file of fileList){
      if(file.name.toLowerCase().endsWith('.zip')){
        if(!window.JSZip){alert('ZIP support could not load. You can select the CSV files individually instead.');continue;}
        const zip=await JSZip.loadAsync(file);
        for(const [name,entry] of Object.entries(zip.files)){
          if(entry.dir || !name.toLowerCase().endsWith('.csv') || name.includes('__MACOSX')) continue;
          if(!/(watched\.csv|ratings\.csv|watchlist\.csv|diary\.csv|likes\/films\.csv|\/lists\/)/i.test(name)) continue;
          const text=await entry.async('text');
          if(/\/lists\//i.test(name)) packets.push({kind:'list',source:name,rows:parseListCSV(text,name)});
          else {
            const base=name.toLowerCase();
            const kind=/watchlist\.csv$/.test(base)?'watchlist':/ratings\.csv$/.test(base)?'rating':/diary\.csv$/.test(base)?'diary':/likes\/films\.csv$/.test(base)?'like':'watched';
            packets.push({kind,source:name,rows:parseCSV(text,name)});
          }
        }
      } else {
        const text=await file.text(), name=file.name.toLowerCase();
        const kind=name.includes('watchlist')?'watchlist':name.includes('ratings')?'rating':name.includes('diary')?'diary':name.includes('likes')?'like':name.includes('list')?'list':'watched';
        packets.push({kind,source:file.name,rows:kind==='list'?parseListCSV(text,file.name):parseCSV(text,file.name)});
      }
    }
    const db={...(state.imported[who]||{})};
    const ensure=(title,year)=>{
      const key=profileKey(title,year);
      const cur=db[key]||{title,year:Number(year)||null};
      db[key]=cur; return cur;
    };
    for(const packet of packets){
      const listSlug=packet.kind==='list'
        ? packet.source.split('/').pop().replace(/\.csv$/i,'').replace(/[^a-z0-9-]+/gi,'-').toLowerCase()
        : null;
      for(const row of packet.rows){
        const title=(row.Name||row.Title||row.name||row.title||'').trim(); if(!title)continue;
        const year=Number(row.Year||row.year||0)||null; if(!year)continue;
        const cur=ensure(title,year);
        if(packet.kind==='watched')cur.watched=true;
        if(packet.kind==='rating'){
          const rating=Number(row.Rating||row.rating||0)||null;
          if(rating!=null)cur.rating=rating;
        }
        if(packet.kind==='watchlist')cur.watchlist=true;
        if(packet.kind==='like')cur.liked=true;
        if(packet.kind==='list'){
          cur.lists=[...new Set([...(cur.lists||[]),listSlug])];
          const pos=Number(row.Position||0); if(pos){cur.listPos={...(cur.listPos||{}),[listSlug]:pos};}
        }
        if(packet.kind==='diary'){
          cur.watched=true;
          const date=row['Watched Date']||row.WatchedDate||null;
          if(date && (!cur.lastWatched || date>cur.lastWatched))cur.lastWatched=date;
          const rewatch=String(row.Rewatch||row.rewatch||'').toLowerCase()==='true';
          cur.watches=(cur.watches||0)+1;
          if(rewatch && cur.watches<2)cur.watches=2;
          const rating=Number(row.Rating||row.rating||0)||null;
          if(rating!=null)cur.rating=rating;
        }
      }
    }
    state.imported[who]=db; saveJSON(`jl2.import.${who}`,db); renderSettings();
  }

  function parseListCSV(text,source=''){
    const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
    const idx=lines.findIndex(x=>x.startsWith('Position,Name,Year,URL,Description'));
    if(idx<0)return [];
    return parseCSV(lines.slice(idx).join('\n'),source);
  }

  function parseCSV(text,source=''){
    const out=[]; let row=[],field='',quote=false; const rows=[];
    for(let i=0;i<text.length;i++){
      const c=text[i],n=text[i+1];
      if(c==='"'&&quote&&n==='"'){field+='"';i++;continue;}
      if(c==='"'){quote=!quote;continue;}
      if(c===','&&!quote){row.push(field);field='';continue;}
      if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&n==='\n')i++;row.push(field);field='';if(row.some(x=>x!==''))rows.push(row);row=[];continue;}
      field+=c;
    }
    if(field||row.length){row.push(field);rows.push(row);}
    if(!rows.length)return out; const headers=rows[0].map(h=>h.trim());
    for(const vals of rows.slice(1)){const o={_source:source};headers.forEach((h,i)=>o[h]=(vals[i]||'').trim());out.push(o);}return out;
  }

  function escapeAttr(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

  function render(){
    window.scrollTo({top:0,behavior:'instant'});
    if(!state.viewer && state.route!=='settings') state.route='landing';
    if(state.route==='landing') return renderLanding();
    if(state.route==='home') return renderHome();
    if(state.route==='mood') return renderMoodMixer();
    if(state.route==='vibe') return renderChoices('vibe','Choose a shelf','These are hand-labeled rooms, not database genres.',VIBES);
    if(state.route==='similar') return renderSimilar();
    if(state.route==='decade') return renderChoices('decade','Choose a decade','The decade is only the doorway; your taste still decides what is waiting behind it.',DECADES.map(d=>{const start=Number(d.slice(0,4));const n=FILMS.filter(f=>f.year>=start&&f.year<start+10).length;return [d,d,'⌛',`${n} films · filtered through your profile`];}));
    if(state.route==='director') return renderDirectors();
    if(state.route==='results') return renderResults();
    if(state.route==='dealer') return renderDealer();
    if(state.route==='settings') return renderSettings();
    return renderHome();
  }

  render();
})();