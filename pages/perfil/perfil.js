const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;

const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '../login/login.html';
}

// Função para decodificar JWT
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

// Obter userId do token
const decodedToken = parseJwt(token.replace('Bearer ', ''));
const userId = decodedToken?.userId;

if (!userId) {
  localStorage.removeItem('token');
  window.location.href = '../login/login.html';
}

// Função para carregar dados do perfil
async function carregarPerfil() {
  try {
    const response = await fetch(`${BASE_URL}/v1/user/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Dados do perfil:', data);

    // Atualizar elementos da página
    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    
    if (data.user) {
      userNameElement.textContent = data.user.name || 'Nome não disponível';
      userEmailElement.textContent = data.user.email || 'Email não disponível';
    } else {
      userNameElement.textContent = 'Erro ao carregar dados';
      userEmailElement.textContent = 'Email não disponível';
    }

  } catch (error) {
    console.error('Erro ao carregar perfil:', error);
    showError('Erro ao carregar dados do perfil. Tente novamente.');
    
    // Fallback para dados padrão
    document.getElementById('userName').textContent = 'Erro ao carregar perfil';
    document.getElementById('userEmail').textContent = 'Email não disponível';
  }
}

// Carregar perfil quando a página carregar
document.addEventListener('DOMContentLoaded', carregarPerfil);