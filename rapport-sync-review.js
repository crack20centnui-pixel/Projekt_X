/* Local comparison UI. Firebase access remains exclusively in manual SYNC. */
(() => {
  const names={auftrag:'Auftragsnummer',ref:'Referenz',arbeiten:'Ausgeführte Arbeiten',datum:'Datum',ort:'Ausführungsort',kontakt:'Kontakt',__status:'Abschlussstatus',__signatures:'Unterschriften'};
  const labelFor=key=>names[key]||key.replace(/^regie_/,'Regie · ').replace(/^field_\d+$/,'Rapportfeld');
  window.rapportMergeGroups=()=>{
    const fields=window.fields?.()||[],units=[...document.querySelectorAll('.material-unit')],groups=[];
    for(const sheet of document.querySelectorAll('.sheet')){
      let checkIndex=0;
      for(const row of sheet.querySelectorAll('.checkrow')){const keys=[...row.querySelectorAll('input')].map(el=>window.fieldKey(el,fields.indexOf(el)));if(sheet.id==='rapportPage'&&row.textContent.includes('Arbeit fertig:'))keys.push('__status');if(keys.length)groups.push({id:sheet.id+'-check-'+checkIndex++,label:'Abschluss / Prüfungen',keys});}
      let tableIndex=0;
      for(const table of sheet.querySelectorAll('table')){
        tableIndex++;let rowIndex=0;
        for(const row of table.rows){rowIndex++;const keys=[...row.querySelectorAll('input,textarea')].map(el=>window.fieldKey(el,fields.indexOf(el)));
          for(const unit of row.querySelectorAll('.material-unit'))keys.push('__unit_'+units.indexOf(unit));
          if(keys.length)groups.push({id:sheet.id+'-table-'+tableIndex+'-row-'+rowIndex,label:(sheet.id.includes('regie')?'Regie · ':'')+(table.classList.contains('material-compact-columns')?'Material':sheet.id==='messPage'?'Messungen':'Tabelle '+tableIndex)+' · Zeile '+rowIndex,keys});
        }
      }
    }
    return groups;
  };
  const style=document.createElement('style');style.textContent=`
  #syncReview{width:min(850px,calc(100vw - 24px));max-height:90dvh;overflow:auto;border:1px solid #dce5e9;border-radius:14px;padding:20px;color:#173343;background:white;font:14px Arial}#syncReview::backdrop{background:#12344780}#syncReview h2{font-size:21px;margin-top:0}#syncReview h3{font-size:16px}#syncReview p{line-height:1.5}#syncReview button{min-height:42px;padding:10px 14px;border:1px solid #cbdbe2;border-radius:7px;background:#fff;color:#173343;cursor:pointer;margin:5px}#syncReview .sr-close{float:right}#syncReview article{border-top:1px solid #dce5e9;margin-top:18px;padding-top:14px}#syncReview fieldset{border:1px solid #dce5e9;border-radius:8px;margin:12px 0;padding:10px}#syncReview .sr-options{display:grid;grid-template-columns:1fr 1fr;gap:12px}#syncReview label{display:block;padding:10px;background:#f5f8fa;border-radius:6px}#syncReview input{width:18px;height:18px;margin:0 8px 0 0;accent-color:#087c56}#syncReview pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px Arial;max-height:220px;overflow:auto;line-height:1.5}#syncReview .sr-apply{background:#087c56;color:#fff}#syncReview .sr-message{color:#8b4e19} @media(max-width:550px){#syncReview .sr-options{grid-template-columns:1fr}} @media print{#syncReview{display:none!important}}
  `;document.head.append(style);
  const dialog=document.createElement('dialog');dialog.id='syncReview';dialog.setAttribute('aria-label','Änderungen vergleichen');document.body.append(dialog);
  const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  const download=data=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='Rapport-Vergleich-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const showValues=value=>Object.entries(value||{}).map(([k,v])=>labelFor(k)+': '+(k==='__signatures'?Object.entries(v||{}).map(([role,img])=>role+': '+(img?'vorhanden':'leer')).join(', '):typeof v==='object'&&v!==null&&'value' in v?v.value:typeof v==='object'&&v!==null&&'checked' in v?v.checked?'Ja':'Nein':JSON.stringify(v))).join('\n');
  function render(){
    dialog.replaceChildren();const close=el('button','Schliessen');close.type='button';close.className='sr-close';close.onclick=()=>dialog.close();dialog.append(close,el('h2','Änderungen vergleichen'),el('p','Änderungen in verschiedenen Bereichen werden automatisch zusammengeführt. Hier bleiben nur Unterschiede, die eine Entscheidung brauchen. Deine lokalen Eingaben bleiben erhalten.'));
    const all=window.rapportSyncConflicts?.()||{},entries=Object.entries(all);
    if(!entries.length)dialog.append(el('p','Keine offenen Vergleiche.'));
    for(const [id,c] of entries){
      const card=el('article'),choices={};card.append(el('h3',c.local?.ref?.value||c.remote?.ref?.value||id));
      if(c.reason==='missing-base')card.append(el('p','Dieser ältere Rapport hat noch keinen gemeinsamen Vergleichsstand. Bitte beide vollständigen Fassungen prüfen. Es wird nichts nach Uhrzeit überschrieben.'));
      if(c.reason==='signed')card.append(el('p','Unterschrift oder Abschluss vorhanden: Wir mischen diese Fassungen nicht automatisch. Wähle die vollständige, gültige Fassung.'));
      if(c.reason)card.append(el('p','Angezeigt werden die Unterschiede. Die Auswahl gilt hier für die vollständige Fassung.'));
      for(const [i,difference] of (c.fields||[]).entries()){
        const fieldset=el('fieldset'),legend=el('legend',labelFor(difference.label||difference.id));fieldset.append(legend);const options=el('div');options.className='sr-options';
        for(const [value,title,state] of [['local','Dieses Gerät',difference.local],['remote','Firebase',difference.remote]]){
          const label=el('label'),radio=el('input');radio.type='radio';radio.name='sync-choice-'+id+'-'+i;radio.value=value;radio.onchange=()=>choices[difference.id]=value;
          const shown=difference.id==='__whole'?Object.fromEntries(Object.entries(state||{}).filter(([key,v])=>!RapportWorkflow.equal(v,(value==='local'?difference.remote:difference.local)?.[key]))):state;
          label.append(radio,el('strong',title),el('pre',showValues(shown))); options.append(label);
        }fieldset.append(options);card.append(fieldset);
      }
      const message=el('p');message.className='sr-message';message.setAttribute('role','status');
      const backup=el('button','Beide Fassungen als Datei sichern');backup.type='button';backup.onclick=()=>download(c);
      const apply=el('button','Auswahl lokal übernehmen');apply.type='button';apply.className='sr-apply';apply.onclick=()=>{try{window.rapportResolveSyncConflict(id,choices);render();dialog.append(el('p','Auswahl lokal gespeichert. Schliessen und SYNC drücken, um sie zu übertragen.'));}catch(e){message.textContent=e.message;}};
      card.append(backup,apply,message);dialog.append(card);
    }
    const history=el('button','Gesicherte Vergleiche als Datei herunterladen');history.type='button';history.onclick=()=>download(window.rapportSyncRecoveryExport?.()||[]);dialog.append(history);
  }
  window.openRapportSyncReview=()=>{document.getElementById('viewMenu')?.close();render();if(!dialog.open)dialog.showModal();};
  const addButton=parent=>{if(!parent)return;const b=el('button','Sync-Vergleiche');b.type='button';b.onclick=window.openRapportSyncReview;parent.append(b);};
  addButton(document.querySelector('#moreActions .more-popover'));
  addButton(document.querySelector('#viewMenu .view-pages'));
})();
