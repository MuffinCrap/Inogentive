# Project Documentation Index

**Project:** Weekly Report Automation System (POC)
**Generated:** 2025-11-17
**Type:** Data/BI Analytics & Automation
**Status:** Documentation Complete

---

## Project Overview

- **Type:** Single-purpose (Data analytics and reporting system)
- **Primary Language:** DAX, JavaScript (future)
- **Architecture:** Business Intelligence Reporting + Automation
- **Current State:** Power BI dashboards (3 pages, 14 tables, 39 DAX measures)
- **Target State:** Automated weekly report generation via n8n on Azure

---

## Quick Reference

**Tech Stack:**
- Microsoft Fabric Data Lakehouse (data source)
- Power BI (current BI platform)
- n8n (target automation engine)
- Azure (cloud infrastructure)

**Data Model:**
- 14 tables (star schema)
- 39+ DAX measures
- 25.2K orders, 17.4K customers

**Deployment:**
- Current: Power BI Service (cloud)
- Target: n8n on Azure App Service/Container Instance

---

## Generated Documentation

### Core Documentation

- **[Project Overview](./project-overview.md)** - Executive summary, goals, and system snapshot
- **[Architecture](./architecture.md)** - Comprehensive system architecture and design
- **[Data Models](./data-models-reporting-system.md)** - Database schema, tables, and relationships
- **[Source Tree Analysis](./source-tree-analysis.md)** - Logical component structure and data flow
- **[Deployment Guide](./deployment-guide.md)** - n8n infrastructure setup and configuration

---

## Existing Documentation

### Reference Materials

- **[Example Weekly Report (PDF)](../Claude Projects Context files/Example Weekly Report.pdf)** - Sample output format from current manual process
- **[Weekly Compliance Report Email (EML)](../Claude Projects Context files/Weekly Compliance Report (3).eml)** - Example email communication template
- **[DAX Measures List](../Claude Projects Context files/PowerBI/measures-list.txt)** - Complete catalog of 39 DAX measures
- **[Table Schemas](../Claude Projects Context files/Fabric/table-schemas.txt)** - Data model tables and columns documentation
- **[Dashboard Screenshots](../Claude Projects Context files/PowerBI/dashboard-screenshots/)** - Visual reference (3 pages: Executive Overview, Product Drill-Down, Customer Analytics)

---

## Getting Started

### For AI-Assisted Development

**Primary Entry Point:** This index file (`index.md`)

**Recommended Reading Order:**
1. **[Project Overview](./project-overview.md)** - Understand the business context and goals
2. **[Architecture](./architecture.md)** - Learn the system design and technology stack
3. **[Data Models](./data-models-reporting-system.md)** - Understand the data structure
4. **[Deployment Guide](./deployment-guide.md)** - When ready to deploy automation

**For Specific Tasks:**
- **Planning PRD:** Reference [Project Overview](./project-overview.md) + [Architecture](./architecture.md)
- **Data Integration:** Reference [Data Models](./data-models-reporting-system.md) + [Table Schemas](../Claude Projects Context files/Fabric/table-schemas.txt)
- **n8n Workflow Development:** Reference [Deployment Guide](./deployment-guide.md) + [Source Tree Analysis](./source-tree-analysis.md)
- **KPI Calculations:** Reference [DAX Measures List](../Claude Projects Context files/PowerBI/measures-list.txt) + [Data Models](./data-models-reporting-system.md)

---

### For Developers

**Quick Start:**
1. Read [Project Overview](./project-overview.md) to understand the business problem
2. Review [Architecture](./architecture.md) for system design
3. Check [Deployment Guide](./deployment-guide.md) for infrastructure setup
4. Examine [Example Weekly Report (PDF)](../Claude Projects Context files/Example Weekly Report.pdf) to understand target output

**Key Concepts:**
- **Star Schema:** Fact tables (Sales, Returns) + Dimension tables (Customer, Product, Calendar)
- **DAX Measures:** 39+ calculations for KPIs (revenue, profit, returns, targets)
- **Automation Goal:** Replace manual 60-min process with 5-min automated workflow
- **Target Platform:** n8n on Azure (self-hosted, GDPR-compliant)

