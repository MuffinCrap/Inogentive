# Deployment Guide - Weekly Report Automation System

**Generated:** 2025-11-17
**Project:** Weekly Report Analysis (POC → Production)
**Target Platform:** n8n (self-hosted on Azure)

---

## Overview

This guide outlines the deployment strategy for automating the weekly reporting process using n8n, transforming the current manual Power BI screenshot workflow into an automated report generation and distribution system.

---

## Architecture Overview

### Current State (Manual)
```
Power BI Desktop/Service
    ↓ (manual data refresh)
Microsoft Fabric Lakehouse
    ↓ (manual screenshot)
Screenshot Images
    ↓ (manual composition)
Email Client
    ↓ (manual send)
Stakeholders
```

### Target State (Automated)
```
n8n Scheduler (Weekly Trigger)
    ↓
Microsoft Fabric API/SQL Endpoint
    ↓
n8n Data Processing Nodes
    ↓
Report Generation (PDF/HTML)
    ↓
Email Automation Node
    ↓
Stakeholders + Archive (SharePoint/Blob Storage)
```

---

## Infrastructure Requirements

### Cloud Platform
- **Provider:** Microsoft Azure
- **Region:** UK South / West Europe (GDPR compliance)
- **Resource Group:** `rg-reporting-automation-prod`

### Azure Resources Required

#### 1. Azure Container Instance / App Service
- **Purpose:** Host n8n instance
- **Specs:**
  - CPU: 2 vCPU
  - RAM: 4 GB
  - Storage: 20 GB SSD (for workflow data, logs, temp files)
- **OS:** Linux (Ubuntu 22.04 LTS)
- **n8n Version:** Latest stable (currently 1.x)

#### 2. Azure Database for PostgreSQL
- **Purpose:** n8n workflow storage, execution history
- **Tier:** Basic or General Purpose
- **Specs:**
  - vCores: 2
  - Storage: 32 GB
  - Backup Retention: 7 days
- **Security:** VNet integration, private endpoint

#### 3. Azure Blob Storage
- **Purpose:** Generated report archive, temp file storage
- **Type:** Standard (LRS or GRS for redundancy)
- **Containers:**
  - `weekly-reports` → Archive of all generated reports
  - `temp` → Temporary processing files
- **Lifecycle Policy:** Move reports to Cool tier after 90 days

#### 4. Azure Key Vault
- **Purpose:** Secure credential storage
- **Secrets to Store:**
  - Microsoft Fabric workspace credentials
  - Email server (SMTP) credentials
  - API keys for any third-party integrations
  - Database connection strings
- **Access:** Managed Identity from Container Instance/App Service

#### 5. Azure Virtual Network
- **Purpose:** Secure network isolation
- **Subnets:**
  - `n8n-subnet` → n8n instance
  - `data-subnet` → PostgreSQL database
- **NSG Rules:** Restrict inbound to HTTPS (443) only

#### 6. Application Insights (Optional)
- **Purpose:** Monitoring, logging, alerting
- **Metrics:**
  - Workflow execution success/failure
  - Report generation time
  - Email delivery status

---

## n8n Deployment Steps

### Phase 1: Azure Infrastructure Setup

**Step 1: Create Resource Group**
```bash
az group create \
  --name rg-reporting-automation-prod \
  --location uksouth
```

**Step 2: Deploy PostgreSQL Database**
```bash
az postgres flexible-server create \
  --resource-group rg-reporting-automation-prod \
  --name n8n-db-prod \
  --location uksouth \
  --admin-user n8nadmin \
  --admin-password [SECURE_PASSWORD] \
  --sku-name Standard_B2s \
  --tier Burstable \
  --storage-size 32 \
  --version 14
```

**Step 3: Create Storage Account**
```bash
az storage account create \
  --name reportingstorageprod \
  --resource-group rg-reporting-automation-prod \
  --location uksouth \
  --sku Standard_LRS

az storage container create \
  --account-name reportingstorageprod \
  --name weekly-reports
```

