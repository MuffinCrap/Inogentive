# Data Models - Power BI Reporting System

**Generated:** 2025-11-17
**Project:** Weekly Report Analysis (POC)
**Data Source:** Microsoft Fabric Data Lakehouse
**Architecture:** Star Schema

---

## Overview

The reporting system uses a **star schema** architecture with 2 fact tables and 12 dimension/supporting tables. The model supports sales analytics, customer segmentation, product performance tracking, and returns analysis.

**Total Tables:** 14
**Total Measures:** 39+ DAX calculations
**Date Range:** Jul 2021 - May 2022 (sample data)

---

## Fact Tables

### 1. Sales Data
Primary transaction fact table for order-level sales data.

**Columns:**
- OrderNumber
- OrderLineItem
- OrderQuantity
- QuantityType
- Retail Price
- Revenue
- Customer Lookup (FK to Customer dimension)

**Relationships:**
- → Customer Lookup (many-to-one)
- → Product Lookup (many-to-one, inferred)
- → Calendar Lookup (many-to-one via date field)
- → Territory Lookup (many-to-one, inferred)

**Grain:** One row per order line item

---

### 2. Returns Data
Fact table tracking product returns.

**Columns:**
- ReturnQuantity

**Relationships:**
- → Product Lookup (inferred)
- → Customer Lookup (inferred)
- → Calendar Lookup (inferred via return date)

**Grain:** One row per return transaction

---

## Dimension Tables

### 3. Customer Lookup
Customer master dimension with demographic and profile data.

**Columns:**
- **Key:** CustomerKey (PK)
- **Identity:** Prefix, FirstName, LastName, FullName
- **Demographics:** BirthDate, Birth Year, MaritalStatus, Gender, TotalChildren
- **Contact:** EmailAddress, DomainName
- **Economic:** AnnualIncome, Income Level, Occupation, EducationLevel, Education Category, HomeOwner
- **Segmentation:** Customer Priority, Parent

**Unique Customers:** 17.4K (from dashboard)

---

### 4. Product Lookup
Product master dimension with product hierarchy and pricing.

**Columns:**
- **Key:** ProductKey (PK)
- **Identity:** ProductSKU, ProductName, ModelName
- **Attributes:** ProductDescription, ProductColor, ProductStyle
- **Pricing:** ProductCost, ProductPrice, DiscountPrice, Adjusted Price (calculated)
- **Classification:** SKU Type, SKU Category

**Relationships:**
- → Product Categories Lookup (many-to-one)
- → Product Subcategories Lookup (many-to-one)

---

### 5. Product Categories Lookup
Top-level product category dimension.

**Columns:**
- ProductCategoryKey (PK)
- CategoryName

---

### 6. Product Subcategories Lookup
Product subcategory dimension.

**Columns:**
- ProductSubcategoryKey (PK)
- SubcategoryName

**Relationships:**
- → Product Categories Lookup (many-to-one, inferred)

---

### 7. Territory Lookup
Sales territory dimension for geographic analysis.

**Columns:**
- SalesTerritoryKey (PK)
- Region
- Country
- Continent

---

### 8. Calendar Lookup
Standard date dimension for time-based analysis.

**Columns:**
- **Key:** Date (PK)
- **Day Level:** Day Name, Day of Week, Weekend (flag)
- **Week Level:** Start of Week
- **Month Level:** Month Name, Month Number, Month Short, Start of Month
- **Quarter Level:** Start of Quarter
- **Year Level:** Year, Start of Year

**Date Range:** Covers Jul 2021 - May 2022 (POC data range)

---

### 9. Rolling Calendar
Supplementary calendar table for rolling period calculations.

**Columns:**
- Date (PK)
- Year
- Start of Quarter
- Start of Month

**Purpose:** Supports rolling averages (10-day, 90-day) and period-over-period comparisons

---

## Supporting Tables

### 10. Measures Table
Calculated measures container (DAX measure table).

**Contains:** 39+ DAX measures (see separate measures catalog)

**Categories:**
- Order metrics (Total Orders, Order Quantity, Bulk Orders, Weekend Orders, etc.)
- Revenue metrics (Total Revenue, YTD Revenue, Previous Month Revenue, Revenue Target, etc.)
- Profit metrics (Total Profit, Adjusted Profit, Previous Month Profit, Profit Target, etc.)
- Cost metrics (Total Cost, Adjusted Cost)
- Customer metrics (Total Customers, Revenue Per Customer)
- Return metrics (Total Returns, Return Rate, Bike Returns, Bike Return Rate, etc.)
- Pricing metrics (Average Retail Price, Overall Average Price, Adjusted Price, etc.)
- Target tracking (Order Target Gap, Revenue Target Gap, Profit Target Gap)
- Rolling calculations (10-Day Rolling Revenue, 90-Day Rolling Profit)

