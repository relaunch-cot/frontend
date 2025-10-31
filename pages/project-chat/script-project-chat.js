const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;
const API_BASE = `${BASE_URL}/v1/chat`;

const token = localStorage.getItem('token');
if (!token) {
  showError('Você precisa estar logado para acessar o chat.');
  setTimeout(() => window.location.href = '../login/index.html', 2000);
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

// Remove Bearer se presente antes de decodificar
const decodedToken = parseJwt(token.replace('Bearer ', ''));
const userId = decodedToken?.userId;
if (!userId) {
  showError('Sessão expirada. Faça login novamente.');
  localStorage.removeItem('token');
  setTimeout(() => window.location.href = '../login/index.html', 2000);
}

const entrada = document.getElementById('entradaMensagem');
const mensagensContainer = document.getElementById('mensagens');

const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get('chatId') || 1;
const contactName = urlParams.get('contactName') || 'Contato';
const contactUserId = urlParams.get('contactUserId'); // ID do outro usuário

if (!chatId) {
  showError('Nenhum chat selecionado.');
  setTimeout(() => window.location.href = '../home/index.html', 2000);
}

document.getElementById('contactName').textContent = contactName;

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
  
  if (timestamp) {
    const data = new Date(timestamp);
    // Adicionar 3 horas para corrigir fuso horário
    const dataCorrigida = new Date(data.getTime() + (3 * 60 * 60 * 1000));
    mensagemHora.textContent = dataCorrigida.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    // Armazena a data para comparação
    novaMensagem.dataset.date = dataCorrigida.toDateString();
  } else {
    mensagemHora.textContent = new Date().toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    novaMensagem.dataset.date = new Date().toDateString();
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
      let ultimaData = null;
      
      data.messages.forEach(msg => {
        const dataMsg = new Date(msg.createdAt || msg.timestamp || Date.now());
        const dataAtual = dataMsg.toDateString();
        
        if (ultimaData !== dataAtual) {
          adicionarSeparadorData(dataMsg);
          ultimaData = dataAtual;
        }
        
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
    // Sempre envia via HTTP POST para o backend
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

  } catch (err) {
    showError('Erro ao enviar mensagem. Tente novamente.');
  }
}

// Funções para indicador de digitação
function mostrarIndicadorDigitacao() {
  // Verifica se indicador já existe, não recria
  let indicator = document.getElementById('typing-indicator');
  
  if (!indicator) {
    // Cria novo indicador apenas se não existir
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
    console.log('Indicador de digitação já existe (mantendo)');
  }
}

function esconderIndicadorDigitacao() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
    console.log('Indicador de digitação removido');
  }
}


