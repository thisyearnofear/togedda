#!/bin/bash

# =============================================================================
# XMTP Bot VPS Deployment Script
# =============================================================================
# Automated deployment script for production XMTP bot

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BOT_DIR="/opt/imperfect-form-bot"
BACKUP_DIR="/opt/backups/imperfect-form-bot"
LOG_FILE="/var/log/imperfect-form-bot-deploy.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed. Please install Docker Compose first."
fi

log "Starting XMTP Bot deployment..."

# Create directories
log "Creating deployment directories..."
sudo mkdir -p "$BOT_DIR"
sudo mkdir -p "$BACKUP_DIR"
sudo mkdir -p "$(dirname "$LOG_FILE")"
sudo chown $USER:$USER "$BOT_DIR"

# Navigate to bot directory
cd "$BOT_DIR"

# Check if .env.bot exists
if [[ ! -f ".env.bot" ]]; then
    warn ".env.bot file not found. Please create it from .env.bot.example"
    if [[ -f ".env.bot.example" ]]; then
        log "Copying .env.bot.example to .env.bot..."
        cp .env.bot.example .env.bot
        warn "Please edit .env.bot with your actual values before continuing"
        exit 1
    else
        error ".env.bot.example not found. Please ensure all files are present."
    fi
fi

# Backup existing deployment
if [[ -d "$BOT_DIR/data" ]]; then
    log "Creating backup of existing data..."
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    sudo cp -r "$BOT_DIR/data" "$BACKUP_DIR/$BACKUP_NAME"
    log "Backup created at $BACKUP_DIR/$BACKUP_NAME"
fi

# Pull latest images
log "Pulling latest Docker images..."
docker-compose -f docker-compose.bot.yml pull

# Stop existing containers
log "Stopping existing containers..."
docker-compose -f docker-compose.bot.yml down

# Build and start new containers
log "Building and starting new containers..."
docker-compose -f docker-compose.bot.yml up -d --build

# Wait for services to be healthy
log "Waiting for services to be healthy..."
sleep 30

# Check health
log "Checking service health..."
if docker-compose -f docker-compose.bot.yml ps | grep -q "Up (healthy)"; then
    log "✅ Bot deployment successful!"
else
    error "❌ Bot deployment failed. Check logs with: docker-compose -f docker-compose.bot.yml logs"
fi

# Show status
log "Deployment status:"
docker-compose -f docker-compose.bot.yml ps

log "🎉 XMTP Bot deployment completed successfully!"
log "📊 Monitor logs with: docker-compose -f docker-compose.bot.yml logs -f"
log "🔧 Manage with: docker-compose -f docker-compose.bot.yml [start|stop|restart]"
