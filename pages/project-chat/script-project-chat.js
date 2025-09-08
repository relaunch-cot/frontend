const entrada = document.getElementById('entradaMensagem');
const mensagens = document.getElementById('mensagens');

entrada.addEventListener('input', ajustarAltura);

function ajustarAltura() {
  entrada.style.height = 'auto';
  entrada.style.height = entrada.scrollHeight + 'px';
}

entrada.addEventListener('keydown', function(evento) {
  if (evento.key === 'Enter' && !evento.shiftKey) {
    evento.preventDefault();
    const texto = entrada.value.trim();
    if (texto) {
      adicionarMensagem(texto, 'usuario');
      entrada.value = '';
      ajustarAltura();

      // Simulação de resposta automática
      setTimeout(() => {
        adicionarMensagem('reposta do usuário', 'outra-pessoa');
      }, 600);
    }
  }
});

function adicionarMensagem(texto, tipo) {
  const novaMensagem = document.createElement('div');
  novaMensagem.className = `mensagem ${tipo}`;
  novaMensagem.textContent = texto;
  mensagens.appendChild(novaMensagem);
  mensagens.scrollTop = mensagens.scrollHeight;
}
