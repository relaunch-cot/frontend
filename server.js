const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Mapeamento de URLs limpas para arquivos reais
const routes = {
  '/': '/index.html',
  '/home': '/index.html',
  '/inicio': '/index.html',
  '/projects-gallery': '/pages/projects-gallery/projects-gallery.html',
  '/projetos': '/pages/projects-gallery/projects-gallery.html',
  '/available-projects': '/pages/available-projects/available-projects.html',
  '/projetos-disponiveis': '/pages/available-projects/available-projects.html',
  '/project': '/pages/project/project.html',
  '/projeto': '/pages/project/project.html',
  '/chats': '/pages/project-chat/project-chats.html',
  '/chat': '/pages/project-chat/project-chat.html',
  '/perfil': '/pages/perfil/perfil.html',
  '/profile': '/pages/perfil/perfil.html',
  '/editar-perfil': '/pages/perfil/edit-perfil.html',
  '/edit-profile': '/pages/perfil/edit-perfil.html',
  '/login': '/pages/login/login.html',
  '/cadastro': '/pages/cadastro/cadastro.html',
  '/register': '/pages/cadastro/cadastro.html',
  '/recuperar-senha': '/pages/recuppassword/recuppassword.html',
  '/reset-password': '/pages/recuppassword/recuppassword.html',
  '/recuperar-notificacao': '/pages/recnoti/recnoti.html',
  '/notificacoes': '/pages/notification/notification.html',
  '/notifications': '/pages/notification/notification.html',
  '/project-file': '/pages/project-file/project-file-0.html',
  '/arquivos-projeto': '/pages/project-file/project-file-0.html',
  '/project-payment': '/pages/project-payment/project-payment-0.html',
  '/pagamento-projeto': '/pages/project-payment/project-payment-0.html'
};

// Tipos MIME
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf'
};

const server = http.createServer((req, res) => {
  let filePath = req.url;

  // Remove query string
  const queryIndex = filePath.indexOf('?');
  if (queryIndex !== -1) {
    filePath = filePath.substring(0, queryIndex);
  }

  // Verifica se é uma rota limpa
  if (routes[filePath]) {
    filePath = routes[filePath];
  }

  // Se não tem extensão e não é uma rota conhecida, tenta adicionar .html
  if (!path.extname(filePath) && !routes[filePath]) {
    filePath += '.html';
  }

  // Remove a barra inicial para o path.join funcionar
  const fullPath = path.join(__dirname, filePath.substring(1));

  // Lê o arquivo
  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Arquivo não encontrado - tenta servir index.html (SPA fallback)
        fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - Página não encontrada</h1>', 'utf-8');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Erro no servidor: ${err.code}`, 'utf-8');
      }
    } else {
      // Determina o tipo MIME
      const ext = path.extname(fullPath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║          🚀 ReLaunch - Servidor Local             ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║  Servidor rodando em:                             ║
║  ➜  http://localhost:${PORT}                         ║
║                                                   ║
║  Pressione Ctrl+C para parar o servidor           ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
  `);
});
