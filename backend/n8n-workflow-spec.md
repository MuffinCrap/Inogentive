# n8n Workflow Specification

## Overview

This document specifies the complete n8n workflow for the Weekly Report Automation POC. Use this as a blueprint to quickly build the workflow when n8n is available.

## Workflow Diagram

```
[Webhook Trigger] → [Power BI Auth] → [Extract Tables] → [Extract Measures]
                                                              ↓
[Email Send] ← [Format Email] ← [Generate Report] ← [LLM Analysis]
                                        ↓
                                 [Save to File]
```

## Nodes Specification

---

### 1. Webhook Trigger

**Node Type:** `n8n-nodes-base.webhook`

**Purpose:** Receives requests from web UI to trigger report generation

**Configuration:**
```json
{
  "httpMethod": "POST",
  "path": "sync-analyze",
  "responseMode": "onReceived",
  "responseData": "firstEntryJson"
}
```

**Input Data Expected:**
```json
{
  "recipients": [
    { "id": "1", "name": "John Smith", "email": "john@company.com" }
  ],
  "timestamp": "2025-11-18T10:00:00.000Z"
}
```

**Output:** Passes recipient list and timestamp to next node

---

### 2. Power BI Authentication

**Node Type:** `n8n-nodes-base.httpRequest`

**Purpose:** Authenticate with Microsoft/Power BI API to get access token

**Configuration:**
```json
{
  "method": "POST",
  "url": "https://login.microsoftonline.com/{{TENANT_ID}}/oauth2/v2.0/token",
  "authentication": "none",
  "sendBody": true,
  "bodyParameters": {
    "parameters": [
      { "name": "grant_type", "value": "client_credentials" },
      { "name": "client_id", "value": "{{CLIENT_ID}}" },
      { "name": "client_secret", "value": "{{CLIENT_SECRET}}" },
      { "name": "scope", "value": "https://analysis.windows.net/powerbi/api/.default" }
    ]
  },
  "options": {
    "response": { "response": { "fullResponse": false } }
  }
}
```

**Environment Variables Needed:**
- `TENANT_ID` - Azure AD tenant ID
- `CLIENT_ID` - App registration client ID
- `CLIENT_SECRET` - App registration secret

**Output:** `{{ $json.access_token }}`

---

### 3. Extract Power BI Data (Split into Sub-workflow)

#### 3a. Get Report Details

**Node Type:** `n8n-nodes-base.httpRequest`

```json
{
  "method": "GET",
  "url": "https://api.powerbi.com/v1.0/myorg/groups/{{WORKSPACE_ID}}/reports/{{REPORT_ID}}",
  "authentication": "none",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      { "name": "Authorization", "value": "Bearer {{ $node['Power BI Auth'].json.access_token }}" }
    ]
  }
}
```

#### 3b. Execute DAX Queries (Loop for Each Table)

**Node Type:** `n8n-nodes-base.httpRequest`

**Purpose:** Extract data from all 14 tables using DAX queries

```json
{
  "method": "POST",
  "url": "https://api.powerbi.com/v1.0/myorg/groups/{{WORKSPACE_ID}}/datasets/{{DATASET_ID}}/executeQueries",
  "authentication": "none",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      { "name": "Authorization", "value": "Bearer {{ $node['Power BI Auth'].json.access_token }}" },
      { "name": "Content-Type", "value": "application/json" }
    ]
  },
  "sendBody": true,
  "body": "={{ $json.daxQuery }}"
}
```

**DAX Queries to Execute (14 Tables):**

```javascript
// Store in a Code node to generate queries
const tables = [
  'fact_Sales',
  'fact_Returns',
  'fact_Inventory',
  'dim_Store',
  'dim_Product',
  'dim_Date',
  'dim_Customer',
  'fact_Traffic',
  'fact_Labor',
  'dim_Region',
  'fact_CustomerSatisfaction',
  'dim_Category',
  'fact_OnlineOrders',
  'agg_WeeklyMetrics'
];

const queries = tables.map(table => ({
  tableName: table,
  daxQuery: {
    queries: [{
      query: `EVALUATE TOPN(1000, '${table}')`
    }],
    serializerSettings: {
      includeNulls: true
    }
  }
}));

return queries;
```

#### 3c. Execute DAX Measures

**Purpose:** Get calculated measures (39 total)

```json
{
  "queries": [{
    "query": "EVALUATE ROW(\"TotalRevenue\", [Total Revenue], \"ConversionRate\", [Conversion Rate], \"AvgTransactionValue\", [Avg Transaction Value], ...)"
  }]
}
```

