# File Storage System

## Overview

The Weekly Report Automation uses a file-based storage system for maximum simplicity and zero infrastructure setup. Reports are stored as JSON files with an index for quick lookups.

## Directory Structure

```
backend/
└── data/
    ├── report-schema.json      # JSON Schema definition
    ├── config.json             # System configuration
    └── reports/
        ├── index.json          # Quick lookup index
        ├── report-abc123.json  # Individual reports
        ├── report-def456.json
        └── ...
```

## File Naming Convention

Reports are named using the pattern: `report-{id}.json`

- **id**: Generated using `Date.now().toString(36) + randomString()`
- Example: `report-m3k9x7f2a.json`

## Index File Structure

The `index.json` file provides quick lookups without reading individual files:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-11-18T10:30:00.000Z",
  "totalReports": 42,
  "reports": [
    {
      "id": "m3k9x7f2a",
      "date": "2025-11-18T10:30:00.000Z",
      "status": "sent",
      "weekEnding": "2025-11-17",
      "recipientCount": 3,
      "file": "report-m3k9x7f2a.json"
    },
    {
      "id": "m3k8y6e1b",
      "date": "2025-11-11T09:00:00.000Z",
      "status": "sent",
      "weekEnding": "2025-11-10",
      "recipientCount": 3,
      "file": "report-m3k8y6e1b.json"
    }
  ]
}
```

## Report File Structure

Each report file contains complete data following the schema:

```json
{
  "id": "m3k9x7f2a",
  "date": "2025-11-18T10:30:00.000Z",
  "status": "sent",
  "recipients": [
    "ceo@company.com",
    "coo@company.com",
    "cfo@company.com"
  ],
  "content": "# Weekly Executive Report - Week 46\n\n**Generated:** ...",
  "triggerType": "manual",
  "weekEnding": "2025-11-17",
  "metrics": {
    "totalRevenue": 2400000,
    "revenueWoW": 3.2,
    "conversionRate": 4.8,
    "conversionWoW": 0.3,
    "avgTransactionValue": 47.50,
    "atvWoW": -1.2,
    "storeTraffic": 51230,
    "trafficWoW": 5.1
  },
  "metadata": {
    "generationTimeMs": 12500,
    "llmModel": "gpt-4-turbo-preview",
    "llmTokensUsed": 3200,
    "dataExtractedAt": "2025-11-18T10:29:45.000Z",
    "emailSentAt": "2025-11-18T10:30:00.000Z",
    "version": "1.0.0"
  }
}
```

## n8n Node Operations

### Save Report

```javascript
// Code node in n8n
const report = {
  id: generateId(),
  date: new Date().toISOString(),
  status: 'sent',
  recipients: $input.item.json.recipients.map(r => r.email),
  content: $input.item.json.llmResponse,
  triggerType: $input.item.json.triggerType || 'manual',
  weekEnding: getWeekEndingDate(),
  metrics: $input.item.json.metrics,
  metadata: {
    generationTimeMs: Date.now() - $execution.startedAt,
    llmModel: 'gpt-4-turbo-preview',
    llmTokensUsed: $input.item.json.tokensUsed,
    dataExtractedAt: $input.item.json.dataExtractedAt,
    emailSentAt: new Date().toISOString(),
    version: '1.0.0'
  }
};

// Write report file
const filename = `report-${report.id}.json`;
const filepath = `/data/reports/${filename}`;

// Also update index
const index = JSON.parse(fs.readFileSync('/data/reports/index.json'));
index.reports.unshift({
  id: report.id,
  date: report.date,
  status: report.status,
  weekEnding: report.weekEnding,
  recipientCount: report.recipients.length,
  file: filename
});
index.totalReports = index.reports.length;
index.lastUpdated = new Date().toISOString();

return {
  report: report,
  filepath: filepath,
  index: index
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getWeekEndingDate() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}
```

### Load Report by ID

```javascript
// Code node in n8n
const reportId = $input.item.json.reportId;
const filepath = `/data/reports/report-${reportId}.json`;

try {
  const reportData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  return { json: reportData };
} catch (error) {
  throw new Error(`Report not found: ${reportId}`);
}
```

### Load Report History

```javascript
// Code node in n8n
const index = JSON.parse(fs.readFileSync('/data/reports/index.json', 'utf8'));

// Return most recent 50 reports
const recentReports = index.reports.slice(0, 50);

return { json: { reports: recentReports } };
```

### Compare Two Reports

```javascript
// Code node in n8n
const reportId1 = $input.item.json.reportId1;
const reportId2 = $input.item.json.reportId2;

const report1 = JSON.parse(fs.readFileSync(`/data/reports/report-${reportId1}.json`));
const report2 = JSON.parse(fs.readFileSync(`/data/reports/report-${reportId2}.json`));

// Calculate deltas
const deltas = {
  revenue: calculateDelta(report1.metrics.totalRevenue, report2.metrics.totalRevenue),
  conversion: report2.metrics.conversionRate - report1.metrics.conversionRate,
  atv: calculateDelta(report1.metrics.avgTransactionValue, report2.metrics.avgTransactionValue),
  traffic: calculateDelta(report1.metrics.storeTraffic, report2.metrics.storeTraffic)
};

return {
  json: {
    older: report1,
    newer: report2,
    deltas: deltas
  }
};

function calculateDelta(oldVal, newVal) {
  return ((newVal - oldVal) / oldVal * 100).toFixed(1);
}
```

## Cleanup & Maintenance

### Archive Old Reports

```javascript
// Scheduled job to archive reports older than 90 days
const index = JSON.parse(fs.readFileSync('/data/reports/index.json'));
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 90);

const activeReports = [];
const archivedReports = [];

index.reports.forEach(report => {
  if (new Date(report.date) < cutoffDate) {
    archivedReports.push(report);
    // Move file to archive folder
    fs.renameSync(
      `/data/reports/${report.file}`,
      `/data/archive/${report.file}`
    );
  } else {
    activeReports.push(report);
  }
});

index.reports = activeReports;
index.totalReports = activeReports.length;
index.lastUpdated = new Date().toISOString();

// Save updated index
fs.writeFileSync('/data/reports/index.json', JSON.stringify(index, null, 2));

return { archived: archivedReports.length };
```

## Configuration File

`config.json` stores system-wide settings:

```json
{
  "version": "1.0.0",
  "storage": {
    "reportsDir": "/data/reports",
    "archiveDir": "/data/archive",
    "maxReportsInIndex": 1000,
    "archiveAfterDays": 90
  },
  "defaults": {
    "recipients": [
      { "id": "1", "name": "CEO", "email": "ceo@company.com" },
      { "id": "2", "name": "COO", "email": "coo@company.com" }
    ]
  },
  "schedule": {
    "enabled": true,
    "cronExpression": "0 9 * * 1",
    "timezone": "Europe/London"
  }
}
```

## Benefits of File-Based Storage

1. **Zero Setup** - No database to configure or manage
2. **Portability** - Easy to backup, move, or inspect
3. **Transparency** - Human-readable JSON files
4. **Version Control** - Can track changes in git if needed
5. **Simple Recovery** - Just restore files from backup
6. **n8n Native** - Works with built-in Read/Write File nodes

## Future Migration Path

If scaling beyond file storage:
1. **SQLite** - Single-file database, still simple
2. **PostgreSQL** - Full relational database
3. **MongoDB** - If preferring document storage

The JSON structure is designed to map easily to any of these options.
