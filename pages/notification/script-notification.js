const BASE_URL = window.ENV_CONFIG.URL_BACKEND;
const token = localStorage.getItem('token');

// Extrai userId do token JWT
function getUserIdFromToken() {
    if (!token) return null;
    try {
        // Remove Bearer se presente antes de decodificar
        const tokenWithoutBearer = token.replace('Bearer ', '');
        const payload = JSON.parse(atob(tokenWithoutBearer.split('.')[1]));
        return payload.userId;
    } catch (error) {
        console.error('Erro ao decodificar token:', error);
        return null;
    }
}

// Busca todas as notificações do usuário
async function fetchNotifications() {
    const userId = getUserIdFromToken();
    if (!userId) {
        window.location.href = '../login/login.html';
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
        console.error('Erro ao buscar notificações:', error);
        showErrorBadge('Erro ao carregar notificações');
        return [];
    }
}

// Cria card de notificação baseado no tipo
function createNotificationCard(notification) {
    const card = document.createElement('div');
    card.className = `notification-card ${notification.type.toLowerCase().replace('_', '-')}`;
    card.dataset.notificationId = notification.notificationId;
    card.dataset.senderId = notification.senderId;
    
    // Extrai projectId do conteúdo se for PROJECT_REQUEST
    let projectId = null;
    if (notification.type === 'PROJECT_REQUEST' && notification.content) {
        // Tenta encontrar o projectId no formato: "ID do Projeto: <id>"
        // Aceita tanto números quanto UUIDs
        const match = notification.content.match(/ID do Projeto:\s*([a-zA-Z0-9\-]+)/);
        if (match) {
            projectId = match[1];
            console.log('ProjectId extraído da notificação:', projectId);
        } else {
            console.warn('Não foi possível extrair projectId do conteúdo:', notification.content);
        }
    }
    if (projectId) {
        card.dataset.projectId = projectId;
    }

    // Ícone baseado no tipo de notificação
    const icon = getNotificationIcon(notification.type);
    
    // Formata timestamp
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

// Retorna ícone SVG baseado no tipo de notificação
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

// Cria botões de ação baseado no tipo de notificação
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

    // Para outros tipos de notificação, adiciona botão de deletar
    return `
        <button class="btn-delete" onclick="deleteNotification('${notification.notificationId}')">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor"><path d="M135.2 17.7L128 32 32 32C14.3 32 0 46.3 0 64S14.3 96 32 96l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0-7.2-14.3C307.4 6.8 296.3 0 284.2 0L163.8 0c-12.1 0-23.2 6.8-28.6 17.7zM416 128L32 128 53.2 467c1.6 25.3 22.6 45 47.9 45l245.8 0c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>
            Remover
        </button>
    `;
}

// Formata timestamp para exibição amigável
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

// Renderiza todas as notificações
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
        return;
    }

    emptyMessage.style.display = 'none';
    container.style.display = 'block';
    container.innerHTML = '';
    if (clearAllBtn) clearAllBtn.style.display = 'flex';

    // Ordena notificações por data (mais recentes primeiro)
    const sortedNotifications = notifications.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    console.log('Notificações recebidas:', sortedNotifications);
    
    sortedNotifications.forEach(notification => {
        console.log('Processando notificação:', notification);
        const card = createNotificationCard(notification);
        container.appendChild(card);
    });
}

// Aceita solicitação de projeto
async function acceptRequest(notificationId, freelancerId) {
    try {
        const card = document.querySelector(`[data-notification-id="${notificationId}"]`);
        
        if (!card) {
            console.error('Card não encontrado para notificationId:', notificationId);
            showErrorBadge('Notificação não encontrada');
            return;
        }
        
        const projectId = card.dataset.projectId;
        console.log('Dados do card:', {
            notificationId,
            freelancerId,
            projectId,
            allDatasets: card.dataset
        });
        
        if (!projectId) {
            showErrorBadge('Projeto não encontrado na notificação');
            console.error('Card datasets:', card.dataset);
            return;
        }

        // 1. Adiciona freelancer ao projeto
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

        // 2. Envia notificação de aceitação para o freelancer
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

        // 3. Deleta a notificação original
        await fetch(`${BASE_URL}/v1/notification/${notificationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token
            }
        });

        // 4. Remove card da página
        card.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            card.remove();
            
            // Verifica se ainda há notificações
            const remaining = document.querySelectorAll('.notification-card');
            if (remaining.length === 0) {
                document.getElementById('empty-message').style.display = 'flex';
                document.getElementById('notifications-container').style.display = 'none';
            }
        }, 300);

        showSuccessBadge('Solicitação aceita com sucesso!');
    } catch (error) {
        console.error('Erro ao aceitar solicitação:', error);
        showErrorBadge('Erro ao processar solicitação');
    }
}

// Rejeita solicitação de projeto
async function rejectRequest(notificationId, freelancerId) {
    try {
        const card = document.querySelector(`[data-notification-id="${notificationId}"]`);
        
        if (!card) {
            console.error('Card não encontrado para notificationId:', notificationId);
            showErrorBadge('Notificação não encontrada');
            return;
        }
        
        const projectId = card.dataset.projectId;
        
        if (!projectId) {
            showErrorBadge('Projeto não encontrado na notificação');
            return;
        }

        // 1. Envia notificação de rejeição para o freelancer
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

        // 2. Deleta a notificação original
        await fetch(`${BASE_URL}/v1/notification/${notificationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token
            }
        });

        // 3. Remove card da página
        card.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            card.remove();
            
            // Verifica se ainda há notificações
            const remaining = document.querySelectorAll('.notification-card');
            if (remaining.length === 0) {
                document.getElementById('empty-message').style.display = 'flex';
                document.getElementById('notifications-container').style.display = 'none';
            }
        }, 300);

        showSuccessBadge('Solicitação recusada');
    } catch (error) {
        console.error('Erro ao recusar solicitação:', error);
        showErrorBadge('Erro ao processar solicitação');
    }
}