document.addEventListener('DOMContentLoaded', () => {
  console.log('Inicializando chat...');
  console.log(`ChatId: ${chatId}, UserId: ${userId}, Contato: ${contactName}`);
  
  // Carrega mensagens iniciais
  carregarMensagens();
  
  // Referências para elementos de status
  const statusIndicator = document.getElementById('statusIndicator');
  const contactStatus = document.getElementById('contactStatus');
  
  // Variável para rastrear se o contato está no chat (não apenas online)
  let isContactInChat = false;
  
  // Função para atualizar status do contato
  function updateContactStatus(isOnline, inChat = false) {
    console.log(`Atualizando status: Online=${isOnline}, InChat=${inChat}`);
    
    if (inChat) {
      // Usuário está ATIVAMENTE no chat
      statusIndicator.classList.add('online', 'in-chat');
      statusIndicator.classList.remove('offline');
      contactStatus.textContent = 'No chat';
      contactStatus.classList.add('online', 'in-chat');
      contactStatus.classList.remove('offline');
    } else if (isOnline) {
      // Usuário está online na plataforma, mas não neste chat
      statusIndicator.classList.add('online');
      statusIndicator.classList.remove('offline', 'in-chat');
      contactStatus.textContent = 'Online';
      contactStatus.classList.add('online');
      contactStatus.classList.remove('offline', 'in-chat');
    } else {
      // Usuário está offline
      statusIndicator.classList.remove('online', 'in-chat');
      statusIndicator.classList.add('offline');
      contactStatus.textContent = 'Offline';
      contactStatus.classList.remove('online', 'in-chat');
      contactStatus.classList.add('offline');
    }
  }
  
  // ========================================
  // SISTEMA DE PRESENÇA GLOBAL
  // ========================================
  // Usa WebSocket de presença para status online/offline (logado na plataforma)
  
  // Conecta ao sistema de presença se não estiver conectado
  if (window.presenceManager && !window.presenceManager.isConnected()) {
    console.log('🔌 Conectando ao sistema de presença...');
    window.presenceManager.connect(userId, token);
  }
  
  // Verifica status inicial do contato
  if (contactUserId && window.presenceManager) {
    const isOnline = window.presenceManager.isUserOnline(contactUserId);
    console.log(`📊 Status inicial de ${contactName} (${contactUserId}): ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
    updateContactStatus(isOnline, false); // Online na plataforma, mas ainda não sabemos se está no chat
  }
  
  // Listener para quando contato fica online
  window.addEventListener('userOnline', (event) => {
    const { userId: onlineUserId } = event.detail;
    if (contactUserId && onlineUserId == contactUserId) {
      console.log(`🟢 ${contactName} ficou ONLINE (presença global)`);
      updateContactStatus(true, isContactInChat); // Mantém status do chat
    }
  });
  
  // Listener para quando contato fica offline
  window.addEventListener('userOffline', (event) => {
    const { userId: offlineUserId } = event.detail;
    if (contactUserId && offlineUserId == contactUserId) {
      console.log(`⚪ ${contactName} ficou OFFLINE (presença global)`);
      isContactInChat = false; // Se ficou offline, não está mais no chat
      updateContactStatus(false, false);
    }
  });
  
  // Listener para lista inicial de usuários online
  window.addEventListener('onlineUsersListUpdated', (event) => {
    const { userIds } = event.detail;
    if (contactUserId) {
      const isOnline = userIds.includes(contactUserId);
      console.log(`📋 Lista atualizada - ${contactName} está ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      updateContactStatus(isOnline, isContactInChat); // Mantém status do chat
    }
  });
  
  // ========================================
  // WEBSOCKET DO CHAT
  // ========================================
  // Usa WebSocket de chat para mensagens + digitação (apenas quando está no chat)
  
  // Inicializa WebSocket do chat
  if (typeof ChatWebSocket !== 'undefined') {
    console.log('💬 ChatWebSocket disponível, conectando...');
    window.chatWS = new ChatWebSocket();
    window.chatWS.connect(chatId, userId, token);
    
    // Listener para novas mensagens via WebSocket
    window.addEventListener('chatNewMessage', (event) => {
      const { message } = event.detail;
      console.log('Nova mensagem recebida via WebSocket:', message);
      
      // Verifica se a mensagem é do chat atual
      if (message.chatId == chatId) {
        // Se não for mensagem própria, adiciona na tela
        if (message.senderId != userId) {
          // Remove indicador de digitação quando mensagem chegar
          esconderIndicadorDigitacao();
          
          const tipo = 'outra-pessoa';
          
          // Verifica se precisa adicionar separador de data
          const dataMsg = new Date(message.createdAt || Date.now());
          const ultimaMensagem = mensagensContainer.lastElementChild;
          
          if (ultimaMensagem && !ultimaMensagem.classList.contains('separador-data')) {
            const ultimaData = ultimaMensagem.dataset.date;
            if (ultimaData !== dataMsg.toDateString()) {
              adicionarSeparadorData(dataMsg);
            }
          }
          
          adicionarMensagem(message.messageContent, tipo, message.createdAt);
        }
      }
    });
    
    // Listener para indicador de digitação
    let typingTimeout;
    
    window.addEventListener('chatUserTyping', (event) => {
      const { userId: typingUserId, isTyping } = event.detail;
      console.log(`⌨️ Evento chatUserTyping recebido:`, event.detail);
      
      if (isTyping) {
        // Atualiza o status no header
        contactStatus.textContent = 'Digitando...';
        contactStatus.classList.add('typing');
        contactStatus.classList.remove('online', 'offline', 'in-chat');
        
        // Mostra indicador visual embaixo das mensagens (só cria se não existir)
        mostrarIndicadorDigitacao();
        
        // Limpa timeout anterior para resetar contagem
        clearTimeout(typingTimeout);
        
      } else {
        // Quando receber isTyping: false, não remove imediatamente
        // Aguarda 10 segundos antes de remover
        clearTimeout(typingTimeout);
      }
      
      // Sempre configura timeout de 10 segundos (tanto para true quanto false)
      // Se não receber novo evento em 10s, remove o indicador
      typingTimeout = setTimeout(() => {
        console.log('⏱️ Timeout de 10 segundos atingido, removendo indicador');
        esconderIndicadorDigitacao();
        const isOnline = window.presenceManager && window.presenceManager.isUserOnline(contactUserId);
        updateContactStatus(isOnline, isContactInChat);
      },1500);
    });
    
    // Listener para status do usuário no chat (in chat / not in chat)
    window.addEventListener('chatUserStatus', (event) => {
      const { userId: statusUserId, isInChat } = event.detail;
      console.log(`💬 Evento chatUserStatus recebido:`, event.detail);
      
      // Verifica se é o contato que estamos conversando
      if (contactUserId && statusUserId == contactUserId) {
        isContactInChat = isInChat;
        const isOnline = window.presenceManager && window.presenceManager.isUserOnline(contactUserId);
        console.log(`${isInChat ? '💬' : '👁️'} ${contactName} ${isInChat ? 'ENTROU' : 'SAIU'} do chat`);
        updateContactStatus(isOnline, isInChat);
      }
    });
    
    // Desconecta WebSocket ao sair da página
    window.addEventListener('beforeunload', () => {
      console.log('Saindo da página, desconectando WebSocket...');
      if (window.chatWS) {
        window.chatWS.disconnect();
      }
    });
  } else {
    console.warn('ChatWebSocket não está disponível');
  }
  
  // Adiciona listener para enviar status de digitação
  let typingTimeout;
  entrada.addEventListener('input', () => {
    if (window.chatWS && window.chatWS.isConnected()) {
      // Envia status "digitando"
      window.chatWS.sendTypingStatus(true);
      
      // Cancela timeout anterior
      clearTimeout(typingTimeout);
      
      // Após 1 segundo sem digitar, envia status "parou de digitar"
      typingTimeout = setTimeout(() => {
        window.chatWS.sendTypingStatus(false);
      }, 1000);
    }
  });
});
