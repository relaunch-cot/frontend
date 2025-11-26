const BASE_URL = window.ENV_CONFIG.URL_BACKEND;
const token = localStorage.getItem('token');

function getUserIdFromToken() {
    if (!token) return null;
    try {
        const tokenWithoutBearer = token.replace('Bearer ', '');
        const payload = JSON.parse(atob(tokenWithoutBearer.split('.')[1]));
        return payload.userId;
    } catch (error) {
        return null;
    }
}

async function fetchNotifications() {
    const userId = getUserIdFromToken();
    if (!userId) {
        window.location.href = '/login';
        return [];
    }

    try {
        const response = await fetch(`${BASE_URL}/v1/notification/user/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar notificações');
        }

        const data = await response.json();
        return data.notifications || [];
    } catch (error) {
        showErrorBadge('Erro ao carregar notificações');
        return [];
    }
}

function createNotificationCard(notification) {
    const card = document.createElement('div');
    card.className = `notification-card ${notification.type.toLowerCase().replace('_', '-')}`;
    card.dataset.notificationId = notification.notificationId;
    card.dataset.senderId = notification.senderId;
    
    let projectId = null;
    if (notification.type === 'PROJECT_REQUEST' && notification.content) {
        const match = notification.content.match(/ID do Projeto:\s*([a-zA-Z0-9\-]+)/);
        if (match) {
            projectId = match[1];
        }
    }
    if (projectId) {
        card.dataset.projectId = projectId;
    }

    const icon = getNotificationIcon(notification.type);
    
    const timestamp = formatTimestamp(notification.createdAt);

    card.innerHTML = `
        <div class="notification-icon">
            ${icon}
        </div>
        <div class="notification-content">
            <h3 class="notification-title">${notification.title}</h3>
            <p class="notification-message">${notification.content}</p>
            <span class="notification-time">${timestamp}</span>
        </div>
        <div class="notification-actions">
            ${createActionButtons(notification)}
        </div>
    `;

    return card;
}

function getNotificationIcon(type) {
    const icons = {
        'PROJECT_REQUEST': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="#46B1D5"><path d="M64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-288-128 0c-17.7 0-32-14.3-32-32L224 0 64 0zM256 0l0 128 128 0L256 0zM112 256l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64l160 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-160 0c-8.8 0-16-7.2-16-16s7.2-16 16-16z"/></svg>`,
        'PROJECT_ACCEPTED': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="#27AE60"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>`,
        'PROJECT_REJECTED': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="#E74C3C"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>`,
        'CHAT_MESSAGE': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="#3498DB"><path d="M256 448c141.4 0 256-93.1 256-208S397.4 32 256 32S0 125.1 0 240c0 45.1 17.7 86.8 47.7 120.9c-1.9 24.5-11.4 46.3-21.4 62.9c-5.5 9.2-11.1 16.6-15.2 21.6c-2.1 2.5-3.7 4.4-4.9 5.7c-.6 .6-1 1.1-1.3 1.4l-.3 .3c0 0 0 0 0 0c0 0 0 0 0 0s0 0 0 0s0 0 0 0c-4.6 4.6-5.9 11.4-3.4 17.4c2.5 6 8.3 9.9 14.8 9.9c28.7 0 57.6-8.9 81.6-19.3c22.9-10 42.4-21.9 54.3-30.6c31.8 11.5 67 17.9 104.1 17.9z"/></svg>`,
        'PAYMENT_PENDING': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="#F39C12"><path d="M312 24l0 10.5c6.4 1.2 12.6 2.7 18.2 4.2c12.8 3.4 20.4 16.6 17 29.4s-16.6 20.4-29.4 17c-10.9-2.9-21.1-4.9-30.2-5c-7.3-.1-14.7 1.7-19.4 4.4c-2.1 1.3-3.1 2.4-3.5 3c-.3 .5-.7 1.2-.7 2.8c0 .3 0 .5 0 .6c.2 .2 .9 1.2 3.3 2.6c5.8 3.5 14.4 6.2 27.4 10.1l.9 .3s0 0 0 0c11.1 3.3 25.9 7.8 37.9 15.3c13.7 8.6 26.1 22.9 26.4 44.9c.3 22.5-11.4 38.9-26.7 48.5c-6.7 4.1-13.9 7-21.3 8.8l0 10.6c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-11.4c-9.5-2.3-18.2-5.3-25.6-7.8c0 0 0 0 0 0c-2.1-.7-4.1-1.4-6-2c-12.6-4.2-19.4-17.8-15.2-30.4s17.8-19.4 30.4-15.2c2.6 .9 5 1.7 7.3 2.5c13.6 4.6 23.4 7.9 33.9 8.3c8 .3 15.1-1.6 19.2-4.1c1.9-1.2 2.8-2.2 3.2-2.9c.4-.6 .9-1.8 .8-4.1l0-.2c0-1 0-2.1-4-4.6c-5.7-3.6-14.3-6.4-27.1-10.3l-1.9-.6c-10.8-3.2-25-7.5-36.4-14.4c-13.5-8.1-26.5-22-26.6-44.1c-.1-22.9 12.9-38.6 27.7-47.4c6.4-3.8 13.3-6.4 20.2-8.2L264 24c0-13.3 10.7-24 24-24s24 10.7 24 24zM568.2 336.3c13.1 17.8 9.3 42.8-8.5 55.9L433.1 485.5c-23.4 17.2-51.6 26.5-80.7 26.5L192 512 32 512c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l36.8 0 44.9-36c22.7-18.2 50.9-28 80-28l78.3 0 16 0 64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0-16 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l120.6 0 119.7-88.2c17.8-13.1 42.8-9.3 55.9 8.5zM193.6 384c0 0 0 0 0 0l-.9 0c.3 0 .6 0 .9 0z"/></svg>`,
        'DEADLINE_APPROACHING': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="#E67E22"><path d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120l0 136c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2 280 120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg>`
    };

    return icons[type] || icons['PROJECT_REQUEST'];
}

function createActionButtons(notification) {
    if (notification.type === 'PROJECT_REQUEST') {
        return `
            <button class="btn-accept" onclick="acceptRequest('${notification.notificationId}', '${notification.senderId}')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor"><path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg>
                Aceitar
            </button>
            <button class="btn-reject" onclick="rejectRequest('${notification.notificationId}', '${notification.senderId}')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="currentColor"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>
                Recusar
            </button>
            <button class="btn-profile" onclick="viewFreelancerProfile('${notification.senderId}')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor"><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512l388.6 0c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304l-91.4 0z"/></svg>
                Ver Perfil
            </button>
            <button class="btn-chat" onclick="startChat('${notification.senderId}')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor"><path d="M256 448c141.4 0 256-93.1 256-208S397.4 32 256 32S0 125.1 0 240c0 45.1 17.7 86.8 47.7 120.9c-1.9 24.5-11.4 46.3-21.4 62.9c-5.5 9.2-11.1 16.6-15.2 21.6c-2.1 2.5-3.7 4.4-4.9 5.7c-.6 .6-1 1.1-1.3 1.4l-.3 .3c0 0 0 0 0 0c0 0 0 0 0 0s0 0 0 0s0 0 0 0c-4.6 4.6-5.9 11.4-3.4 17.4c2.5 6 8.3 9.9 14.8 9.9c28.7 0 57.6-8.9 81.6-19.3c22.9-10 42.4-21.9 54.3-30.6c31.8 11.5 67 17.9 104.1 17.9z"/></svg>
                Iniciar Chat
            </button>
        `;
    }

    return `
        <button class="btn-delete" onclick="deleteNotification('${notification.notificationId}')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor"><path d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>
            Remover
        </button>
    `;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function renderNotifications(notifications) {
    const container = document.getElementById('notifications-container');
    const emptyMessage = document.getElementById('empty-message');
    const loadingMessage = document.getElementById('loading-message');

    loadingMessage.style.display = 'none';
    
    const clearAllBtn = document.getElementById('clear-all-btn');
    
    if (!notifications || notifications.length === 0) {
        emptyMessage.style.display = 'flex';
        container.style.display = 'none';
        if (clearAllBtn) clearAllBtn.style.display = 'none';
        
        if (typeof updateBadgeCount === 'function') {
            updateBadgeCount(0);
        }
        return;
    }

    emptyMessage.style.display = 'none';
    container.style.display = 'block';
    container.innerHTML = '';
    if (clearAllBtn) clearAllBtn.style.display = 'flex';

    const sortedNotifications = notifications.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    sortedNotifications.forEach(notification => {
        const card = createNotificationCard(notification);
        container.appendChild(card);
    });
    
    if (typeof updateBadgeCount === 'function') {
        updateBadgeCount(notifications.length);
    }
}

async function acceptRequest(notificationId, freelancerId) {
    try {
        const card = document.querySelector(`[data-notification-id="${notificationId}"]`);
        
        if (!card) {
            showErrorBadge('Notificação não encontrada');
            return;
        }
        
        const projectId = card.dataset.projectId;
        
        if (!projectId) {
            showErrorBadge('Projeto não encontrado na notificação');
            return;
        }

        const addResponse = await fetch(`${BASE_URL}/v1/project/add-freelancer/${projectId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ freelancerId })
        });

        if (!addResponse.ok) {
            throw new Error('Erro ao adicionar freelancer ao projeto');
        }

        const clientId = getUserIdFromToken();
        await fetch(`${BASE_URL}/v1/notification/${clientId}`, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                receiverId: freelancerId,
                title: 'Solicitação Aceita!',
                content: 'Sua solicitação para participar do projeto foi aceita. Você pode começar a trabalhar!',
                type: 'PROJECT_ACCEPTED'
            })
        });

        await fetch(`${BASE_URL}/v1/notification/${notificationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token
            }
        });

        card.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            card.remove();
            
            const remaining = document.querySelectorAll('.notification-card');
            if (remaining.length === 0) {
                document.getElementById('empty-message').style.display = 'flex';
                document.getElementById('notifications-container').style.display = 'none';
            }
            
            if (typeof updateBadgeCount === 'function') {
                updateBadgeCount(remaining.length);
            }
        }, 300);

        showSuccessBadge('Solicitação aceita com sucesso!');
    } catch (error) {
        showErrorBadge('Erro ao processar solicitação');
    }
}

async function rejectRequest(notificationId, freelancerId) {
    try {
        const card = document.querySelector(`[data-notification-id="${notificationId}"]`);
        
        if (!card) {
            showErrorBadge('Notificação não encontrada');
            return;
        }
        
        const projectId = card.dataset.projectId;
        
        if (!projectId) {
            showErrorBadge('Projeto não encontrado na notificação');
            return;
        }

        const clientId = getUserIdFromToken();
        await fetch(`${BASE_URL}/v1/notification/${clientId}`, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                receiverId: freelancerId,
                title: 'Solicitação Recusada',
                content: 'Sua solicitação para participar do projeto foi recusada.',
                type: 'PROJECT_REJECTED'
            })
        });

        await fetch(`${BASE_URL}/v1/notification/${notificationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token
            }
        });

        card.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            card.remove();
            
            const remaining = document.querySelectorAll('.notification-card');
            if (remaining.length === 0) {
                document.getElementById('empty-message').style.display = 'flex';
                document.getElementById('notifications-container').style.display = 'none';
            }
            
            if (typeof updateBadgeCount === 'function') {
                updateBadgeCount(remaining.length);
            }
        }, 300);

        showSuccessBadge('Solicitação recusada');
    } catch (error) {
        showErrorBadge('Erro ao processar solicitação');
    }
}

