self.addEventListener('push', function(event) {
  let title = 'Chesslifestyle CRM';
  let body = 'You have a new notification!';
  let url = '/';

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.body || data.message || body;
      url = data.url || url;
    } catch (e) {
      body = event.data.text();
      if (body.toLowerCase().includes('attendance')) {
        url = '/portal?tab=attendance';
      }
    }
  }

  const options = {
    body: body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: url,
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      { action: 'open', title: 'View Details' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
