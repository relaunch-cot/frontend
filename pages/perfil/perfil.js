const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;

const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/login';
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
const currentUserId = decodedToken?.userId;

if (!currentUserId) {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

const urlParams = new URLSearchParams(window.location.search);
const userIdFromUrl = urlParams.get('userId');
const userId = userIdFromUrl || currentUserId;
const isOwnProfile = userId === currentUserId;

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

    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    
    if (data.user) {
      userNameElement.textContent = data.user.name || 'Nome não disponível';
      userEmailElement.textContent = data.user.email || 'Email não disponível';
      
      if (data.user.settings) {
        const biografiaElement = document.getElementById('userBiografia');
        const tagsElement = document.getElementById('userTags');
        
        if (data.user.settings.biography) {
          biografiaElement.textContent = data.user.settings.biography;
        } else {
          biografiaElement.textContent = 'Adicione uma biografia';
        }
        
        if (data.user.settings.skills && Array.isArray(data.user.settings.skills) && data.user.settings.skills.length > 0) {
          tagsElement.innerHTML = data.user.settings.skills.map(skill => 
            `<span class="tag">${skill}</span>`
          ).join('');
        } else {
          tagsElement.innerHTML = '<span class="tag">Adicione suas competências</span>';
        }
      }
    } else {
      userNameElement.textContent = 'Erro ao carregar dados';
      userEmailElement.textContent = 'Email não disponível';
    }

  } catch (error) {
    showError('Erro ao carregar dados do perfil. Tente novamente.');
    
    document.getElementById('userName').textContent = 'Erro ao carregar perfil';
    document.getElementById('userEmail').textContent = 'Email não disponível';
  } finally {
    const editProfileSection = document.getElementById('edit-profile-section');
    if (editProfileSection && !isOwnProfile) {
      editProfileSection.style.display = 'none';
    }
  }
}

document.addEventListener('DOMContentLoaded', carregarPerfil);
