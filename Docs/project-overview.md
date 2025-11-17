# Project Overview - Weekly Report Automation System

**Generated:** 2025-11-17
**Project Type:** Data/BI Analytics & Automation (POC)
**Status:** Documentation Phase Complete

---

## Quick Summary

**What:** Automated weekly reporting system to replace manual Power BI screenshot-based reports

**Why:** Reduce manual effort, ensure consistency, enable scalability for 90+ store reporting

**How:** n8n automation engine on Azure, pulling data from Microsoft Fabric Data Lakehouse

---

## Project Snapshot

| Aspect | Details |
|--------|---------|
| **Project Name** | Weekly Report Automation System (POC) |
| **Business Domain** | Retail Analytics & Compliance Reporting |
| **Current State** | Power BI dashboards with manual screenshot capture |
| **Target State** | Automated weekly report generation via n8n |
| **Repository Type** | Single-purpose (Monolith) |
| **Primary Technology** | Microsoft Fabric + Power BI (current), n8n + Azure (target) |
| **Data Volume** | 25.2K orders, 17.4K customers, 14 tables |
| **Report Frequency** | Weekly (Monday mornings) |
| **Stakeholders** | Executive leadership, compliance team |

---

## Purpose & Goals

### Business Problem

**Current Pain Points:**
1. Manual screenshot capture takes 30-60 minutes weekly
2. Inconsistent report format and analysis quality
3. Prone to human error (missed metrics, typos)
4. Not scalable to 90+ stores (Cards Direct target)
5. No automated archive or audit trail

### Solution Goals

**Primary Objectives:**
1. **Automate Report Generation** - Reduce manual effort from 60 min → 0 min
2. **Standardize Output** - Consistent format, analysis, and metrics
3. **Enable Scalability** - Support 90+ store reporting without additional FTE
4. **Improve Compliance** - Automated archive, audit trail, GDPR adherence
5. **Maintain Flexibility** - Power BI dashboards retained for ad-hoc analysis

**Success Metrics:**
- Report generation time: <5 minutes (automated)
- Manual effort: 0 minutes (vs. 60 min current)
- Delivery consistency: 100% on-time (Monday 9 AM)
- Stakeholder satisfaction: Maintain or improve vs. manual process

---

## System Architecture

### Repository Structure

**Type:** Single-purpose (not a traditional codebase)

**Components:**
- **Power BI Dashboard** (current): 3 pages, 14 tables, 39 DAX measures
- **Microsoft Fabric Lakehouse** (data source): Star schema with sales, customer, product data
- **n8n Workflows** (target): Automation engine for report generation
- **Azure Infrastructure** (target): App Service, PostgreSQL, Blob Storage, Key Vault

### Technology Stack Summary

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| **Data Warehouse** | Microsoft Fabric Lakehouse | Current | Data storage & processing |
| **BI Platform** | Power BI Service | Latest | Interactive dashboards (ad-hoc) |
| **Automation** | n8n | 1.x | Workflow automation (weekly reports) |
| **Cloud Platform** | Azure | Current | Infrastructure & hosting |
| **Semantic Layer** | DAX (current), JavaScript (target) | N/A | Business logic & KPIs |
| **Report Format** | PDF/HTML | N/A | Output format |
| **Distribution** | Email (SMTP) | N/A | Delivery mechanism |

---

## Data Model

### Schema Type
**Star Schema** with 2 fact tables and 12 dimension/supporting tables

### Key Entities

**Fact Tables:**
- Sales Data (order line items)
- Returns Data (return transactions)

**Dimension Tables:**
- Customer Lookup (17.4K customers)
- Product Lookup (~500 products)
- Calendar Lookup (date dimension)
- Territory Lookup (geographic regions)
- Product Categories & Subcategories
- Rolling Calendar (period calculations)
- Parameter tables (what-if analysis)

**Total Tables:** 14
**Total Measures:** 39+ DAX calculations
**Data Timeframe:** Jul 2021 - May 2022 (POC sample data)

---

## Dashboard Pages

### Page 1: Executive Overview
High-level KPIs and trends for executive decision-making

**Key Metrics:**
- Revenue YTD: $24.9M
- Total Cost: $10.5M
- Total Orders: 25.2K
- Return Rate: 2.17%

**Visuals:** Revenue trend, orders by category, top 10 products table

---

### Page 2: Product Drill-Down
Product-level performance analysis with what-if scenario modeling

**Features:**
- Target tracking gauges (orders, revenue, profit)
- Profit trend analysis
- Price adjustment slider (what-if)
- Dynamic metric selection (orders/revenue/profit/returns/rate)

---

### Page 3: Customer Analytics
Customer segmentation and demographic analysis

**Insights:**
- 17.4K unique customers
- $1,431 average revenue per customer
- Demographic breakdown (occupation, income level)
- Top customer identification

---

## Key Performance Indicators (KPIs)

### Order Metrics
- Total Orders, Order Quantity, Bulk Orders, Weekend Orders, High Ticket Orders

