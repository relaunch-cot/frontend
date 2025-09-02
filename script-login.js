
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
    e.preventDefault(); // evita reload

    const email = encodeURIComponent(loginForm.email.value);
    const password = encodeURIComponent(loginForm.password.value);

    const url = `https://bff-relaunch-production.up.railway.app/v1/user/login?email=${email}&password=${password}`;
    console.log(url);
    try {
        const res = await fetch(url, {
            method: "POST"
        });

        const data = await res.json();

        if (res.ok && data.token) {
            localStorage.setItem("token", response.headers.get("Authorization"));
            loginResponseDiv.innerHTML = "Login realizado com sucesso!";
        } else {
            loginResponseDiv.innerHTML = ` ${data.message || JSON.stringify(data)}`;
        }
    } catch (err) {
        loginResponseDiv.innerHTML = "Erro ao conectar à API.";
        console.error(err);
    }
});

// async function fetchWithToken(url, options = {}) {
//     const token = localStorage.getItem("authToken"); // pega token

//     // Garante que headers existem
//     options.headers = options.headers || {};

//     if (token) {
//         options.headers["Authorization"] = `Bearer ${token}`;
//     }

//     try {
//         const response = await fetch(url, options);
//         return response;
//     } catch (err) {
//         console.error("Erro na requisição com token:", err);
//         throw err;
//     }
// }

// const btnLogout = document.getElementById("logout");

// function updateLogoutButton() {
//     if (localStorage.getItem("authToken")) {
//         btnLogout.style.display = "block"; 
//     } else {
//         btnLogout.style.display = "none"; 
//     }
// }

// document.addEventListener("DOMContentLoaded", updateLogoutButton);

// btnLogout.addEventListener("click", () => {
//     localStorage.removeItem("authToken"); 
//     updateLogoutButton(); 
// });
