// Weekly Report Automation - Main Application Logic

// =============================================================================
// CONFIGURATION - Update these when n8n is available
// =============================================================================

const CONFIG = {
    // Backend API URL - for n8n proxy and PDF generation
    BACKEND_API_URL: window.APP_CONFIG?.BACKEND_URL || 'http://localhost:3001',

    // n8n Webhook URL - proxied through backend to avoid CORS
    N8N_WEBHOOK_URL: window.APP_CONFIG?.N8N_WEBHOOK || 'http://localhost:3001/api/n8n-proxy',

    // API Authentication - Set via window.APP_CONFIG in production
    API_KEY: window.APP_CONFIG?.API_KEY || '',

    // Storage keys
    STORAGE_KEYS: {
        RECIPIENTS: 'wr_recipients',
        REPORTS: 'wr_reports'
    },

    // Validation limits
    MAX_EMAIL_LENGTH: 254,
    MAX_NAME_LENGTH: 100,
    MAX_ID_LENGTH: 50
};

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

const state = {
    recipients: [],
    reports: [],
    isProcessing: false,
    currentReport: null,
    selectedReports: [],  // For comparison feature
    pendingReport: null   // For preview before sending
};

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const elements = {
    syncAnalyzeBtn: document.getElementById('syncAnalyzeBtn'),
    statusIndicator: document.getElementById('statusIndicator'),
    statusText: document.getElementById('statusText'),
    progressSteps: document.getElementById('progressSteps'),
    recipientList: document.getElementById('recipientList'),
    newRecipientEmail: document.getElementById('newRecipientEmail'),
    newRecipientName: document.getElementById('newRecipientName'),
    addRecipientBtn: document.getElementById('addRecipientBtn'),
    reportList: document.getElementById('reportList'),
    reportCount: document.getElementById('reportCount'),
    reportModal: document.getElementById('reportModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    closeModal: document.getElementById('closeModal'),
    downloadReport: document.getElementById('downloadReport'),
    resendReport: document.getElementById('resendReport'),
    toastContainer: document.getElementById('toastContainer'),
    // Comparison elements
    compareBtn: document.getElementById('compareBtn'),
    comparisonModal: document.getElementById('comparisonModal'),
    comparisonBody: document.getElementById('comparisonBody'),
    closeComparisonModal: document.getElementById('closeComparisonModal'),
    // Preview elements
    previewModal: document.getElementById('previewModal'),
    previewBody: document.getElementById('previewBody'),
    closePreviewModal: document.getElementById('closePreviewModal'),
    cancelSend: document.getElementById('cancelSend'),
    regenerateReport: document.getElementById('regenerateReport'),
    confirmSend: document.getElementById('confirmSend')
};

// =============================================================================
// INITIALIZATION
// =============================================================================

function init() {
    loadState();
    renderRecipients();
    renderReports();
    attachEventListeners();
    initReportListEvents();
    initRecipientListEvents();
}

function loadState() {
    // Load recipients from localStorage with validation
    try {
        const savedRecipients = localStorage.getItem(CONFIG.STORAGE_KEYS.RECIPIENTS);
        if (savedRecipients) {
            const parsed = JSON.parse(savedRecipients, sanitizeJsonReviver);
            if (Array.isArray(parsed)) {
                state.recipients = parsed
                    .filter(r => r && typeof r === 'object' &&
                        typeof r.id === 'string' &&
                        typeof r.email === 'string' &&
                        isValidEmail(r.email))
                    .map(r => ({
                        id: sanitizeId(r.id),
                        name: sanitizeString(r.name || r.email.split('@')[0], CONFIG.MAX_NAME_LENGTH),
                        email: r.email.substring(0, CONFIG.MAX_EMAIL_LENGTH)
                    }));
            }
        }
    } catch (error) {
        console.error('Error loading recipients:', error);
        state.recipients = [];
    }

    // Set defaults if no valid recipients
    if (state.recipients.length === 0) {
        state.recipients = [
            { id: '1', name: 'John Smith', email: 'john.smith@company.com' },
            { id: '2', name: 'Sarah Johnson', email: 'sarah.j@company.com' }
        ];
        saveRecipients();
    }

    // Load reports from localStorage with validation
    try {
        const savedReports = localStorage.getItem(CONFIG.STORAGE_KEYS.REPORTS);
        if (savedReports) {
            const parsed = JSON.parse(savedReports, sanitizeJsonReviver);
            if (Array.isArray(parsed)) {
                state.reports = parsed
                    .filter(r => r && typeof r === 'object' &&
                        typeof r.id === 'string' &&
                        typeof r.date === 'string' &&
                        typeof r.content === 'string')
                    .map(r => ({
                        id: sanitizeId(r.id),
                        date: r.date,
                        status: sanitizeStatus(r.status),
                        recipients: Array.isArray(r.recipients) ? r.recipients.filter(e => typeof e === 'string') : [],
                        content: r.content
                    }));
            }
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        state.reports = [];
    }
}

// Prevent prototype pollution in JSON.parse
function sanitizeJsonReviver(key, value) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
    }
    return value;
}

