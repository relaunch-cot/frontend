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

    const userIdsToSubscribe = [];

    for (const chat of data.chats) {
      let nomeOutroUsuario = 'Desconhecido';
      let outroUserId = null;
      let urlImagePerfil = null;

      if (chat.user1 && chat.user2) {
        if (chat.user1.userId === userId) {
          nomeOutroUsuario = chat.user2.name || `Usuário ${chat.user2.userId}`;
          outroUserId = chat.user2.userId;
          urlImagePerfil = chat.user2.urlImagePerfil;
        } else {
          nomeOutroUsuario = chat.user1.name || `Usuário ${chat.user1.userId}`;
          outroUserId = chat.user1.userId;
          urlImagePerfil = chat.user1.urlImagePerfil;
        }
      }

      if (outroUserId) {
        userIdsToSubscribe.push(outroUserId);
      }

      const ultimaMsg = await buscarUltimaMensagem(chat.chatId);
      let preview = ultimaMsg ? ultimaMsg.conteudo : 'Clique para abrir o chat';
      if (preview.length > 50) {
        preview = preview.substring(0, 50) + '...';
      }
      const tempo = ultimaMsg ? formatarTempo(ultimaMsg.timestamp) : 'agora';

      const isOnline = window.presenceManager && window.presenceManager.isUserOnline(outroUserId);

      let avatarHtml;
      if (urlImagePerfil && urlImagePerfil.trim() !== '') {
        avatarHtml = `
          <img src="${urlImagePerfil}" 
               alt="${nomeOutroUsuario}" 
               class="avatar-img" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="avatar-letter" style="display: none;">
            ${nomeOutroUsuario.charAt(0).toUpperCase()}
          </div>`;
      } else {
        avatarHtml = `
          <div class="avatar-letter">
            ${nomeOutroUsuario.charAt(0).toUpperCase()}
          </div>`;
      }

      const li = document.createElement('li');
      li.setAttribute('data-user-id', outroUserId);
      li.innerHTML = `
        <a href="/chat?chatId=${chat.chatId}&contactName=${encodeURIComponent(nomeOutroUsuario)}&contactUserId=${outroUserId}" class="chat-item">
          <div class="avatar">
            ${avatarHtml}
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

    if (userIdsToSubscribe.length > 0 && window.presenceManager) {
      window.presenceManager.subscribe(userIdsToSubscribe);
    }

  } catch (err) {
    showError('Erro de conexão. Tente novamente.');
    emptyMsg.style.display = 'block';
  }
}

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

if (window.presenceManager && !window.presenceManager.isConnected()) {
  const token = localStorage.getItem('token');
  if (token && userId) {
    window.presenceManager.connect(userId, token);
  }
}

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

let chatsCarregados = false;
window.addEventListener('presenceConnected', () => {
  if (!chatsCarregados) {
    carregarChats();
    chatsCarregados = true;
  }
});

if (window.presenceManager && window.presenceManager.isConnected()) {
  carregarChats();
  chatsCarregados = true;
} else {
}

setInterval(carregarChats, 30000);