async function deleteNotification(notificationId) {
    try {
        const response = await fetch(`${BASE_URL}/v1/notification/${notificationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao deletar notificação');
        }

        const card = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (card) {
            card.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                card.remove();
                
                const remaining = document.querySelectorAll('.notification-card');
                if (remaining.length === 0) {
                    document.getElementById('empty-message').style.display = 'flex';
                    document.getElementById('notifications-container').style.display = 'none';
                }
                
                if (typeof updateBadgeCount === 'function') {
                    updateBadgeCount(remaining.length);
                }
            }, 300);
        }

        showSuccessBadge('Notificação removida');
    } catch (error) {
        showErrorBadge('Erro ao remover notificação');
    }
}

async function deleteAllNotifications() {
    try {
        const userId = getUserIdFromToken();
        
        if (!userId) {
            showErrorBadge('Usuário não autenticado');
            return;
        }

        const response = await fetch(`${BASE_URL}/v1/notification/user/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao deletar todas as notificações');
        }

        const container = document.getElementById('notifications-container');
        container.innerHTML = '';
        
        document.getElementById('empty-message').style.display = 'flex';
        document.getElementById('notifications-container').style.display = 'none';
        
        if (typeof updateBadgeCount === 'function') {
            updateBadgeCount(0);
        }

        showSuccessBadge('Todas as notificações foram removidas');
    } catch (error) {
        showErrorBadge('Erro ao remover notificações');
    }
}

