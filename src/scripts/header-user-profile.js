function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

function updateHeaderProfile(userData) {
    
    const userProfileDiv = document.getElementById('userProfile');
    if (!userProfileDiv) {
        return;
    }
    
    // Atualiza o avatar usando o sistema de avatar reutilizável
    const avatarContainer = document.getElementById('userAvatar');
    if (avatarContainer && typeof window.updateAvatar === 'function') {
        window.updateAvatar(avatarContainer, userData.name || 'Usuário', userData.urlImagePerfil);
    } else if (avatarContainer) {
        // Fallback se avatar-utils.js não estiver carregado
        if (userData.urlImagePerfil && userData.urlImagePerfil.trim() !== '') {
            avatarContainer.innerHTML = `
                <img src="${userData.urlImagePerfil}" 
                     alt="${userData.name}" 
                     class="avatar-img avatar-small" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="avatar-letter avatar-small" style="display: none;">
                    ${(userData.name || 'U').charAt(0).toUpperCase()}
                </div>`;
        } else {
            avatarContainer.innerHTML = `
                <div class="avatar-letter avatar-small">
                    ${(userData.name || 'U').charAt(0).toUpperCase()}
                </div>`;
        }
    }
    
    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = userData.name || 'Usuário';
    }
    
    userProfileDiv.style.display = 'flex';
    
    userProfileDiv.onclick = () => {
        window.location.href = '/perfil';
    };
}

async function loadUserProfile() {
    const token = localStorage.getItem('token');
    const userProfileDiv = document.getElementById('userProfile');
    
    if (!token) {
        return null;
    }
    
    if (!userProfileDiv) {
        return null;
    }
    
    try {
        const userData = parseJwt(token);
        
        if (userData && userData.userId) {
            const apiUrl = window.ENV_CONFIG?.URL_BACKEND || 'http://localhost:8080';
            const url = `${apiUrl}/v1/user/${userData.userId}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': token
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                const user = data.user;
                updateHeaderProfile(user);
                
                return user;
            } else {
                return null;
            }
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}

window.updateHeaderProfile = updateHeaderProfile;
window.loadUserProfile = loadUserProfile;

function initProfile() {
    setTimeout(() => {
        loadUserProfile();
    }, 100);
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfile);
} else {
    initProfile();
}

window.addEventListener('storage', (e) => {
    if (e.key === 'authToken') {
        loadUserProfile();
    }
});
