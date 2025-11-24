# Testing Guide: Weekly Compliance Report Automation

## Overview
This guide provides comprehensive testing procedures for validating the n8n workflow before production deployment.

## Testing Philosophy

The workflow must be tested at multiple levels:
1. **Unit Testing**: Individual nodes
2. **Integration Testing**: Node-to-node data flow
3. **End-to-End Testing**: Complete workflow execution
4. **Data Validation**: Output accuracy vs. manual reports
5. **Performance Testing**: Execution time and resource usage
6. **Error Handling**: Failure scenarios and recovery

## Test Environment Setup

### Create Test Workspace

It's recommended to create a separate n8n workflow for testing:

```bash
# Duplicate production workflow
# In n8n UI: Workflows → Weekly Compliance Report → Duplicate
# Rename to: "Weekly Compliance Report - TEST"
```

### Test Data Preparation

Create test data scenarios in Power BI:

1. **Normal Week**: All metrics within thresholds
2. **High Exception Week**: Multiple red/yellow flags
3. **Missing Data**: Some stores with null/missing values
4. **Edge Cases**: Zero values, extreme variances

## Phase 1: Unit Testing (Individual Nodes)

### Test 1.1: Cron Trigger

**Objective**: Verify schedule configuration

```bash
# Manual test
1. Open workflow in n8n
2. Check cron expression in trigger node
3. Verify: "0 9 * * 1" (Every Monday 9 AM)
4. Use online cron validator: https://crontab.guru
```

**Expected**: Expression is valid and matches requirements

---

### Test 1.2: Set Workflow Variables

**Objective**: Ensure all configuration variables are set correctly

**Steps**:
1. Execute node manually
2. Inspect output JSON

**Validation Checklist**:
- [ ] `tenantId` is correct UUID format
- [ ] `clientId` is correct UUID format
- [ ] `datasetId` is correct UUID format
- [ ] `recipients` array contains valid emails
- [ ] `thresholds` object has all 5 properties
- [ ] `reportWeek` is current date in ISO format
- [ ] `startTime` is Unix timestamp

---

### Test 1.3: Get OAuth Token

**Objective**: Verify authentication works

**Steps**:
1. Execute node with "Set Workflow Variables" data
2. Check response

**Expected Output**:
```json
{
  "token_type": "Bearer",
  "expires_in": 3599,
  "access_token": "eyJ0eXAiOiJKV1Q..."
}
```

**Validation**:
- [ ] `access_token` is present and > 100 characters
- [ ] `token_type` is "Bearer"
- [ ] No error message

**Troubleshooting**:
- Error 401: Check client ID/secret
- Error 400: Verify tenant ID format
- Timeout: Check network connectivity

---

### Test 1.4: Check Token Validity

**Objective**: Ensure token validation logic works

**Test Cases**:

**Case 1: Valid Token**
- Input: Valid OAuth response
- Expected: Proceeds to success path

**Case 2: Missing Token**
- Input: `{ "access_token": "" }`
- Expected: Triggers error handler

**Case 3: Short Token**
- Input: `{ "access_token": "short" }`
- Expected: Triggers error handler

---

### Test 1.5: Get Dataset Metadata

**Objective**: Verify Power BI metadata endpoint access

**Steps**:
1. Execute with valid OAuth token
2. Inspect response structure

**Expected Output**:
```json
{
  "tables": [
    { "name": "Stores", "columns": [...] },
    { "name": "Calendar", "columns": [...] }
  ],
  "measures": [
    { "name": "Worked_Hours", "expression": "..." }
  ]
}
```

**Validation**:
- [ ] `tables` array is not empty
- [ ] Key tables present: Stores, Calendar
- [ ] `measures` array contains expected measures
- [ ] No error in response

---

### Test 1.6: Parse Metadata

**Objective**: Ensure metadata parsing identifies required tables/measures

**Steps**:
1. Execute with metadata response
2. Check parsed output

**Validation**:
- [ ] `relevantTables.stores` is found
- [ ] `relevantTables.calendar` is found
- [ ] `keyMeasures.workedHours` is found
- [ ] `accessToken` is preserved in output

---

### Test 1.7-1.9: Data Extraction Nodes

**Objective**: Verify DAX queries execute successfully

**Test for Each Node**:
- Extract Payroll Data
- Extract Cash Control Data
- Extract Stock Control Data