**Complete Measures List:**
```javascript
const measures = [
  // Revenue Metrics
  'Total Revenue',
  'Revenue YoY',
  'Revenue WoW',
  'Revenue vs Target',

  // Conversion Metrics
  'Conversion Rate',
  'Conversion Rate WoW',
  'Conversion Rate vs Target',

  // Transaction Metrics
  'Avg Transaction Value',
  'ATV WoW',
  'Total Transactions',
  'Transactions WoW',

  // Traffic Metrics
  'Total Store Traffic',
  'Traffic WoW',
  'Traffic vs Target',

  // Inventory Metrics
  'Inventory Turnover',
  'Stock Coverage Days',
  'Out of Stock Rate',

  // Customer Metrics
  'Customer Satisfaction Score',
  'NPS Score',
  'Repeat Customer Rate',

  // Labor Metrics
  'Sales per Labor Hour',
  'Labor Cost Percentage',

  // Returns Metrics
  'Return Rate',
  'Return Rate WoW',

  // Online Metrics
  'Online Revenue',
  'Online Share of Total',
  'Online Conversion Rate',

  // Regional Breakdown
  'North Region Revenue',
  'South Region Revenue',
  'London Revenue',
  'Midlands Revenue',

  // Store Performance
  'Top Store Revenue',
  'Bottom Store Revenue',
  'Stores Above Target',
  'Stores Below Target',

  // Period Comparisons
  'MTD Revenue',
  'QTD Revenue',
  'YTD Revenue'
];
```

---

### 4. Merge & Format Data

**Node Type:** `n8n-nodes-base.code`

**Purpose:** Combine all extracted data into a single structured object for LLM

```javascript
// Merge all Power BI data
const tableData = $input.all().map(item => item.json);
const measures = $node['Execute Measures'].json;

const formattedData = {
  extractedAt: new Date().toISOString(),
  weekEnding: getWeekEndingDate(),

  // Key metrics summary
  keyMetrics: {
    totalRevenue: measures['Total Revenue'],
    revenueWoW: measures['Revenue WoW'],
    conversionRate: measures['Conversion Rate'],
    conversionWoW: measures['Conversion Rate WoW'],
    avgTransactionValue: measures['Avg Transaction Value'],
    atvWoW: measures['ATV WoW'],
    storeTraffic: measures['Total Store Traffic'],
    trafficWoW: measures['Traffic WoW']
  },

  // All measures
  allMeasures: measures,

  // Table summaries (aggregated, not raw data)
  tableSummaries: {
    salesSummary: aggregateSales(tableData.fact_Sales),
    returnsSummary: aggregateReturns(tableData.fact_Returns),
    inventorySummary: aggregateInventory(tableData.fact_Inventory),
    // ... etc
  },

  // Regional breakdown
  regionalPerformance: extractRegionalData(tableData),

  // Store rankings
  storePerformance: {
    topStores: getTopStores(tableData, 5),
    bottomStores: getBottomStores(tableData, 5)
  }
};

return { json: formattedData };

// Helper functions
function getWeekEndingDate() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + 6;
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}
```

---

### 5. LLM Analysis

**Node Type:** `n8n-nodes-base.openAi` (or Anthropic)

**Purpose:** Generate executive report from data

**Configuration:**
```json
{
  "resource": "chat",
  "operation": "complete",
  "model": "gpt-4-turbo-preview",
  "messages": {
    "values": [
      {
        "role": "system",
        "content": "{{ $node['LLM System Prompt'].json.prompt }}"
      },
      {
        "role": "user",
        "content": "{{ JSON.stringify($json) }}"
      }
    ]
  },
  "options": {
    "temperature": 0.3,
    "maxTokens": 4000
  }
}
```

**Note:** System prompt is defined in separate document (see `llm-prompts.md`)

---

### 6. Save Report to File

**Node Type:** `n8n-nodes-base.code` + `n8n-nodes-base.writeFile`

**Purpose:** Persist report to file system

```javascript
const report = $json.content;
const timestamp = new Date().toISOString();
const reportId = generateReportId();

const reportData = {
  id: reportId,
  date: timestamp,
  status: 'sent',
  recipients: $node['Webhook Trigger'].json.recipients.map(r => r.email),
  content: report,
  metrics: $node['Merge Data'].json.keyMetrics
};

// Save as JSON
const filename = `report-${reportId}.json`;
const filepath = `/data/reports/${filename}`;

return {
  json: reportData,
  binary: {
    data: Buffer.from(JSON.stringify(reportData, null, 2)).toString('base64')
  },
  filepath: filepath
};
```

---

### 7. Format Email

**Node Type:** `n8n-nodes-base.code`

