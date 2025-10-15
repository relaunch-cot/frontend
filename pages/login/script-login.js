const API_BASE = 'http://localhost:8080/v1/user';
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

    const email = encodeURIComponent(loginForm.email.value);
    const password = encodeURIComponent(loginForm.password.value);

    const url = `${API_BASE}/login?email=${email}&password=${password}`;
    try {
        const res = await fetch(url, {
            method: "POST"
        });

        const data = await res.json();

        if (res.ok && res.headers.get("Authorization")) {
            localStorage.setItem("token", res.headers.get("Authorization"));
            showSuccess("Login realizado com sucesso!");

            setTimeout(() => {
                window.location.href = "../home/index.html"; 
            }, 2000);
        } else {
            showError("Email ou senha incorretos.");
        }
    } catch (err) {
        showError("Erro de conexão. Tente novamente.");
    }
});
