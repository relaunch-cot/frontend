# -*- coding: utf-8 -*-
import os
import glob

# Busca todos os arquivos HTML
html_files = glob.glob('pages/**/*.html', recursive=True)
html_files.append('index.html')

for filepath in html_files:
    try:
        # Lê o arquivo com encoding UTF-8
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            content = f.read()
        
        # Substitui o link do favicon
        old_favicon = '<link rel="icon" type="image/png" href="/src/images/ReLaunch-Logo.png">'
        new_favicon = '<link rel="icon" type="image/x-icon" href="/favicon.ico">'
        
        if old_favicon in content:
            content = content.replace(old_favicon, new_favicon)
            
            # Salva o arquivo preservando UTF-8
            with open(filepath, 'w', encoding='utf-8-sig') as f:
                f.write(content)
            
            print(f'✅ Atualizado: {filepath}')
        else:
            print(f'⏭️  Pulado: {filepath} (já atualizado ou sem favicon)')
    
    except Exception as e:
        print(f'❌ Erro em {filepath}: {e}')

print('\n✨ Concluído!')
