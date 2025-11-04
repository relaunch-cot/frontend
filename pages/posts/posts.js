const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;
const token = localStorage.getItem('token');

if (!token) {
    showError('Você precisa estar logado para acessar os posts.');
    setTimeout(() => navigateTo('/login'), 2000);
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
const userId = decodedToken?.userId;
const userName = decodedToken?.name;

async function fetchAllPosts() {
    try {
        const response = await fetch(`${BASE_URL}/v1/post`, {
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar posts');
        }

        const data = await response.json();
        return data.posts || [];
    } catch (error) {
        showError('Erro ao carregar posts');
        return [];
    }
}

async function fetchPost(postId) {
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

async function createPost(postData) {
    try {
        const response = await fetch(`${BASE_URL}/v1/post`, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            throw new Error('Erro ao criar post');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        showError('Erro ao criar post');
        throw error;
    }
}

async function updatePost(postId, postData) {
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

async function deletePost(postId) {
    try {
        const response = await fetch(`${BASE_URL}/v1/post/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao deletar post');
        }

        return true;
    } catch (error) {
        showError('Erro ao deletar post');
        throw error;
    }
}

function formatDate(dateString) {
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

function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.dataset.postId = post.postId;

    const isAuthor = post.authorId === userId;

    // Extrai dados de likes do post (já vêm no GET)
    const likesData = post.likes || {};
    const likesCount = likesData.likesCount || 0;
    const userLiked = likesData.likes?.some(like => like.userId === userId) || false;

    card.innerHTML = `
        <div class="post-header">
            <div class="post-author">
                <div class="author-avatar">${post.authorName.charAt(0).toUpperCase()}</div>
                <div class="author-info">
                    <span class="author-name">${post.authorName}</span>
                    <span class="post-date">${formatDate(post.createdAt)}</span>
                </div>
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
                <span class="interaction-count">0</span>
            </button>
        </div>

        <div class="post-footer">
            <button class="btn-read-more" data-post-id="${post.postId}">Ler mais</button>
            <div class="post-actions">
                ${isAuthor ? `
                    <button class="btn-action btn-edit" data-post-id="${post.postId}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16">
                            <path fill="currentColor" d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z"/>
                        </svg>
                        Editar
                    </button>
                    <button class="btn-action btn-delete" data-post-id="${post.postId}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16">
                            <path fill="currentColor" d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                        </svg>
                        Excluir
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    return card;
}

function showPostDetail(post) {
    const modal = document.getElementById('viewPostModal');
    const detailContainer = document.getElementById('postDetail');

    const isAuthor = post.authorId === userId;

    detailContainer.innerHTML = `
        <div class="post-detail-header">
            <div class="post-author">
                <div class="author-avatar large">${post.authorName.charAt(0).toUpperCase()}</div>
                <div class="author-info">
                    <span class="author-name">${post.authorName}</span>
                    <span class="post-date">${formatDate(post.createdAt)}</span>
                    ${post.updatedAt && post.updatedAt !== post.createdAt ? 
                        `<span class="post-updated">(editado em ${formatDate(post.updatedAt)})</span>` : ''}
                </div>
            </div>
        </div>

        <h2 class="post-detail-title">${post.title}</h2>
        
        ${post.urlImagePost ? `<img src="${post.urlImagePost}" alt="${post.title}" class="post-detail-image">` : ''}
        
        <div class="post-detail-content">${post.content}</div>

        ${isAuthor ? `
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
        ` : ''}
    `;

    modal.classList.add('active');
}

async function renderPosts() {
    const container = document.getElementById('postsContainer');
    const emptyState = document.getElementById('emptyState');
    
    container.innerHTML = '<div class="loading">Carregando posts...</div>';

    const posts = await fetchAllPosts();

    container.innerHTML = '';

    if (posts.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    posts.forEach(post => {
        const card = createPostCard(post);
        container.appendChild(card);
    });
}

const createModal = document.getElementById('createPostModal');
const viewModal = document.getElementById('viewPostModal');
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const createBtn = document.getElementById('createPostBtn');
const cancelBtn = document.getElementById('cancelBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const closeButtons = document.querySelectorAll('.close');
const createForm = document.getElementById('createPostForm');

let postToDelete = null;

createBtn.addEventListener('click', () => {
    resetCreateModal();
    createModal.classList.add('active');
});

cancelBtn.addEventListener('click', () => {
    createModal.classList.remove('active');
    resetCreateModal();
});

cancelDeleteBtn.addEventListener('click', () => {
    deleteConfirmModal.classList.remove('active');
    postToDelete = null;
});

confirmDeleteBtn.addEventListener('click', async () => {
    if (!postToDelete) return;
    
    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = 'Excluindo...';
    
    try {
        await deletePost(postToDelete);
        showSuccess('Post excluído com sucesso!');
        deleteConfirmModal.classList.remove('active');
        viewModal.classList.remove('active');
        postToDelete = null;
        await renderPosts();
    } catch (error) {
        showError('Erro ao excluir post. Tente novamente.');
    } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = 'Excluir';
    }
});

closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        createModal.classList.remove('active');
        viewModal.classList.remove('active');
        deleteConfirmModal.classList.remove('active');
        resetCreateModal();
        postToDelete = null;
    });
});

window.addEventListener('click', (e) => {
    if (e.target === createModal) {
        createModal.classList.remove('active');
        resetCreateModal();
    }
    if (e.target === viewModal) {
        viewModal.classList.remove('active');
    }
    if (e.target === deleteConfirmModal) {
        deleteConfirmModal.classList.remove('active');
        postToDelete = null;
    }
});

createForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = createForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = editingPostId ? 'Atualizando...' : 'Publicando...';

    const imageFile = document.getElementById('postImage').files[0];
    let imageUrl = '';

    if (imageFile) {
        imageUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
        });
    }

    const postData = {
        title: document.getElementById('postTitle').value.trim(),
        content: document.getElementById('postContent').value.trim(),
        urlImagePost: imageUrl
    };

    // Se não tem imagem nova, precisamos buscar a existente para modo de edição
    if (!imageUrl && editingPostId) {
        const existingPost = await fetchPost(editingPostId);
        if (existingPost && existingPost.urlImagePost) {
            postData.urlImagePost = existingPost.urlImagePost;
        }
    }

    // Adiciona o tipo apenas na criação
    if (!editingPostId) {
        postData.type = document.getElementById('postType').value;
    }

    try {
        if (editingPostId) {
            const result = await updatePost(editingPostId, postData);
            
            // Verifica se não houve alterações
            if (result.noChanges) {
                showInfo('Nenhuma alteração foi feita no post.');
                createModal.classList.remove('active');
                resetCreateModal();
                return;
            }
            
            showSuccess('Post atualizado com sucesso!');
        } else {
            await createPost(postData);
            showSuccess('Post criado com sucesso!');
        }
        
        createModal.classList.remove('active');
        resetCreateModal();
        await renderPosts();
    } catch (error) {
        showError(editingPostId ? 'Erro ao atualizar post. Tente novamente.' : 'Erro ao criar post. Tente novamente.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-read-more')) {
        const postId = e.target.dataset.postId;
        const post = await fetchPost(postId);
        if (post) {
            showPostDetail(post);
        }
    }

    if (e.target.closest('.btn-edit')) {
        const postId = e.target.closest('.btn-edit').dataset.postId;
        const post = await fetchPost(postId);
        if (post) {
            openEditModal(post);
        }
    }

    if (e.target.closest('.btn-delete')) {
        const postId = e.target.closest('.btn-delete').dataset.postId;
        postToDelete = postId;
        deleteConfirmModal.classList.add('active');
    }

    // Like button
    if (e.target.closest('.btn-like')) {
        e.stopPropagation();
        const btn = e.target.closest('.btn-like');
        const postId = btn.dataset.postId;
        const currentlyLiked = btn.classList.contains('liked'); // Verifica estado atual
        
        btn.disabled = true;
        
        try {
            const result = await toggleLike(postId, currentlyLiked);
            const countSpan = btn.querySelector('.interaction-count');
            countSpan.textContent = result.likesCount || 0;
            
            if (result.userLiked) {
                btn.classList.add('liked');
            } else {
                btn.classList.remove('liked');
            }
        } catch (error) {
            // Erro já tratado na função toggleLike
        } finally {
            btn.disabled = false;
        }
    }

    // Comment button
    if (e.target.closest('.btn-comment')) {
        e.stopPropagation();
        const btn = e.target.closest('.btn-comment');
        const postId = btn.dataset.postId;
        openCommentsModal(postId);
    }
});

let editingPostId = null;

function openEditModal(post) {
    editingPostId = post.postId;
    
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postContent').value = post.content;
    document.getElementById('postType').value = post.type;
    
    const submitBtn = createForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Atualizar Post';
    
    const modalTitle = createModal.querySelector('h2');
    modalTitle.textContent = 'Editar Post';
    
    viewModal.classList.remove('active');
    createModal.classList.add('active');
}

function resetCreateModal() {
    editingPostId = null;
    createForm.reset();
    
    const submitBtn = createForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Publicar';
    
    const modalTitle = createModal.querySelector('h2');
    modalTitle.textContent = 'Criar Novo Post';
}

async function checkEditParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const editPostId = urlParams.get('edit');
    
    if (editPostId) {
        const post = await fetchPost(editPostId);
        if (post) {
            openEditModal(post);
        }
        window.history.replaceState({}, '', '/posts');
    }
}

// ============== LIKES ==============

async function toggleLike(postId, currentlyLiked) {
    try {
        const liked = !currentlyLiked; // Inverte o estado atual
        const response = await fetch(`${BASE_URL}/v1/post/like/${postId}?liked=${liked}`, {
            method: 'PATCH',
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao processar like');
        }

        const data = await response.json();
        
        // Valida se likesFromPost está vazio (sem likes)
        const likesFromPost = data.likesFromPost || {};
        const likesCount = likesFromPost.likesCount !== undefined ? likesFromPost.likesCount : 0;
        const likes = likesFromPost.likes || [];
        const userLiked = likes.some(like => like.userId === userId);
        
        return { 
            likesCount, 
            userLiked 
        };
    } catch (error) {
        showError('Erro ao processar like');
        throw error;
    }
}

// ============== COMENTÁRIOS ==============

let currentPostIdForComments = null;
const commentsModal = document.getElementById('commentsModal');
const commentInput = document.getElementById('commentInput');
const submitCommentBtn = document.getElementById('submitCommentBtn');

async function getPostComments(postId) {
    try {
        const response = await fetch(`${BASE_URL}/v1/post/${postId}/comments`, {
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar comentários');
        }

        const data = await response.json();
        return data.comments || [];
    } catch (error) {
        console.error('Erro ao buscar comentários:', error);
        return [];
    }
}

async function addComment(postId, content) {
    try {
        const response = await fetch(`${BASE_URL}/v1/post/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            throw new Error('Erro ao adicionar comentário');
        }

        const data = await response.json();
        return data.comment;
    } catch (error) {
        showError('Erro ao adicionar comentário');
        throw error;
    }
}

async function deleteComment(commentId) {
    try {
        const response = await fetch(`${BASE_URL}/v1/comment/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao excluir comentário');
        }

        showSuccess('Comentário excluído com sucesso!');
    } catch (error) {
        showError('Erro ao excluir comentário');
        throw error;
    }
}

async function openCommentsModal(postId) {
    currentPostIdForComments = postId;
    commentsModal.classList.add('active');
    
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '<div class="loading-comments">Carregando comentários...</div>';
    
    const comments = await getPostComments(postId);
    renderComments(comments);
}

function renderComments(comments) {
    const commentsList = document.getElementById('commentsList');
    
    if (comments.length === 0) {
        commentsList.innerHTML = `
            <div class="empty-comments">
                <p>Nenhum comentário ainda</p>
                <small>Seja o primeiro a comentar!</small>
            </div>
        `;
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => {
        const isOwner = comment.userId === userId;
        const avatar = createAvatarElement(comment.userName || 'Usuário');
        
        return `
            <div class="comment-item" data-comment-id="${comment.commentId}">
                ${avatar}
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${comment.userName || 'Usuário'}</span>
                        <span class="comment-time">${formatRelativeTime(comment.createdAt)}</span>
                    </div>
                    <p class="comment-text">${escapeHtml(comment.content)}</p>
                    ${isOwner ? `
                        <div class="comment-actions">
                            <button class="comment-action-btn delete-comment-btn" data-comment-id="${comment.commentId}">
                                Excluir
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function formatRelativeTime(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'agora';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    
    return date.toLocaleDateString('pt-BR');
}

// Event listener para enviar comentário
submitCommentBtn.addEventListener('click', async () => {
    const content = commentInput.value.trim();
    
    if (!content) {
        showError('Digite um comentário');
        return;
    }
    
    if (!currentPostIdForComments) return;
    
    submitCommentBtn.disabled = true;
    submitCommentBtn.textContent = 'Enviando...';
    
    try {
        await addComment(currentPostIdForComments, content);
        commentInput.value = '';
        
        const comments = await getPostComments(currentPostIdForComments);
        renderComments(comments);
        
        // Atualiza contagem no card do post
        await renderPosts();
        
        showSuccess('Comentário adicionado!');
    } catch (error) {
        // Erro já tratado na função addComment
    } finally {
        submitCommentBtn.disabled = false;
        submitCommentBtn.textContent = 'Enviar';
    }
});

// Event listener para excluir comentário
document.getElementById('commentsList').addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-comment-btn')) {
        const commentId = e.target.dataset.commentId;
        
        if (confirm('Tem certeza que deseja excluir este comentário?')) {
            try {
                await deleteComment(commentId);
                const comments = await getPostComments(currentPostIdForComments);
                renderComments(comments);
                await renderPosts();
            } catch (error) {
                // Erro já tratado na função deleteComment
            }
        }
    }
});

// Fechar modal de comentários
const closeCommentsBtn = commentsModal.querySelector('.close-comments');
closeCommentsBtn.addEventListener('click', () => {
    commentsModal.classList.remove('active');
    currentPostIdForComments = null;
    commentInput.value = '';
});

commentsModal.addEventListener('click', (e) => {
    if (e.target === commentsModal) {
        commentsModal.classList.remove('active');
        currentPostIdForComments = null;
        commentInput.value = '';
    }
});

renderPosts().then(() => {
    checkEditParameter();
});