### Revenue Metrics
- Total Revenue, YTD Revenue, Previous Month Revenue, Revenue Target, Revenue Target Gap, 10-Day Rolling Revenue

### Profit Metrics
- Total Profit, Previous Month Profit, Profit Target, Profit Target Gap, 90-Day Rolling Profit

### Customer Metrics
- Total Customers, Revenue Per Customer

### Return Metrics
- Total Returns, Return Rate, Bike Return Rate

---

## Automation Workflow (Target)

### Weekly Schedule
**Trigger:** Every Monday at 9:00 AM (Europe/London)

### Workflow Steps

1. **Schedule Trigger** - Cron job initiates workflow
2. **Data Query** - HTTP request to Microsoft Fabric API/SQL endpoint
3. **Data Processing** - JavaScript nodes calculate KPIs (replicate DAX)
4. **Analysis Generation** - Template engine creates narrative insights
5. **Report Formatting** - HTML/PDF generation
6. **Distribution** - Email send to stakeholders
7. **Archival** - Store report in Azure Blob Storage
8. **Logging** - Record execution metrics to Application Insights

**Total Duration:** ~3-5 minutes (automated)

---

## Deployment Architecture

### Infrastructure (Azure)

**Hosting:**
- n8n instance: Azure App Service or Container Instance
- Database: Azure PostgreSQL (workflow storage)
- Storage: Azure Blob Storage (report archive)
- Secrets: Azure Key Vault (credentials)
- Networking: Azure VNet (security isolation)

**Region:** UK South / West Europe (GDPR compliance)

**Cost Estimate:** ~£68/month (basic tier)

---

## Security & Compliance

### Data Security
- **Authentication:** Azure AD + service principals
- **Encryption:** At rest (AES-256) and in transit (TLS 1.2+)
- **Network:** VNet isolation, private endpoints
- **Secrets:** Azure Key Vault storage

### GDPR Compliance
- **Data Residency:** UK/EU regions only
- **Data Minimization:** Only necessary customer data
- **Right to Access:** Customer data export available
- **Right to Erasure:** Customer deletion workflow
- **Audit Trail:** Application Insights logging (90 days)

---

## Documentation Index

### Core Documentation
1. **[Architecture](./architecture.md)** - Comprehensive system architecture
2. **[Data Models](./data-models-reporting-system.md)** - Database schema and relationships
3. **[Source Tree Analysis](./source-tree-analysis.md)** - Logical component structure
4. **[Deployment Guide](./deployment-guide.md)** - n8n infrastructure setup

### Reference Materials
- **Example Weekly Report.pdf** - Sample output format
- **PowerBI/measures-list.txt** - DAX measures catalog (39 measures)
- **Fabric/table-schemas.txt** - Data model documentation
- **PowerBI/dashboard-screenshots/** - Visual reference (3 pages)

---

## Getting Started

### For Developers

**Prerequisites:**
- Azure subscription with permissions to create resources
- Access to Microsoft Fabric workspace
- SMTP server credentials for email delivery

**Setup Steps:**
1. Review [Deployment Guide](./deployment-guide.md)
2. Deploy Azure infrastructure (Resource Group, PostgreSQL, n8n)
3. Configure n8n credentials (Fabric, Email, Blob Storage)
4. Import n8n workflow template
5. Test workflow execution
6. Enable weekly schedule

---

### For Analysts

**Current Process (Power BI):**
1. Open Power BI workspace
2. Refresh data (if needed)
3. Review dashboards for insights
4. Capture screenshots (3 pages)
5. Write analysis narrative
6. Email report to stakeholders

**Target Process (Post-Automation):**
1. Review automated report (Monday 9 AM)
2. Validate accuracy (spot-check)
3. Adjust workflow if needed (edge cases)
4. Use Power BI for ad-hoc deep dives

---

## Future Enhancements

**Phase 2 (After POC):**
- Multi-store support (90+ stores for Cards Direct)
- Dynamic recipient lists based on store hierarchy
- Exception alerting (threshold breaches)
- Mobile-friendly HTML reports

**Phase 3 (Advanced):**
- Predictive analytics (forecast trends)
- Anomaly detection (auto-flag outliers)
- Interactive web portal (replace email)
- Integration with ERP systems

---

## Support & Maintenance

**Ownership:**
- **Business Owner:** Executive stakeholders
- **Technical Owner:** Data analytics team
- **Infrastructure:** IT operations / Azure admin
- **Support Tier 1:** Data analysts (workflow adjustments)
- **Support Tier 2:** IT operations (infrastructure issues)

**Maintenance Schedule:**
- Weekly: Review execution logs
- Monthly: Performance optimization
- Quarterly: Security audit, credential rotation
- Annually: DR drill, cost optimization review

---

## Contacts

*[Placeholder for actual contact information]*

- **Project Sponsor:** [Executive Name]
- **Technical Lead:** [Data Analyst Name]
- **IT Operations:** [Azure Admin Name]

---

**Document Version:** 1.0
**Last Updated:** 2025-11-17
**Next Review:** 2025-02-17 (Quarterly)
