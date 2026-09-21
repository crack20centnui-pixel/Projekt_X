/* Private, user-triggered Drive backups. OAuth tokens remain in memory only. */
(() => {
  const OWNER='latthiwan.danuwat@gmail.com';
  const ROOT='https://www.googleapis.com/drive/v3';
  const scripts=new Map();
  function loadScript(src){
    if(!scripts.has(src))scripts.set(src,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{scripts.delete(src);reject(new Error('PDF-Bibliothek konnte nicht geladen werden.'));};document.head.appendChild(s);}));
    return scripts.get(src);
  }
  async function api(token,path,options={}){
    let r;
    try{r=await fetch(ROOT+path,{...options,cache:'no-store',headers:{Authorization:'Bearer '+token,...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});}
    catch(e){throw new Error('Verbindung zu Google Drive fehlgeschlagen ('+path.split('?')[0]+'). Bitte Internetverbindung prüfen oder Chrome/Safari verwenden.');}
    if(!r.ok){let details;try{details=await r.json()}catch(_){}throw new Error(details?.error?.message||'Drive-Anfrage fehlgeschlagen ('+r.status+').');}
    return r.json();
  }
  async function privateFolder(token){
    const profile=await api(token,'/about?fields=user(emailAddress)');
    if(profile.user?.emailAddress?.toLowerCase()!==OWNER)throw new Error('Bitte das Drive-Konto '+OWNER+' auswählen.');
    const q="trashed = false and mimeType = 'application/vnd.google-apps.folder' and 'me' in owners and appProperties has { key='rapportBackup' and value='equans-rapport-test' }";
    const found=await api(token,'/files?q='+encodeURIComponent(q)+'&fields=files(id)&pageSize=100');
    let id=found.files?.[0]?.id;
    if(!id){const f=await api(token,'/files?fields=id',{method:'POST',body:JSON.stringify({name:'EQUANS Rapport – private Backups',mimeType:'application/vnd.google-apps.folder',parents:['root'],appProperties:{rapportBackup:'equans-rapport-test'}})});id=f.id;}
    const folder=await api(token,'/files/'+encodeURIComponent(id)+'?fields=id,webViewLink,shared,owners(emailAddress),permissions(type,role,emailAddress)');
    if(folder.shared||folder.owners?.length!==1||folder.owners[0].emailAddress.toLowerCase()!==OWNER||folder.permissions?.some(p=>p.role!=='owner'))throw new Error('Der Backup-Ordner ist nicht ausschliesslich privat. Keine Dateien hochgeladen.');
    return folder;
  }
  async function upload(token,folder,name,blob){
    const boundary='rapport_'+crypto.randomUUID();
    const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify({name,parents:[folder.id]}),'\r\n--'+boundary+'\r\nContent-Type: '+blob.type+'\r\n\r\n',blob,'\r\n--'+boundary+'--'],{type:'multipart/related; boundary='+boundary});
    const r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,name',{method:'POST',headers:{Authorization:'Bearer '+token},body});
    if(!r.ok){const error=await r.json();throw new Error(error.error?.message||'Drive-Upload fehlgeschlagen.');}
    return r.json();
  }
  async function pdfBlob(){
    await Promise.all([loadScript('vendor/html2canvas-1.4.1.min.js'),loadScript('vendor/jspdf-4.2.1.umd.min.js')]);
    window.syncBeiblattHeaders?.();window.recalcAllWorkHours?.();window.updateHeaderInfo?.();
    const pages=[['pdf1','rapportPage'],['pdf4','regiePage'],['pdf6','arbeitszeitPage'],['pdf7','legendePage'],['pdf2','messPage'],['pdf3','materialPage'],['pdf5','materialRegiePage']].filter(([id])=>document.getElementById(id)?.checked);
    if(!pages.length)throw new Error('Bitte mindestens eine PDF-Seite im Menü «PDF erstellen» auswählen.');
    const pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    for(let i=0;i<pages.length;i++){
      const id=pages[i][1],element=document.getElementById(id);
      const canvas=await window.html2canvas(element,{scale:2,backgroundColor:'#ffffff',windowWidth:1100,windowHeight:1400,logging:false,onclone:clone=>{
        // Use the existing print design in html2canvas's isolated clone.
        for(const style of clone.querySelectorAll('style'))style.textContent=style.textContent.replace(/@media\s+screen[^\{]*\{/gi,'@media not all {').replace(/@media\s+print\s*\{/gi,'@media all {');
        clone.body.classList.add('pdf-printing');
        clone.querySelectorAll('.pagepart').forEach(p=>p.style.setProperty('display',p.id===id?'block':'none','important'));
        const page=clone.getElementById(id);page.classList.add('pdf-print-selected','pdf-print-first','pdf-print-last');
        const fix=clone.createElement('style');fix.textContent='#'+id+'{display:block!important;position:relative!important;transform:none!important;zoom:1!important;width:210mm!important;min-width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:none!important;margin:0!important;box-sizing:border-box!important}';clone.head.appendChild(fix);
        // Render form values as normal text: canvas browsers clip native input baselines.
        for(const input of page.querySelectorAll('input:not([type="hidden"]),textarea,select')){
          const style=clone.defaultView.getComputedStyle(input),rect=input.getBoundingClientRect(),text=clone.createElement('div');
          const checkbox=input.type==='checkbox';
          text.textContent=checkbox?(input.checked?'X':''):input.tagName==='SELECT'?(input.value?input.selectedOptions[0]?.textContent:''):(input.value||'');
          text.style.cssText='box-sizing:border-box;display:flex;align-items:center;overflow:hidden;max-width:100%;padding:1px 2px;height:'+rect.height+'px;font-family:'+style.fontFamily+';font-size:'+style.fontSize+';font-weight:'+style.fontWeight+';line-height:normal;color:'+style.color+';text-align:'+style.textAlign;
          if(checkbox)text.style.cssText+=';width:'+rect.width+'px;border:1px solid #444;justify-content:center;padding:0';
          if(input.tagName==='TEXTAREA')text.style.cssText+=';display:block;white-space:pre-wrap;overflow-wrap:anywhere';
          input.replaceWith(text);
        }
      }});
      if(i)pdf.addPage();
      const width=210,height=canvas.height*width/canvas.width;
      if(height>298)throw new Error('PDF-Seite ist höher als A4. Bitte Drucklayout prüfen; Backup wurde nicht hochgeladen.');
      pdf.addImage(canvas.toDataURL('image/jpeg',0.95),'JPEG',0,0,width,height);
    }
    return pdf.output('blob');
  }
  window.rapportPdfBlob=pdfBlob;
  document.getElementById('downloadPdfBtn')?.addEventListener('click',async()=>{
    const button=document.getElementById('downloadPdfBtn'),status=document.getElementById('driveBackupStatus');
    try{button.disabled=true;status.textContent='PDF wird erstellt …';const blob=await pdfBlob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(document.querySelector('[name="ref"]')?.value||'Rapport').replace(/[\\/]/g,'_')+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='PDF erstellt.';}
    catch(e){status.textContent=e.message||e;}finally{button.disabled=false;}
  });
  document.getElementById('driveBackupBtn')?.addEventListener('click',async()=>{
    const button=document.getElementById('driveBackupBtn'),status=document.getElementById('driveBackupStatus');
    let uploaded=[],locked=[],stage='Vorbereitung';
    try{
      const context=window.rapportDriveContext();locked=[...document.querySelectorAll('.sheet,#pdfToolbar,#signatureBlock,#adminOverlay')].map(el=>({el,inert:el.inert}));locked.forEach(x=>x.el.inert=true);button.disabled=true;status.textContent='Google-Freigabe für '+OWNER+' …';
      // Starts inside the user click, so popup blockers do not block the consent dialog.
      stage='Google-Anmeldung';const token=await window.rapportDriveToken();
      stage='Privaten Drive-Ordner prüfen';const folder=await privateFolder(token);status.textContent='PDF und Rapport-Datei werden erstellt …';
      stage='PDF erstellen';const pdf=await pdfBlob();
      const state={...context.state,__fileType:'EQUANS_RAPPORT',__formatVersion:1,__rapportId:context.id};
      const stem=((context.orderNumber||'Auftrag')+' – '+(context.reference||'Ohne Referenz')+' – '+new Date().toISOString().replace(/[:.]/g,'-')).replace(/[\\/]/g,'_');
      stage='Rapport-Datei hochladen';uploaded.push(await upload(token,folder,stem+'.rapport',new Blob([JSON.stringify(state,null,2)],{type:'application/json'})));
      stage='PDF hochladen';uploaded.push(await upload(token,folder,stem+'.pdf',pdf));
      stage='Dateifreigaben prüfen';for(const file of uploaded){const info=await api(token,'/files/'+file.id+'?fields=shared,owners(emailAddress),permissions(role)');if(info.shared||info.owners?.[0]?.emailAddress?.toLowerCase()!==OWNER||info.permissions?.some(p=>p.role!=='owner'))throw new Error('Dateifreigaben bitte in Drive prüfen.');}
      let receiptSaved=true;
      try{localStorage.setItem('equansDriveBackupV1_'+context.uid+'_'+context.id,JSON.stringify({at:new Date().toISOString(),savedAt:context.state.__savedAt,files:uploaded.map(x=>x.id)}));}catch(_){receiptSaved=false;}
      window.updateRapportStorageStatus?.();
      status.replaceChildren(document.createTextNode('PDF und Rapport-Datei privat gesichert. '+(receiptSaved?'':'Lokale Backup-Anzeige konnte nicht gespeichert werden. ')));
      if(folder.webViewLink){const a=document.createElement('a');a.href=folder.webViewLink;a.target='_blank';a.rel='noopener';a.textContent='Backup-Ordner öffnen';status.appendChild(a);}
    }catch(e){status.textContent=(uploaded.length?'Nur teilweise gesichert ('+uploaded.length+' Datei). ':'')+stage+': '+(e.message||e);}
    finally{locked.forEach(x=>x.el.inert=x.inert);button.disabled=false;}
  });
})();
