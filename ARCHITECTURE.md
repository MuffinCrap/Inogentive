# Technical Architecture Documentation

## System Overview

The Inogentive Weekly Report Automation is a modern web application that combines frontend JavaScript, a Node.js backend API, and cloud-based workflow orchestration through n8n to automate compliance report generation.

---

## Architecture Layers

### 1. Frontend Layer (Web UI)

**Location:** `/web-ui/`

**Core Files:**
- `index.html` - Main application HTML structure
- `app.js` - Application logic and state management
- `styles.css` - CSS styling with custom properties

#### Frontend Architecture

```
┌─────────────────────────────────────────────┐
│           Frontend (app.js)                 │
│                                             │
│  ┌────────────────────────────────────┐   │
│  │     State Management               │   │
│  │  - recipients[]                     │   │
│  │  - reports[]                        │   │
│  │  - isProcessing                     │   │
│  │  - currentReport                    │   │
│  │  - selectedReports[]                │   │
│  └────────────────────────────────────┘   │
│                                             │
│  ┌────────────────────────────────────┐   │
│  │     Data Persistence               │   │
│  │  - LocalStorage API                │   │
│  │  - wr_recipients key               │   │
│  │  - wr_reports key                  │   │
│  └────────────────────────────────────┘   │
│                                             │
│  ┌────────────────────────────────────┐   │
│  │     UI Components                  │   │
│  │  - Report generation panel         │   │
│  │  - Progress indicators             │   │
│  │  - Recipient management            │   │
│  │  - Report history list             │   │
│  │  - Comparison modal                │   │
│  │  - Preview modal                   │   │
│  └────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

#### Key Frontend Components

**1. Configuration (lines 7-27)**
```javascript
const CONFIG = {
    BACKEND_API_URL: 'http://localhost:3001',
    N8N_WEBHOOK_URL: 'http://localhost:3001/api/n8n-proxy',
    API_KEY: '',
    STORAGE_KEYS: {...}
}
```

**2. State Management (lines 33-40)**
- Central state object holds all application data
- Synchronized with LocalStorage for persistence
- Reactive UI updates on state changes

**3. Event System**
- Event delegation for dynamic content (lines 498-509, 554-572)
- Global keyboard shortcuts (lines 230-257)
- Custom event handlers for user interactions

**4. Security Features**
- HTML escaping to prevent XSS (lines 1120-1124)
- Input validation for emails and IDs (lines 1110-1118, 575-577)
- JSON sanitization to prevent prototype pollution (lines 151-156)
- CSP headers in HTML (line 6)
- No inline event handlers

---

### 2. Backend Layer (Node.js API)

**Location:** `/backend/src/`

**Core Files:**
- `server.js` - Express API server (main entry point for web app)
- `powerbi.js` - Power BI data extraction (legacy, not used by web app)
- `analysis.js` - OpenAI integration (legacy, not used by web app)
- `email.js` - Email sending via Microsoft Graph (legacy)
- `config.js` - Configuration management
- `index.js` - CLI tool for direct Power BI access (legacy)

#### Backend Architecture

```
┌─────────────────────────────────────────────┐
│        Express Server (server.js)           │
│                                             │
│  ┌────────────────────────────────────┐   │
│  │     Middleware Stack               │   │
│  │  1. CORS (line 26)                 │   │
│  │  2. express.json() (line 27)       │   │
│  └────────────────────────────────────┘   │
│                                             │
│  ┌────────────────────────────────────┐   │
│  │     API Endpoints                  │   │
│  │                                     │   │
│  │  GET  /api/health                  │   │
│  │       → Health check               │   │
│  │                                     │   │
│  │  POST /api/n8n-proxy               │   │
│  │       → Forward requests to n8n    │   │
│  │       → Bypass CORS restrictions   │   │
│  │                                     │   │
│  │  POST /api/generate-pdf            │   │
│  │       → Generate PDF from data     │   │
│  │       → Uses PDFKit library        │   │
│  │       → Returns binary PDF         │   │
│  └────────────────────────────────────┘   │
│                                             │
│  ┌────────────────────────────────────┐   │
│  │     PDF Generation Engine          │   │
│  │  - generatePDFContent() (line 282) │   │
│  │  - Multi-page layout               │   │
│  │  - Tables and formatting           │   │
│  │  - Headers/footers                 │   │
│  └────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

#### Key Backend Components

**1. Server Initialization (lines 22-27)**
```javascript
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
```

