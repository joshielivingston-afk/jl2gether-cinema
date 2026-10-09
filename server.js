const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 5173);
const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml'
};

function send(res, status, body, type='text/plain; charset=utf-8') {
  res.writeHead(status, {'Content-Type':type, 'Cache-Control':'no-store'});
  res.end(body);
}
function parseCount(s='') {
  s=String(s).replace(/,/g,'').trim().toUpperCase();
  const n=parseFloat(s); if(!Number.isFinite(n)) return null;
  return s.endsWith('K')?n*1e3:s.endsWith('M')?n*1e6:s.endsWith('B')?n*1e9:n;
}
function stripTags(s=''){ return s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/s+/g,' ').trim(); }

function parseHistogram(html) {
  let avg=null;
  let m=html.match(/Weighted average ofs*([0-5](?:.d+)?)/i)
    || html.match(/class=["'][^"']*display-rating[^"']*["'][^>]*>s*([0-5](?:.d+)?)/i)
    || html.match(/class=["'][^"']*average-rating[^"']*["'][^>]*>[sS]*?([0-5](?:.d+)?)/i);
  if(m) avg=parseFloat(m[1]);

  const histogram=[];
  const liRe=/<li[^>]*class=["'][^"']*rating-histogram-bar[^"']*["'][^>]*>([sS]*?)</li>/gi;
  let li, i=0;
  while((li=liRe.exec(html))){
    const block=li[1];
    const title=(block.match(/(?:title|data-original-title)=["']([^"']+)["']/i)||[])[1] || stripTags(block);
    let pct=null,count=null;
    const pm=title.match(/(d+(?:.d+)?)%/); if(pm) pct=parseFloat(pm[1]);
    const cm=title.match(/([d,.]+s*[KMB]?)s+(?:ratings?|members?)/i); if(cm) count=parseCount(cm[1]);
    histogram.push({stars:(i+1)/2, percent:pct, count}); i++;
  }
  return avg ? {avg, histogram, updatedAt:new Date().toISOString()} : null;
}

async function letterboxdRating(slug) {
  if(!/^[a-z0-9-]+$/i.test(slug)) return null;
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),10000);
  const headers={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 JL2GETHER/0.3','Accept':'text/html,application/xhtml+xml'};
  try {
    const hist=`https://letterboxd.com/csi/film/${slug}/rating-histogram/`;
    let r=await fetch(hist,{headers,signal:controller.signal});
    if(r.ok){ const parsed=parseHistogram(await r.text()); if(parsed) return parsed; }

    r=await fetch(`https://letterboxd.com/film/${slug}/`,{headers,signal:controller.signal});
    if(!r.ok) return null;
    const html=await r.text();
    const jsonLd=[...html.matchAll(/<script[^>]+type=["']application/ld+json["'][^>]*>([sS]*?)</script>/gi)];
    for(const m of jsonLd){
      try { const obj=JSON.parse(m[1].replace(/&quot;/g,'"')); const v=parseFloat(obj?.aggregateRating?.ratingValue); if(v) return {avg:v,histogram:[],updatedAt:new Date().toISOString()}; } catch {}
    }
    const tw=html.match(/name=["']twitter:data2["'][^>]+content=["'][^"']*?([0-5](?:.d+)?)s+out of/i);
    return tw ? {avg:parseFloat(tw[1]),histogram:[],updatedAt:new Date().toISOString()} : null;
  } finally { clearTimeout(timer); }
}

const server=http.createServer(async (req,res)=>{
  const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  if(u.pathname==='/api/letterboxd-rating'){
    const slug=u.searchParams.get('slug')||'';
    try {
      const data=await letterboxdRating(slug);
      if(!data) return send(res,404,JSON.stringify({error:'rating unavailable'}),'application/json; charset=utf-8');
      return send(res,200,JSON.stringify(data),'application/json; charset=utf-8');
    } catch(e) {
      return send(res,502,JSON.stringify({error:'letterboxd lookup failed'}),'application/json; charset=utf-8');
    }
  }

  let rel=decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname);
  rel=rel.replace(/^/+/, '');
  const file=path.normalize(path.join(ROOT,rel));
  if(!file.startsWith(ROOT)) return send(res,403,'Forbidden');
  fs.stat(file,(err,st)=>{
    if(err||!st.isFile()) return send(res,404,'Not found');
    const ext=path.extname(file).toLowerCase();
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-store':'public, max-age=300'});
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(PORT,()=>console.log(`JL²GETHER v0.3 → http://localhost:${PORT}`));
