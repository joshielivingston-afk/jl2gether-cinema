const fs=require('node:fs');
const {loadApp}=require('../tests/harness');
const a=loadApp();
a.seed(190503375);
const report={catalogueSize:a.FILMS.length,categories:[]};
for(const [type,items,map] of [['mood',a.MOODS,a.MOOD_MAP],['vibe',a.VIBES,a.CATEGORY_MAP]]){
  for(const [id,label,,description] of items){
    const tags=map[id]||[];
    a.state.category={type,id,label,tags,moodIds:type==='mood'?[id]:undefined};
    a.state.viewer='both';
    const eligible=a.FILMS.filter(f=>a.relevantToCategory(f,tags));
    const samples={},eligibleByViewer={};
    for(const viewer of ['josh','julie','both']){
      a.state.viewer=viewer;a.state.seenHistory={};
      eligibleByViewer[viewer]=a.FILMS.filter(f=>a.relevantToCategory(f,tags)).length;
      a.chooseResults(tags);
      samples[viewer]=a.state.results.map(f=>f.title+' ('+f.year+')');
    }
    report.categories.push({type,id,label,description,eligible:eligible.length,eligibleByViewer,samples,
      films:eligible.map(f=>({title:f.title,year:f.year,tags:f.tags,vibe:f.vibe}))});
  }
}
const output=process.argv[2];
if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
else console.log(JSON.stringify(report,null,2));