**2. n8n Proxy Endpoint (lines 39-67)**
- Proxies requests to n8n cloud webhook
- Solves CORS issues when calling n8n from browser
- Forwards all request data transparently
- Returns n8n response to frontend

**3. PDF Generation (lines 163-202)**
- Receives report data from n8n workflow
- Creates multi-page PDF document
- Implements custom PDF layout with PDFKit
- Streams PDF back to client as download

**4. PDF Content Generator (lines 282-550)**
- **Title Page**: Overall statistics and status
- **Executive Summary**: AI-generated insights
- **Area Details**: Per-area performance tables
- **Action Items**: Critical issues and warnings
- **Dynamic Table Generation**: Store performance data
- **Color-coded Status**: RED/YELLOW/GREEN indicators

---

### 3. Integration Layer (n8n Workflow)

**Location:** Cloud-hosted at `https://cdpoc.app.n8n.cloud`

#### n8n Workflow Architecture

```
┌─────────────────────────────────────────────┐
│           n8n Cloud Workflow                │
│                                             │
│  1. Webhook Trigger                        │
│     └─► Receives POST from web UI          │
│                                             │
│  2. Microsoft Fabric MCP Node              │
│     └─► Authenticates with Azure AD        │
│     └─► Connects to Power BI workspace     │
│     └─► Executes DAX queries               │
│     └─► Extracts compliance data           │
│                                             │
│  3. Data Transformation                    │
│     └─► Aggregates store data              │
│     └─► Calculates area statistics         │
│     └─► Determines RED/YELLOW/GREEN status │
│                                             │
│  4. OpenAI API Node                        │
│     └─► Sends data to GPT-4o               │
│     └─► Generates executive summary        │
│     └─► Creates actionable insights        │
│                                             │
│  5. Backend API Call                       │
│     └─► POSTs to /api/generate-pdf         │
│     └─► Receives PDF binary                │
│                                             │
│  6. Response                                │
│     └─► Returns report data + metadata     │
│     └─► Frontend downloads PDF             │
└─────────────────────────────────────────────┘
```

---

## Complete Data Flow

### Report Generation Sequence

```
USER ACTION
    │
    ├─► Click "Sync & Analyze" button
    │
    ▼
FRONTEND (app.js:263-288)
    │
    ├─► handleSyncAnalyze()
    │   └─► Set isProcessing = true
    │   └─► Show progress UI
    │   └─► Call executeN8nWorkflow()
    │
    ▼
FRONTEND (app.js:290-376)
    │
    ├─► executeN8nWorkflow()
    │   └─► POST to CONFIG.N8N_WEBHOOK_URL
    │       └─► Body: { recipients, timestamp }
    │       └─► Headers: getSecureHeaders()
    │
    ▼
BACKEND (server.js:39-67)
    │
    ├─► /api/n8n-proxy endpoint
    │   └─► Forward request to n8n cloud
    │   └─► URL: process.env.N8N_WEBHOOK_URL
    │   └─► Return n8n response
    │
    ▼
N8N WORKFLOW
    │
    ├─► 1. Receive webhook trigger
    │
    ├─► 2. Fabric MCP authentication
    │   └─► Azure AD OAuth2 flow
    │   └─► Get Power BI access token
    │
    ├─► 3. Power BI data extraction
    │   └─► Connect to workspace
    │   └─► Query dataset with DAX
    │   └─► Extract:
    │       - Store names and IDs
    │       - Budget hours
    │       - Worked hours
    │       - Payroll variance
    │       - Manual clock-in rates
    │       - Area assignments
    │
    ├─► 4. Data transformation
    │   └─► Calculate variances
    │   └─► Determine status (RED/YELLOW/GREEN)
    │   └─► Aggregate by area
    │   └─► Format for AI analysis
    │
    ├─► 5. OpenAI API call
    │   └─► Model: GPT-4o
    │   └─► Prompt: Analyze compliance data
    │   └─► Output: Executive summary
    │
    ├─► 6. Structure report data
    │   └─► {
    │       │   report_date,
    │       │   executive_summary,
    │       │   all_stores: [...],
    │       │   areas: [...]
    │       └─}
    │
    ├─► 7. Return to frontend
    │   └─► success: true
    │   └─► reportData: {...}
    │
    ▼
FRONTEND (app.js:316-343)
    │
    ├─► Receive n8n response
    │
    ├─► POST to /api/generate-pdf
    │   └─► Body: { reportData }
    │
    ▼
BACKEND (server.js:163-202)
    │
    ├─► /api/generate-pdf endpoint
    │
    ├─► Create PDF with PDFKit
    │   └─► generatePDFContent(doc, reportData)
    │       │
    │       ├─► Title page (lines 375-404)
    │       │   └─► Overall statistics
    │       │   └─► RED/YELLOW/GREEN counts
    │       │
    │       ├─► Executive summary (lines 406-421)
    │       │   └─► AI-generated text
    │       │   └─► Formatted paragraphs
    │       │
    │       ├─► Area details (lines 423-506)
    │       │   └─► For each area:
    │       │       ├─► Area summary box
    │       │       ├─► Store performance table
    │       │       └─► Sorted by status (RED first)
    │       │
    │       └─► Action items (lines 508-549)
    │           └─► Critical issues (RED stores)
    │           └─► Warnings (YELLOW stores)
    │
    ├─► Stream PDF to response
    │   └─► Content-Type: application/pdf
    │   └─► Content-Disposition: attachment
    │
    ▼
FRONTEND (app.js:336-375)
    │
    ├─► Receive PDF blob
    │
    ├─► Create object URL
    │   └─► pdfUrl = URL.createObjectURL(pdfBlob)
    │
    ├─► Auto-download PDF
    │   └─► downloadPDF(pdfUrl, filename)
    │
    ├─► Save to report history
    │   └─► state.reports.unshift(report)
    │   └─► saveReports() → localStorage
    │
    ├─► Show preview modal
    │   └─► showReportPreview(report)
    │   └─► Display executive summary
    │   └─► Show statistics
    │
    └─► Reset UI state
        └─► isProcessing = false
        └─► Hide progress indicators
```