**Step 4: Deploy Key Vault**
```bash
az keyvault create \
  --name kv-reporting-prod \
  --resource-group rg-reporting-automation-prod \
  --location uksouth \
  --enable-rbac-authorization false
```

**Step 5: Deploy n8n (Container Instance)**
```bash
az container create \
  --resource-group rg-reporting-automation-prod \
  --name n8n-prod \
  --image n8nio/n8n:latest \
  --cpu 2 \
  --memory 4 \
  --dns-name-label n8n-reporting-prod \
  --ports 5678 \
  --environment-variables \
    N8N_BASIC_AUTH_ACTIVE=true \
    N8N_BASIC_AUTH_USER=admin \
    N8N_BASIC_AUTH_PASSWORD=[SECURE_PASSWORD] \
    N8N_HOST=n8n-reporting-prod.uksouth.azurecontainer.io \
    N8N_PROTOCOL=https \
    DB_TYPE=postgresdb \
    DB_POSTGRESDB_HOST=[DB_HOST] \
    DB_POSTGRESDB_PORT=5432 \
    DB_POSTGRESDB_DATABASE=n8n \
    DB_POSTGRESDB_USER=n8nadmin \
    DB_POSTGRESDB_PASSWORD=[DB_PASSWORD] \
    EXECUTIONS_PROCESS=main \
    EXECUTIONS_DATA_SAVE_ON_SUCCESS=all \
    EXECUTIONS_DATA_SAVE_ON_ERROR=all \
    N8N_LOG_LEVEL=info \
    GENERIC_TIMEZONE=Europe/London
```

**Alternative: Azure App Service (Recommended for Production)**
```bash
az appservice plan create \
  --name n8n-appservice-plan \
  --resource-group rg-reporting-automation-prod \
  --sku P1V2 \
  --is-linux

az webapp create \
  --resource-group rg-reporting-automation-prod \
  --plan n8n-appservice-plan \
  --name n8n-reporting-prod \
  --deployment-container-image-name n8nio/n8n:latest
```

---

### Phase 2: n8n Configuration

**Step 1: Access n8n Web UI**
- URL: `https://n8n-reporting-prod.uksouth.azurecontainer.io:5678`
- Login with credentials set during deployment

**Step 2: Configure Credentials**

Create the following credentials in n8n:

1. **Microsoft Fabric / Azure Synapse**
   - Type: HTTP Request (OAuth2 or Service Principal)
   - Endpoint: Fabric SQL endpoint or REST API
   - Auth: Azure AD service principal or managed identity

2. **Email (SMTP)**
   - Type: SMTP
   - Host: [Your SMTP server]
   - Port: 587 (TLS) or 465 (SSL)
   - User: [Sender email]
   - Password: From Azure Key Vault

3. **Azure Blob Storage**
   - Type: Azure Blob Storage
   - Connection String: From Key Vault
   - Container: `weekly-reports`

**Step 3: Install Required Nodes (if not built-in)**
- Microsoft SQL / Azure Synapse node
- PDF generation node (e.g., Puppeteer, wkhtmltopdf)
- Email node (SMTP)
- Azure Blob Storage node

---

### Phase 3: Workflow Development

**Workflow Structure:**

```
1. Schedule Trigger (Weekly - Monday 9 AM)
    ↓
2. HTTP Request → Fabric API (Get Sales Data)
    ↓
3. Function Node → Calculate Metrics (replicate DAX logic)
    ↓
4. Function Node → Generate Analysis Narrative
    ↓
5. HTML Template Node → Format Report
    ↓
6. PDF Generation Node → Create PDF Report
    ↓
7. Azure Blob Storage → Archive Report
    ↓
8. Email Node → Send to Stakeholders
    ↓
9. Conditional Node → Success/Failure Handling
    ↓
10. Slack/Teams Notification (optional) → Alert on failure
```

