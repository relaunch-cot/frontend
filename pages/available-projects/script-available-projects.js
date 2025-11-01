// script-available-projects.js

const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/login';
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

// Remove Bearer se presente antes de decodificar
const decodedToken = parseJwt(token.replace('Bearer ', ''));
const userId = decodedToken?.userId;
const userType = decodedToken?.userType;

if (!userId) {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

// Validação: apenas freelancers podem acessar esta página
function verificarTipoUsuario() {
  if (userType !== 'freelancer') {
    showError('Acesso negado. Esta página é exclusiva para freelancers.');
    setTimeout(() => {
      window.location.href = '/projects-gallery';
    }, 2000);
    return false;
  }
  return true;
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

  const imagemProjeto = project.urlImageProject && project.urlImageProject.trim() !== ''
    ? project.urlImageProject
    : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23e0e0e0' width='200' height='200'/%3E%3Cpath fill='%2346B1D5' d='M60 40h60l20 20v90c0 5.5-4.5 10-10 10H60c-5.5 0-10-4.5-10-10V50c0-5.5 4.5-10 10-10z'/%3E%3Cpath fill='%233a9dbf' d='M120 40v20h20z'/%3E%3Crect fill='white' x='70' y='80' width='60' height='6' rx='3'/%3E%3Crect fill='white' x='70' y='95' width='60' height='6' rx='3'/%3E%3Crect fill='white' x='70' y='110' width='40' height='6' rx='3'/%3E%3Ccircle fill='%2346B1D5' cx='100' cy='135' r='15'/%3E%3Cpath fill='white' d='M95 135l4 4 6-8' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

  card.innerHTML = `
    <div class="project-card-header">
      <h3 title="${project.name || 'Sem título'}">${project.name || 'Sem título'}</h3>
      <span class="project-status">${statusNormalizado}</span>
    </div>
    <div class="project-card-body">
      <div class="project-image-container">
        <img src="${imagemProjeto}" alt="${project.name || 'Projeto'}" class="project-image">
      </div>
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
      window.location.href = `/projeto?id=${project.projectId}`;
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
        'Authorization': token,
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
 * Request to join a project - Envia notificação para o dono do projeto
 */
async function solicitarParticipacao(projectId, projectName) {
  const token = localStorage.getItem('token');
  if (!token) {
    showError('Você precisa estar autenticado para solicitar participação.');
    return;
  }

  try {
    // Busca os dados do projeto para pegar o clientId
    const projectResponse = await fetch(`${BASE_URL}/v1/project/${projectId}`, {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });

    if (!projectResponse.ok) {
      throw new Error('Erro ao buscar dados do projeto');
    }

    const projectData = await projectResponse.json();
    const clientId = projectData.project.clientId;

    // Decodifica o token para pegar o userId do freelancer (remove Bearer se presente)
    const tokenWithoutBearer = token.replace('Bearer ', '');
    const payload = JSON.parse(atob(tokenWithoutBearer.split('.')[1]));
    const freelancerId = payload.userId;

    // Envia a notificação para o cliente
    const notificationData = {
      receiverId: clientId,
      title: 'Nova Solicitação de Projeto',
      content: `Um freelancer solicitou participação no projeto "${projectName}". ID do Projeto: ${projectId}`,
      type: 'PROJECT_REQUEST'
    };

    const notificationResponse = await fetch(`${BASE_URL}/v1/notification/${freelancerId}`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationData)
    });

    if (!notificationResponse.ok) {
      throw new Error('Erro ao enviar notificação');
    }

    showSuccess(`Solicitação enviada para o projeto "${projectName}"!`);

  } catch (error) {
    console.error('Erro ao solicitar participação:', error);
    showError('Não foi possível enviar a solicitação. Tente novamente.');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Primeiro verifica se o usuário é freelancer
  const isFreelancer = verificarTipoUsuario();
  
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
