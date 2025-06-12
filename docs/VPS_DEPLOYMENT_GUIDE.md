# 🚀 XMTP Bot VPS Deployment Guide

Complete guide for deploying your XMTP Prediction Bot on a VPS with Docker.

## 📋 Prerequisites

### VPS Requirements
- **OS**: Ubuntu 20.04+ or Debian 11+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: 20GB+ SSD
- **CPU**: 2+ cores
- **Network**: Stable internet connection

### Required Services
- Docker & Docker Compose
- PostgreSQL database (can be external)
- Domain name (optional but recommended)

## 🔧 VPS Initial Setup

### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip htop nano ufw

# Create non-root user (if not exists)
sudo adduser botuser
sudo usermod -aG sudo botuser
su - botuser
```

### 2. Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 3. Configure Firewall
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow bot health check port
sudo ufw allow 3001

# Allow monitoring (optional)
sudo ufw allow 3000  # Grafana
sudo ufw allow 9090  # Prometheus

# Check status
sudo ufw status
```

## 🚀 Bot Deployment

### 1. Clone Repository
```bash
# Create deployment directory
sudo mkdir -p /opt/imperfect-form-bot
sudo chown $USER:$USER /opt/imperfect-form-bot
cd /opt/imperfect-form-bot

# Clone your repository
git clone https://github.com/thisyearnofear/minikit-miniapp.git .
```

### 2. Configure Environment
```bash
# Copy bot environment template
cp .env.bot.example .env.bot

# Edit with your actual values
nano .env.bot
```

**Critical Environment Variables:**
```bash
# Generate bot private key
node scripts/generate-keys.ts

# Generate encryption key
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"

# Set your API keys
OPENAI_API_KEY="sk-..."
OPENWEATHER_API_KEY="your_key"
TIMEZONEDB_API_KEY="your_key"
COINMARKETCAP_API_KEY="your_key"

# Database connection
DATABASE_URL="postgresql://user:pass@host:5432/db"
```

### 3. Deploy Bot
```bash
# Make deployment script executable
chmod +x scripts/deploy-bot.sh

# Run deployment
./scripts/deploy-bot.sh
```

## 🔍 Monitoring & Management

### Health Checks
```bash
# Check container status
docker-compose -f docker-compose.bot.yml ps

# View logs
docker-compose -f docker-compose.bot.yml logs -f prediction-bot

# Check bot health endpoint
curl http://localhost:3001/health
```

### Management Commands
```bash
# Start services
docker-compose -f docker-compose.bot.yml up -d

# Stop services
docker-compose -f docker-compose.bot.yml down

# Restart bot only
docker-compose -f docker-compose.bot.yml restart prediction-bot

# Update and redeploy
git pull origin main
./scripts/deploy-bot.sh
```

## 🔒 Security Best Practices

### 1. Environment Security
- ✅ Never commit `.env.bot` to git
- ✅ Use strong, unique passwords
- ✅ Rotate API keys regularly
- ✅ Limit database access by IP

### 2. Server Security
```bash
# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Change default SSH port (optional)
# Set: Port 2222

# Restart SSH
sudo systemctl restart ssh

# Install fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 3. Docker Security
```bash
# Run containers as non-root user (already configured)
# Limit container resources
# Use specific image tags, not 'latest'
# Regular security updates
```

## 📊 Optional Monitoring Setup

### Enable Monitoring Stack
```bash
# Start with monitoring
docker-compose -f docker-compose.bot.yml --profile monitoring up -d

# Access Grafana
# URL: http://your-vps-ip:3000
# Default: admin/admin (change immediately)
```

### Log Management
```bash
# Set up log rotation
sudo nano /etc/logrotate.d/imperfect-form-bot

# Add log rotation config
/var/log/imperfect-form-bot*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 botuser botuser
}
```

## 🚨 Troubleshooting

### Common Issues

**Bot won't start:**
```bash
# Check logs
docker-compose -f docker-compose.bot.yml logs prediction-bot

# Check environment variables
docker-compose -f docker-compose.bot.yml exec prediction-bot env | grep -E "(XMTP|BOT|OPENAI)"
```

**XMTP connection issues:**
```bash
# Verify XMTP environment
# Check bot private key format
# Ensure network connectivity
```

**Database connection issues:**
```bash
# Test database connection
docker-compose -f docker-compose.bot.yml exec prediction-bot node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()').then(res => console.log('DB OK:', res.rows[0])).catch(console.error);
"
```

## 🔄 Backup & Recovery

### Automated Backups
```bash
# Create backup script
nano /opt/scripts/backup-bot.sh

#!/bin/bash
BACKUP_DIR="/opt/backups/imperfect-form-bot"
DATE=$(date +%Y%m%d-%H%M%S)

# Backup bot data
docker run --rm -v imperfect-form-bot_bot_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/bot-data-$DATE.tar.gz -C /data .

# Backup environment
cp /opt/imperfect-form-bot/.env.bot $BACKUP_DIR/env-$DATE.backup

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### Recovery
```bash
# Restore from backup
docker-compose -f docker-compose.bot.yml down
docker run --rm -v imperfect-form-bot_bot_data:/data -v /opt/backups:/backup alpine tar xzf /backup/bot-data-YYYYMMDD-HHMMSS.tar.gz -C /data
docker-compose -f docker-compose.bot.yml up -d
```

## 📞 Support

- **Logs**: `/var/log/imperfect-form-bot-deploy.log`
- **Data**: Docker volume `imperfect-form-bot_bot_data`
- **Config**: `/opt/imperfect-form-bot/.env.bot`
- **Health**: `http://your-vps:3001/health`
