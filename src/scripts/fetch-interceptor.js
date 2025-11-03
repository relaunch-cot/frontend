(function() {
    'use strict';
    
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
        try {
            const response = await originalFetch.apply(this, args);
            
            if (response.status === 401) {
                const clonedResponse = response.clone();
                try {
                    const data = await clonedResponse.json();
                    
                    const messageText = (data.message || '').toLowerCase();
                    const detailsText = (data.details || '').toLowerCase();
                    
                    if (
                        messageText.includes('invalid token') ||
                        messageText.includes('token') ||
                        detailsText.includes('expired') ||
                        detailsText.includes('invalid') ||
                        detailsText.includes('unauthorized')
                    ) {
                        if (!window.location.pathname.includes('/login') && 
                            !window.location.pathname.includes('/cadastro')) {
                            
                            alert('Sua sessão expirou. Você será redirecionado para o login.');
                            
                            localStorage.clear();
                            
                            setTimeout(() => {
                                window.location.href = '/login';
                            }, 1000);
                        }
                    }
                } catch (e) {
                    // Se não conseguir fazer parse do JSON, ignora
                }
            }
            
            return response;
        } catch (error) {
            console.error('Erro no fetch interceptor:', error);
            throw error;
        }
    };
})();
