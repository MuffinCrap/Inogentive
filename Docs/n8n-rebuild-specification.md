# COMPREHENSIVE N8N WORKFLOW REBUILD: WEEKLY COMPLIANCE REPORT AUTOMATION FOR CARDS DIRECT

You are a senior automation engineer and AI integration specialist tasked with completely rebuilding a proof-of-concept weekly report automation system. This is a production-critical implementation that will save 30-60 minutes weekly and improve compliance visibility for a 90+ store UK retail chain.

## PROJECT OVERVIEW

### Problem Statement
Cards Direct currently generates a comprehensive 31-page weekly compliance report manually every Monday. The process involves:
- Accessing RotaReady system data
- Manually analyzing compliance across 5 geographic areas and 90+ stores
- Creating detailed PDF reports with tables, charts, and color-coded exceptions
- Writing narrative email summaries highlighting key issues
- Distributing to executives

This manual process takes 30-60 minutes weekly and is prone to inconsistency and human error.

### Current State
- Original POC: Node.js backend with mock AdventureWorks data
- Components: powerbi.js, analysis.js, email.js, index.js
- Power BI integration was blocked due to licensing constraints
- Not production-ready

### Target State
- Fully automated n8n workflow running on Azure
- OAuth2 authentication to Microsoft Fabric API
- Real-time data extraction from Cards Direct's Power BI dataset
- AI-powered analysis using GPT-4o
- Automated PDF generation matching current 31-page format
- Automated email composition and distribution
- Scheduled execution every Monday at 9 AM
- Complete execution in under 5 minutes
- Audit trail and error logging

### Success Criteria
1. **Accuracy**: Report matches manual report structure and content 95%+ accuracy
2. **Completeness**: All 5 areas covered with store-level detail
3. **Timeliness**: Delivered by 9:30 AM every Monday
4. **Reliability**: 99% uptime with graceful error handling
5. **Maintainability**: Non-technical users can modify thresholds and recipients
6. **Compliance**: GDPR-compliant data handling and audit trails

### Scope Boundaries
**IN SCOPE:**
- Weekly automated report generation
- Data extraction via API
- AI-powered narrative analysis
- PDF and email generation
- Error handling and logging
- Azure deployment

**OUT OF SCOPE:**
- Real-time dashboards
- Interactive report modifications
- User authentication/portal
- Historical trend analysis beyond week-over-week
- Integration with other systems beyond Power BI

## TECHNICAL ARCHITECTURE

### Platform Specifications
- **Automation Engine**: n8n (self-hosted on Azure)
- **Database**: PostgreSQL (for n8n workflow persistence)
- **Hosting**: Azure Virtual Machine or Container Instance
- **Storage**: Azure Blob Storage (report archive)
- **AI**: OpenAI GPT-4o API
- **Scheduling**: n8n Cron trigger

### Complete n8n Workflow Design

```
WORKFLOW: Weekly_Compliance_Report_Cards_Direct

[1] Cron Trigger (Monday 9:00 AM)
    ↓
[2] Set Workflow Variables
    ↓
[3] Get OAuth Token (HTTP Request)
    ↓
[4] Check Token Validity (IF node)
    ↓ (success)
[5] Get Dataset Metadata (HTTP Request)
    ↓
[6] Parse Metadata (Code node)
    ↓
[7] Extract Payroll Data (HTTP Request - DAX)
    ↓
[8] Extract Cash Control Data (HTTP Request - DAX)
    ↓
[9] Extract Stock Control Data (HTTP Request - DAX)
    ↓
[10] Merge Data Streams (Merge node)
    ↓
[11] Transform & Aggregate by Area (Code node)
    ↓
[12] Calculate KPIs & Exceptions (Code node)
    ↓
[13] Prepare AI Context (Code node)
    ↓
[14] Generate Narrative Analysis (HTTP Request - OpenAI)
    ↓
[15] Parse AI Response (Code node)
    ↓
[16] Generate PDF Report (Code node - PDFKit)
    ↓
[17] Compose Email (Email Send node)
    ↓
[18] Archive to Azure Blob (HTTP Request)
    ↓
[19] Log Success (Code node)
    ↓
[20] END

[4] ↓ (failure)
[21] Error Handler
    ↓
[22] Send Alert Email
    ↓
[23] Log Error
    ↓
[24] END
```

### Node-by-Node Configuration

#### NODE 1: Cron Trigger
```json
{
  "name": "Schedule - Every Monday 9AM",
  "type": "n8n-nodes-base.cron",
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "cronExpression",
          "expression": "0 9 * * 1"
        }
      ]
    }
  },
  "position": [250, 300]
}
```

#### NODE 2: Set Workflow Variables
```javascript
// Code node to set configuration
const config = {
  // API Configuration
  tenantId: '73890052-7df3-4774-bed7-b43d5ebd83db',
  clientId: '6492b933-768a-47a6-a808-5b47192f672e',
  clientSecret: 'YOb8Q~.M6rf-dNuX_3tTMmQPOnMCEr58vWExOddf',
  scope: 'https://api.fabric.microsoft.com/.default',
  datasetId: '80c0dd7c-ba46-4543-be77-faf57e0b806a',
  workspaceId: '99355c3e-0913-4d08-a77c-2934cf1c94fb',
  reportId: '6f5ef0e1-f6f9-4d79-a8ce-a98b4eaeb85c',

  // Report Configuration
  reportTitle: 'Weekly Compliance Report',
  reportWeek: new Date().toISOString().split('T')[0],
  areas: ['Area 1', 'Area 2', 'Area 3', 'Area 4', 'Area 5'],

  // Threshold Configuration
  thresholds: {
    hoursVariancePercent: 5,
    manualClockInPercent: 10,
    cashDiscrepancyAmount: 50,
    refundPercent: 3,
    stockAdjustmentPercent: 2
  },

  // Email Configuration
  recipients: ['matt@cardsdirect.co.uk', 'chirag@cardsdirect.co.uk'],
  ccRecipients: ['executives@cardsdirect.co.uk'],

  // OpenAI Configuration
  openaiApiKey: $env.OPENAI_API_KEY,
  openaiModel: 'gpt-4o'
};

return [{ json: config }];
```

#### NODE 3: Get OAuth Token
```json
{
  "name": "Get OAuth Token",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "=https://login.microsoftonline.com/{{$json.tenantId}}/oauth2/v2.0/token",
    "authentication": "none",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "grant_type",
          "value": "client_credentials"
        },
        {
          "name": "client_id",
          "value": "={{$json.clientId}}"
        },
        {
          "name": "client_secret",
          "value": "={{$json.clientSecret}}"
        },
        {
          "name": "scope",
          "value": "={{$json.scope}}"
        }
      ]
    },
    "options": {
      "timeout": 30000
    }
  }
}
```

