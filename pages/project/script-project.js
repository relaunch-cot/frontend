// script-project.js

const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");

  if (!projectId) {
    console.error("Nenhum projectId encontrado na URL");
    return;
  }

  // 2. Token do localStorage
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("Nenhum token encontrado. A requisição será bloqueada pelo backend.");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/v1/project/${projectId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro ao buscar projeto:", errorData);
      return;
    }

    const backendResponse = await response.json();

    // 4. Preenche os dados na página
    preencherPaginaComProjeto(backendResponse.project);

  } catch (error) {
    console.error("Erro inesperado:", error);
  }
});

/**
 * Valida e normaliza o status do projeto
 */
function validarStatus(status) {
  const statusValidos = ['pendente', 'concluido'];
  const statusNormalizado = status?.toLowerCase().trim();
  
  if (!statusNormalizado || !statusValidos.includes(statusNormalizado)) {
    console.warn(`Status inválido recebido: "${status}". Usando "pendente" como padrão.`);
    return 'pendente';
  }
  
  return statusNormalizado;
}

/**
 * Preenche os elementos HTML com os dados do projeto.
 */
function preencherPaginaComProjeto(project) {
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
