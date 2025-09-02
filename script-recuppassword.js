// Seleciona todos os inputs dentro de .ent
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



const updatePasswordForm = document.getElementById("updatePasswordForm");
const updatePasswordResponseDiv = document.getElementById("updatePasswordResponseDiv");

updatePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = encodeURIComponent(updatePasswordForm.email.value);
    const currentPassword = encodeURIComponent(updatePasswordForm.currentPassword.value);
    const newPassword = encodeURIComponent(updatePasswordForm.password.value);

    const url = `https://bff-relaunch-production.up.railway.app/v1/user?email=${email}&currentPassword=${currentPassword}&newPassword=${newPassword}`;
    try {
        const res = await fetch(url, {
            method: "PATCH"
        });

        const data = await res.json();

        if (res.ok) {
            updatePasswordResponseDiv.innerHTML = "Senha alterada com sucesso!";

            setTimeout(() => {
                window.location.href = "./index.html"; 
            }, 2000);
        } else {
            updatePasswordResponseDiv.innerHTML = ` ${data.message || JSON.stringify(data)}`;
        }
    } catch (err) {
        updatePasswordResponseDiv.innerHTML = "Erro ao conectar à API.";
        console.error(err);
    }
});