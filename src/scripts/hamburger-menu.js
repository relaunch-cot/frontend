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
      <a href="../../pages/home/index.html" class="home-btn">🏠 Início</a>
      <a href="../../pages/project/project.html">📋 Projetos</a>
      <a href="../../pages/project-chat/project-chats.html">💬 Chats</a>
      <a href="../../pages/perfil/perfil.html">👤 Perfil</a>
      <a href="#" class="logout-btn" onclick="showLogoutModal()">🚪 Sair</a>
    `;
  } else {
    // Usuário não logado
    menu.innerHTML = `
      <a href="../../pages/home/index.html" class="home-btn">🏠 Início</a>
      <a href="../../pages/project/project.html">📋 Projetos</a>
      <a href="../../pages/project-chat/project-chats.html">💬 Chats</a>
      <a href="../../pages/perfil/perfil.html">👤 Perfil</a>
      <a href="../../pages/cadastro/cadastro.html">📝 Cadastro</a>
      <a href="../../pages/login/login.html">🔑 Login</a>
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