#### NODE 4: Check Token Validity
```javascript
// IF node condition
const token = $input.first().json.access_token;

if (!token || token.length < 100) {
  throw new Error('Failed to obtain valid OAuth token');
}

return [{ json: {
  accessToken: token,
  tokenObtained: true,
  timestamp: new Date().toISOString()
}}];
```

#### NODE 5: Get Dataset Metadata
```json
{
  "name": "Get Dataset Metadata",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://pbi-dotnet-app.azurewebsites.net/api/metadata/AI Testing/80c0dd7c-ba46-4543-be77-faf57e0b806a?code=YKevjeGeeM5BXAIW6Li3Aqx4iQjHWzjuymCXc0DUK17wAzFuTX2OfA==",
    "authentication": "none",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": []
    },
    "body": "={{ JSON.stringify({\n  \"client\": {\n    \"POWERBI_TENANT_ID\": $json.tenantId,\n    \"POWERBI_CLIENT_ID\": $json.clientId,\n    \"POWERBI_CLIENT_SECRET\": $json.clientSecret\n  }\n}) }}",
    "options": {
      "timeout": 60000
    }
  }
}
```

#### NODE 6: Parse Metadata
```javascript
// Extract available tables and measures from metadata
const metadata = $input.first().json;
const config = $('Set Workflow Variables').first().json;

// Parse metadata to identify relevant tables
const tables = metadata.tables || [];
const measures = metadata.measures || [];

// Identify key tables for our report
const relevantTables = {
  stores: tables.find(t => t.name.toLowerCase().includes('store')),
  calendar: tables.find(t => t.name.toLowerCase().includes('calendar')),
  budgetHours: tables.find(t => t.name.toLowerCase().includes('budget')),
  users: tables.find(t => t.name.toLowerCase().includes('user')),
  clocking: tables.find(t => t.name.toLowerCase().includes('clock')),
  cash: tables.find(t => t.name.toLowerCase().includes('cash')),
  stock: tables.find(t => t.name.toLowerCase().includes('stock'))
};

// Identify key measures
const keyMeasures = {
  workedHours: measures.find(m => m.name === 'Worked_Hours'),
  budgetHours: measures.find(m => m.name === 'Budget_Hours'),
  manualClockIns: measures.find(m => m.name.includes('Manual_Clock')),
  cashDiscrepancy: measures.find(m => m.name.includes('Cash_Discrepancy')),
  refunds: measures.find(m => m.name.includes('Refund')),
  stockAdjustments: measures.find(m => m.name.includes('Stock_Adjustment'))
};

return [{
  json: {
    ...config,
    accessToken: $('Get OAuth Token').first().json.access_token,
    metadata: {
      tables: relevantTables,
      measures: keyMeasures,
      fullMetadata: metadata
    }
  }
}];
```

#### NODE 7: Extract Payroll Data
```javascript
// HTTP Request node - Execute DAX query for payroll data
const context = $input.first().json;

const daxQuery = {
  "queries": [
    {
      "query": `
        EVALUATE
        SUMMARIZECOLUMNS(
          Stores[Area],
          Stores[Store_Name],
          Stores[Store_ID],
          Calendar[Week_Ending],
          "Worked_Hours", [Worked_Hours],
          "Budget_Hours", [Budget_Hours],
          "Hours_Variance", [Worked_Hours] - [Budget_Hours],
          "Variance_Percent", DIVIDE([Worked_Hours] - [Budget_Hours], [Budget_Hours], 0) * 100,
          "Manual_Clock_Ins", [Manual_Clock_In_Count],
          "Total_Clock_Ins", [Total_Clock_In_Count],
          "Manual_Clock_Percent", DIVIDE([Manual_Clock_In_Count], [Total_Clock_In_Count], 0) * 100
        )
        FILTER(
          Calendar[Week_Ending] = DATE(YEAR(TODAY()), MONTH(TODAY()), DAY(TODAY()) - WEEKDAY(TODAY(), 2) + 7)
        )
        ORDER BY Stores[Area], Stores[Store_Name]
      `
    }
  ]
};

// Configuration for HTTP Request node
return {
  method: 'POST',
  url: `https://api.powerbi.com/v1.0/myorg/datasets/${context.datasetId}/executeQueries`,
  headers: {
    'Authorization': `Bearer ${context.accessToken}`,
    'Content-Type': 'application/json'
  },
  body: daxQuery
};
```

#### NODE 8: Extract Cash Control Data
```javascript
// HTTP Request node - Execute DAX query for cash control data
const context = $input.first().json;

const daxQuery = {
  "queries": [
    {
      "query": `
        EVALUATE
        SUMMARIZECOLUMNS(
          Stores[Area],
          Stores[Store_Name],
          Stores[Store_ID],
          Calendar[Week_Ending],
          "Cash_Discrepancy_Till", [Cash_Discrepancy_Till],
          "Cash_Discrepancy_Safe", [Cash_Discrepancy_Safe],
          "Cash_Discrepancy_Petty", [Cash_Discrepancy_Petty_Cash],
          "Total_Cash_Discrepancy", [Total_Cash_Discrepancy],
          "Float_Discrepancy", [Float_Discrepancy],
          "Refund_Amount", [Refund_Amount],
          "Total_Sales", [Total_Sales],
          "Refund_Percent", DIVIDE([Refund_Amount], [Total_Sales], 0) * 100,
          "Discount_Amount", [Discount_Amount],
          "Discount_Percent", DIVIDE([Discount_Amount], [Total_Sales], 0) * 100
        )
        FILTER(
          Calendar[Week_Ending] = DATE(YEAR(TODAY()), MONTH(TODAY()), DAY(TODAY()) - WEEKDAY(TODAY(), 2) + 7)
        )
        ORDER BY Stores[Area], Stores[Store_Name]
      `
    }
  ]
};

return {
  method: 'POST',
  url: `https://api.powerbi.com/v1.0/myorg/datasets/${context.datasetId}/executeQueries`,
  headers: {
    'Authorization': `Bearer ${context.accessToken}`,
    'Content-Type': 'application/json'
  },
  body: daxQuery
};
```

#### NODE 9: Extract Stock Control Data
```javascript
// HTTP Request node - Execute DAX query for stock control data
const context = $input.first().json;