---

## Security Architecture

### 1. Frontend Security

**XSS Prevention:**
- HTML escaping for all user-generated content (app.js:1120-1124)
- No `innerHTML` with raw user input
- Markdown converter escapes first, then formats (app.js:1134-1166)

**Content Security Policy:**
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self';
               style-src 'self' 'unsafe-inline';
               img-src 'self' data:;
               connect-src 'self' https: http://localhost:3001;">
```

**Input Validation:**
- Email validation with RFC 5322 regex (app.js:1110-1118)
- ID sanitization (app.js:159-162)
- Length limits on all inputs (CONFIG.MAX_EMAIL_LENGTH, etc.)
- Prototype pollution prevention (app.js:151-156)

**Event Handling:**
- Event delegation instead of inline handlers (app.js:498-509)
- Data attributes for element identification
- ID validation before actions (app.js:575-577)

### 2. Backend Security

**CORS Configuration:**
```javascript
app.use(cors()); // Allows cross-origin requests
```

**Input Validation:**
- Request body validation
- File path sanitization (server.js:246-251)
- Directory traversal prevention

**Authentication (when configured):**
- Azure AD OAuth2 for Power BI
- API key support via headers (app.js:379-396)
- CSRF token support (app.js:398-409)

### 3. Data Security

**Client-Side Storage:**
- Only metadata in LocalStorage
- No sensitive credentials stored
- Data sanitized before storage

**API Communication:**
- HTTPS for production (n8n webhook)
- Secure headers with CSRF tokens
- Bearer token authentication support

---

## State Management

### Frontend State Object

```javascript
const state = {
    // Email recipients for report distribution
    recipients: [
        { id: string, name: string, email: string }
    ],

    // Generated reports history
    reports: [
        {
            id: string,
            date: ISO-8601 timestamp,
            status: 'generated' | 'sent' | 'failed',
            pdfUrl: Blob URL,
            reportData: { ... },
            summary: string
        }
    ],

    // UI state flags
    isProcessing: boolean,
    currentReport: Report | null,
    selectedReports: string[], // Max 2 for comparison
    pendingReport: Report | null
};
```

### State Persistence Flow

```
User Action
    │
    ▼
State Update
    │
    ├─► state.recipients.push(newRecipient)
    │
    ▼
LocalStorage Sync
    │
    ├─► localStorage.setItem('wr_recipients', JSON.stringify(state.recipients))
    │
    ▼
UI Re-render
    │
    └─► renderRecipients() / renderReports()
```

### State Loading (app.js:91-148)

1. **Load from LocalStorage**
   - Parse JSON with sanitization
   - Validate data structure
   - Filter invalid entries

2. **Validation**
   - Type checking
   - Email format validation
   - ID format validation

3. **Fallback**
   - Default recipients if none exist
   - Empty arrays for reports

---

## API Integration

### n8n Webhook Integration

**Endpoint Configuration:**
```javascript
N8N_WEBHOOK_URL: 'http://localhost:3001/api/n8n-proxy'
```

**Request Flow:**
```
Frontend
    │ POST /api/n8n-proxy
    │ Body: { recipients, timestamp }
    ▼
