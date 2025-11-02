function toggleMenu() {
  const menu = document.getElementById('hamburger-menu');
  updateMenuContent();
  updateAuthButton();
  menu.classList.toggle('show');
}

function updateAuthButton() {
  const authButton = document.getElementById('authButton');
  if (!authButton) return;
  
  const token = localStorage.getItem('token');
  
  if (token) {
    authButton.style.display = 'none';
  } else {
    authButton.style.display = 'block';
    authButton.textContent = 'Login';
    authButton.className = 'auth-btn login';
    authButton.onclick = () => window.location.href = '/login';
  }
}

function updateMenuContent() {
  const menu = document.getElementById('hamburger-menu');
  const token = localStorage.getItem('token');
  
  if (token) {
    let userId = null;
    let userType = null;
    try {
      const base64Url = token.replace('Bearer ', '').split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      userId = decoded.userId;
      userType = decoded.userType;
    } catch (e) {
    }

    renderMenu(userType);
  } else {
    menu.innerHTML = `
      <a href="/home" class="home-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg> Início</a>
      <a href="/cadastro"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/></svg> Cadastro</a>
      <a href="/login"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10,17V14H3V10H10V7L15,12L10,17M10,2H19A2,2 0 0,1 21,4V20A2,2 0 0,1 19,22H10A2,2 0 0,1 8,20V18H10V20H19V4H10V6H8V4A2,2 0 0,1 10,2Z"/></svg> Login</a>
    `;
  }
}

function renderMenu(userType) {
  const menu = document.getElementById('hamburger-menu');
  
  const projetosDisponiveisLink = userType === 'freelancer' 
    ? `<a href="/available-projects"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z"/></svg> Projetos Disponíveis</a>`
    : '';

  menu.innerHTML = `
    <a href="/home" class="home-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg> Início</a>
    <a href="/projects-gallery"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg> Projetos</a>
    ${projetosDisponiveisLink}
    <a href="/posts"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19,5V19H5V5H19M21,3H3V21H21V3M17,17H7V16H17V17M17,15H7V14H17V15M17,12H7V7H17V12Z"/></svg> Posts</a>
    <a href="/chats"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12,3C6.5,3 2,6.6 2,11C2,13.2 3.2,15.2 5,16.5V21L9.5,18.5C10.3,18.7 11.1,18.8 12,18.8C17.5,18.8 22,15.2 22,10.7C22,6.1 17.5,2.5 12,2.5V3Z"/></svg> Chats</a>
    <a href="/perfil"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg> Perfil</a>
    <a href="#" class="logout-btn" onclick="showLogoutModal()"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/></svg> Sair</a>
  `;
}

function showLogoutModal() {
    if (!document.getElementById('logout-modal')) {
    const modalHamburger = document.createElement('div');
    modalHamburger.id = 'logout-modal';
    modalHamburger.className = 'logout-modal';
    modalHamburger.innerHTML = `
      <div class="logout-modal-content">
        <h3>Confirmar Saída</h3>
        <p>Tem certeza que deseja sair da sua conta?</p>
        <div class="logout-modal-buttons">
          <button class="logout-confirm" onclick="confirmLogout()">Sair</button>
          <button class="logout-cancel" onclick="closeLogoutModal()">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalHamburger);
  }
  
  document.getElementById('logout-modal').style.display = 'flex';
  document.getElementById('hamburger-menu').classList.remove('show');
}

function closeLogoutModal() {
  document.getElementById('logout-modal').style.display = 'none';
}

function confirmLogout() {
  localStorage.removeItem('token');
  closeLogoutModal();
  showSuccess('Logout realizado com sucesso!');
  setTimeout(() => {
    updateAuthButton();
    window.location.href = '/home';
  }, 1500);
}

document.addEventListener('DOMContentLoaded', updateAuthButton);

document.addEventListener('click', function(event) {
  const menu = document.getElementById('hamburger-menu');
  const menuIcon = document.getElementById('menu');
  const modalHamburger = document.getElementById('logout-modal');
  
  if (menu && menuIcon && !menu.contains(event.target) && !menuIcon.contains(event.target)) {
    menu.classList.remove('show');
  }
  
  if (modalHamburger && event.target === modalHamburger) {
    closeLogoutModal();
  }
});
