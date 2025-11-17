# Architecture Documentation - Weekly Report Automation System

**Generated:** 2025-11-17
**Project:** Weekly Report Analysis (POC → Production)
**System Type:** Business Intelligence & Reporting Automation

---

## Executive Summary

This document outlines the architecture of an automated weekly reporting system designed to replace a manual Power BI screenshot-based reporting process. The system leverages Microsoft Fabric Data Lakehouse as the data source, with a planned n8n automation engine deployed on Azure for report generation and distribution.

**Current State:** Manual Power BI dashboard analysis with screenshot capture and email composition

**Target State:** Automated weekly report generation, analysis, and distribution via n8n workflows

**Key Technologies:**
- Microsoft Power BI (current visualization layer)
- Microsoft Fabric Data Lakehouse (data warehouse)
- n8n (planned automation engine)
- Azure Cloud (deployment platform)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Data Architecture](#data-architecture)
4. [Semantic Layer (DAX Measures)](#semantic-layer)
5. [Current Reporting Architecture](#current-reporting-architecture)
6. [Target Automation Architecture](#target-automation-architecture)
7. [Dashboard Structure](#dashboard-structure)
8. [Security & Compliance](#security--compliance)
9. [Integration Points](#integration-points)
10. [Performance Considerations](#performance-considerations)

---

## 1. System Overview

### Business Context

**Purpose:** Automated weekly compliance and performance reporting for retail operations

**Current Process (Manual):**
1. Data analyst opens Power BI dashboard
2. Manually captures screenshots of 3 key pages
3. Analyzes trends and writes narrative insights
4. Compiles screenshots and analysis into email
5. Sends weekly report to executive stakeholders

**Target Process (Automated):**
1. Weekly scheduler triggers n8n workflow
2. n8n queries Microsoft Fabric Data Lakehouse
3. Automated calculations replicate Power BI DAX measures
4. Template engine generates narrative analysis
5. PDF/HTML report assembled automatically
6. Email automatically sent + report archived

**Stakeholders:**
- Executive leadership (report recipients)
- Data analysts (report authors → workflow maintainers)
- IT operations (infrastructure support)
- Compliance team (audit requirements)

---

## 2. Technology Stack

| Layer | Current State | Target State | Purpose |
|-------|---------------|--------------|---------|
| **Data Storage** | Microsoft Fabric Lakehouse | Microsoft Fabric Lakehouse | Cloud data warehouse |
| **Data Processing** | Power BI (DirectQuery/Import) | n8n + JavaScript/Python nodes | Query & calculation engine |
| **Semantic Layer** | DAX measures in Power BI | JavaScript functions in n8n | Business logic & KPIs |
| **Visualization** | Power BI dashboards | HTML/PDF templates | Report presentation |
| **Distribution** | Manual email | n8n email node | Automated delivery |
| **Archive** | Email folders | Azure Blob Storage | Long-term storage |
| **Hosting** | Power BI Service | Azure App Service / Container Instance | Application runtime |
| **Monitoring** | Manual | Application Insights | Observability |
| **Security** | Azure AD + Power BI RLS | Azure AD + Key Vault + VNet | Identity & access management |

### Component Details

**Microsoft Fabric Data Lakehouse**
- **Version:** Current (Azure Synapse Analytics evolution)
- **Purpose:** Centralized data warehouse for sales, customer, and product data
- **Access Method:** SQL endpoint or REST API
- **Region:** UK South / West Europe (GDPR compliance)

**Power BI**
- **Version:** Latest (Power BI Service + Desktop)
- **Purpose:** Interactive dashboards for ad-hoc analysis (to be retained)
- **Data Model:** Import mode with scheduled refresh
- **Pages:** 3 (Executive Overview, Product Drill-Down, Customer Analytics)

**n8n**
- **Version:** Latest stable (1.x)
- **Purpose:** Workflow automation for weekly report generation
- **Deployment:** Self-hosted on Azure (Container Instance or App Service)
- **Database:** PostgreSQL for workflow storage

**Azure**
- **Services:** App Service, Container Instances, PostgreSQL, Blob Storage, Key Vault, VNet
- **Purpose:** Cloud platform for n8n hosting and supporting infrastructure

---

## 3. Data Architecture

### Schema Type: Star Schema

The data model follows a **star schema** design pattern, optimized for analytical queries and business intelligence reporting.

```
                    ┌─────────────────┐
                    │  Calendar       │
                    │  Lookup         │
                    └────────┬────────┘
                             │
    ┌────────────────┐       │       ┌────────────────┐
    │  Customer      │       │       │   Product      │
    │  Lookup        │───────┼───────│   Lookup       │
    └────────────────┘       │       └────────────────┘
                             │                │
                      ┌──────▼──────┐         │
                      │             │         │
                      │ Sales Data  │◄────────┘
                      │   (FACT)    │
                      │             │
                      └─────────────┘
                             │
                      ┌──────▼──────┐
                      │             │
                      │Returns Data │
                      │   (FACT)    │
                      │             │
                      └─────────────┘
                             │
                    ┌────────▼────────┐
                    │  Territory      │
                    │  Lookup         │
                    └─────────────────┘
```

### Tables Overview

**Fact Tables (2):**
1. **Sales Data** - Order line items with revenue, quantity, pricing
2. **Returns Data** - Return transactions with quantities

**Dimension Tables (12):**
1. **Customer Lookup** - Customer master with demographics
2. **Product Lookup** - Product catalog with hierarchy
3. **Product Categories Lookup** - Top-level categories
4. **Product Subcategories Lookup** - Subcategories
5. **Territory Lookup** - Geographic regions
6. **Calendar Lookup** - Date dimension
7. **Rolling Calendar** - Supplementary date table for rolling calculations
8. **Measures Table** - DAX measure container
9. **Parameter** - What-if parameters
10. **Price Adjustment Percentage** - Price scenario modeling
11. **Product Metric Selection** - Metric switcher
12. **Customer Metric Selection** - Metric switcher

**Total Columns:** ~100+
**Relationships:** Star schema (one-to-many from dimensions to facts)
**Granularity:** Order line item level

### Data Refresh Strategy

**Current (Power BI):**
- Frequency: Daily or on-demand
- Method: Power BI Service scheduled refresh
- Duration: ~5-10 minutes (estimated based on data volume)

**Target (n8n):**
- Frequency: Weekly (aligned with report schedule)
- Method: SQL queries or API calls to Fabric
- Duration: ~1-2 minutes (only querying needed data, not full refresh)

---

## 4. Semantic Layer (DAX Measures)

The reporting system includes **39+ DAX measures** that implement business logic and KPI calculations.

### Measure Categories

**Order Metrics (10 measures)**
- Total Orders, Order Quantity, Bulk Orders, Weekend Orders, High Ticket Orders
- Previous Month Orders, Order Target, Order Target Gap, All Orders, % of All Orders

**Revenue Metrics (8 measures)**
- Total Revenue, YTD Revenue, Previous Month Revenue, Revenue Target
- Revenue Target Gap, 10-Day Rolling Revenue, Adjusted Revenue, Revenue Per Customer

**Profit Metrics (6 measures)**
- Total Profit, Adjusted Profit, Previous Month Profit, Profit Target
- Profit Target Gap, 90-Day Rolling Profit

**Cost Metrics (2 measures)**
- Total Cost, Adjusted Cost

**Customer Metrics (2 measures)**
- Total Customers, Revenue Per Customer

**Return Metrics (8 measures)**
- Total Returns, Quantity Returned, Return Rate, Bike Returns
- Bike Return Rate, Previous Month Returns, All Returns, % of All Returns

**Pricing Metrics (3 measures)**
- Average Retail Price, Overall Average Price, Adjusted Price

### Key Measure Logic (Examples)

**Return Rate:**
```dax
Return Rate =
DIVIDE(
    [Total Returns],
    [Total Orders],
    0
) * 100
```

**Revenue Target Gap:**
```dax
Revenue Target Gap =
[Total Revenue] - [Revenue Target]
```

**10-Day Rolling Revenue:**
```dax
10-Day Rolling Revenue =
CALCULATE(
    [Total Revenue],
    DATESINPERIOD(
        'Calendar'[Date],
        LASTDATE('Calendar'[Date]),
        -10,
        DAY
    )
)
```

**YTD Revenue:**
```dax
YTD Revenue =
TOTALYTD([Total Revenue], 'Calendar'[Date])
```

### Measure Migration Strategy (for n8n)

When implementing automated reporting, DAX measures must be replicated in JavaScript/Python:

**Example: Return Rate in JavaScript**
```javascript
function calculateReturnRate(salesData, returnsData) {
  const totalOrders = salesData.length;
  const totalReturns = returnsData.length;

  const returnRate = (totalReturns / totalOrders) * 100;
  return returnRate.toFixed(2);
}
```

---

## 5. Current Reporting Architecture

### Power BI Dashboard Architecture

```
Power BI Service
    │
    ├─ Workspace: [Reporting Workspace]
    │
    ├─ Dataset: Weekly Report Data
    │   ├─ Connection: Microsoft Fabric (DirectQuery or Import)
    │   ├─ Semantic Model: 14 tables + 39 measures
    │   └─ Refresh Schedule: Daily
    │
    └─ Report: Weekly Analysis Dashboard
        ├─ Page 1: Executive Overview
        ├─ Page 2: Product Drill-Down
        └─ Page 3: Customer Analytics
```

### Current Data Flow

```
Microsoft Fabric Lakehouse
    ↓ (SQL endpoint or API)
Power BI Desktop/Service
    ↓ (import or DirectQuery)
Semantic Model (DAX calculations)
    ↓ (visualization engine)
Interactive Dashboards
    ↓ (manual screenshot)
Image Files
    ↓ (manual composition)
Email Client
    ↓ (manual send)
Stakeholders
```

---

## 6. Target Automation Architecture

### n8n Workflow Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     n8n Workflow Engine                     │
│                   (Azure App Service/ACI)                   │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Schedule   │───▶│  Data Query  │───▶│ Calculation  │ │
│  │   Trigger    │    │    Node      │    │    Nodes     │ │
│  │  (Weekly)    │    │              │    │  (KPIs)      │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│                                                  │           │
│                                                  ▼           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Archive    │◀───│  PDF/HTML    │◀───│  Analysis    │ │
│  │    Node      │    │  Generation  │    │  Generator   │ │
│  │ (Blob Store) │    │              │    │              │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│                             │                               │
│                             ▼                               │
│                      ┌──────────────┐                       │
│                      │  Email Node  │                       │
│                      │   (SMTP)     │                       │
│                      └──────────────┘                       │
│                                                              │
└────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  ┌─────────────┐      ┌──────────┐        ┌──────────────┐
  │   Fabric    │      │   Blob   │        │ Email Server │
  │  Lakehouse  │      │  Storage │        │    (SMTP)    │
  └─────────────┘      └──────────┘        └──────────────┘
```

### Automated Data Flow

```
n8n Schedule Trigger (Weekly: Monday 9 AM)
    ↓
HTTP Request Node → Microsoft Fabric API/SQL Endpoint
    ↓
[Query: Last 7 days of sales, returns, customer data]
    ↓
Function Node: Calculate KPIs (replicate DAX logic)
    ├─ Total Revenue
    ├─ Total Orders
    ├─ Return Rate
    ├─ Top 10 Products
    └─ Target Comparisons
    ↓
Function Node: Generate Narrative Analysis
    ├─ Weekly summary
    ├─ Trend insights
    ├─ Notable changes
    └─ Action items
    ↓
HTML Template Node: Format Report
    ↓
PDF Generation Node (Puppeteer/wkhtmltopdf)
    ↓
Branch:
    ├─ Azure Blob Storage Node → Archive Report
    └─ Email Node → Send to Stakeholders
    ↓
Completion: Log success/failure → Application Insights
```

---

## 7. Dashboard Structure

### Page 1: Executive Overview

**Purpose:** High-level KPIs and trends for executive decision-making

**Components:**
1. **KPI Cards (4)**
   - Revenue YTD: $24.9M
   - Total Cost: $10.5M
   - Total Orders: 25.2K
   - Return Rate: 2.17%

2. **Revenue Trend Chart**
   - Type: Line chart
   - X-axis: Date (Jul 2021 - May 2022)
   - Y-axis: Revenue ($)
   - Shows growth trajectory

3. **Orders by Category**
   - Type: Horizontal bar chart
   - Breakdown: Product categories
   - Sorting: Descending by order count

4. **Top 10 Products Table**
   - Columns: Product, Orders, Revenue, Returns, Return %
   - Sorting: Top performers by revenue

5. **Monthly Metrics**
   - Previous Month Orders: 2,146
   - Previous Month Customers: 166

**Interactivity:**
- Click product → Drill through to Product Drill-Down page
- Date slicer affects all visuals

---

### Page 2: Product Drill-Down

**Purpose:** Product-level performance analysis with what-if scenario modeling

**Components:**
1. **Selected Product Display**
   - Current selection: Sport-100 Helmet, Blue

2. **Target Gauges (3)**
   - Orders vs. Target: 219 / 251 (87%)
   - Revenue vs. Target: $7,368 / £8,438 (87%)
   - Profit vs. Target: $4,734 / $5,421 (87%)

3. **Profit Trend Chart**
   - Type: Dual-line chart
   - Lines: Total Profit (black), Adjusted Profit (cyan)
   - X-axis: Date
   - Shows impact of price adjustment parameter

4. **Price Adjustment Slider**
   - Range: -100% to +100%
   - Current: 0.00%
   - Affects: Adjusted Price, Adjusted Revenue, Adjusted Profit

5. **Product Metric Selection**
   - Radio buttons: Orders, Revenue, Profit, Returns, Rate
   - Dynamically changes bottom time series chart

6. **Time Series Chart**
   - Type: Area chart
   - Shows selected metric over time

**Interactivity:**
- Price adjustment slider updates profit calculations in real-time
- Metric selection switches time series data
- Date slicer filters all charts

---

### Page 3: Customer Analytics

**Purpose:** Customer segmentation and demographic analysis

**Components:**
1. **Customer KPI Cards (2)**
   - Unique Customers: 17.4K
   - Avg Revenue per Customer: $1,431

2. **Customer Growth Trend**
   - Type: Line chart
   - Shows customer acquisition over time

3. **Orders by Occupation**
   - Type: Donut chart
   - Segments: Professional, Management, Skilled Manual, Clerical

4. **Orders by Income Level**
   - Type: Donut chart
   - Segments: High, Medium, Low income brackets

5. **Customer List Table**
   - Columns: Customer Key, Full Name, Orders, Revenue
   - Sorting: Descending by revenue
   - Shows top customers by default

6. **Top Customer Highlight**
   - Featured: Mr. Maurice Shan
   - Orders: 6
   - Revenue: $12.4K

7. **Top 100 Customers Toggle**
   - Filter: Show only top 100 by revenue

**Interactivity:**
- Click customer → Filter to customer-specific data
- Demographic filters cross-filter customer list

---

## 8. Security & Compliance

### Data Security

**Microsoft Fabric:**
- Azure AD authentication
- Row-level security (RLS) for multi-tenant scenarios
- Encryption at rest (Azure Storage Service Encryption)
- Encryption in transit (TLS 1.2+)

**Power BI:**
- Workspace-level access control
- Report-level sharing permissions
- RLS enforcement in semantic model
- Embed tokens for secure sharing

**n8n (Target):**
- Azure AD authentication for admin access
- Credentials stored in Azure Key Vault
- VNet integration for network isolation
- Private endpoints for database and storage

### Compliance (GDPR)

**Data Residency:**
- All data stored in UK South / West Europe regions
- No data transfer outside EU

**Data Minimization:**
- Only necessary customer data collected
- PII limited to name, email (business context)
- No sensitive personal data (health, financial)

**Right to Access:**
- Customer data export mechanism available
- Report generation includes data lineage

**Right to Erasure:**
- Customer deletion workflow (manual trigger)
- Cascade delete from all tables

**Audit Trail:**
- All data access logged in Application Insights
- Report generation history retained (90 days)

### Access Control

**Power BI:**
- Report viewers: Executive stakeholders (read-only)
- Report authors: Data analysts (edit permissions)
- Workspace admins: IT team (full control)

**n8n (Target):**
- Workflow authors: Data analysts + IT
- Admin users: IT operations team
- Service accounts: Managed identities (no passwords)

---

## 9. Integration Points

### Current Integrations

**Microsoft Fabric ↔ Power BI**
- **Method:** SQL endpoint (DirectQuery or Import)
- **Frequency:** Daily scheduled refresh
- **Authentication:** Azure AD service principal
- **Data Volume:** ~100k rows (estimated from 25.2K orders with line items)

### Target Integrations

**Microsoft Fabric ↔ n8n**
- **Method:** HTTP REST API or SQL endpoint
- **Frequency:** Weekly (on-demand for reports)
- **Authentication:** Azure AD service principal or managed identity
- **Query Pattern:** Time-boxed queries (last 7 days + comparisons)

**n8n ↔ Azure Blob Storage**
- **Method:** Azure Blob Storage SDK
- **Purpose:** Archive generated reports
- **Authentication:** Connection string (from Key Vault)
- **Retention:** 7 years (compliance requirement)

**n8n ↔ Email Server**
- **Method:** SMTP
- **Server:** Office 365 / Exchange Online (assumed)
- **Authentication:** App password or OAuth2
- **Frequency:** Weekly (automated send)

**n8n ↔ Application Insights**
- **Method:** Application Insights SDK
- **Purpose:** Monitoring, logging, alerting
- **Metrics:** Execution time, success/failure, KPI values

---

## 10. Performance Considerations

### Data Volume

**Current State:**
- Orders: 25.2K
- Customers: 17.4K
- Products: ~500 (estimated)
- Time Range: 11 months (Jul 2021 - May 2022)
- Total Rows (all tables): ~150k

**Growth Projections:**
- Annual order growth: 20% (estimated)
- New customers: 15% per year
- Data retention: 3 years rolling

### Query Performance

**Power BI (Current):**
- Full refresh time: ~5-10 minutes
- DirectQuery latency: <3 seconds per visual
- Report load time: <5 seconds

**n8n (Target):**
- Weekly query: <30 seconds (time-boxed)
- KPI calculation: <5 seconds
- Report generation: <2 minutes
- Total workflow duration: ~3-5 minutes

### Optimization Strategies

**Data Layer:**
- Indexed columns: Date, CustomerKey, ProductKey
- Partitioning: By year (if volume grows)
- Aggregation tables: Pre-calculate weekly summaries

**Semantic Layer (n8n):**
- Cache previous week's data for comparison
- Parallel processing for independent calculations
- Minimize API calls (batch queries)

**Report Generation:**
- HTML template caching
- PDF generation optimization (reduce image sizes)
- Asynchronous execution (non-blocking)

### Scalability

**Current System:**
- Supports: 10-20 concurrent Power BI users
- Refresh concurrency: Single workspace refresh

**Target System (n8n):**
- Workflow concurrency: 1 (weekly schedule, no conflicts)
- Horizontal scaling: Not required (single workflow)
- Vertical scaling: 2 vCPU, 4 GB RAM sufficient

---

## Appendices

### Appendix A: Measure Catalog

See: `measures-list.txt` for complete list of 39 DAX measures

### Appendix B: Data Model Details

See: `data-models-reporting-system.md` for table schemas and relationships

### Appendix C: Deployment Guide

See: `deployment-guide.md` for n8n infrastructure setup

### Appendix D: Source Tree

See: `source-tree-analysis.md` for logical component structure

---

**Document Version:** 1.0
**Last Updated:** 2025-11-17
**Author:** BMad Method Analyst Agent
**Review Cycle:** Quarterly or upon major system changes
