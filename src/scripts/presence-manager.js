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
  }

  // Conecta ao WebSocket de presença global
  connect(userId, token) {
    if (!token) {
      console.error('Token é necessário para conectar ao sistema de presença');
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
      
      // Re-inscreve usuários se reconectou
      if (this.subscribedUsers.size > 0) {
        console.log(`🔄 Re-inscrevendo ${this.subscribedUsers.size} usuários após reconexão`);
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
      
      // Limpa todos os timeouts pendentes de offline
      this.clearAllOfflineTimeouts();
      
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
          console.log('⚠️ USER_STATUS sem campo isOnline:', data);
        }
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
    
    // Cancela timeout de offline pendente (se houver)
    if (this.offlineTimeouts.has(userId)) {
      console.log(`⏸️ Cancelando timeout de offline para ${userId} (reconectou)`);
      clearTimeout(this.offlineTimeouts.get(userId));
      this.offlineTimeouts.delete(userId);
    }
    
    // Se já não estava online, adiciona e dispara evento
    const wasOffline = !this.onlineUsers.has(userId);
    this.onlineUsers.add(userId);
    
    if (wasOffline) {
      console.log(`🟢 Usuário ${userId} está ONLINE`);
      
      window.dispatchEvent(new CustomEvent('userOnline', { 
        detail: { userId } 
      }));
    } else {
      console.log(`✅ Usuário ${userId} reconectou (permanece ONLINE)`);
    }
  }

  // Callback quando usuário fica offline
  onUserOffline(userId) {
    if (userId == this.userId) return; // Ignora próprio usuário
    
    // Verifica se já existe um timeout pendente
    if (this.offlineTimeouts.has(userId)) {
      console.log(`⏱️ Timeout de offline já existe para ${userId}, ignorando...`);
      return;
    }
    
    console.log(`⏳ Usuário ${userId} desconectou - aguardando ${this.OFFLINE_DELAY/1000}s antes de marcar como OFFLINE`);
    
    // Cria timeout de 5 segundos
    const timeoutId = setTimeout(() => {
      // Após 5 segundos sem receber USER_ONLINE, marca como offline
      if (this.onlineUsers.has(userId)) {
        this.onlineUsers.delete(userId);
        console.log(`⚪ Usuário ${userId} está OFFLINE (confirmado após ${this.OFFLINE_DELAY/1000}s)`);
        
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

  // ========================================
  // SISTEMA DE SUBSCRIÇÕES
  // ========================================
  
  // Inscreve para monitorar usuários específicos
  subscribe(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      console.warn('⚠️ subscribe() requer array não-vazio de userIds');
      return;
    }

    // Adiciona à lista de inscritos primeiro (para re-inscrever quando conectar)
    userIds.forEach(id => this.subscribedUsers.add(id));

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket não está conectado, subscrição será feita ao conectar');
      console.log(`📋 ${userIds.length} usuários agendados para subscrição:`, userIds);
      return;
    }

    // Filtra usuários que ainda não foram enviados ao backend
    const newUsers = userIds;
    
    if (newUsers.length === 0) {
      console.log('ℹ️ Todos os usuários já foram enviados');
      return;
    }

    // Aplica limite de subscrições
    const availableSlots = this.MAX_SUBSCRIPTIONS - this.subscribedUsers.size;
    const toSubscribe = newUsers.slice(0, availableSlots);
    
    if (toSubscribe.length < newUsers.length) {
      console.warn(`⚠️ Limite de ${this.MAX_SUBSCRIPTIONS} subscrições atingido. Inscrevendo apenas ${toSubscribe.length} de ${newUsers.length}`);
    }

    console.log(`📡 Enviando SUBSCRIBE_PRESENCE para ${toSubscribe.length} usuários:`, toSubscribe);

    // Envia mensagem de subscrição
    const message = {
      type: 'SUBSCRIBE_PRESENCE',
      data: {
        userIds: toSubscribe
      }
    };
    
    console.log('📤 Mensagem WebSocket:', JSON.stringify(message));
    this.ws.send(JSON.stringify(message));
  }

  // Cancela inscrição de usuários específicos
  unsubscribe(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      console.warn('⚠️ unsubscribe() requer array não-vazio de userIds');
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket não está conectado');
      return;
    }

    // Filtra apenas usuários que estão inscritos
    const toUnsubscribe = userIds.filter(id => this.subscribedUsers.has(id));

    if (toUnsubscribe.length === 0) {
      console.log('ℹ️ Nenhum usuário para desinscrever');
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

    console.log(`📡 Desinscrevendo ${toUnsubscribe.length} usuários:`, toUnsubscribe);

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
    this.clearAllOfflineTimeouts();
    
    if (this.ws) {
      this.ws.close(1000, 'Desconexão intencional');
      this.ws = null;
    }
    
    this.onlineUsers.clear();
  }

  // Limpa todos os timeouts pendentes de offline
  clearAllOfflineTimeouts() {
    if (this.offlineTimeouts.size > 0) {
      console.log(`🧹 Limpando ${this.offlineTimeouts.size} timeouts de offline pendentes`);
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
