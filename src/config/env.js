const ENV_CONFIG = {
  URL_BACKEND: window.ENV?.URL_BACKEND || 
               import.meta?.env?.VITE_URL_BACKEND || 
               process.env?.REACT_APP_URL_BACKEND || 
               'http://localhost:8080',
  
  WS_BACKEND: window.ENV?.WS_BACKEND || 
              import.meta?.env?.VITE_WS_BACKEND || 
              process.env?.REACT_APP_WS_BACKEND || 
              'ws://localhost:8080',
  
  API_VERSION: 'v1',
  TIMEOUT: 10000
};

window.ENV_CONFIG = ENV_CONFIG;
