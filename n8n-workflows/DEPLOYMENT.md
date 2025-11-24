# Azure Deployment Guide: Weekly Compliance Report Automation

## Overview
This guide provides step-by-step instructions for deploying the n8n workflow automation to Azure for production use.

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Azure Cloud                              │
│                                                                   │
│  ┌────────────────┐      ┌──────────────────┐                   │
│  │  Azure VM      │      │  Azure Container │                   │
│  │  (n8n Server)  │  OR  │  Instance (n8n)  │                   │
│  └────────┬───────┘      └────────┬─────────┘                   │
│           │                       │                              │
│           └───────────┬───────────┘                              │
│                       │                                          │
│           ┌───────────▼───────────┐                              │
│           │  Azure Database for   │                              │
│           │  PostgreSQL           │                              │
│           └───────────────────────┘                              │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐          │
│  │  Azure Blob Storage (Report Archive)               │          │
│  └────────────────────────────────────────────────────┘          │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐          │
│  │  Azure Key Vault (Secrets Management)              │          │
│  └────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘

External Integrations:
  ├── Microsoft Fabric/Power BI API
  ├── OpenAI API
  └── Microsoft Graph API (Email)
```

## Prerequisites

### Azure CLI
```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set subscription
az account set --subscription "Your-Subscription-Name"
```

### Required Azure Permissions
- Contributor role on resource group
- Ability to create:
  - Virtual Machines or Container Instances
  - Azure Database for PostgreSQL
  - Azure Blob Storage
  - Azure Key Vault
  - Network Security Groups

## Deployment Options

### Option 1: Azure Virtual Machine (Recommended for Production)

#### Step 1: Create Resource Group

```bash
# Create resource group
az group create \
  --name n8n-cardsdirect-rg \
  --location uksouth
```

#### Step 2: Create PostgreSQL Database

```bash
# Create PostgreSQL server
az postgres server create \
  --resource-group n8n-cardsdirect-rg \
  --name n8n-cardsdirect-db \
  --location uksouth \
  --admin-user n8nadmin \
  --admin-password 'YourSecurePassword123!' \
  --sku-name B_Gen5_2 \
  --version 11 \
  --storage-size 51200 \
  --ssl-enforcement Enabled

# Create database
az postgres db create \
  --resource-group n8n-cardsdirect-rg \
  --server-name n8n-cardsdirect-db \
  --name n8n_production

# Configure firewall (allow Azure services)
az postgres server firewall-rule create \
  --resource-group n8n-cardsdirect-rg \
  --server-name n8n-cardsdirect-db \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

#### Step 3: Create Azure Key Vault

```bash
# Create Key Vault
az keyvault create \
  --name n8n-cardsdirect-kv \
  --resource-group n8n-cardsdirect-rg \
  --location uksouth

# Store secrets
az keyvault secret set \
  --vault-name n8n-cardsdirect-kv \
  --name powerbi-client-secret \
  --value 'YOb8Q~.M6rf-dNuX_3tTMmQPOnMCEr58vWExOddf'

az keyvault secret set \
  --vault-name n8n-cardsdirect-kv \
  --name openai-api-key \
  --value 'your-openai-key'

az keyvault secret set \
  --vault-name n8n-cardsdirect-kv \
  --name postgres-password \
  --value 'YourSecurePassword123!'

az keyvault secret set \
  --vault-name n8n-cardsdirect-kv \
  --name n8n-admin-password \
  --value 'YourN8nPassword123!'
```

#### Step 4: Create Azure Blob Storage

```bash
# Create storage account
az storage account create \
  --name n8ncardsdirectstorage \
  --resource-group n8n-cardsdirect-rg \
  --location uksouth \
  --sku Standard_LRS \
  --kind StorageV2

# Create container for reports
az storage container create \
  --name compliance-reports \
  --account-name n8ncardsdirectstorage \
  --public-access off

# Generate SAS token (valid for 1 year)
az storage container generate-sas \
  --account-name n8ncardsdirectstorage \
  --name compliance-reports \
  --permissions acdlrw \
  --expiry $(date -u -d "1 year" '+%Y-%m-%dT%H:%MZ') \
  --output tsv

# Store SAS token in Key Vault
az keyvault secret set \
  --vault-name n8n-cardsdirect-kv \
  --name azure-storage-sas-token \
  --value 'paste-sas-token-here'
```

