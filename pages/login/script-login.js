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

    // Verifica ao digitar
    input.addEventListener('input', checkInput);

    // Verifica ao carregar a página (para inputs com valor inicial)
    window.addEventListener('DOMContentLoaded', checkInput);
});
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');

togglePassword.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  
});

const btna = document.getElementById('togglePassword');

btna.addEventListener('click', () => {
    btna.classList.toggle('active'); // Alterna a classe active
    // Para desativar, você pode usar:
    // botao.disabled = !botao.disabled;
});

const loginForm = document.getElementById("loginForm");
const loginResponseDiv = document.getElementById("loginResponse");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Captura senha e limpa imediatamente
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
        
        // Remove senha do objeto após envio
        delete requestBody.password;

        const data = await res.json();
        
        // Verifica se a resposta contém dados sensíveis
        const responseText = JSON.stringify(data);
        if (responseText.includes('password') || responseText.includes('senha')) {
            console.warn('Backend retornando dados sensíveis');
        }

        if (res.ok && res.headers.get("Authorization")) {
            localStorage.setItem("token", res.headers.get("Authorization"));
            // Limpa todos os campos
            loginForm.email.value = '';
            
            showSuccess("Login realizado com sucesso!");

            setTimeout(() => {
                window.location.href = "../home/index.html"; 
            }, 2000);
        } else {
            showError(data.message || "Erro no login. Tente novamente.");
            // Limpa senha em caso de erro
            loginForm.password.value = '';
        }
    } catch (err) {
        showError("Erro de conexão. Tente novamente.");
    }
});