**Steps**:
1. Execute node with valid metadata context
2. Check response structure

**Expected Output Structure**:
```json
{
  "results": [
    {
      "tables": [
        {
          "rows": [
            {
              "[Stores].[Area]": "Area 1",
              "[Stores].[Store_Name]": "Store A",
              "[Worked_Hours]": 120.5
            }
          ]
        }
      ]
    }
  ]
}
```

**Validation**:
- [ ] `results[0].tables[0].rows` is an array
- [ ] At least one row returned
- [ ] All expected columns present
- [ ] Numeric values are numbers (not strings)
- [ ] No null values for critical fields

**Performance Check**:
- [ ] Execution time < 15 seconds per query

---

### Test 1.10-1.11: Data Transformation

**Objective**: Verify data merging and aggregation logic

**Test 1.10: Merge Data by Store**

**Validation**:
- [ ] All stores have `payroll`, `cash`, and `stock` properties
- [ ] `byArea` object has 5 keys (one per area)
- [ ] `totalStores` matches expected count (90+)
- [ ] No duplicate stores

**Test 1.11: Transform & Aggregate by Area**

**Validation**:
- [ ] Each area has `payroll`, `cash`, `stock` summaries
- [ ] Percentage calculations are correct
- [ ] No division by zero errors
- [ ] Variance calculations match manual calculations

---

### Test 1.12: Calculate KPIs & Exceptions

**Objective**: Ensure exception detection logic works correctly

**Test Scenarios**:

**Scenario 1: No Exceptions**
- Input: All metrics within thresholds
- Expected: Empty exception arrays

**Scenario 2: Payroll Variance**
- Input: Area with 12% hours variance
- Expected: Exception in `critical` array with `severity: 'RED'`

**Scenario 3: Manual Clock-ins**
- Input: Area with 25% manual clock-ins
- Expected: Exception in `warning` array with `severity: 'RED'`

**Scenario 4: Cash Discrepancy**
- Input: Area with £150 cash discrepancy
- Expected: Exception in `critical` array with `severity: 'RED'`

**Validation**:
- [ ] `exceptionCount.total` is accurate
- [ ] Severity levels assigned correctly (RED vs YELLOW)
- [ ] Store-level exceptions in `info` array

---

### Test 1.13: Prepare AI Context

**Objective**: Verify data formatting for OpenAI

**Validation**:
- [ ] `aiContext.reportWeek` is present
- [ ] `aiContext.totalStores` matches actual count
- [ ] `areaSummaries` array has 5 items
- [ ] All numeric values are formatted as strings with 2 decimals
- [ ] `topStoreIssues` limited to 10 items
- [ ] Issues sorted by severity (RED first)

---

### Test 1.14-1.15: AI Analysis

**Objective**: Verify OpenAI integration and response parsing

**Test 1.14: Generate Narrative**

**Steps**:
1. Execute with prepared AI context
2. Monitor API call and response time

**Validation**:
- [ ] Response received within 60 seconds
- [ ] `choices[0].message.content` is not empty
- [ ] Token usage < 2500 total
- [ ] No OpenAI API errors

**Quality Check**:
- [ ] Narrative mentions specific areas
- [ ] Narrative includes actual numbers/percentages
- [ ] Tone is professional and action-oriented
- [ ] Sections are clearly delineated (PAYROLL, CASH, STOCK)

**Test 1.15: Parse AI Response**

**Validation**:
- [ ] `narrative.full` contains complete text
- [ ] `narrative.sections.payroll` extracted
- [ ] `narrative.sections.cashControls` extracted
- [ ] `narrative.sections.stockControl` extracted

---

### Test 1.16: Generate PDF Report

**Objective**: Verify PDF generation (placeholder for now)

**Note**: Full PDF testing requires PDFKit library installation.

**Current Test** (Mock PDF):
- [ ] PDF base64 string is generated
- [ ] Filename includes report date
- [ ] MIME type is 'application/pdf'

**Future Test** (With PDFKit):
- [ ] PDF has 31 pages
- [ ] Title page includes report date and summary
- [ ] Each area has 3 pages (payroll, cash, stock)
- [ ] Tables have correct headers
- [ ] Color coding applied (RED/YELLOW rows)
- [ ] Final page has action items summary

---

### Test 1.17: Send Email

**Objective**: Verify email composition and delivery

