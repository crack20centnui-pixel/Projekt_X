// Isolated UI test server. Never serves Firebase credentials or writes production data.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');let counter=0;
const stamp=()=>({seconds:1800000000,nanoseconds:++counter});
const docs={
 'users/test-admin':{displayName:'Test Admin',username:'testadmin',role:'admin',active:true},
 'users/test-monteur':{displayName:'Test Monteur',username:'testmonteur',role:'monteur',active:true},
 'admin/system/masterData/data':{version:1,auftraege:[{orderNumber:'TEST-100',name:'Testprojekt'}]},
};
function resolve(x){if(x?.__serverTime)return stamp();if(Array.isArray(x))return x.map(resolve);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,resolve(v)]));return x;}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/__test_pdf'){
   const data=[];for await(const b of req)data.push(b);fs.writeFileSync('/tmp/rapport-workflow-test.pdf',Buffer.concat(data));res.end('PDF gespeichert');return;
 }
 if(url.pathname==='/__test_api'){
  let raw='';for await(const p of req)raw+=p;const q=JSON.parse(raw);let result;
  if(q.op==='get')result=docs[q.path]??null;
  else if(q.op==='query')result=Object.entries(docs).filter(([key])=>q.group?key.split('/').at(-2)===q.group:key.startsWith(q.path+'/')&&key.split('/').length===q.path.split('/').length+1).map(([path,data])=>({path,data}));
  else if(q.op==='commit'){
   if(q.reads?.some(r=>JSON.stringify(docs[r.path]??null)!==JSON.stringify(r.data))) {res.writeHead(409);res.end('{}');return;}
   for(const w of q.writes){if(w.delete)delete docs[w.path];else docs[w.path]=w.merge?{...docs[w.path],...resolve(w.data)}:resolve(w.data);}
   result={ok:true};
  }
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;
 }
 if(url.pathname==='/service-worker.js'){res.writeHead(404);res.end();return;}
 let name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
 if(name==='admin'||name==='monteur')name='index.html';
 const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('</body>',`<button id="testPdf" style="position:fixed;bottom:0;left:0;z-index:999999">Test-PDF erzeugen</button><script>document.getElementById('testPdf').onclick=async function(){try{this.textContent='PDF läuft';for(const id of ['pdf1','pdf2','pdf3','pdf4','pdf5','pdf6','pdf7'])document.getElementById(id).checked=true;const pdf=await window.rapportPdfBlob();await fetch('/__test_pdf',{method:'POST',body:pdf});this.textContent='Test-PDF gespeichert';}catch(e){this.textContent=e.message;}};</script></body>`).replace(/https:\/\/www.gstatic.com\/firebasejs\/12.3.0\/firebase-[a-z]+\.js/g,'/tests/fake-firebase.mjs').replace('<body spellcheck="false">','<body spellcheck="false"><div style="background:#fff3a3;padding:8px">ISOLIERTER TEST – keine echten Rapporte / keine Firebase-Verbindung</div>'));
 res.setHeader('Content-Type',name.endsWith('.html')?'text/html':/\.m?js$/.test(name)?'application/javascript':name.endsWith('.png')?'image/png':'text/plain');res.end(data);
 }catch(e){res.writeHead(404);res.end();}
});server.listen(8766,'127.0.0.1',()=>console.log('Isolated test preview http://127.0.0.1:8766/admin and /monteur'));
