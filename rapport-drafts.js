/* Per-account crash recovery. Drafts never enter the sync queue until Save. */
(() => {
  let timer;
  const panel=document.createElement('aside');panel.id='draftRecovery';panel.style.cssText='background:#fff4cf;padding:10px;margin:8px;border-radius:6px;display:none';
  const label=document.createElement('span'),select=document.createElement('select'),restore=document.createElement('button'),download=document.createElement('button');
  restore.textContent='Entwurf wiederherstellen';download.textContent='Entwurf als Datei sichern';select.setAttribute('aria-label','Lokaler Entwurf');
  panel.append(label,select,restore,download);document.querySelector('.sheet')?.before(panel);
  const indicator=document.createElement('div');indicator.id='rapportStorageStatus';indicator.style.cssText='padding:6px 12px;font-size:13px;background:#eef5f1';panel.before(indicator);
  window.updateRapportStorageStatus=()=>{
    if(!activeLocalUid){indicator.textContent='';return;}
    const state=getDB()[currentOrderKey];
    document.querySelectorAll('.sheet').forEach(el=>el.inert=!!state?.__accessRevoked||RapportWorkflow.isArchived(state));
    let text=state?.__accessRevoked?'Übergeben – lokale Kopie gesperrt':formDirty?'Ungespeicherte Änderungen':!state?'Neuer Rapport':RapportWorkflow.isArchived(state)?'Archiviert':window.rapportPendingChanges?.()?.[currentOrderKey]||!state.__serverRevision?'Nur lokal gespeichert – SYNC ausstehend':'Synchronisiert';
    let currentBackup=false;
    try{const receipt=JSON.parse(localStorage.getItem('equansDriveBackupV1_'+activeLocalUid+'_'+currentOrderKey)||'null');
      currentBackup=!!state?.__savedAt&&receipt?.savedAt===state.__savedAt&&!formDirty&&Array.isArray(receipt.files)&&receipt.files.length===2;
      if(state&&receipt)text+=' · Drive-Backup '+new Date(receipt.at).toLocaleString('de-CH')+(!currentBackup?' (älterer Stand)':'');
    }catch(_){}
    const needsBackup=window.rapportIsAdmin?.()&&!state?.__accessRevoked&&(state?.__status==='fertig'||RapportWorkflow.isArchived(state))&&!currentBackup;
    if(needsBackup)text+=' · Hinweis: Auf diesem Gerät ist kein aktuelles Drive-Backup für diesen Abschluss bestätigt. Bitte unter Admin → Backup / Dateien prüfen. Manuell oder auf anderen Geräten erstellte Backups werden hier nicht erkannt.';
    indicator.style.background=needsBackup?'#fff4cf':'#eef5f1';
    indicator.setAttribute('role','status');
    indicator.textContent=text;
  };
  const key=()=>activeLocalUid?'equansRapportDraftsV1_'+activeLocalUid:null;
  const read=()=>JSON.parse(localStorage.getItem(key())||'{}');
  function show(){
    window.updateRapportStorageStatus();panel.style.display='none';if(!key())return;
    try{const drafts=read(),entries=Object.entries(drafts);select.replaceChildren();
      for(const [id,draft] of entries){const o=document.createElement('option');o.value=id;o.textContent=(draft.state.__reference||'Ohne Referenz')+' · '+new Date(draft.at).toLocaleString('de-CH');select.append(o);}
      label.textContent='Lokale Entwürfe (noch nicht synchronisiert): ';panel.style.display=entries.length?'block':'none';
    }catch(e){window.setStatus?.('Entwurfspeicher konnte nicht gelesen werden.');}
  }
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
    window.setStatus?.('Entwurf wiederhergestellt – bitte prüfen, speichern und synchronisieren');
  };
  download.onclick=()=>{const draft=read()[select.value];if(!draft)return;const data={...draft.state,__fileType:'EQUANS_RAPPORT',__formatVersion:1};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='Entwurf-'+select.value+'.rapport';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
})();
