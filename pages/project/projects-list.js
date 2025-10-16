const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;
const projectsGrid = document.getElementById('projectsGrid');
const emptyMsg = document.getElementById('emptyMsg');

const token = localStorage.getItem('token');
if (!token) {
  showError('Você precisa estar logado para ver seus projetos.');
  setTimeout(() => window.location.href = '../login/login.html', 2000);
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
    console.error('Erro ao decodificar token JWT:', e);
    return null;
  }
}

const decodedToken = parseJwt(token.replace('Bearer ', ''));
const userId = decodedToken?.userId;

// Dados mockados para demonstração
const mockProjects = [
  {
    id: 1,
    title: "Sistema de E-commerce",
    description: "Desenvolvimento completo de plataforma de vendas online com painel administrativo, carrinho de compras e integração com pagamentos.",
    client: "TechStore Ltda",
    deadline: "2025-02-15",
    value: 5500.00,
    categories: ["Web", "Full-Stack", "E-commerce"],
    status: "active",
    progress: "Em desenvolvimento"
  },
  {
    id: 2,
    title: "App Mobile Delivery",
    description: "Aplicativo mobile para delivery de comida com geolocalização, pagamentos online e sistema de avaliações.",
    client: "FoodExpress",
    deadline: "2025-03-01",
    value: 8200.00,
    categories: ["Mobile", "React Native", "API"],
    status: "pending",
    progress: "Aguardando aprovação"
  },
  {
    id: 3,
    title: "Dashboard Analytics",
    description: "Painel de controle com gráficos e relatórios para análise de dados de vendas e performance empresarial.",
    client: "DataCorp",
    deadline: "2025-01-30",
    value: 3200.00,
    categories: ["Web", "Front-End", "Dashboard"],
    status: "completed",
    progress: "Concluído"
  },
  {
    id: 4,
    title: "API REST Microserviços",
    description: "Desenvolvimento de API robusta com arquitetura de microserviços para sistema de gestão empresarial.",
    client: "Enterprise Solutions",
    deadline: "2025-04-10",
    value: 12000.00,
    categories: ["Back-End", "API", "Microserviços"],
    status: "active",
    progress: "Fase de testes"
  }
];

function formatarData(dateString) {
  const data = new Date(dateString);
  return data.toLocaleDateString('pt-BR');
}

function formatarValor(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

function getStatusClass(status) {
  switch(status) {
    case 'active': return 'status-active';
    case 'pending': return 'status-pending';
    case 'completed': return 'status-completed';
    default: return 'status-pending';
  }
}

function getStatusText(status) {
  switch(status) {
    case 'active': return 'Ativo';
    case 'pending': return 'Pendente';
    case 'completed': return 'Concluído';
    default: return 'Pendente';
  }
}

function carregarProjetos() {
  try {
    // Simulando carregamento de projetos
    // Quando a API estiver pronta, substituir por:
    // const res = await fetch(`${BASE_URL}/v1/projects/${userId}`, {
    //   headers: { 'Authorization': token }
    // });

    if (mockProjects.length === 0) {
      emptyMsg.style.display = 'block';
      return;
    }

    projectsGrid.innerHTML = '';
    emptyMsg.style.display = 'none';

    mockProjects.forEach(project => {
      const projectCard = document.createElement('a');
      projectCard.href = `project.html?projectId=${project.id}`;
      projectCard.className = 'project-card';
      
      projectCard.innerHTML = `
        <div class="project-header">
          <div class="project-avatar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
          </div>
          <div>
            <div class="project-title">${project.title}</div>
            <div class="project-client">${project.client}</div>
          </div>
        </div>
        
        <div class="project-description">${project.description}</div>
        
        <div class="project-meta">
          <div class="project-deadline">Prazo: ${formatarData(project.deadline)}</div>
          <div class="project-value">${formatarValor(project.value)}</div>
        </div>
        
        <div class="project-categories">
          ${project.categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')}
        </div>
        
        <div class="project-status">
          <span class="status-badge ${getStatusClass(project.status)}">${getStatusText(project.status)}</span>
          <span class="project-progress">${project.progress}</span>
        </div>
      `;
      
      projectsGrid.appendChild(projectCard);
    });

  } catch (err) {
    showError('Erro ao carregar projetos. Tente novamente.');
    emptyMsg.style.display = 'block';
  }
}

// Função de pesquisa
document.querySelector('#pesquisa input').addEventListener('input', function(e) {
  const searchTerm = e.target.value.toLowerCase();
  const projectCards = document.querySelectorAll('.project-card');
  
  projectCards.forEach(card => {
    const title = card.querySelector('.project-title').textContent.toLowerCase();
    const client = card.querySelector('.project-client').textContent.toLowerCase();
    const description = card.querySelector('.project-description').textContent.toLowerCase();
    
    if (title.includes(searchTerm) || client.includes(searchTerm) || description.includes(searchTerm)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
});

carregarProjetos();