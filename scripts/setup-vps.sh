#!/bin/bash
# ============================================
# Script de instalação da VPS — Gerador de Atas
# Cole este script no terminal da VPS (root)
# ============================================
set -e

echo "🔧 Atualizando sistema..."
apt-get update -y && apt-get upgrade -y

echo "📦 Instalando Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "🎬 Instalando FFmpeg..."
apt-get install -y ffmpeg

echo "⚙️ Instalando PM2..."
npm install -g pm2

echo "📁 Criando pasta do app..."
mkdir -p /var/www/gerador-atas

echo "🌐 Configurando nginx..."
cat > /etc/nginx/sites-available/gerador-atas << 'NGINX'
server {
    listen 80;
    server_name _;

    # Permite uploads de até 2GB (vídeos longos)
    client_max_body_size 2g;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;

        # Timeouts longos para processamento de áudio (10 min)
        proxy_read_timeout 600;
        proxy_connect_timeout 60;
        proxy_send_timeout 600;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/gerador-atas /etc/nginx/sites-enabled/gerador-atas
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

echo ""
echo "✅ Instalação concluída!"
echo ""
node --version
npm --version
ffmpeg -version | head -1
nginx -v 2>&1
pm2 --version
echo ""
echo "Próximo passo: rode o script deploy.sh no seu Mac."
