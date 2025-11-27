const isNetlify = window.location.hostname.includes('netlify.app');
const isProduction = isNetlify || window.location.hostname === 'relaunch-cot.netlify.app';

const ENV_CONFIG = {
  URL_BACKEND: isProduction ? 'https://bff-relaunch.up.railway.app' : 'https://bff-relaunch.up.railway.app',
  WS_BACKEND: isProduction ? 'wss://bff-relaunch.up.railway.app' : 'wss://bff-relaunch.up.railway.app',
  API_VERSION: 'v1',
  TIMEOUT: 10000
};

window.ENV_CONFIG = ENV_CONFIG;
