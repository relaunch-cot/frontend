// fetch-interceptor.js - Intercepta requisições fetch para detectar token expirado

(function() {
    'use strict';
    
    // Guarda a função fetch original
    const originalFetch = window.fetch;
    
    // Sobrescreve a função fetch
    window.fetch = async function(...args) {
        try {
            const response = await originalFetch.apply(this, args);
            
            // Verifica se recebeu 401 Unauthorized
            if (response.status === 401) {
                console.log('🔴 Fetch Interceptor: 401 Unauthorized detectado');
                console.log('URL:', args[0]);
                
                // Tenta ler o corpo da resposta
                const clonedResponse = response.clone();
                try {
                    const data = await clonedResponse.json();
                    console.log('Response body:', data);
                    
                    // Verifica se é erro de token
                    const messageText = (data.message || '').toLowerCase();
                    const detailsText = (data.details || '').toLowerCase();
                    
                    if (
                        messageText.includes('invalid token') ||
                        messageText.includes('token') ||
                        detailsText.includes('expired') ||
                        detailsText.includes('invalid') ||
                        detailsText.includes('unauthorized')
                    ) {
                        console.error('❌ Token inválido ou expirado detectado em requisição HTTP!');
                        console.error('Dados:', data);
                        
                        // Verifica se não está na página de login
                        if (!window.location.pathname.includes('/login') && 
                            !window.location.pathname.includes('/cadastro')) {
                            
                            alert('Sua sessão expirou. Você será redirecionado para o login.');
                            
                            console.log('🧹 Limpando localStorage...');
                            localStorage.clear();
                            console.log('✅ localStorage limpo');
                            
                            console.log('🚪 Redirecionando para /login...');
                            setTimeout(() => {
                                window.location.href = '/login';
                            }, 1000);
                        }
                    }
                } catch (e) {
                    // Se não conseguir fazer parse do JSON, apenas registra
                    console.log('Não foi possível fazer parse da resposta 401');
                }
            }
            
            return response;
        } catch (error) {
            console.error('Erro no fetch interceptor:', error);
            throw error;
        }
    };
    
    console.log('✅ Fetch Interceptor ativado');
})();
