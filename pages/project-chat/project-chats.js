const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;
const chatList = document.getElementById('chatList');
const emptyMsg = document.getElementById('emptyMsg');


const token = localStorage.getItem('token');
if (!token) {
  showError('Você precisa estar logado para acessar o chat.');
  setTimeout(() => window.location.href = '../home/index.html', 2000);
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
    console.error('Erro ao decodificar token JWT:', e);
    return null;
  }
}

const decodedToken = parseJwt(token.replace('Bearer ', ''));
const userId = decodedToken?.userId;
if (!userId) {
  showError('Sessão expirada. Faça login novamente.');
  localStorage.removeItem('token');
  setTimeout(() => window.location.href = '../login/index.html', 2000);
}

function formatarTempo(timestamp) {
  const agora = new Date();
  const dataMsg = new Date(timestamp);
  
  // Adicionar 3 horas para corrigir fuso horário
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
    console.log('Chats recebidos:', data);

    if (!data || !data.chats || data.chats.length === 0) {
      emptyMsg.style.display = 'block';
      return;
    }

    chatList.innerHTML = '';
    emptyMsg.style.display = 'none';

    for (const chat of data.chats) {
      let nomeOutroUsuario = 'Desconhecido';

      if (chat.user1 && chat.user2) {
        if (chat.user1.userId === userId) {
          nomeOutroUsuario = chat.user2.name || `Usuário ${chat.user2.userId}`;
        } else {
          nomeOutroUsuario = chat.user1.name || `Usuário ${chat.user1.userId}`;
        }
      }

      const ultimaMsg = await buscarUltimaMensagem(chat.chatId);
      let preview = ultimaMsg ? ultimaMsg.conteudo : 'Clique para abrir o chat';
      if (preview.length > 50) {
        preview = preview.substring(0, 50) + '...';
      }
      const tempo = ultimaMsg ? formatarTempo(ultimaMsg.timestamp) : 'agora';

      const li = document.createElement('li');
      li.innerHTML = `
        <a href="project-chat.html?chatId=${chat.chatId}&contactName=${encodeURIComponent(nomeOutroUsuario)}" class="chat-item">
          <div class="avatar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
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

  } catch (err) {
    showError('Erro de conexão. Tente novamente.');
    emptyMsg.style.display = 'block';
  }
}


carregarChats();

// Atualizar a cada 30 segundos
setInterval(carregarChats, 30000);
