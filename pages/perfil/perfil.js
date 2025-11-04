const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;

const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/login';
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
    return null;
  }
}

const decodedToken = parseJwt(token.replace('Bearer ', ''));
const currentUserId = decodedToken?.userId;

if (!currentUserId) {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

const urlParams = new URLSearchParams(window.location.search);
const userIdFromUrl = urlParams.get('userId');
const userId = userIdFromUrl || currentUserId;
const isOwnProfile = userId === currentUserId;

async function carregarPerfil() {
  try {
    const response = await fetch(`${BASE_URL}/v1/user/${userId}`, {
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

    const userNameElement = document.getElementById('userNameFromContainer');
    const userEmailElement = document.getElementById('userEmailFromContainer');
    
    if (data.user) {
      userNameElement.textContent = data.user.name || 'Nome não disponível';
      userEmailElement.textContent = data.user.email || 'Email não disponível';
      
      if (isOwnProfile && typeof window.updateHeaderProfile === 'function') {
        window.updateHeaderProfile(data.user);
      }
      
      if (data.user.settings) {
        const biografiaElement = document.getElementById('userBiografia');
        const tagsElement = document.getElementById('userTags');
        
        if (data.user.settings.biography) {
          biografiaElement.textContent = data.user.settings.biography;
        } else {
          biografiaElement.textContent = 'Adicione uma biografia';
        }
        
        if (data.user.settings.skills && Array.isArray(data.user.settings.skills) && data.user.settings.skills.length > 0) {
          tagsElement.innerHTML = data.user.settings.skills.map(skill => 
            `<span class="tag">${skill}</span>`
          ).join('');
        } else {
          tagsElement.innerHTML = '<span class="tag">Adicione suas competências</span>';
        }
      }
    } else {
      userNameElement.textContent = 'Erro ao carregar dados';
      userEmailElement.textContent = 'Email não disponível';
    }

  } catch (error) {
    showError('Erro ao carregar dados do perfil. Tente novamente.');
    
    document.getElementById('userName').textContent = 'Erro ao carregar perfil';
    document.getElementById('userEmail').textContent = 'Email não disponível';
  } finally {
    const editProfileSection = document.getElementById('edit-profile-section');
    if (editProfileSection && !isOwnProfile) {
      editProfileSection.style.display = 'none';
    }
  }
}

async function carregarPostsDoUsuario() {
  const container = document.getElementById('userPostsContainer');
  const emptyState = document.getElementById('emptyPostsState');
  const postsCount = document.querySelector('.posts-count');

  try {
    container.innerHTML = '<div class="loading">Carregando posts...</div>';
    
    const response = await fetch(`${BASE_URL}/v1/post/user`, {
      method: 'GET',
      headers: {
        'Authorization': token
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao carregar posts');
    }

    const data = await response.json();
    const posts = data.posts || [];

    container.innerHTML = '';

    if (posts.length === 0) {
      emptyState.style.display = 'block';
      postsCount.textContent = '0 posts';
      return;
    }

    emptyState.style.display = 'none';
    postsCount.textContent = `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`;

    // Ordena posts do mais recente para o mais antigo
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    posts.forEach(post => {
      const card = criarCardPost(post);
      container.appendChild(card);
    });

  } catch (error) {
    container.innerHTML = '<div class="loading">Erro ao carregar posts. Tente novamente.</div>';
    postsCount.textContent = '0 posts';
  }
}

function formatarData(dateString) {
  const data = new Date(dateString);
  const dataCorrigida = new Date(data.getTime() + (3 * 60 * 60 * 1000));
  
  const now = new Date();
  const diffMs = now - dataCorrigida;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;

  return dataCorrigida.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

function criarCardPost(post) {
  const card = document.createElement('div');
  card.className = 'user-post-card';
  card.dataset.postId = post.postId;

  const contentPreview = post.content.length > 200 
    ? post.content.substring(0, 200) + '...' 
    : post.content;

  card.innerHTML = `
    <div class="post-card-header">
      <div class="post-author-info">
        <div class="post-author-avatar">${post.authorName.charAt(0).toUpperCase()}</div>
        <div class="post-author-details">
          <span class="post-author-name">${post.authorName}</span>
          <span class="post-date">${formatarData(post.createdAt)}</span>
        </div>
      </div>
    </div>

    <div class="post-card-content">
      <h3 class="post-card-title">${post.title}</h3>
      <p class="post-card-text">${contentPreview}</p>
      ${post.urlImagePost ? `<img src="${post.urlImagePost}" alt="${post.title}" class="post-card-image">` : ''}
    </div>

    <div class="post-card-footer">
      <button class="btn-view-post" data-post-id="${post.postId}">
        Ler mais
      </button>
      <div class="post-actions-mini">
        <button class="btn-action-mini edit" title="Editar" data-post-id="${post.postId}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16">
            <path fill="currentColor" d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z"/>
          </svg>
        </button>
        <button class="btn-action-mini delete" title="Excluir" data-post-id="${post.postId}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16">
            <path fill="currentColor" d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  return card;
}

function editarPost(postId) {
  // Fecha modal de visualização se estiver aberto
  const viewModal = document.getElementById('viewPostModal');
  if (viewModal) {
    viewModal.classList.remove('active');
  }
  
  // Busca o post e abre modal de edição
  buscarPost(postId).then(post => {
    if (post) {
      abrirModalEdicao(post);
    }
  });
}

function abrirModalEdicao(post) {
  document.getElementById('editPostTitle').value = post.title;
  document.getElementById('editPostContent').value = post.content;
  
  const editModal = document.getElementById('editPostModal');
  const editForm = document.getElementById('editPostForm');
  
  // Armazena o postId no form
  editForm.dataset.postId = post.postId;
  editForm.dataset.currentImage = post.urlImagePost || '';
  
  editModal.classList.add('active');
}

async function atualizarPost(postId, postData) {
  try {
    const response = await fetch(`${BASE_URL}/v1/post/${postId}`, {
      method: 'PUT',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Verifica se é o erro específico de "no fields to update"
      if (errorData.message && errorData.message.includes('no fields to update')) {
        return { noChanges: true };
      }
      
      throw new Error('Erro ao atualizar post');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.message === 'Erro ao atualizar post') {
      throw error;
    }
    showError('Erro ao atualizar post');
    throw error;
  }
}

let postToDelete = null;

function confirmarExclusaoPost(postId) {
  postToDelete = postId;
  document.getElementById('deleteConfirmModal').classList.add('active');
}

async function excluirPost(postId) {
  try {
    const response = await fetch(`${BASE_URL}/v1/post/${postId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao excluir post');
    }

    showSuccess('Post excluído com sucesso!');
    
    // Fecha modais
    const viewModal = document.getElementById('viewPostModal');
    const deleteModal = document.getElementById('deleteConfirmModal');
    
    if (viewModal) {
      viewModal.classList.remove('active');
    }
    if (deleteModal) {
      deleteModal.classList.remove('active');
    }
    
    postToDelete = null;
    await carregarPostsDoUsuario();
  } catch (error) {
    showError('Erro ao excluir post. Tente novamente.');
  }
}

async function buscarPost(postId) {
  try {
    const response = await fetch(`${BASE_URL}/v1/post/${postId}`, {
      headers: {
        'Authorization': token
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar post');
    }

    const data = await response.json();
    return data.post;
  } catch (error) {
    showError('Erro ao carregar post');
    return null;
  }
}

function exibirPostDetalhado(post) {
  const modal = document.getElementById('viewPostModal');
  const detailContainer = document.getElementById('postDetail');

  detailContainer.innerHTML = `
    <div class="post-detail-header">
      <div class="author-avatar">${post.authorName.charAt(0).toUpperCase()}</div>
      <div class="author-info">
        <span class="author-name">${post.authorName}</span>
        <span class="post-date">${formatarData(post.createdAt)}</span>
        ${post.updatedAt && post.updatedAt !== post.createdAt ? 
          `<span class="post-updated">(editado em ${formatarData(post.updatedAt)})</span>` : ''}
      </div>
    </div>

    <h2 class="post-detail-title">${post.title}</h2>
    
    ${post.urlImagePost ? `<img src="${post.urlImagePost}" alt="${post.title}" class="post-detail-image">` : ''}
    
    <div class="post-detail-content">${post.content}</div>

    <div class="post-detail-actions">
      <button class="btn-action btn-edit" data-post-id="${post.postId}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16">
          <path fill="currentColor" d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z"/>
        </svg>
        Editar Post
      </button>
      <button class="btn-action btn-delete" data-post-id="${post.postId}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16">
          <path fill="currentColor" d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
        </svg>
        Excluir Post
      </button>
    </div>
  `;

  modal.classList.add('active');
}

// Event listeners
document.addEventListener('click', async (e) => {
  // Botão "Ler mais"
  if (e.target.classList.contains('btn-view-post')) {
    const postId = e.target.dataset.postId;
    const post = await buscarPost(postId);
    if (post) {
      exibirPostDetalhado(post);
    }
  }

  // Botão editar (mini e no modal)
  if (e.target.closest('.btn-action-mini.edit') || e.target.closest('.btn-edit')) {
    e.stopPropagation();
    const button = e.target.closest('.btn-action-mini.edit') || e.target.closest('.btn-edit');
    const postId = button.dataset.postId;
    if (postId) {
      editarPost(postId);
    }
  }

  // Botão excluir (mini e no modal)
  if (e.target.closest('.btn-action-mini.delete') || 
      (e.target.closest('.btn-delete') && !e.target.closest('.btn-delete-confirm'))) {
    e.stopPropagation();
    const button = e.target.closest('.btn-action-mini.delete') || e.target.closest('.btn-delete');
    const postId = button.dataset.postId;
    if (postId) {
      confirmarExclusaoPost(postId);
    }
  }

  // Fechar modal
  if (e.target.classList.contains('close')) {
    document.getElementById('viewPostModal').classList.remove('active');
    document.getElementById('editPostModal').classList.remove('active');
    document.getElementById('deleteConfirmModal').classList.remove('active');
    document.getElementById('editPostForm').reset();
    postToDelete = null;
  }
});

// Botões do modal de confirmação
document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
  document.getElementById('deleteConfirmModal').classList.remove('active');
  postToDelete = null;
});

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!postToDelete) return;
  
  const confirmBtn = document.getElementById('confirmDeleteBtn');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Excluindo...';
  
  try {
    await excluirPost(postToDelete);
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Excluir';
  }
});

// Botões do modal de edição
document.getElementById('cancelEditBtn').addEventListener('click', () => {
  document.getElementById('editPostModal').classList.remove('active');
  document.getElementById('editPostForm').reset();
});

// Submeter edição de post
document.getElementById('editPostForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const editForm = e.target;
  const postId = editForm.dataset.postId;
  const currentImage = editForm.dataset.currentImage;
  const title = document.getElementById('editPostTitle').value.trim();
  const content = document.getElementById('editPostContent').value.trim();
  const imageFile = document.getElementById('editPostImage').files[0];
  
  const submitBtn = editForm.querySelector('.btn-submit');
  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Salvando...';
  
  try {
    const postData = {
      title,
      content
    };
    
    // Se há nova imagem, converte para base64
    if (imageFile) {
      const reader = new FileReader();
      const base64Image = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      postData.urlImagePost = base64Image;
    } else if (currentImage) {
      // Mantém a imagem atual
      postData.urlImagePost = currentImage;
    }
    
    const result = await atualizarPost(postId, postData);
    
    if (result.noChanges) {
      showInfo('Nenhuma alteração foi feita no post');
    } else {
      showSuccess('Post atualizado com sucesso!');
      document.getElementById('editPostModal').classList.remove('active');
      editForm.reset();
      await carregarPostsDoUsuario(); // Recarrega a lista
    }
  } catch (error) {
    showError('Erro ao atualizar post');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
});

// Fechar modal clicando fora
window.addEventListener('click', (e) => {
  const viewModal = document.getElementById('viewPostModal');
  const editModal = document.getElementById('editPostModal');
  const deleteModal = document.getElementById('deleteConfirmModal');
  
  if (e.target === viewModal) {
    viewModal.classList.remove('active');
  }
  
  if (e.target === editModal) {
    editModal.classList.remove('active');
    document.getElementById('editPostForm').reset();
  }
  
  if (e.target === deleteModal) {
    deleteModal.classList.remove('active');
    postToDelete = null;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  carregarPerfil();
  carregarPostsDoUsuario();
});