**Sample n8n Workflow JSON (simplified):**
```json
{
  "name": "Weekly Report Automation",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{"field": "cronExpression", "expression": "0 9 * * 1"}]
        }
      }
    },
    {
      "name": "Query Fabric Lakehouse",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://[fabric-workspace].analysis.windows.net/[endpoint]",
        "method": "POST",
        "bodyParametersJson": "={\"query\": \"SELECT * FROM SalesData WHERE Date >= DATEADD(week, -1, GETDATE())\"}"
      }
    },
    {
      "name": "Calculate KPIs",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Calculate Total Revenue, Orders, Return Rate, etc.\nconst salesData = $input.all();\nlet totalRevenue = 0;\nlet totalOrders = salesData.length;\n\nsalesData.forEach(item => {\n  totalRevenue += item.json.Revenue;\n});\n\nreturn [{\n  json: {\n    totalRevenue,\n    totalOrders,\n    avgOrderValue: totalRevenue / totalOrders\n  }\n}];"
      }
    }
    // ... additional nodes
  ]
}
```

---

### Phase 4: Data Access Configuration

**Microsoft Fabric Connection Options:**

**Option A: SQL Endpoint (Recommended)**
- Use Fabric SQL endpoint for direct table queries
- Connection string format:
  ```
  Server=[workspace-name].datawarehouse.fabric.microsoft.com;
  Database=[lakehouse-name];
  Authentication=Active Directory Service Principal;
  ```
- Advantages: Standard SQL queries, familiar syntax
- Disadvantages: May require gateway for on-prem scenarios

**Option B: REST API**
- Use Fabric REST APIs for programmatic access
- Authentication: Azure AD OAuth2
- Endpoint: `https://api.fabric.microsoft.com/v1/workspaces/[workspace-id]/...`
- Advantages: Cloud-native, no gateway needed
- Disadvantages: Requires API knowledge, rate limits

**Option C: Power BI REST API**
- Export data from Power BI datasets directly
- Endpoint: `https://api.powerbi.com/v1.0/myorg/datasets/[dataset-id]/executeQueries`
- Authentication: Azure AD
- Advantages: Reuses existing Power BI model
- Disadvantages: Dataset must be published, limited query flexibility

---

### Phase 5: Security Hardening

**Network Security:**
1. Enable VNet integration for Container Instance/App Service
2. Configure NSG to allow HTTPS (443) only
3. Use Private Endpoints for PostgreSQL and Blob Storage
4. Enable Azure DDoS Protection (Standard tier)

**Authentication:**
1. Use Managed Identity for Azure resource access
2. Store all credentials in Azure Key Vault
3. Enable MFA for n8n admin access
4. Rotate secrets every 90 days

**Data Protection:**
1. Enable encryption at rest for PostgreSQL and Blob Storage
2. Enable TLS 1.2+ for all connections
3. Implement data retention policies (GDPR compliance)
4. Enable audit logging for all data access

**Compliance (GDPR):**
1. Data residency: All data in UK/EU regions
2. Right to access: Implement data export mechanisms
3. Right to erasure: Implement data deletion workflows
4. Data minimization: Only store necessary data
5. Audit trail: Log all data processing activities

---

### Phase 6: Monitoring & Alerting

**Application Insights Configuration:**
```javascript
// In n8n workflow, log key events
const appInsights = require('applicationinsights');
appInsights.setup('[INSTRUMENTATION_KEY]');

appInsights.defaultClient.trackEvent({
  name: 'ReportGenerated',
  properties: {
    reportWeek: weekNumber,
    totalOrders: kpis.totalOrders,
    success: true
  }
});
```

**Alert Rules:**
1. **Workflow Failure Alert**
   - Trigger: n8n workflow execution fails
   - Action: Email to DevOps team + Slack notification

