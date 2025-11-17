# Source Tree Analysis - Power BI Reporting System

**Generated:** 2025-11-17
**Project:** Weekly Report Analysis (POC)
**System Type:** Business Intelligence Reporting

---

## System Structure Overview

This Power BI reporting system consists of **3 dashboard pages**, a **star schema data model** with 14 tables, and **39+ DAX measures** for analytics calculations.

---

## Logical Component Structure

```
Power BI Reporting System/
│
├── Data Layer (Microsoft Fabric Lakehouse)
│   ├── Fact Tables/
│   │   ├── Sales Data                    # Primary transaction fact (orders, revenue)
│   │   └── Returns Data                  # Return transaction fact
│   │
│   ├── Dimension Tables/
│   │   ├── Customer Lookup              # Customer master with demographics
│   │   ├── Product Lookup               # Product master with hierarchy
│   │   ├── Product Categories Lookup    # Top-level product categories
│   │   ├── Product Subcategories Lookup # Product subcategories
│   │   ├── Territory Lookup             # Geographic territories
│   │   ├── Calendar Lookup              # Standard date dimension
│   │   └── Rolling Calendar             # Rolling period calculations
│   │
│   └── Parameter Tables/
│       ├── Measures Table               # DAX measure container (39+ measures)
│       ├── Parameter                    # What-if parameters
│       ├── Price Adjustment Percentage  # Price scenario modeling
│       ├── Product Metric Selection     # Product page metric switcher
│       └── Customer Metric Selection    # Customer page metric switcher
│
├── Semantic Layer (DAX Measures)
│   ├── Order Metrics/
│   │   ├── Total Orders                 # Count of all orders
│   │   ├── Order Quantity               # Sum of quantities ordered
│   │   ├── Bulk Orders                  # High-quantity orders
│   │   ├── Weekend Orders               # Orders placed on weekends
│   │   └── High Ticket Orders           # Premium price point orders
│   │
│   ├── Revenue Metrics/
│   │   ├── Total Revenue                # Sum of revenue
│   │   ├── YTD Revenue                  # Year-to-date revenue
│   │   ├── Adjusted Revenue             # Revenue with price adjustments
│   │   ├── Previous Month Revenue       # Prior month comparison
│   │   ├── Revenue Target               # Target benchmark
│   │   ├── Revenue Target Gap           # Actual vs. target variance
│   │   └── 10-Day Rolling Revenue       # Short-term rolling average
│   │
│   ├── Profit Metrics/
│   │   ├── Total Profit                 # Revenue - Cost
│   │   ├── Adjusted Profit              # Profit with price adjustments
│   │   ├── Previous Month Profit        # Prior month comparison
│   │   ├── Profit Target                # Target benchmark
│   │   ├── Profit Target Gap            # Actual vs. target variance
│   │   └── 90-Day Rolling Profit        # Quarterly rolling average
│   │
│   ├── Cost Metrics/
│   │   └── Total Cost                   # Sum of product costs
│   │
│   ├── Customer Metrics/
│   │   ├── Total Customers              # Unique customer count
│   │   └── Revenue Per Customer         # Average revenue per customer
│   │
│   ├── Return Metrics/
│   │   ├── Total Returns                # Count of returns
│   │   ├── Quantity Returned            # Sum of returned quantities
│   │   ├── Return Rate                  # Returns as % of orders
│   │   ├── Bike Returns                 # Category-specific returns
│   │   ├── Bike Return Rate             # Bike-specific return %
│   │   └── Previous Month Returns       # Prior month comparison
│   │
│   ├── Pricing Metrics/
│   │   ├── Average Retail Price         # Mean selling price
│   │   ├── Overall Average Price        # Global average price
│   │   └── Adjusted Price               # Price with what-if adjustments
│   │
│   ├── Comparative Metrics/
│   │   ├── % of All Orders              # Proportion of total orders
│   │   ├── % of All Returns             # Proportion of total returns
│   │   ├── Order Target Gap             # Orders vs. target
│   │   └── All Orders / All Returns     # Context measures
│   │
│   └── Target Tracking/
│       ├── Order Target                 # Order count goal
│       ├── Revenue Target               # Revenue goal
│       └── Profit Target                # Profit goal
│
└── Presentation Layer (Power BI Dashboards)
    ├── Page 1: Executive Overview       # High-level KPIs and trends
    │   ├── KPI Cards (4)
    │   │   ├── Revenue YTD ($24.9M)
    │   │   ├── Total Cost ($10.5M)
    │   │   ├── Total Orders (25.2K)
    │   │   └── Return Rate (2.17%)
    │   │
    │   ├── Revenue Trend Chart          # Time-series line chart (Jul 2021 - May 2022)
    │   ├── Orders by Category           # Horizontal bar chart
    │   ├── Top 10 Products Table        # Performance ranking with returns
    │   └── Monthly Metrics Cards        # Previous month comparison (orders, customers)
    │
    ├── Page 2: Product Drill-Down       # Product-level analytics
    │   ├── Selected Product Display     # Current product selection
    │   ├── Target Gauges (3)
    │   │   ├── Orders vs. Target (219 / 251)
    │   │   ├── Revenue vs. Target ($7.4K / £8.4K)
    │   │   └── Profit vs. Target ($4.7K / $5.4K)
    │   │
    │   ├── Profit Trend Chart           # Dual-line (Total vs. Adjusted)
    │   ├── Price Adjustment Slider      # What-if analysis control
    │   ├── Metric Selection Slicer      # Orders / Revenue / Profit / Returns / Rate
    │   └── Time Series Chart            # Selected metric over time
    │
    └── Page 3: Customer Analytics       # Customer segmentation
        ├── Customer KPIs (2)
        │   ├── Unique Customers (17.4K)
        │   └── Avg Revenue/Customer ($1,431)
        │
        ├── Customer Trend Chart         # Growth over time
        ├── Orders by Occupation Donut   # Demographic breakdown
        ├── Orders by Income Level Donut # Economic segmentation
        ├── Customer List Table          # Detailed customer roster with performance
        ├── Top Customer Highlight       # Featured customer (Mr. Maurice Shan)
        └── Top 100 Customers Filter     # Toggle for top customers
```