#### Step 5: Create Virtual Machine

```bash
# Create VM with Ubuntu 22.04
az vm create \
  --resource-group n8n-cardsdirect-rg \
  --name n8n-cardsdirect-vm \
  --location uksouth \
  --image Ubuntu2204 \
  --size Standard_D2s_v3 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --nsg-rule SSH

# Open port 5678 for n8n (temporarily, close after HTTPS setup)
az vm open-port \
  --resource-group n8n-cardsdirect-rg \
  --name n8n-cardsdirect-vm \
  --port 5678 \
  --priority 1010

# Get public IP
az vm show \
  --resource-group n8n-cardsdirect-rg \
  --name n8n-cardsdirect-vm \
  --show-details \
  --query publicIps \
  --output tsv
```

#### Step 6: Install n8n on VM

```bash
# SSH into VM
ssh azureuser@<VM-PUBLIC-IP>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install n8n
sudo npm install n8n -g

# Install PM2 for process management
sudo npm install pm2 -g

# Create n8n user
sudo useradd -m -s /bin/bash n8n

# Switch to n8n user
sudo su - n8n

# Create n8n directory
mkdir -p ~/.n8n

# Create environment file
cat > ~/.n8n/env.sh << 'EOF'
#!/bin/bash
export N8N_BASIC_AUTH_ACTIVE=true
export N8N_BASIC_AUTH_USER=admin
export N8N_BASIC_AUTH_PASSWORD='retrieve-from-keyvault'
export N8N_HOST=https://n8n.cardsdirect.co.uk
export WEBHOOK_URL=https://n8n.cardsdirect.co.uk/
export GENERIC_TIMEZONE=Europe/London
export TZ=Europe/London

# Database
export DB_TYPE=postgresdb
export DB_POSTGRESDB_HOST=n8n-cardsdirect-db.postgres.database.azure.com
export DB_POSTGRESDB_PORT=5432
export DB_POSTGRESDB_DATABASE=n8n_production
export DB_POSTGRESDB_USER=n8nadmin@n8n-cardsdirect-db
export DB_POSTGRESDB_PASSWORD='retrieve-from-keyvault'
export DB_POSTGRESDB_SSL_ENABLED=true

# Power BI
export POWERBI_TENANT_ID=73890052-7df3-4774-bed7-b43d5ebd83db
export POWERBI_CLIENT_ID=6492b933-768a-47a6-a808-5b47192f672e
export POWERBI_CLIENT_SECRET='retrieve-from-keyvault'
export POWERBI_WORKSPACE_ID=99355c3e-0913-4d08-a77c-2934cf1c94fb
export POWERBI_DATASET_ID=80c0dd7c-ba46-4543-be77-faf57e0b806a

# OpenAI
export OPENAI_API_KEY='retrieve-from-keyvault'

# Azure Storage
export AZURE_STORAGE_ACCOUNT=n8ncardsdirectstorage
export AZURE_STORAGE_SAS_TOKEN='retrieve-from-keyvault'

# Execution settings
export EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
export EXECUTIONS_DATA_SAVE_ON_ERROR=all
export EXECUTIONS_DATA_MAX_AGE=168

# Performance
export NODE_OPTIONS="--max-old-space-size=4096"
EOF

# Make executable
chmod +x ~/.n8n/env.sh

# Start n8n with PM2
source ~/.n8n/env.sh
pm2 start n8n --name "n8n-automation" -- start

# Save PM2 configuration
pm2 save
pm2 startup

# Exit n8n user
exit
```

#### Step 7: Install and Configure Nginx (HTTPS)

```bash
# Install Nginx and Certbot
sudo apt install nginx certbot python3-certbot-nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/n8n

# Paste this configuration:
```