2. **Email Delivery Failure**
   - Trigger: SMTP error or bounce
   - Action: Retry 3 times, then alert

3. **Data Freshness Alert**
   - Trigger: Fabric data older than 48 hours
   - Action: Alert data team

4. **Performance Alert**
   - Trigger: Report generation > 5 minutes
   - Action: Log for investigation

**Dashboard Metrics:**
- Weekly report generation success rate
- Average report generation time
- Email delivery success rate
- Data query performance

---

## Deployment Checklist

### Pre-Deployment
- [ ] Azure subscription with sufficient quota
- [ ] Access to Microsoft Fabric workspace
- [ ] SMTP server credentials
- [ ] Stakeholder email distribution list
- [ ] Report template finalized

### Infrastructure Deployment
- [ ] Resource group created
- [ ] PostgreSQL database deployed and initialized
- [ ] Blob Storage account created with containers
- [ ] Key Vault created and secrets stored
- [ ] VNet and NSG configured
- [ ] n8n deployed (Container Instance or App Service)

### n8n Configuration
- [ ] n8n accessible via HTTPS
- [ ] Basic auth or OAuth configured
- [ ] Credentials created for Fabric, Email, Blob Storage
- [ ] Required nodes installed
- [ ] Workflow imported and tested

### Testing
- [ ] Manual workflow execution successful
- [ ] Sample report generated correctly
- [ ] Email delivery working
- [ ] Report archived to Blob Storage
- [ ] Error handling triggers correctly

### Production Readiness
- [ ] Scheduled trigger configured (weekly)
- [ ] Monitoring and alerting active
- [ ] Backup strategy in place
- [ ] Runbook documented for troubleshooting
- [ ] Stakeholders notified of go-live date

---

## Rollback Plan

If automation fails:

1. **Immediate:** Revert to manual Power BI screenshot process
2. **Short-term:** Investigate n8n logs and Application Insights
3. **Fix:** Deploy hotfix workflow or adjust configuration
4. **Retry:** Re-execute workflow manually for missed week
5. **Post-mortem:** Document issue and prevent recurrence

---

## Cost Estimation (Monthly)

| Resource | Tier | Est. Cost (GBP) |
|----------|------|-----------------|
| Container Instance (2 vCPU, 4 GB) | Standard | £40 |
| PostgreSQL (Basic, 2 vCore) | Basic | £25 |
| Blob Storage (100 GB) | Standard LRS | £2 |
| Key Vault | Standard | £1 |
| VNet | Basic | £0 (included) |
| Application Insights | Basic (5 GB/month) | £0 (free tier) |
| **Total** | | **~£68/month** |

**Note:** Costs may vary based on actual usage and region. Consider Reserved Instances for cost savings.

---

## Maintenance

### Weekly
- Review execution logs for errors
- Validate report accuracy

### Monthly
- Review Application Insights metrics
- Check for n8n updates
- Rotate test credentials (if applicable)

### Quarterly
- Security audit (access reviews, NSG rules)
- Performance optimization review
- Rotate production credentials

### Annually
- Disaster recovery drill
- Review and update documentation
- Cost optimization review

---

## Support & Troubleshooting

### Common Issues

**Issue: Workflow fails with Fabric connection error**
- **Cause:** Service principal expired or network connectivity
- **Fix:** Renew credentials in Key Vault, check NSG rules

**Issue: Email not delivered**
- **Cause:** SMTP auth failure or recipient bounce
- **Fix:** Verify SMTP credentials, validate email addresses

**Issue: Report generation timeout**
- **Cause:** Large dataset or slow query
- **Fix:** Optimize SQL queries, increase timeout, use pagination

### Escalation Path
1. n8n admin (check workflow logs)
2. Azure DevOps team (infrastructure issues)
3. Data team (Fabric/query issues)
4. Vendor support (n8n or Azure)

---

**Last Updated:** 2025-11-17
**Version:** 1.0 (POC Deployment Guide)