---

## Critical Paths

### Data Flow
```
Microsoft Fabric Lakehouse
    ↓
Power BI Semantic Model (Import/DirectQuery)
    ↓
DAX Measure Calculations
    ↓
Dashboard Visualizations
    ↓
Published Reports → Email/Web
```

### Future Automation Flow (n8n)
```
Microsoft Fabric Lakehouse
    ↓
n8n HTTP Request / SQL Query Node
    ↓
JavaScript/Python Calculation Nodes (replicate DAX logic)
    ↓
Report Generation Node (PDF/HTML)
    ↓
Email Delivery / SharePoint Upload
```

---

## Key Integration Points

### Current State (Manual Process)
1. **Power BI Desktop** → Connects to Fabric Lakehouse
2. **Manual Data Refresh** → Scheduled or on-demand
3. **Screenshot Capture** → Manual export of visualizations
4. **Email Composition** → Manual analysis writing
5. **Distribution** → Manual email send

### Future State (Automated via n8n)
1. **n8n Scheduler** → Weekly trigger (e.g., Monday 9 AM)
2. **Fabric API/SQL Connector** → Pull latest data
3. **Calculation Nodes** → Execute measure logic (JavaScript/Python)
4. **Template Engine** → Generate narrative analysis
5. **PDF Generation** → Create formatted report
6. **Email Node** → Auto-send to stakeholders

---

## Entry Points

### Power BI Report Entry Point
- **File:** `[Report Name].pbix` (Power BI Desktop file)
- **Published:** Power BI Service workspace
- **Access:** Web portal or Power BI mobile app

### n8n Workflow Entry Point (Future)
- **Workflow:** `weekly-report-automation.json` (n8n workflow definition)
- **Trigger:** Cron schedule (weekly)
- **Inputs:** Fabric workspace credentials, recipient list, report parameters

---

## Supporting Files (POC Materials)

```
Claude Projects Context files/
├── Example Weekly Report.pdf        # Sample output format
├── Weekly Compliance Report (3).eml # Email communication template
├── PowerBI/
│   ├── dashboard-screenshots/       # Visual reference (3 pages)
│   │   ├── Report image 1.png       # Executive overview
│   │   ├── Report image 2.png       # Product drill-down
│   │   └── Report image 3.png       # Customer analytics
│   │
│   └── measures-list.txt            # DAX measures catalog (39 measures)
│
└── Fabric/
    └── table-schemas.txt            # Data model documentation (14 tables)
```

---

## Dashboard Page Hierarchy

```
Report (3 pages)
│
├── Page 1: Executive Overview
│   ├── Filter Context: None (all data)
│   ├── Cross-filtering: Enabled
│   └── Drill-through: → Product Drill-Down page
│
├── Page 2: Product Drill-Down
│   ├── Filter Context: Selected Product
│   ├── Parameters: Price Adjustment %, Metric Selection
│   ├── Cross-filtering: Enabled
│   └── Drill-through Source: Product selection from Page 1
│
└── Page 3: Customer Analytics
    ├── Filter Context: Optional Top 100 filter
    ├── Segmentation: Occupation, Income Level
    ├── Cross-filtering: Enabled
    └── Detail View: Individual customer performance
```

---

## Data Refresh Strategy

### Current (Power BI)
- **Frequency:** Manual or scheduled (daily/weekly)
- **Method:** Power BI Service gateway or direct Fabric connection
- **Scope:** Full data model refresh

### Future (n8n Automation)
- **Frequency:** Weekly (aligned with report schedule)
- **Method:** API queries for delta or full extract
- **Scope:** Only data needed for weekly report (last 7 days + comparisons)
- **Performance:** Optimized for speed (no full semantic model)

---

## Measure Dependencies

Key measure relationships (simplified):

```
Total Revenue
    ↓
YTD Revenue → Revenue Target → Revenue Target Gap
    ↓
Total Profit → Profit Target → Profit Target Gap
    ↓
Adjusted Profit (depends on Price Adjustment %)

Return Rate = Total Returns / Total Orders

Revenue Per Customer = Total Revenue / Total Customers
```

---

## Filters and Parameters

### Global Filters (all pages)
- Date range slicer (implicitly via Calendar table)
- Category/Product hierarchy filters

### Page-Specific Parameters

**Page 2 (Product Drill-Down):**
- `Price Adjustment Percentage` → Affects Adjusted Revenue, Adjusted Profit
- `Product Metric Selection` → Switches displayed metric in time series

**Page 3 (Customer Analytics):**
- `Top 100 Customers` → Toggle filter
- `Customer Metric Selection` → Dynamic metric display

---

## Notable Patterns

### Star Schema Best Practices
✓ Fact tables contain measures (Sales, Returns)
✓ Dimension tables contain attributes (Customer, Product, Calendar)
✓ One-to-many relationships from dimensions to facts
✓ Separate measure table for DAX calculations

### Time Intelligence
✓ Calendar table with full date hierarchy
✓ Rolling Calendar for period calculations
✓ YTD, Previous Month, Rolling Average measures

### What-If Analysis
✓ Price Adjustment parameter table
✓ Calculated measures respond to parameter changes
✓ Visual feedback in real-time

---

**Last Updated:** 2025-11-17
**Source:** Dashboard screenshots, table schemas, measures list
