// inject-env.js - Script para injetar variáveis de ambiente no build
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, 'src', 'config', 'env.js');
let content = fs.readFileSync(envFile, 'utf8');

// Injeta as variáveis de ambiente do Netlify
const URL_BACKEND = process.env.URL_BACKEND || 'http://localhost:8080';
const WS_BACKEND = process.env.WS_BACKEND || 'ws://localhost:8080';

content = content.replace(/typeof URL_BACKEND[^:]+: URL_BACKEND/g, `'${URL_BACKEND}'`);
content = content.replace(/typeof WS_BACKEND[^:]+: WS_BACKEND/g, `'${WS_BACKEND}'`);

fs.writeFileSync(envFile, content);
console.log('✅ Environment variables injected:', { URL_BACKEND, WS_BACKEND });
