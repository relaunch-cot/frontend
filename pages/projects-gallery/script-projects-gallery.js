const modal = document.getElementById('modal');
const btn = document.getElementById('openModal');
const close = document.querySelector('.close');

// Abrir modal
btn.onclick = () => modal.style.display = 'block';

// Fechar modal
close.onclick = () => modal.style.display = 'none';
window.onclick = (e) => {
  if (e.target === modal) modal.style.display = 'none';
}





// Abrir modal
btn.onclick = () => {
  modal.style.display = 'block';
  setTimeout(() => modal.classList.add('show'), 10);
};

// Fechar modal
close.onclick = () => {
  modal.classList.remove('show');
  setTimeout(() => modal.style.display = 'none', 300);
};