Backend Proxy (server.js:39-67)
    │ POST https://cdpoc.app.n8n.cloud/webhook/weekly-compliance-webhook
    │ Headers: Content-Type: application/json
    ▼
n8n Cloud
    │ Execute workflow
    │ Return: { success, reportData }
    ▼
Backend Proxy
    │ Forward response
    ▼
Frontend
    │ Process report data
```

**Why Proxy?**
- Bypasses CORS restrictions
- n8n cloud doesn't send proper CORS headers
- Backend adds CORS headers for browser
- Allows localhost development

### PDF Generation API

**Endpoint:** `POST /api/generate-pdf`

**Request:**
```json
{
    "reportData": {
        "report_date": "2025-11-24T00:00:00Z",
        "executive_summary": "...",
        "all_stores": [...],
        "areas": [...]
    }
}
```

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="weekly-compliance-report-2025-11-24.pdf"`
- Binary PDF data

---

## UI Components

### 1. Progress Indicators (app.js:941-967)

```javascript
// Five-step workflow visualization
Steps:
1. Connecting to Power BI
2. Extracting data (14 tables, 39 measures)
3. AI analyzing data
4. Generating executive report
5. Distributing to recipients

States per step:
- pending: ○ (empty circle)
- active: ● (filled circle)
- completed: ✓ (checkmark)
```

### 2. Report Comparison (app.js:736-801)

**Features:**
- Select exactly 2 reports
- Automatic chronological sorting
- Delta calculation for metrics
- Side-by-side display
- Color-coded changes (positive/negative)

**Metrics Compared:**
- Total stores
- RED flags count
- YELLOW warnings count
- GREEN compliant count

### 3. Modal System

**Three Modal Types:**

1. **Report Preview Modal**
   - Executive summary display
   - Report statistics
   - Action buttons

2. **Comparison Modal**
   - Wide layout (two columns)
   - Delta summary
   - Synchronized content

3. **Preview Modal** (unused in current POC)
   - Pre-send review
   - Recipient list
   - Regenerate option

---

## Performance Considerations

### Frontend Optimization

**LocalStorage:**
- Stores only metadata (~1-5KB per report)
- PDF blobs stored as object URLs
- 5-10MB total capacity (hundreds of reports)

**Event Delegation:**
- Single listener per list (not per item)
- Reduces memory footprint
- Better performance with many items

**Lazy Loading:**
- Modals render on-demand
- PDF only generated when requested
- Report content loaded from state

### Backend Optimization

**PDF Generation:**
- Streaming response (not buffered)
- Efficient table rendering
- Page-break optimization
- Estimated page count (server.js:552-557)

**Memory Management:**
- PDFKit streams to response
- No intermediate file storage
- Garbage collection after send

---

## Error Handling

### Frontend Error Handling

**Network Errors:**
```javascript
try {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
} catch (error) {
    console.error('Workflow error:', error);
    showToast('Error generating report. Please try again.', 'error');
    // Reset UI state
}
```

**User Feedback:**
- Toast notifications for all actions
- Error, success, info types
- 4-second auto-dismiss
- Slide-in animation

### Backend Error Handling

**n8n Proxy Errors:**
```javascript
if (!response.ok) {
    return res.status(response.status).json(data);
}
// Forward exact error from n8n
```

**PDF Generation Errors:**
```javascript
if (!reportData) {
    return res.status(400).json({ error: 'Missing reportData' });
}
// Validate before processing
```

---

## Development Workflow

### Local Development Setup

1. **Start Backend:**
```bash
cd backend
npm install
node src/server.js
# Server runs on http://localhost:3001
```

2. **Open Frontend:**
```bash
open web-ui/index.html
# Or serve with any HTTP server
```

3. **Configure n8n:**
- Import workflow from `/n8n-workflows/`
- Set webhook URL in `app.js`
- Activate workflow in n8n cloud

### Testing

**Manual Testing:**
1. Click "Sync & Analyze"
2. Verify progress indicators
3. Check PDF download
4. Verify report in history
5. Test comparison feature

**Browser Console:**
- Network tab: Check API calls
- Console: Check for errors
- Application tab: Verify LocalStorage

---

## Deployment Considerations

### Production Checklist

