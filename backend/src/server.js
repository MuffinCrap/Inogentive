#!/usr/bin/env node

/**
 * Weekly Report Automation - HTTP API Server
 * For N8N webhook integration and manual triggering
 */

import express from 'express';
import cors from 'cors';
import PDFDocument from 'pdfkit';
import { extractPowerBIData } from './powerbi.js';
import { generateAnalysis } from './analysis.js';
import { sendEmail, buildEmailHtml } from './email.js';
import { writeFile, mkdir, readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Weekly Report Automation API'
  });
});

// Generate report endpoint (for N8N webhook)
app.post('/api/generate-report', async (req, res) => {
  const startTime = Date.now();

  try {
    const { sendEmailFlag = false } = req.body;

    console.log('='.repeat(60));
    console.log('API Request: Generate Report');
    console.log('='.repeat(60));
    console.log(`Send Email: ${sendEmailFlag}`);
    console.log('');

    // Step 1: Extract Power BI Data
    console.log('[1/3] Extracting Power BI data...');
    const data = await extractPowerBIData();
    console.log('Data extraction complete');

    // Step 2: Generate AI Analysis
    console.log('[2/3] Generating AI analysis...');
    const analysis = await generateAnalysis(data);
    console.log('Analysis complete');

    // Step 3: Save report locally
    console.log('[3/3] Saving report...');
    const reportsDir = join(__dirname, '..', 'reports');
    await mkdir(reportsDir, { recursive: true });

    const filename = `weekly-report-${data.reportDate}.html`;
    const filepath = join(reportsDir, filename);
    const html = buildEmailHtml(data, analysis);

    await writeFile(filepath, html, 'utf8');

    // Save raw data
    const dataFilename = `weekly-report-${data.reportDate}-data.json`;
    const dataFilepath = join(reportsDir, dataFilename);
    await writeFile(dataFilepath, JSON.stringify({ data, analysis }, null, 2), 'utf8');

    // Step 4: Send email if requested
    let emailResult = null;
    if (sendEmailFlag) {
      console.log('Sending email...');
      emailResult = await sendEmail(data, analysis);
      console.log(`Email sent to: ${emailResult.recipient}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    const response = {
      success: true,
      message: 'Report generated successfully',
      duration: `${duration}s`,
      reportFile: filename,
      dataFile: dataFilename,
      metrics: {
        ytdRevenue: data.ytdRevenue,
        orders: data.orders,
        customers: data.customers,
        returnRate: data.returnRate,
        revenueChange: `${data.revenueChange}%`,
        orderChange: `${data.orderChange}%`
      },
      email: emailResult ? {
        sent: true,
        recipient: emailResult.recipient,
        subject: emailResult.subject
      } : {
        sent: false
      },
      timestamp: new Date().toISOString()
    };

    console.log('');
    console.log('='.repeat(60));
    console.log(`Completed successfully in ${duration}s`);
    console.log('='.repeat(60));

    res.json(response);

  } catch (error) {
    console.error('Error generating report:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Generate PDF from n8n workflow data
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { reportData } = req.body;

    if (!reportData) {
      return res.status(400).json({ error: 'Missing reportData in request body' });
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Weekly Compliance Report - ${reportData.report_date}`,
        Author: 'Cards Direct - Automated System',
        Subject: 'Weekly Compliance Report'
      }
    });

    // Set response headers for PDF download
    const filename = `weekly-compliance-report-${reportData.report_date?.split('T')[0] || 'latest'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Generate PDF content
    generatePDFContent(doc, reportData);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'PDF generation failed', message: error.message });
    }
  }
});

// List reports endpoint
app.get('/api/reports', async (req, res) => {
  try {
    const reportsDir = join(__dirname, '..', 'reports');

    try {
      const files = await readdir(reportsDir);
      const htmlReports = files
        .filter(f => f.endsWith('.html'))
        .sort()
        .reverse();

      res.json({
        success: true,
        reports: htmlReports,
        count: htmlReports.length
      });
    } catch (err) {
      // Directory doesn't exist yet
      res.json({
        success: true,
        reports: [],
        count: 0
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific report
app.get('/api/reports/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const reportsDir = join(__dirname, '..', 'reports');
    const filepath = join(reportsDir, filename);

    // Security: ensure filename doesn't traverse directories
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }

    const content = await readFile(filepath, 'utf8');

    if (filename.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
      res.send(content);
    } else if (filename.endsWith('.json')) {
      res.json(JSON.parse(content));
    } else {
      res.send(content);
    }
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Report not found'
    });
  }
});

// Get configuration (non-sensitive)
app.get('/api/config', (req, res) => {
  res.json({
    emailRecipient: config.email.recipient,
    useMockData: process.env.USE_MOCK_DATA === 'true'
  });
});

/**
 * Generate PDF content from n8n workflow report data
 */
function generatePDFContent(doc, data) {
  const { executive_summary, areas, all_stores, report_date } = data;
  const fmt = (val, decimals = 1) => (val != null ? Number(val).toFixed(decimals) : 'N/A');

  let currentPage = 1;
  const totalPages = estimateTotalPages(data);

  // Helper: Add header to page
  function addHeader() {
    const y = doc.y;
    doc.fontSize(8).fillColor('#666666').font('Helvetica');
    doc.text('Cards Direct - Weekly Compliance Report', 50, 30, { align: 'left' });
    doc.text(`Week of ${new Date(report_date).toLocaleDateString('en-GB')}`, 50, 30, { align: 'right' });
    doc.moveTo(50, 45).lineTo(545, 45).strokeColor('#CCCCCC').stroke();
    doc.y = y > 60 ? y : 60;
  }

  // Helper: Add footer with page number
  function addFooter() {
    doc.fontSize(8).fillColor('#999999').font('Helvetica');
    doc.text(
      `Page ${currentPage} of ${totalPages}`,
      50,
      doc.page.height - 40,
      { align: 'center', width: doc.page.width - 100 }
    );
    doc.text(
      'Generated automatically by Weekly Report Automation System',
      50,
      doc.page.height - 30,
      { align: 'center', width: doc.page.width - 100 }
    );
    currentPage++;
  }

  // Helper: Add new page with header
  function addPageWithHeader() {
    doc.addPage();
    addHeader();
    doc.moveDown(1);
  }

  // Helper: Draw table row with background color
  function drawTableRow(columns, y, options = {}) {
    const {
      isHeader = false,
      bgColor = null,
      textColor = '#000000',
      fontSize = 9,
      font = 'Helvetica'
    } = options;

    const colWidths = [200, 80, 80, 80, 80]; // Store name, Budget, Worked, Variance, Status
    const rowHeight = 20;
    const startX = 50;

    // Draw background
    if (bgColor) {
      doc.rect(startX, y - 2, 495, rowHeight).fillColor(bgColor).fill();
    }

    // Draw cell borders
    doc.strokeColor('#DDDDDD');
    let x = startX;
    colWidths.forEach(width => {
      doc.rect(x, y - 2, width, rowHeight).stroke();
      x += width;
    });

    // Draw text
    doc.fillColor(textColor).fontSize(fontSize).font(isHeader ? 'Helvetica-Bold' : font);
    x = startX;
    columns.forEach((text, i) => {
      doc.text(
        text,
        x + 5,
        y + 3,
        { width: colWidths[i] - 10, align: i === 0 ? 'left' : 'center' }
      );
      x += colWidths[i];
    });

    return y + rowHeight;
  }

  // Helper: Check if we need a new page
  function checkPageBreak(requiredSpace = 100) {
    if (doc.y > doc.page.height - requiredSpace) {
      addFooter();
      addPageWithHeader();
    }
  }

  // === PAGE 1: TITLE PAGE ===
  doc.y = 200;
  doc.fontSize(32).font('Helvetica-Bold').fillColor('#003366').text('CARDS DIRECT', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(24).fillColor('#000000').text('Weekly Compliance Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica').text(`Week of ${new Date(report_date).toLocaleDateString('en-GB')}`, { align: 'center' });
  doc.moveDown(2);

  // Overall Metrics Box
  const redCount = all_stores.filter(s => s.overall_status === 'RED').length;
  const yellowCount = all_stores.filter(s => s.overall_status === 'YELLOW').length;
  const greenCount = all_stores.filter(s => s.overall_status === 'GREEN').length;

  doc.rect(150, doc.y, 295, 120).fillColor('#F5F5F5').fill().strokeColor('#CCCCCC').stroke();
  doc.y += 15;
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text('Overall Status', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(12).font('Helvetica');
  doc.text(`Total Stores: ${all_stores.length}`, { align: 'center' });
  doc.moveDown(0.3);

  doc.fillColor('#28A745').text(`✓ Compliant (GREEN): ${greenCount} (${((greenCount / all_stores.length) * 100).toFixed(1)}%)`, { align: 'center' });
  doc.moveDown(0.3);
  doc.fillColor('#FFC107').text(`⚠ Warnings (YELLOW): ${yellowCount} (${((yellowCount / all_stores.length) * 100).toFixed(1)}%)`, { align: 'center' });
  doc.moveDown(0.3);
  doc.fillColor('#DC3545').text(`✗ Critical (RED): ${redCount} (${((redCount / all_stores.length) * 100).toFixed(1)}%)`, { align: 'center' });

  doc.fillColor('#000000');
  addFooter();

  // === PAGE 2: EXECUTIVE SUMMARY ===
  addPageWithHeader();
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#003366').text('Executive Summary');
  doc.moveDown(1);
  doc.fontSize(10).font('Helvetica').fillColor('#000000');

  // Format executive summary with proper line breaks
  const summaryLines = (executive_summary || 'No summary available').split('\n');
  summaryLines.forEach(line => {
    if (line.trim()) {
      doc.text(line, { align: 'justify' });
      doc.moveDown(0.5);
    }
  });

  addFooter();

  // === PAGES 3+: AREA DETAILS ===
  areas.forEach((area, areaIndex) => {
    addPageWithHeader();

    // Area Header
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#003366');
    doc.text(`Area ${area.area_id || areaIndex + 1}: ${area.area || 'Unknown Area'}`);
    doc.moveDown(0.5);

    // Area Summary Box
    doc.rect(50, doc.y, 495, 80).fillColor('#F8F9FA').fill().strokeColor('#CCCCCC').stroke();
    doc.y += 10;
    doc.fontSize(10).font('Helvetica').fillColor('#000000');
    doc.text(`  Stores in Area: ${area.stores.length}`, 60, doc.y);
    doc.moveDown(0.5);
    doc.text(`  Total Payroll Variance: ${fmt(area.area_payroll_variance)} hours (${fmt(area.area_payroll_variance_pct)}%)`, 60);
    doc.moveDown(0.5);
    doc.text(`  Average Manual Clock-ins: ${fmt(area.area_manual_clock_pct)}%`, 60);
    doc.moveDown(0.5);
    doc.text(`  Status Distribution: `, 60);
    doc.fillColor('#DC3545').text(`${area.red_flags || 0} RED`, 200, doc.y);
    doc.fillColor('#FFC107').text(`${area.yellow_flags || 0} YELLOW`, 280, doc.y);
    doc.fillColor('#28A745').text(`${area.green_flags || 0} GREEN`, 390, doc.y);
    doc.fillColor('#000000');
    doc.y += 25;

    // Store Table
    doc.moveDown(1);
    checkPageBreak(150);

    doc.fontSize(12).font('Helvetica-Bold').text('Store Performance Details');
    doc.moveDown(0.5);

    // Table header
    let tableY = doc.y;
    tableY = drawTableRow(
      ['Store Name', 'Budget (hrs)', 'Worked (hrs)', 'Variance %', 'Status'],
      tableY,
      { isHeader: true, bgColor: '#003366', textColor: '#FFFFFF', fontSize: 9 }
    );

    // Sort stores: RED first, then YELLOW, then GREEN
    const sortedStores = [...area.stores].sort((a, b) => {
      const statusOrder = { RED: 0, YELLOW: 1, GREEN: 2 };
      return statusOrder[a.overall_status] - statusOrder[b.overall_status];
    });

    // Table rows
    sortedStores.forEach((store, idx) => {
      checkPageBreak(80);

      let bgColor = null;
      let textColor = '#000000';
      let statusSymbol = '✓';

      if (store.overall_status === 'RED') {
        bgColor = '#FFE5E5';
        statusSymbol = '✗';
      } else if (store.overall_status === 'YELLOW') {
        bgColor = '#FFF9E5';
        statusSymbol = '⚠';
      } else if (idx % 2 === 0) {
        bgColor = '#F9F9F9';
      }

      const variance = store.payroll_variance_pct != null ? `${fmt(store.payroll_variance_pct)}%` : 'N/A';

      tableY = drawTableRow(
        [
          store.store_name || 'Unknown',
          fmt(store.budget_hours),
          fmt(store.worked_hours),
          variance,
          `${statusSymbol} ${store.overall_status}`
        ],
        doc.y,
        { bgColor, textColor, fontSize: 8, font: 'Helvetica' }
      );

      doc.y = tableY;
    });

    addFooter();
  });

  // === FINAL PAGE: ACTION ITEMS ===
  addPageWithHeader();
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#003366').text('Action Items & Priorities');
  doc.moveDown(1);

  // Critical Issues
  const redStores = all_stores.filter(s => s.overall_status === 'RED');
  if (redStores.length > 0) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#DC3545').text(`✗ Critical Issues (${redStores.length} stores)`);
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').fillColor('#000000');

    redStores.slice(0, 10).forEach((store, i) => {
      doc.text(`${i + 1}. ${store.store_name}: ${fmt(store.payroll_variance_pct)}% over budget, ${fmt(store.manual_clock_pct)}% manual clocks`);
      doc.moveDown(0.3);
    });

    if (redStores.length > 10) {
      doc.text(`... and ${redStores.length - 10} more stores`);
    }
    doc.moveDown(1);
  }

  // Warnings
  const yellowStores = all_stores.filter(s => s.overall_status === 'YELLOW');
  if (yellowStores.length > 0) {
    checkPageBreak(150);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#FFC107').text(`⚠ Warnings (${yellowStores.length} stores)`);
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').fillColor('#000000');

    yellowStores.slice(0, 10).forEach((store, i) => {
      doc.text(`${i + 1}. ${store.store_name}: ${fmt(store.payroll_variance_pct)}% variance, ${fmt(store.manual_clock_pct)}% manual clocks`);
      doc.moveDown(0.3);
    });

    if (yellowStores.length > 10) {
      doc.text(`... and ${yellowStores.length - 10} more stores`);
    }
  }

  addFooter();
}

// Helper function to estimate total pages
function estimateTotalPages(data) {
  const { areas, all_stores } = data;
  // Title + Summary + Areas (1 per area) + Action Items
  return 2 + (areas?.length || 0) + 1;
}

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('Weekly Report Automation API Server');
  console.log('='.repeat(60));
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  /api/health          - Health check`);
  console.log(`  POST /api/generate-report - Generate report (N8N webhook)`);
  console.log(`  POST /api/generate-pdf    - Generate PDF from workflow data`);
  console.log(`  GET  /api/reports         - List all reports`);
  console.log(`  GET  /api/reports/:file   - Get specific report`);
  console.log(`  GET  /api/config          - Get configuration`);
  console.log('');
  console.log('N8N Webhook URL: POST http://localhost:' + PORT + '/api/generate-report');
  console.log('='.repeat(60));
});

export default app;
