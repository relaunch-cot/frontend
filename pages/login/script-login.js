const BASE_URL = window.ENV_CONFIG?.URL_BACKEND;
const API_BASE = `${BASE_URL}/v1/user`;

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

const loginForm = document.getElementById("loginForm");
const loginResponseDiv = document.getElementById("loginResponse");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const pwd = loginForm.password.value;
    loginForm.password.value = '';
    
    const requestBody = {
        email: loginForm.email.value,
        password: pwd
    };

    const url = `${API_BASE}/login`;
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

        if (res.ok && res.headers.get("Authorization")) {
            // Salva o token com Bearer já incluído do backend
            localStorage.setItem("token", res.headers.get("Authorization"));
            loginForm.email.value = '';
            
            showSuccess("Login realizado com sucesso!");

            setTimeout(() => {
                window.location.href = "../home/index.html"; 
            }, 2000);
        } else {
            showError("Email ou senha incorretos. Tente novamente.");
            loginForm.password.value = '';
        }
    } catch (err) {
        showError("Erro de conexão. Tente novamente.");
    }
});
