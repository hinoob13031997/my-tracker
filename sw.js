const CACHE='stack-v21-safe-backup';
const STATIC=['./manifest.webmanifest','./icon.svg','./backup.js'];
const BACKUP_SCRIPT='<script src="./backup.js?v=21"></script>';

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).catch(()=>{}));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

async function injectBackup(response){
  if(!response) return response;
  try{
    const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html')) return response;
    let text=await response.text();
    if(!text.includes('backup.js?v=21')){
      text=text.includes('</body>')
        ? text.replace('</body>',BACKUP_SCRIPT+'</body>')
        : text+BACKUP_SCRIPT;
    }
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    return new Response(text,{
      status:response.status,
      statusText:response.statusText,
      headers
    });
  }catch(e){
    return response;
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;

  const req=event.request;
  const isNavigation=req.mode==='navigate' || req.destination==='document';

  if(isNavigation){
    event.respondWith((async()=>{
      try{
        const network=await fetch(req,{cache:'no-store'});
        const raw=network.clone();
        caches.open(CACHE).then(cache=>cache.put('./index.html',raw)).catch(()=>{});
        return await injectBackup(network);
      }catch(e){
        const cached=await caches.match('./index.html') || await caches.match('./');
        return injectBackup(cached);
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>{
      const network=fetch(req).then(resp=>{
        if(resp && resp.ok){
          const copy=resp.clone();
          caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});
        }
        return resp;
      }).catch(()=>cached);
      return cached || network;
    })
  );
});