**Purpose:** Convert markdown report to HTML email

```javascript
const report = $json.content;
const recipients = $node['Webhook Trigger'].json.recipients;

// Convert markdown to HTML
const htmlContent = markdownToHtml(report);

// Wrap in email template
const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; }
    th { background: #f8fafc; }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    ${htmlContent}
    <div class="footer">
      <p>This report was generated automatically by Inovora Weekly Report Automation.</p>
      <p>Questions? Contact your analytics team.</p>
    </div>
  </div>
</body>
</html>
`;

return {
  json: {
    to: recipients.map(r => r.email),
    subject: `Weekly Executive Report - Week ${getWeekNumber()}`,
    html: emailHtml,
    text: report // Plain text fallback
  }
};
```

---

### 8. Send Email

**Node Type:** `n8n-nodes-base.emailSend` (or SendGrid/Gmail)

**Configuration (SMTP):**
```json
{
  "fromEmail": "reports@inovora.com",
  "toEmail": "={{ $json.to.join(',') }}",
  "subject": "={{ $json.subject }}",
  "html": "={{ $json.html }}",
  "text": "={{ $json.text }}",
  "options": {
    "attachments": ""
  }
}
```

**Alternative (SendGrid):**
```json
{
  "resource": "mail",
  "operation": "send",
  "fromEmail": "reports@inovora.com",
  "toEmail": "={{ $json.to }}",
  "subject": "={{ $json.subject }}",
  "contentHtml": "={{ $json.html }}"
}
```

---

### 9. Return Response

**Node Type:** `n8n-nodes-base.respondToWebhook`

**Purpose:** Send response back to web UI

```json
{
  "respondWith": "json",
  "responseBody": "={{ JSON.stringify({ success: true, report: $node['Save Report'].json }) }}"
}
```

---

## Secondary Workflow: Resend Report

### Webhook Trigger (Resend)

```json
{
  "httpMethod": "POST",
  "path": "resend-report",
  "responseMode": "onReceived"
}
```

**Input:**
```json
{
  "reportId": "abc123",
  "recipients": [...]
}
```

### Load Report from File

**Node Type:** `n8n-nodes-base.readFile`

```javascript
const reportId = $json.reportId;
const filepath = `/data/reports/report-${reportId}.json`;
// Read and parse file
```

### Send Email (reuse node 8)

---

## Scheduled Trigger (Monday 9 AM)

### Cron Trigger

**Node Type:** `n8n-nodes-base.cron`

```json
{
  "triggerTimes": {
    "item": [
      {
        "mode": "everyWeek",
        "hour": 9,
        "minute": 0,
        "weekday": 1
      }
    ]
  }
}
```

### Load Default Recipients

**Node Type:** `n8n-nodes-base.code`

```javascript
// Load from config file or environment
const defaultRecipients = [
  { id: '1', name: 'CEO', email: 'ceo@company.com' },
  { id: '2', name: 'COO', email: 'coo@company.com' },
  // ... configured list
];

return {
  json: {
    recipients: defaultRecipients,
    timestamp: new Date().toISOString(),
    triggerType: 'scheduled'
  }
};
```

Then connects to the main workflow (Power BI Auth → ... → Send Email)

---

## Environment Variables Required

```env
# Azure/Power BI
TENANT_ID=your-azure-tenant-id
CLIENT_ID=your-app-client-id
CLIENT_SECRET=your-app-client-secret
WORKSPACE_ID=your-powerbi-workspace-id
DATASET_ID=your-powerbi-dataset-id
REPORT_ID=your-powerbi-report-id

# LLM
OPENAI_API_KEY=your-openai-key
# or
ANTHROPIC_API_KEY=your-anthropic-key

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
# or
SENDGRID_API_KEY=your-sendgrid-key

# Storage
REPORTS_DIR=/data/reports
```

---

## Error Handling

Add **Error Trigger** node to catch failures:

```javascript
// On any node failure
const errorData = {
  workflow: 'Weekly Report Generation',
  node: $execution.error.node.name,
  message: $execution.error.message,
  timestamp: new Date().toISOString()
};

// Send alert email to admin
// Log to monitoring system
```

---

## Testing Checklist

- [ ] Webhook receives data correctly
- [ ] Power BI authentication succeeds
- [ ] All 14 tables extract successfully
- [ ] All 39 measures return values
- [ ] Data merges correctly
- [ ] LLM generates quality report
- [ ] Report saves to file
- [ ] Email formats correctly (HTML + plain text)
- [ ] Email sends to all recipients
- [ ] Webhook returns success response
- [ ] Scheduled trigger fires correctly
- [ ] Error handling catches failures
