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

const dateInput = document.getElementById('dataInput');

function updateVisibility() {
    if (dateInput.value || dateInput === document.activeElement) {
        dateInput.classList.add('visible');  // mostra o valor
    } else {
        dateInput.classList.remove('visible'); // mantém invisível
    }
}

// Inicializa estado
updateVisibility();

// Atualiza ao digitar ou selecionar data
dateInput.addEventListener('input', updateVisibility);

// Atualiza quando ganha ou perde foco
dateInput.addEventListener('focus', updateVisibility);
dateInput.addEventListener('blur', updateVisibility);


// Máscara de telefone
document.getElementById("telefone").addEventListener("input", function () {
    let v = this.value.replace(/\D/g, ""); // remove tudo que não é número

    if (v.length > 11) v = v.slice(0, 11); // limite de 11 números (9+2)

    // Formatação
    v = v.replace(/^(\d{2})(\d)/, "($1)$2");       // (XX)...
    v = v.replace(/(\d{5})(\d)/, "$1-$2");         // XXXXX-XXXX

    this.value = v;
});

// Máscara de CPF
document.getElementById("cpf").addEventListener("input", function () {
    let v = this.value.replace(/\D/g, ""); // remove tudo que não é número

    if (v.length > 11) v = v.slice(0, 11); // limite de 11 números

    // Formatação
    v = v.replace(/^(\d{3})(\d)/, "$1.$2");          // XXX. ...
    v = v.replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3"); // XXX.XXX. ...
    v = v.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4"); // XXX.XXX.XXX-XX

    this.value = v;
});

const form = document.getElementById("registerForm");
const responseDiv = document.getElementById("response");

form.addEventListener("submit", async (e) => {
    e.preventDefault(); 

    const name = encodeURIComponent(form.name.value);
    const email = encodeURIComponent(form.email.value);
    const password = encodeURIComponent(form.password.value);

    const url = `https://bff-relaunch-production.up.railway.app/v1/user/register?name=${name}&email=${email}&password=${password}`;

    try {
        const res = await fetch(url, {
            method: "POST"
        });

        const data = await res.json();

        if (res.ok) {
            showSuccess("Cadastro realizado com sucesso!");
            setTimeout(() => {
                window.location.href = "../login/login.html";
            }, 2000);
        } else {
            showError("Erro ao realizar cadastro. Verifique os dados.");
        }
    } catch (err) {
        showError("Erro de conexão. Tente novamente.");
    }
});
