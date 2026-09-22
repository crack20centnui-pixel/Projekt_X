const uid=location.pathname==='/monteur'?'test-monteur':'test-admin';
const auth={currentUser:{uid,email:'test@example.invalid'}};
export const initializeApp=()=>({});export const getAuth=()=>auth;export const getFirestore=()=>({});
export class GoogleAuthProvider{addScope(){}setCustomParameters(){}static credentialFromResult(){return {accessToken:'test-only'}}}
export const signInWithPopup=async()=>({user:auth.currentUser});export const reauthenticateWithPopup=signInWithPopup;
export const signInWithEmailAndPassword=signInWithPopup;export const createUserWithEmailAndPassword=signInWithPopup;
export const signOut=async()=>{};export const onAuthStateChanged=(_,cb)=>setTimeout(()=>cb(auth.currentUser),30);
export class Timestamp{constructor(seconds,nanoseconds){this.seconds=seconds;this.nanoseconds=nanoseconds}}
export const serverTimestamp=()=>({__serverTime:true});export const deleteField=()=>null;
export const doc=(_, ...parts)=>({path:parts.join('/')});export const collection=doc;export const collectionGroup=(_,group)=>({group});
export const where=(field,op,value)=>({field,op,value});export const query=(base,...filters)=>({...base,filters});
async function api(data){const r=await fetch('/__test_api',{method:'POST',body:JSON.stringify(data)});if(!r.ok)throw Error('Concurrent test transaction');return r.json();}
function snapshot(ref,data){return {id:ref.path.split('/').at(-1),ref:{...ref,parent:{parent:{id:ref.path.split('/').at(-3)}}},exists:()=>data!==null,data:()=>data};}
export async function getDoc(ref){return snapshot(ref,await api({op:'get',path:ref.path}));}
export async function getDocs(q){let rows=await api({op:'query',path:q.path,group:q.group});rows=rows.filter(r=>(q.filters||[]).every(f=>{const v=r.data[f.field];if(f.op==='array-contains')return v?.includes(f.value);if(f.op==='in')return f.value.includes(v);if(f.op==='>=')return v&&((v.seconds-f.value.seconds)||(v.nanoseconds-f.value.nanoseconds))>=0;return v===f.value;}));const list=rows.map(r=>snapshot({path:r.path},r.data));return {empty:!list.length,size:list.length,forEach:fn=>list.forEach(fn),docs:list};}
export const setDoc=(ref,data,options)=>api({op:'commit',writes:[{path:ref.path,data,merge:options?.merge}]});
export const deleteDoc=ref=>api({op:'commit',writes:[{path:ref.path,delete:true}]});
export async function runTransaction(_,fn){const reads=[],writes=[];const out=await fn({get:async ref=>{const d=await api({op:'get',path:ref.path});reads.push({path:ref.path,data:d});return snapshot(ref,d);},set:(ref,data,options)=>writes.push({path:ref.path,data,merge:options?.merge}),delete:ref=>writes.push({path:ref.path,delete:true})});await api({op:'commit',reads,writes});return out;}
