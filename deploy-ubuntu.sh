#!/usr/bin/env bash
# ==============================================================================
# Script de Despliegue Automatizado para Ubuntu Server
# Sistema de Gestión Policial y Pericial (Sis.Pol.)
# ==============================================================================

set -e

echo "=========================================================="
echo "    Iniciando Despliegue de Sis.Pol. en Ubuntu Server     "
echo "=========================================================="

# 1. Verificar permisos de root o sudo
if [ "$EUID" -ne 0 ]; then
  echo "Por favor ejecute este script con sudo: sudo bash deploy-ubuntu.sh"
  exit 1
fi

APP_DIR="/var/www/sispol"
CURRENT_DIR=$(pwd)

# 2. Actualizar repositorios e instalar paquetes base
echo "--> [1/6] Actualizando paquetes del sistema..."
apt-get update -y
apt-get install -y curl git ufw nginx

# 3. Instalar Node.js 22 LTS si no está disponible
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
  echo "--> [2/6] Instalando Node.js 22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
else
  echo "--> Node.js ya está instalado: $(node -v)"
fi

# Instalar PM2 globalmente para administración de procesos
if ! command -v pm2 &> /dev/null; then
  echo "--> Instalando PM2..."
  npm install -g pm2
fi

# 4. Copiar o preparar directorio en /var/www/sispol
if [ "$CURRENT_DIR" != "$APP_DIR" ]; then
  echo "--> [3/6] Sincronizando archivos a $APP_DIR..."
  mkdir -p "$APP_DIR"
  rsync -av --exclude 'node_modules' --exclude 'dist' --exclude '.git' "$CURRENT_DIR/" "$APP_DIR/"
  cd "$APP_DIR"
fi

# 5. Configurar archivo .env
if [ ! -f .env ]; then
  echo "--> [4/6] Creando archivo .env desde .env.example..."
  cp .env.example .env
  echo "Recuerde configurar su GEMINI_API_KEY en $APP_DIR/.env si usará asistencia de IA."
fi

# 6. Instalar dependencias del proyecto y compilar
echo "--> [5/6] Instalando dependencias de Node.js y compilando producción..."
npm install
npm run build

# 7. Configurar servicio PM2
echo "--> [6/6] Iniciando la aplicación con PM2..."
mkdir -p logs
pm2 start ecosystem.config.cjs || pm2 reload ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root || true

# Configurar Firewall UFW (Permitir HTTP, HTTPS y SSH)
echo "--> Ajustando reglas de Firewall (UFW)..."
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw allow 3000/tcp || true

echo "=========================================================="
echo "    ¡Despliegue completado con éxito!                     "
echo "=========================================================="
echo "La aplicación está corriendo en: http://localhost:3000"
echo ""
echo "Para publicar con Nginx y dominio:"
echo "1. Copie nginx.conf.example a /etc/nginx/sites-available/sispol"
echo "2. Ejecute: ln -s /etc/nginx/sites-available/sispol /etc/nginx/sites-enabled/"
echo "3. Ejecute: systemctl reload nginx"
echo ""
echo "Ver logs de la aplicación:"
echo "pm2 logs sispol-server"
echo "=========================================================="
