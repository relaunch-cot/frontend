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

    // Ao clicar no botão
    btn.addEventListener('click', () => {
        btn.textContent = 'Enviado!';
        btn.disabled = true;
    });
});