**Frontend:**
- [ ] Update `BACKEND_API_URL` to production domain
- [ ] Update `N8N_WEBHOOK_URL` to production n8n
- [ ] Configure CSP for production domains
- [ ] Minify JavaScript and CSS
- [ ] Set up HTTPS

**Backend:**
- [ ] Set `PORT` environment variable
- [ ] Configure CORS for production origins
- [ ] Set all required environment variables
- [ ] Enable production logging
- [ ] Set up process manager (PM2, systemd)

**Infrastructure:**
- [ ] Set up reverse proxy (nginx)
- [ ] Configure SSL certificates
- [ ] Set up monitoring
- [ ] Configure backup for reports
- [ ] Set up log aggregation

---

## Technology Stack Details

### Frontend Technologies

**Vanilla JavaScript (ES6+):**
- No frameworks (React, Vue, etc.)
- Modern async/await patterns
- Module pattern for organization
- Event-driven architecture

**CSS Architecture:**
- CSS Custom Properties (variables)
- Flexbox and Grid layouts
- Mobile-first responsive design
- BEM-like naming convention

**Browser APIs:**
- LocalStorage API
- Fetch API
- Blob and File APIs
- DOM manipulation

### Backend Technologies

**Node.js 18+:**
- ES Modules (`type: "module"`)
- Async/await throughout
- Native fetch support

**Express.js 5.x:**
- Minimal middleware
- RESTful endpoints
- JSON body parsing
- CORS middleware

**PDFKit:**
- Programmatic PDF generation
- Vector graphics
- Custom layouts
- Font embedding

### Cloud Services

**n8n Cloud:**
- Workflow automation
- Visual programming
- HTTP webhooks
- API integrations

**Microsoft Fabric:**
- Power BI access
- Azure AD authentication
- DAX query execution

**OpenAI API:**
- GPT-4o model
- Text generation
- Analysis and insights

---

## Maintenance and Monitoring

### Logs

**Backend Logs:**
```javascript
console.log('Proxying request to n8n:', n8nWebhookUrl);
console.error('N8N proxy error:', error);
```

**Frontend Logs:**
```javascript
console.error('Error loading recipients:', error);
console.log('Workflow result:', workflowResult);
```

### Monitoring Points

1. **Health Check:** `GET /api/health`
2. **n8n Workflow Status:** Check webhook response
3. **PDF Generation Time:** Measure PDF endpoint latency
4. **LocalStorage Usage:** Monitor storage quota
5. **Error Rates:** Track failed report generations

---

## Glossary

**Terms:**
- **POC:** Proof of Concept
- **MCP:** Microsoft Collaboration Platform (Fabric)
- **DAX:** Data Analysis Expressions (Power BI query language)
- **CSP:** Content Security Policy
- **CORS:** Cross-Origin Resource Sharing
- **XSS:** Cross-Site Scripting
- **Blob:** Binary Large Object
- **UUID:** Universally Unique Identifier
- **PDFKit:** Node.js PDF generation library

---

## File Reference

### Configuration Files

**backend/package.json:**
- Dependencies: express, cors, dotenv, pdfkit
- Scripts: start, test
- Node version: >=18.0.0

**backend/.env:**
```env
# Not tracked in git
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
POWERBI_WORKSPACE_ID=...
POWERBI_DATASET_ID=...
OPENAI_API_KEY=...
N8N_WEBHOOK_URL=...
```

### Source Files

**web-ui/app.js (1,173 lines):**
- Configuration (7-27)
- State management (33-40)
- Initialization (82-148)
- Event handlers (186-257)
- n8n workflow (263-376)
- Recipient management (413-509)
- Report rendering (514-632)
- Comparison logic (736-935)
- Utilities (1102-1166)

**backend/src/server.js (576 lines):**
- Server setup (22-27)
- Health endpoint (30-36)
- n8n proxy (39-67)
- PDF generation (163-202)
- PDF content (282-550)
- Server start (560-573)

---

## Quick Reference

### Common Tasks

**Add a new recipient:**
```javascript
const recipient = { id: generateId(), name: "...", email: "..." };
state.recipients.push(recipient);
saveRecipients();
renderRecipients();
```

**Generate a report:**
```javascript
handleSyncAnalyze() → executeN8nWorkflow() → n8n → PDF
```

**Compare two reports:**
```javascript
// Select 2 reports → Click "Compare Selected"
handleCompareReports() → generateComparisonContent()
```

**Download PDF:**
```javascript
downloadPDF(pdfUrl, filename) → Creates <a> tag → Triggers download
```

---

## End of Technical Architecture Documentation
