// script-available-projects.js

const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '../login/login.html';
}

// Parse JWT token to get user info
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
  localStorage.removeItem('token');
  window.location.href = '../login/login.html';
}

// Validação: apenas freelancers podem acessar esta página
async function verificarTipoUsuario() {
  try {
    const response = await fetch(`${BASE_URL}/v1/user/userType/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao verificar tipo de usuário');
    }

    const data = await response.json();
    const userType = data.type || data.userType;

    if (userType !== 'freelancer') {
      showError('Acesso negado. Esta página é exclusiva para freelancers.');
      setTimeout(() => {
        window.location.href = '../projects-gallery/projects-gallery.html';
      }, 2000);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Erro ao verificar tipo de usuário:', error);
    showError('Erro ao verificar permissões de acesso.');
    setTimeout(() => {
      window.location.href = '../projects-gallery/projects-gallery.html';
    }, 2000);
    return false;
  }
}

// Global variables
let allProjects = [];
let filteredProjects = [];

// Category mapping
const categorias = {
  'web': 'Desenvolvimento Web',
  'mobile': 'Desenvolvimento Mobile',
  'design': 'Design Gráfico',
  'marketing': 'Marketing Digital',
  'data': 'Análise de Dados',
  'content': 'Criação de Conteúdo',
  'front-end': 'Front-end'
};

/**
 * Format date to DD/MM/YYYY
 */
function formatarData(dateString) {
  if (!dateString) return 'Não informado';
  const date = new Date(dateString);
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Normalize status
 */
function normalizarStatus(status) {
  if (!status) return 'pendente';
  const statusLower = status.toLowerCase().trim();
  return statusLower === 'pendente' || statusLower === 'concluido' ? statusLower : 'pendente';
}

/**
 * Create project card HTML
 */
function criarCardProjeto(project) {
  const card = document.createElement('div');
  card.className = 'project-card';
  card.dataset.projectId = project.projectId;

  const statusNormalizado = normalizarStatus(project.status);
  const categoriaNome = categorias[project.category] || project.category || 'Sem categoria';
  const valor = project.amount ? `R$ ${project.amount.toFixed(2)}` : 'Valor não informado';
  const prazo = formatarData(project.projectDeliveryDeadline);
  const clienteNome = project.clientName || 'Cliente não informado';

  card.innerHTML = `
    <div class="project-card-header">
      <h3 title="${project.name || 'Sem título'}">${project.name || 'Sem título'}</h3>
      <span class="project-status">${statusNormalizado}</span>
    </div>
    <div class="project-card-body">
      <p class="project-description">${project.description || 'Sem descrição disponível'}</p>
      
      <div class="project-category">${categoriaNome}</div>
      
      <div class="project-info">
        <div class="project-info-item">
          <span class="project-info-label">Cliente</span>
          <span class="project-info-value">${clienteNome}</span>
        </div>
        <div class="project-info-item">
          <span class="project-info-label">Prazo</span>
          <span class="project-info-value">${prazo}</span>
        </div>
        <div class="project-info-item">
          <span class="project-info-label">Valor</span>
          <span class="project-info-value project-amount">${valor}</span>
        </div>
      </div>
    </div>
    <div class="project-card-footer">
      <button class="request-btn" data-project-id="${project.projectId}">
        ${project.freelancerId ? 'Ver Detalhes' : 'Solicitar Participação'}
      </button>
    </div>
  `;

  // Add event listener to button
  const btn = card.querySelector('.request-btn');
  btn.addEventListener('click', () => {
    if (project.freelancerId) {
      // Se já tem freelancer, redireciona para a página de detalhes
      window.location.href = `../project/project.html?id=${project.projectId}`;
    } else {
      // Se não tem freelancer, inicia o processo de solicitação
      solicitarParticipacao(project.projectId, project.name);
    }
  });

  return card;
}

/**
 * Render projects on the page
 */
function renderizarProjetos(projects) {
  const container = document.getElementById('projectsContainer');
  const emptyMsg = document.getElementById('emptyMsg');
  const loadingMsg = document.getElementById('loadingMsg');

  loadingMsg.style.display = 'none';
  container.innerHTML = '';

  if (!projects || projects.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';
  projects.forEach(project => {
    const card = criarCardProjeto(project);
    container.appendChild(card);
  });
}

/**
 * Fetch all projects from API
 */
async function buscarProjetos() {
  const loadingMsg = document.getElementById('loadingMsg');
  const emptyMsg = document.getElementById('emptyMsg');

  loadingMsg.style.display = 'block';
  emptyMsg.style.display = 'none';

  try {
    const response = await fetch(`${BASE_URL}/v1/project`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar projetos');
    }

    const data = await response.json();
    allProjects = data.projects || [];
    filteredProjects = [...allProjects];

    renderizarProjetos(filteredProjects);

  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    loadingMsg.style.display = 'none';
    showError('Não foi possível carregar os projetos. Tente novamente mais tarde.');
  }
}

/**
 * Apply filters
 */
function aplicarFiltros() {
  const categoryFilter = document.getElementById('categoryFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;
  const searchInput = document.getElementById('searchInput').value.toLowerCase();

  filteredProjects = allProjects.filter(project => {
    const matchCategory = !categoryFilter || project.category === categoryFilter;
    const matchStatus = !statusFilter || 
                        project.status.toLowerCase() === statusFilter.toLowerCase();
    const matchSearch = !searchInput || 
                        project.name.toLowerCase().includes(searchInput) ||
                        (project.description && project.description.toLowerCase().includes(searchInput));

    return matchCategory && matchStatus && matchSearch;
  });

  renderizarProjetos(filteredProjects);
}

/**
 * Request to join a project
 * NOTA: Esta é uma implementação temporária que apenas mostra uma notificação.
 * Quando o sistema de notificações for implementado, esta função será atualizada.
 */
function solicitarParticipacao(projectId, projectName) {
  // Por enquanto, apenas redireciona para a página do projeto com o freelancerId
  // O sistema de notificações real será implementado posteriormente
  
  showSuccess(`Solicitação para o projeto "${projectName}" será implementada com o sistema de notificações.`);
  
  // TEMPORÁRIO: Redireciona para a página do projeto com o freelancerId do usuário logado
  // para que o botão de aceitar apareça (para fins de teste)
  // window.location.href = `../project/project.html?id=${projectId}&freelancerId=${userId}`;
  
  console.log('Solicitação de participação:', {
    projectId,
    freelancerId: userId,
    projectName
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
  // Primeiro verifica se o usuário é freelancer
  const isFreelancer = await verificarTipoUsuario();
  
  if (!isFreelancer) {
    return; // Não carrega os projetos se não for freelancer
  }

  // Load projects
  buscarProjetos();

  // Filter event listeners
  document.getElementById('categoryFilter').addEventListener('change', aplicarFiltros);
  document.getElementById('statusFilter').addEventListener('change', aplicarFiltros);
  document.getElementById('searchInput').addEventListener('input', aplicarFiltros);
});