// Sanitize ID to only allow safe characters
function sanitizeId(id) {
    if (typeof id !== 'string') return generateId();
    return id.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, CONFIG.MAX_ID_LENGTH);
}

// Sanitize general strings
function sanitizeString(str, maxLength) {
    if (typeof str !== 'string') return '';
    return str.substring(0, maxLength);
}

// Sanitize status to only allow valid values
function sanitizeStatus(status) {
    const validStatuses = ['draft', 'sent', 'failed'];
    return validStatuses.includes(status) ? status : 'draft';
}

function saveRecipients() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.RECIPIENTS, JSON.stringify(state.recipients));
}

function saveReports() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.REPORTS, JSON.stringify(state.reports));
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

function attachEventListeners() {
    // Sync & Analyze button
    elements.syncAnalyzeBtn.addEventListener('click', handleSyncAnalyze);

    // Add recipient
    elements.addRecipientBtn.addEventListener('click', handleAddRecipient);
    elements.newRecipientEmail.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddRecipient();
    });

    // Modal controls
    elements.closeModal.addEventListener('click', closeReportModal);
    elements.reportModal.addEventListener('click', (e) => {
        if (e.target === elements.reportModal) closeReportModal();
    });
    elements.downloadReport.addEventListener('click', handleDownloadReport);
    elements.resendReport.addEventListener('click', handleResendReport);

    // Comparison controls
    elements.compareBtn.addEventListener('click', handleCompareReports);
    elements.closeComparisonModal.addEventListener('click', closeComparisonModal);
    elements.comparisonModal.addEventListener('click', (e) => {
        if (e.target === elements.comparisonModal) closeComparisonModal();
    });

    // Preview controls
    elements.closePreviewModal.addEventListener('click', closePreviewModal);
    elements.previewModal.addEventListener('click', (e) => {
        if (e.target === elements.previewModal) closePreviewModal();
    });
    elements.cancelSend.addEventListener('click', closePreviewModal);
    elements.regenerateReport.addEventListener('click', handleRegenerate);
    elements.confirmSend.addEventListener('click', handleConfirmSend);

    // Global keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

function handleKeyboardShortcuts(e) {
    // Escape key - close any open modal
    if (e.key === 'Escape') {
        if (!elements.previewModal.classList.contains('hidden')) {
            closePreviewModal();
        } else if (!elements.reportModal.classList.contains('hidden')) {
            closeReportModal();
        } else if (!elements.comparisonModal.classList.contains('hidden')) {
            closeComparisonModal();
        }
        return;
    }

    // Ctrl/Cmd + Enter - confirm send in preview modal
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!elements.previewModal.classList.contains('hidden') && state.pendingReport) {
            e.preventDefault();
            handleConfirmSend();
        }
        return;
    }

    // Enter key in recipient email field - add recipient
    if (e.key === 'Enter' && document.activeElement === elements.newRecipientName) {
        e.preventDefault();
        handleAddRecipient();
    }
}

// =============================================================================
// SYNC & ANALYZE WORKFLOW
// =============================================================================

async function handleSyncAnalyze() {
    if (state.isProcessing) return;

    state.isProcessing = true;
    elements.syncAnalyzeBtn.disabled = true;
    elements.statusIndicator.classList.remove('hidden');
    elements.progressSteps.classList.remove('hidden');

    try {
        // Call n8n webhook via proxy
        await executeN8nWorkflow();
    } catch (error) {
        console.error('Workflow error:', error);
        showToast('Error generating report. Please try again.', 'error');

        state.isProcessing = false;
        elements.syncAnalyzeBtn.disabled = false;

        // Reset progress display after delay
        setTimeout(() => {
            elements.statusIndicator.classList.add('hidden');
            elements.progressSteps.classList.add('hidden');
            resetProgressSteps();
        }, 3000);
    }
}

