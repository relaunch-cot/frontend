const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;
const chatList = document.getElementById('chatList');
const emptyMsg = document.getElementById('emptyMsg');


const token = localStorage.getItem('token');
if (!token) {
  showError('Você precisa estar logado para acessar o chat.');
  setTimeout(() => window.location.href = '/home', 2000);
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Remove Bearer se presente antes de decodificar
const decodedToken = parseJwt(token.replace('Bearer ', ''));
const userId = decodedToken?.userId;
if (!userId) {
  showError('Sessão expirada. Faça login novamente.');
  localStorage.removeItem('token');
  setTimeout(() => window.location.href = '/login', 2000);
}

function formatarTempo(timestamp) {
  const agora = new Date();
  const dataMsg = new Date(timestamp);
  
  const dataCorrigida = new Date(dataMsg.getTime() + (3 * 60 * 60 * 1000));
  
  const diffMs = agora - dataCorrigida;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `${diffHoras}h`;
  
  const diffDias = Math.floor(diffHoras / 24);
  return `${diffDias}d`;
}

async function buscarUltimaMensagem(chatId) {
  try {
    const res = await fetch(`${BASE_URL}/v1/chat/messages/${chatId}`, {
      headers: {
        'Authorization': token
      }
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data.messages && data.messages.length > 0) {
      const ultimaMsg = data.messages[data.messages.length - 1];
      return {
        conteudo: ultimaMsg.messageContent,
        timestamp: ultimaMsg.createdAt || ultimaMsg.timestamp
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function carregarChats() {
  try {
    const res = await fetch(`${BASE_URL}/v1/chat/${userId}`, {
      headers: {
        'Authorization': token
      }
    });

    if (!res.ok) {
      showError('Erro ao carregar chats.');
      emptyMsg.style.display = 'block';
      return;
    }

    const data = await res.json();

    if (!data || !data.chats || data.chats.length === 0) {
      emptyMsg.style.display = 'block';
      return;
    }

    chatList.innerHTML = '';
    emptyMsg.style.display = 'none';

    // Array para coletar IDs dos outros usuários para subscrever
    const userIdsToSubscribe = [];

    for (const chat of data.chats) {
      let nomeOutroUsuario = 'Desconhecido';
      let outroUserId = null;

      if (chat.user1 && chat.user2) {
        if (chat.user1.userId === userId) {
          nomeOutroUsuario = chat.user2.name || `Usuário ${chat.user2.userId}`;
          outroUserId = chat.user2.userId;
        } else {
          nomeOutroUsuario = chat.user1.name || `Usuário ${chat.user1.userId}`;
          outroUserId = chat.user1.userId;
        }
      }

      // Adiciona à lista de subscrições
      if (outroUserId) {
        userIdsToSubscribe.push(outroUserId);
      }

      const ultimaMsg = await buscarUltimaMensagem(chat.chatId);
      let preview = ultimaMsg ? ultimaMsg.conteudo : 'Clique para abrir o chat';
      if (preview.length > 50) {
        preview = preview.substring(0, 50) + '...';
      }
      const tempo = ultimaMsg ? formatarTempo(ultimaMsg.timestamp) : 'agora';

      // Verifica se o outro usuário está online
      const isOnline = window.presenceManager && window.presenceManager.isUserOnline(outroUserId);

      const li = document.createElement('li');
      li.setAttribute('data-user-id', outroUserId);
      li.innerHTML = `
        <a href="/chat?chatId=${chat.chatId}&contactName=${encodeURIComponent(nomeOutroUsuario)}&contactUserId=${outroUserId}" class="chat-item">
          <div class="avatar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            <span class="status-indicator ${isOnline ? 'online' : 'offline'}"></span>
          </div>
          <div class="chat-info">
            <div class="chat-name">${nomeOutroUsuario}</div>
            <div class="chat-preview">${preview}</div>
          </div>
          <div class="chat-meta">
            <div class="chat-time">${tempo}</div>
          </div>
        </a>
      `;
      chatList.appendChild(li);
    }

    // Inscreve para monitorar todos os usuários da lista
    if (userIdsToSubscribe.length > 0 && window.presenceManager) {
      window.presenceManager.subscribe(userIdsToSubscribe);
    }

  } catch (err) {
    showError('Erro de conexão. Tente novamente.');
    emptyMsg.style.display = 'block';
  }
}

// Atualiza o status online/offline de um usuário específico
function atualizarStatusUsuario(userId, isOnline) {
  const chatItem = document.querySelector(`li[data-user-id="${userId}"]`);
  if (chatItem) {
    const statusIndicator = chatItem.querySelector('.status-indicator');
    if (statusIndicator) {
      if (isOnline) {
        statusIndicator.classList.add('online');
        statusIndicator.classList.remove('offline');
      } else {
        statusIndicator.classList.remove('online');
        statusIndicator.classList.add('offline');
      }
    }
  }
}

// Conecta ao sistema de presença se não estiver conectado
if (window.presenceManager && !window.presenceManager.isConnected()) {
  const token = localStorage.getItem('token');
  if (token && userId) {
    window.presenceManager.connect(userId, token);
  }
}

// Listeners para eventos de presença
window.addEventListener('userOnline', (event) => {
  const { userId } = event.detail;
  atualizarStatusUsuario(userId, true);
});

window.addEventListener('userOffline', (event) => {
  const { userId } = event.detail;
  atualizarStatusUsuario(userId, false);
});

window.addEventListener('onlineUsersListUpdated', (event) => {
  const { userIds } = event.detail;
  
  // Atualiza todos os status
  document.querySelectorAll('li[data-user-id]').forEach(li => {
    const userId = li.getAttribute('data-user-id');
    const isOnline = userIds.includes(userId);
    const statusIndicator = li.querySelector('.status-indicator');
    if (statusIndicator) {
      if (isOnline) {
        statusIndicator.classList.add('online');
        statusIndicator.classList.remove('offline');
      } else {
        statusIndicator.classList.remove('online');
        statusIndicator.classList.add('offline');
      }
    }
  });
});

// Listener para quando presença conectar
// Garante que subscrição aconteça APÓS conexão estar pronta
let chatsCarregados = false;
window.addEventListener('presenceConnected', () => {
  if (!chatsCarregados) {
    carregarChats();
    chatsCarregados = true;
  }
});

// Se já estiver conectado, carrega imediatamente
if (window.presenceManager && window.presenceManager.isConnected()) {
  carregarChats();
  chatsCarregados = true;
} else {
  // Se não conectou ainda, aguarda evento presenceConnected
}

setInterval(carregarChats, 30000);
