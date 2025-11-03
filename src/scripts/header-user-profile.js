// header-user-profile.js - Gerencia exibição do perfil do usuário no header

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Erro ao fazer parse do JWT:', e);
        return null;
    }
}

// Atualiza o header com dados do usuário (sem fazer requisição)
function updateHeaderProfile(userData) {
    console.log('Atualizando header com dados fornecidos:', userData);
    
    const userProfileDiv = document.getElementById('userProfile');
    if (!userProfileDiv) {
        console.log('Elemento userProfile não encontrado no DOM');
        return;
    }
    
    // Atualiza avatar
    const avatarImg = document.getElementById('userAvatar');
    if (avatarImg) {
        avatarImg.src = userData.urlImagePerfil || '/src/images/default-avatar.png';
        avatarImg.alt = userData.name || 'User';
        console.log('Avatar atualizado:', avatarImg.src);
    }
    
    // Atualiza nome
    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = userData.name || 'Usuário';
        console.log('Nome atualizado:', userName.textContent);
    }
    
    // Mostra o perfil
    userProfileDiv.style.display = 'flex';
    console.log('Perfil exibido com sucesso!');
    
    // Adiciona click para ir ao perfil
    userProfileDiv.onclick = () => {
        window.location.href = '/perfil';
    };
}

// Carrega o perfil do usuário fazendo requisição à API
async function loadUserProfile() {
    console.log('Iniciando carregamento do perfil do usuário...');
    
    const token = localStorage.getItem('token');
    const userProfileDiv = document.getElementById('userProfile');
    
    console.log('Token:', token ? 'Encontrado' : 'Não encontrado');
    console.log('userProfileDiv:', userProfileDiv ? 'Encontrado' : 'Não encontrado');
    
    if (!token) {
        console.log('Usuário não está logado');
        return null;
    }
    
    if (!userProfileDiv) {
        console.log('Elemento userProfile não encontrado no DOM');
        return null;
    }
    
    try {
        const userData = parseJwt(token);
        console.log('userData:', userData);
        
        if (userData && userData.userId) {
            // Usa o ENV_CONFIG.URL_BACKEND ou fallback
            const apiUrl = window.ENV_CONFIG?.URL_BACKEND || 'http://localhost:8080';
            const url = `${apiUrl}/v1/user/${userData.userId}`;
            
            console.log('Buscando usuário em:', url);
            
            // Busca dados completos do usuário
            const response = await fetch(url, {
                headers: {
                    'Authorization': token
                }
            });
            
            console.log('Response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Dados do usuário:', data);
                
                const user = data.user;
                updateHeaderProfile(user);
                
                return user;
            } else {
                console.error('Erro ao buscar usuário:', response.status, response.statusText);
                return null;
            }
        } else {
            console.log('userData.userId não encontrado');
            return null;
        }
    } catch (error) {
        console.error('Erro ao carregar perfil do usuário:', error);
        return null;
    }
}

// Expõe as funções globalmente para uso em outras páginas
window.updateHeaderProfile = updateHeaderProfile;
window.loadUserProfile = loadUserProfile;

// Aguarda o env.js carregar
function initProfile() {
    // Aguarda um pouco para garantir que ENV_CONFIG está definido
    setTimeout(() => {
        console.log('ENV_CONFIG disponível:', window.ENV_CONFIG);
        loadUserProfile();
    }, 100);
}

// Carrega o perfil quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfile);
} else {
    initProfile();
}

// Recarrega quando o token mudar (login/logout)
window.addEventListener('storage', (e) => {
    if (e.key === 'authToken') {
        loadUserProfile();
    }
});
