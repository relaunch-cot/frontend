class NotificationWebSocket {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000; // 3 segundos
    this.heartbeatInterval = null;
    this.isIntentionallyClosed = false;
  }

  connect(userId, token) {
    if (!userId || !token) {
      return;
    }

    const WS_BASE_URL = window.ENV_CONFIG?.WS_BACKEND || 'ws://localhost:8080';
    const wsUrl = `${WS_BASE_URL}/v1/ws/notifications?userId=${userId}&token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      this.scheduleReconnect(userId, token);
    }
  }

  setupEventHandlers() {
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        if (!event.data || event.data.trim() === '') {
          return;
        }
        
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        
        if (event.data && typeof event.data === 'string' && event.data.includes('}{')) {
        }
      }
    };

    this.ws.onerror = (error) => {
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };
  }

  handleMessage(data) {
    switch (data.type) {
      case 'CONNECTED':
        break;
      
      case 'NEW_NOTIFICATION':
        this.onNewNotification(data.notification);
        break;
      
      case 'NOTIFICATION_DELETED':
        this.onNotificationDeleted(data.notificationId);
        break;
      
      case 'BADGE_UPDATE':
        this.onBadgeUpdate(data.count);
        break;
      
      case 'PONG':
        break;
      
      default:
    }
  }

  onNewNotification(notification) {
    
    if (typeof updateBadgeCount === 'function') {
      this.fetchAndUpdateBadge();
    }
    
    const isNotificationPage = window.location.pathname.includes('/notification/notification.html');
    if (!isNotificationPage && typeof showInfo === 'function') {
      showInfo(notification.title || 'Nova notificação recebida!');
    }
    
    window.dispatchEvent(new CustomEvent('newNotification', { detail: notification }));
  }

  onNotificationDeleted(notificationId) {
    
    if (typeof updateBadgeCount === 'function') {
      this.fetchAndUpdateBadge();
    }
    
    window.dispatchEvent(new CustomEvent('notificationDeleted', { detail: { notificationId } }));
  }

  onBadgeUpdate(count) {
    if (typeof updateBadgeCount === 'function') {
      updateBadgeCount(count);
    }
  }

  async fetchAndUpdateBadge() {
    const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;
    const token = localStorage.getItem('token');
    
    if (!token || !BASE_URL) return;
    
    try {
      const tokenWithoutBearer = token.replace('Bearer ', '');
      const payload = JSON.parse(atob(tokenWithoutBearer.split('.')[1]));
      const userId = payload.userId;
      
      if (!userId) return;
      
      const response = await fetch(`${BASE_URL}/v1/notification/user/${userId}`, {
        method: 'GET',
        headers: { 'Authorization': token }
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      const count = (data.notifications || []).length;
      
      if (typeof updateBadgeCount === 'function') {
        updateBadgeCount(count);
      }
    } catch (error) {
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  scheduleReconnect(userId, token) {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      setTimeout(() => {
        
        if (!userId || !token) {
          const storedToken = localStorage.getItem('token');
          if (storedToken) {
            try {
              const tokenWithoutBearer = storedToken.replace('Bearer ', '');
              const payload = JSON.parse(atob(tokenWithoutBearer.split('.')[1]));
              userId = payload.userId;
              token = storedToken;
            } catch (error) {
              return;
            }
          }
        }
        
        this.connect(userId, token);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
    }
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Desconexão intencional');
      this.ws = null;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

let notificationWS = null;

function initializeNotificationWebSocket() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return;
  }
  
  try {
    const tokenWithoutBearer = token.replace('Bearer ', '');
    const payload = JSON.parse(atob(tokenWithoutBearer.split('.')[1]));
    const userId = payload.userId;
    
    if (!userId) {
      return;
    }
    
    notificationWS = new NotificationWebSocket();
    notificationWS.connect(userId, token);
    
    window.addEventListener('beforeunload', () => {
      if (notificationWS) {
        notificationWS.disconnect();
      }
    });
    
  } catch (error) {
  }
}

window.notificationWS = notificationWS;
window.initializeNotificationWebSocket = initializeNotificationWebSocket;
