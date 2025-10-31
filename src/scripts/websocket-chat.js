// Gerenciador de WebSocket para Chat em tempo real
class ChatWebSocket {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.heartbeatInterval = null;
    this.isIntentionallyClosed = false;
    this.chatId = null;
    this.userId = null;
  }

  // Conecta ao WebSocket do chat
  connect(chatId, userId, token) {
    if (!chatId || !userId || !token) {
      console.error('ChatId, userId e token são necessários para conectar ao WebSocket do chat');
      return;
    }

    this.chatId = chatId;
    this.userId = userId;

    // URL do WebSocket para chat
    const WS_BASE_URL = window.ENV_CONFIG?.WS_BACKEND || 'ws://localhost:8080';
    const wsUrl = `${WS_BASE_URL}/v1/ws/chat?chatId=${chatId}&userId=${userId}&token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Erro ao criar conexão WebSocket do chat:', error);
      this.scheduleReconnect(chatId, userId, token);
    }
  }

  // Configura os event handlers
  setupEventHandlers() {
    this.ws.onopen = () => {
      console.log(`✅ WebSocket do Chat ${this.chatId} conectado`);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      
      // Dispara evento de conexão
      window.dispatchEvent(new CustomEvent('chatConnected', { 
        detail: { chatId: this.chatId } 
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        // Verifica se é string vazia
        if (!event.data || event.data.trim() === '') {
          console.warn('⚠️ Mensagem vazia recebida no chat');
          return;
        }
        
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('❌ Erro ao processar mensagem WebSocket do chat:', error);
        console.error('📄 Conteúdo recebido:', event.data);
        
        if (event.data && typeof event.data === 'string' && event.data.includes('}{')) {
          console.error('⚠️ Múltiplas mensagens JSON concatenadas no chat!');
        }
      }
    };

    this.ws.onerror = (error) => {
      console.error('Erro no WebSocket do chat:', error);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket do chat desconectado:', event.code, event.reason);
      this.stopHeartbeat();
      
      // Dispara evento de desconexão
      window.dispatchEvent(new CustomEvent('chatDisconnected', { 
        detail: { chatId: this.chatId } 
      }));
      
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`Tentando reconectar chat... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.scheduleReconnect();
      }
    };
  }

  // Processa mensagens recebidas
  handleMessage(data) {
    console.log('📨 Mensagem WebSocket recebida:', data);
    
    switch (data.type) {
      case 'NEW_MESSAGE':
        // Nova mensagem recebida no chat
        this.onNewMessage(data.message);
        break;
      
      case 'USER_TYPING':
        // Usuário está digitando
        // Backend envia: { type: "USER_TYPING", userId, isTyping, chatId }
        this.onUserTyping(data.userId, data.isTyping, data.chatId);
        break;
      
      case 'USER_STATUS':
        // Status do usuário (in chat / not in chat)
        // Backend envia: { type: "USER_STATUS", userId, isInChat, chatId }
        this.onUserStatus(data.userId, data.isInChat, data.chatId);
        break;
      
      case 'MESSAGE_READ':
        // Mensagem foi lida
        this.onMessageRead(data.messageId);
        break;
      
      case 'PONG':
        // Resposta ao heartbeat
        break;
      
      default:
        console.log('⚠️ Mensagem WebSocket do chat não tratada:', data);
    }
  }

  // Callback quando nova mensagem é recebida
  onNewMessage(message) {
    console.log('💬 Nova mensagem recebida no chat:', message);
    
    // Dispara evento customizado para a página processar
    window.dispatchEvent(new CustomEvent('chatNewMessage', { 
      detail: { message, chatId: this.chatId } 
    }));
  }

  // Callback quando usuário está digitando
  onUserTyping(userId, isTyping, chatId) {
    // Backend já não envia para o próprio usuário, mas vamos filtrar por segurança
    if (userId == this.userId) return;
    
    console.log(`💬 ${userId} está ${isTyping ? 'digitando' : 'parou de digitar'}`);
    
    window.dispatchEvent(new CustomEvent('chatUserTyping', { 
      detail: { userId, isTyping, chatId: chatId || this.chatId } 
    }));
  }

  // Callback quando status do usuário muda (in chat / not in chat)
  onUserStatus(userId, isInChat, chatId) {
    // Backend já não envia para o próprio usuário, mas vamos filtrar por segurança
    if (userId == this.userId) return;
    
    console.log(`${isInChat ? '�' : '👁️'} Usuário ${userId} está ${isInChat ? 'NO CHAT' : 'FORA DO CHAT'}`);
    
    window.dispatchEvent(new CustomEvent('chatUserStatus', { 
      detail: { userId, isInChat, chatId: chatId || this.chatId } 
    }));
  }

  // Callback quando mensagem é lida
  onMessageRead(messageId) {
    window.dispatchEvent(new CustomEvent('chatMessageRead', { 
      detail: { messageId, chatId: this.chatId } 
    }));
  }

  // Envia mensagem via WebSocket
  sendMessage(messageContent) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SEND_MESSAGE',
        chatId: this.chatId,
        messageContent: messageContent
      }));
      return true;
    }
    return false;
  }

  // Notifica que usuário está digitando
  sendTypingStatus(isTyping) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Backend espera: { type: "TYPING", data: { isTyping: true/false } }
      const message = {
        type: 'TYPING',
        data: {
          isTyping: isTyping
        }
      };
      
      console.log(`⌨️ Enviando status digitação: ${isTyping ? 'DIGITANDO' : 'PAROU'}`);
      this.ws.send(JSON.stringify(message));
    }
  }

  // Marca mensagem como lida
  markAsRead(messageId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'MARK_READ',
        messageId: messageId,
        chatId: this.chatId
      }));
    }
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
  scheduleReconnect(chatId, userId, token) {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      setTimeout(() => {
        console.log('🔄 Reconectando WebSocket do chat...');
        this.connect(
          chatId || this.chatId, 
          userId || this.userId, 
          token || localStorage.getItem('token')
        );
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Número máximo de tentativas de reconexão do chat atingido');
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
  }

  // Verifica se está conectado
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Instância global do WebSocket do chat
window.ChatWebSocket = ChatWebSocket;