const daxQuery = {
  "queries": [
    {
      "query": `
        EVALUATE
        SUMMARIZECOLUMNS(
          Stores[Area],
          Stores[Store_Name],
          Stores[Store_ID],
          Calendar[Week_Ending],
          "Stock_Writeoff_Amount", [Stock_Writeoff_Amount],
          "Stock_Adjustment_Amount", [Stock_Adjustment_Amount],
          "Manual_Adjustment_Count", [Manual_Adjustment_Count],
          "PO_Outstanding_Count", [PO_Outstanding_Count],
          "Transfer_Outstanding_Count", [Transfer_Outstanding_Count],
          "Stamp_Discrepancy", [Stamp_Discrepancy],
          "Stocktake_Completed", [Stocktake_Completed_Flag],
          "Stocktake_Due", [Stocktake_Due_Flag],
          "Consumables_Ordered", [Consumables_Ordered_Flag],
          "Consumables_Due", [Consumables_Due_Flag]
        )
        FILTER(
          Calendar[Week_Ending] = DATE(YEAR(TODAY()), MONTH(TODAY()), DAY(TODAY()) - WEEKDAY(TODAY(), 2) + 7)
        )
        ORDER BY Stores[Area], Stores[Store_Name]
      `
    }
  ]
};

return {
  method: 'POST',
  url: `https://api.powerbi.com/v1.0/myorg/datasets/${context.datasetId}/executeQueries`,
  headers: {
    'Authorization': `Bearer ${context.accessToken}`,
    'Content-Type': 'application/json'
  },
  body: daxQuery
};
```

#### NODE 10: Merge Data Streams
```javascript
// Code node - Merge all data sources
const payrollData = $('Extract Payroll Data').first().json.results[0].tables[0].rows;
const cashData = $('Extract Cash Control Data').first().json.results[0].tables[0].rows;
const stockData = $('Extract Stock Control Data').first().json.results[0].tables[0].rows;
const config = $('Parse Metadata').first().json;

// Merge data by store
const mergedData = {};

payrollData.forEach(row => {
  const storeId = row['[Stores].[Store_ID]'];
  mergedData[storeId] = {
    area: row['[Stores].[Area]'],
    storeName: row['[Stores].[Store_Name]'],
    storeId: storeId,
    payroll: row
  };
});

cashData.forEach(row => {
  const storeId = row['[Stores].[Store_ID]'];
  if (mergedData[storeId]) {
    mergedData[storeId].cash = row;
  }
});

stockData.forEach(row => {
  const storeId = row['[Stores].[Store_ID]'];
  if (mergedData[storeId]) {
    mergedData[storeId].stock = row;
  }
});

// Convert to array and group by area
const storeArray = Object.values(mergedData);
const byArea = {};

storeArray.forEach(store => {
  if (!byArea[store.area]) {
    byArea[store.area] = [];
  }
  byArea[store.area].push(store);
});

return [{
  json: {
    ...config,
    data: {
      byStore: storeArray,
      byArea: byArea,
      totalStores: storeArray.length
    }
  }
}];
```

#### NODE 11: Transform & Aggregate by Area
```javascript
// Code node - Calculate area-level aggregations
const context = $input.first().json;
const byArea = context.data.byArea;
const thresholds = context.thresholds;

const areaSummaries = {};

Object.keys(byArea).forEach(areaName => {
  const stores = byArea[areaName];

  // Payroll aggregations
  const totalWorkedHours = stores.reduce((sum, s) => sum + (s.payroll?.['[Worked_Hours]'] || 0), 0);
  const totalBudgetHours = stores.reduce((sum, s) => sum + (s.payroll?.['[Budget_Hours]'] || 0), 0);
  const totalManualClockIns = stores.reduce((sum, s) => sum + (s.payroll?.['[Manual_Clock_Ins]'] || 0), 0);
  const totalClockIns = stores.reduce((sum, s) => sum + (s.payroll?.['[Total_Clock_Ins]'] || 0), 0);

  // Cash aggregations
  const totalCashDiscrepancy = stores.reduce((sum, s) => sum + Math.abs(s.cash?.['[Total_Cash_Discrepancy]'] || 0), 0);
  const totalRefunds = stores.reduce((sum, s) => sum + (s.cash?.['[Refund_Amount]'] || 0), 0);
  const totalSales = stores.reduce((sum, s) => sum + (s.cash?.['[Total_Sales]'] || 0), 0);

  // Stock aggregations
  const totalStockAdjustments = stores.reduce((sum, s) => sum + (s.stock?.['[Stock_Adjustment_Amount]'] || 0), 0);
  const totalPOsOutstanding = stores.reduce((sum, s) => sum + (s.stock?.['[PO_Outstanding_Count]'] || 0), 0);
  const stocktakesIncomplete = stores.filter(s => s.stock?.['[Stocktake_Due]'] && !s.stock?.['[Stocktake_Completed]']).length;

  areaSummaries[areaName] = {
    areaName,
    storeCount: stores.length,
    payroll: {
      workedHours: totalWorkedHours,
      budgetHours: totalBudgetHours,
      variance: totalWorkedHours - totalBudgetHours,
      variancePercent: ((totalWorkedHours - totalBudgetHours) / totalBudgetHours * 100).toFixed(2),
      manualClockIns: totalManualClockIns,
      totalClockIns: totalClockIns,
      manualClockPercent: (totalManualClockIns / totalClockIns * 100).toFixed(2)
    },
    cash: {
      totalDiscrepancy: totalCashDiscrepancy,
      refundAmount: totalRefunds,
      totalSales: totalSales,
      refundPercent: (totalRefunds / totalSales * 100).toFixed(2)
    },
    stock: {
      adjustmentAmount: totalStockAdjustments,
      posOutstanding: totalPOsOutstanding,
      stocktakesIncomplete: stocktakesIncomplete
    },
    stores: stores
  };
});

return [{
  json: {
    ...context,
    areaSummaries: areaSummaries
  }
}];
```

#### NODE 12: Calculate KPIs & Exceptions
```javascript
// Code node - Flag exceptions based on thresholds
const context = $input.first().json;
const areaSummaries = context.areaSummaries;
const thresholds = context.thresholds;

const exceptions = {
  critical: [],
  warning: [],
  info: []
};

