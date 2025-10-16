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

    data.chats.forEach(chat => {
      let nomeOutroUsuario = 'Desconhecido';

      // A API retorna user1 e user2 como objetos com { userId, name, email }
      if (chat.user1 && chat.user2) {
        if (chat.user1.userId === userId) {
          nomeOutroUsuario = chat.user2.name || `Usuário ${chat.user2.userId}`;
        } else {
          nomeOutroUsuario = chat.user1.name || `Usuário ${chat.user1.userId}`;
        }
      }

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
            <div class="chat-preview">Clique para abrir o chat</div>
          </div>
          <div class="chat-meta">
            <div class="chat-time">Agora</div>
          </div>
        </a>
      `;
      chatList.appendChild(li);
    });

  } catch (err) {
    showError('Erro de conexão. Tente novamente.');
    emptyMsg.style.display = 'block';
  }
}


carregarChats();
