/**
 * Sistema de Roteamento Universal
 * Funciona tanto em ambiente local quanto em produção
 * Não requer servidor - funciona abrindo arquivos diretamente
 */

(function() {
  'use strict';

  // Mapeamento de rotas limpas para arquivos físicos
  const routes = {
    '/': '/index.html',
    '/home': '/index.html',
    '/inicio': '/index.html',
    
    // Projetos
    '/projects-gallery': '/pages/projects-gallery/projects-gallery.html',
    '/projetos': '/pages/projects-gallery/projects-gallery.html',
    '/available-projects': '/pages/available-projects/available-projects.html',
    '/projetos-disponiveis': '/pages/available-projects/available-projects.html',
    '/project': '/pages/project/project.html',
    '/projeto': '/pages/project/project.html',
    
    // Chat
    '/chats': '/pages/project-chat/project-chats.html',
    '/chat': '/pages/project-chat/project-chat.html',
    
    // Perfil
    '/perfil': '/pages/perfil/perfil.html',
    '/profile': '/pages/perfil/perfil.html',
    '/editar-perfil': '/pages/perfil/edit-perfil.html',
    '/edit-profile': '/pages/perfil/edit-perfil.html',
    
    // Autenticação
    '/login': '/pages/login/login.html',
    '/cadastro': '/pages/cadastro/cadastro.html',
    '/register': '/pages/cadastro/cadastro.html',
    '/recuperar-senha': '/pages/recuppassword/recuppassword.html',
    '/reset-password': '/pages/recuppassword/recuppassword.html',
    '/recuperar-notificacao': '/pages/recnoti/recnoti.html',
    
    // Notificações
    '/notificacoes': '/pages/notification/notification.html',
    '/notifications': '/pages/notification/notification.html',
    
    // Arquivos e Pagamento
    '/project-file': '/pages/project-file/project-file-0.html',
    '/arquivos-projeto': '/pages/project-file/project-file-0.html',
    '/project-payment': '/pages/project-payment/project-payment-0.html',
    '/pagamento-projeto': '/pages/project-payment/project-payment-0.html'
  };

  /**
   * Detecta se está rodando em ambiente local (file://) ou servidor
   */
  function isLocalEnvironment() {
    return window.location.protocol === 'file:';
  }

  /**
   * Detecta se está rodando no servidor local de desenvolvimento
   */
  function isLocalServer() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
  }

  /**
   * Obtém o caminho base do projeto
   */
  function getBasePath() {
    if (isLocalEnvironment()) {
      // Para file://, usa o diretório do arquivo atual
      const path = window.location.pathname;
      const parts = path.split('/');
      // Remove o nome do arquivo
      parts.pop();
      // Volta para a raiz do projeto
      while (parts.length > 0 && !parts[parts.length - 1].includes('frontend')) {
        parts.pop();
      }
      return parts.join('/') || '';
    }
    return '';
  }

  /**
   * Resolve uma rota limpa para o caminho físico do arquivo
   */
  function resolveRoute(cleanPath) {
    // Remove query string e hash
    const pathOnly = cleanPath.split('?')[0].split('#')[0];
    
    // Procura no mapeamento
    const physicalPath = routes[pathOnly];
    
    if (physicalPath) {
      // Mantém query string e hash se existirem
      const queryString = cleanPath.includes('?') ? cleanPath.substring(cleanPath.indexOf('?')) : '';
      const hash = cleanPath.includes('#') ? cleanPath.substring(cleanPath.indexOf('#')) : '';
      return physicalPath + queryString + hash;
    }
    
    return null;
  }

  /**
   * Navega para uma rota
   */
  function navigate(path, replaceState = false) {
    const resolved = resolveRoute(path);
    
    if (resolved) {
      if (isLocalEnvironment()) {
        // Em file://, precisa construir o caminho absoluto
        const basePath = getBasePath();
        const fullPath = basePath + resolved;
        window.location.href = 'file://' + fullPath;
      } else if (isLocalServer()) {
        // No servidor local, usa o caminho limpo (servidor reescreve)
        if (replaceState) {
          window.location.replace(path);
        } else {
          window.location.href = path;
        }
      } else {
        // Em produção (Netlify/Vercel), usa o caminho limpo
        if (replaceState) {
          window.location.replace(path);
        } else {
          window.location.href = path;
        }
      }
    } else {
      console.warn('Rota não encontrada:', path);
    }
  }

  /**
   * Intercepta cliques em links para usar o sistema de roteamento
   */
  function setupLinkInterception() {
    document.addEventListener('click', function(e) {
      const target = e.target.closest('a');
      
      if (!target) return;
      
      const href = target.getAttribute('href');
      
      // Ignora links externos, âncoras, e links especiais
      if (!href || 
          href.startsWith('http://') || 
          href.startsWith('https://') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href === '#' ||
          href.startsWith('#')) {
        return;
      }
      
      // Se o href é uma rota limpa (começa com /)
      if (href.startsWith('/')) {
        e.preventDefault();
        navigate(href);
      }
    });
  }

  /**
   * Intercepta window.location.href para usar o sistema de roteamento
   * NOTA: Não interceptamos assign/replace pois são read-only em alguns navegadores
   * Use navigateTo() para navegação programática ao invés de window.location.href
   */
  function setupLocationInterception() {
    // Devido a limitações do navegador, não podemos interceptar window.location diretamente
    // A solução é usar a função global navigateTo() para navegação programática
    
    // Cria um listener para detectar mudanças no histórico
    window.addEventListener('popstate', function(e) {
      // Quando usuário clica em voltar/avançar, verificamos se precisa redirecionar
      const currentPath = window.location.pathname;
      const resolved = resolveRoute(currentPath);
      
      if (resolved && !isLocalEnvironment()) {
        // Em servidor local/produção, deixa o navegador lidar naturalmente
        return;
      }
    });
  }

  /**
   * Verifica se a página atual precisa ser redirecionada
   * (quando acessada diretamente pelo arquivo físico)
   */
  function checkInitialRoute() {
    if (!isLocalEnvironment() && !isLocalServer()) {
      // Em produção, o servidor já faz o roteamento
      return;
    }
    
    const currentPath = window.location.pathname;
    
    // Verifica se está acessando um arquivo físico que tem rota limpa
    for (const [cleanPath, physicalPath] of Object.entries(routes)) {
      if (currentPath.endsWith(physicalPath)) {
        // Está acessando o arquivo físico, redireciona para rota limpa
        const queryString = window.location.search || '';
        const hash = window.location.hash || '';
        
        if (isLocalServer()) {
          // No servidor local, pode usar rota limpa
          window.history.replaceState({}, '', cleanPath + queryString + hash);
        }
        break;
      }
    }
  }

  /**
   * Adiciona método auxiliar global para navegação programática
   */
  window.navigateTo = function(path) {
    navigate(path);
  };

  /**
   * Inicialização
   */
  function init() {
    // Verifica rota inicial
    checkInitialRoute();
    
    // Configura interceptação de links
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupLinkInterception);
    } else {
      setupLinkInterception();
    }
    
    // Configura interceptação de window.location (apenas em ambientes com servidor)
    if (!isLocalEnvironment()) {
      setupLocationInterception();
    }
    
    console.log('🚀 Sistema de roteamento universal inicializado');
    console.log('Ambiente:', isLocalEnvironment() ? 'Local (file://)' : (isLocalServer() ? 'Servidor Local' : 'Produção'));
  }

  // Inicializa
  init();
})();