---

### 11. Parameter
Parameter table for what-if analysis.

**Columns:**
- Parameter
- Parameter Value (calculated)

**Usage:** Supports dynamic calculations and user-driven scenarios

---

### 12. Price Adjustment Percentage
Price adjustment scenario modeling table.

**Columns:**
- Price Adjustment Percentage
- Price Adjustment Percentage Value (calculated)

**Usage:** Powers price adjustment slider in dashboard (Report Image 2)
**Impact:** Affects Adjusted Price, Adjusted Revenue, Adjusted Profit measures

---

### 13. Product Metric Selection
Parameter table for product metric selection slicer.

**Columns:**
- Product Metric Selection

**Values:** Orders, Revenue, Profit, Returns, Rate
**Usage:** Dynamic measure switching in product drill-down page

---

### 14. Customer Metric Selection
Parameter table for customer metric selection.

**Columns:**
- Customer Metric Selection

**Usage:** Dynamic measure switching in customer analytics page

---

## Data Relationships

**Star Schema Structure:**

```
        Customer Lookup ←------ Sales Data -----→ Product Lookup
              ↑                      ↓                    ↓
        (Demographics)          Calendar         Product Categories
                                    ↓                    ↓
                              Rolling Calendar   Product Subcategories

        Territory Lookup ←------ (inferred from Sales Data)

        Returns Data → Product/Customer/Calendar (inferred)
```

**Key Relationships:**
1. Sales Data → Customer Lookup (many-to-one on CustomerKey)
2. Sales Data → Product Lookup (many-to-one on ProductKey, inferred)
3. Sales Data → Calendar Lookup (many-to-one on OrderDate, inferred)
4. Sales Data → Territory Lookup (many-to-one on SalesTerritoryKey, inferred)
5. Product Lookup → Product Categories (many-to-one)
6. Product Lookup → Product Subcategories (many-to-one)
7. Returns Data → Product/Customer/Calendar (many-to-one, inferred)

---

## Key Measures (Summary)

**Order Metrics:**
- Total Orders, Order Quantity, Bulk Orders, High Ticket Orders, Weekend Orders

**Revenue Metrics:**
- Total Revenue, YTD Revenue, Adjusted Revenue, Previous Month Revenue, Revenue Target, Revenue Target Gap, 10-Day Rolling Revenue

**Profit Metrics:**
- Total Profit, Adjusted Profit, Previous Month Profit, Profit Target, Profit Target Gap, 90-Day Rolling Profit

**Customer Metrics:**
- Total Customers, Revenue Per Customer

**Return Metrics:**
- Total Returns, Return Rate, Quantity Returned, Bike Return Rate, Previous Month Returns

**Comparative Metrics:**
- % of All Orders, % of All Returns, Overall Average Price

See `measures-list.txt` for complete list of 39 measures.

---

## Data Quality Notes

**Sample Data Characteristics:**
- Time Period: Jul 2021 - May 2022 (~11 months)
- Customers: 17,400 unique
- Products: Includes categories like bikes, helmets, accessories
- Orders: 25.2K total (from dashboard KPI)
- Revenue: $24.9M YTD
- Return Rate: 2.17%

**POC Limitations:**
- Dummy data from different business domain (not actual Cards Direct compliance data)
- Limited date range (11 months vs. ongoing operations)
- Simplified schema compared to full production lakehouse

---

## Future State (n8n Automation)

When migrating to automated weekly report generation:

**Data Access Strategy:**
- Microsoft Fabric REST API or SQL endpoint for lakehouse queries
- n8n connectors for Microsoft Fabric / Azure Synapse
- Query same tables/views used by Power BI
- Maintain dimensional model consistency

**Considerations:**
- Ensure n8n has proper authentication to Fabric workspace
- Replicate DAX measure logic in n8n (JavaScript/Python nodes)
- Schedule weekly data refresh + report generation
- Store generated reports in Azure Blob Storage or SharePoint

---

**Last Updated:** 2025-11-17
**Source Files:** `Claude Projects Context files/Fabric/table-schemas.txt`