**Steps**:
1. **Dry Run**: Disable email node, inspect data
2. **Test Send**: Enable node, send to test email

**Validation**:
- [ ] Email received within 2 minutes
- [ ] Subject line correct format
- [ ] Body contains narrative text
- [ ] HTML formatting renders correctly
- [ ] PDF attachment present
- [ ] Attachment opens without errors

---

### Test 1.18: Archive to Azure Blob

**Objective**: Verify blob storage upload

**Steps**:
1. Execute node
2. Check Azure Blob Storage

**Validation**:
- [ ] Blob uploaded successfully
- [ ] Filename format: `Compliance_Report_YYYY-MM-DD.pdf`
- [ ] File size > 0 bytes
- [ ] Blob accessible via Azure Portal

---

### Test 1.19: Log Success

**Objective**: Verify logging functionality

**Validation**:
- [ ] Log entry includes timestamp
- [ ] Status is "SUCCESS"
- [ ] Execution time is calculated
- [ ] Stores processed count is accurate
- [ ] Console log output visible

---

### Test 1.21-1.23: Error Handling

**Objective**: Verify error path works correctly

**Test Scenario**:
1. Force an error (e.g., invalid OAuth credentials)
2. Verify error handler triggered

**Validation**:
- [ ] Error handler node executes
- [ ] Error message captured
- [ ] Alert email sent to IT team
- [ ] Error logged to console
- [ ] Workflow stops gracefully

---

## Phase 2: Integration Testing

### Test 2.1: Full Data Pipeline

**Objective**: Test complete data flow from OAuth to AI

**Steps**:
1. Manually execute workflow from start
2. Monitor each node execution
3. Verify data flows correctly

**Checkpoints**:
- [ ] OAuth token obtained (Node 3)
- [ ] Metadata retrieved (Node 5)
- [ ] All 3 data queries execute (Nodes 7-9)
- [ ] Data merged correctly (Node 10)
- [ ] Aggregations calculated (Node 11)
- [ ] Exceptions identified (Node 12)
- [ ] AI context prepared (Node 13)
- [ ] Narrative generated (Node 14)
- [ ] PDF created (Node 16)

**Performance**:
- [ ] Total execution time < 5 minutes
- [ ] No memory errors
- [ ] No timeout errors

---

### Test 2.2: Error Recovery

**Objective**: Test error handling at different stages

**Test Cases**:

**Case 1: OAuth Failure**
- Scenario: Invalid client secret
- Expected: Error handler triggers, alert sent

**Case 2: Power BI Timeout**
- Scenario: DAX query takes > 60 seconds
- Expected: Timeout error, alert sent

**Case 3: OpenAI API Failure**
- Scenario: Invalid API key or rate limit
- Expected: Error captured, alert sent

**Case 4: Email Send Failure**
- Scenario: Invalid SMTP credentials
- Expected: Error logged, workflow notifies IT

---

### Test 2.3: Data Validation

**Objective**: Compare automated output to manual report

**Steps**:
1. Run workflow for a specific week
2. Generate manual report for same week
3. Compare outputs

**Comparison Checklist**:
- [ ] Total stores count matches
- [ ] Area-level worked hours match (±1%)
- [ ] Area-level budget hours match (±1%)
- [ ] Variance percentages match (±0.5%)
- [ ] Manual clock-in percentages match (±0.5%)
- [ ] Cash discrepancies match (±£5)
- [ ] Refund percentages match (±0.2%)
- [ ] Exceptions flagged consistently

**Acceptance Criteria**: 95%+ accuracy

---

## Phase 3: End-to-End Testing

### Test 3.1: Scheduled Execution

**Objective**: Verify cron trigger works in production

**Steps**:
1. Activate workflow
2. Wait for Monday 9 AM execution
3. Monitor execution

**Validation**:
- [ ] Workflow triggered automatically at 9:00 AM
- [ ] Execution completes successfully
- [ ] Email received by 9:30 AM
- [ ] PDF archived to blob storage
- [ ] No manual intervention required

---

### Test 3.2: Multiple Weeks

**Objective**: Test consistency across multiple executions

**Steps**:
Run workflow for 3-4 consecutive weeks

**Validation**:
- [ ] All weeks execute successfully
- [ ] Report dates increment correctly
- [ ] No duplicate reports
- [ ] Blob storage organized by date
- [ ] Email recipients receive all reports

---

### Test 3.3: High Load Week

