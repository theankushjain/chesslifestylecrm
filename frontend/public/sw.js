self.addEventListener('push', function(event) {
  let text = "You have pending tasks!";
  if (event.data) {
    text = event.data.text();
  }

  const options = {
    body: text,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {action: 'explore', title: 'View Tasks'}
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Chesslifestyle CRM', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/tasks')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
