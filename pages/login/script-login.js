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
        }

        if (res.ok && res.headers.get("Authorization")) {
            // Salva o token com Bearer já incluído do backend
            const authToken = res.headers.get("Authorization");
            localStorage.setItem("token", authToken);
            
            // Conecta ao sistema de presença global
            if (window.presenceManager) {
                const token = authToken.replace('Bearer ', '');
                const decodedToken = parseJwt(token);
                const userId = decodedToken?.userId;
                
                if (userId) {
                    window.presenceManager.connect(userId, authToken);
                }
            }
            
            loginForm.email.value = '';
            
            showSuccess("Login realizado com sucesso!");

            setTimeout(() => {
                window.location.href = "/home"; 
            }, 2000);
        } else {
            showError("Email ou senha incorretos. Tente novamente.");
            loginForm.password.value = '';
        }
    } catch (err) {
        showError("Erro de conexão. Tente novamente.");
    }
});

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
