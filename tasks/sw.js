var C='tasks-v24';
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(['./','index.html','manifest.json','fonts/assistant.css'])}));self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C}).map(function(x){return caches.delete(x)}))}));self.clients.claim()});
self.addEventListener('fetch',function(e){if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
e.respondWith(fetch(e.request,{cache:'reload'}).then(function(r){if(r.ok){var cp=r.clone();caches.open(C).then(function(c){c.put(e.request,cp)})}return r}).catch(function(){return caches.match(e.request)}))});
