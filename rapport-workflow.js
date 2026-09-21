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
  const api={compareTimestamp,nextCursor,archiveState,isArchived};
  if(typeof module==='object')module.exports=api;else root.RapportWorkflow=api;
})(typeof window==='object'?window:globalThis);
