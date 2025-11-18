#!/usr/bin/env node

/**
 * Weekly Report Automation - Main Orchestration
 * AC-4: Main Orchestration
 *
 * Usage: node src/index.js [options]
 *
 * Options:
 *   --dry-run    Extract data and generate analysis without sending email
 *   --help       Show this help message
 */

import { extractPowerBIData } from './powerbi.js';
import { generateAnalysis } from './analysis.js';
import { sendEmail, buildEmailHtml } from './email.js';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const showHelp = args.includes('--help');

if (showHelp) {
  console.log(`
Weekly Report Automation

Usage: node src/index.js [options]

Options:
  --dry-run    Extract data and generate analysis without sending email
  --help       Show this help message

Description:
  Automates the weekly report generation process:
  1. Extracts KPI data from Power BI
  2. Generates AI analysis using GPT-4o
  3. Sends formatted HTML email via Microsoft Graph
`);
  process.exit(0);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Weekly Report Automation - Starting');
  console.log('='.repeat(60));
  console.log('');

  const startTime = Date.now();

  try {
    // Step 1: Extract Power BI Data
    console.log('[1/3] Extracting Power BI data...');
    console.log('-'.repeat(40));
    const data = await extractPowerBIData();
    console.log('');

    // Log extracted metrics
    console.log('Extracted Metrics:');
    console.log(`  Revenue YTD: $${Number(data.ytdRevenue).toLocaleString()}`);
    console.log(`  Total Orders: ${Number(data.orders).toLocaleString()}`);
    console.log(`  Total Customers: ${Number(data.customers).toLocaleString()}`);
    console.log(`  Return Rate: ${data.returnRate}%`);
    console.log(`  Week-over-Week Revenue: ${data.revenueChange}%`);
    console.log(`  Week-over-Week Orders: ${data.orderChange}%`);
    console.log('');

    // Step 2: Generate AI Analysis
    console.log('[2/3] Generating AI analysis...');
    console.log('-'.repeat(40));
    const analysis = await generateAnalysis(data);
    console.log('');

    // Log analysis preview
    console.log('Analysis Preview:');
    console.log(analysis.substring(0, 500) + '...');
    console.log('');

    // Step 3: Send Email (or save locally for dry run)
    if (isDryRun) {
      console.log('[3/3] Dry run - saving report locally...');
      console.log('-'.repeat(40));

      // Save HTML report to file
      const reportsDir = join(__dirname, '..', 'reports');
      await mkdir(reportsDir, { recursive: true });

      const filename = `weekly-report-${data.reportDate}.html`;
      const filepath = join(reportsDir, filename);
      const html = buildEmailHtml(data, analysis);

      await writeFile(filepath, html, 'utf8');
      console.log(`Report saved to: ${filepath}`);
      console.log('');

      // Also save raw data and analysis
      const dataFilename = `weekly-report-${data.reportDate}-data.json`;
      const dataFilepath = join(reportsDir, dataFilename);
      await writeFile(dataFilepath, JSON.stringify({ data, analysis }, null, 2), 'utf8');
      console.log(`Data saved to: ${dataFilepath}`);
    } else {
      console.log('[3/3] Sending email...');
      console.log('-'.repeat(40));
      const result = await sendEmail(data, analysis);
      console.log(`Email sent to: ${result.recipient}`);
      console.log(`Subject: ${result.subject}`);
    }

    // Complete
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log('='.repeat(60));
    console.log(`Completed successfully in ${duration}s`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('ERROR:', error.message);
    console.error('='.repeat(60));

    if (error.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run
main();