Object.values(areaSummaries).forEach(area => {
  // Check payroll variances
  if (Math.abs(area.payroll.variancePercent) > thresholds.hoursVariancePercent) {
    exceptions.critical.push({
      area: area.areaName,
      type: 'PAYROLL',
      issue: `Hours variance ${area.payroll.variancePercent}% (threshold: ${thresholds.hoursVariancePercent}%)`,
      value: area.payroll.variance,
      severity: Math.abs(area.payroll.variancePercent) > 10 ? 'RED' : 'YELLOW'
    });
  }

  if (area.payroll.manualClockPercent > thresholds.manualClockInPercent) {
    exceptions.warning.push({
      area: area.areaName,
      type: 'PAYROLL',
      issue: `Manual clock-ins ${area.payroll.manualClockPercent}% (threshold: ${thresholds.manualClockInPercent}%)`,
      value: area.payroll.manualClockIns,
      severity: area.payroll.manualClockPercent > 20 ? 'RED' : 'YELLOW'
    });
  }

  // Check cash discrepancies
  if (area.cash.totalDiscrepancy > thresholds.cashDiscrepancyAmount) {
    exceptions.critical.push({
      area: area.areaName,
      type: 'CASH',
      issue: `Cash discrepancy £${area.cash.totalDiscrepancy.toFixed(2)} (threshold: £${thresholds.cashDiscrepancyAmount})`,
      value: area.cash.totalDiscrepancy,
      severity: area.cash.totalDiscrepancy > 100 ? 'RED' : 'YELLOW'
    });
  }

  if (area.cash.refundPercent > thresholds.refundPercent) {
    exceptions.warning.push({
      area: area.areaName,
      type: 'CASH',
      issue: `Refunds ${area.cash.refundPercent}% of sales (threshold: ${thresholds.refundPercent}%)`,
      value: area.cash.refundAmount,
      severity: area.cash.refundPercent > 5 ? 'RED' : 'YELLOW'
    });
  }

  // Check stock issues
  if (area.stock.stocktakesIncomplete > 0) {
    exceptions.warning.push({
      area: area.areaName,
      type: 'STOCK',
      issue: `${area.stock.stocktakesIncomplete} incomplete stocktakes`,
      value: area.stock.stocktakesIncomplete,
      severity: area.stock.stocktakesIncomplete > 2 ? 'RED' : 'YELLOW'
    });
  }

  // Store-level exceptions
  area.stores.forEach(store => {
    const storeHoursVariance = store.payroll?.['[Variance_Percent]'] || 0;
    if (Math.abs(storeHoursVariance) > thresholds.hoursVariancePercent) {
      exceptions.info.push({
        area: area.areaName,
        store: store.storeName,
        type: 'PAYROLL',
        issue: `Store hours variance ${storeHoursVariance.toFixed(2)}%`,
        value: store.payroll?.['[Hours_Variance]'] || 0,
        severity: Math.abs(storeHoursVariance) > 10 ? 'RED' : 'YELLOW'
      });
    }
  });
});

return [{
  json: {
    ...context,
    exceptions: exceptions,
    exceptionCount: {
      critical: exceptions.critical.length,
      warning: exceptions.warning.length,
      info: exceptions.info.length,
      total: exceptions.critical.length + exceptions.warning.length + exceptions.info.length
    }
  }
}];
```

#### NODE 13: Prepare AI Context
```javascript
// Code node - Structure data for GPT-4o analysis
const context = $input.first().json;
const areaSummaries = context.areaSummaries;
const exceptions = context.exceptions;

// Create structured context for AI
const aiContext = {
  reportWeek: context.reportWeek,
  companyName: "Cards Direct",
  totalStores: context.data.totalStores,
  areas: Object.keys(areaSummaries).length,

  // Area summaries
  areaSummaries: Object.values(areaSummaries).map(area => ({
    name: area.areaName,
    stores: area.storeCount,
    payroll: {
      workedHours: area.payroll.workedHours.toFixed(2),
      budgetHours: area.payroll.budgetHours.toFixed(2),
      varianceHours: area.payroll.variance.toFixed(2),
      variancePercent: area.payroll.variancePercent,
      manualClockIns: area.payroll.manualClockIns,
      manualClockPercent: area.payroll.manualClockPercent
    },
    cash: {
      discrepancy: area.cash.totalDiscrepancy.toFixed(2),
      refunds: area.cash.refundAmount.toFixed(2),
      refundPercent: area.cash.refundPercent
    },
    stock: {
      posOutstanding: area.stock.posOutstanding,
      stocktakesIncomplete: area.stock.stocktakesIncomplete
    }
  })),

  // Exceptions by severity
  criticalIssues: exceptions.critical,
  warnings: exceptions.warning,

  // Top store-level issues (top 10 by severity)
  topStoreIssues: exceptions.info
    .sort((a, b) => {
      const severityOrder = { RED: 3, YELLOW: 2, GREEN: 1 };
      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    })
    .slice(0, 10)
};

return [{
  json: {
    ...context,
    aiContext: aiContext
  }
}];
```

#### NODE 14: Generate Narrative Analysis (OpenAI)
```javascript
// HTTP Request node - Call GPT-4o
const context = $input.first().json;
const aiContext = context.aiContext;

const systemPrompt = `You are an expert retail operations analyst specializing in UK compliance reporting for multi-site retail chains. Your role is to analyze weekly operational data and write concise, actionable executive summaries.

CONTEXT:
- Company: Cards Direct (90+ retail stores across UK)
- Report Type: Weekly Compliance Report
- Audience: Executive team (CEO, COO, Finance Director, Area Managers)
- Tone: Professional, direct, action-oriented

REPORTING STRUCTURE:
The report covers three main compliance areas:

1. PAYROLL
   - Worked hours vs budget (rota hours)
   - Manual clock-in compliance
   - Store-level variances

2. CASH CONTROLS
   - Cash discrepancies (till, safe, petty cash)
   - Float discrepancies
   - Refunds and discounts as % of sales

3. STOCK CONTROL
   - Stock adjustments and write-offs
   - Outstanding POs and transfers
   - Stocktake completion
   - Consumables ordering

WRITING GUIDELINES:
1. Start each section with area-level summary
2. Highlight exceptions (red/yellow flags) with specific values
3. Call out individual stores requiring attention
4. Request explanations for significant variances
5. Use UK terminology and currency (£)
6. Be concise but specific (include actual numbers)
7. Organize by geographic area (Area 1-5)
8. Use bullet points for clarity

SEVERITY LEVELS:
- RED: Immediate action required (mention "requires urgent attention")
- YELLOW: Monitor closely (mention "please review")
- GREEN: Within acceptable range (no mention needed)

OUTPUT FORMAT:
Structured email with clear sections:
- PAYROLL section
- CASH CONTROLS section
- STOCK CONTROL section
Each section organized by Area 1-5, with specific store callouts.`;

const userPrompt = `Generate the executive summary email for this week's compliance report.

REPORT DATA:
${JSON.stringify(aiContext, null, 2)}

Write a professional email narrative following the structure described in your system prompt. Focus on exceptions and actionable items. Be specific with store names and values.`;