---

### For Business Stakeholders

**What This Project Does:**
Automates weekly reporting to reduce manual effort, ensure consistency, and enable scalability for 90+ store reporting.

**Current Process (Manual):**
- Data analyst captures Power BI screenshots
- Writes analysis narrative
- Emails report to executives
- Takes 30-60 minutes weekly

**Target Process (Automated):**
- Scheduled workflow runs every Monday 9 AM
- Automatically queries data, calculates KPIs, generates report
- Emails PDF to stakeholders
- Archives report for compliance
- Takes 0 minutes (fully automated)

**Benefits:**
- ✅ Save 60 min/week of manual effort
- ✅ Consistent report format and quality
- ✅ Scalable to 90+ stores without additional FTE
- ✅ Automated compliance archive
- ✅ Faster delivery (Monday 9 AM guaranteed)

---

## Project Structure

### Dashboard Pages (Power BI - Current)

**Page 1: Executive Overview**
- KPI cards: Revenue ($24.9M), Cost ($10.5M), Orders (25.2K), Return Rate (2.17%)
- Revenue trend chart
- Orders by category breakdown
- Top 10 products table

**Page 2: Product Drill-Down**
- Product selection (e.g., Sport-100 Helmet, Blue)
- Target tracking gauges (orders, revenue, profit vs. targets)
- Profit trend analysis
- Price adjustment slider (what-if analysis)
- Dynamic metric selection

**Page 3: Customer Analytics**
- Customer KPIs (17.4K customers, $1,431 avg revenue/customer)
- Demographic segmentation (occupation, income level)
- Customer growth trend
- Top customer highlight

---

### Data Model (Microsoft Fabric Lakehouse)

**Fact Tables:**
1. Sales Data - Order transactions
2. Returns Data - Return transactions

**Dimension Tables:**
1. Customer Lookup - 17.4K customers with demographics
2. Product Lookup - ~500 products with hierarchy
3. Product Categories & Subcategories
4. Territory Lookup - Geographic regions
5. Calendar Lookup - Date dimension for time intelligence
6. Rolling Calendar - For rolling period calculations
7-14. Parameter tables (measures, metric selection, price adjustment)

**Total:** 14 tables, ~150k rows, 39+ DAX measures

---

### n8n Automation Workflow (Target)

**Workflow Steps:**
1. **Schedule Trigger** → Weekly (Monday 9 AM)
2. **Data Query** → Microsoft Fabric API/SQL
3. **KPI Calculation** → JavaScript nodes (replicate DAX)
4. **Analysis Generation** → Template engine
5. **PDF Generation** → Report formatting
6. **Email Distribution** → SMTP to stakeholders
7. **Archival** → Azure Blob Storage
8. **Logging** → Application Insights

**Infrastructure:**
- Azure App Service / Container Instance (n8n host)
- Azure PostgreSQL (workflow storage)
- Azure Blob Storage (report archive)
- Azure Key Vault (credentials)
- Azure VNet (security)

---

## Key Performance Indicators (KPIs)

### Business Metrics

**Order Metrics:**
- Total Orders, Order Quantity, Bulk Orders, Weekend Orders, High Ticket Orders

**Revenue Metrics:**
- Total Revenue, YTD Revenue, Previous Month Revenue, Revenue Target, Revenue Target Gap, 10-Day Rolling Revenue

**Profit Metrics:**
- Total Profit, Previous Month Profit, Profit Target, Profit Target Gap, 90-Day Rolling Profit

**Customer Metrics:**
- Total Customers, Revenue Per Customer

**Return Metrics:**
- Total Returns, Return Rate, Bike Return Rate

### System Metrics

**Current (Manual):**
- Report generation time: 30-60 minutes
- Consistency: Variable (human error prone)
- Scalability: Limited (1 analyst, 1 store focus)

**Target (Automated):**
- Report generation time: 3-5 minutes
- Consistency: 100% (template-driven)
- Scalability: Unlimited (90+ stores supported)

