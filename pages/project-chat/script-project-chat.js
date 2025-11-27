const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;
const API_BASE = `${BASE_URL}/v1/chat`;

const token = localStorage.getItem('token');
if (!token) {
  showError('Você precisa estar logado para acessar o chat.');
  setTimeout(() => window.location.href = '/login', 2000);
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

const entrada = document.getElementById('entradaMensagem');
const mensagensContainer = document.getElementById('mensagens');

const urlParams = new URLSearchParams(window.location.search);
let chatId = urlParams.get('chatId');
const contactName = urlParams.get('contactName') || 'Contato';
const contactUserId = urlParams.get('contactUserId');
const isPreview = urlParams.get('preview') === 'true';

if (!chatId && !isPreview) {
  showError('Nenhum chat selecionado.');
  setTimeout(() => window.location.href = '/home', 2000);
}

document.getElementById('contactName').textContent = contactName;

async function loadContactAvatar() {
  // Em modo preview, carregar avatar do usuário diretamente
  if (isPreview && contactUserId) {
    try {
      const response = await fetch(`${BASE_URL}/v1/user/${contactUserId}`, {
        headers: {
          'Authorization': token
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const user = data.user;
        
        const contactAvatarDiv = document.querySelector('.contact-avatar');
        if (contactAvatarDiv && user) {
          const oldSvg = contactAvatarDiv.querySelector('svg:not(.status-indicator)');
          if (oldSvg) oldSvg.remove();
          
          const otherUserProfileImageUrl = user.UrlImageUser;
          const otherUserName = user.name;
          
          let avatarHtml;
          if (otherUserProfileImageUrl && otherUserProfileImageUrl.trim() !== '') {
            avatarHtml = `
              <img src="${otherUserProfileImageUrl}" 
                   alt="${otherUserName}" 
                   class="avatar-img avatar-large" 
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="avatar-letter avatar-large" style="display: none;">
                ${otherUserName.charAt(0).toUpperCase()}
              </div>`;
          } else {
            avatarHtml = `
              <div class="avatar-letter avatar-large">
                ${otherUserName.charAt(0).toUpperCase()}
              </div>`;
          }
          
          const statusIndicator = contactAvatarDiv.querySelector('.status-indicator');
          if (statusIndicator) {
            statusIndicator.insertAdjacentHTML('beforebegin', avatarHtml);
          } else {
            contactAvatarDiv.innerHTML = avatarHtml;
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar avatar do contato:', error);
    }
    return;
  }
  
  if (!chatId) return;
  
  try {
    const response = await fetch(`${BASE_URL}/v1/chat/chatId/${chatId}`, {
      headers: {
        'Authorization': token
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const chat = data.chat;
      
      const contactAvatarDiv = document.querySelector('.contact-avatar');
      if (contactAvatarDiv && chat) {
        const oldSvg = contactAvatarDiv.querySelector('svg:not(.status-indicator)');
        if (oldSvg) oldSvg.remove();
        
        const otherUserProfileImageUrl = chat.otherUserProfileImageUrl;
        const otherUserName = contactName;
        
        let avatarHtml;
        if (otherUserProfileImageUrl && otherUserProfileImageUrl.trim() !== '') {
          avatarHtml = `
            <img src="${otherUserProfileImageUrl}" 
                 alt="${otherUserName}" 
                 class="avatar-img avatar-large" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="avatar-letter avatar-large" style="display: none;">
              ${otherUserName.charAt(0).toUpperCase()}
            </div>`;
        } else {
          avatarHtml = `
            <div class="avatar-letter avatar-large">
              ${otherUserName.charAt(0).toUpperCase()}
            </div>`;
        }
        
        const statusIndicator = contactAvatarDiv.querySelector('.status-indicator');
        if (statusIndicator) {
          statusIndicator.insertAdjacentHTML('beforebegin', avatarHtml);
        } else {
          contactAvatarDiv.innerHTML = avatarHtml;
        }
      }
    }
  } catch (error) {
    console.error('Erro ao carregar avatar do contato:', error);
  }
}

loadContactAvatar();

entrada.addEventListener('input', ajustarAltura);
function ajustarAltura() {
  entrada.style.height = 'auto';
  entrada.style.height = entrada.scrollHeight + 'px';
}
async function enviarMensagem() {
  const texto = entrada.value.trim();
  if (texto) {
    adicionarMensagem(texto, 'usuario');
    entrada.value = '';
    ajustarAltura();
    await enviarMensagemParaBackend(texto);
  }
}

entrada.addEventListener('keydown', async function (evento) {
  if (evento.key === 'Enter' && !evento.shiftKey) {
    evento.preventDefault();
    await enviarMensagem();
  }
});

document.getElementById('btnEnviar').addEventListener('click', enviarMensagem);

function adicionarMensagem(texto, tipo, timestamp) {
  const novaMensagem = document.createElement('div');
  novaMensagem.className = `mensagem ${tipo}`;
  
  const mensagemTexto = document.createElement('div');
  mensagemTexto.className = 'mensagem-texto';
  mensagemTexto.textContent = texto;
  
  const mensagemHora = document.createElement('div');
  mensagemHora.className = 'mensagem-hora';
  
  // compute message date (in local timezone)
  let messageDateObj;
  if (timestamp) {
    const data = new Date(timestamp);
    // keep existing +3h correction if timestamps are UTC without timezone
    const dataCorrigida = new Date(data.getTime() + (3 * 60 * 60 * 1000));
    messageDateObj = dataCorrigida;
    mensagemHora.textContent = dataCorrigida.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } else {
    messageDateObj = new Date();
    mensagemHora.textContent = messageDateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const messageDateString = messageDateObj.toDateString();
  novaMensagem.dataset.date = messageDateString;

  // Ensure a date separator exists when the new message date differs from the last message
  // Find the last message element (exclude separators and typing indicator)
  const mensagens = mensagensContainer.querySelectorAll('.mensagem');
  const ultimaMensagem = mensagens.length ? mensagens[mensagens.length - 1] : null;

  if (!ultimaMensagem) {
    // no messages yet -> add separator for this date
    adicionarSeparadorData(messageDateObj);
  } else {
    const ultimaData = ultimaMensagem.dataset.date;
    if (ultimaData !== messageDateString) {
      adicionarSeparadorData(messageDateObj);
    }
  }
  
  novaMensagem.appendChild(mensagemTexto);
  novaMensagem.appendChild(mensagemHora);
  mensagensContainer.appendChild(novaMensagem);
  
  setTimeout(() => {
    const textoHeight = mensagemTexto.scrollHeight;
    const lineHeight = parseInt(window.getComputedStyle(mensagemTexto).lineHeight);
    const numLinhas = Math.round(textoHeight / lineHeight);
    
    if (numLinhas > 1) {
      novaMensagem.classList.add('multilinha');
    }
  }, 0);
  
  mensagensContainer.scrollTop = mensagensContainer.scrollHeight;
}

function adicionarSeparadorData(data) {
  const separador = document.createElement('div');
  separador.className = 'separador-data';
  
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  
  const dataMsg = new Date(data);
  
  let textoData;
  if (dataMsg.toDateString() === hoje.toDateString()) {
    textoData = 'Hoje';
  } else if (dataMsg.toDateString() === ontem.toDateString()) {
    textoData = 'Ontem';
  } else {
    textoData = dataMsg.toLocaleDateString('pt-BR');
  }
  
  separador.textContent = textoData;
  mensagensContainer.appendChild(separador);
}

async function carregarMensagens() {
  // Não carregar mensagens se estiver em modo preview sem chatId
  if (isPreview && !chatId) {
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/messages/${chatId}`, {
      method: 'GET',
      headers: {
        'Authorization': token
      }
    });

    if (!res.ok) {
      showError('Erro ao carregar mensagens.');
      return;
    }

    const data = await res.json();
    mensagensContainer.innerHTML = '';

    if (Array.isArray(data.messages)) {
      // Rely on adicionarMensagem to insert date separators to avoid duplicates
      data.messages.forEach(msg => {
        const tipo = msg.senderId == userId ? 'usuario' : 'outra-pessoa';
        adicionarMensagem(msg.messageContent, tipo, msg.createdAt || msg.timestamp);
      });
    }
  } catch (err) {
    showError('Erro de conexão. Tente novamente.');
  }
}

async function enviarMensagemParaBackend(texto) {
  try {
    // Se está em modo preview, criar o chat primeiro
    if (isPreview && !chatId && contactUserId) {
      const createResponse = await fetch(`${BASE_URL}/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: [userId, contactUserId],
          createdBy: userId
        })
      });
      
      if (!createResponse.ok) {
        showError('Erro ao criar chat.');
        return;
      }
      
      const createData = await createResponse.json();
      chatId = createData.chatId;
      
      // Atualizar URL sem recarregar a página
      const newUrl = `/chat?chatId=${chatId}&contactName=${encodeURIComponent(contactName)}&contactUserId=${contactUserId}`;
      window.history.replaceState({}, '', newUrl);
      
      // Inicializar WebSocket do chat
      if (window.ChatWebSocket) {
        window.chatWS = new window.ChatWebSocket(chatId, userId, token);
      }
    }
    
    const body = {
      chatId: chatId,
      messageContent: texto
    };

    const res = await fetch(`${API_BASE}/send-message/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      showError('Erro ao enviar mensagem.');
      return;
    }

    if (!window.chatWS || !window.chatWS.isConnected()) {
      await carregarMensagens();
    }

    if (contactUserId) {
      await enviarNotificacaoMensagem(contactUserId, texto);
    }

  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    showError('Erro ao enviar mensagem. Tente novamente.');
  }
}

async function obterNomeRemetente(chatId) {
  try {
    const response = await fetch(`${BASE_URL}/v1/chat/chatId/${chatId}`, {
      method: 'GET',
      headers: {
        'Authorization': token
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    const chat = data.chat;
    if (!chat) {
      return null;
    }
    
    if (chat.user1?.userId === userId) {
      return chat.user1?.name || null;
    } else if (chat.user2?.userId === userId) {
      return chat.user2?.name || null;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function enviarNotificacaoMensagem(receiverId, messageContent) {
  try {
    const senderName = await obterNomeRemetente(chatId) || 'Usuário';
    
    const preview = messageContent.length > 50 
      ? messageContent.substring(0, 50) + '...' 
      : messageContent;
    
    const notificationBody = {
      receiverId: receiverId,
      title: `Nova Mensagem de ${senderName}`,
      content: `${preview}`,
      type: 'CHAT_MESSAGE'
    };

    const response = await fetch(`${BASE_URL}/v1/notification/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(notificationBody)
    });

    if (response.ok) {
    } else {
    }
  } catch (error) {
  }
}

function mostrarIndicadorDigitacao() {
  let indicator = document.getElementById('typing-indicator');
  
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.className = 'typing-indicator';
    
    const text = document.createElement('span');
    text.className = 'typing-indicator-text';
    text.textContent = contactName + ' está digitando';
    
    const dots = document.createElement('div');
    dots.className = 'typing-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';
    
    indicator.appendChild(text);
    indicator.appendChild(dots);
    
    mensagensContainer.appendChild(indicator);
    mensagensContainer.scrollTop = mensagensContainer.scrollHeight;
  } else {
  }
}

function esconderIndicadorDigitacao() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

function mostrarIconeNovaMensagem(senderName) {
  const iconAnterior = document.getElementById('new-message-icon');
  if (iconAnterior) {
    iconAnterior.remove();
  }
  
  const iconContainer = document.createElement('div');
  iconContainer.id = 'new-message-icon';
  iconContainer.className = 'new-message-notification';
  iconContainer.title = `Nova mensagem de ${senderName}`; 
  
  iconContainer.innerHTML = `
    <div class="notification-content">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
        <path d="M256 448c141.4 0 256-93.1 256-208S397.4 32 256 32S0 125.1 0 240c0 45.1 17.7 86.8 47.7 120.9c-1.9 24.5-11.4 46.3-21.4 62.9c-5.5 9.2-11.1 16.6-15.2 21.6c-2.1 2.5-3.7 4.4-4.9 5.7c-.6 .6-1 1.1-1.3 1.4l-.3 .3c0 0 0 0 0 0c0 0 0 0 0 0s0 0 0 0s0 0 0 0c-4.6 4.6-5.9 11.4-3.4 17.4c2.5 6 8.3 9.9 14.8 9.9c28.7 0 57.6-8.9 81.6-19.3c22.9-10 42.4-21.9 54.3-30.6c31.8 11.5 67 17.9 104.1 17.9z"/>
      </svg>
      <span class="notification-text">Nova mensagem de ${senderName}</span>
    </div>
    <div class="pulse-ring"></div>
  `;
  
  document.body.appendChild(iconContainer);
  
  setTimeout(() => {
    iconContainer.classList.add('fade-out');
    setTimeout(() => iconContainer.remove(), 300);
  }, 5000);
}


document.addEventListener('DOMContentLoaded', () => {
  
  // Mostrar mensagem de boas-vindas se estiver em modo preview
  if (isPreview && !chatId) {
    mensagensContainer.innerHTML = `
      <div class="empty-chat-message">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="64" height="64">
          <path fill="#46B1D5" d="M512 240c0 114.9-114.6 208-256 208c-37.1 0-72.3-6.4-104.1-17.9c-11.9 8.7-31.3 20.6-54.3 30.6C73.6 471.1 44.7 480 16 480c-6.5 0-12.3-3.9-14.8-9.9c-2.5-6-1.1-12.8 3.4-17.4l0 0 0 0 0 0 0 0 .3-.3c.3-.3 .7-.7 1.3-1.4c1.1-1.2 2.8-3.1 4.9-5.7c4.1-5 9.6-12.4 15.2-21.6c10-16.6 19.5-38.4 21.4-62.9C17.7 326.8 0 285.1 0 240C0 125.1 114.6 32 256 32s256 93.1 256 208z"/>
        </svg>
        <h3>Comece uma conversa com ${contactName}</h3>
        <p>Envie uma mensagem para iniciar o chat</p>
      </div>
    `;
  } else {
    carregarMensagens();
  }
  
  const statusIndicator = document.getElementById('statusIndicator');
  const contactStatus = document.getElementById('contactStatus');
  
  let isContactInChat = false;
  
  function updateContactStatus(isOnline, inChat = false) {
    
    if (inChat) {
      statusIndicator.classList.add('online', 'in-chat');
      statusIndicator.classList.remove('offline');
      contactStatus.textContent = 'No chat';
      contactStatus.classList.add('online', 'in-chat');
      contactStatus.classList.remove('offline');
    } else if (isOnline) {
      statusIndicator.classList.add('online');
      statusIndicator.classList.remove('offline', 'in-chat');
      contactStatus.textContent = 'Online';
      contactStatus.classList.add('online');
      contactStatus.classList.remove('offline', 'in-chat');
    } else {
      statusIndicator.classList.remove('online', 'in-chat');
      statusIndicator.classList.add('offline');
      contactStatus.textContent = 'Offline';
      contactStatus.classList.remove('online', 'in-chat');
      contactStatus.classList.add('offline');
    }
  }
  
  
  if (window.presenceManager && !window.presenceManager.isConnected()) {
    window.presenceManager.connect(userId, token);
  }
  
  function subscribeAndCheckStatus() {
    if (contactUserId && window.presenceManager) {
      window.presenceManager.subscribe([contactUserId]);
      
      const isOnline = window.presenceManager.isUserOnline(contactUserId);
      updateContactStatus(isOnline, false); 
    }
  }
  
  if (window.presenceManager && window.presenceManager.isConnected()) {
    subscribeAndCheckStatus();
  } else {
    window.addEventListener('presenceConnected', () => {
      subscribeAndCheckStatus();
    }, { once: true });
  }
  
  window.addEventListener('userOnline', (event) => {
    const { userId: onlineUserId } = event.detail;
    if (contactUserId && onlineUserId == contactUserId) {
      updateContactStatus(true, isContactInChat); 
    }
  });
  
  window.addEventListener('userOffline', (event) => {
    const { userId: offlineUserId } = event.detail;
    if (contactUserId && offlineUserId == contactUserId) {
      isContactInChat = false;
      updateContactStatus(false, false);
    }
  });
  
  window.addEventListener('onlineUsersListUpdated', (event) => {
    const { userIds } = event.detail;
    if (contactUserId) {
      const isOnline = userIds.includes(contactUserId);
      updateContactStatus(isOnline, isContactInChat);
    }
  });
  
  
  // Só conectar WebSocket se não estiver em modo preview
  if (typeof ChatWebSocket !== 'undefined' && chatId && !isPreview) {
    window.chatWS = new ChatWebSocket();
    window.chatWS.connect(chatId, userId, token);
    
    window.addEventListener('chatNewMessage', (event) => {
      const { message } = event.detail;
      
      if (message.chatId == chatId) {
        if (message.senderId != userId) {
          esconderIndicadorDigitacao();
          
          // Removido: mostrarIconeNovaMensagem (agora será tratado pelo sistema global)
          
          const tipo = 'outra-pessoa';
          
          const dataMsg = new Date(message.createdAt || Date.now());

          // find last message element (exclude separators and typing indicator)
          const mensagens = mensagensContainer.querySelectorAll('.mensagem');
          const ultimaMensagem = mensagens.length ? mensagens[mensagens.length - 1] : null;

          if (!ultimaMensagem) {
            adicionarSeparadorData(dataMsg);
          } else {
            const ultimaData = ultimaMensagem.dataset.date;
            if (ultimaData !== dataMsg.toDateString()) {
              adicionarSeparadorData(dataMsg);
            }
          }
          
          adicionarMensagem(message.messageContent, tipo, message.createdAt);
        }
      }
    });
    
    let typingTimeout;
    
    window.addEventListener('chatUserTyping', (event) => {
      const { userId: typingUserId, isTyping } = event.detail;
      
      if (isTyping) {
        contactStatus.textContent = 'Digitando...';
        contactStatus.classList.add('typing');
        contactStatus.classList.remove('online', 'offline', 'in-chat');
        
        mostrarIndicadorDigitacao();
        
        clearTimeout(typingTimeout);
        
      } else {
        clearTimeout(typingTimeout);
      }
      
      typingTimeout = setTimeout(() => {
        esconderIndicadorDigitacao();
        const isOnline = window.presenceManager && window.presenceManager.isUserOnline(contactUserId);
        updateContactStatus(isOnline, isContactInChat);
      },1500);
    });
    
    window.addEventListener('chatUserStatus', (event) => {
      const { userId: statusUserId, isInChat } = event.detail;
      
      if (contactUserId && statusUserId == contactUserId) {
        isContactInChat = isInChat;
        const isOnline = window.presenceManager && window.presenceManager.isUserOnline(contactUserId);
        updateContactStatus(isOnline, isInChat);
      }
    });
    
    window.addEventListener('beforeunload', () => {
      if (window.chatWS) {
        window.chatWS.disconnect();
      }
    });
  } else {
  }
  
  let typingTimeout;
  entrada.addEventListener('input', () => {
    if (window.chatWS && window.chatWS.isConnected()) {
      window.chatWS.sendTypingStatus(true);
      
      clearTimeout(typingTimeout);
      
      typingTimeout = setTimeout(() => {
        window.chatWS.sendTypingStatus(false);
      }, 1000);
    }
  });
});
