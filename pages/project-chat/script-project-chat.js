const API_BASE = 'http://localhost:8080/v1/chat';

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
entrada.addEventListener('keydown', async function (evento) {
  if (evento.key === 'Enter' && !evento.shiftKey) {
    evento.preventDefault();
    const texto = entrada.value.trim();
    if (texto) {
      adicionarMensagem(texto, 'usuario');
      entrada.value = '';
      ajustarAltura();
      await enviarMensagemParaBackend(texto);
    }
  }
});

// ====================== ADICIONAR MENSAGEM NO DOM ======================
function adicionarMensagem(texto, tipo) {
  const novaMensagem = document.createElement('div');
  novaMensagem.className = `mensagem ${tipo}`;
  novaMensagem.textContent = texto;
  mensagensContainer.appendChild(novaMensagem);
  mensagensContainer.scrollTop = mensagensContainer.scrollHeight;
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
      data.messages.forEach(msg => {
        const tipo = msg.senderId == userId ? 'usuario' : 'outra-pessoa';
        adicionarMensagem(msg.messageContent, tipo);
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
      chatId: parseInt(chatId),
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
