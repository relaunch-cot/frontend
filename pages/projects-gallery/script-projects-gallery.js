const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;

const modal = document.getElementById('modal');
const btn = document.getElementById('openModal');
const close = document.querySelector('.close');
const main = document.querySelector('main');
const form = document.getElementById('createProjectForm');
const cancelBtn = document.getElementById('cancelBtn');

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

  card.innerHTML = `
    <div class="title">
      <h1>${project.name}</h1>
      <h3>${formatProjectDate(project.createdAt)}</h3>
    </div>

    <div id="content">
      <div>${project.description}</div>
      <div id="projeto-logo">
        <img src="../../src/images/ReLaunch Logo.png" alt="">
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
      data.projects.forEach(renderProjectCard);
    } else {
      const message = document.createElement('p');
      message.textContent = 'Nenhum projeto encontrado.';
      message.style.textAlign = 'center';
      message.style.marginTop = '2rem';
      message.style.fontSize = '1.1rem';
      main.appendChild(message);
    }
  } catch (err) {
    console.error(err);
    const errorMsg = document.createElement('p');
    errorMsg.textContent = 'Erro ao carregar projetos.';
    errorMsg.style.textAlign = 'center';
    errorMsg.style.marginTop = '2rem';
    main.appendChild(errorMsg);
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

    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);

    window.location.reload();
  } catch (err) {
    console.error(err);
    alert('Erro ao criar projeto.');
  }
});

// ==========================
// Inicializar
// ==========================
document.addEventListener('DOMContentLoaded', async () => {
  userType = await getUserType();
  await fetchProjects();
});
