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
    
    const avatarImg = document.getElementById('userAvatar');
    if (avatarImg) {
        avatarImg.src = userData.urlImagePerfil || '/src/images/default-avatar.png';
        avatarImg.alt = userData.name || 'User';
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
