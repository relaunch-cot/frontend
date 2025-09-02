
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

    const url = `https://bff-relaunch-production.up.railway.app/v1/user/login?email=${email}&password=${password}`;
    try {
        const res = await fetch(url, {
            method: "POST"
        });

        const data = await res.json();

        if (res.ok && res.headers.get("Authorization")) {
            localStorage.setItem("token", res.headers.get("Authorization"));
            loginResponseDiv.innerHTML = "Login realizado com sucesso!";

            setTimeout(() => {
                window.location.href = "./index.html"; 
            }, 2000);
        } else {
            loginResponseDiv.innerHTML = ` ${data.message || JSON.stringify(data)}`;
        }
    } catch (err) {
        loginResponseDiv.innerHTML = "Erro ao conectar à API.";
        console.error(err);
    }
});
