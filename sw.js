// Incrémente ce numéro à chaque mise à jour de l'appli : ça force le navigateur
// à détecter un nouveau service worker et à purger l'ancien cache automatiquement.
const CACHE_NAME = 'suivi-alimentaire-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(()=>{})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stratégie "réseau d'abord" pour les pages/scripts DE L'APPLI (même origine) uniquement : on
// récupère toujours la dernière version en ligne quand c'est possible, et on ne retombe sur le
// cache que hors connexion.
// IMPORTANT : on ne touche PAS aux requêtes vers d'autres domaines (Open Food Facts, wger.de,
// Firebase, etc.) — les laisser passer sans interception évite qu'un souci de cache/mode CORS
// du service worker ne fasse échouer ou "fige" les recherches/API externes (bug observé : la
// recherche d'aliments semblait statique / le scan ne renvoyait rien, à cause de ça).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return; // laisse le navigateur gérer nativement

  event.respondWith(
    fetch(event.request).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(()=>{});
      return resp;
    }).catch(() => caches.match(event.request))
  );
});