const requestBody = {
  model: context.openaiModel,
  messages: [
    {
      role: "system",
      content: systemPrompt
    },
    {
      role: "user",
      content: userPrompt
    }
  ],
  temperature: 0.3,
  max_tokens: 2000
};

return {
  method: 'POST',
  url: 'https://api.openai.com/v1/chat/completions',
  headers: {
    'Authorization': `Bearer ${context.openaiApiKey}`,
    'Content-Type': 'application/json'
  },
  body: requestBody
};
```

#### NODE 15: Parse AI Response
```javascript
// Code node - Extract narrative from OpenAI response
const context = $input.first().json;
const openaiResponse = $('Generate Narrative Analysis').first().json;

const narrative = openaiResponse.choices[0].message.content;

// Extract sections from narrative
const sections = {
  payroll: '',
  cashControls: '',
  stockControl: ''
};

// Simple parsing based on section headers
const payrollMatch = narrative.match(/PAYROLL[\s\S]*?(?=CASH CONTROLS|$)/i);
const cashMatch = narrative.match(/CASH CONTROLS[\s\S]*?(?=STOCK CONTROL|$)/i);
const stockMatch = narrative.match(/STOCK CONTROL[\s\S]*$/i);

if (payrollMatch) sections.payroll = payrollMatch[0].trim();
if (cashMatch) sections.cashControls = cashMatch[0].trim();
if (stockMatch) sections.stockControl = stockMatch[0].trim();

return [{
  json: {
    ...context,
    narrative: {
      full: narrative,
      sections: sections
    }
  }
}];
```

#### NODE 16: Generate PDF Report
```javascript
// Code node using PDFKit - Generate 31-page report
const PDFDocument = require('pdfkit');
const context = $input.first().json;
const areaSummaries = context.areaSummaries;
const exceptions = context.exceptions;

// Create PDF
const doc = new PDFDocument({
  size: 'A4',
  margin: 50,
  info: {
    Title: `Weekly Compliance Report - ${context.reportWeek}`,
    Author: 'Cards Direct Automation System'
  }
});

// Helper function: Add header
function addHeader(doc, title) {
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .text(title, 50, 50)
     .fontSize(10)
     .font('Helvetica')
     .text(`Week Ending: ${context.reportWeek}`, 50, 80)
     .moveDown();
}

// Helper function: Add table with color coding
function addTable(doc, headers, rows, highlightConditions) {
  const tableTop = doc.y;
  const columnWidth = 100;
  const rowHeight = 20;

  // Draw headers
  doc.font('Helvetica-Bold').fontSize(9);
  headers.forEach((header, i) => {
    doc.text(header, 50 + (i * columnWidth), tableTop, {
      width: columnWidth,
      align: 'left'
    });
  });

  doc.moveDown();

  // Draw rows
  doc.font('Helvetica').fontSize(8);
  rows.forEach((row, rowIndex) => {
    const y = tableTop + ((rowIndex + 1) * rowHeight);

    // Check if row needs highlighting
    const highlight = highlightConditions(row);
    if (highlight === 'RED') {
      doc.fillColor('red').opacity(0.2)
         .rect(50, y - 2, 500, rowHeight)
         .fill()
         .fillColor('black').opacity(1);
    } else if (highlight === 'YELLOW') {
      doc.fillColor('yellow').opacity(0.3)
         .rect(50, y - 2, 500, rowHeight)
         .fill()
         .fillColor('black').opacity(1);
    }

    // Draw row data
    row.forEach((cell, cellIndex) => {
      doc.text(cell, 50 + (cellIndex * columnWidth), y, {
        width: columnWidth,
        align: 'left'
      });
    });
  });

  doc.moveDown(2);
}

// PAGE 1: Title Page
addHeader(doc, 'Weekly Compliance Report');
doc.fontSize(14)
   .text('Cards Direct', { align: 'center' })
   .moveDown()
   .fontSize(10)
   .text(`Generated: ${new Date().toLocaleString('en-GB')}`, { align: 'center' })
   .moveDown(2)
   .text(`Total Stores: ${context.data.totalStores}`, { align: 'center' })
   .text(`Areas: ${Object.keys(areaSummaries).length}`, { align: 'center' })
   .moveDown(2);

// Exception Summary
doc.fontSize(12).font('Helvetica-Bold').text('Exception Summary', { align: 'center' });
doc.fontSize(10).font('Helvetica').moveDown();
doc.text(`Critical Issues: ${context.exceptionCount.critical}`, { align: 'center' });
doc.text(`Warnings: ${context.exceptionCount.warning}`, { align: 'center' });
doc.text(`Total Exceptions: ${context.exceptionCount.total}`, { align: 'center' });

// PAGES 2-10: PAYROLL SECTION (by area)
Object.values(areaSummaries).forEach(area => {
  doc.addPage();
  addHeader(doc, `PAYROLL - ${area.areaName}`);

  // Area summary
  doc.fontSize(12).font('Helvetica-Bold').text('Area Summary');
  doc.fontSize(10).font('Helvetica').moveDown(0.5);
  doc.text(`Worked Hours: ${area.payroll.workedHours.toFixed(2)}`);
  doc.text(`Budget Hours: ${area.payroll.budgetHours.toFixed(2)}`);
  doc.text(`Variance: ${area.payroll.variance.toFixed(2)} (${area.payroll.variancePercent}%)`);
  doc.text(`Manual Clock-Ins: ${area.payroll.manualClockIns} (${area.payroll.manualClockPercent}%)`);
  doc.moveDown(2);

  // Store-level table
  doc.fontSize(12).font('Helvetica-Bold').text('Store Breakdown');
  doc.moveDown(0.5);

  const headers = ['Store', 'Worked', 'Budget', 'Variance %', 'Manual %'];
  const rows = area.stores.map(store => [
    store.storeName,
    (store.payroll?.['[Worked_Hours]'] || 0).toFixed(1),
    (store.payroll?.['[Budget_Hours]'] || 0).toFixed(1),
    (store.payroll?.['[Variance_Percent]'] || 0).toFixed(2) + '%',
    (store.payroll?.['[Manual_Clock_Percent]'] || 0).toFixed(2) + '%'
  ]);

  addTable(doc, headers, rows, (row) => {
    const variancePercent = parseFloat(row[3]);
    const manualPercent = parseFloat(row[4]);
    if (Math.abs(variancePercent) > 10 || manualPercent > 20) return 'RED';
    if (Math.abs(variancePercent) > 5 || manualPercent > 10) return 'YELLOW';
    return null;
  });
});