async function executeN8nWorkflow() {
    // Step 1: Call n8n webhook to process data
    updateStatus('Calling n8n workflow...');
    setStepActive('connect');
    setStepCompleted('connect');

    const n8nResponse = await fetch(CONFIG.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: getSecureHeaders(),
        body: JSON.stringify({
            recipients: state.recipients,
            timestamp: new Date().toISOString()
        })
    });

    if (!n8nResponse.ok) {
        throw new Error(`n8n webhook error! status: ${n8nResponse.status}`);
    }

    setStepActive('extract');
    setStepCompleted('extract');
    setStepActive('analyze');
    setStepCompleted('analyze');
    setStepActive('generate');
    setStepCompleted('generate');

    const workflowResult = await n8nResponse.json();

    if (!workflowResult.success || !workflowResult.reportData) {
        throw new Error('n8n workflow did not return valid report data');
    }

    // Step 2: Generate PDF from report data using backend
    updateStatus('Generating PDF report...');

    const pdfResponse = await fetch(`${CONFIG.BACKEND_API_URL}/api/generate-pdf`, {
        method: 'POST',
        headers: getSecureHeaders(),
        body: JSON.stringify({
            reportData: workflowResult.reportData
        })
    });

    if (!pdfResponse.ok) {
        throw new Error(`PDF generation error! status: ${pdfResponse.status}`);
    }

    // Step 3: Convert PDF to blob and create download link
    const pdfBlob = await pdfResponse.blob();
    const pdfUrl = URL.createObjectURL(pdfBlob);

    setStepActive('distribute');
    setStepCompleted('distribute');
    updateStatus('Report generated successfully!');

    // Create report object for history
    const report = {
        id: generateId(),
        date: workflowResult.reportData.report_date,
        status: 'generated',
        pdfUrl: pdfUrl,
        reportData: workflowResult.reportData,
        summary: workflowResult.reportData.executive_summary
    };

    // Add to history
    state.reports.unshift(report);
    saveReports();
    renderReports();

    // Auto-download PDF and show preview
    downloadPDF(pdfUrl, `weekly-compliance-report-${new Date(report.date).toLocaleDateString('en-GB')}.pdf`);
    showReportPreview(report);

    // Reset processing state
    state.isProcessing = false;
    elements.syncAnalyzeBtn.disabled = false;

    // Hide progress UI after a short delay
    setTimeout(() => {
        elements.statusIndicator.classList.add('hidden');
        elements.progressSteps.classList.add('hidden');
        resetProgressSteps();
    }, 2000);

    return report;
}

// Generate secure headers for API calls
function getSecureHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };

    // Add API key if configured
    if (CONFIG.API_KEY) {
        headers['Authorization'] = `Bearer ${CONFIG.API_KEY}`;
    }

    // Add CSRF token if available (set by server in cookie or meta tag)
    const csrfToken = getCSRFToken();
    if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }

    return headers;
}

// Get CSRF token from meta tag or cookie
function getCSRFToken() {
    // Try meta tag first
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }

    // Try cookie
    const match = document.cookie.match(/csrf_token=([^;]+)/);
    return match ? match[1] : null;
}

// =============================================================================
// RECIPIENT MANAGEMENT
// =============================================================================

