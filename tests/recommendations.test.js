const test=require('node:test');
const assert=require('node:assert/strict');
const {loadApp}=require('./harness');
const a=loadApp();
function category(type,id){
  const tags=(type==='mood'?a.MOOD_MAP:a.CATEGORY_MAP)[id]||[];
  a.state.category={type,id,tags,moodIds:type==='mood'?[id]:undefined};
  return tags;
}
const cases=[
  ['vibe','docs-weird','Grey Gardens','Noroi: The Curse'],
  ['vibe','docs-weird','The Act of Killing','Occult'],
  ['vibe','docs-weird','Häxan','Something in the Dirt'],
  ['mood','horny','Crash','Roman Holiday'],
  ['mood','horny','In the Mood for Love','Before Sunrise'],
  ['vibe','girly-pop','Kamikaze Girls','Snatch'],
  ['vibe','girly-pop','The Parent Trap','Dead Poets Society'],
  ['mood','sleepy','The Scent of Green Papaya','Enys Men'],
  ['mood','harmonious','Perfect Days','Synecdoche, New York'],
  ['mood','depressed','Ikiru','Taste of Cherry'],
  ['mood','depressed','Napoleon Dynamite','Aftersun'],
  ['mood','depressed','Perfect Days','Dead Poets Society'],
  ['mood','cosmic','Interstellar','Shoah'],
  ['mood','campy','The Rocky Horror Picture Show','Napoleon Dynamite'],
  ['mood','angry','Blue Collar','Snatch'],
  ['mood','in-love','Before Sunrise','The Man from Earth'],
  ['mood','philosophical','The Man from Earth','Eraserhead'],
  ['mood','macabre','The Cremator','Trainspotting'],
  ['vibe','elegant-panic','Uncut Gems','I Am Cuba'],
  ['vibe','rocket-fuel','Run Lola Run','Snatch'],
  ['vibe','70s-rocket','Sorcerer','The Killing of a Chinese Bookie'],
  ['vibe','90s-kinetic','Run Lola Run','Gummo'],
  ['vibe','docs-inspire','Rivers and Tides','Titicut Follies'],
  ['vibe','y2k-club','Groove','Johnny Mnemonic'],
  ['vibe','childhood-nostalgia','Toy Story','Trainspotting'],
  ['vibe','musical-vibe','The Sound of Music','DIG!']
];
for(const [type,id,yes,no] of cases)test(`${type} ${id}: ${yes}, not ${no}`,()=>{
  const tags=category(type,id);
  for(const [title,expected] of [[yes,true],[no,false]]){
    const f=a.FILMS.find(f=>f.title===title);assert.ok(f,`Missing fixture ${title}`);
    assert.equal(a.relevantToCategory(f,tags),expected,title);
  }
});

test('nostalgia needs atmosphere or personal history, not merely 90s/Y2K tags',()=>{
  const tags=category('mood','nostalgic');a.state.viewer='josh';
  const eraOnly={title:'Unseen 90s film',year:1995,tags:['90s','y2k'],affinity:{josh:5,julie:5}};
  assert.equal(a.relevantToCategory(eraOnly,tags),false);
  a.state.imported.josh['unseen90sfilm|1995']={watched:true,rating:5};
  assert.equal(a.relevantToCategory(eraOnly,tags),true);
  a.state.viewer='julie';assert.equal(a.relevantToCategory(eraOnly,tags),false);
  a.state.viewer='both';assert.equal(a.relevantToCategory(eraOnly,tags),true);
  assert.equal(a.relevantToCategory({...eraOnly,title:'Memory film',tags:['nostalgic']},tags),true);
  delete a.state.imported.josh['unseen90sfilm|1995'];
});

test('all mood/vibe batches stay in their room across viewers, reshuffles and hide-watched',()=>{
  a.seed(1905);
  for(const [type,items] of [['mood',a.MOODS],['vibe',a.VIBES]])for(const [id] of items){
    const tags=category(type,id);
    const eligible=a.FILMS.filter(f=>a.relevantToCategory(f,tags));
    assert.ok(eligible.length>=5,`${id}: only ${eligible.length} candidates`);
    for(const viewer of ['josh','julie','both'])for(const hide of [false,true])for(let i=0;i<8;i++){
      a.state.viewer=viewer;a.state.hideWatched=hide;a.chooseResults(tags);
      const keys=a.state.results.map(a.movieKey);
      assert.equal(new Set(keys).size,keys.length,`${viewer}/${id}: duplicate`);
      assert.ok(keys.length<=5);
      for(const f of a.state.results){
        assert.ok(a.relevantToCategory(f,tags),`${viewer}/${id}: leaked ${f.title}`);
        if(hide){
          const viewers=viewer==='both'?['josh','julie']:[viewer];
          assert.ok(viewers.every(v=>!a.profileRecord(v,f)?.watched),`${id}: watched ${f.title}`);
        }
      }
      if(viewer==='both' && !hide && keys.length===5)assert.equal(new Set(Object.values(a.state.resultRoles)).size,5);
    }
  }
});

test('every two-mood combination preserves intersection, including sparse and empty pairs',()=>{
  a.state.hideWatched=false;a.seed(33075);
  let sparse=0,empty=0;
  for(let i=0;i<a.MOODS.length;i++)for(let j=i+1;j<a.MOODS.length;j++){
    const ids=[a.MOODS[i][0],a.MOODS[j][0]];
    const groups=ids.map(id=>a.MOOD_MAP[id]);const tags=[...new Set(groups.flat())];
    a.state.category={type:'mood',id:ids.join('+'),moodIds:ids,tagGroups:groups,tags};
    const pool=a.FILMS.filter(f=>a.relevantToCategory(f,tags));
    if(pool.length<5)sparse++;if(!pool.length)empty++;
    for(const viewer of ['josh','julie','both']){
      a.state.viewer=viewer;a.chooseResults(tags);
      for(const f of a.state.results)assert.ok(a.relevantToCategory(f,tags),`${ids}: ${f.title}`);
      if(!pool.length)assert.equal(a.state.results.length,0);
    }
  }
  assert.ok(sparse>0);assert.ok(empty>0);
});

test('explicit decade stays inside its decade; general samples span eras',()=>{
  a.seed(42);a.state.viewer='josh';a.state.hideWatched=false;
  a.state.category={type:'decade',id:'1970s',tags:[]};
  a.chooseResults([],f=>f.year>=1970&&f.year<1980);
  assert.ok(a.state.results.length);assert.ok(a.state.results.every(f=>f.year>=1970&&f.year<1980));
  const tags=category('mood','bored');const decades=new Set();let nineties=0,total=0;
  for(let i=0;i<40;i++){
    a.chooseResults(tags);
    for(const f of a.state.results){decades.add(Math.floor(f.year/10));total++;if(f.year>=1990&&f.year<2000)nineties++;}
  }
  assert.ok(decades.size>=5);assert.ok(nineties/total<.5);
});
