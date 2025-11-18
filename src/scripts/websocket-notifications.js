class NotificationWebSocket {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000; 
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
      console.error('WebSocket Notifications error:', error);
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      
      const reason = event.reason?.toLowerCase() || '';
      const hasTokenError = 
        reason.includes('token') ||
        reason.includes('expired') ||
        reason.includes('invalid') ||
        reason.includes('unauthorized');
      
      if (
        event.code === 1008 ||
        event.code === 4001 ||
        (event.code === 1006 && hasTokenError)
      ) {
        localStorage.clear();
        window.location.href = '/login';
        return;
      }
      
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };
  }

  handleMessage(data) {
    if (window.__redirectingToLogin) {
      return;
    }
    
    if (data.message || data.error) {
      const messageText = (data.message || '').toLowerCase();
      const detailsText = (data.details || '').toLowerCase();
      const errorText = (data.error || '').toLowerCase();
      
      const hasInvalidToken = 
        messageText.includes('invalid token') ||
        messageText.includes('token') ||
        detailsText.includes('expired') ||
        detailsText.includes('invalid') ||
        errorText.includes('token');
      
      if (hasInvalidToken && !window.__redirectingToLogin) {
        window.__redirectingToLogin = true;
        
        if (typeof showError === 'function') {
          showError('Sua sessão expirou. Redirecionando para o login...');
        }
        
        this.isIntentionallyClosed = true;
        if (this.ws) {
          try {
            this.ws.close();
          } catch (e) {}
        }
        
        localStorage.clear();
        
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        return;
      }
    }
    
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
    const isChatPage = window.location.pathname.includes('/project-chat/project-chat.html');
    
    // Não mostrar notificação se estiver na página de notificações OU na página de chat
    if (!isNotificationPage && !isChatPage) {
      // Se for mensagem de chat, usa o card especial
      if (notification.type === 'CHAT_MESSAGE') {
        this.mostrarCardNovaMensagem(notification.title, notification.content);
      } else {
        // Para outras notificações, usa card genérico
        this.mostrarCardNotificacao(notification.title, notification.content);
      }
    }
    
    window.dispatchEvent(new CustomEvent('newNotification', { detail: notification }));
  }

  mostrarCardNovaMensagem(title, content) {
    const iconAnterior = document.getElementById('new-message-icon');
    if (iconAnterior) {
      iconAnterior.remove();
    }
    
    const iconContainer = document.createElement('div');
    iconContainer.id = 'new-message-icon';
    iconContainer.className = 'new-message-notification';
    iconContainer.title = title;
    
    iconContainer.innerHTML = `
      <div class="notification-content">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
          <path d="M256 448c141.4 0 256-93.1 256-208S397.4 32 256 32S0 125.1 0 240c0 45.1 17.7 86.8 47.7 120.9c-1.9 24.5-11.4 46.3-21.4 62.9c-5.5 9.2-11.1 16.6-15.2 21.6c-2.1 2.5-3.7 4.4-4.9 5.7c-.6 .6-1 1.1-1.3 1.4l-.3 .3c0 0 0 0 0 0c0 0 0 0 0 0s0 0 0 0s0 0 0 0c-4.6 4.6-5.9 11.4-3.4 17.4c2.5 6 8.3 9.9 14.8 9.9c28.7 0 57.6-8.9 81.6-19.3c22.9-10 42.4-21.9 54.3-30.6c31.8 11.5 67 17.9 104.1 17.9z"/>
        </svg>
        <div class="notification-text-content">
          <strong>${title}</strong>
          <span>${content}</span>
        </div>
      </div>
      <div class="pulse-ring"></div>
    `;
    
    document.body.appendChild(iconContainer);
    
    setTimeout(() => {
      iconContainer.classList.add('fade-out');
      setTimeout(() => iconContainer.remove(), 300);
    }, 5000);
  }

  mostrarCardNotificacao(title, content) {
    const cardAnterior = document.getElementById('generic-notification-card');
    if (cardAnterior) {
      cardAnterior.remove();
    }
    
    const cardContainer = document.createElement('div');
    cardContainer.id = 'generic-notification-card';
    cardContainer.className = 'generic-notification-card';
    cardContainer.title = title;
    
    cardContainer.innerHTML = `
      <div class="notification-content">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
          <path d="M224 0c-17.7 0-32 14.3-32 32V51.2C119 66 64 130.6 64 208v18.8c0 47-17.3 92.4-48.5 127.6l-7.4 8.3c-8.4 9.4-10.4 22.9-5.3 34.4S19.4 416 32 416H416c12.6 0 24-7.4 29.2-18.9s3.1-25-5.3-34.4l-7.4-8.3C401.3 319.2 384 273.9 384 226.8V208c0-77.4-55-142-128-156.8V32c0-17.7-14.3-32-32-32zm45.3 493.3c12-12 18.7-28.3 18.7-45.3H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7z"/>
        </svg>
        <div class="notification-text-content">
          <strong>${title}</strong>
          <span>${content}</span>
        </div>
      </div>
      <div class="pulse-ring"></div>
    `;
    
    document.body.appendChild(cardContainer);
    
    setTimeout(() => {
      cardContainer.classList.add('fade-out');
      setTimeout(() => cardContainer.remove(), 300);
    }, 5000);
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
