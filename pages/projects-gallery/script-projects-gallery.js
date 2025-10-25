const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;

const modal = document.getElementById('modal');
const btn = document.getElementById('openModal');
const close = document.querySelector('.close');
const main = document.querySelector('main');
const form = document.getElementById('createProjectForm');
const cancelBtn = document.getElementById('cancelBtn');
const emptyMsg = document.getElementById('emptyMsg');

const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '../login/login.html';
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

if (!userId) {
  localStorage.removeItem('token');
  window.location.href = '../login/login.html';
}

let userType = null;

// ==========================
// Modal
// ==========================
function openModal() {
  modal.style.display = 'block';
  setTimeout(() => modal.classList.add('show'), 10);
}

function closeModal() {
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
    form.reset();
    // Remove classes ao fechar
    const fileInput = document.getElementById('logo');
    const dateInput = document.getElementById('projectDeliveryDeadline');
    if (fileInput) fileInput.classList.remove('has-file');
    if (dateInput) dateInput.classList.remove('has-value');
  }, 300);
}

btn.onclick = openModal;
close.onclick = closeModal;
cancelBtn.onclick = closeModal;

window.onclick = (e) => {
  if (e.target === modal) {
    closeModal();
  }
};

// ==========================
// File Input Handler
// ==========================
const fileInput = document.getElementById('logo');
if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      e.target.classList.add('has-file');
    } else {
      e.target.classList.remove('has-file');
    }
  });
}

// ==========================
// Date Input Handler
// ==========================
const dateInput = document.getElementById('projectDeliveryDeadline');
if (dateInput) {
  // Adiciona classe quando tem valor
  dateInput.addEventListener('change', (e) => {
    if (e.target.value) {
      e.target.classList.add('has-value');
    } else {
      e.target.classList.remove('has-value');
    }
  });
  
  // Remove classe ao resetar
  dateInput.addEventListener('input', (e) => {
    if (!e.target.value) {
      e.target.classList.remove('has-value');
    }
  });
}

// ==========================
// Tipo de usuário
// ==========================

async function getUserType() {
  try {
    const response = await fetch(`${BASE_URL}/v1/user/userType/${userId}`, {
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
    console.log('tipo de usuario:', data);

    return data.userType;
  } catch (error) {
    console.error('Erro ao obter tipo de usuário:', error);
    return null;
  }
}

// ==========================
// Renderizar um projeto
// ==========================
function formatProjectDate(createdAt) {
    const date = new Date(createdAt); 
    const now = new Date();

    const hours = String(date.getUTCHours()).padStart(2,'0');
    const minutes = String(date.getUTCMinutes()).padStart(2,'0');
    const timeStr = `${hours}:${minutes}`;

    const dateYear = date.getUTCFullYear();
    const dateMonth = date.getUTCMonth();
    const dateDay = date.getUTCDate();

    const nowYear = now.getUTCFullYear();
    const nowMonth = now.getUTCMonth();
    const nowDay = now.getUTCDate();

    if (dateYear === nowYear && dateMonth === nowMonth && dateDay === nowDay) {
        return `Hoje - ${timeStr}`;
    }

    const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    if (dateYear === yesterday.getUTCFullYear() && dateMonth === yesterday.getUTCMonth() && dateDay === yesterday.getUTCDate()) {
        return `Ontem - ${timeStr}`;
    }

    if (dateYear === nowYear) {
        const day = String(dateDay).padStart(2,'0');
        const month = String(dateMonth + 1).padStart(2,'0');
        return `${day}/${month} - ${timeStr}`;
    }

    const day = String(dateDay).padStart(2,'0');
    const month = String(dateMonth + 1).padStart(2,'0');
    return `${day}/${month}/${dateYear} - ${timeStr}`;
}


function renderProjectCard(project) {
  const card = document.createElement('div');
  card.className = 'Projeto';

  // Define a imagem do projeto (do banco ou placeholder)
  const imagemProjeto = project.urlImageProject && project.urlImageProject.trim() !== ''
    ? project.urlImageProject
    : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23e0e0e0' width='200' height='200'/%3E%3Cpath fill='%2346B1D5' d='M60 40h60l20 20v90c0 5.5-4.5 10-10 10H60c-5.5 0-10-4.5-10-10V50c0-5.5 4.5-10 10-10z'/%3E%3Cpath fill='%233a9dbf' d='M120 40v20h20z'/%3E%3Crect fill='white' x='70' y='80' width='60' height='6' rx='3'/%3E%3Crect fill='white' x='70' y='95' width='60' height='6' rx='3'/%3E%3Crect fill='white' x='70' y='110' width='40' height='6' rx='3'/%3E%3Ccircle fill='%2346B1D5' cx='100' cy='135' r='15'/%3E%3Cpath fill='white' d='M95 135l4 4 6-8' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

  card.innerHTML = `
    <div class="title">
      <h1>${project.name}</h1>
      <h3>${formatProjectDate(project.createdAt)}</h3>
    </div>

    <div id="content">
      <div>${project.description}</div>
      <div id="projeto-logo">
        <img src="${imagemProjeto}" alt="${project.name || 'Projeto'}">
      </div>
      <div id="project-open">
        <a href="../project/project.html?id=${project.projectId}" class="project-page">Abrir</a>
      </div>
    </div>
  `;

  main.appendChild(card);
}

// ==========================
// Buscar projetos do usuário
// ==========================
async function fetchProjects() {
  if (!userId) {
    console.warn("Usuário não autenticado");
    showError('Usuário não autenticado');
    emptyMsg.style.display = 'block';
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/v1/project/user/${userId}?userType=${userType}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });

    if (!res.ok) throw new Error(`Erro ao buscar projetos: ${res.status}`);

    const data = await res.json();

    if (Array.isArray(data.projects) && data.projects.length > 0) {
      emptyMsg.style.display = 'none';
      data.projects.forEach(renderProjectCard);
    } else {
      emptyMsg.style.display = 'block';
    }
  } catch (err) {
    console.error(err);
    showError('Erro ao carregar projetos.');
    emptyMsg.style.display = 'block';
  }
}

// ==========================
// Criar novo projeto
// ==========================
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById("name")?.value.trim() || '';
  const description = document.getElementById("description")?.value.trim() || '';
  const category = document.getElementById("category")?.value || '';
  const deadline = document.getElementById("projectDeliveryDeadline")?.value;
  const projectDeliveryDeadline = deadline ? new Date(deadline).toISOString() : null;
  const amountValue = parseFloat(document.getElementById("amount")?.value);
  const amount = isNaN(amountValue) ? 0 : amountValue;

  const body = {
    name,
    description,
    category,
    projectDeliveryDeadline,
    freelancerId: null,
    amount,
  };

  try {
    // Mostra loading no modal
    const submitBtn = form.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Criando...';
    submitBtn.disabled = true;

    const res = await fetch(`${BASE_URL}/v1/project/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Erro ao criar projeto: ${res.status}`);

    await res.json();

    // Fecha o modal
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);

    // Mostra mensagem de sucesso
    showSuccess('Projeto criado com sucesso!');
    
    // Recarrega após 1 segundo
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (err) {
    console.error(err);
    
    // Restaura o botão
    const submitBtn = form.querySelector('.btn-submit');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
    
    // Mostra erro
    showError('Erro ao criar projeto. Tente novamente.');
  }
});

// ==========================
// Inicializar
// ==========================
document.addEventListener('DOMContentLoaded', async () => {
  userType = await getUserType();
  await fetchProjects();
});
