# Inogentive Weekly Report Automation POC

**Automated Weekly Compliance Report Generation System**

A proof-of-concept application that automates the generation of weekly compliance reports by integrating Power BI data extraction, AI-powered analysis, and automated PDF report generation through n8n workflows.

---

## 🎯 Overview

This application streamlines the weekly compliance reporting process by:
- Extracting data from Power BI datasets via Microsoft Fabric API
- Analyzing store performance data using AI (OpenAI GPT-4)
- Generating professional PDF reports with executive summaries
- Providing a web interface for report management and comparison
- Orchestrating the entire workflow through n8n cloud automation

---

## 🏗️ Architecture

### System Components

```
┌─────────────────┐
│   Web UI        │ ← User Interface (HTML/CSS/JavaScript)
│  (Frontend)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   n8n Cloud     │ ← Workflow Orchestration
│   Webhook       │
└────────┬────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│  Power BI API   │  │   OpenAI API    │
│  (via Fabric)   │  │   (GPT-4o)      │
└────────┬────────┘  └────────┬────────┘
         │                    │
         └──────────┬─────────┘
                    ▼
         ┌─────────────────┐
         │  Node.js Backend│
         │  PDF Generator  │
         └─────────────────┘
```

### Technology Stack

**Frontend:**
- HTML5, CSS3 (Custom styling with CSS variables)
- Vanilla JavaScript (ES6+)
- LocalStorage for client-side data persistence

**Backend:**
- Node.js 18+
- Express.js 5.x
- PDFKit for PDF generation
- Microsoft Graph API for email (optional)
- CORS enabled for cross-origin requests

