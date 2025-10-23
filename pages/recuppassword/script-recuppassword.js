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
                window.location.href = "../home/index.html"; 
            }, 2000);
        } else {
            updatePasswordResponseDiv.innerHTML = "Não foi possível alterar a senha. Verifique os dados e tente novamente.";
        }
    } catch (err) {
        updatePasswordResponseDiv.innerHTML = "Erro ao conectar à API.";
        console.error(err);
    }
});