// PAGES 11-20: CASH CONTROLS SECTION
Object.values(areaSummaries).forEach(area => {
  doc.addPage();
  addHeader(doc, `CASH CONTROLS - ${area.areaName}`);

  doc.fontSize(12).font('Helvetica-Bold').text('Area Summary');
  doc.fontSize(10).font('Helvetica').moveDown(0.5);
  doc.text(`Total Cash Discrepancy: £${area.cash.totalDiscrepancy.toFixed(2)}`);
  doc.text(`Refunds: £${area.cash.refundAmount.toFixed(2)} (${area.cash.refundPercent}%)`);
  doc.moveDown(2);

  doc.fontSize(12).font('Helvetica-Bold').text('Store Breakdown');
  doc.moveDown(0.5);

  const headers = ['Store', 'Till Disc.', 'Safe Disc.', 'Refund %', 'Discount %'];
  const rows = area.stores.map(store => [
    store.storeName,
    '£' + (store.cash?.['[Cash_Discrepancy_Till]'] || 0).toFixed(2),
    '£' + (store.cash?.['[Cash_Discrepancy_Safe]'] || 0).toFixed(2),
    (store.cash?.['[Refund_Percent]'] || 0).toFixed(2) + '%',
    (store.cash?.['[Discount_Percent]'] || 0).toFixed(2) + '%'
  ]);

  addTable(doc, headers, rows, (row) => {
    const tillDisc = Math.abs(parseFloat(row[1].replace('£', '')));
    const refundPercent = parseFloat(row[3]);
    if (tillDisc > 100 || refundPercent > 5) return 'RED';
    if (tillDisc > 50 || refundPercent > 3) return 'YELLOW';
    return null;
  });
});

// PAGES 21-30: STOCK CONTROL SECTION
Object.values(areaSummaries).forEach(area => {
  doc.addPage();
  addHeader(doc, `STOCK CONTROL - ${area.areaName}`);

  doc.fontSize(12).font('Helvetica-Bold').text('Area Summary');
  doc.fontSize(10).font('Helvetica').moveDown(0.5);
  doc.text(`Outstanding POs: ${area.stock.posOutstanding}`);
  doc.text(`Incomplete Stocktakes: ${area.stock.stocktakesIncomplete}`);
  doc.moveDown(2);

  doc.fontSize(12).font('Helvetica-Bold').text('Store Breakdown');
  doc.moveDown(0.5);

  const headers = ['Store', 'Adjustments', 'POs', 'Stocktake', 'Consumables'];
  const rows = area.stores.map(store => [
    store.storeName,
    '£' + (store.stock?.['[Stock_Adjustment_Amount]'] || 0).toFixed(2),
    store.stock?.['[PO_Outstanding_Count]'] || 0,
    store.stock?.['[Stocktake_Completed]'] ? 'Complete' : 'Pending',
    store.stock?.['[Consumables_Ordered]'] ? 'Ordered' : 'Due'
  ]);

  addTable(doc, headers, rows, (row) => {
    const stocktakeStatus = row[3];
    const consumableStatus = row[4];
    if (stocktakeStatus === 'Pending' || consumableStatus === 'Due') return 'YELLOW';
    return null;
  });
});

// PAGE 31: Summary & Actions
doc.addPage();
addHeader(doc, 'Summary & Action Items');

doc.fontSize(12).font('Helvetica-Bold').text('Critical Issues Requiring Immediate Attention');
doc.fontSize(10).font('Helvetica').moveDown(0.5);
exceptions.critical.forEach((exc, i) => {
  doc.text(`${i + 1}. ${exc.area} - ${exc.type}: ${exc.issue}`);
});
doc.moveDown(2);

doc.fontSize(12).font('Helvetica-Bold').text('Warnings for Review');
doc.fontSize(10).font('Helvetica').moveDown(0.5);
exceptions.warning.forEach((exc, i) => {
  doc.text(`${i + 1}. ${exc.area} - ${exc.type}: ${exc.issue}`);
});

// Finalize PDF
doc.end();

// Convert to base64 for email attachment
const chunks = [];
doc.on('data', chunk => chunks.push(chunk));

return new Promise((resolve) => {
  doc.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);
    const pdfBase64 = pdfBuffer.toString('base64');

    resolve([{
      json: {
        ...context,
        pdf: {
          buffer: pdfBuffer,
          base64: pdfBase64,
          filename: `Compliance_Report_${context.reportWeek}.pdf`
        }
      },
      binary: {
        data: pdfBuffer
      }
    }]);
  });
});
```

#### NODE 17: Compose Email
```json
{
  "name": "Send Compliance Report Email",
  "type": "n8n-nodes-base.emailSend",
  "parameters": {
    "fromEmail": "automation@cardsdirect.co.uk",
    "toEmail": "={{$json.recipients.join(',')}}",
    "ccEmail": "={{$json.ccRecipients.join(',')}}",
    "subject": "=Weekly Compliance Report - Week Ending {{$json.reportWeek}}",
    "emailType": "html",
    "message": "={{$json.narrative.full}}",
    "attachments": "data",
    "options": {
      "attachmentsProperty": "pdf.filename",
      "attachmentsBinary": true
    }
  }
}
```

#### NODE 18: Archive to Azure Blob
```javascript
// HTTP Request node - Upload to Azure Blob Storage
const context = $input.first().json;
const pdfBuffer = context.pdf.buffer;
const filename = context.pdf.filename;

const storageAccount = process.env.AZURE_STORAGE_ACCOUNT;
const containerName = 'compliance-reports';
const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;

return {
  method: 'PUT',
  url: `https://${storageAccount}.blob.core.windows.net/${containerName}/${filename}?${sasToken}`,
  headers: {
    'x-ms-blob-type': 'BlockBlob',
    'Content-Type': 'application/pdf',
    'Content-Length': pdfBuffer.length
  },
  body: pdfBuffer,
  encoding: 'raw'
};
```

#### NODE 19: Log Success
```javascript
// Code node - Log successful execution
const context = $input.first().json;

const logEntry = {
  timestamp: new Date().toISOString(),
  status: 'SUCCESS',
  reportWeek: context.reportWeek,
  storesProcessed: context.data.totalStores,
  exceptionsFound: context.exceptionCount.total,
  pdfGenerated: true,
  emailSent: true,
  archived: true,
  executionTime: Date.now() - context.startTime
};

console.log('Workflow completed successfully:', JSON.stringify(logEntry, null, 2));

// Store in PostgreSQL for audit trail
// (This would use an n8n PostgreSQL node in practice)

return [{ json: logEntry }];
```

#### NODE 21-24: Error Handling Nodes
```javascript
// NODE 21: Error Handler (Code node on error output of IF node)
const error = $input.first().error;
const context = $input.first().json;

