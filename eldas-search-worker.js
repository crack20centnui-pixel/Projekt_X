// Runs catalog indexing and search away from the UI thread.
let DATA=[],PREFIX=new Map(),exactE=new Map();
const MAX_HITS=15,MIN_TEXT=2;
  const fmtE=v=>{
    const raw=String(v||"").replace(/\s+/g,"");
    return /^\d{9}$/.test(raw)?raw.replace(/(\d{3})(\d{3})(\d{3})/,"$1 $2 $3"):String(v||"");
  };
  const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/ß/g,"ss").replace(/×/g,"x").replace(/[^\p{L}\p{N}.+-]+/gu," ").replace(/\s+/g," ").trim();
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  function prepare(raw){
    DATA = raw.map((x,i)=>{
      const name=String(x.name||"").trim(), e=String(x.eNumber||x.e||"").replace(/\s+/g,"").trim();
      return {i,name,e,n:norm(name)};
    }).filter(x=>x.name&&x.e);
    PREFIX=new Map(); exactE=new Map();
    DATA.forEach((a,idx)=>{
      exactE.set(a.e,idx);
      const seen=new Set();
      for(const word of a.n.split(" ")){
        if(!word) continue;
        // 2–8 character prefixes are enough to reduce candidates sharply.
        for(let n=2;n<=Math.min(8,word.length);n++){
          const p=word.slice(0,n);
          if(seen.has(p)) continue; seen.add(p);
          let arr=PREFIX.get(p); if(!arr) PREFIX.set(p,arr=[]);
          arr.push(idx);
        }
      }
    });
  }

  function intersect(a,b){
    if(!a||!b)return [];
    const small=a.length<=b.length?a:b, big=a.length<=b.length?b:a, set=new Set(big), out=[];
    for(const x of small) if(set.has(x)) out.push(x);
    return out;
  }
  function candidates(q){
    const digits=String(q||"").replace(/\s+/g,"");
    if(/^\d+$/.test(digits)){
      if(digits.length===9 && exactE.has(digits)) return [exactE.get(digits)];
      const out=[];
      for(let i=0;i<DATA.length && out.length<80;i++) if(DATA[i].e.startsWith(digits)) out.push(i);
      return out;
    }
    const terms=norm(q).split(" ").filter(Boolean);
    if(!terms.length || !terms.some(t=>t.length>=MIN_TEXT)) return [];
    let ids=null;
    for(const t of terms.filter(t=>t.length>=MIN_TEXT)){
      const arr=PREFIX.get(t.slice(0,Math.min(8,t.length)))||[];
      ids=ids===null?arr:intersect(ids,arr);
      if(!ids.length) break;
    }
    return ids||[];
  }
  const collator=new Intl.Collator("de");
  const compare=(x,y)=>y.s-x.s||collator.compare(x.a.name,y.a.name);
  function search(q){
    const nq=norm(q), terms=nq.split(" ").filter(Boolean), ids=candidates(q), scored=[];
    for(const idx of ids){
      const a=DATA[idx];
      if(!terms.every(t=>a.n.includes(t) || a.e.includes(t))) continue;
      let s=0;
      if(a.n===nq||a.e===String(q).replace(/\s+/g,""))s+=1000;
      if(a.n.startsWith(nq)||a.e.startsWith(String(q).replace(/\s+/g,"")))s+=500;
      for(const t of terms){ if(a.n.startsWith(t))s+=60; else if(a.n.includes(" "+t))s+=45; else s+=20; }
      const hit={a,s};
      let lo=0,hi=scored.length;
      while(lo<hi){const mid=(lo+hi)>>1;if(compare(hit,scored[mid])<0)hi=mid;else lo=mid+1;}
      if(lo<MAX_HITS){scored.splice(lo,0,hit);if(scored.length>MAX_HITS)scored.pop();}
    }

    return scored.slice(0,MAX_HITS).map(x=>x.a);
  }


self.onmessage=({data})=>{
 try{if(data.type==='init'){prepare(data.products);self.postMessage({id:data.id,count:DATA.length});}
 else if(data.type==='search')self.postMessage({id:data.id,hits:search(data.query)});
 }catch(error){self.postMessage({id:data.id,error:String(error.message||error)});}
};