// Deleta uma notificação específica
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

        // Remove card da página
        const card = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (card) {
            card.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                card.remove();
                
                // Verifica se ainda há notificações
                const remaining = document.querySelectorAll('.notification-card');
                if (remaining.length === 0) {
                    document.getElementById('empty-message').style.display = 'flex';
                    document.getElementById('notifications-container').style.display = 'none';
                }
            }, 300);
        }

        showSuccessBadge('Notificação removida');
    } catch (error) {
        console.error('Erro ao deletar notificação:', error);
        showErrorBadge('Erro ao remover notificação');
    }
}

// Deleta todas as notificações do usuário
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

        // Limpa o container
        const container = document.getElementById('notifications-container');
        container.innerHTML = '';
        
        // Mostra mensagem de vazio
        document.getElementById('empty-message').style.display = 'flex';
        document.getElementById('notifications-container').style.display = 'none';

        showSuccessBadge('Todas as notificações foram removidas');
    } catch (error) {
        console.error('Erro ao deletar todas as notificações:', error);
        showErrorBadge('Erro ao remover notificações');
    }
}

// Inicia chat com o usuário
async function startChat(userId) {
    try {
        const currentUserId = getUserIdFromToken();
        
        // Busca informações do usuário para obter o nome
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
            console.error('Erro ao buscar informações do usuário:', error);
        }
        
        // 1. Tenta criar o chat
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
            // Chat criado com sucesso
            const data = await response.json();
            chatId = data.chatId;
            showSuccessBadge('Chat criado com sucesso!');
            
            // Redireciona para o chat específico
            setTimeout(() => {
                window.location.href = `../project-chat/project-chat.html?chatId=${chatId}&contactName=${encodeURIComponent(contactName)}`;
            }, 1000);
        } else {
            const errorText = await response.text();
            console.log('Resposta do servidor:', errorText);
            
            // 2. Se chat já existe, busca pelo endpoint específico
            if (errorText.includes('already exists') || errorText.includes('AlreadyExists')) {
                showSuccessBadge('Redirecionando para o chat...');
                
                // Busca chat pelos userIds usando query params
                const chatsResponse = await fetch(
                    `${BASE_URL}/v1/chat/users?user1Id=${currentUserId}&user2Id=${userId}`,
                    {
                        headers: { 'Authorization': token }
                    }
                );
                
                if (chatsResponse.ok) {
                    const chatData = await chatsResponse.json();
                    console.log('Chat encontrado:', chatData);
                    
                    if (chatData && chatData.chat && chatData.chat.chatId) {
                        chatId = chatData.chat.chatId;
                        
                        // Identifica o nome do outro usuário do chat
                        const otherUser = chatData.chat.user1.userId === currentUserId 
                            ? chatData.chat.user2 
                            : chatData.chat.user1;
                        const otherUserName = otherUser.name || 'Contato';
                        
                        // Redireciona para o chat específico
                        setTimeout(() => {
                            window.location.href = `../project-chat/project-chat.html?chatId=${chatId}&contactName=${encodeURIComponent(otherUserName)}`;
                        }, 1000);
                    } else {
                        console.error('Chat não encontrado na resposta');
                        setTimeout(() => {
                            showErrorBadge('Chat não encontrado');
                        }, 3300);
                    }
                } else {
                    console.error('Erro ao buscar chat pelos userIds');
                    setTimeout(() => {
                        showErrorBadge('Erro ao buscar chat');
                    }, 3300);
                }
            } else {
                showErrorBadge('Erro ao criar chat');
            }
        }
        
    } catch (error) {
        console.error('Erro ao iniciar chat:', error);
        showErrorBadge('Erro ao iniciar chat');
    }
}

// Visualiza perfil do freelancer
function viewFreelancerProfile(userId) {
    window.location.href = `../perfil/perfil.html?userId=${userId}`;
}

// Mostra badge de sucesso
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

// Mostra badge de erro
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

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Verifica autenticação
    if (!token) {
        window.location.href = '../login/login.html';
        return;
    }

    // Carrega notificações
    const notifications = await fetchNotifications();
    renderNotifications(notifications);
});