```nginx
server {
    server_name n8n.cardsdirect.co.uk;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for long-running workflows
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d n8n.cardsdirect.co.uk

# Close port 5678, keep only 80 and 443
az vm open-port \
  --resource-group n8n-cardsdirect-rg \
  --name n8n-cardsdirect-vm \
  --port 443 \
  --priority 1020

# Remove direct access to 5678
az vm close-port \
  --resource-group n8n-cardsdirect-rg \
  --name n8n-cardsdirect-vm \
  --port 5678
```

#### Step 8: Install PDFKit Library

```bash
# SSH into VM
ssh azureuser@<VM-PUBLIC-IP>
sudo su - n8n

# Install PDFKit in n8n's global modules
cd $(npm root -g)/n8n
npm install pdfkit

# Restart n8n
pm2 restart n8n-automation
```

#### Step 9: Import Workflow

```bash
# Transfer workflow JSON to VM
scp weekly-compliance-report.json azureuser@<VM-PUBLIC-IP>:~/

# SSH into VM
ssh azureuser@<VM-PUBLIC-IP>

# Move to n8n user directory
sudo mv ~/weekly-compliance-report.json /home/n8n/
sudo chown n8n:n8n /home/n8n/weekly-compliance-report.json
```

Access n8n web interface at `https://n8n.cardsdirect.co.uk`, login, and import the workflow.

### Option 2: Azure Container Instance

