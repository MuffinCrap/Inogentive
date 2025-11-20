#!/usr/bin/env node

/**
 * Weekly Report Automation - HTTP API Server
 * For N8N webhook integration and manual triggering
 */

import express from 'express';
import cors from 'cors';
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
    const { sendEmailFlag = false, useMock = false } = req.body;

    console.log('='.repeat(60));
    console.log('API Request: Generate Report');
    console.log('='.repeat(60));
    console.log(`Send Email: ${sendEmailFlag}`);
    console.log(`Use Mock Data: ${useMock || process.env.USE_MOCK_DATA === 'true'}`);
    console.log('');

    // Step 1: Extract Power BI Data
    console.log('[1/3] Extracting Power BI data...');
    const data = await extractPowerBIData(useMock);
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
  console.log(`  GET  /api/reports         - List all reports`);
  console.log(`  GET  /api/reports/:file   - Get specific report`);
  console.log(`  GET  /api/config          - Get configuration`);
  console.log('');
  console.log('N8N Webhook URL: POST http://localhost:' + PORT + '/api/generate-report');
  console.log('='.repeat(60));
});

export default app;
