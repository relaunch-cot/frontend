// Gerenciador de WebSocket para notificações em tempo real
class NotificationWebSocket {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000; // 3 segundos
    this.heartbeatInterval = null;
    this.isIntentionallyClosed = false;
  }

  // Conecta ao WebSocket do backend
  connect(userId, token) {
    if (!userId || !token) {
      console.error('UserId e token são necessários para conectar ao WebSocket');
      return;
    }

    // URL do WebSocket (ajuste conforme seu backend)
    const WS_BASE_URL = window.ENV_CONFIG?.WS_BACKEND || 'ws://localhost:8080';
    const wsUrl = `${WS_BASE_URL}/ws/notifications?userId=${userId}&token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Erro ao criar conexão WebSocket:', error);
      this.scheduleReconnect(userId, token);
    }
  }

  // Configura os event handlers do WebSocket
  setupEventHandlers() {
    this.ws.onopen = () => {
      console.log('✅ WebSocket conectado - Notificações em tempo real ativadas');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('Erro no WebSocket:', error);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket desconectado:', event.code, event.reason);
      this.stopHeartbeat();
      
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`Tentando reconectar... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.scheduleReconnect();
      }
    };
  }

  // Processa mensagens recebidas do WebSocket
  handleMessage(data) {
    switch (data.type) {
      case 'NEW_NOTIFICATION':
        // Nova notificação recebida
        this.onNewNotification(data.notification);
        break;
      
      case 'NOTIFICATION_DELETED':
        // Notificação foi deletada
        this.onNotificationDeleted(data.notificationId);
        break;
      
      case 'BADGE_UPDATE':
        // Atualização do contador de notificações
        this.onBadgeUpdate(data.count);
        break;
      
      case 'PONG':
        // Resposta ao heartbeat
        break;
      
      default:
        console.log('Mensagem WebSocket não tratada:', data);
    }
  }

  // Callback quando nova notificação é recebida
  onNewNotification(notification) {
    console.log('📬 Nova notificação recebida:', notification);
    
    // Atualiza o badge
    if (typeof updateBadgeCount === 'function') {
      // Busca contagem atual e incrementa
      this.fetchAndUpdateBadge();
    }
    
    // Mostra notificação visual se não estiver na página de notificações
    const isNotificationPage = window.location.pathname.includes('/notification/notification.html');
    if (!isNotificationPage && typeof showInfo === 'function') {
      showInfo(notification.title || 'Nova notificação recebida!');
    }
    
    // Dispara evento customizado para outras partes da aplicação
    window.dispatchEvent(new CustomEvent('newNotification', { detail: notification }));
  }

  // Callback quando notificação é deletada
  onNotificationDeleted(notificationId) {
    console.log('🗑️ Notificação deletada:', notificationId);
    
    // Atualiza o badge
    if (typeof updateBadgeCount === 'function') {
      this.fetchAndUpdateBadge();
    }
    
    // Dispara evento customizado
    window.dispatchEvent(new CustomEvent('notificationDeleted', { detail: { notificationId } }));
  }

  // Callback para atualização do badge
  onBadgeUpdate(count) {
    if (typeof updateBadgeCount === 'function') {
      updateBadgeCount(count);
    }
  }

  // Busca contagem atual de notificações
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
      console.error('Erro ao buscar contagem de notificações:', error);
    }
  }

  // Heartbeat para manter conexão ativa
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000); // A cada 30 segundos
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Agenda reconexão
  scheduleReconnect(userId, token) {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      setTimeout(() => {
        console.log('🔄 Reconectando WebSocket...');
        
        // Se userId e token não foram passados, tenta extrair do localStorage
        if (!userId || !token) {
          const storedToken = localStorage.getItem('token');
          if (storedToken) {
            try {
              const tokenWithoutBearer = storedToken.replace('Bearer ', '');
              const payload = JSON.parse(atob(tokenWithoutBearer.split('.')[1]));
              userId = payload.userId;
              token = storedToken;
            } catch (error) {
              console.error('Erro ao extrair userId do token:', error);
              return;
            }
          }
        }
        
        this.connect(userId, token);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Número máximo de tentativas de reconexão atingido');
    }
  }

  // Desconecta WebSocket
  disconnect() {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Desconexão intencional');
      this.ws = null;
    }
  }

  // Verifica se está conectado
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Instância global do WebSocket
let notificationWS = null;

// Inicializa WebSocket automaticamente quando usuário está autenticado
function initializeNotificationWebSocket() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.log('Usuário não autenticado - WebSocket não será inicializado');
    return;
  }
  
  try {
    const tokenWithoutBearer = token.replace('Bearer ', '');
    const payload = JSON.parse(atob(tokenWithoutBearer.split('.')[1]));
    const userId = payload.userId;
    
    if (!userId) {
      console.error('UserId não encontrado no token');
      return;
    }
    
    // Cria e conecta o WebSocket
    notificationWS = new NotificationWebSocket();
    notificationWS.connect(userId, token);
    
    // Desconecta quando usuário sair ou fechar a página
    window.addEventListener('beforeunload', () => {
      if (notificationWS) {
        notificationWS.disconnect();
      }
    });
    
  } catch (error) {
    console.error('Erro ao inicializar WebSocket de notificações:', error);
  }
}

// Exporta para uso global
window.notificationWS = notificationWS;
window.initializeNotificationWebSocket = initializeNotificationWebSocket;
