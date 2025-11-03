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
    this.onlineUsers = new Set(); 
    this.offlineTimeouts = new Map(); 
    this.OFFLINE_DELAY = 5000; 
    this.subscribedUsers = new Set();
    this.MAX_SUBSCRIPTIONS = 50; 
    this.CACHE_KEY = 'presence_online_users'; 
    
    this.loadFromCache();
  }

  loadFromCache() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        
        if (data.timestamp && (now - data.timestamp) < 10000) {
          data.onlineUsers.forEach(userId => this.onlineUsers.add(userId));
        } else {
          localStorage.removeItem(this.CACHE_KEY);
        }
      }
    } catch (error) {
    }
  }

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

  connect(userId, token) {
    if (!token) {
      return;
    }

    this.userId = userId;
    this.token = token;

    const cleanToken = token.replace('Bearer ', '');

    const WS_BASE_URL = window.ENV_CONFIG?.WS_BACKEND || 'ws://localhost:8080';
    const wsUrl = `${WS_BASE_URL}/v1/ws/presence?token=${encodeURIComponent(cleanToken)}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      this.scheduleReconnect();
    }
  }

  setupEventHandlers() {
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      
      if (this.subscribedUsers.size > 0) {
        this.subscribe([...this.subscribedUsers]);
      }
      
      window.dispatchEvent(new CustomEvent('presenceConnected', { 
        detail: { userId: this.userId } 
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        
        if (!event.data || event.data.trim() === '') {
          return;
        }
        
        const messages = event.data.trim().split('\n').filter(line => line.trim());
        
        if (messages.length > 1) {
        }
        
        messages.forEach((msg, index) => {
          try {
            const data = JSON.parse(msg);
            this.handleMessage(data);
          } catch (err) {
          }
        });
        
      } catch (error) {
        
        if (event.data && typeof event.data === 'string') {
          if (event.data.includes('}{')) {
          }
          
        }
      }
    };

    this.ws.onerror = (error) => {
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      
      this.clearAllOfflineTimeouts();
      
      window.dispatchEvent(new CustomEvent('presenceDisconnected'));
      
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };
  }

  handleMessage(data) {
    
    switch (data.type) {
      case 'CONNECTED':
        break;
      
      case 'USER_ONLINE':
        if (data.isOnline !== undefined) {
          if (data.isOnline) {
            this.onUserOnline(data.userId);
          } else {
            this.onUserOffline(data.userId);
          }
        } else {
          this.onUserOnline(data.userId);
        }
        break;
      
      case 'USER_OFFLINE':
        this.onUserOffline(data.userId);
        break;
      
      case 'ONLINE_USERS':
        this.onOnlineUsersList(data.onlineUsers || data.userIds || []);
        break;
      
      case 'USER_STATUS':
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
        break;
      
      default:
    }
  }

  onUserOnline(userId) {
    if (userId == this.userId) return; 
    
    if (this.offlineTimeouts.has(userId)) {
      clearTimeout(this.offlineTimeouts.get(userId));
      this.offlineTimeouts.delete(userId);
    }
    
    const wasOffline = !this.onlineUsers.has(userId);
    this.onlineUsers.add(userId);
    
    this.saveToCache();
    
    if (wasOffline) {
      
      window.dispatchEvent(new CustomEvent('userOnline', { 
        detail: { userId } 
      }));
    } else {
    }
  }

  onUserOffline(userId) {
    if (userId == this.userId) return;
    
    if (this.offlineTimeouts.has(userId)) {
      return;
    }
    
    
    const timeoutId = setTimeout(() => {
      if (this.onlineUsers.has(userId)) {
        this.onlineUsers.delete(userId);
        
        this.saveToCache();
        
        window.dispatchEvent(new CustomEvent('userOffline', { 
          detail: { userId } 
        }));
      }
      
      this.offlineTimeouts.delete(userId);
    }, this.OFFLINE_DELAY);
    
    this.offlineTimeouts.set(userId, timeoutId);
  }

  onOnlineUsersList(userIds) {
    this.onlineUsers.clear();
    userIds.forEach(id => {
      if (id != this.userId) {
        this.onlineUsers.add(id);
      }
    });
    
    
    this.saveToCache();
    
    window.dispatchEvent(new CustomEvent('onlineUsersListUpdated', { 
      detail: { userIds: Array.from(this.onlineUsers) } 
    }));
  }

  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  getOnlineUsers() {
    return Array.from(this.onlineUsers);
  }

  
  subscribe(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return;
    }

    userIds.forEach(id => this.subscribedUsers.add(id));

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const newUsers = userIds;
    
    if (newUsers.length === 0) {
      return;
    }

    const availableSlots = this.MAX_SUBSCRIPTIONS - this.subscribedUsers.size;
    const toSubscribe = newUsers.slice(0, availableSlots);
    
    if (toSubscribe.length < newUsers.length) {
    }


    const message = {
      type: 'SUBSCRIBE_PRESENCE',
      data: {
        userIds: toSubscribe
      }
    };
    
    this.ws.send(JSON.stringify(message));
  }

  unsubscribe(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const toUnsubscribe = userIds.filter(id => this.subscribedUsers.has(id));

    if (toUnsubscribe.length === 0) {
      return;
    }

    toUnsubscribe.forEach(id => {
      this.subscribedUsers.delete(id);
      if (this.offlineTimeouts.has(id)) {
        clearTimeout(this.offlineTimeouts.get(id));
        this.offlineTimeouts.delete(id);
      }
    });


    this.ws.send(JSON.stringify({
      type: 'UNSUBSCRIBE_PRESENCE',
      data: {
        userIds: toUnsubscribe
      }
    }));
  }

  getSubscribedUsers() {
    return Array.from(this.subscribedUsers);
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

  scheduleReconnect() {
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      setTimeout(() => {
        this.connect(this.userId, this.token);
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
    }
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    this.clearAllOfflineTimeouts();
    
    if (this.ws) {
      this.ws.close(1000, 'Desconexão intencional');
      this.ws = null;
    }
    
    this.onlineUsers.clear();
    
    try {
      localStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
    }
  }

  clearAllOfflineTimeouts() {
    if (this.offlineTimeouts.size > 0) {
      this.offlineTimeouts.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      this.offlineTimeouts.clear();
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

window.presenceManager = new PresenceManager();
