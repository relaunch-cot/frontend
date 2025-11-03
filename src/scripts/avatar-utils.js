// avatar-utils.js - Funções utilitárias para avatares

/**
 * Cria um elemento de avatar com a primeira letra do nome ou imagem
 * @param {string} name - Nome do usuário
 * @param {string|null} imageUrl - URL da imagem de perfil (opcional)
 * @param {string} size - Tamanho do avatar: 'small' (35px), 'medium' (40px), 'large' (50px)
 * @returns {string} HTML do avatar
 */
function createAvatar(name, imageUrl = null, size = 'medium') {
    const sizeClass = size !== 'medium' ? ` avatar-${size}` : '';
    
    if (imageUrl && imageUrl.trim() !== '') {
        return `<img src="${imageUrl}" alt="${name}" class="avatar-img${sizeClass}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="avatar-letter${sizeClass}" style="display: none;">${name.charAt(0).toUpperCase()}</div>`;
    } else {
        return `<div class="avatar-letter${sizeClass}">${name.charAt(0).toUpperCase()}</div>`;
    }
}

/**
 * Atualiza um elemento de avatar existente
 * @param {HTMLElement} element - Elemento DOM do avatar
 * @param {string} name - Nome do usuário
 * @param {string|null} imageUrl - URL da imagem de perfil (opcional)
 */
function updateAvatar(element, name, imageUrl = null) {
    if (!element) return;
    
    // Limpa o conteúdo anterior
    element.innerHTML = '';
    
    if (imageUrl && imageUrl.trim() !== '') {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = name;
        img.className = 'avatar-img';
        
        const letter = document.createElement('div');
        letter.className = 'avatar-letter';
        letter.textContent = name.charAt(0).toUpperCase();
        letter.style.display = 'none';
        
        img.onerror = function() {
            img.style.display = 'none';
            letter.style.display = 'flex';
        };
        
        element.appendChild(img);
        element.appendChild(letter);
    } else {
        const letter = document.createElement('div');
        letter.className = 'avatar-letter';
        letter.textContent = name.charAt(0).toUpperCase();
        element.appendChild(letter);
    }
}

// Expõe as funções globalmente
window.createAvatar = createAvatar;
window.updateAvatar = updateAvatar;
