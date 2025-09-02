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