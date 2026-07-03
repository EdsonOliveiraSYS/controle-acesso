// ============================================================
// SERVICE WORKER - PORTARIAPRO
// Cache de arquivos para funcionamento offline e performance
// ============================================================

const CACHE_NAME = 'portariapro-v1';
const OFFLINE_URL = 'index.html';

// Arquivos que serão cacheados na instalação
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  // CSS e JS são embutidos no HTML, mas vamos cachear a página principal
  // Bibliotecas externas (CDN) - opcional, mas recomendado
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://unpkg.com/@zxing/library@latest/umd/index.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js'
];

// ============================================================
// INSTALAÇÃO
// ============================================================
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando arquivos iniciais');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] Instalação completa!');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Erro na instalação:', err);
      })
  );
});

// ============================================================
// ATIVAÇÃO
// ============================================================
self.addEventListener('activate', event => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Ativação completa!');
        return self.clients.claim();
      })
  );
});

// ============================================================
// ESTRATÉGIA DE CACHE: STALE-WHILE-REVALIDATE
// ============================================================
self.addEventListener('fetch', event => {
  // Ignorar requisições para o Supabase (dados dinâmicos)
  if (event.request.url.includes('supabase.co')) {
    // Estratégia: Network First (sempre buscar do servidor)
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Sem conexão com o servidor' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Para arquivos estáticos: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se encontrou no cache, devolve imediatamente
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Atualiza o cache com a versão mais recente
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseClone);
                });
            }
            return networkResponse;
          })
          .catch(err => {
            console.log('[SW] Erro ao buscar rede:', err);
            // Se falhar na rede e não tiver cache, tenta offline page
            if (!cachedResponse) {
              return caches.match(OFFLINE_URL);
            }
            return null;
          });

        // Devolve o cache primeiro, depois atualiza em background
        return cachedResponse || fetchPromise;
      })
      .catch(() => {
        // Fallback: tenta carregar a página offline
        return caches.match(OFFLINE_URL);
      })
  );
});

// ============================================================
// MENSAGENS DO CLIENTE
// ============================================================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

//============================================================
// PUSH NOTIFICATIONS (opcional)
// ============================================================
self.addEventListener('push', event => {
const data = event.data.json();
const options = {
body: data.body || 'Nova validação registrada!',
icon: '/icons/icon-192x192.png',
badge: '/icons/badge-72x72.png',
vibrate: [200, 100, 200],
data: {
url: data.url || '/'
}
};
event.waitUntil(
self.registration.showNotification('PortariaPro', options)
);
});

self.addEventListener('notificationclick', event => {
event.notification.close();
event.waitUntil(
clients.openWindow(event.notification.data.url)
);
});