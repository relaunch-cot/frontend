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
    // Backend now returns chats for the authenticated user without needing userId in the path
    const res = await fetch(`${BASE_URL}/v1/chat`, {
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
      let UrlImageUser = chat.otherUserProfileImageUrl || null;

      if (chat.user1 && chat.user2) {
        if (chat.user1.userId === userId) {
          nomeOutroUsuario = chat.user2.name || `Usuário ${chat.user2.userId}`;
          outroUserId = chat.user2.userId;
        } else {
          nomeOutroUsuario = chat.user1.name || `Usuário ${chat.user1.userId}`;
          outroUserId = chat.user1.userId;
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
      if (UrlImageUser && UrlImageUser.trim() !== '') {
        avatarHtml = `
          <img src="${UrlImageUser}" 
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

// ============= BUSCA DE USUÁRIOS =============

const searchInput = document.getElementById('searchUserInput');
const searchResults = document.getElementById('searchResults');
let searchTimeout;

searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  
  clearTimeout(searchTimeout);
  
  if (query.length === 0) {
    searchResults.style.display = 'none';
    return;
  }
  
  if (query.length < 2) {
    searchResults.innerHTML = '<div class="search-no-results">Digite pelo menos 2 caracteres</div>';
    searchResults.style.display = 'block';
    return;
  }
  
  searchResults.innerHTML = '<div class="search-loading">Buscando...</div>';
  searchResults.style.display = 'block';
  
  searchTimeout = setTimeout(() => {
    buscarUsuarios(query);
  }, 500);
});

// Fechar resultados ao clicar fora
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-users-section')) {
    searchResults.style.display = 'none';
  }
});

async function buscarUsuarios(userName) {
  try {
    const response = await fetch(`${BASE_URL}/v1/user/search/${encodeURIComponent(userName)}`, {
      headers: {
        'Authorization': token
      }
    });
    
    if (!response.ok) {
      throw new Error('Erro ao buscar usuários');
    }
    
    const data = await response.json();
    const users = data.users || [];
    
    if (users.length === 0) {
      searchResults.innerHTML = '<div class="search-no-results">Nenhum usuário encontrado</div>';
      return;
    }
    
    renderSearchResults(users);
  } catch (error) {
    console.error('Erro na busca:', error);
    searchResults.innerHTML = '<div class="search-no-results">Erro ao buscar usuários</div>';
  }
}

function renderSearchResults(users) {
  searchResults.innerHTML = users.map(user => {
    // Não mostrar o próprio usuário nos resultados
    if (user.userId === userId) return '';
    
    const avatarHtml = user.UrlImageUser 
      ? `<img src="${user.UrlImageUser}" alt="${user.name}">`
      : user.name.charAt(0).toUpperCase();
    
    return `
      <div class="search-result-item" data-user-id="${user.userId}" data-user-name="${user.name}">
        <div class="search-result-avatar">
          ${avatarHtml}
        </div>
        <div class="search-result-info">
          <div class="search-result-name">${user.name}</div>
          <div class="search-result-email">${user.email || ''}</div>
        </div>
      </div>
    `;
  }).join('');
  
  // Adicionar event listeners aos resultados
  document.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const targetUserId = item.dataset.userId;
      const targetUserName = item.dataset.userName;
      criarOuAbrirChat(targetUserId, targetUserName);
    });
  });
}

async function criarOuAbrirChat(targetUserId, targetUserName) {
  try {
    // Tentar criar o chat
    const response = await fetch(`${BASE_URL}/v1/chat`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userIds: [userId, targetUserId],
        createdBy: userId
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const chatId = data.chatId;
      
      // Redirecionar para o chat
      window.location.href = `/chat?chatId=${chatId}&contactName=${encodeURIComponent(targetUserName)}&contactUserId=${targetUserId}`;
    } else {
      const errorText = await response.text();
      
      // Se o chat já existe, buscar o chat existente
      if (errorText.includes('already exists') || errorText.includes('AlreadyExists')) {
        const chatsResponse = await fetch(`${BASE_URL}/v1/chat/users?user1Id=${userId}&user2Id=${targetUserId}`, {
          headers: {
            'Authorization': token
          }
        });
        
        if (chatsResponse.ok) {
          const chatData = await chatsResponse.json();
          
          if (chatData && chatData.chat && chatData.chat.chatId) {
            const chatId = chatData.chat.chatId;
            window.location.href = `/chat?chatId=${chatId}&contactName=${encodeURIComponent(targetUserName)}&contactUserId=${targetUserId}`;
          }
        }
      } else {
        showError('Erro ao criar chat');
      }
    }
  } catch (error) {
    console.error('Erro ao criar/abrir chat:', error);
    showError('Erro ao criar chat. Tente novamente.');
  }
}
