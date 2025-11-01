function createNotificationContainer() {
  if (!document.querySelector('.notification-container')) {
    const container = document.createElement('div');
    container.className = 'notification-container';
    document.body.appendChild(container);
  }
}

function showNotification(message, type = 'info') {
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

// Busca e atualiza contador de notificações
async function updateNotificationBadge() {
  const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;
  const token = localStorage.getItem('token');
  
  if (!token || !BASE_URL) return;
  
  try {
    // Extrai userId do token
    const tokenWithoutBearer = token.replace('Bearer ', '');
    const payload = JSON.parse(atob(tokenWithoutBearer.split('.')[1]));
    const userId = payload.userId;
    
    if (!userId) return;
    
    // Busca notificações do usuário
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
    
    // Atualiza badge com a contagem
    updateBadgeCount(count);
  } catch (error) {
  }
}

// Atualiza apenas o badge com a contagem fornecida (sem fazer requisição)
function updateBadgeCount(count) {
  const sinoIcon = document.getElementById('sino');
  if (!sinoIcon) return;
  
  // Remove badge antigo se existir
  const oldBadge = sinoIcon.querySelector('.notification-badge');
  if (oldBadge) oldBadge.remove();
  
  // Adiciona novo badge se houver notificações
  if (count > 0) {
    const badge = document.createElement('span');
    badge.className = 'notification-badge';
    badge.textContent = count > 99 ? '99+' : count;
    sinoIcon.style.position = 'relative';
    sinoIcon.appendChild(badge);
  }
}

// Inicializa badge quando a página carrega (exceto na página de notificações)
const isNotificationPage = window.location.pathname.includes('/notification/notification.html');

if (!isNotificationPage) {
  // Faz busca inicial
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNotificationBadge);
  } else {
    updateNotificationBadge();
  }
  
  // Inicializa WebSocket para atualizações em tempo real
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

// ========================================
// INICIALIZA PRESENCE MANAGER EM TODAS AS PÁGINAS
// ========================================
// Conecta ao sistema de presença global (exceto login/cadastro)
const isAuthPage = window.location.pathname.includes('/login/') || 
                   window.location.pathname.includes('/cadastro/');

if (!isAuthPage) {
  function initializePresenceManager() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return;
    }
    
    // Verifica se presenceManager existe
    if (typeof window.presenceManager === 'undefined') {
      return;
    }
    
    // Verifica se já está conectado
    if (window.presenceManager.isConnected()) {
      return;
    }
    
    try {
      // Extrai userId do token
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
  
  // Inicializa quando a página carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePresenceManager);
  } else {
    initializePresenceManager();
  }
}
