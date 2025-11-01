// script-project.js

const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");

  if (!projectId) {
    return;
  }

  // 2. Token do localStorage
  const token = localStorage.getItem("token");
  if (!token) {
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/v1/project/${projectId}`, {
      method: "GET",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return;
    }

    const backendResponse = await response.json();

    // 4. Preenche os dados na página
    preencherPaginaComProjeto(backendResponse.project);

  } catch (error) {
  }
});

/**
 * Valida e normaliza o status do projeto
 */
function validarStatus(status) {
  const statusValidos = ['pendente', 'concluido'];
  const statusNormalizado = status?.toLowerCase().trim();
  
  if (!statusNormalizado || !statusValidos.includes(statusNormalizado)) {
    return 'pendente';
  }
  
  return statusNormalizado;
}

/**
 * Preenche os elementos HTML com os dados do projeto.
 */
function preencherPaginaComProjeto(project) {
  // Armazena os dados do projeto para uso posterior (edição)
  projectData = project;
  
  // Imagem do projeto
  const profileImg = document.querySelector("#profile img");
  if (profileImg) {
    if (project.urlImageProject && project.urlImageProject.trim() !== '') {
      // Se tem imagem no banco, usa ela
      profileImg.src = project.urlImageProject;
      profileImg.alt = project.name || "Imagem do projeto";
      profileImg.style.objectFit = "cover";
    } else {
      // Se não tem imagem, usa ícone padrão de projeto (placeholder)
      profileImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23e0e0e0' width='200' height='200'/%3E%3Cpath fill='%2346B1D5' d='M60 40h60l20 20v90c0 5.5-4.5 10-10 10H60c-5.5 0-10-4.5-10-10V50c0-5.5 4.5-10 10-10z'/%3E%3Cpath fill='%233a9dbf' d='M120 40v20h20z'/%3E%3Crect fill='white' x='70' y='80' width='60' height='6' rx='3'/%3E%3Crect fill='white' x='70' y='95' width='60' height='6' rx='3'/%3E%3Crect fill='white' x='70' y='110' width='40' height='6' rx='3'/%3E%3Ccircle fill='%2346B1D5' cx='100' cy='135' r='15'/%3E%3Cpath fill='white' d='M95 135l4 4 6-8' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";
      profileImg.alt = "Projeto sem imagem";
      profileImg.style.objectFit = "contain";
    }
  }
  
  // Nome do projeto
  const nomeEl = document.querySelector("#desc h1");
  if (nomeEl) nomeEl.textContent = project.name || "Projeto sem nome";

  // Descrição
  const descEl = document.querySelector("#desc span");
  if (descEl) descEl.textContent = project.description || "Sem descrição";

  // Cliente (usando clientName do novo modelo)
  const clienteEl = document.getElementById("client");
  if (clienteEl) clienteEl.textContent = project.clientName || "Cliente não informado";

  // Prazo (usando createdAt e projectDeliveryDeadline)
  const prazoEl = document.getElementById("prazo");
  if (prazoEl && project.createdAt && project.projectDeliveryDeadline) {
    const createdAt = new Date(project.createdAt);
    const deadline = new Date(project.projectDeliveryDeadline);

    const formatData = (date) => {
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const ano = date.getFullYear();
      return `${dia}/${mes}/${ano}`;
    }

    prazoEl.textContent = `${formatData(createdAt)} - ${formatData(deadline)}`;
  }

  // Desenvolvedor (freelancerName - pode não existir ainda)
  const devEl = document.getElementById("freelancer");
  if (devEl) devEl.textContent = project.freelancerName || "Aguardando seleção";

  // Categoria (agora vem como string única, não array)
  const categoryContainer = document.getElementById("category");
  if (categoryContainer) {
    categoryContainer.innerHTML = "";
    if (project.category) {
      const article = document.createElement("article");
      // Tradução das categorias para português
      const categorias = {
        'web': 'Desenvolvimento Web',
        'mobile': 'Desenvolvimento Mobile',
        'design': 'Design Gráfico',
        'marketing': 'Marketing Digital',
        'data': 'Análise de Dados',
        'content': 'Criação de Conteúdo'
      };
      article.textContent = categorias[project.category] || project.category;
      categoryContainer.appendChild(article);
    } else {
      const article = document.createElement("article");
      article.textContent = "Sem categoria";
      categoryContainer.appendChild(article);
    }
  }

  // Status (NOVO CAMPO - com validação)
  const statusBadge = document.getElementById("status-badge");
  if (statusBadge) {
    const statusValido = validarStatus(project.status);
    statusBadge.textContent = statusValido;
    statusBadge.className = `status-badge ${statusValido}`;
  }

  // Valor
  const valorEl = document.getElementById("valor");
  if (valorEl) valorEl.textContent = `R$ ${project.amount?.toFixed(2) || "0.00"}`;

  // Tempo Restante
  const tempoEl = document.getElementById("tempo-restante");
  if (tempoEl && project.projectDeliveryDeadline) {
    const atualizarTempoRestante = () => {
      const deadline = new Date(project.projectDeliveryDeadline);
      const agora = new Date();
      let diffMs = deadline - agora;

      if (diffMs <= 0) {
        tempoEl.textContent = "Prazo expirado";
        tempoEl.classList.add("expired");
      } else {
        const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        diffMs %= (1000 * 60 * 60 * 24);
        const horas = Math.floor(diffMs / (1000 * 60 * 60));
        diffMs %= (1000 * 60 * 60);
        const minutos = Math.floor(diffMs / (1000 * 60));
        diffMs %= (1000 * 60);
        const segundos = Math.floor(diffMs / 1000);

        tempoEl.textContent = `${dias} Dias - ${horas} Horas - ${minutos} Minutos - ${segundos} Segundos`;
      }
    }

    atualizarTempoRestante(); // atualiza imediatamente
    setInterval(atualizarTempoRestante, 1000);
    }
}

function formatarData(date) {
  const dia = String(date.getDate()).padStart(2, "0");
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const ano = date.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Adiciona um freelancer ao projeto
 * @param {string} projectId - ID do projeto
 * @param {string} freelancerId - ID do freelancer a ser adicionado
 */
async function adicionarFreelancerAoProjeto(projectId, freelancerId) {
  const token = localStorage.getItem("token");
  
  if (!token) {
    showError("Você precisa estar autenticado para realizar esta ação.");
    return;
  }

  if (!freelancerId) {
    showError("ID do freelancer não foi fornecido.");
    return;
  }

  const addFreelancerBtn = document.getElementById("add-freelancer-btn");
  if (addFreelancerBtn) {
    addFreelancerBtn.disabled = true;
    addFreelancerBtn.textContent = "Processando...";
  }

  try {
    const response = await fetch(`${BASE_URL}/v1/project/add-freelancer/${projectId}`, {
      method: "PATCH",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        freelancerId: freelancerId
      })
    });

    const data = await response.json();

    if (response.ok) {
      showSuccess("Freelancer adicionado ao projeto com sucesso!");
      
      // Recarrega a página após 1.5 segundos para mostrar as alterações
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showError("Não foi possível adicionar o freelancer ao projeto. Tente novamente.");
      
      // Reabilita o botão em caso de erro
      if (addFreelancerBtn) {
        addFreelancerBtn.disabled = false;
        addFreelancerBtn.textContent = "Aceitar Solicitação";
      }
    }
  } catch (error) {
    showError("Erro de conexão. Tente novamente.");
    
    // Reabilita o botão em caso de erro
    if (addFreelancerBtn) {
      addFreelancerBtn.disabled = false;
      addFreelancerBtn.textContent = "Aceitar Solicitação";
    }
  }
}

// Event listener para o botão de adicionar freelancer
document.addEventListener("DOMContentLoaded", () => {
  const addFreelancerBtn = document.getElementById("add-freelancer-btn");
  
  if (addFreelancerBtn) {
    addFreelancerBtn.addEventListener("click", async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const projectId = urlParams.get("id");
      
      // TEMPORÁRIO: Por enquanto, você precisará passar o freelancerId via URL
      // Exemplo: ?id=projectId&freelancerId=freelancerId
      // Quando o sistema de notificações for implementado, o freelancerId virá da notificação
      const freelancerId = urlParams.get("freelancerId");
      
      if (!projectId) {
        showError("ID do projeto não encontrado.");
        return;
      }
      
      if (!freelancerId) {
        showError("ID do freelancer não encontrado. Aguardando implementação do sistema de notificações.");
        return;
      }
      
      await adicionarFreelancerAoProjeto(projectId, freelancerId);
    });
  }
});


// ========================================
// EDI��O DE PROJETO (somente para clients)
// ========================================

let projectData = null; // Armazena dados do projeto carregado

// Fun��o para verificar se o usu�rio � client
async function verificarSeEhCliente() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // Decodifica o token para pegar o userId e userType
    const tokenWithoutBearer = token.replace('Bearer ', '');
    const payload = JSON.parse(atob(tokenWithoutBearer.split('.')[1]));
    const userType = payload.userType;
    
    return userType === 'client';
  } catch (error) {
    return false;
  }
}

// Fun��o para abrir o modal de edi��o
function openEditModal() {
  if (!projectData) {
    showError('Dados do projeto n�o encontrados.');
    return;
  }
  
  const modal = document.getElementById('edit-project-modal');
  
  // Preenche o formulário com os dados atuais
  document.getElementById('edit-name').value = projectData.name || '';
  document.getElementById('edit-description').value = projectData.description || '';
  document.getElementById('edit-category').value = projectData.category || '';
  document.getElementById('edit-status').value = validarStatus(projectData.status);
  document.getElementById('edit-amount').value = projectData.amount || '';
  // Nota: Input file não pode ter valor pré-definido por segurança
  // Se houver imagem, ela permanecerá a mesma se nenhum arquivo for selecionado
  
  // Formata a data de deadline para o input date
  if (projectData.projectDeliveryDeadline) {
    const deadline = new Date(projectData.projectDeliveryDeadline);
    const year = deadline.getFullYear();
    const month = String(deadline.getMonth() + 1).padStart(2, '0');
    const day = String(deadline.getDate()).padStart(2, '0');
    document.getElementById('edit-deadline').value = `${year}-${month}-${day}`;
  }
  
  modal.classList.add('active');
}

// Função para fechar o modal de edição
function closeEditModal() {
  const modal = document.getElementById('edit-project-modal');
  modal.classList.remove('active');
}

// Função para converter e comprimir imagem em base64
function converterImagemParaBase64(file) {
  return new Promise((resolve, reject) => {
    // Validação de tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('A imagem selecionada é muito grande. Tamanho máximo permitido: 5MB. Por favor, escolha uma imagem menor.'));
      return;
    }

    // Validação do tipo de arquivo
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida. Por favor, selecione um arquivo de imagem (JPG, PNG, GIF, etc).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Define dimensões máximas (reduz imagens grandes)
        const maxWidth = 800;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;

        // Calcula novo tamanho mantendo proporção
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Cria canvas para redimensionar
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Converte para base64 com compressão (0.7 = 70% qualidade)
        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(base64);
      };
      img.onerror = () => reject(new Error('Não foi possível processar a imagem selecionada. Verifique se o arquivo está corrompido ou tente outra imagem.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem. Por favor, tente novamente.'));
    reader.readAsDataURL(file);
  });
}

// Função para atualizar o projeto
async function atualizarProjeto(projectId, updateData) {
  const token = localStorage.getItem('token');
  if (!token) {
    showError('Voc� precisa estar autenticado.');
    return;
  }
  
  const submitBtn = document.querySelector('.btn-save');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';
  
  try {
    const response = await fetch(`${BASE_URL}/v1/project/${projectId}`, {
      method: 'PUT',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Verifica se o erro está relacionado à imagem
      if (response.status === 413 || (errorData.message && errorData.message.toLowerCase().includes('image'))) {
        throw new Error('A imagem é muito grande para ser salva. Por favor, escolha uma imagem menor ou de menor resolução.');
      }
      
      if (errorData.message && errorData.message.toLowerCase().includes('urlimageproject')) {
        throw new Error('Erro ao salvar a imagem do projeto. Verifique o arquivo e tente novamente.');
      }
      
      throw new Error('Erro ao atualizar projeto');
    }
    
    showSuccess('Projeto atualizado com sucesso!');
    closeEditModal();
    
    // Recarrega a página após 1.5 segundos para mostrar as mudanças
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    showError(error.message || 'Não foi possível atualizar o projeto. Tente novamente.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Salvar Alterações';
  }
}

// Event listener para o formul�rio de edi��o
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar se � cliente e mostrar bot�o de editar
  const isClient = await verificarSeEhCliente();
  if (isClient) {
    const editBtn = document.getElementById('edit-project-btn');
    if (editBtn) {
      editBtn.style.display = 'flex';
      editBtn.addEventListener('click', openEditModal);
    }
  }
  
  // Event listener para o formul�rio
  const editForm = document.getElementById('edit-project-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const urlParams = new URLSearchParams(window.location.search);
      const projectId = urlParams.get('id');
      
      if (!projectId) {
        showError('ID do projeto não encontrado.');
        return;
      }
      
      // Pega o userId do token
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;
      
      // Processa a imagem se houver
      const imageInput = document.getElementById('edit-image-url');
      let urlImageProject = projectData.urlImageProject || ''; // Mantém a imagem atual
      
      if (imageInput.files && imageInput.files[0]) {
        try {
          urlImageProject = await converterImagemParaBase64(imageInput.files[0]);
        } catch (error) {
          // Mostra a mensagem específica do erro da imagem
          showError(error.message || 'Erro ao processar a imagem. Tente novamente.');
          return;
        }
      }
      
      // Monta o objeto com os dados atualizados
      const updateData = {
        userId: userId,
        name: document.getElementById('edit-name').value,
        description: document.getElementById('edit-description').value,
        category: document.getElementById('edit-category').value,
        status: document.getElementById('edit-status').value,
        amount: parseFloat(document.getElementById('edit-amount').value),
        projectDeliveryDeadline: new Date(document.getElementById('edit-deadline').value).toISOString(),
        urlImageProject: urlImageProject
      };
      
      await atualizarProjeto(projectId, updateData);
    });
  }
  
  // Fecha modal ao clicar fora
  const modal = document.getElementById('edit-project-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeEditModal();
      }
    });
  }
});

// Torna as fun��es dispon�veis globalmente para o onclick no HTML
window.closeEditModal = closeEditModal;