**Integration Layer:**
- n8n Cloud Workflow (https://cdpoc.app.n8n.cloud)
- Microsoft Fabric MCP Server
- OpenAI API integration

**Data Sources:**
- Microsoft Power BI (via Fabric API)
- Azure AD authentication
- Custom dataset queries

---

## 📋 Features

### 1. Automated Report Generation
- **One-Click Generation**: Trigger report generation via the web interface
- **Real-time Progress**: Visual progress indicators showing workflow steps
- **AI-Powered Analysis**: GPT-4o generates executive summaries and insights
- **PDF Output**: Professional, multi-page compliance reports

### 2. Report Management
- **History Tracking**: View all previously generated reports
- **Report Comparison**: Side-by-side comparison of two reports with delta analytics
- **Executive Summaries**: Quick view of report highlights and key metrics
- **Status Indicators**: Visual status for RED/YELLOW/GREEN compliance flags

### 3. Web Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, professional interface with dark mode support
- **Real-time Updates**: Live status updates during report generation
- **Keyboard Shortcuts**: Efficiency features for power users

### 4. Data Analysis
- **Store Compliance**: Track RED/YELLOW/GREEN compliance status across stores
- **Payroll Variance**: Monitor payroll discrepancies and trends
- **Manual Clock Tracking**: Identify stores with manual time-tracking issues
- **Area Performance**: Compare performance across different geographical areas

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager
- Active n8n cloud account
- Microsoft Fabric/Power BI access
- OpenAI API key
- Azure AD application credentials

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MuffinCrap/Inogentive.git
   cd Inogentive
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the `backend` directory:
   ```env
   # Azure AD Configuration
   AZURE_TENANT_ID=your-tenant-id
   AZURE_CLIENT_ID=your-client-id
   AZURE_CLIENT_SECRET=your-client-secret

   # Power BI Configuration
   POWERBI_WORKSPACE_ID=your-workspace-id
   POWERBI_DATASET_ID=your-dataset-id

   # OpenAI Configuration
   OPENAI_API_KEY=your-openai-api-key

   # Email Configuration (optional)
   EMAIL_RECIPIENT=recipient@company.com
   EMAIL_FROM=sender@company.com
   ```

4. **Start the backend server:**
   ```bash
   npm start
   # Server will run on http://localhost:3001
   ```

5. **Open the web interface:**
   ```bash
   open ../web-ui/index.html
   # Or navigate to the file in your browser
   ```

### Configuration

**Web UI Configuration** (`web-ui/app.js`):
```javascript
const CONFIG = {
    BACKEND_API_URL: 'http://localhost:3001',
    N8N_SYNC_ANALYZE_WEBHOOK: 'https://cdpoc.app.n8n.cloud/webhook/weekly-compliance-webhook',
    USE_BACKEND_API: false  // Set to false to use n8n workflow
};
```

---

## 📊 How It Works

### Report Generation Flow

1. **User Initiates Report**
   - User clicks "Sync & Analyze" button in web interface
   - Frontend displays progress indicators

2. **n8n Workflow Execution**
   - Web UI calls n8n cloud webhook
   - n8n authenticates with Azure AD
   - Extracts data from Power BI via Fabric API

3. **AI Analysis**
   - n8n sends extracted data to OpenAI API
   - GPT-4o analyzes store performance data
   - Generates executive summary with recommendations

4. **PDF Generation**
   - n8n sends report data to backend API
   - Backend uses PDFKit to create formatted PDF
   - PDF includes executive summary, store details, and action items

5. **Report Delivery**
   - PDF automatically downloaded to user's computer
   - Report metadata saved to browser LocalStorage
   - Report appears in history for future reference

### Data Flow

```
Power BI Dataset
    ↓ (Fabric API)
n8n Workflow
    ↓ (HTTP POST)
OpenAI GPT-4o
    ↓ (Analysis)
n8n Workflow
    ↓ (HTTP POST)
Backend API (/api/generate-pdf)
    ↓ (PDFKit)
PDF Report → User Download
    ↓
LocalStorage → Report History
```

---

## 🔧 API Endpoints

### Backend Server (Port 3001)

**Health Check**
```
GET /api/health
Response: { "status": "healthy", "timestamp": "ISO-8601", "service": "..." }
```

**Generate PDF Report**
```
POST /api/generate-pdf
Body: { "reportData": { ... } }
Response: PDF file (application/pdf)
```

**List Reports**
```
GET /api/reports
Response: { "success": true, "reports": [...], "count": N }
```

**Get Specific Report**
```
GET /api/reports/:filename
Response: HTML or JSON report content
```

**Get Configuration**
```
GET /api/config
Response: { "emailRecipient": "...", "useMockData": false }
```

---

## 📁 Project Structure

```
Inogentive/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express API server
│   │   ├── powerbi.js         # Power BI data extraction
│   │   ├── analysis.js        # OpenAI analysis integration
│   │   ├── email.js           # Email sending (Graph API)
│   │   └── config.js          # Configuration management
│   ├── reports/               # Generated reports storage
│   ├── package.json
│   └── .env                   # Environment configuration
│
├── web-ui/
│   ├── index.html             # Main application page
│   ├── app.js                 # Application logic
│   └── styles.css             # Application styling
│
├── n8n-workflows/             # n8n workflow exports
│   └── weekly-compliance-webhook.json
│
├── fabric-mcp/                # Microsoft Fabric MCP server
│
└── README.md                  # This file
```

---

## 🔐 Security Considerations

### Authentication
- Azure AD OAuth2 for Power BI access
- API keys stored in environment variables
- No credentials in source code

### Data Protection
- Reports stored locally on user's machine
- LocalStorage used for metadata only
- No sensitive data transmitted to frontend

### API Security
- CORS configured for specific origins
- Input validation on all endpoints
- Sanitized HTML output to prevent XSS

---

## 📈 Report Structure

### PDF Report Sections

1. **Title Page**
   - Report date and week
   - Overall compliance statistics
   - RED/YELLOW/GREEN store counts

2. **Executive Summary**
   - AI-generated overview
   - Key trends and insights
   - Critical issues highlighted

3. **Area Details** (One page per area)
   - Area summary statistics
   - Store performance table
   - Payroll variance details
   - Manual clock-in percentages

4. **Action Items**
   - Critical issues requiring immediate attention
   - Warning items for monitoring
   - Prioritized recommendations

### Report Metrics

- **Overall Status**: RED/YELLOW/GREEN compliance
- **Payroll Variance**: Actual vs. budgeted hours (%)
- **Manual Clock Rate**: Percentage of manual time entries
- **Store Count**: Total stores monitored
- **Area Performance**: Aggregated metrics by geographical area

---

## 🎨 UI Features

### Main Dashboard
- **Sync & Analyze Button**: Initiates report generation
- **Progress Indicator**: Real-time workflow status
- **Progress Steps**: Visual representation of generation phases

### Report History
- **Report List**: Chronological list of generated reports
- **Report Preview**: Click to view executive summary
- **Report Comparison**: Select two reports for side-by-side analysis
- **Status Badges**: Visual indicators for report status

### Comparison View
- **Side-by-Side Layout**: Two-column comparison
- **Delta Summary**: Key changes highlighted
- **Metric Changes**: Visual indicators for improvements/declines
- **Synchronized Scrolling**: Easy comparison of sections

---

## 🔄 n8n Workflow

### Workflow Nodes

1. **Webhook Trigger**: Receives POST request from web UI
2. **Fabric MCP**: Connects to Power BI via Microsoft Fabric
3. **Data Extraction**: Queries dataset for compliance metrics
4. **Data Transformation**: Formats data for AI analysis
5. **OpenAI Node**: Generates executive summary
6. **Backend Call**: Sends data to PDF generation endpoint
7. **Response**: Returns report metadata to web UI

### Webhook URL
```
https://cdpoc.app.n8n.cloud/webhook/weekly-compliance-webhook
```

---

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
- Check Node.js version (requires 18+)
- Verify all dependencies installed: `npm install`
- Check port 3001 is available

**Report generation fails:**
- Verify OpenAI API key is valid
- Check n8n workflow is active
- Confirm Azure AD credentials are correct
- Check network connectivity

**PDF not downloading:**
- Verify browser allows downloads
- Check backend server is running
- Review browser console for errors

**Reports not appearing in history:**
- Clear browser cache
- Check LocalStorage is enabled
- Verify report data is being saved

---

## 📝 Development Notes

### Browser Compatibility
- Chrome/Edge: Full support
- Safari: Full support
- Firefox: Full support
- IE11: Not supported

### Performance
- Report generation: 10-30 seconds
- PDF size: ~500KB - 2MB depending on store count
- LocalStorage limit: ~5-10MB (hundreds of reports)

### Future Enhancements
- Email distribution integration
- Scheduled report generation
- Custom report templates
- Multi-language support
- Advanced analytics dashboard

---

## 📄 License

This project is proprietary and confidential.
Copyright © 2025 Inogentive. All rights reserved.

---

## 👥 Support

For questions or issues, please contact:
- Technical Support: [Your Contact]
- Project Lead: [Your Contact]

---

## 🔖 Version History

### v1.0.0 - POC (Current)
- Initial proof of concept
- n8n workflow integration
- Power BI data extraction
- AI-powered analysis
- PDF report generation
- Web interface with comparison features