async function startChat(userId) {
    try {
        const currentUserId = getUserIdFromToken();
        
        let contactName = 'Contato';
        try {
            const userResponse = await fetch(`${BASE_URL}/v1/user/${userId}`, {
                headers: { 'Authorization': token }
            });
            if (userResponse.ok) {
                const userData = await userResponse.json();
                contactName = userData.name || 'Contato';
            }
        } catch (error) {
        }
        
        const response = await fetch(`${BASE_URL}/v1/chat`, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userIds: [currentUserId, userId],
                createdBy: currentUserId
            })
        });

        let chatId = null;

        if (response.ok) {
            const data = await response.json();
            chatId = data.chatId;
            showSuccessBadge('Chat criado com sucesso!');
            
            setTimeout(() => {
                window.location.href = `/chat?chatId=${chatId}&contactName=${encodeURIComponent(contactName)}`;
            }, 1000);
        } else {
            const errorText = await response.text();
            
            if (errorText.includes('already exists') || errorText.includes('AlreadyExists')) {
                showSuccessBadge('Redirecionando para o chat...');
                
                const chatsResponse = await fetch(
                    `${BASE_URL}/v1/chat/users?user1Id=${currentUserId}&user2Id=${userId}`,
                    {
                        headers: { 'Authorization': token }
                    }
                );
                
                if (chatsResponse.ok) {
                    const chatData = await chatsResponse.json();
                    
                    if (chatData && chatData.chat && chatData.chat.chatId) {
                        chatId = chatData.chat.chatId;
                        
                        const otherUser = chatData.chat.user1.userId === currentUserId 
                            ? chatData.chat.user2 
                            : chatData.chat.user1;
                        const otherUserName = otherUser.name || 'Contato';
                        const otherUserProfileImageUrl = chatData.chat.otherUserProfileImageUrl;
                        
                        setTimeout(() => {
                            window.location.href = `/chat?chatId=${chatId}&contactName=${encodeURIComponent(otherUserName)}&contactUserId=${otherUser.userId}`;
                        }, 1000);
                    } else {
                        setTimeout(() => {
                            showErrorBadge('Chat não encontrado');
                        }, 3300);
                    }
                } else {
                    setTimeout(() => {
                        showErrorBadge('Erro ao buscar chat');
                    }, 3300);
                }
            } else {
                showErrorBadge('Erro ao criar chat');
            }
        }
        
    } catch (error) {
        showErrorBadge('Erro ao iniciar chat');
    }
}

