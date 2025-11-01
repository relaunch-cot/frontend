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

  connect(chatId, userId, token) {
    if (!chatId || !userId || !token) {
      return;
    }

    this.chatId = chatId;
    this.userId = userId;

    const WS_BASE_URL = window.ENV_CONFIG?.WS_BACKEND || 'ws://localhost:8080';
    const wsUrl = `${WS_BASE_URL}/v1/ws/chat?chatId=${chatId}&userId=${userId}&token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      this.scheduleReconnect(chatId, userId, token);
    }
  }

  setupEventHandlers() {
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      
      window.dispatchEvent(new CustomEvent('chatConnected', { 
        detail: { chatId: this.chatId } 
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        if (!event.data || event.data.trim() === '') {
          return;
        }
        
        const messages = event.data.trim().split('\n').filter(msg => msg.trim());
        
        if (messages.length > 1) {
        }
        
        messages.forEach(msgStr => {
          try {
            const data = JSON.parse(msgStr);
            this.handleMessage(data);
          } catch (parseError) {
          }
        });
      } catch (error) {
        
        if (event.data && typeof event.data === 'string' && event.data.includes('}{')) {
        }
      }
    };

    this.ws.onerror = (error) => {
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      
      window.dispatchEvent(new CustomEvent('chatDisconnected', { 
        detail: { chatId: this.chatId } 
      }));
      
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };
  }

  handleMessage(data) {
    
    switch (data.type) {
      case 'NEW_MESSAGE':
        this.onNewMessage(data.message);
        break;
      
      case 'USER_TYPING':
        this.onUserTyping(data.userId, data.isTyping, data.chatId);
        break;
      
      case 'USER_STATUS':
        this.onUserStatus(data.userId, data.isInChat, data.chatId);
        break;
      
      case 'MESSAGE_READ':
        this.onMessageRead(data.messageId);
        break;
      
      case 'CONNECTED':
        break;
      
      case 'PONG':
        break;
      
      default:
    }
  }

  onNewMessage(message) {
    
    window.dispatchEvent(new CustomEvent('chatNewMessage', { 
      detail: { message, chatId: this.chatId } 
    }));
  }

  onUserTyping(userId, isTyping, chatId) {
    if (userId == this.userId) return;
    
    
    window.dispatchEvent(new CustomEvent('chatUserTyping', { 
      detail: { userId, isTyping, chatId: chatId || this.chatId } 
    }));
  }

  onUserStatus(userId, isInChat, chatId) {
    if (userId == this.userId) return;
    
    
    window.dispatchEvent(new CustomEvent('chatUserStatus', { 
      detail: { userId, isInChat, chatId: chatId || this.chatId } 
    }));
  }

  onMessageRead(messageId) {
    window.dispatchEvent(new CustomEvent('chatMessageRead', { 
      detail: { messageId, chatId: this.chatId } 
    }));
  }

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

  sendTypingStatus(isTyping) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'TYPING',
        data: {
          isTyping: isTyping
        }
      };
      
      this.ws.send(JSON.stringify(message));
    }
  }

  markAsRead(messageId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'MARK_READ',
        messageId: messageId,
        chatId: this.chatId
      }));
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

  scheduleReconnect(chatId, userId, token) {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      setTimeout(() => {
        this.connect(
          chatId || this.chatId, 
          userId || this.userId, 
          token || localStorage.getItem('token')
        );
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

window.ChatWebSocket = ChatWebSocket;
