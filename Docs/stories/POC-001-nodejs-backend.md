# Story: POC-001 - Node.js Backend for Weekly Report Automation

## Status: Approved

## Summary
Build a standalone Node.js script that automates the weekly report generation process: extract data from Power BI, generate AI analysis via OpenAI, and send formatted email via Microsoft Graph.

## Acceptance Criteria

### AC-1: Power BI Data Extraction
- [ ] Authenticate with Azure AD using client credentials
- [ ] Query Power BI dataset for all KPI measures
- [ ] Extract top products and dimensional data
- [ ] Handle API errors gracefully

### AC-2: OpenAI Analysis Generation
- [ ] Send formatted KPI data to GPT-4o
- [ ] Generate executive summary, key wins, concerns, and recommendations
- [ ] Prompt produces professional, actionable insights

### AC-3: Email Distribution
- [ ] Authenticate with Microsoft Graph API
- [ ] Build HTML email with KPI cards and AI analysis
- [ ] Send to configured recipient list
- [ ] Log success/failure

### AC-4: Main Orchestration
- [ ] Single command execution: `node run-report.js`
- [ ] Environment-based configuration (no hardcoded secrets in code)
- [ ] Console output for debugging/demo

## Technical Approach

### Stack
- Node.js (ES modules)
- node-fetch for HTTP requests
- @azure/identity for Azure AD auth (optional, can use raw OAuth2)

### File Structure
```
backend/
├── .env              # Credentials (gitignored)
├── package.json      # Dependencies
├── src/
│   ├── config.js     # Load env vars
│   ├── powerbi.js    # Data extraction
│   ├── analysis.js   # OpenAI integration
│   ├── email.js      # Microsoft Graph
│   └── index.js      # Main orchestration
└── README.md         # Usage instructions
```

### Credentials (from user)
- Azure AD Tenant ID: 69b78e22-8d12-4dce-85ec-98ac268d28a2
- Azure AD Client ID: dec9ffdd-8efc-46bc-aa7e-b413c240429d
- Azure AD Client Secret: [stored in .env]
- Power BI Dataset ID: 9fe2b135-2920-474d-9112-324b7e8da794
- OpenAI API Key: [stored in .env]
- Email Recipient: subeer.ai.automations@gmail.com

## Dev Agent Record

### Context Reference
- Docs/index.md (project overview)
- Docs/architecture.md (system design)
- Docs/data-models-reporting-system.md (DAX measures)
- Docs/bmm-brainstorming-session-2025-11-17.md (requirements)

### Implementation Notes
- POC fast-track: Skip research/PRD/architecture phases
- 24-hour timeline constraint
- Code will translate directly to n8n Code nodes later

---

**Approved by:** BMad (fast-track POC)
**Date:** 2025-11-18
