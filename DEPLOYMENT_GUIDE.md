# CoffeeBiz Analytics Deployment Guide

This guide covers deploying CoffeeBiz Analytics to production environments including cloud platforms, Docker, and traditional servers.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Web Server    │    │    Database     │
│   (Nginx/CDN)   │────│   (Node.js)     │────│  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │     Cache       │
                       │    (Redis)      │
                       └─────────────────┘
```

## 🚀 Quick Deployment Options

### Option 1: Docker Compose (Recommended)
### Option 2: Cloud Platforms (Heroku, AWS, DigitalOcean)
### Option 3: Traditional Server Deployment

---

## 🐳 Docker Deployment

### Prerequisites
- Docker 20.0+
- Docker Compose 2.0+

### 1. Create Docker Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: coffeebiz_analytics
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis Cache
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backend API
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: coffeebiz_analytics
      DB_USER: postgres
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend (Nginx)
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl

volumes:
  postgres_data:
  redis_data:
```

### 2. Create Dockerfiles

**Dockerfile.api** (Backend):
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY server/ ./server/
COPY database/ ./database/
COPY tsconfig.json ./

# Install TypeScript globally
RUN npm install -g typescript ts-node

# Build the application
RUN npm run build:server

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "run", "start:server"]
```

**Dockerfile.frontend** (Frontend):
```dockerfile
# Build stage
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY src/ ./src/
COPY public/ ./public/
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built app
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### 3. Create Nginx Configuration

**nginx.conf**:
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    upstream api_backend {
        server api:3001;
    }

    server {
        listen 80;
        server_name localhost;

        # Frontend
        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;
        }

        # API proxy
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            proxy_pass http://api_backend/health;
        }
    }
}
```

### 4. Deploy with Docker Compose

```bash
# Create environment file
cp .env.example .env
# Edit .env with production values

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## ☁️ Cloud Platform Deployment

### Heroku Deployment

#### 1. Prepare for Heroku

Create `Procfile`:
```
web: npm run start:production
```

Create `package.json` scripts:
```json
{
  "scripts": {
    "start:production": "concurrently \"npm run start:server\" \"serve -s build -l 3000\"",
    "start:server": "node dist/server/index.js",
    "build:server": "tsc --project tsconfig.server.json",
    "heroku-postbuild": "npm run build && npm run build:server"
  }
}
```

#### 2. Deploy to Heroku

```bash
# Install Heroku CLI
# Create Heroku app
heroku create coffeebiz-analytics

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Add Redis addon
heroku addons:create heroku-redis:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-production-secret

# Deploy
git push heroku main

# Run database migrations
heroku run npm run db:migrate
```

### AWS Deployment

#### Using AWS Elastic Beanstalk

1. **Prepare application**:
```bash
# Create .ebextensions/01_packages.config
packages:
  yum:
    postgresql-devel: []

# Create .ebextensions/02_environment.config
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    DB_HOST: your-rds-endpoint
    REDIS_HOST: your-elasticache-endpoint
```

2. **Deploy**:
```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init

# Create environment
eb create production

# Deploy
eb deploy
```

#### Using AWS ECS (Docker)

1. **Create task definition**
2. **Set up Application Load Balancer**
3. **Configure RDS and ElastiCache**
4. **Deploy using ECS service**

### DigitalOcean App Platform

Create `app.yaml`:
```yaml
name: coffeebiz-analytics
services:
- name: api
  source_dir: /
  github:
    repo: your-username/coffeebiz-analytics
    branch: main
  run_command: npm run start:server
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: DB_HOST
    value: ${db.HOSTNAME}
  - key: DB_PASSWORD
    value: ${db.PASSWORD}

- name: frontend
  source_dir: /
  github:
    repo: your-username/coffeebiz-analytics
    branch: main
  build_command: npm run build
  run_command: serve -s build
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs

databases:
- name: db
  engine: PG
  version: "14"
  size: basic-xs
```

---

## 🖥️ Traditional Server Deployment

### Prerequisites
- Ubuntu 20.04+ or CentOS 8+
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Nginx
- PM2 (Process Manager)

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Redis
sudo apt install redis-server

# Install Nginx
sudo apt install nginx

# Install PM2
sudo npm install -g pm2
```

### 2. Database Setup

```bash
# Create database user
sudo -u postgres createuser --interactive coffeebiz_user

# Create database
sudo -u postgres createdb coffeebiz_analytics

# Set password
sudo -u postgres psql
ALTER USER coffeebiz_user PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE coffeebiz_analytics TO coffeebiz_user;
\q
```

### 3. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-username/coffeebiz-analytics.git
cd coffeebiz-analytics

# Install dependencies
npm install

# Build application
npm run build
npm run build:server

# Set up environment
cp .env.example .env
# Edit .env with production values

# Run database migrations
npm run db:migrate

# Create PM2 ecosystem file
```

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'coffeebiz-api',
    script: 'dist/server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

```bash
# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Nginx Configuration

**/etc/nginx/sites-available/coffeebiz**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/coffeebiz-analytics/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/coffeebiz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🔧 Production Configuration

### Environment Variables

**Production .env**:
```bash
# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=coffeebiz_analytics
DB_USER=coffeebiz_user
DB_PASSWORD=secure_password
DB_SSL=true
DB_MAX_CONNECTIONS=20

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
REDIS_DEFAULT_TTL=300

# Application
NODE_ENV=production
PORT=3001
JWT_SECRET=your-very-secure-jwt-secret
LOG_LEVEL=warn

# Security
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### Performance Tuning

#### Database Optimization
```sql
-- PostgreSQL configuration
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
```

#### Redis Configuration
```bash
# /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

---

## 📊 Monitoring and Maintenance

### Health Checks

Create health check endpoints:
```javascript
// server/routes/health.js
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  };
  res.json(health);
});
```

### Logging

**Production logging with Winston**:
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### Backup Strategy

**Database Backup**:
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backups/backup_$DATE.sql
aws s3 cp backups/backup_$DATE.sql s3://your-backup-bucket/

# Cron job: 0 2 * * * /path/to/backup.sh
```

### Monitoring Tools

- **Application Performance**: New Relic, DataDog
- **Infrastructure**: Prometheus + Grafana
- **Uptime**: Pingdom, UptimeRobot
- **Error Tracking**: Sentry

---

## 🔒 Security Checklist

- [ ] Use HTTPS in production
- [ ] Set secure environment variables
- [ ] Enable database SSL
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Regular security updates
- [ ] Database connection encryption
- [ ] Secure Redis configuration
- [ ] Regular backup testing

---

## 🚨 Troubleshooting

### Common Issues

**Database Connection Issues**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

**Redis Connection Issues**:
```bash
# Check Redis status
sudo systemctl status redis

# Test connection
redis-cli ping

# Check memory usage
redis-cli info memory
```

**Application Issues**:
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs coffeebiz-api

# Restart application
pm2 restart coffeebiz-api
```

### Performance Issues

1. **Database slow queries**: Enable slow query log
2. **High memory usage**: Check for memory leaks
3. **High CPU usage**: Profile application
4. **Network issues**: Check firewall and DNS

---

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Database read replicas
- Redis clustering
- CDN for static assets

### Vertical Scaling
- Increase server resources
- Optimize database configuration
- Tune application parameters

---

For additional support, refer to the main [README.md](./README.md) or create an issue in the GitHub repository.