async function handleAddRecipient() {
    const email = elements.newRecipientEmail.value.trim();
    const name = elements.newRecipientName.value.trim() || email.split('@')[0];

    if (!email) {
        showToast('Please enter an email address', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    if (state.recipients.some(r => r.email === email)) {
        showToast('This email is already in the list', 'error');
        return;
    }

    // Brief loading state for feedback
    elements.addRecipientBtn.classList.add('btn-loading');
    elements.addRecipientBtn.disabled = true;
    await delay(300);

    const recipient = {
        id: generateId(),
        name: name,
        email: email
    };

    state.recipients.push(recipient);
    saveRecipients();
    renderRecipients();

    // Clear inputs
    elements.newRecipientEmail.value = '';
    elements.newRecipientName.value = '';

    // Reset button
    elements.addRecipientBtn.classList.remove('btn-loading');
    elements.addRecipientBtn.disabled = false;

    showToast(`Added ${name} to recipients`, 'success');

    // Focus back to email input for quick additions
    elements.newRecipientEmail.focus();
}

function removeRecipient(id) {
    const recipient = state.recipients.find(r => r.id === id);
    state.recipients = state.recipients.filter(r => r.id !== id);
    saveRecipients();
    renderRecipients();

    if (recipient) {
        showToast(`Removed ${recipient.name} from recipients`, 'info');
    }
}

function renderRecipients() {
    if (state.recipients.length === 0) {
        elements.recipientList.innerHTML = `
            <div class="empty-state" style="padding: 1rem;">
                <p>No recipients added yet.</p>
            </div>
        `;
        return;
    }

    // SECURITY: Use data attributes instead of inline onclick handlers
    elements.recipientList.innerHTML = state.recipients.map(recipient => `
        <div class="recipient-item">
            <div class="recipient-info">
                <span class="recipient-name">${escapeHtml(recipient.name)}</span>
                <span class="recipient-email">${escapeHtml(recipient.email)}</span>
            </div>
            <button class="remove-recipient" data-recipient-id="${escapeHtml(recipient.id)}" title="Remove">
                &times;
            </button>
        </div>
    `).join('');
}

// Event delegation for recipient list
function initRecipientListEvents() {
    elements.recipientList.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-recipient');
        if (!removeBtn) return;

        const recipientId = removeBtn.dataset.recipientId;
        if (!recipientId || !isValidId(recipientId)) return;

        removeRecipient(recipientId);
    });
}

// =============================================================================
// REPORT HISTORY
// =============================================================================

function renderReports() {
    elements.reportCount.textContent = `${state.reports.length} report${state.reports.length !== 1 ? 's' : ''}`;

    // Update compare button state
    elements.compareBtn.disabled = state.selectedReports.length !== 2;

    if (state.reports.length === 0) {
        elements.reportList.innerHTML = `
            <div class="empty-state">
                <p>No reports generated yet. Click "Sync & Analyze" to create your first report.</p>
            </div>
        `;
        return;
    }

    // SECURITY: Escape all dynamic values and use data attributes for IDs
    elements.reportList.innerHTML = state.reports.map(report => {
        const date = new Date(report.date);
        const isSelected = state.selectedReports.includes(report.id);
        const safeId = escapeHtml(report.id);
        const safeStatus = escapeHtml(report.status);
        return `
            <div class="report-item has-checkbox ${isSelected ? 'selected' : ''}" data-report-id="${safeId}">
                <input type="checkbox"
                       class="report-checkbox"
                       ${isSelected ? 'checked' : ''}
                       data-action="toggle-selection"
                       title="Select for comparison">
                <div class="report-meta">
                    <span class="report-date">${escapeHtml(date.toLocaleDateString())}</span>
                    <span class="report-time">${escapeHtml(date.toLocaleTimeString())}</span>
                </div>
                <span class="report-status ${safeStatus}">${safeStatus}</span>
            </div>
        `;
    }).join('');
}

// Event delegation for report list clicks
function initReportListEvents() {
    elements.reportList.addEventListener('click', (e) => {
        const reportItem = e.target.closest('.report-item');
        if (!reportItem) return;

        const reportId = reportItem.dataset.reportId;
        if (!reportId || !isValidId(reportId)) return;

        // Handle checkbox toggle
        if (e.target.matches('[data-action="toggle-selection"]')) {
            e.stopPropagation();
            toggleReportSelection(reportId);
            return;
        }

        // Handle report view
        viewReport(reportId);
    });
}

// Validate ID format
function isValidId(id) {
    return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= CONFIG.MAX_ID_LENGTH;
}

function toggleReportSelection(id) {
    const index = state.selectedReports.indexOf(id);
    if (index === -1) {
        // Can only select up to 2 reports for comparison
        if (state.selectedReports.length >= 2) {
            state.selectedReports.shift(); // Remove oldest selection
        }
        state.selectedReports.push(id);
    } else {
        state.selectedReports.splice(index, 1);
    }
    renderReports();
}

function viewReport(id) {
    const report = state.reports.find(r => r.id === id);
    if (!report) return;

    state.currentReport = report;

    const date = new Date(report.date);
    elements.modalTitle.textContent = `Report - ${date.toLocaleDateString()}`;
    elements.modalBody.innerHTML = `<div class="report-content">${markdownToHtml(report.content)}</div>`;
    elements.reportModal.classList.remove('hidden');
}

