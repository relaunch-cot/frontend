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
      console.error('WebSocket Notifications error:', error);
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      
      console.log('WebSocket Notifications fechado. Code:', event.code, 'Reason:', event.reason);
      
      // Verifica se é erro de token inválido/expirado
      const reason = event.reason?.toLowerCase() || '';
      const hasTokenError = 
        reason.includes('token') ||
        reason.includes('expired') ||
        reason.includes('invalid') ||
        reason.includes('unauthorized');
      
      // Códigos 1008 e 4001 são erros de autenticação
      // 1006 só se tiver mensagem de erro relacionada a token
      if (
        event.code === 1008 ||
        event.code === 4001 ||
        (event.code === 1006 && hasTokenError)
      ) {
        console.log('Token inválido ou expirado detectado no WebSocket de Notificações');
        console.log('Limpando localStorage e redirecionando para login...');
        
        // Limpa o localStorage
        localStorage.clear();
        
        // Redireciona para login
        window.location.href = '/login';
        return;
      }
      
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };
  }

  handleMessage(data) {
    console.log('=== WebSocket Notifications - handleMessage ===');
    console.log('Dados recebidos:', JSON.stringify(data, null, 2));
    
    // Verifica se é uma mensagem de erro do backend
    if (data.message || data.error) {
      console.log('🔍 Notificações - Mensagem ou erro detectado:', data.message || data.error);
      
      const messageText = (data.message || '').toLowerCase();
      const detailsText = (data.details || '').toLowerCase();
      const errorText = (data.error || '').toLowerCase();
      
      const hasInvalidToken = 
        messageText.includes('invalid token') ||
        messageText.includes('token') ||
        detailsText.includes('expired') ||
        detailsText.includes('invalid') ||
        errorText.includes('token');
      
      if (hasInvalidToken) {
        console.error('❌ Notificações - Token inválido ou expirado!');
        console.error('Dados completos:', data);
        
        alert('Sua sessão expirou. Você será redirecionado para o login.');
        
        this.isIntentionallyClosed = true;
        if (this.ws) {
          try {
            this.ws.close();
          } catch (e) {
            console.error('Erro ao fechar WebSocket:', e);
          }
        }
        
        console.log('🧹 Limpando localStorage...');
        localStorage.clear();
        console.log('✅ localStorage limpo');
        
        console.log('🚪 Redirecionando para /login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
        return;
      }
    }
    
    console.log('📨 Notificações - Processando tipo:', data.type);
    
    switch (data.type) {
      case 'CONNECTED':
        console.log('✅ WebSocket Notifications conectado');
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
