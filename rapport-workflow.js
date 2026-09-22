/* Data-only helpers shared by the app and regression tests. */
(function(root){
  function compareTimestamp(a,b){return (a.seconds-b.seconds)||(a.nanoseconds-b.nanoseconds);}
  function nextCursor(previous,rows){
    let cursor=previous||null;
    for(const row of rows){const t=row.data?.updatedAt;if(t&&Number.isFinite(t.seconds)&&(!cursor||compareTimestamp(t,cursor)>0))cursor={seconds:t.seconds,nanoseconds:t.nanoseconds||0};}
    return cursor;
  }
  function archiveState(record,archived,completionKeys){
    const state=JSON.parse(record.rapportStateJson);
    state.__archived=archived;
    state.__status=archived?'fertig':'in_bearbeitung';
    if(!archived){
      state.__signatures={aussteller:'',kunde:'',regieAussteller:'',regieKunde:''};
      for(const key of completionKeys)state[key]={checked:false};
    }
    return state;
  }
  function isArchived(record){return record?.archived===true||record?.__archived===true||record?.status==='archiviert';}
  const bookkeeping=new Set(['__savedAt','__createdAt','__version','__serverRevision','__ownerUid','__accessUids','__orderSource','__archived','__accessRevoked','__reference','__rapportId','__syncedAt']);
  function canonical(value){return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;}
  function equal(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}
  function content(state){return Object.fromEntries(Object.entries(state||{}).filter(([k])=>!bookkeeping.has(k)));}
  function flat(state){const out=content(state);if(Array.isArray(out.__materialUnits)){out.__materialUnits.forEach((v,i)=>out['__unit_'+i]=v);delete out.__materialUnits;}return out;}
  function inflate(state){const out={...state},unitKeys=Object.keys(out).filter(k=>k.startsWith('__unit_'));if(unitKeys.length){out.__materialUnits=[];for(const k of unitKeys){out.__materialUnits[Number(k.slice(7))]=out[k];delete out[k];}}return out;}
  function signed(state){return state?.__status==='fertig'||Object.values(state?.__signatures||{}).some(Boolean);}
  // Three-way merge. A table row is an indivisible group to avoid combining two
  // independently inserted articles/measurements into a fabricated mixed row.
  function mergeStates(base,local,remote,groups=[],choices={}){
    const l=content(local),r=content(remote),b=base?content(base):null;
    const chooseWhole=reason=>{const choice=choices.__whole;if(choice==='local'||choice==='remote')return {state:choice==='local'?l:r,conflicts:[],reason};return {state:l,conflicts:[{id:'__whole',label:reason==='missing-base'?'Älterer Rapport ohne Vergleichsstand':'Unterschrift / abgeschlossener Rapport',keys:Object.keys(l),local:l,remote:r}],reason};};
    if(equal(l,r))return {state:r,conflicts:[]};
    if(!b)return chooseWhole('missing-base');
    if(equal(l,b))return {state:r,conflicts:[]};
    if(equal(r,b))return {state:l,conflicts:[]};
    if(signed(base)||signed(local)||signed(remote))return chooseWhole('signed');
    const lf=flat(local),rf=flat(remote),bf=flat(base),keys=new Set([...Object.keys(lf),...Object.keys(rf),...Object.keys(bf)]),used=new Set(),sets=[];
    for(const group of groups){const members=group.keys.filter(k=>keys.has(k)&&!used.has(k));if(members.length){members.forEach(k=>used.add(k));sets.push({...group,keys:members});}}
    for(const k of keys)if(!used.has(k))sets.push({id:k,label:k,keys:[k]});
    const out={},conflicts=[],pick=(obj,ks)=>Object.fromEntries(ks.filter(k=>Object.hasOwn(obj,k)).map(k=>[k,obj[k]]));
    for(const group of sets){const lv=pick(lf,group.keys),rv=pick(rf,group.keys),bv=pick(bf,group.keys);let chosen;
      if(equal(lv,rv)||equal(lv,bv))chosen=rv;
      else if(equal(rv,bv))chosen=lv;
      else if(choices[group.id]==='local')chosen=lv;
      else if(choices[group.id]==='remote')chosen=rv;
      else {conflicts.push({...group,local:lv,remote:rv});chosen=lv;}
      Object.assign(out,chosen);
    }
    return {state:inflate(out),conflicts};
  }
  const api={compareTimestamp,nextCursor,archiveState,isArchived,content,equal,mergeStates};
  if(typeof module==='object')module.exports=api;else root.RapportWorkflow=api;
})(typeof window==='object'?window:globalThis);