---

## Technology Decisions

### Why Microsoft Fabric?
- Already in use for data warehousing
- SQL endpoint for easy querying
- Azure-native, GDPR-compliant (UK/EU regions)

### Why n8n (vs. Power Automate, Make.com)?
- Self-hosted = data sovereignty (GDPR requirement)
- Lower cost vs. cloud automation platforms
- Flexible workflow design
- Azure deployment (same cloud as Fabric)

### Why Azure?
- Microsoft ecosystem consistency (Fabric, Power BI, Azure)
- UK/EU region availability (compliance)
- Managed services (PostgreSQL, Blob Storage, Key Vault)
- Cost-effective for small workloads

---

## Security & Compliance

### Data Protection
- **Encryption at Rest:** Azure Storage Service Encryption (AES-256)
- **Encryption in Transit:** TLS 1.2+
- **Network Security:** VNet isolation, private endpoints, NSG rules
- **Secrets Management:** Azure Key Vault (no hardcoded credentials)

### GDPR Compliance
- **Data Residency:** UK South / West Europe regions only
- **Data Minimization:** Only necessary customer data (name, email)
- **Right to Access:** Customer data export available
- **Right to Erasure:** Customer deletion workflow
- **Audit Trail:** Application Insights logging (90 days retention)

### Access Control
- **Azure AD Authentication:** For all service access
- **Role-Based Access Control (RBAC):** Least privilege principle
- **Service Principals:** For n8n → Fabric authentication
- **Managed Identities:** Where possible (no password rotation)

---

## Next Steps

### Phase 1: POC Validation (Current)
- ✅ Document existing Power BI system
- ✅ Define automation requirements
- ✅ Design n8n workflow architecture
- ⏳ Build POC n8n workflow
- ⏳ Test with dummy data
- ⏳ Stakeholder demo & approval

### Phase 2: Production Deployment
- Deploy Azure infrastructure
- Configure n8n with production credentials
- Migrate DAX logic to JavaScript
- Test with real Cards Direct data
- Enable weekly schedule
- Monitor and iterate

### Phase 3: Scale to 90+ Stores
- Multi-store support in n8n workflow
- Dynamic recipient lists by store hierarchy
- Exception alerting (threshold breaches)
- Performance optimization for scale

---

## Support & Contacts

**Documentation Maintainer:** BMad Method Analyst Agent
**Last Updated:** 2025-11-17
**Next Review:** 2025-02-17 (Quarterly)

**For Questions:**
- **Business/Requirements:** [Project Sponsor]
- **Technical/Architecture:** [Data Analyst Lead]
- **Infrastructure/Azure:** [IT Operations]

---

## Appendices

### A. File Manifest

**Generated Documentation:**
1. `index.md` (this file) - Master index
2. `project-overview.md` - Executive summary
3. `architecture.md` - System architecture
4. `data-models-reporting-system.md` - Database schema
5. `source-tree-analysis.md` - Component structure
6. `deployment-guide.md` - Infrastructure setup
7. `project-scan-report.json` - Workflow state file

**Existing Reference Materials:**
1. `../Claude Projects Context files/Example Weekly Report.pdf`
2. `../Claude Projects Context files/Weekly Compliance Report (3).eml`
3. `../Claude Projects Context files/PowerBI/measures-list.txt`
4. `../Claude Projects Context files/Fabric/table-schemas.txt`
5. `../Claude Projects Context files/PowerBI/dashboard-screenshots/` (3 images)

### B. Glossary

- **DAX:** Data Analysis Expressions (Power BI measure language)
- **Fabric:** Microsoft Fabric Data Lakehouse (cloud data warehouse)
- **n8n:** Open-source workflow automation tool
- **Star Schema:** Data warehouse design with fact and dimension tables
- **KPI:** Key Performance Indicator
- **YTD:** Year-to-date
- **GDPR:** General Data Protection Regulation (EU privacy law)

---

**📌 Primary AI Entry Point:** Use this index as your starting point for understanding the project. All documentation links are relative and accessible from this file.
