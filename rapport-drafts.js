/* Per-account crash recovery. Drafts never enter the sync queue until Save. */
(() => {
  let timer;
  const panel=document.createElement('aside');panel.id='draftRecovery';panel.style.cssText='background:#fff4cf;padding:10px;margin:8px;border-radius:6px;display:none';
  const label=document.createElement('span'),select=document.createElement('select'),restore=document.createElement('button'),download=document.createElement('button');
  restore.textContent='Entwurf wiederherstellen';download.textContent='Entwurf als Datei sichern';select.setAttribute('aria-label','Lokaler Entwurf');
  panel.append(label,select,restore,download);document.querySelector('.sheet')?.before(panel);
  const indicator=document.createElement('div');indicator.id='rapportStorageStatus';indicator.style.cssText='padding:6px 12px;font-size:13px;background:#eef5f1';panel.before(indicator);
  const draftDialog=document.createElement('dialog');draftDialog.id='rapportDraftDialog';draftDialog.setAttribute('aria-label','Lokale Entwürfe');
  const close=document.createElement('button');close.type='button';close.textContent='Schliessen';close.onclick=()=>draftDialog.close();
  const heading=document.createElement('h2');heading.textContent='Lokale Entwürfe';const empty=document.createElement('p');empty.textContent='Keine abweichenden Entwürfe vorhanden.';
  draftDialog.append(close,heading,panel,empty);document.body.append(draftDialog);
  const style=document.createElement('style');style.textContent='#rapportDraftDialog{width:min(580px,calc(100vw - 24px));max-height:85dvh;overflow:auto;border:1px solid #dce5e9;border-radius:14px;padding:20px;color:#173343}#rapportDraftDialog::backdrop{background:#12344770}#rapportDraftDialog #draftRecovery{width:100%!important;margin:0!important;background:#f5f8fa!important}#rapportDraftDialog select{width:100%;max-width:100%;height:44px;margin:12px 0}#rapportDraftDialog button{min-height:42px;padding:8px 12px;margin:4px;border:1px solid #cad9e1;border-radius:7px;background:white;color:#173343}#rapportDraftDialog>button{float:right}@media print{#rapportDraftDialog{display:none!important}}';document.head.append(style);
  window.openRapportDrafts=()=>{document.getElementById('viewMenu')?.close();show();empty.hidden=panel.style.display!=='none';if(!draftDialog.open)draftDialog.showModal();};
  for(const parent of [document.querySelector('#moreActions .more-popover'),document.querySelector('#viewMenu .view-pages')]){if(!parent)continue;const button=document.createElement('button');button.type='button';button.textContent='Entwürfe';button.onclick=window.openRapportDrafts;parent.append(button);}
  const time=value=>{const d=new Date(value);return value&&!isNaN(d)?d.toLocaleString('de-CH',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'–';};
  window.updateRapportStorageStatus=()=>{
    if(!activeLocalUid){indicator.textContent='';panel.style.display='none';return;}
    const state=getDB()[currentOrderKey];
    document.querySelectorAll('.sheet').forEach(el=>el.inert=!!state?.__accessRevoked||RapportWorkflow.isArchived(state));
    const pending=!!(window.rapportPendingChanges?.()?.[currentOrderKey]||!state?.__serverRevision);
    indicator.dataset.state=state?.__accessRevoked||RapportWorkflow.isArchived(state)?'locked':formDirty?'dirty':!state?'new':pending?'pending':'synced';
    let text=state?.__accessRevoked?'Übergeben – lokale Kopie gesperrt':formDirty?'Änderungen noch nicht gespeichert · Bitte Speichern':!state?'Neuer Rapport · Noch nicht gespeichert':RapportWorkflow.isArchived(state)?'Archiviert':pending?'Gespeichert: '+time(state.__savedAt)+' · Bitte SYNC drücken':'Gespeichert: '+time(state.__savedAt)+' · '+(state.__syncedAt?'Sync bestätigt: '+time(state.__syncedAt):'Synchronisiert');
    let currentBackup=false;
    try{const receipt=JSON.parse(localStorage.getItem('equansDriveBackupV1_'+activeLocalUid+'_'+currentOrderKey)||'null');
      currentBackup=!!state?.__savedAt&&receipt?.savedAt===state.__savedAt&&!formDirty&&Array.isArray(receipt.files)&&receipt.files.length===2;
      if(state&&receipt)text+=' · Drive-Backup '+new Date(receipt.at).toLocaleString('de-CH')+(!currentBackup?' (älterer Stand)':'');
    }catch(_){}
    const needsBackup=window.rapportIsAdmin?.()&&!state?.__accessRevoked&&(state?.__status==='fertig'||RapportWorkflow.isArchived(state))&&!currentBackup;
    if(needsBackup)text+=' · Hinweis: Auf diesem Gerät ist kein aktuelles Drive-Backup für diesen Abschluss bestätigt. Bitte unter Admin → Backup / Dateien prüfen. Manuell oder auf anderen Geräten erstellte Backups werden hier nicht erkannt.';
    indicator.style.background=needsBackup||formDirty||pending?'#fff8e8':'#eef5f1';
    indicator.setAttribute('role','status');
    indicator.textContent=text;
  };
  const key=()=>activeLocalUid?'equansRapportDraftsV1_'+activeLocalUid:null;
  const read=()=>JSON.parse(localStorage.getItem(key())||'{}');
  // Ignore sync bookkeeping, but compare all actual report content conservatively.
  function draftMatchesSaved(draft,saved){
    if(!draft||!saved)return false;
    const metadata=new Set(['__savedAt','__createdAt','__version','__serverRevision','__ownerUid','__accessUids','__orderSource','__archived','__accessRevoked','__reference','__rapportId','__syncedAt']);
    const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
    const content=state=>Object.fromEntries(Object.entries(state).filter(([k])=>!metadata.has(k)));
    return JSON.stringify(canonical(content(draft)))===JSON.stringify(canonical(content(saved)));
  }
  function renderDrafts(){
    panel.style.display='none';if(!key())return;
    try{const drafts=read(),saved=getDB(),selected=select.value;
      // Already saved identical drafts need no warning. Keep their backup bytes untouched.
      const entries=Object.entries(drafts).filter(([id,draft])=>!draftMatchesSaved(draft.state,saved[id])).sort((a,b)=>String(b[1].at||'').localeCompare(String(a[1].at||'')));
      select.replaceChildren();
      for(const [id,draft] of entries){const o=document.createElement('option');o.value=id;o.textContent=(id===currentOrderKey?'Dieser Rapport: ':'Anderer Rapport: ')+(draft.state.__reference||'Ohne Referenz')+' · '+new Date(draft.at).toLocaleString('de-CH');select.append(o);}
      if(entries.some(([id])=>id===selected))select.value=selected;
      label.textContent='Neueste Entwürfe zuerst. Nur wiederherstellen, wenn du diese Eingaben zurückholen möchtest.';
      panel.style.display=entries.length?'block':'none';
    }catch(e){window.setStatus?.('Entwurfspeicher konnte nicht gelesen werden.');}
  }
  function show(){window.updateRapportStorageStatus();renderDrafts();}
  function flush(){
    clearTimeout(timer);if(!key()||!formDirty)return;
    const id=ensureRapportId(),previous=getDB()[id];
    if(previous?.__accessRevoked||RapportWorkflow.isArchived(previous))return;
    try{const drafts=read(),state=preserveRapportMetadata(previous,captureForm());state.__rapportId=id;state.__reference=referenceValue();
      drafts[id]={state,at:new Date().toISOString(),createdAt:currentCreatedAt};localStorage.setItem(key(),JSON.stringify(drafts));
      window.setStatus?.('Entwurf auf diesem Gerät gesichert – Speichern und SYNC noch nötig');
    }catch(e){window.setStatus?.('Entwurf konnte nicht gesichert werden – bitte Rapport-Datei exportieren.');}
  }
  window.queueRapportDraft=()=>{window.updateRapportStorageStatus();clearTimeout(timer);timer=setTimeout(flush,700);};
  window.flushRapportDraft=flush;window.showRapportDraft=show;
  window.rapportDraftSaved=()=>{clearTimeout(timer);if(!key())return;try{const drafts=read();delete drafts[currentOrderKey];localStorage.setItem(key(),JSON.stringify(drafts));show();}catch(e){window.setStatus?.('Gespeichert; alter Entwurf konnte nicht entfernt werden.');}};
  window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
  restore.onclick=()=>{
    const draft=read()[select.value];if(!draft||!confirmDiscard())return;
    const existing=getDB()[select.value];
    if(existing?.__accessRevoked||RapportWorkflow.isArchived(existing)){alert('Rapport ist übergeben oder archiviert. Den Entwurf kannst du als Datei sichern.');return;}
    if(Number(existing?.__serverRevision||0)!==Number(draft.state.__serverRevision||0)){alert('Es gibt einen anderen synchronisierten Stand. Entwurf als Datei sichern; nicht darüber schreiben.');return;}
    applyForm(draft.state);currentOrderKey=select.value;currentCreatedAt=draft.createdAt;formDirty=true;syncBeiblattHeaders?.();updateHeaderInfo();
    draftDialog.close();window.setStatus?.('Entwurf wiederhergestellt – bitte prüfen, speichern und synchronisieren');
  };
  download.onclick=()=>{const draft=read()[select.value];if(!draft)return;const data={...draft.state,__fileType:'EQUANS_RAPPORT',__formatVersion:1};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='Entwurf-'+select.value+'.rapport';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
})();
