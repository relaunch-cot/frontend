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
const userId = decodedToken?.userId;

if (!userId) {
    localStorage.removeItem('token');
    window.location.href = '/login';
}



document.getElementById("telefone").addEventListener("input", function () {
    let v = this.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/^(\d{2})(\d)/, "($1)$2");
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
    this.value = v;
});

document.getElementById("cpf").addEventListener("input", function () {
    let v = this.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/^(\d{3})(\d)/, "$1.$2");
    v = v.replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
    this.value = v;
});

const competenciasInput = document.getElementById('competencias');
const tagsPreview = document.getElementById('tagsPreview');

function updateTagsPreview() {
    const tags = competenciasInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    tagsPreview.innerHTML = '';
    
    tags.forEach((tag, index) => {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag-item';
        tagElement.innerHTML = `
            ${tag}
            <button type="button" class="tag-remove" onclick="removeTag(${index})">&times;</button>
        `;
        tagsPreview.appendChild(tagElement);
    });
}

function removeTag(index) {
    const tags = competenciasInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    tags.splice(index, 1);
    competenciasInput.value = tags.join(', ');
    updateTagsPreview();
}

competenciasInput.addEventListener('input', updateTagsPreview);

let originalData = {};
let currentProfileImage = null;
let profileImageChanged = false;

// Compress image before upload (more aggressive compression)
function compressImage(file, maxWidth = 400, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calculate new dimensions maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width = Math.round((width * maxWidth) / height);
                        height = maxWidth;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64 with more compression
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Handle profile image upload
document.getElementById('profileImage').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (file) {
        try {
            // Check file size (limit to 5MB before compression)
            if (file.size > 5 * 1024 * 1024) {
                showError('Imagem muito grande. Por favor, escolha uma imagem menor que 5MB.');
                this.value = '';
                return;
            }
            
            // Compress image before storing
            currentProfileImage = await compressImage(file, 400, 0.7);
            profileImageChanged = true;
            
            const imgElement = document.getElementById('currentProfileImage');
            const placeholder = document.querySelector('.profile-image-placeholder');
            
            imgElement.src = currentProfileImage;
            imgElement.style.display = 'block';
            placeholder.style.display = 'none';
            
            document.getElementById('removeImageBtn').style.display = 'flex';
        } catch (error) {
            showError('Erro ao processar imagem. Tente outra imagem.');
            this.value = '';
        }
    }
});

function removeProfileImage() {
    currentProfileImage = null;
    profileImageChanged = true;
    
    const imgElement = document.getElementById('currentProfileImage');
    const placeholder = document.querySelector('.profile-image-placeholder');
    
    imgElement.style.display = 'none';
    placeholder.style.display = 'flex';
    
    document.getElementById('profileImage').value = '';
    document.getElementById('removeImageBtn').style.display = 'none';
}

