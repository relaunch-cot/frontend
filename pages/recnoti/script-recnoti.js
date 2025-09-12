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

document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('emailInput');
    const btn = document.getElementById('btnSubmit');
    const recnotiResponseDiv = document.getElementById("recnotiResponseDiv");

    // Desabilita por padrão
    btn.disabled = true;

    // Habilita o botão somente se o email for válido
    emailInput.addEventListener('input', () => {
        if (emailInput.validity.valid && emailInput.value.trim() !== '') {
            btn.disabled = false;
        } else {
            btn.disabled = true;
        }
    });

    btn.addEventListener('click', async () => {
    const email = encodeURIComponent(emailInput.value.trim());
    const recoveryLink = encodeURIComponent("https://relaunch-cot.netlify.app/pages/recuppassword/recuppassword");

    const url = `https://bff-relaunch-production.up.railway.app/v1/user/send-email?email=${email}&recovery-link=${recoveryLink}`;

    try {
        const res = await fetch(url, {
            method: "POST"
        });

        const data = await res.json();

        if (res.ok) {
            btn.textContent = "Enviado!";
            emailInput.value = "";
            btn.disabled = true;
        } else {
            recnotiResponseDiv.innerHTML = `${data.message || JSON.stringify(data)}`;
        }
    } catch (err) {
        recnotiResponseDiv.innerHTML = "Erro ao conectar à API.";
        console.error(err);
    }
});
});