**Objective**: Test with maximum data volume

**Scenario**: Week with 90+ stores, all areas reporting

**Validation**:
- [ ] All stores included in report
- [ ] Execution time still < 5 minutes
- [ ] Memory usage < 2GB
- [ ] PDF size reasonable (< 5MB)
- [ ] No data truncation

---

### Test 3.4: Low Data Week

**Objective**: Handle weeks with missing data

**Scenario**: Week with some stores not reporting

**Validation**:
- [ ] Workflow completes without errors
- [ ] Missing stores noted in report
- [ ] Calculations handle nulls gracefully
- [ ] No division by zero errors
- [ ] Narrative mentions missing data

---

## Phase 4: Performance Testing

### Test 4.1: Execution Time

**Objective**: Measure and optimize execution time

**Benchmark**:
- **Target**: < 5 minutes total
- **OAuth**: < 5 seconds
- **Metadata**: < 10 seconds
- **Each DAX Query**: < 15 seconds
- **Data Processing**: < 30 seconds
- **AI Generation**: < 60 seconds
- **PDF Generation**: < 30 seconds
- **Email Send**: < 10 seconds

**Test Method**:
1. Run workflow 10 times
2. Record execution time for each node
3. Calculate averages
4. Identify bottlenecks

---

### Test 4.2: Memory Usage

**Objective**: Ensure workflow doesn't exhaust memory

**Test Method**:
```bash
# Monitor n8n process during execution
top -p $(pgrep -f n8n)
```

**Validation**:
- [ ] Peak memory < 1GB
- [ ] No memory leaks (stable after execution)
- [ ] Garbage collection working

---

### Test 4.3: Concurrent Execution

**Objective**: Verify workflow handles overlapping executions

**Test Scenario**:
1. Trigger workflow manually
2. Trigger again before first completes

**Expected Behavior**:
- Second execution queues (does not run in parallel)
- OR both execute independently without conflicts

**Validation**:
- [ ] No data corruption
- [ ] Both executions complete successfully
- [ ] Separate reports generated

---

## Phase 5: Security Testing

### Test 5.1: Credential Security

**Objective**: Verify credentials not exposed

**Checks**:
- [ ] Client secret not in logs
- [ ] OAuth token not in error messages
- [ ] API keys not visible in workflow JSON export
- [ ] Passwords not in execution history
- [ ] PDF does not contain sensitive credentials

---

### Test 5.2: Access Control

**Objective**: Verify only authorized users can access

**Test Cases**:
- [ ] Workflow requires authentication to view
- [ ] Execution history restricted to authorized users
- [ ] API endpoints require valid credentials
- [ ] Email recipients match authorized list

---

### Test 5.3: Data Privacy (GDPR)

**Objective**: Ensure compliance with UK data protection

**Validation**:
- [ ] No personal employee data in report
- [ ] Store-level data aggregated appropriately
- [ ] Execution logs do not contain PII
- [ ] Archived PDFs have retention policy
- [ ] Data not shared outside authorized recipients

---

## Phase 6: User Acceptance Testing (UAT)

### Test 6.1: Business User Review

**Participants**: Matt, Chirag, Area Managers

**Test Steps**:
1. Present automated report for a known week
2. Compare to manual report for same week
3. Gather feedback

**Feedback Questions**:
1. Does the report structure match expectations?
2. Are all critical metrics included?
3. Is the narrative actionable and clear?
4. Are exceptions flagged correctly?
5. Is the format easy to read?
6. Any missing information?

**Acceptance Criteria**:
- [ ] 95% of metrics match manual report
- [ ] Business users approve report format
- [ ] No critical information missing
- [ ] Narrative provides actionable insights

---

### Test 6.2: Edge Case Handling

**Business Scenarios**:

**Scenario 1**: Bank Holiday Monday
- Expected: Workflow skips or runs Tuesday

**Scenario 2**: Power BI Maintenance
- Expected: Workflow retries or sends alert

**Scenario 3**: Area Manager Email Change
- Expected: Report sent to updated email

**Scenario 4**: Threshold Adjustment Needed
- Expected: Business user can update thresholds in workflow

---

## Test Result Template

### Test Execution Log