function closeReportModal() {
    elements.reportModal.classList.add('hidden');
    state.currentReport = null;
}

function handleDownloadReport() {
    if (!state.currentReport) return;

    const blob = new Blob([state.currentReport.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const date = new Date(state.currentReport.date);
    a.href = url;
    a.download = `weekly-report-${date.toISOString().split('T')[0]}.md`;
    a.click();

    URL.revokeObjectURL(url);
    showToast('Report downloaded', 'success');
}

async function handleResendReport() {
    if (!state.currentReport) return;

    // For n8n POC, resend would need to re-trigger the workflow
    // For now, show info message
    showToast('To resend, please generate a new report with "Sync & Analyze"', 'info');
}

// =============================================================================
// PREVIEW MODE
// =============================================================================

function showPreviewModal(report) {
    const recipientEmails = state.recipients.map(r => r.email).join(', ');

    elements.previewBody.innerHTML = `
        <div class="preview-recipients">
            <strong>Recipients:</strong> ${escapeHtml(recipientEmails) || 'No recipients configured'}
        </div>
        <div class="report-content">${markdownToHtml(report.content)}</div>
    `;

    elements.previewModal.classList.remove('hidden');
}

function closePreviewModal() {
    elements.previewModal.classList.add('hidden');
    state.pendingReport = null;

    // Reset processing state
    state.isProcessing = false;
    elements.syncAnalyzeBtn.disabled = false;

    setTimeout(() => {
        elements.statusIndicator.classList.add('hidden');
        elements.progressSteps.classList.add('hidden');
        resetProgressSteps();
    }, 500);
}

async function handleConfirmSend() {
    if (!state.pendingReport) return;

    // Add loading state to button
    elements.confirmSend.classList.add('btn-loading');
    elements.confirmSend.disabled = true;

    // Close preview modal
    elements.previewModal.classList.add('hidden');

    // Complete the distribution step
    updateStatus('Sending to recipients...');
    setStepActive('distribute');
    await delay(1500);
    setStepCompleted('distribute');
    updateStatus('Complete!');

    // Save report as sent
    state.pendingReport.status = 'sent';
    state.reports.unshift(state.pendingReport);
    saveReports();
    renderReports();

    state.pendingReport = null;
    showToast('Report generated and sent successfully!', 'success');

    // Reset button state
    elements.confirmSend.classList.remove('btn-loading');
    elements.confirmSend.disabled = false;

    // Reset processing state
    state.isProcessing = false;
    elements.syncAnalyzeBtn.disabled = false;

    setTimeout(() => {
        elements.statusIndicator.classList.add('hidden');
        elements.progressSteps.classList.add('hidden');
        resetProgressSteps();
    }, 3000);
}

async function handleRegenerate() {
    if (!state.pendingReport) return;

    // Close preview modal
    elements.previewModal.classList.add('hidden');

    // Add spinning animation to button
    elements.regenerateReport.classList.add('regenerating');

    // Reset progress steps
    resetProgressSteps();

    // Re-run the generation workflow
    const steps = ['connect', 'extract', 'analyze', 'generate', 'distribute'];

    try {
        await simulateWorkflow(steps, true);
    } catch (error) {
        console.error('Regenerate error:', error);
        showToast('Error regenerating report', 'error');
    } finally {
        elements.regenerateReport.classList.remove('regenerating');
    }
}

// =============================================================================
// REPORT COMPARISON
// =============================================================================

function handleCompareReports() {
    if (state.selectedReports.length !== 2) {
        showToast('Please select exactly 2 reports to compare', 'error');
        return;
    }

    const report1 = state.reports.find(r => r.id === state.selectedReports[0]);
    const report2 = state.reports.find(r => r.id === state.selectedReports[1]);

    if (!report1 || !report2) return;

    // Sort by date (older first)
    const [older, newer] = new Date(report1.date) < new Date(report2.date)
        ? [report1, report2]
        : [report2, report1];

    elements.comparisonBody.innerHTML = generateComparisonContent(older, newer);
    elements.comparisonModal.classList.remove('hidden');
}

function closeComparisonModal() {
    elements.comparisonModal.classList.add('hidden');
}

function generateComparisonContent(older, newer) {
    const olderDate = new Date(older.date);
    const newerDate = new Date(newer.date);

    // Check if reports have the new n8n structure or old content structure
    const isN8nReport = (report) => report.reportData && report.reportData.all_stores;

    // Extract metrics for delta calculation
    const olderMetrics = isN8nReport(older) ? extractComplianceMetrics(older) : extractMetrics(older.content || '');
    const newerMetrics = isN8nReport(newer) ? extractComplianceMetrics(newer) : extractMetrics(newer.content || '');

    // Generate delta summary
    let deltaHtml = '';
    if (Object.keys(olderMetrics).length > 0 && Object.keys(newerMetrics).length > 0) {
        deltaHtml = `
            <div class="delta-summary">
                <h4>Key Changes</h4>
                ${isN8nReport(older) && isN8nReport(newer) ? generateComplianceDeltaItems(olderMetrics, newerMetrics) : generateDeltaItems(olderMetrics, newerMetrics)}
            </div>
        `;
    }

    // Generate content display based on report type
    const olderContent = isN8nReport(older)
        ? formatExecutiveSummary(older.summary)
        : markdownToHtml(older.content || '');
    const newerContent = isN8nReport(newer)
        ? formatExecutiveSummary(newer.summary)
        : markdownToHtml(newer.content || '');

    return `
        ${deltaHtml}
        <div class="comparison-column">
            <h4>Older: ${olderDate.toLocaleDateString()} ${olderDate.toLocaleTimeString()}</h4>
            <div class="report-content">${olderContent}</div>
        </div>
        <div class="comparison-column">
            <h4>Newer: ${newerDate.toLocaleDateString()} ${newerDate.toLocaleTimeString()}</h4>
            <div class="report-content">${newerContent}</div>
        </div>
    `;
}

function extractComplianceMetrics(report) {
    const metrics = {};

    if (report.reportData && report.reportData.all_stores) {
        const stores = report.reportData.all_stores;
        metrics.totalStores = stores.length;
        metrics.redFlags = stores.filter(s => s.overall_status === 'RED').length;
        metrics.yellowFlags = stores.filter(s => s.overall_status === 'YELLOW').length;
        metrics.greenFlags = stores.filter(s => s.overall_status === 'GREEN').length;
    }

    return metrics;
}

function generateComplianceDeltaItems(older, newer) {
    const items = [];

    if (older.totalStores && newer.totalStores) {
        const change = newer.totalStores - older.totalStores;
        items.push(`
            <div class="delta-item">
                <span>Total Stores</span>
                <span class="delta-neutral">${older.totalStores} → ${newer.totalStores} ${change !== 0 ? `(${change > 0 ? '+' : ''}${change})` : ''}</span>
            </div>
        `);
    }

    if (older.redFlags !== undefined && newer.redFlags !== undefined) {
        const change = newer.redFlags - older.redFlags;
        const className = change < 0 ? 'delta-positive' : change > 0 ? 'delta-negative' : 'delta-neutral';
        items.push(`
            <div class="delta-item">
                <span>RED Flags</span>
                <span class="${className}">${older.redFlags} → ${newer.redFlags} ${change !== 0 ? `(${change > 0 ? '+' : ''}${change})` : ''}</span>
            </div>
        `);
    }

    if (older.yellowFlags !== undefined && newer.yellowFlags !== undefined) {
        const change = newer.yellowFlags - older.yellowFlags;
        const className = change < 0 ? 'delta-positive' : change > 0 ? 'delta-negative' : 'delta-neutral';
        items.push(`
            <div class="delta-item">
                <span>YELLOW Warnings</span>
                <span class="${className}">${older.yellowFlags} → ${newer.yellowFlags} ${change !== 0 ? `(${change > 0 ? '+' : ''}${change})` : ''}</span>
            </div>
        `);
    }

    if (older.greenFlags !== undefined && newer.greenFlags !== undefined) {
        const change = newer.greenFlags - older.greenFlags;
        const className = change > 0 ? 'delta-positive' : change < 0 ? 'delta-negative' : 'delta-neutral';
        items.push(`
            <div class="delta-item">
                <span>GREEN Compliant</span>
                <span class="${className}">${older.greenFlags} → ${newer.greenFlags} ${change !== 0 ? `(${change > 0 ? '+' : ''}${change})` : ''}</span>
            </div>
        `);
    }

    return items.length > 0 ? items.join('') : '<p>No comparable metrics found</p>';
}

function extractMetrics(content) {
    const metrics = {};

    if (!content) return metrics;

    // Extract key metrics from the report content
    const revenueMatch = content.match(/Total Revenue:\*?\*?\s*£?([\d.]+)M/i);
    if (revenueMatch) metrics.revenue = parseFloat(revenueMatch[1]);

    const conversionMatch = content.match(/Conversion Rate:\*?\*?\s*([\d.]+)%/i);
    if (conversionMatch) metrics.conversion = parseFloat(conversionMatch[1]);

    const atvMatch = content.match(/Average Transaction Value:\*?\*?\s*£?([\d.]+)/i);
    if (atvMatch) metrics.atv = parseFloat(atvMatch[1]);

    const trafficMatch = content.match(/Store Traffic:\*?\*?\s*([\d,]+)/i);
    if (trafficMatch) metrics.traffic = parseInt(trafficMatch[1].replace(/,/g, ''));

    return metrics;
}

function generateDeltaItems(older, newer) {
    const items = [];

    if (older.revenue && newer.revenue) {
        const change = ((newer.revenue - older.revenue) / older.revenue * 100).toFixed(1);
        const className = change > 0 ? 'delta-positive' : change < 0 ? 'delta-negative' : 'delta-neutral';
        items.push(`
            <div class="delta-item">
                <span>Revenue</span>
                <span class="${className}">${change > 0 ? '+' : ''}${change}%</span>
            </div>
        `);
    }

    if (older.conversion && newer.conversion) {
        const change = (newer.conversion - older.conversion).toFixed(1);
        const className = change > 0 ? 'delta-positive' : change < 0 ? 'delta-negative' : 'delta-neutral';
        items.push(`
            <div class="delta-item">
                <span>Conversion Rate</span>
                <span class="${className}">${change > 0 ? '+' : ''}${change}pp</span>
            </div>
        `);
    }

    if (older.atv && newer.atv) {
        const change = ((newer.atv - older.atv) / older.atv * 100).toFixed(1);
        const className = change > 0 ? 'delta-positive' : change < 0 ? 'delta-negative' : 'delta-neutral';
        items.push(`
            <div class="delta-item">
                <span>Avg Transaction Value</span>
                <span class="${className}">${change > 0 ? '+' : ''}${change}%</span>
            </div>
        `);
    }

    if (older.traffic && newer.traffic) {
        const change = ((newer.traffic - older.traffic) / older.traffic * 100).toFixed(1);
        const className = change > 0 ? 'delta-positive' : change < 0 ? 'delta-negative' : 'delta-neutral';
        items.push(`
            <div class="delta-item">
                <span>Store Traffic</span>
                <span class="${className}">${change > 0 ? '+' : ''}${change}%</span>
            </div>
        `);
    }

    return items.length > 0 ? items.join('') : '<p>No comparable metrics found</p>';
}

// =============================================================================
// UI HELPERS
// =============================================================================

function updateStatus(message) {
    elements.statusText.textContent = message;
}

function setStepActive(stepName) {
    const step = document.querySelector(`[data-step="${stepName}"]`);
    if (step) {
        step.classList.add('active');
        step.querySelector('.step-icon').innerHTML = '&#9679;';
    }
}

function setStepCompleted(stepName) {
    const step = document.querySelector(`[data-step="${stepName}"]`);
    if (step) {
        step.classList.remove('active');
        step.classList.add('completed');
        step.querySelector('.step-icon').innerHTML = '&#10003;';
    }
}

function resetProgressSteps() {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active', 'completed');
        step.querySelector('.step-icon').innerHTML = '&#9675;';
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    elements.toastContainer.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// =============================================================================
// PDF HANDLING
// =============================================================================

function downloadPDF(pdfUrl, filename) {
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = filename;
    a.click();
    showToast('PDF report downloaded', 'success');
}

function formatExecutiveSummary(summary) {
    if (!summary) return '<p>No summary available</p>';

    // Escape HTML to prevent XSS
    const escaped = escapeHtml(summary);

    // Split into sections by double line breaks
    const sections = escaped.split('\n\n');

    let formattedHtml = '';

    sections.forEach(section => {
        const trimmed = section.trim();
        if (!trimmed) return;

        // Check if this is a heading (starts with **Text:** pattern)
        if (trimmed.match(/^\*\*[^*]+:\*\*/)) {
            // Extract heading text
            const headingMatch = trimmed.match(/^\*\*([^*]+):\*\*/);
            if (headingMatch) {
                const headingText = headingMatch[1];
                const content = trimmed.substring(headingMatch[0].length).trim();

                formattedHtml += `<div class="summary-section">`;
                formattedHtml += `<h5 class="summary-heading">${headingText}</h5>`;

                if (content) {
                    // Split content into lines for numbered lists
                    const lines = content.split('\n');
                    if (lines.some(line => line.match(/^\d+\./))) {
                        formattedHtml += '<ol class="summary-list">';
                        lines.forEach(line => {
                            const listMatch = line.match(/^\d+\.\s*(.+)/);
                            if (listMatch) {
                                formattedHtml += `<li>${listMatch[1]}</li>`;
                            }
                        });
                        formattedHtml += '</ol>';
                    } else {
                        formattedHtml += `<p class="summary-paragraph">${content}</p>`;
                    }
                }
                formattedHtml += `</div>`;
            }
        } else {
            // Regular paragraph
            formattedHtml += `<p class="summary-paragraph">${trimmed.replace(/\n/g, '<br>')}</p>`;
        }
    });

    return formattedHtml;
}

function showReportPreview(report) {
    // Show report preview modal with executive summary
    state.currentReport = report;
    elements.modalTitle.textContent = `Compliance Report - ${new Date(report.date).toLocaleDateString('en-GB')}`;

    // Format the executive summary
    const formattedSummary = formatExecutiveSummary(report.summary);

    // Display executive summary and action buttons
    elements.modalBody.innerHTML = `
        <div class="report-preview-content">
            <div class="preview-section">
                <div class="summary-content">
                    ${formattedSummary}
                </div>
            </div>

            <div class="preview-section">
                <h4>Report Statistics</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Total Stores:</span>
                        <span class="stat-value">${report.reportData.all_stores?.length || 'N/A'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">RED Flags:</span>
                        <span class="stat-value red">${report.reportData.all_stores?.filter(s => s.overall_status === 'RED').length || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">YELLOW Warnings:</span>
                        <span class="stat-value yellow">${report.reportData.all_stores?.filter(s => s.overall_status === 'YELLOW').length || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">GREEN Compliant:</span>
                        <span class="stat-value green">${report.reportData.all_stores?.filter(s => s.overall_status === 'GREEN').length || 0}</span>
                    </div>
                </div>
            </div>

            <div class="preview-actions">
                <p><strong>PDF Generated:</strong> The full compliance report is ready for download.</p>
                <button onclick="window.location.reload()" class="secondary-btn">Generate Another Report</button>
            </div>
        </div>
    `;

    elements.reportModal.classList.remove('hidden');
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidEmail(email) {
    // SECURITY: More robust email validation with length check
    if (!email || typeof email !== 'string' || email.length > CONFIG.MAX_EMAIL_LENGTH) {
        return false;
    }
    // RFC 5322 compliant regex (simplified but more robust)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function markdownToHtml(markdown) {
    // SECURITY: Escape HTML entities BEFORE markdown conversion to prevent XSS
    const escaped = escapeHtml(markdown);

    // Simple markdown to HTML conversion on escaped content
    return escaped
        // Headers (using escaped content, so &lt; becomes safe)
        .replace(/^### (.*$)/gm, '<h4>$1</h4>')
        .replace(/^## (.*$)/gm, '<h3>$1</h3>')
        .replace(/^# (.*$)/gm, '<h2>$1</h2>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Lists
        .replace(/^\- (.*$)/gm, '<li>$1</li>')
        .replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>')
        // Tables (basic)
        .replace(/\|(.+)\|/g, (match) => {
            const cells = match.split('|').filter(c => c.trim());
            if (cells.every(c => /^[\s-]+$/.test(c))) return '';
            return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
        })
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        // Horizontal rules
        .replace(/^---$/gm, '<hr>')
        // Wrap in paragraph
        .replace(/^(.+)$/gm, (match) => {
            if (match.startsWith('<')) return match;
            return match;
        });
}

// Note: Using event delegation instead of inline onclick handlers for security
// No need for window.* exports - all click handling done via event delegation

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