const errorLog = {
  timestamp: new Date().toISOString(),
  status: 'FAILED',
  reportWeek: context.reportWeek,
  errorMessage: error.message,
  errorStack: error.stack,
  failedNode: error.node
};

console.error('Workflow failed:', JSON.stringify(errorLog, null, 2));

return [{ json: errorLog }];

// NODE 22: Send Alert Email
// Email Send node configured with IT team recipients

// NODE 23: Log Error
// PostgreSQL insert node

// NODE 24: END
```

## DATA INTEGRATION DEEP DIVE

### Authentication Flow Implementation

**Step 1: Obtain Access Token**
```javascript
// This happens in NODE 3
// The OAuth2 client credentials flow is the standard approach for service-to-service auth
// Token is valid for 60 minutes, so for weekly execution we don't need refresh logic
// For more frequent execution, implement token caching and refresh
```

**Step 2: Token Validation**
```javascript
// This happens in NODE 4
// Always validate token before proceeding
// Check for:
// - Token exists
// - Token is not empty/null
// - Token length is reasonable (JWT tokens are typically 800-2000 chars)
// - Token hasn't expired (check expires_in from response)
```

### Metadata Retrieval Strategy

**Why Use Metadata Endpoint:**
1. Discover available tables and measures dynamically
2. Provide context to AI about data structure
3. Adapt to schema changes without code updates
4. Validate that required measures exist before querying

**Implementation:**
```javascript
// NODE 5 calls the custom metadata endpoint
// This endpoint is specific to Cards Direct's infrastructure
// It returns semantic model information including:
// - Table names and relationships
// - Measure names and expressions
// - Column metadata
// Use this to build dynamic DAX queries
```

### DAX Query Generation Approach

**Pattern: EVALUATE + SUMMARIZECOLUMNS**
```dax
EVALUATE
SUMMARIZECOLUMNS(
  <grouping columns>,
  <filter table>,
  "<measure name>", [Measure Expression],
  ...
)
```

**Why This Pattern:**
- Returns tabular data (easy to parse)
- Supports multiple measures in one query
- Allows grouping and filtering
- Efficient execution in Power BI engine

**Dynamic Query Construction:**
```javascript
// Build queries based on metadata
function buildPayrollQuery(metadata, weekEndingDate) {
  const storeDimension = metadata.tables.find(t => t.name === 'Stores');
  const calendarDimension = metadata.tables.find(t => t.name === 'Calendar');

  const measures = [
    '[Worked_Hours]',
    '[Budget_Hours]',
    '[Manual_Clock_In_Count]',
    '[Total_Clock_In_Count]'
  ];

  return `
    EVALUATE
    SUMMARIZECOLUMNS(
      ${storeDimension.name}[Area],
      ${storeDimension.name}[Store_Name],
      ${calendarDimension.name}[Week_Ending],
      ${measures.map(m => `"${m}", ${m}`).join(',\n      ')}
    )
    FILTER(
      ${calendarDimension.name}[Week_Ending] = DATE(${weekEndingDate.year}, ${weekEndingDate.month}, ${weekEndingDate.day})
    )
  `;
}
```

### Data Transformation Logic

**Handle Different Data Structures:**

1. **Payroll Data (Hours-based):**
   - Aggregate by store and area
   - Calculate variances (actual vs budget)
   - Percentage calculations
   - Identify outliers (>5% variance)

2. **Cash Control Data (Transaction-based):**
   - Sum discrepancies across till/safe/petty cash
   - Calculate refund percentages
   - Flag stores with high discrepancy rates
   - Track float management

3. **Stock Control Data (Inventory-based):**
   - Count outstanding items (POs, transfers)
   - Track completion status (stocktakes, consumables)
   - Aggregate adjustments and write-offs
   - Identify compliance gaps

**Normalization Strategy:**
```javascript
// All data structures normalize to:
{
  area: 'Area 1',
  storeName: 'Store Name',
  storeId: 'ST001',
  metrics: {
    // Domain-specific metrics
  },
  exceptions: [
    // Flagged issues
  ],
  severity: 'RED' | 'YELLOW' | 'GREEN'
}
```

## AI ANALYSIS DEEP DIVE

### System Prompt for GPT-4o

**Design Principles:**
1. **Role Establishment**: Position AI as retail operations analyst
2. **Context Provision**: UK retail, compliance focus, executive audience
3. **Structure Guidance**: Specific section format (PAYROLL, CASH, STOCK)
4. **Tone Setting**: Professional but direct, action-oriented
5. **Output Format**: Structured email with clear sections

### User Prompt Template

```javascript
const userPrompt = `
Generate the executive summary email for the weekly compliance report.

REPORT PERIOD: Week ending ${reportWeek}
TOTAL STORES: ${totalStores}
AREAS: ${areaCount}

DATA SUMMARY:
${JSON.stringify(areaSummaries, null, 2)}

EXCEPTIONS IDENTIFIED:
Critical Issues (${criticalCount}):
${JSON.stringify(criticalIssues, null, 2)}

Warnings (${warningCount}):
${JSON.stringify(warnings, null, 2)}

INSTRUCTIONS:
1. Write a structured email following the PAYROLL / CASH CONTROLS / STOCK CONTROL format
2. Organize each section by Area (1-5)
3. Call out specific stores with values
4. Use appropriate severity language for RED/YELLOW issues
5. Keep total length to 400-600 words
6. Be specific and actionable

OUTPUT:
Professional email body (plain text or simple HTML) ready to send to executives.
`;
```

## IMPLEMENTATION PLAN

### Phase 1: Setup & Authentication (Week 1, Days 1-2)

**Objectives:**
- Set up n8n instance on Azure
- Configure environment variables
- Implement OAuth2 authentication
- Test API connectivity

**Tasks:**
1. Deploy n8n to Azure Container Instance or VM
2. Configure PostgreSQL database for n8n
3. Set up environment variables
4. Create test workflow with nodes 1-4
5. Verify token acquisition works
6. Test token expiration handling

**Success Criteria:**
- [ ] n8n accessible via web interface
- [ ] Environment variables configured
- [ ] OAuth token obtained successfully
- [ ] Token validation logic working

### Phase 2: Data Discovery (Week 1, Days 3-4)

**Objectives:**
- Call metadata endpoint
- Understand available tables and measures
- Map data to report requirements
- Create initial DAX queries

**Tasks:**
1. Implement NODE 5 (Get Dataset Metadata)
2. Implement NODE 6 (Parse Metadata)
3. Analyze metadata response
4. Create mapping document
5. Write and test sample DAX queries using API
6. Validate data structure matches report requirements

**Success Criteria:**
- [ ] Metadata retrieved successfully
- [ ] Key tables and measures identified
- [ ] Sample DAX queries return valid data
- [ ] Data structure understood

### Phase 3: Core Workflow Build (Week 1-2, Days 5-7)

**Objectives:**
- Build complete data extraction pipeline
- Implement data transformation logic
- Create exception detection rules
- Test end-to-end data flow

**Tasks:**
1. Implement nodes 7-9 (data extraction)
2. Test each extraction node independently
3. Implement NODE 10 (merge data streams)
4. Implement NODE 11 (aggregate by area)
5. Implement NODE 12 (calculate KPIs & exceptions)
6. Define threshold configuration
7. Test exception detection with various data scenarios
8. Validate calculations match manual report

**Success Criteria:**
- [ ] All data extraction nodes working
- [ ] Data successfully merged by store
- [ ] Area-level aggregations correct
- [ ] Exceptions properly flagged
- [ ] Threshold logic validated

### Phase 4: AI Integration & Report Formatting (Week 2, Days 8-10)

**Objectives:**
- Integrate OpenAI GPT-4o
- Generate narrative analysis
- Create PDF report
- Format email

**Tasks:**
1. Implement NODE 13 (prepare AI context)
2. Implement NODE 14 (call OpenAI)
3. Test various data scenarios with AI
4. Refine system prompt based on outputs
5. Implement NODE 15 (parse AI response)
6. Implement NODE 16 (generate PDF)
7. Install required npm packages
8. Create PDF template matching 31-page example
9. Test PDF generation with sample data
10. Implement NODE 17 (compose email)
11. Test email formatting and attachment

**Success Criteria:**
- [ ] AI generates coherent narratives
- [ ] Narratives match expected structure
- [ ] PDF renders correctly (31 pages)
- [ ] Tables formatted with color coding
- [ ] Email composed with narrative and PDF attachment
- [ ] Email sends successfully

### Phase 5: Testing & Refinement (Week 2-3, Days 11-14)

**Objectives:**
- Comprehensive testing
- Performance optimization
- Error handling
- Output validation

**Tasks:**
1. Create test data scenarios
2. Test complete workflow end-to-end
3. Validate outputs against manual reports
4. Implement error handling nodes (21-24)
5. Add logging and monitoring
6. Optimize performance
7. User acceptance testing with Matt/Chirag
8. Iterate based on feedback

**Success Criteria:**
- [ ] All test scenarios pass
- [ ] Outputs match manual reports (95%+ accuracy)
- [ ] Error handling works correctly
- [ ] Execution time < 5 minutes
- [ ] User acceptance achieved

### Phase 6: Deployment & Handover (Week 3, Days 15-16)

**Objectives:**
- Production deployment
- Documentation
- Training
- Monitoring setup

**Tasks:**
1. Deploy to production n8n instance
2. Configure production schedule (Monday 9 AM)
3. Set up production email recipients
4. Configure Azure Blob Storage archive
5. Create documentation
6. Train Matt/Chirag
7. Set up monitoring
8. Schedule first production run
9. Monitor first execution closely
10. Handover to business team

**Success Criteria:**
- [ ] Production deployment successful
- [ ] First production run successful
- [ ] Documentation complete
- [ ] Training completed
- [ ] Monitoring active
- [ ] Business team confident in system

## TESTING STRATEGY

### Node-Level Testing

**For Each Node:**
1. **Input Validation**: Verify node receives expected input structure
2. **Logic Testing**: Test core functionality with various inputs
3. **Output Validation**: Verify output structure matches expectations
4. **Error Handling**: Test failure scenarios

### Integration Testing

**Test End-to-End Flows:**
- Complete workflow with normal data
- High exception week
- API failure recovery
- Partial data scenario

### Output Validation

**PDF Validation Checklist:**
- [ ] 31 pages generated
- [ ] Title page includes report week and summary
- [ ] All sections covered
- [ ] Color coding correct
- [ ] Tables formatted properly

**Email Validation Checklist:**
- [ ] Subject line correct
- [ ] Body structured properly
- [ ] Specific stores mentioned
- [ ] Severity language appropriate
- [ ] Attachment present

### Performance Benchmarks

**Target Metrics:**
- Total Execution Time: < 5 minutes
- API Response Times: < 15 seconds each
- Memory: < 1GB peak
- CPU: < 50% average

## MIGRATION FROM NODE.JS

### Reusable Components

**From powerbi.js:**
- OAuth logic - Copy to NODE 3
- DAX query execution - Copy to NODEs 7-9
- Response parsing - Copy to NODE 6, 10

**From analysis.js:**
- Data aggregation - Copy to NODEs 11-12
- Exception detection - Copy to NODE 12
- KPI calculations - Copy to NODE 11

### Environment Variables and Secrets

**Security Best Practices:**
1. Never hardcode credentials
2. Use n8n Credentials System
3. Separate development and production
4. Audit trail for secrets access
5. GDPR compliance

## KEY CONSIDERATIONS

- GDPR Compliance (UK Data)
- Audit Trail Requirements
- Scalability to 90+ Stores
- Maintainability
- Documentation Requirements

## DELIVERABLES CHECKLIST

### Technical Deliverables
- [ ] n8n workflow deployed
- [ ] All 24 nodes implemented
- [ ] OAuth authentication working
- [ ] Data extraction working
- [ ] Exception detection validated
- [ ] AI narrative generation working
- [ ] PDF report generating
- [ ] Email delivery working
- [ ] Error handling implemented

### Quality Deliverables
- [ ] Output accuracy validated (95%+)
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Integration testing passed
- [ ] User acceptance passed

### Documentation Deliverables
- [ ] Architecture diagram
- [ ] Technical documentation
- [ ] User guide
- [ ] Configuration guide
- [ ] Troubleshooting guide

### Operational Deliverables
- [ ] Production deployment
- [ ] Monitoring configured
- [ ] Backup tested
- [ ] Support contacts documented
- [ ] Handover completed

## FINAL INSTRUCTIONS

Follow this plan systematically:

1. Read this entire prompt carefully
2. Set up development environment
3. Work through phases sequentially
4. Test extensively at each phase
5. Document as you go
6. Communicate progress
7. Ask for clarification when needed
8. Iterate based on feedback
9. Plan for handover

**Success Metrics:**
- ✅ First production run delivers accurate report on time
- ✅ Report format matches manual version closely
- ✅ Narrative is actionable and specific
- ✅ No manual intervention required
- ✅ Business users confident in the automation

Begin with Phase 1 and proceed systematically. Good luck!
