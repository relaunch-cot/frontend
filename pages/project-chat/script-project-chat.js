const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;
const API_BASE = `${BASE_URL}/v1/chat`;

const token = localStorage.getItem('token');
if (!token) {
  showError('Você precisa estar logado para acessar o chat.');
  setTimeout(() => window.location.href = '../login/index.html', 2000);
}

// ====================== FUNÇÃO PARA PEGAR userId DO JWT ======================
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

// ====================== ELEMENTOS ======================
const entrada = document.getElementById('entradaMensagem');
const mensagensContainer = document.getElementById('mensagens');

// Recupera chatId e contactName da URL
const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get('chatId') || 1;
const contactName = urlParams.get('contactName') || 'Contato';

if (!chatId) {
  showError('Nenhum chat selecionado.');
  setTimeout(() => window.location.href = '../home/index.html', 2000);
}

// Atualiza o nome do contato no cabeçalho
document.getElementById('contactName').textContent = contactName;

// ====================== AJUSTAR ALTURA TEXTAREA ======================
entrada.addEventListener('input', ajustarAltura);
function ajustarAltura() {
  entrada.style.height = 'auto';
  entrada.style.height = entrada.scrollHeight + 'px';
}

// ====================== ENVIAR MENSAGEM ======================
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

// Botão de envio
document.getElementById('btnEnviar').addEventListener('click', enviarMensagem);

// ====================== ADICIONAR MENSAGEM NO DOM ======================
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
  } else {
    mensagemHora.textContent = new Date().toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  novaMensagem.appendChild(mensagemTexto);
  novaMensagem.appendChild(mensagemHora);
  mensagensContainer.appendChild(novaMensagem);
  
  // Verificar se a mensagem tem múltiplas linhas após renderização
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

// ====================== ADICIONAR SEPARADOR DE DATA ======================
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

// ====================== BUSCAR MENSAGENS DO CHAT ======================
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
        
        // Adicionar separador se for um dia diferente
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

// ====================== ENVIAR MENSAGEM PARA BACKEND ======================
async function enviarMensagemParaBackend(texto) {
  try {
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

    // Atualiza mensagens após enviar
    await carregarMensagens();

  } catch (err) {
    showError('Erro ao enviar mensagem. Tente novamente.');
  }
}



// ====================== INICIALIZAÇÃO ======================
document.addEventListener('DOMContentLoaded', carregarMensagens);
