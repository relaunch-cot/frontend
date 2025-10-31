const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;

const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '../login/login.html';
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
        console.error('Erro ao decodificar token JWT:', e);
        return null;
    }
}

// Remove Bearer se presente antes de decodificar
const decodedToken = parseJwt(token.replace('Bearer ', ''));
const userId = decodedToken?.userId;

if (!userId) {
    localStorage.removeItem('token');
    window.location.href = '../login/login.html';
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
            originalData = {
                name: data.user.name || '',
                email: data.user.email || '',
                phone: data.user.settings?.phone || '',
                cpf: data.user.settings?.cpf || '',
                dateOfBirth: data.user.settings?.dateOfBirth || '',
                biography: data.user.settings?.biography || '',
                skills: data.user.settings?.skills || []
            };
            
            // Preencher os campos do formulário
            document.getElementById('name').value = originalData.name;
            document.getElementById('email').value = originalData.email;
            document.getElementById('telefone').value = originalData.phone;
            document.getElementById('cpf').value = originalData.cpf;
            document.getElementById('dataInput').value = originalData.dateOfBirth;
            document.getElementById('biografia').value = originalData.biography;
            document.getElementById('competencias').value = originalData.skills.join(', ');
            
            // Definir todos os campos como readonly
            ['name', 'email', 'telefone', 'cpf', 'dataInput', 'biografia', 'competencias'].forEach(id => {
                document.getElementById(id).readOnly = true;
            });
            
            // Atualizar preview das tags
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
    pendingChanges = { settings: {} };
    
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
        pendingChanges.settings.phone = currentData.phone;
    }
    
    if (currentData.cpf && currentData.cpf !== originalData.cpf) {
        changes.push(`CPF: ${currentData.cpf}`);
        pendingChanges.settings.cpf = currentData.cpf;
    }
    
    if (currentData.dateOfBirth && currentData.dateOfBirth !== originalData.dateOfBirth) {
        changes.push(`Data de Nascimento: ${new Date(currentData.dateOfBirth).toLocaleDateString('pt-BR')}`);
        pendingChanges.settings.dateOfBirth = currentData.dateOfBirth;
    }
    
    if (currentData.biography && currentData.biography !== originalData.biography) {
        changes.push(`Biografia: ${currentData.biography.substring(0, 50)}${currentData.biography.length > 50 ? '...' : ''}`);
        pendingChanges.settings.biography = currentData.biography;
    }
    
    if (currentData.skills.length > 0 && JSON.stringify(currentData.skills) !== JSON.stringify(originalData.skills)) {
        changes.push(`Competências: ${currentData.skills.join(', ')}`);
        pendingChanges.settings.skills = currentData.skills;
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
                window.location.href = "perfil.html";
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
