
(function() {
  'use strict';

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

  function isLocalEnvironment() {
    return window.location.protocol === 'file:';
  }

  function isLocalServer() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
  }

  function getBasePath() {
    if (isLocalEnvironment()) {
      const path = window.location.pathname;
      const parts = path.split('/');
      parts.pop();
      while (parts.length > 0 && !parts[parts.length - 1].includes('frontend')) {
        parts.pop();
      }
      return parts.join('/') || '';
    }
    return '';
  }

  function resolveRoute(cleanPath) {
    const pathOnly = cleanPath.split('?')[0].split('#')[0];
    
    const physicalPath = routes[pathOnly];
    
    if (physicalPath) {
      const queryString = cleanPath.includes('?') ? cleanPath.substring(cleanPath.indexOf('?')) : '';
      const hash = cleanPath.includes('#') ? cleanPath.substring(cleanPath.indexOf('#')) : '';
      return physicalPath + queryString + hash;
    }
    
    return null;
  }

  function navigate(path, replaceState = false) {
    const resolved = resolveRoute(path);
    
    if (resolved) {
      if (isLocalEnvironment()) {
        const basePath = getBasePath();
        const fullPath = basePath + resolved;
        window.location.href = 'file://' + fullPath;
      } else if (isLocalServer()) {
        if (replaceState) {
          window.location.replace(path);
        } else {
          window.location.href = path;
        }
      } else {
        if (replaceState) {
          window.location.replace(path);
        } else {
          window.location.href = path;
        }
      }
    } else {
    }
  }

  function setupLinkInterception() {
    document.addEventListener('click', function(e) {
      const target = e.target.closest('a');
      
      if (!target) return;
      
      const href = target.getAttribute('href');
      
      if (!href || 
          href.startsWith('http://') || 
          href.startsWith('https://') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href === '#' ||
          href.startsWith('#')) {
        return;
      }
      
      if (href.startsWith('/')) {
        e.preventDefault();
        navigate(href);
      }
    });
  }

  function setupLocationInterception() {
    
    window.addEventListener('popstate', function(e) {
      const currentPath = window.location.pathname;
      const resolved = resolveRoute(currentPath);
      
      if (resolved && !isLocalEnvironment()) {
        return;
      }
    });
  }

  function checkInitialRoute() {
    if (!isLocalEnvironment() && !isLocalServer()) {
      return;
    }
    
    const currentPath = window.location.pathname;
    
    for (const [cleanPath, physicalPath] of Object.entries(routes)) {
      if (currentPath.endsWith(physicalPath)) {
        const queryString = window.location.search || '';
        const hash = window.location.hash || '';
        
        if (isLocalServer()) {
          window.history.replaceState({}, '', cleanPath + queryString + hash);
        }
        break;
      }
    }
  }

  window.navigateTo = function(path) {
    navigate(path);
  };

  function init() {
    checkInitialRoute();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupLinkInterception);
    } else {
      setupLinkInterception();
    }
    
    if (!isLocalEnvironment()) {
      setupLocationInterception();
    }
    
  }

  init();
})();
