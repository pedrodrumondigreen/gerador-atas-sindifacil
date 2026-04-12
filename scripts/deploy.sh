#!/bin/bash
# ============================================
# Script de deploy — rode no seu Mac
# Uso: bash scripts/deploy.sh sk-SUA_CHAVE_OPENAI
# ============================================
set -e

OPENAI_KEY="${1}"
VPS_IP="72.60.240.241"
VPS_USER="root"
APP_DIR="/var/www/gerador-atas"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "$OPENAI_KEY" ]; then
  echo "❌ Passe a chave OpenAI como argumento:"
  echo "   bash scripts/deploy.sh sk-..."
  exit 1
fi

echo "📁 Criando pasta na VPS..."
ssh "${VPS_USER}@${VPS_IP}" "mkdir -p ${APP_DIR}"

echo "📦 Enviando arquivos para a VPS..."
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env.local' \
  --exclude='atas' \
  "$LOCAL_DIR/" \
  "${VPS_USER}@${VPS_IP}:${APP_DIR}/"

echo "🔑 Configurando variável de ambiente..."
ssh "${VPS_USER}@${VPS_IP}" "echo 'OPENAI_API_KEY=${OPENAI_KEY}' > ${APP_DIR}/.env"

echo "🐳 Fazendo build da imagem Docker..."
ssh "${VPS_USER}@${VPS_IP}" "cd ${APP_DIR} && docker build -t gerador-atas:latest ."

echo "🚀 Fazendo deploy no Swarm..."
ssh "${VPS_USER}@${VPS_IP}" "cd ${APP_DIR} && docker stack deploy -c docker-compose.yml sindifacil --with-registry-auth"

echo ""
echo "✅ Deploy concluído!"
echo "🌐 Em breve disponível em: https://atas.condomineall.com"
echo ""
echo "Verifique o status com:"
echo "  ssh root@${VPS_IP} 'docker service ls | grep gerador'"
