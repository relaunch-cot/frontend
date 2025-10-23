document.querySelectorAll('.ent input').forEach(input => {
    const ent = input.parentElement;
    function checkInput() {
        if (input.value.trim() !== "") {
            ent.classList.add('filled');
        } else {
            ent.classList.remove('filled');
        }
    }
    input.addEventListener('input', checkInput);
    window.addEventListener('DOMContentLoaded', checkInput);
});
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');

togglePassword.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePassword.classList.toggle('active');
});

const dateInput = document.getElementById('dataInput');

function updateVisibility() {
    if (dateInput.value || dateInput === document.activeElement) {
        dateInput.classList.add('visible');
    } else {
        dateInput.classList.remove('visible');
    }
}

updateVisibility();
dateInput.addEventListener('input', updateVisibility);
dateInput.addEventListener('focus', updateVisibility);
dateInput.addEventListener('blur', updateVisibility);


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

const form = document.getElementById("registerForm");
const responseDiv = document.getElementById("response");
let selectedUserType = 'freelancer';

const submitButtons = document.querySelectorAll('#submit button');
submitButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        selectedUserType = button.textContent.toLowerCase() === 'cliente' ? 'client' : 'freelancer';
        submitForm();
    });
});

async function submitForm() {
    const passwordEl = document.getElementById('password');
    const confirmPasswordEl = document.getElementById('confirmPassword');
    
    if (passwordEl.value !== confirmPasswordEl.value) {
        showError("As senhas não coincidem.");
        return;
    }
    
    const password = passwordEl.value;
    
    if (password.length < 8) {
        showError("A senha deve ter pelo menos 8 caracteres.");
        return;
    }
    
    if (!/[A-Z]/.test(password)) {
        showError("A senha deve conter pelo menos uma letra maiúscula.");
        return;
    }
    
    if (!/[0-9]/.test(password)) {
        showError("A senha deve conter pelo menos um número.");
        return;
    }
    
    const commonPasswords = ['12345678', 'password', '123456789', 'qwerty123'];
    if (commonPasswords.includes(password.toLowerCase())) {
        showError("Senha muito comum. Escolha uma senha mais segura.");
        return;
    }
    
    passwordEl.value = '';
    confirmPasswordEl.value = '';
    
    const requestBody = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: password,
        settings: {
            phone: document.getElementById('telefone').value,
            cpf: document.getElementById('cpf').value,
            dateOfBirth: document.getElementById('dataInput').value
        },
        type: selectedUserType
    };

    const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;
    const url = `${BASE_URL}/v1/user/register`;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        delete requestBody.password;
        const data = await res.json();
        
        const responseText = JSON.stringify(data);
        if (responseText.includes('password') || responseText.includes('senha')) {
            console.warn('Backend retornando dados sensíveis');
        }

        if (res.ok) {
            document.getElementById('name').value = '';
            document.getElementById('email').value = '';
            document.getElementById('dataInput').value = '';
            document.getElementById('telefone').value = '';
            document.getElementById('cpf').value = '';
            
            showSuccess("Cadastro realizado com sucesso!");
            setTimeout(() => {
                window.location.href = "../login/login.html";
            }, 2000);
        } else {
            showError("Erro ao realizar cadastro. Verifique os dados e tente novamente.");
            passwordEl.value = '';
            confirmPasswordEl.value = '';
        }
    } catch (err) {
        showError("Erro de conexão. Tente novamente.");
    }
}
