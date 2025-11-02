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

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;

    return date.toLocaleDateString('pt-BR', { 
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

        <div class="post-footer">
            <button class="btn-read-more" data-post-id="${post.postId}">Ler mais</button>
            <div class="post-actions">
                ${isAuthor ? `
                    <button class="btn-action btn-edit" data-post-id="${post.postId}" disabled title="Funcionalidade em breve">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16">
                            <path fill="currentColor" d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z"/>
                        </svg>
                        Editar
                    </button>
                    <button class="btn-action btn-delete" data-post-id="${post.postId}" disabled title="Funcionalidade em breve">
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
                <button class="btn-action btn-edit" disabled title="Funcionalidade em breve">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16">
                        <path fill="currentColor" d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7 .8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z"/>
                    </svg>
                    Editar Post
                </button>
                <button class="btn-action btn-delete" disabled title="Funcionalidade em breve">
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

function showError(message) {
    const badge = document.createElement('div');
    badge.className = 'error-badge';
    badge.textContent = message;
    document.body.appendChild(badge);
    
    setTimeout(() => {
        badge.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        badge.classList.remove('show');
        setTimeout(() => badge.remove(), 300);
    }, 3000);
}

function showSuccess(message) {
    const badge = document.createElement('div');
    badge.className = 'success-badge';
    badge.textContent = message;
    document.body.appendChild(badge);
    
    setTimeout(() => {
        badge.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        badge.classList.remove('show');
        setTimeout(() => badge.remove(), 300);
    }, 3000);
}

const createModal = document.getElementById('createPostModal');
const viewModal = document.getElementById('viewPostModal');
const createBtn = document.getElementById('createPostBtn');
const cancelBtn = document.getElementById('cancelBtn');
const closeButtons = document.querySelectorAll('.close');
const createForm = document.getElementById('createPostForm');

createBtn.addEventListener('click', () => {
    createModal.classList.add('active');
});

cancelBtn.addEventListener('click', () => {
    createModal.classList.remove('active');
    createForm.reset();
});

closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        createModal.classList.remove('active');
        viewModal.classList.remove('active');
        createForm.reset();
    });
});

window.addEventListener('click', (e) => {
    if (e.target === createModal) {
        createModal.classList.remove('active');
        createForm.reset();
    }
    if (e.target === viewModal) {
        viewModal.classList.remove('active');
    }
});

createForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = createForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publicando...';

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
        type: document.getElementById('postType').value,
        urlImagePost: imageUrl
    };

    try {
        await createPost(postData);
        showSuccess('Post criado com sucesso!');
        createModal.classList.remove('active');
        createForm.reset();
        await renderPosts();
    } catch (error) {
        showError('Erro ao criar post. Tente novamente.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publicar';
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
        showError('Funcionalidade de edição ainda não implementada');
    }

    if (e.target.closest('.btn-delete')) {
        showError('Funcionalidade de exclusão ainda não implementada');
    }
});

renderPosts();
