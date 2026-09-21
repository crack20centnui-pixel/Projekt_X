const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const os=require('node:os');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function section(start,end){const a=html.indexOf(start);assert.ok(a>=0,start);const b=html.indexOf(end,a+start.length);assert.ok(b>a,end);return html.slice(a,b);}
function context(extra={}){
 const c={RapportWorkflow:require('../rapport-workflow.js'),Date,JSON,Object,Number,TextEncoder,console,alert:()=>{},confirm:()=>true,...extra};c.window=c;vm.createContext(c);return c;
}
function load(c,start,end){vm.runInContext(section(start,end),c);}
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};}
function saveContext(){
 let database={R:{__ownerUid:'owner-A',__serverRevision:3,__accessUids:['owner-A','user-B'],__version:2}};
 const c=context({currentOrderKey:'R',currentCreatedAt:null,formDirty:true,cloudUser:{uid:'user-B'},
  ensureRapportId:()=> 'R',referenceValue:()=> 'changed',getDB:()=>structuredClone(database),putDB:x=>database=structuredClone(x),
  captureForm:()=>({ref:{value:'changed'},__signatures:{kunde:'data:image/png;base64,TEST'}}),
  refreshOrderSelect:()=>{},updateHeaderInfo:()=>{},setStatus:()=>{},setCloudHeader:()=>{},markDirty:()=>{c.marked=true;},showSyncError:x=>{c.error=x;}});
 load(c,'function preserveRapportMetadata','function activateLocalAccount');load(c,'function saveOrder(){','function loadSelectedOrder');
 c.originalSaveOrder=c.saveOrder;load(c,'function localSaveWithChangeLog(){','window.rapportLocalSaved=');return c;
}
test('Save retains owner, revision, access and signatures',()=>{
 const c=saveContext();c.localSaveWithChangeLog();const r=c.getDB().R;
 assert.equal(r.__ownerUid,'owner-A');assert.equal(r.__serverRevision,3);assert.deepEqual(r.__accessUids,['owner-A','user-B']);
 assert.equal(r.__signatures.kunde,'data:image/png;base64,TEST');assert.equal(r.__version,3);assert.equal(c.formDirty,false);assert.equal(c.marked,true);
});
test('Cancelled save does not mark changes or report success',()=>{
 const c=saveContext();c.currentOrderKey='other';c.confirm=()=>false;c.localSaveWithChangeLog();assert.equal(c.marked,undefined);assert.equal(c.formDirty,true);
});
test('Storage failure retains dirty state and displays error',()=>{
 const c=saveContext();c.putDB=()=>{throw Error('quota')};c.localSaveWithChangeLog();assert.match(c.error,/quota/);assert.equal(c.formDirty,true);assert.equal(c.marked,undefined);
});
function mergeContext(){const c=context();load(c,'function applyServerToLocal(','async function syncAll');return c;}
function server(state,revision=3){return {data:{rptId:'R',ownerUid:'A',revision,rapportStateJson:JSON.stringify(state)},snap:{id:'R'},ownerUid:'A'};}
test('Old cloud record does not erase local signature',()=>{
 const c=mergeContext(),db={R:{__signatures:{kunde:'signature'}}};c.applyServerToLocal(server({ref:{value:'cloud'}}),db,{changes:{}});assert.equal(db.R.__signatures.kunde,'signature');
});
test('Explicit signature deletion syncs and does not resurrect image',()=>{
 const c=mergeContext(),db={R:{__signatures:{kunde:'signature'}}};c.applyServerToLocal(server({__signatures:{kunde:''}}),db,{changes:{}});assert.equal(db.R.__signatures.kunde,'');
});
test('Conflicting and pending local data are not overwritten',()=>{
 const c=mergeContext(),db={R:{ref:{value:'local'}}};assert.equal(c.applyServerToLocal(server({ref:{value:'cloud'}},4),db,{changes:{R:{baseRevision:3}}}).conflict,true);
 assert.equal(db.R.ref.value,'local');assert.equal(c.applyServerToLocal(server({},3),db,{changes:{R:{baseRevision:3}}}).skipped,true);
});
test('Account migration isolates known owners and preserves unassigned legacy data',()=>{
 const store=storage();const c=context({localStorage:store,ORDER_DB_KEY:'orders',activeLocalUid:'',initialTemplate:null,clearSignature:()=>{},ensureRapportId:()=>{},refreshOrderSelect:()=>{},updateHeaderInfo:()=>{},document:{getElementById:()=>null}});
 store.setItem('orders',JSON.stringify({A:{__ownerUid:'a'},B:{__ownerUid:'b'},UNKNOWN:{ref:'legacy'}}));
 load(c,'function activateLocalAccount','let initialTemplate=');load(c,'function getDB(){','function referenceValue');
 c.activateLocalAccount('a');assert.deepEqual(Object.keys(c.getDB()),['A']);c.activateLocalAccount('b');assert.deepEqual(Object.keys(c.getDB()),['B']);
 c.activateLocalAccount('');assert.deepEqual(Object.keys(c.getDB()),[]);assert.ok(JSON.parse(store.getItem('orders')).UNKNOWN);assert.throws(()=>c.putDB({}),/anmelden/);
});
test('Save made during upload remains pending at the new base revision',()=>{
 let meta={changes:{R:{at:'new-save',baseRevision:3}}},db={R:{__ownerUid:'A'}};
 const c=context({getSyncMeta:()=>structuredClone(meta),putSyncMeta:x=>meta=x,getDB:()=>structuredClone(db),putDB:x=>db=x,cloudUser:{uid:'A'}});
 load(c,'function clearDirty(','function masterOrderSource');c.clearDirty('R',4,'old-save');assert.equal(meta.changes.R.baseRevision,4);assert.equal(db.R.__serverRevision,4);
 c.clearDirty('R',5,'new-save');assert.equal(meta.changes.R,undefined);
});
function syncContext({existing=true,revision=3,base=3}={}){
 let dbLocal={R:{__ownerUid:'A',__serverRevision:base,__status:'fertig',__signatures:{kunde:'signature'},auftrag:{value:'123'}}};
 let meta={changes:{R:{at:'save',baseRevision:base}}};const writes=[];
 const c=context({cloudUser:{uid:'A'},cloudProfile:{role:'admin'},formDirty:false,currentOrderKey:'',syncBtn:{disabled:false},db:{},
  getSyncMeta:()=>structuredClone(meta),putSyncMeta:x=>meta=x,getDB:()=>structuredClone(dbLocal),putDB:x=>dbLocal=structuredClone(x),
  readMaster:async()=>({auftraege:[]}),accessibleServerRapports:async()=>[],doc:(...args)=>args.slice(1).join('/'),
  runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>existing,data:()=>({revision,status:'in_bearbeitung'})}),set:(ref,data)=>writes.push({ref,data})}),
  getDoc:async()=>({exists:()=>false}),setDoc:async()=>{},serverTimestamp:()=> 'now',orderNumberFromState:()=> '123',masterOrderSource:()=> 'master',displayName:()=> 'User',originalRefreshOrderSelect:()=>{},setCloudHeader:()=>{},setStatus:()=>{},showSyncError:x=>{c.error=x;}});
 load(c,'function clearDirty(','function masterOrderSource');load(c,'function applyServerToLocal(','async function syncAll');load(c,'async function syncAll(){','function localSaveWithChangeLog');c.writes=writes;return c;
}
test('Transactional upload includes signatures and finished status',async()=>{const c=syncContext();await c.syncAll();assert.equal(c.writes.length,1);const d=c.writes[0].data;assert.equal(d.revision,4);assert.equal(d.status,'fertig');assert.equal(JSON.parse(d.rapportStateJson).__signatures.kunde,'signature');assert.equal(c.syncBtn.disabled,false);});
test('Stale revision cannot overwrite cloud state',async()=>{const c=syncContext({revision:4});await c.syncAll();assert.equal(c.writes.length,0);assert.match(c.error,/Konflikt/);});
test('Moved or deleted synced report cannot be recreated',async()=>{const c=syncContext({existing:false,base:3});await c.syncAll();assert.equal(c.writes.length,0);assert.match(c.error,/verschoben/);});
test('New report uploads normally',async()=>{const c=syncContext({existing:false,base:0});await c.syncAll();assert.equal(c.writes.length,1);assert.equal(c.writes[0].data.revision,1);});
test('Unsaved form blocks sync',async()=>{const c=syncContext();c.formDirty=true;await c.syncAll();assert.equal(c.writes.length,0);});
test('All inline JavaScript and service worker parse',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rapport-syntax-'));try{
 let n=0;for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(!m[2].trim())continue;const file=path.join(dir,`script-${n++}.${/type=["']module/.test(m[1])?'mjs':'cjs'}`);fs.writeFileSync(file,m[2]);const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 }
 const r=spawnSync(process.execPath,['--check',path.join(__dirname,'../service-worker.js')],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Finished checkbox maps to cloud status without changing legacy field keys',()=>{
 const checks=[{checked:false},{checked:false},{checked:true},{checked:false}];
 const c=context({currentCreatedAt:'2026-09-21',fields:()=>[],document:{querySelectorAll:q=>q.includes('.checkrow')?[{textContent:'Arbeit fertig:',querySelectorAll:()=>checks}]:[],getElementById:()=>null}});
 load(c,'function captureForm(){','function applyForm');assert.equal(c.captureForm().__status,'fertig');checks[3].checked=true;assert.equal(c.captureForm().__status,'in_bearbeitung');
});
test('Admin open refuses to overwrite pending local changes',()=>{
 const c=context({adminOrderRows:[{id:'R',rapportStateJson:'{}'}],confirmDiscard:()=>true,getSyncMeta:()=>({changes:{R:{}}}),getDB:()=>{throw Error('must not overwrite')}});
 load(c,'function openAdminRptById(','async function loadAdminMaster');assert.doesNotThrow(()=>c.openAdminRptById('R'));
});
test('Self-transfer cannot delete the original report',async()=>{
 const c=context({adminOnly:()=>true,adminSelectedRptId:'R',adminOrderRows:[{id:'R',ownerUid:'A',accessUids:['A']}],document:{getElementById:id=>id==='adminAssignTarget'?{value:'A'}:{}},db:{},doc:()=>({}),runTransaction:()=>{throw Error('must not write')}});
 load(c,'async function adminAssignOrder(','document.getElementById("adminAssignAddBtn")');await assert.doesNotReject(()=>c.adminAssignOrder(true));
});
test('Reopening preserves identifiers and work while clearing completion and signatures only in new state',()=>{
 const wf=require('../rapport-workflow.js');const saved={ref:{value:'Einsatz A'},auftrag:{value:'Projekt'},rapportnr:{value:'R'},field_20:{checked:true},arbeiten:{value:'7 Tage'},__signatures:{kunde:'old-signature'}};
 const record={rapportStateJson:JSON.stringify(saved)};const next=wf.archiveState(record,false,['field_20']);
 assert.equal(next.ref.value,'Einsatz A');assert.equal(next.rapportnr.value,'R');assert.equal(next.arbeiten.value,'7 Tage');assert.equal(next.field_20.checked,false);assert.equal(next.__signatures.kunde,'');assert.equal(JSON.parse(record.rapportStateJson).__signatures.kunde,'old-signature');
});
test('Archiving preserves signed completed state',()=>{const wf=require('../rapport-workflow.js');const result=wf.archiveState({rapportStateJson:JSON.stringify({__signatures:{kunde:'signed'},field_1:{checked:true}})},true,['field_1']);assert.equal(result.__archived,true);assert.equal(result.__signatures.kunde,'signed');assert.equal(result.field_1.checked,true);});
test('Sync cursor compares server nanoseconds and never moves backwards',()=>{
 const wf=require('../rapport-workflow.js');assert.deepEqual(wf.nextCursor({seconds:4,nanoseconds:8},[{data:{updatedAt:{seconds:4,nanoseconds:7}}},{data:{updatedAt:{seconds:4,nanoseconds:9}}}]),{seconds:4,nanoseconds:9});
});
test('Archived local data cannot be saved',()=>{const c=saveContext();const old=c.getDB();old.R.__archived=true;c.putDB(old);c.localSaveWithChangeLog();assert.match(c.error,/Archivierter/);assert.equal(c.marked,undefined);});
test('First Monteur sync requests active assigned rapports only',async()=>{
 let queryArgs;const c=context({cloudUser:{uid:'M'},cloudProfile:{role:'monteur'},db:{},where:(...x)=>x,collectionGroup:()=>({}),query:(...x)=>(queryArgs=x),getSyncMeta:()=>({}),getDocs:async()=>({forEach:()=>{}})});
 load(c,'async function accessibleServerRapports(','function applyServerToLocal');await c.accessibleServerRapports({incremental:true});assert.deepEqual(Array.from(queryArgs[1]),['accessUids','array-contains','M']);assert.equal(queryArgs[2][0],'status');
});
test('Later sync uses inclusive server timestamp so equal-timestamp updates are not missed',async()=>{
 let queryArgs;const c=context({cloudUser:{uid:'M'},cloudProfile:{role:'monteur'},db:{},Timestamp:class{constructor(seconds,nanoseconds){this.seconds=seconds;this.nanoseconds=nanoseconds;}},where:(...x)=>x,collectionGroup:()=>({}),query:(...x)=>(queryArgs=x),getSyncMeta:()=>({downloadCursor:{seconds:12,nanoseconds:34}}),getDocs:async()=>({forEach:()=>{}})});
 load(c,'async function accessibleServerRapports(','function applyServerToLocal');await c.accessibleServerRapports({incremental:true});assert.equal(queryArgs[2][0],'updatedAt');assert.equal(queryArgs[2][1],'>=');assert.equal(queryArgs[2][2].nanoseconds,34);
});
