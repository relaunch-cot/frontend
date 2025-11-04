function createNotificationContainer() {
  if (!document.querySelector('.notification-container')) {
    const container = document.createElement('div');
    container.className = 'notification-container';
    document.body.appendChild(container);
  }
}

function showNotification(message, type = 'info') {
  // Se está redirecionando para login, só permite a mensagem de sessão expirada
  const isSessionExpiredMsg = message.includes('sessão expirou') || message.includes('session expired');
  if (window.__redirectingToLogin && !isSessionExpiredMsg) {
    return; // Bloqueia outras notificações
  }
  
  createNotificationContainer();
  
  const container = document.querySelector('.notification-container');
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };
  
  notification.innerHTML = `
    <span class="notification-icon">${icons[type]}</span>
    <span>${message}</span>
    <button class="notification-close">&times;</button>
  `;
  
  container.appendChild(notification);
  
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    notification.remove();
  });
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}

function showSuccess(message) {
  showNotification(message, 'success');
}

function showError(message) {
  showNotification(message, 'error');
}

function showInfo(message) {
  showNotification(message, 'info');
}

async function updateNotificationBadge() {
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
      headers: {
        'Authorization': token
      }
    });
    
    if (!response.ok) return;
    
    const data = await response.json();
    const notifications = data.notifications || [];
    const count = notifications.length;
    
    updateBadgeCount(count);
  } catch (error) {
  }
}

function updateBadgeCount(count) {
  const sinoIcon = document.getElementById('sino');
  if (!sinoIcon) return;
  
  const oldBadge = sinoIcon.querySelector('.notification-badge');
  if (oldBadge) oldBadge.remove();
  
  if (count > 0) {
    const badge = document.createElement('span');
    badge.className = 'notification-badge';
    badge.textContent = count > 99 ? '99+' : count;
    sinoIcon.style.position = 'relative';
    sinoIcon.appendChild(badge);
  }
}

const isNotificationPage = window.location.pathname.includes('/notification/notification.html');

if (!isNotificationPage) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNotificationBadge);
  } else {
    updateNotificationBadge();
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof initializeNotificationWebSocket === 'function') {
        initializeNotificationWebSocket();
      }
    });
  } else {
    if (typeof initializeNotificationWebSocket === 'function') {
      initializeNotificationWebSocket();
    }
  }
}

const isAuthPage = window.location.pathname.includes('/login/') || 
                   window.location.pathname.includes('/cadastro/');

if (!isAuthPage) {
  function initializePresenceManager() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return;
    }
    
    if (typeof window.presenceManager === 'undefined') {
      return;
    }
    
    if (window.presenceManager.isConnected()) {
      return;
    }
    
    try {
      const tokenWithoutBearer = token.replace('Bearer ', '');
      const payload = JSON.parse(atob(tokenWithoutBearer.split('.')[1]));
      const userId = payload.userId;
      
      if (!userId) {
        return;
      }
      
      window.presenceManager.connect(userId, token);
    } catch (error) {
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePresenceManager);
  } else {
    initializePresenceManager();
  }
}
