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
const userName = decodedToken?.userName;
const userEmail = decodedToken?.userEmail;

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

async function fetchLikesFromPost(postId) {
    try {
        const response = await fetch(`${BASE_URL}/v1/post/likes/${postId}`, {
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar likes');
        }

        const data = await response.json();
        return data.likesFromPost || { likesCount: 0, likes: [] };
    } catch (error) {
        console.error('Erro ao carregar likes:', error);
        return { likesCount: 0, likes: [] };
    }
}

async function fetchCommentsFromPost(postId) {
    try {
        const response = await fetch(`${BASE_URL}/v1/post/comments/${postId}`, {
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar comentários');
        }

        const data = await response.json();
        return data.commentsFromPost || { commentsCount: 0, comments: [] };
    } catch (error) {
        console.error('Erro ao carregar comentários:', error);
        return { commentsCount: 0, comments: [] };
    }
}

async function toggleLike(postId, currentlyLiked) {
    try {
        const response = await fetch(`${BASE_URL}/v1/post/like/${postId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao processar like');
        }

        const likesData = await fetchLikesFromPost(postId);
        const likesCount = likesData.likesCount || 0;
        const userLiked = likesData.likes?.some(like => like.userId === currentUserId) || false;
        
        return { 
            likesCount, 
            userLiked 
        };
    } catch (error) {
        showError('Erro ao processar like');
        throw error;
    }
}

function createAvatar(name, imageUrl = null, size = 'default') {
    if (imageUrl) {
        return `<img src="${imageUrl}" alt="${name}" class="avatar-image ${size}">`;
    }
    
    const initial = name ? name.charAt(0).toUpperCase() : 'U';
    return `<div class="avatar-letter ${size}">${initial}</div>`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const dateCorrigida = new Date(date.getTime() + (3 * 60 * 60 * 1000));
    
    return dateCorrigida.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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

    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    for (const post of posts) {
      const card = await criarCardPost(post);
      container.appendChild(card);
    }

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
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return dataCorrigida.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

async function criarCardPost(post) {
  const card = document.createElement('div');
  card.className = 'post-card';
  card.dataset.postId = post.postId;

  const isAuthor = post.authorId === currentUserId;

  // Busca likes e comentários separadamente
  const likesData = await fetchLikesFromPost(post.postId);
  const likesCount = likesData.likesCount || 0;
  const userLiked = likesData.likes?.some(like => like.userId === currentUserId) || false;

  const commentsData = await fetchCommentsFromPost(post.postId);
  const commentsCount = commentsData.commentsCount || 0;

  card.innerHTML = `
    <div class="post-header">
      <div class="post-author">
        <div class="author-avatar">${post.authorName.charAt(0).toUpperCase()}</div>
        <div class="author-info">
          <span class="author-name">${post.authorName}</span>
          <span class="post-date">${formatarData(post.createdAt)}</span>
        </div>
      </div>
      <div class="post-header-actions">
        <button class="btn-read-more" data-post-id="${post.postId}">Ler mais</button>
        ${isAuthor ? `
          <div class="post-menu-container">
            <button class="btn-post-menu" data-post-id="${post.postId}">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16">
                <path fill="currentColor" d="M8 256a56 56 0 1 1 112 0A56 56 0 1 1 8 256zm160 0a56 56 0 1 1 112 0 56 56 0 1 1 -112 0zm216-56a56 56 0 1 1 0 112 56 56 0 1 1 0-112z"/>
              </svg>
            </button>
            <div class="post-menu-dropdown" data-post-id="${post.postId}" style="display: none;">
              <button class="menu-item btn-edit" data-post-id="${post.postId}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16">
                  <path fill="currentColor" d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z"/>
                </svg>
                Editar
              </button>
              <button class="menu-item btn-delete" data-post-id="${post.postId}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16">
                  <path fill="currentColor" d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                </svg>
                Excluir
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="post-content">
      <h3 class="post-title">${post.title}</h3>
      <p class="post-text">${post.content.substring(0, 200)}${post.content.length > 200 ? '...' : ''}</p>
      ${post.urlImagePost ? `<img src="${post.urlImagePost}" alt="${post.title}" class="post-image">` : ''}
    </div>

    <div class="post-interactions">
      <button class="interaction-btn btn-like ${userLiked ? 'liked' : ''}" data-post-id="${post.postId}">
        <svg class="interaction-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path fill="currentColor" d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z"/>
        </svg>
        <span class="interaction-count">${likesCount}</span>
      </button>
      
      <button class="interaction-btn btn-comment" data-post-id="${post.postId}">
        <svg class="interaction-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path fill="currentColor" d="M123.6 391.3c12.9-9.4 29.6-11.8 44.6-6.4c26.5 9.6 56.2 15.1 87.8 15.1c124.7 0 208-80.5 208-160s-83.3-160-208-160S48 160.5 48 240c0 32 12.4 62.8 35.7 89.2c8.6 9.7 12.8 22.5 11.8 35.5c-1.4 18.1-5.7 34.7-11.3 49.4c17-7.9 31.1-16.7 39.4-22.7zM21.2 431.9c1.8-2.7 3.5-5.4 5.1-8.1c10-16.6 19.5-38.4 21.4-62.9C17.7 326.8 0 285.1 0 240C0 125.1 114.6 32 256 32s256 93.1 256 208s-114.6 208-256 208c-37.1 0-72.3-6.4-104.1-17.9c-11.9 8.7-31.3 20.6-54.3 30.6c-15.1 6.6-32.3 12.6-50.1 16.1c-.8 .2-1.6 .3-2.4 .5c-4.4 .8-8.7 1.5-13.2 1.9c-.2 0-.5 .1-.7 .1c-5.1 .5-10.2 .8-15.3 .8c-6.5 0-12.3-3.9-14.8-9.9c-2.5-6-1.1-12.8 3.4-17.4c4.1-4.2 7.8-8.7 11.3-13.5c1.7-2.3 3.3-4.6 4.8-6.9c.1-.2 .2-.3 .3-.5z"/>
        </svg>
        <span class="interaction-count">${commentsCount}</span>
      </button>
    </div>

    <div class="comments-section" style="display: none;" data-post-id="${post.postId}">
      <div class="comments-list"></div>
      <div class="comment-form">
        <div class="comment-input-wrapper">
          <div class="user-avatar-small">${(userName && userName.trim()) ? userName.charAt(0).toUpperCase() : 'U'}</div>
          <input type="text" class="comment-input" placeholder="Adicione um comentário..." data-post-id="${post.postId}">
        </div>
      </div>
    </div>
  `;

  return card;
}

// Funções de comentários
async function renderComments(postId) {
  const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
  const commentsList = card?.querySelector('.comments-list');
  if (!commentsList) return;

  const commentsData = await fetchCommentsFromPost(postId);
  
  commentsList.style.opacity = '0';
  
  setTimeout(() => {
    if (commentsData && commentsData.comments && commentsData.comments.length > 0) {
      commentsList.innerHTML = commentsData.comments.map(comment => renderComment(comment, postId, 0)).join('');
    } else {
      commentsList.innerHTML = `
        <div class="empty-comments">
          <p>Nenhum comentário ainda</p>
          <small>Seja o primeiro a comentar!</small>
        </div>
      `;
    }
    
    commentsList.style.opacity = '1';
  }, 150);
}

function renderComment(comment, postId, depth = 0) {
  const isOwner = comment.userId === currentUserId;
  const avatar = createAvatar(comment.userName || 'Usuário', null, 'small');
  
  const likesCount = comment.likes?.likesCount || 0;
  const userLiked = comment.likes?.likes?.some(like => like.userId === currentUserId) || false;
  
  const repliesCount = comment.replies?.commentsCount || 0;
  const replies = comment.replies?.comments || [];
  
  const marginLeft = depth > 0 ? `style="margin-left: ${depth * 40}px;"` : '';
  
  // ID único para o container de respostas
  const repliesContainerId = `replies-${comment.commentId}`;
  
  let html = `
    <div class="comment-item" data-comment-id="${comment.commentId}" ${marginLeft}>
      <div class="comment-avatar">
        ${avatar}
      </div>
      <div class="comment-content">
        <div class="comment-header">
          <span class="comment-author">${comment.userName || 'Usuário'}</span>
          <span class="comment-time">${formatDate(comment.createdAt)}</span>
        </div>
        <div class="comment-text-wrapper">
          <p class="comment-text">${comment.content}</p>
          <button class="comment-like-btn ${userLiked ? 'liked' : ''}" data-comment-id="${comment.commentId}" data-post-id="${postId}">
            <svg class="comment-like-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="14" height="14">
              <path fill="currentColor" d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z"/>
            </svg>
            ${likesCount > 0 ? `<span class="comment-like-count">${likesCount}</span>` : ''}
          </button>
        </div>
        <div class="comment-actions">
          <button class="comment-action-btn reply-comment-btn" data-comment-id="${comment.commentId}" data-post-id="${postId}">
            Responder
          </button>
          ${isOwner ? `
            <div class="comment-menu-container">
              <button class="btn-comment-menu" data-comment-id="${comment.commentId}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="12" height="12">
                  <path fill="currentColor" d="M8 256a56 56 0 1 1 112 0A56 56 0 1 1 8 256zm160 0a56 56 0 1 1 112 0 56 56 0 1 1 -112 0zm216-56a56 56 0 1 1 0 112 56 56 0 1 1 0-112z"/>
                </svg>
              </button>
              <div class="comment-menu-dropdown" data-comment-id="${comment.commentId}" style="display: none;">
                <button class="menu-item delete-comment-btn" data-comment-id="${comment.commentId}" data-post-id="${postId}" data-is-reply="${depth > 0}">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="14" height="14">
                    <path fill="currentColor" d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                  </svg>
                  Excluir
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  
  // Adiciona botão de toggle e container de respostas se houver respostas
  if (repliesCount > 0) {
    html += `
      <div class="replies-toggle-container" style="margin-left: ${(depth + 1) * 40}px;">
        <button class="btn-toggle-replies" data-replies-id="${repliesContainerId}">
          <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="12" height="12">
            <path fill="currentColor" d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/>
          </svg>
          Ver respostas (${repliesCount})
        </button>
      </div>
      <div class="replies-container" id="${repliesContainerId}" style="display: none;">
        ${replies.map(reply => renderComment(reply, postId, depth + 1)).join('')}
        <div class="hide-replies-container" style="margin-left: ${(depth + 1) * 40}px;">
          <button class="btn-hide-replies" data-replies-id="${repliesContainerId}">
            <svg class="toggle-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="12" height="12">
              <path fill="currentColor" d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z"/>
            </svg>
            Ocultar respostas
          </button>
        </div>
      </div>
    `;
  }
  
  return html;
}

function getOpenRepliesState(postId) {
  const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
  const commentsList = card?.querySelector('.comments-list');
  if (!commentsList) return [];
  
  const openReplies = [];
  const repliesContainers = commentsList.querySelectorAll('.replies-container');
  
  repliesContainers.forEach(repliesContainer => {
    if (repliesContainer.style.display === 'block') {
      openReplies.push(repliesContainer.id);
    }
  });
  
  return openReplies;
}

function restoreOpenRepliesState(postId, openRepliesIds) {
  if (!openRepliesIds || openRepliesIds.length === 0) return;
  
  const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
  if (!card) return;
  
  openRepliesIds.forEach(repliesId => {
    const repliesContainer = card.querySelector(`#${repliesId}`);
    const toggleBtn = card.querySelector(`.btn-toggle-replies[data-replies-id="${repliesId}"]`);
    
    if (repliesContainer && toggleBtn) {
      repliesContainer.style.display = 'block';
      toggleBtn.parentElement.style.display = 'none';
    }
  });
}

async function handleAddComment(postId, content, parentCommentId = null) {
  try {
    const response = await fetch(`${BASE_URL}/v1/post/comment-or-reply/${postId}`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content, parentCommentId })
    });

    if (!response.ok) {
      throw new Error('Erro ao adicionar comentário');
    }

    // Salva estado antes de recarregar
    const openRepliesIds = getOpenRepliesState(postId);

    // Fade out
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const commentsList = card?.querySelector('.comments-list');
    if (commentsList) {
      commentsList.style.opacity = '0';
    }

    // Aguarda fade e recarrega
    await new Promise(resolve => setTimeout(resolve, 150));
    await renderComments(postId);

    // Restaura estado
    restoreOpenRepliesState(postId, openRepliesIds);

    // Atualiza contador
    const commentBtn = document.querySelector(`.btn-comment[data-post-id="${postId}"]`);
    const countSpan = commentBtn?.querySelector('.interaction-count');
    if (countSpan) {
      countSpan.textContent = parseInt(countSpan.textContent) + 1;
    }

  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    alert('Erro ao adicionar comentário. Tente novamente.');
  }
}

async function handleDeleteComment(postId, commentId, isReply) {
  if (!confirm('Tem certeza que deseja excluir este comentário?')) return;

  try {
    const body = isReply ? { replyId: commentId } : { commentId };

    const response = await fetch(`${BASE_URL}/v1/post/comment-or-reply`, {
      method: 'DELETE',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error('Erro ao excluir comentário');
    }

    // Salva estado antes de recarregar
    const openRepliesIds = getOpenRepliesState(postId);

    // Fade out
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const commentsList = card?.querySelector('.comments-list');
    if (commentsList) {
      commentsList.style.opacity = '0';
    }

    // Aguarda fade e recarrega
    await new Promise(resolve => setTimeout(resolve, 150));
    await renderComments(postId);

    // Restaura estado
    restoreOpenRepliesState(postId, openRepliesIds);

    // Atualiza contador
    const commentBtn = document.querySelector(`.btn-comment[data-post-id="${postId}"]`);
    const countSpan = commentBtn?.querySelector('.interaction-count');
    if (countSpan) {
      countSpan.textContent = Math.max(0, parseInt(countSpan.textContent) - 1);
    }

  } catch (error) {
    console.error('Erro ao excluir comentário:', error);
    alert('Erro ao excluir comentário. Tente novamente.');
  }
}

async function toggleCommentLike(postId, commentId, currentlyLiked) {
  try {
    const response = await fetch(`${BASE_URL}/v1/post/like/${postId}?parentCommentId=${commentId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao curtir comentário');
    }

    // Atualização instantânea da UI
    const likeBtn = document.querySelector(`.comment-like-btn[data-comment-id="${commentId}"]`);
    const likeCount = likeBtn?.querySelector('.comment-like-count');
    
    if (likeBtn) {
      if (currentlyLiked) {
        likeBtn.classList.remove('liked');
        if (likeCount) {
          const newCount = Math.max(0, parseInt(likeCount.textContent) - 1);
          if (newCount === 0) {
            likeCount.remove();
          } else {
            likeCount.textContent = newCount;
          }
        }
      } else {
        likeBtn.classList.add('liked');
        if (likeCount) {
          likeCount.textContent = parseInt(likeCount.textContent) + 1;
        } else {
          const span = document.createElement('span');
          span.className = 'comment-like-count';
          span.textContent = '1';
          likeBtn.appendChild(span);
        }
      }
    }

  } catch (error) {
    console.error('Erro ao curtir comentário:', error);
    
    // Rollback em caso de erro
    const likeBtn = document.querySelector(`.comment-like-btn[data-comment-id="${commentId}"]`);
    const likeCount = likeBtn?.querySelector('.comment-like-count');
    
    if (likeBtn) {
      if (currentlyLiked) {
        likeBtn.classList.add('liked');
        if (!likeCount) {
          const span = document.createElement('span');
          span.className = 'comment-like-count';
          span.textContent = '1';
          likeBtn.appendChild(span);
        } else {
          likeCount.textContent = parseInt(likeCount.textContent) + 1;
        }
      } else {
        likeBtn.classList.remove('liked');
        if (likeCount) {
          const newCount = Math.max(0, parseInt(likeCount.textContent) - 1);
          if (newCount === 0) {
            likeCount.remove();
          } else {
            likeCount.textContent = newCount;
          }
        }
      }
    }
  }
}

function editarPost(postId) {
  const viewModal = document.getElementById('viewPostModal');
  if (viewModal) {
    viewModal.classList.remove('active');
  }
  
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

    const data = await response.json();
    
    if (!response.ok) {
      if (data.message && data.message.includes('no fields to update')) {
        return { noChanges: true };
      }
      
      throw new Error(data.message || 'Erro ao atualizar post');
    }

    return data;
  } catch (error) {
    console.error('Erro ao atualizar post:', error);
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

document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('btn-view-post')) {
    const postId = e.target.dataset.postId;
    const post = await buscarPost(postId);
    if (post) {
      exibirPostDetalhado(post);
    }
  }

  if (e.target.closest('.btn-action-mini.edit') || e.target.closest('.btn-edit')) {
    e.stopPropagation();
    const button = e.target.closest('.btn-action-mini.edit') || e.target.closest('.btn-edit');
    const postId = button.dataset.postId;
    if (postId) {
      editarPost(postId);
    }
  }

  if (e.target.closest('.btn-action-mini.delete') || 
      (e.target.closest('.btn-delete') && !e.target.closest('.btn-delete-confirm'))) {
    e.stopPropagation();
    const button = e.target.closest('.btn-action-mini.delete') || e.target.closest('.btn-delete');
    const postId = button.dataset.postId;
    if (postId) {
      confirmarExclusaoPost(postId);
    }
  }

  if (e.target.classList.contains('close')) {
    document.getElementById('viewPostModal').classList.remove('active');
    document.getElementById('editPostModal').classList.remove('active');
    document.getElementById('deleteConfirmModal').classList.remove('active');
    document.getElementById('editPostForm').reset();
    postToDelete = null;
  }
});

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

document.getElementById('cancelEditBtn').addEventListener('click', () => {
  document.getElementById('editPostModal').classList.remove('active');
  document.getElementById('editPostForm').reset();
});

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
    
    if (imageFile) {
      const reader = new FileReader();
      const base64Image = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      postData.urlImagePost = base64Image;
    } else if (currentImage) {
      postData.urlImagePost = currentImage;
    }
    
    const result = await atualizarPost(postId, postData);
    
    if (result.noChanges) {
      showInfo('Nenhuma alteração foi feita no post');
    } else {
      showSuccess('Post atualizado com sucesso!');
      await carregarPostsDoUsuario();
    }
    
    document.getElementById('editPostModal').classList.remove('active');
    editForm.reset();
  } catch (error) {
    showError('Erro ao atualizar post');
    document.getElementById('editPostModal').classList.remove('active');
    editForm.reset();
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
});

// Event delegation para interações dos posts
document.addEventListener('click', async (e) => {
  // Like no post
  if (e.target.closest('.btn-like')) {
    const btn = e.target.closest('.btn-like');
    const postId = btn.dataset.postId;
    const currentlyLiked = btn.classList.contains('liked');
    
    await toggleLike(postId, currentlyLiked);
  }

  // Toggle seção de comentários
  if (e.target.closest('.btn-comment')) {
    const btn = e.target.closest('.btn-comment');
    const postId = btn.dataset.postId;
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const commentsSection = card?.querySelector('.comments-section');
    
    if (commentsSection) {
      const isVisible = commentsSection.style.display === 'block';
      
      if (isVisible) {
        commentsSection.style.display = 'none';
      } else {
        commentsSection.style.display = 'block';
        
        const commentsList = commentsSection.querySelector('.comments-list');
        if (commentsList) {
          commentsList.innerHTML = '<div class="loading-comments">Carregando comentários...</div>';
        }
        
        await renderComments(postId);
      }
    }
  }

  // Like no comentário
  if (e.target.closest('.comment-like-btn')) {
    const btn = e.target.closest('.comment-like-btn');
    const postId = btn.dataset.postId;
    const commentId = btn.dataset.commentId;
    const currentlyLiked = btn.classList.contains('liked');
    
    await toggleCommentLike(postId, commentId, currentlyLiked);
  }

  // Responder comentário
  if (e.target.closest('.reply-comment-btn')) {
    const btn = e.target.closest('.reply-comment-btn');
    const postId = btn.dataset.postId;
    const commentId = btn.dataset.commentId;
    
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const commentInput = card?.querySelector('.comment-input');
    
    if (commentInput) {
      // Adiciona indicador visual de resposta
      const commentForm = card.querySelector('.comment-form');
      let replyIndicator = commentForm.querySelector('.reply-indicator');
      
      if (!replyIndicator) {
        replyIndicator = document.createElement('div');
        replyIndicator.className = 'reply-indicator';
        commentForm.insertBefore(replyIndicator, commentForm.firstChild);
      }
      
      replyIndicator.innerHTML = `
        <strong>Respondendo</strong>
        <button class="cancel-reply-btn" data-post-id="${postId}">✕</button>
      `;
      replyIndicator.style.display = 'flex';
      
      commentInput.dataset.parentCommentId = commentId;
      commentInput.focus();
    }
  }

  // Cancelar resposta
  if (e.target.closest('.cancel-reply-btn')) {
    const btn = e.target.closest('.cancel-reply-btn');
    const postId = btn.dataset.postId;
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    const commentInput = card?.querySelector('.comment-input');
    const replyIndicator = card?.querySelector('.reply-indicator');
    
    if (commentInput) {
      delete commentInput.dataset.parentCommentId;
    }
    if (replyIndicator) {
      replyIndicator.style.display = 'none';
    }
  }

  // Excluir comentário
  if (e.target.closest('.delete-comment-btn')) {
    const btn = e.target.closest('.delete-comment-btn');
    const postId = btn.dataset.postId;
    const commentId = btn.dataset.commentId;
    const isReply = btn.dataset.isReply === 'true';
    
    await handleDeleteComment(postId, commentId, isReply);
  }

  // Toggle respostas
  if (e.target.closest('.btn-toggle-replies')) {
    const btn = e.target.closest('.btn-toggle-replies');
    const repliesId = btn.dataset.repliesId;
    const repliesContainer = document.getElementById(repliesId);
    
    if (repliesContainer) {
      btn.parentElement.style.display = 'none';
      repliesContainer.style.display = 'block';
    }
  }

  // Ocultar respostas
  if (e.target.closest('.btn-hide-replies')) {
    const btn = e.target.closest('.btn-hide-replies');
    const repliesId = btn.dataset.repliesId;
    const repliesContainer = document.getElementById(repliesId);
    const toggleBtn = document.querySelector(`.btn-toggle-replies[data-replies-id="${repliesId}"]`);
    
    if (repliesContainer && toggleBtn) {
      repliesContainer.style.display = 'none';
      toggleBtn.parentElement.style.display = 'block';
    }
  }

  // Toggle menu do post (3 pontos)
  if (e.target.closest('.btn-post-menu')) {
    const btn = e.target.closest('.btn-post-menu');
    const postId = btn.dataset.postId;
    const dropdown = document.querySelector(`.post-menu-dropdown[data-post-id="${postId}"]`);
    
    // Fecha outros menus
    document.querySelectorAll('.post-menu-dropdown').forEach(menu => {
      if (menu !== dropdown) {
        menu.style.display = 'none';
      }
    });
    
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
    e.stopPropagation();
  }

  // Toggle menu do comentário (3 pontos vertical)
  if (e.target.closest('.btn-comment-menu')) {
    const btn = e.target.closest('.btn-comment-menu');
    const dropdown = btn.parentElement.querySelector('.comment-menu-dropdown');
    
    // Fecha outros menus de comentários
    document.querySelectorAll('.comment-menu-dropdown').forEach(menu => {
      if (menu !== dropdown) {
        menu.style.display = 'none';
      }
    });
    
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
    e.stopPropagation();
  }

  // Editar post
  if (e.target.closest('.btn-edit')) {
    const btn = e.target.closest('.btn-edit');
    const postId = btn.dataset.postId;
    editarPost(postId);
    
    // Fecha o menu
    const dropdown = document.querySelector(`.post-menu-dropdown[data-post-id="${postId}"]`);
    if (dropdown) dropdown.style.display = 'none';
  }

  // Excluir post
  if (e.target.closest('.btn-delete')) {
    const btn = e.target.closest('.btn-delete');
    const postId = btn.dataset.postId;
    confirmarExclusao(postId);
    
    // Fecha o menu
    const dropdown = document.querySelector(`.post-menu-dropdown[data-post-id="${postId}"]`);
    if (dropdown) dropdown.style.display = 'none';
  }

  // Ler mais
  if (e.target.closest('.btn-read-more')) {
    const btn = e.target.closest('.btn-read-more');
    const postId = btn.dataset.postId;
    const post = await buscarPost(postId);
    if (post) {
      exibirPostDetalhado(post);
    }
  }
});

// Fechar menus ao clicar fora
document.addEventListener('click', (e) => {
  if (!e.target.closest('.post-menu-container') && !e.target.closest('.comment-menu-container')) {
    document.querySelectorAll('.post-menu-dropdown, .comment-menu-dropdown').forEach(menu => {
      menu.style.display = 'none';
    });
  }
});

// Handler para adicionar comentário com Enter
document.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && e.target.classList.contains('comment-input')) {
    const input = e.target;
    const content = input.value.trim();
    
    if (!content) return;
    
    const postId = input.dataset.postId;
    const parentCommentId = input.dataset.parentCommentId || null;
    
    await handleAddComment(postId, content, parentCommentId);
    
    input.value = '';
    delete input.dataset.parentCommentId;
    input.placeholder = 'Adicionar um comentário...';
    
    const replyIndicator = input.parentElement.querySelector('.reply-indicator');
    if (replyIndicator) {
      replyIndicator.style.display = 'none';
    }
  }
});

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
