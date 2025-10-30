// Gerenciador de Presença Global de Usuários
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
  }

  // Conecta ao WebSocket de presença global
  connect(userId, token) {
    if (!userId || !token) {
      console.error('UserId e token são necessários para conectar ao sistema de presença');
      return;
    }

    this.userId = userId;
    this.token = token;

    // URL do WebSocket para presença global
    const WS_BASE_URL = window.ENV_CONFIG?.WS_BACKEND || 'ws://localhost:8080';
    const wsUrl = `${WS_BASE_URL}/v1/ws/presence?userId=${userId}&token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Erro ao criar conexão WebSocket de presença:', error);
      this.scheduleReconnect();
    }
  }

  // Configura os event handlers
  setupEventHandlers() {
    this.ws.onopen = () => {
      console.log('🟢 Sistema de presença conectado');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      
      // Dispara evento de conexão
      window.dispatchEvent(new CustomEvent('presenceConnected', { 
        detail: { userId: this.userId } 
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        // Log da mensagem bruta para debug
        console.log('📨 Presença (raw):', event.data);
        
        // Verifica se é string vazia ou inválida
        if (!event.data || event.data.trim() === '') {
          console.warn('⚠️ Mensagem vazia recebida');
          return;
        }
        
        // Se tiver múltiplas mensagens JSON concatenadas, processa cada uma
        const messages = event.data.trim().split('\n').filter(line => line.trim());
        
        if (messages.length > 1) {
          console.warn('⚠️ Múltiplas mensagens concatenadas detectadas! Processando separadamente...');
        }
        
        // Processa cada mensagem
        messages.forEach((msg, index) => {
          try {
            const data = JSON.parse(msg);
            console.log(`📨 Presença [${index + 1}/${messages.length}]:`, data);
            this.handleMessage(data);
          } catch (err) {
            console.error(`❌ Erro ao processar mensagem ${index + 1}:`, err);
            console.error('📄 Conteúdo:', msg);
          }
        });
        
      } catch (error) {
        console.error('❌ Erro ao processar mensagem de presença:', error);
        console.error('📄 Conteúdo recebido:', event.data);
        console.error('📄 Tipo:', typeof event.data);
        console.error('📄 Comprimento:', event.data?.length);
        
        // Tenta identificar o problema
        if (event.data && typeof event.data === 'string') {
          // Verifica se há múltiplas mensagens JSON concatenadas
          if (event.data.includes('}{')) {
            console.error('⚠️ Múltiplas mensagens JSON concatenadas (sem quebra de linha)!');
            console.error('💡 Backend deve enviar uma mensagem por vez OU separar com \\n');
          }
          
          // Mostra primeiros caracteres para debug
          console.error('🔍 Primeiros 200 chars:', event.data.substring(0, 200));
        }
      }
    };

    this.ws.onerror = (error) => {
      console.error('Erro no WebSocket de presença:', error);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket de presença desconectado:', event.code);
      this.stopHeartbeat();
      
      // Dispara evento de desconexão
      window.dispatchEvent(new CustomEvent('presenceDisconnected'));
      
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`Reconectando presença... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.scheduleReconnect();
      }
    };
  }

  // Processa mensagens recebidas
  handleMessage(data) {
    console.log('📨 Presença:', data);
    
    switch (data.type) {
      case 'CONNECTED':
        // Mensagem de confirmação de conexão
        console.log('✅ Conectado ao serviço de presença:', data.message);
        break;
      
      case 'USER_ONLINE':
        // Usuário ficou online
        this.onUserOnline(data.userId);
        break;
      
      case 'USER_OFFLINE':
        // Usuário ficou offline
        this.onUserOffline(data.userId);
        break;
      
      case 'ONLINE_USERS':
        // Lista inicial de usuários online
        this.onOnlineUsersList(data.onlineUsers || data.userIds || []);
        break;
      
      case 'PONG':
        // Resposta ao heartbeat
        break;
      
      default:
        console.log('⚠️ Mensagem de presença não tratada:', data);
    }
  }

  // Callback quando usuário fica online
  onUserOnline(userId) {
    if (userId == this.userId) return; // Ignora próprio usuário
    
    this.onlineUsers.add(userId);
    console.log(`🟢 Usuário ${userId} está ONLINE`);
    
    window.dispatchEvent(new CustomEvent('userOnline', { 
      detail: { userId } 
    }));
  }

  // Callback quando usuário fica offline
  onUserOffline(userId) {
    if (userId == this.userId) return; // Ignora próprio usuário
    
    this.onlineUsers.delete(userId);
    console.log(`⚪ Usuário ${userId} está OFFLINE`);
    
    window.dispatchEvent(new CustomEvent('userOffline', { 
      detail: { userId } 
    }));
  }

  // Callback quando recebe lista de usuários online
  onOnlineUsersList(userIds) {
    this.onlineUsers.clear();
    userIds.forEach(id => {
      if (id != this.userId) {
        this.onlineUsers.add(id);
      }
    });
    
    console.log(`📋 Usuários online:`, Array.from(this.onlineUsers));
    
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
        console.log('🔄 Reconectando sistema de presença...');
        this.connect(this.userId, this.token);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Número máximo de tentativas de reconexão de presença atingido');
    }
  }

  // Desconecta
  disconnect() {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Desconexão intencional');
      this.ws = null;
    }
    
    this.onlineUsers.clear();
  }

  // Verifica se está conectado
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Instância global do gerenciador de presença
window.presenceManager = new PresenceManager();
