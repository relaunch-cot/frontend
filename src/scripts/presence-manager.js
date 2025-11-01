// Gerenciador de Presença Global de Usuários com Sistema de Subscrições
class PresenceManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.heartbeatInterval = null;
    this.isIntentionallyClosed = false;
    this.userId = null;
    this.token = null;
    this.onlineUsers = new Set(); // IDs dos usuários online
    this.offlineTimeouts = new Map(); // Timeouts pendentes para marcar como offline
    this.OFFLINE_DELAY = 5000; // 5 segundos de delay antes de marcar offline
    this.subscribedUsers = new Set(); // IDs dos usuários que estamos monitorando
    this.MAX_SUBSCRIPTIONS = 50; // Limite de subscrições simultâneas
    this.CACHE_KEY = 'presence_online_users'; // Chave para cache no localStorage
    
    // Carrega estado do cache ao inicializar
    this.loadFromCache();
  }

  // Carrega estado de presença do localStorage
  loadFromCache() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        
        // Cache válido por 10 segundos
        if (data.timestamp && (now - data.timestamp) < 10000) {
          data.onlineUsers.forEach(userId => this.onlineUsers.add(userId));
        } else {
          localStorage.removeItem(this.CACHE_KEY);
        }
      }
    } catch (error) {
    }
  }

  // Salva estado de presença no localStorage
  saveToCache() {
    try {
      const data = {
        onlineUsers: Array.from(this.onlineUsers),
        timestamp: Date.now()
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
    }
  }

  // Conecta ao WebSocket de presença global
  connect(userId, token) {
    if (!token) {
      return;
    }

    this.userId = userId;
    this.token = token;

    // Remove "Bearer " se presente
    const cleanToken = token.replace('Bearer ', '');

    // URL do WebSocket para presença global (novo formato: só token)
    const WS_BASE_URL = window.ENV_CONFIG?.WS_BACKEND || 'ws://localhost:8080';
    const wsUrl = `${WS_BASE_URL}/v1/ws/presence?token=${encodeURIComponent(cleanToken)}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      this.scheduleReconnect();
    }
  }

  // Configura os event handlers
  setupEventHandlers() {
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      
      // Re-inscreve usuários se reconectou
      if (this.subscribedUsers.size > 0) {
        this.subscribe([...this.subscribedUsers]);
      }
      
      // Dispara evento de conexão
      window.dispatchEvent(new CustomEvent('presenceConnected', { 
        detail: { userId: this.userId } 
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        // Log da mensagem bruta para debug
        
        // Verifica se é string vazia ou inválida
        if (!event.data || event.data.trim() === '') {
          return;
        }
        
        // Se tiver múltiplas mensagens JSON concatenadas, processa cada uma
        const messages = event.data.trim().split('\n').filter(line => line.trim());
        
        if (messages.length > 1) {
        }
        
        // Processa cada mensagem
        messages.forEach((msg, index) => {
          try {
            const data = JSON.parse(msg);
            this.handleMessage(data);
          } catch (err) {
          }
        });
        
      } catch (error) {
        
        // Tenta identificar o problema
        if (event.data && typeof event.data === 'string') {
          // Verifica se há múltiplas mensagens JSON concatenadas
          if (event.data.includes('}{')) {
          }
          
          // Mostra primeiros caracteres para debug
        }
      }
    };

    this.ws.onerror = (error) => {
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      
      // Limpa todos os timeouts pendentes de offline
      this.clearAllOfflineTimeouts();
      
      // Dispara evento de desconexão
      window.dispatchEvent(new CustomEvent('presenceDisconnected'));
      
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };
  }

  // Processa mensagens recebidas
  handleMessage(data) {
    
    switch (data.type) {
      case 'CONNECTED':
        // Mensagem de confirmação de conexão
        break;
      
      case 'USER_ONLINE':
        // Novo formato: status individual com campo isOnline
        // Backend envia: { type: "USER_ONLINE", userId: "...", isOnline: true/false }
        if (data.isOnline !== undefined) {
          if (data.isOnline) {
            this.onUserOnline(data.userId);
          } else {
            this.onUserOffline(data.userId);
          }
        } else {
          // Formato antigo: apenas USER_ONLINE (sempre online)
          this.onUserOnline(data.userId);
        }
        break;
      
      case 'USER_OFFLINE':
        // Formato antigo: evento separado para offline
        this.onUserOffline(data.userId);
        break;
      
      case 'ONLINE_USERS':
        // Lista inicial de usuários online (formato antigo)
        this.onOnlineUsersList(data.onlineUsers || data.userIds || []);
        break;
      
      case 'USER_STATUS':
        // Compatibilidade com formato de chat (isOnline)
        if (data.isOnline !== undefined) {
          if (data.isOnline) {
            this.onUserOnline(data.userId);
          } else {
            this.onUserOffline(data.userId);
          }
        } else {
        }
        break;
      
      case 'PONG':
        // Resposta ao heartbeat
        break;
      
      default:
    }
  }

  // Callback quando usuário fica online
  onUserOnline(userId) {
    if (userId == this.userId) return; // Ignora próprio usuário
    
    // Cancela timeout de offline pendente (se houver)
    if (this.offlineTimeouts.has(userId)) {
      clearTimeout(this.offlineTimeouts.get(userId));
      this.offlineTimeouts.delete(userId);
    }
    
    // Se já não estava online, adiciona e dispara evento
    const wasOffline = !this.onlineUsers.has(userId);
    this.onlineUsers.add(userId);
    
    // Salva no cache
    this.saveToCache();
    
    if (wasOffline) {
      
      window.dispatchEvent(new CustomEvent('userOnline', { 
        detail: { userId } 
      }));
    } else {
    }
  }

  // Callback quando usuário fica offline
  onUserOffline(userId) {
    if (userId == this.userId) return; // Ignora próprio usuário
    
    // Verifica se já existe um timeout pendente
    if (this.offlineTimeouts.has(userId)) {
      return;
    }
    
    
    // Cria timeout de 5 segundos
    const timeoutId = setTimeout(() => {
      // Após 5 segundos sem receber USER_ONLINE, marca como offline
      if (this.onlineUsers.has(userId)) {
        this.onlineUsers.delete(userId);
        
        // Salva no cache
        this.saveToCache();
        
        window.dispatchEvent(new CustomEvent('userOffline', { 
          detail: { userId } 
        }));
      }
      
      // Remove timeout da lista
      this.offlineTimeouts.delete(userId);
    }, this.OFFLINE_DELAY);
    
    // Armazena o timeout
    this.offlineTimeouts.set(userId, timeoutId);
  }

  // Callback quando recebe lista de usuários online
  onOnlineUsersList(userIds) {
    this.onlineUsers.clear();
    userIds.forEach(id => {
      if (id != this.userId) {
        this.onlineUsers.add(id);
      }
    });
    
    
    // Salva no cache
    this.saveToCache();
    
    window.dispatchEvent(new CustomEvent('onlineUsersListUpdated', { 
      detail: { userIds: Array.from(this.onlineUsers) } 
    }));
  }

  // Verifica se um usuário está online
  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  // Retorna lista de usuários online
  getOnlineUsers() {
    return Array.from(this.onlineUsers);
  }

  // ========================================
  // SISTEMA DE SUBSCRIÇÕES
  // ========================================
  
  // Inscreve para monitorar usuários específicos
  subscribe(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return;
    }

    // Adiciona à lista de inscritos primeiro (para re-inscrever quando conectar)
    userIds.forEach(id => this.subscribedUsers.add(id));

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Filtra usuários que ainda não foram enviados ao backend
    const newUsers = userIds;
    
    if (newUsers.length === 0) {
      return;
    }

    // Aplica limite de subscrições
    const availableSlots = this.MAX_SUBSCRIPTIONS - this.subscribedUsers.size;
    const toSubscribe = newUsers.slice(0, availableSlots);
    
    if (toSubscribe.length < newUsers.length) {
    }


    // Envia mensagem de subscrição
    const message = {
      type: 'SUBSCRIBE_PRESENCE',
      data: {
        userIds: toSubscribe
      }
    };
    
    this.ws.send(JSON.stringify(message));
  }

  // Cancela inscrição de usuários específicos
  unsubscribe(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Filtra apenas usuários que estão inscritos
    const toUnsubscribe = userIds.filter(id => this.subscribedUsers.has(id));

    if (toUnsubscribe.length === 0) {
      return;
    }

    // Remove do Set de inscritos
    toUnsubscribe.forEach(id => {
      this.subscribedUsers.delete(id);
      // Também limpa timeout de offline se houver
      if (this.offlineTimeouts.has(id)) {
        clearTimeout(this.offlineTimeouts.get(id));
        this.offlineTimeouts.delete(id);
      }
    });


    // Envia mensagem de desinscrição
    this.ws.send(JSON.stringify({
      type: 'UNSUBSCRIBE_PRESENCE',
      data: {
        userIds: toUnsubscribe
      }
    }));
  }

  // Retorna lista de usuários inscritos
  getSubscribedUsers() {
    return Array.from(this.subscribedUsers);
  }

  // ========================================
  // MÉTODOS AUXILIARES
  // ========================================

  // Heartbeat
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

  // Reconexão
  scheduleReconnect() {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      setTimeout(() => {
        this.connect(this.userId, this.token);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
    }
  }

  // Desconecta
  disconnect() {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    this.clearAllOfflineTimeouts();
    
    if (this.ws) {
      this.ws.close(1000, 'Desconexão intencional');
      this.ws = null;
    }
    
    this.onlineUsers.clear();
    
    // Limpa o cache ao desconectar
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
    }
  }

  // Limpa todos os timeouts pendentes de offline
  clearAllOfflineTimeouts() {
    if (this.offlineTimeouts.size > 0) {
      this.offlineTimeouts.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      this.offlineTimeouts.clear();
    }
  }

  // Verifica se está conectado
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Instância global do gerenciador de presença
window.presenceManager = new PresenceManager();
