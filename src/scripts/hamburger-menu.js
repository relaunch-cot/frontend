function toggleMenu() {
  const menu = document.getElementById('hamburger-menu');
  updateMenuContent();
  menu.classList.toggle('show');
}

function updateMenuContent() {
  const menu = document.getElementById('hamburger-menu');
  const token = localStorage.getItem('token');
  
  if (token) {
    // Usuário logado
    menu.innerHTML = `
      <a href="../../pages/home/index.html" class="home-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg> Início</a>
      <a href="../../pages/project/project.html"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg> Projetos</a>
      <a href="../../pages/project-chat/project-chats.html"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12,3C6.5,3 2,6.6 2,11C2,13.2 3.2,15.2 5,16.5V21L9.5,18.5C10.3,18.7 11.1,18.8 12,18.8C17.5,18.8 22,15.2 22,10.7C22,6.1 17.5,2.5 12,2.5V3Z"/></svg> Chats</a>
      <a href="../../pages/perfil/perfil.html"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg> Perfil</a>
      <a href="#" class="logout-btn" onclick="showLogoutModal()"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/></svg> Sair</a>
    `;
  } else {
    // Usuário não logado
    menu.innerHTML = `
      <a href="../../pages/home/index.html" class="home-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg> Início</a>
      <a href="../../pages/project/project.html"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg> Projetos</a>
      <a href="../../pages/project-chat/project-chats.html"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12,3C6.5,3 2,6.6 2,11C2,13.2 3.2,15.2 5,16.5V21L9.5,18.5C10.3,18.7 11.1,18.8 12,18.8C17.5,18.8 22,15.2 22,10.7C22,6.1 17.5,2.5 12,2.5V3Z"/></svg> Chats</a>
      <a href="../../pages/perfil/perfil.html"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg> Perfil</a>
      <a href="../../pages/cadastro/cadastro.html"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/></svg> Cadastro</a>
      <a href="../../pages/login/login.html"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10,17V14H3V10H10V7L15,12L10,17M10,2H19A2,2 0 0,1 21,4V20A2,2 0 0,1 19,22H10A2,2 0 0,1 8,20V18H10V20H19V4H10V6H8V4A2,2 0 0,1 10,2Z"/></svg> Login</a>
    `;
  }
}

function showLogoutModal() {
  // Criar modal se não existir
  if (!document.getElementById('logout-modal')) {
    const modal = document.createElement('div');
    modal.id = 'logout-modal';
    modal.className = 'logout-modal';
    modal.innerHTML = `
      <div class="logout-modal-content">
        <h3>Confirmar Saída</h3>
        <p>Tem certeza que deseja sair da sua conta?</p>
        <div class="logout-modal-buttons">
          <button class="logout-confirm" onclick="confirmLogout()">Sair</button>
          <button class="logout-cancel" onclick="closeLogoutModal()">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
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
    window.location.href = '../../pages/home/index.html';
  }, 1500);
}

// Fechar menu ao clicar fora
document.addEventListener('click', function(event) {
  const menu = document.getElementById('hamburger-menu');
  const menuIcon = document.getElementById('menu');
  const modal = document.getElementById('logout-modal');
  
  if (menu && menuIcon && !menu.contains(event.target) && !menuIcon.contains(event.target)) {
    menu.classList.remove('show');
  }
  
  // Fechar modal ao clicar fora
  if (modal && event.target === modal) {
    closeLogoutModal();
  }
});