function viewFreelancerProfile(userId) {
    window.location.href = `/perfil?userId=${userId}`;
}

function showSuccessBadge(message) {
    const badge = document.createElement('div');
    badge.className = 'success-badge';
    badge.textContent = message;
    document.body.appendChild(badge);
    
    setTimeout(() => badge.classList.add('show'), 10);
    setTimeout(() => {
        badge.classList.remove('show');
        setTimeout(() => badge.remove(), 300);
    }, 3000);
}

function showErrorBadge(message) {
    const badge = document.createElement('div');
    badge.className = 'error-badge';
    badge.textContent = message;
    document.body.appendChild(badge);
    
    setTimeout(() => badge.classList.add('show'), 10);
    setTimeout(() => {
        badge.classList.remove('show');
        setTimeout(() => badge.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const notifications = await fetchNotifications();
    renderNotifications(notifications);
    
    window.addEventListener('newNotification', async () => {
        const updatedNotifications = await fetchNotifications();
        renderNotifications(updatedNotifications);
    });
    
    window.addEventListener('notificationDeleted', async (event) => {
        const { notificationId } = event.detail;
        
        const card = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (card) {
            card.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                card.remove();
                
                const remaining = document.querySelectorAll('.notification-card');
                if (remaining.length === 0) {
                    document.getElementById('empty-message').style.display = 'flex';
                    document.getElementById('notifications-container').style.display = 'none';
                }
                
                if (typeof updateBadgeCount === 'function') {
                    updateBadgeCount(remaining.length);
                }
            }, 300);
        }
    });
});