async function loadUserData() {
    try {
        const response = await fetch(`${BASE_URL}/v1/user/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar dados do usuário');
        }

        const data = await response.json();
        
        if (data.user) {
            if (typeof window.updateHeaderProfile === 'function') {
                window.updateHeaderProfile(data.user);
            }
            
            originalData = {
                name: data.user.name || '',
                email: data.user.email || '',
                phone: data.user.settings?.phone || '',
                cpf: data.user.settings?.cpf || '',
                dateOfBirth: data.user.settings?.dateOfBirth || '',
                biography: data.user.settings?.biography || '',
                skills: data.user.settings?.skills || [],
                UrlImageUser: data.user.UrlImageUser || ''
            };
            
            // Load profile image if exists
            if (originalData.UrlImageUser) {
                const imgElement = document.getElementById('currentProfileImage');
                const placeholder = document.querySelector('.profile-image-placeholder');
                
                imgElement.src = originalData.UrlImageUser;
                imgElement.style.display = 'block';
                placeholder.style.display = 'none';
                
                document.getElementById('removeImageBtn').style.display = 'flex';
                currentProfileImage = originalData.urlImageUser;
            }
            
            document.getElementById('name').value = originalData.name;
            document.getElementById('email').value = originalData.email;
            document.getElementById('telefone').value = originalData.phone;
            document.getElementById('cpf').value = originalData.cpf;
            document.getElementById('dataInput').value = originalData.dateOfBirth;
            document.getElementById('biografia').value = originalData.biography;
            document.getElementById('competencias').value = originalData.skills.join(', ');
            
            ['name', 'email', 'telefone', 'cpf', 'dataInput', 'biografia', 'competencias'].forEach(id => {
                document.getElementById(id).readOnly = true;
            });
            
            updateTagsPreview();
        }
    } catch (error) {
        showError('Erro ao carregar dados do perfil');
    }
}

const editProfileForm = document.getElementById('editProfileForm');

let pendingChanges = {};

editProfileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const currentData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('telefone').value.trim(),
        cpf: document.getElementById('cpf').value.trim(),
        dateOfBirth: document.getElementById('dataInput').value.trim(),
        biography: document.getElementById('biografia').value.trim(),
        skills: document.getElementById('competencias').value.split(',').map(s => s.trim()).filter(s => s)
    };
    
    const changes = [];
    pendingChanges = {};
    
    // Check for profile image changes
    if (profileImageChanged) {
        if (currentProfileImage && currentProfileImage !== originalData.UrlImageUser) {
            changes.push('Foto de perfil: Nova imagem');
            pendingChanges.UrlImageUser = currentProfileImage;
        } else if (!currentProfileImage && originalData.UrlImageUser) {
            changes.push('Foto de perfil: Removida');
            pendingChanges.UrlImageUser = '';
        }
    }
    
    // Initialize settings object only if needed
    let hasSettingsChanges = false;
    const settingsChanges = {};
    
    if (currentData.name && currentData.name !== originalData.name) {
        changes.push(`Nome: ${currentData.name}`);
        pendingChanges.name = currentData.name;
    }
    
    if (currentData.email && currentData.email !== originalData.email) {
        changes.push(`Email: ${currentData.email}`);
        pendingChanges.email = currentData.email;
    }
    
    if (currentData.phone && currentData.phone !== originalData.phone) {
        changes.push(`Telefone: ${currentData.phone}`);
        settingsChanges.phone = currentData.phone;
        hasSettingsChanges = true;
    }
    
    if (currentData.cpf && currentData.cpf !== originalData.cpf) {
        changes.push(`CPF: ${currentData.cpf}`);
        settingsChanges.cpf = currentData.cpf;
        hasSettingsChanges = true;
    }
    
    if (currentData.dateOfBirth && currentData.dateOfBirth !== originalData.dateOfBirth) {
        // Formata a data corretamente sem problemas de timezone
        const [year, month, day] = currentData.dateOfBirth.split('-');
        const formattedDate = `${day}/${month}/${year}`;
        changes.push(`Data de Nascimento: ${formattedDate}`);
        settingsChanges.dateOfBirth = currentData.dateOfBirth;
        hasSettingsChanges = true;
    }
    
    if (currentData.biography && currentData.biography !== originalData.biography) {
        changes.push(`Biografia: ${currentData.biography.substring(0, 50)}${currentData.biography.length > 50 ? '...' : ''}`);
        settingsChanges.biography = currentData.biography;
        hasSettingsChanges = true;
    }
    
    if (currentData.skills.length > 0 && JSON.stringify(currentData.skills) !== JSON.stringify(originalData.skills)) {
        changes.push(`Competências: ${currentData.skills.join(', ')}`);
        settingsChanges.skills = currentData.skills;
        hasSettingsChanges = true;
    }
    
    // Add settings to pendingChanges only if there are changes
    if (hasSettingsChanges) {
        pendingChanges.settings = settingsChanges;
    }
    
    if (changes.length === 0) {
        showError('Nenhuma alteração foi feita.');
        return;
    }
    
    document.getElementById('changesList').innerHTML = changes.map(change => `<p>• ${change}</p>`).join('');
    document.getElementById('confirmModal').style.display = 'block';
});

function closeModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

async function confirmChanges() {
    try {
        const response = await fetch(`${BASE_URL}/v1/user/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pendingChanges)
        });

        const data = await response.json();

        if (response.ok) {
            closeModal();
            showSuccess("Perfil atualizado com sucesso!");
            setTimeout(() => {
                window.location.href = "/perfil";
            }, 2000);
        } else {
            closeModal();
            showError("Não foi possível atualizar o perfil. Verifique os dados e tente novamente.");
        }
    } catch (error) {
        closeModal();
        showError("Erro de conexão. Tente novamente.");
    }
}

function toggleEdit(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field.parentElement.querySelector('.edit-btn');
    
    if (field.readOnly) {
        field.readOnly = false;
        field.focus();
        button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
        button.classList.add('editing');
    } else {
        field.readOnly = true;
        button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
        button.classList.remove('editing');
    }
}

document.addEventListener('DOMContentLoaded', loadUserData);