#### Create Container Instance with Docker Compose

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - N8N_HOST=https://n8n.cardsdirect.co.uk
      - WEBHOOK_URL=https://n8n.cardsdirect.co.uk/
      - GENERIC_TIMEZONE=Europe/London
      - TZ=Europe/London
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=${DB_HOST}
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n_production
      - DB_POSTGRESDB_USER=${DB_USER}
      - DB_POSTGRESDB_PASSWORD=${DB_PASSWORD}
      - DB_POSTGRESDB_SSL_ENABLED=true
      - POWERBI_CLIENT_SECRET=${POWERBI_CLIENT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AZURE_STORAGE_ACCOUNT=${AZURE_STORAGE_ACCOUNT}
      - AZURE_STORAGE_SAS_TOKEN=${AZURE_STORAGE_SAS_TOKEN}
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
EOF

# Deploy to Azure Container Instances
az container create \
  --resource-group n8n-cardsdirect-rg \
  --name n8n-cardsdirect-aci \
  --image n8nio/n8n:latest \
  --dns-name-label n8n-cardsdirect \
  --ports 5678 \
  --cpu 2 \
  --memory 4 \
  --environment-variables \
    N8N_BASIC_AUTH_ACTIVE=true \
    N8N_BASIC_AUTH_USER=admin \
    GENERIC_TIMEZONE=Europe/London \
    TZ=Europe/London \
  --secure-environment-variables \
    N8N_BASIC_AUTH_PASSWORD='from-keyvault' \
    DB_POSTGRESDB_PASSWORD='from-keyvault' \
    POWERBI_CLIENT_SECRET='from-keyvault' \
    OPENAI_API_KEY='from-keyvault'
```

## Post-Deployment Configuration

### 1. DNS Configuration

Point your domain to the Azure public IP:

```bash
# Get public IP
az vm show \
  --resource-group n8n-cardsdirect-rg \
  --name n8n-cardsdirect-vm \
  --show-details \
  --query publicIps \
  --output tsv

# Add DNS A record:
# Name: n8n
# Type: A
# Value: <PUBLIC-IP>
# TTL: 3600
```

### 2. Enable Managed Identity (Optional)

```bash
# Enable system-assigned managed identity
az vm identity assign \
  --resource-group n8n-cardsdirect-rg \
  --name n8n-cardsdirect-vm

# Grant Key Vault access
az keyvault set-policy \
  --name n8n-cardsdirect-kv \
  --object-id <MANAGED-IDENTITY-PRINCIPAL-ID> \
  --secret-permissions get list
```

### 3. Configure Backup

```bash
# Enable VM backup
az backup protection enable-for-vm \
  --resource-group n8n-cardsdirect-rg \
  --vault-name n8n-cardsdirect-backup-vault \
  --vm n8n-cardsdirect-vm \
  --policy-name DefaultPolicy

# Enable PostgreSQL backup
az postgres server configuration set \
  --resource-group n8n-cardsdirect-rg \
  --server-name n8n-cardsdirect-db \
  --name backup.retention_days \
  --value 35
```

### 4. Monitoring Setup

```bash
# Install Azure Monitor Agent on VM
az vm extension set \
  --resource-group n8n-cardsdirect-rg \
  --vm-name n8n-cardsdirect-vm \
  --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor \
  --enable-auto-upgrade true

# Create Application Insights
az monitor app-insights component create \
  --app n8n-cardsdirect-insights \
  --location uksouth \
  --resource-group n8n-cardsdirect-rg \
  --application-type web
```

## Security Hardening

### Network Security

```bash
# Create Network Security Group rules
az network nsg rule create \
  --resource-group n8n-cardsdirect-rg \
  --nsg-name n8n-cardsdirect-vmNSG \
  --name AllowHTTPS \
  --priority 1000 \
  --source-address-prefixes "YOUR-OFFICE-IP" \
  --destination-port-ranges 443 \
  --protocol Tcp \
  --access Allow

# Deny all other inbound traffic
az network nsg rule create \
  --resource-group n8n-cardsdirect-rg \
  --nsg-name n8n-cardsdirect-vmNSG \
  --name DenyAllInbound \
  --priority 4096 \
  --source-address-prefixes "*" \
  --destination-port-ranges "*" \
  --protocol "*" \
  --access Deny
```

### Enable Azure DDoS Protection

```bash
az network ddos-protection create \
  --resource-group n8n-cardsdirect-rg \
  --name n8n-ddos-protection
```

## Maintenance

### Update n8n

```bash
ssh azureuser@<VM-PUBLIC-IP>
sudo su - n8n

# Stop n8n
pm2 stop n8n-automation

# Update n8n
sudo npm update n8n -g

# Start n8n
pm2 start n8n-automation
```

### Database Maintenance

```bash
# Connect to PostgreSQL
psql -h n8n-cardsdirect-db.postgres.database.azure.com -U n8nadmin@n8n-cardsdirect-db -d n8n_production

# Clean old executions (keep last 30 days)
DELETE FROM execution_entity WHERE "startedAt" < NOW() - INTERVAL '30 days';

# Vacuum database
VACUUM ANALYZE;
```

## Disaster Recovery

### Backup Workflow

```bash
# Export workflow via API
curl -u admin:password https://n8n.cardsdirect.co.uk/api/v1/workflows/export \
  -o backup-workflows-$(date +%Y%m%d).json

# Store in Azure Blob
az storage blob upload \
  --account-name n8ncardsdirectstorage \
  --container-name backups \
  --name workflows-$(date +%Y%m%d).json \
  --file backup-workflows-$(date +%Y%m%d).json
```

### Restore Procedure

1. Deploy new VM using this guide
2. Restore PostgreSQL database from backup
3. Import workflow JSON
4. Update DNS to point to new VM

## Cost Optimization

### Estimated Monthly Costs (UK South)

- **VM (Standard_D2s_v3)**: £70/month
- **PostgreSQL (B_Gen5_2)**: £50/month
- **Blob Storage (50GB)**: £1/month
- **Bandwidth**: £5/month
- **Total**: ~£126/month (~£1,512/year)

### Cost Reduction Tips

1. Use **Reserved Instances** for 1-year commitment (30% savings)
2. Use **Azure Dev/Test** subscription if applicable (discounted rates)
3. Enable **Auto-shutdown** for VM during non-business hours
4. Use **Azure Cost Management** alerts

## Next Steps

- Complete **TESTING.md** scenarios
- Schedule user training
- Enable monitoring alerts
- Document runbook procedures
- Plan quarterly reviews

## Support Contacts

- **Azure Support**: https://portal.azure.com support
- **n8n Community**: https://community.n8n.io
- **Internal IT**: it-support@cardsdirect.co.uk