```markdown
## Test Execution Report
**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: Production / Test
**Workflow Version**: v1.0

### Phase 1: Unit Testing
| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | Cron Trigger | ✅ PASS | Schedule validated |
| 1.2 | Set Variables | ✅ PASS | All variables correct |
| 1.3 | OAuth Token | ✅ PASS | Token obtained in 3s |
| 1.4 | Token Validation | ✅ PASS | Valid/invalid handled |
| ... | ... | ... | ... |

### Phase 2: Integration Testing
| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 2.1 | Full Pipeline | ✅ PASS | Completed in 4m 23s |
| 2.2 | Error Recovery | ⚠️ PARTIAL | Email alert delayed |
| 2.3 | Data Validation | ✅ PASS | 97.8% accuracy |

### Phase 3: E2E Testing
| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 3.1 | Scheduled Exec | ✅ PASS | Ran at 9:00:03 AM |
| 3.2 | Multiple Weeks | ✅ PASS | 3 weeks tested |
| 3.3 | High Load | ✅ PASS | 92 stores processed |
| 3.4 | Low Data | ✅ PASS | Handled 5 missing stores |

### Phase 4: Performance
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Total Execution | < 5 min | 4m 23s | ✅ PASS |
| Memory Usage | < 1GB | 743 MB | ✅ PASS |
| PDF Generation | < 30s | 18s | ✅ PASS |

### Phase 5: Security
| Test | Status | Notes |
|------|--------|-------|
| Credential Security | ✅ PASS | No exposure found |
| Access Control | ✅ PASS | Auth required |
| GDPR Compliance | ✅ PASS | No PII in logs |

### Phase 6: UAT
| Stakeholder | Approval | Feedback |
|-------------|----------|----------|
| Matt | ✅ Approved | "Looks good, matches manual report" |
| Chirag | ✅ Approved | "Narrative is clear and actionable" |
| Area Manager 1 | ✅ Approved | "Very helpful, saves time" |

### Overall Assessment
- **Status**: ✅ READY FOR PRODUCTION
- **Critical Issues**: None
- **Minor Issues**: 1 (email alert delay - documented)
- **Recommendation**: Deploy to production

### Sign-off
- **Tested By**: [Name]
- **Reviewed By**: [Name]
- **Approved By**: [Name]
- **Date**: YYYY-MM-DD
```

---

## Troubleshooting Common Test Failures

### Issue: "OAuth token invalid"
**Cause**: Expired credentials or wrong tenant
**Fix**: Regenerate client secret in Azure AD

### Issue: "Power BI query timeout"
**Cause**: Dataset refresh in progress or complex query
**Fix**: Schedule workflow after dataset refresh completes

### Issue: "OpenAI rate limit"
**Cause**: Too many requests or insufficient quota
**Fix**: Upgrade OpenAI tier or add exponential backoff

### Issue: "PDF generation fails"
**Cause**: PDFKit library not installed
**Fix**: Run `npm install pdfkit` in n8n directory

### Issue: "Email not received"
**Cause**: SMTP authentication failure or spam filter
**Fix**: Verify SMTP credentials, check spam folder, whitelist sender

---

## Test Checklist Summary

Before production deployment, ensure:

- [ ] All Phase 1 unit tests pass
- [ ] Integration tests show correct data flow
- [ ] End-to-end test runs successfully on Monday 9 AM
- [ ] Performance benchmarks met (< 5 min, < 1GB memory)
- [ ] Security review completed
- [ ] UAT approval from business stakeholders
- [ ] Error handling tested and documented
- [ ] Backup and recovery procedures tested
- [ ] Monitoring alerts configured
- [ ] Documentation complete and reviewed

---

## Continuous Testing

After production deployment:

### Weekly Validation
- Review Monday execution logs
- Compare output to previous week
- Validate email delivery
- Check blob storage archive

### Monthly Audit
- Review all execution history
- Analyze performance trends
- Update test scenarios based on new business requirements
- Validate data accuracy with spot checks

### Quarterly Review
- Full regression testing
- Security audit
- Performance optimization
- Business user feedback session

---

## Next Steps

After successful testing:
1. Complete **DEPLOYMENT.md** for production rollout
2. Schedule training sessions with business users
3. Create runbook for support team
4. Set up monitoring dashboards
5. Plan go-live date and communication

## Support

For testing issues or questions:
- **Email**: it-support@cardsdirect.co.uk
- **n8n Testing Guide**: https://docs.n8n.io/workflows/executions/
- **Power BI API Testing**: https://learn.microsoft.com/en-us/rest/api/power-bi/
