# Guía Completa de Despliegue en Ubuntu Server
## Sistema de Gestión Policial y Pericial (Sis.Pol. • Crimini-Sistem)

Esta guía detalla los pasos para instalar, configurar y publicar la plataforma en un servidor con **Ubuntu Server** (versiones 20.04, 22.04 o 24.04 LTS).

---

### 1. Requisitos del Servidor
- **Sistema Operativo:** Ubuntu Server 20.04 LTS / 22.04 LTS / 24.04 LTS.
- **Hardware Mínimo Recomendado:**
  - 2 vCPU / Cores.
  - 2 GB de memoria RAM (4 GB recomendado para tráfico policial concurrente).
  - 20 GB de espacio en disco (SSD preferible).
- **Puertos de Red:**
  - `80` (HTTP) y `443` (HTTPS).
  - `22` (SSH).
  - `3000` (Puerto interno de Node.js Express).

---

### 2. Opción A: Despliegue Automatizado (Recomendado)
El proyecto incluye un script que realiza todo el proceso de forma automática:

```bash
# 1. Clonar o descomprimir los archivos en el servidor
cd /ruta/donde/subiste/el/proyecto

# 2. Asignar permisos de ejecución al script
chmod +x deploy-ubuntu.sh

# 3. Ejecutar con permisos de superusuario
sudo ./deploy-ubuntu.sh
```

---

### 3. Opción B: Despliegue Manual Paso a Paso

#### Paso 1: Actualizar el Sistema e Instalar Paquetes Base
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx build-essential
```

#### Paso 2: Instalar Node.js 22 LTS
```bash
# Descargar e instalar repositorio oficial de Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar versiones instaladas
node -v   # Debería mostrar v22.x.x
npm -v    # Debería mostrar v10.x.x
```

#### Paso 3: Instalar PM2 (Gestor de Procesos en Segundo Plano)
```bash
sudo npm install -g pm2
```

#### Paso 4: Ubicar la Aplicación en `/var/www/sispol`
```bash
sudo mkdir -p /var/www/sispol
# Copiar el código del proyecto al directorio /var/www/sispol
# Si subiste un zip o repositorio:
sudo rsync -av --exclude 'node_modules' --exclude 'dist' ./ /var/www/sispol/

cd /var/www/sispol
```

#### Paso 5: Configurar Variables de Entorno (`.env`)
```bash
sudo cp .env.example .env
sudo nano .env
```
Configura los valores correspondientes:
```env
PORT="3000"
NODE_ENV="production"
APP_URL="https://tu-dominio-o-ip"
GEMINI_API_KEY="TU_CLAVE_DE_GEMINI_API" # Opcional, para redacción pericial asistida
```
*(Guarda con `Ctrl + O` y sal con `Ctrl + X`)*.

#### Paso 6: Instalar Dependencias y Compilar el Frontend
```bash
# Instalar paquetes
npm install

# Compilar para producción (genera carpeta dist/)
npm run build
```

#### Paso 7: Iniciar el Servidor con PM2
```bash
# Iniciar usando la configuración oficial de PM2 incluida
pm2 start ecosystem.config.cjs

# Guardar la lista de procesos para que inicien automáticamente al reiniciar el servidor
pm2 save
sudo pm2 startup systemd -u root --hp /root
```

Para verificar que esté corriendo:
```bash
pm2 status
pm2 logs sispol-server
```

---

### 4. Configurar Nginx como Proxy Inverso

Nginx recibirá las conexiones en el puerto 80/443 y las reenviará a la aplicación Node.js en el puerto 3000.

1. **Crear el archivo de configuración en Nginx:**
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/sispol
sudo nano /etc/nginx/sites-available/sispol
```
Edita la directiva `server_name` con el nombre de dominio de la institución o la dirección IP del servidor:
```nginx
server_name sispol.policiaformosa.gob.ar 192.168.1.100;
```

2. **Habilitar el sitio y reiniciar Nginx:**
```bash
sudo ln -s /etc/nginx/sites-available/sispol /etc/nginx/sites-enabled/
# Eliminar sitio por defecto si no se usa
sudo rm -f /etc/nginx/sites-enabled/default

# Probar la sintaxis de configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

---

### 5. Activar Certificado SSL Gratuito (HTTPS) con Certbot
Si cuentas con un dominio asignado apuntando a la IP pública del servidor:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.policiaformosa.gob.ar
```
Certbot configurará automáticamente la renovación automática de certificados cada 90 días.

---

### 6. Configurar Firewall (UFW)
Asegura los accesos al servidor:

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

---

### 7. Comandos de Mantenimiento Frecuentes

- **Ver estado del servicio:**
  `pm2 status`
- **Ver logs en tiempo real:**
  `pm2 logs sispol-server`
- **Reiniciar la aplicación:**
  `pm2 restart sispol-server`
- **Detener la aplicación:**
  `pm2 stop sispol-server`
- **Actualizar versión del sistema:**
  ```bash
  cd /var/www/sispol
  # (Traer cambios nuevos o subir nueva versión)
  npm install
  npm run build
  pm2 reload sispol-server
  ```
