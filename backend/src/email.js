/**
 * Email Module - Microsoft Graph API
 * AC-3: Email Distribution
 */

import config from './config.js';
import { getGraphToken } from './powerbi.js';

/**
 * Build HTML email template with KPI cards and analysis
 */
export function buildEmailHtml(data, analysis) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    .container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .header p {
      margin: 0;
      opacity: 0.9;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      padding: 20px;
      background: #f8f9fa;
    }
    .kpi-card {
      background: white;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .kpi-value {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 5px;
    }
    .kpi-label {
      font-size: 11px;
      color: #7f8c8d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kpi-change {
      font-size: 12px;
      margin-top: 5px;
      font-weight: 500;
    }
    .positive { color: #27ae60; }
    .negative { color: #e74c3c; }
    .neutral { color: #7f8c8d; }
    .content {
      padding: 30px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section h2 {
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
      margin-top: 0;
      font-size: 18px;
    }
    .section p, .section ul {
      line-height: 1.6;
      color: #555;
    }
    .section ul {
      padding-left: 20px;
    }
    .section li {
      margin-bottom: 8px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      color: #95a5a6;
      font-size: 12px;
      border-top: 1px solid #eee;
    }
    @media (max-width: 600px) {
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly Performance Report</h1>
      <p>${data.weekEnding}</p>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">$${(data.ytdRevenue / 1000000).toFixed(1)}M</div>
        <div class="kpi-label">Revenue YTD</div>
        <div class="kpi-change ${parseFloat(data.revenueChange) >= 0 ? 'positive' : 'negative'}">
          ${parseFloat(data.revenueChange) >= 0 ? '↑' : '↓'} ${Math.abs(data.revenueChange)}% WoW
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${Number(data.orders).toLocaleString()}</div>
        <div class="kpi-label">Total Orders</div>
        <div class="kpi-change ${parseFloat(data.orderChange) >= 0 ? 'positive' : 'negative'}">
          ${parseFloat(data.orderChange) >= 0 ? '↑' : '↓'} ${Math.abs(data.orderChange)}% WoW
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${Number(data.customers).toLocaleString()}</div>
        <div class="kpi-label">Customers</div>
        <div class="kpi-change neutral">—</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${data.returnRate}%</div>
        <div class="kpi-label">Return Rate</div>
        <div class="kpi-change neutral">—</div>
      </div>
    </div>

    <div class="content">
      ${formatAnalysisToHtml(analysis)}
    </div>

    <div class="footer">
      <p>Generated automatically by Weekly Report Automation System</p>
      <p>Report ID: ${Date.now()} | ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Convert markdown analysis to HTML
 */
function formatAnalysisToHtml(markdown) {
  return markdown
    // Convert ## headers to <h2>
    .replace(/^## (.+)$/gm, '<div class="section"><h2>$1</h2>')
    // Convert **bold** to <strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Convert bullet points to <ul><li>
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Convert paragraphs
    .replace(/^(?!<[uh]|<li)(.+)$/gm, '<p>$1</p>')
    // Close sections before next section or end
    .replace(/<\/ul>\n*(?=<div class="section">|$)/g, '</ul></div>\n')
    // Clean up empty paragraphs
    .replace(/<p><\/p>/g, '')
    // Close any unclosed sections
    .replace(/(<div class="section">(?:(?!<\/div>).)*?)$/s, '$1</div>');
}

/**
 * Send email via Microsoft Graph API
 */
export async function sendEmail(data, analysis) {
  console.log('Preparing email...');

  const html = buildEmailHtml(data, analysis);
  const subject = `Weekly Performance Report - ${data.weekEnding}`;

  console.log('Authenticating with Microsoft Graph...');
  const accessToken = await getGraphToken();

  // Using /me/sendMail requires delegated permissions
  // For app-only (daemon), use /users/{user-id}/sendMail
  // We'll try /me first, fall back to /users/{email}

  const emailPayload = {
    message: {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: html
      },
      toRecipients: [
        {
          emailAddress: {
            address: config.email.recipient
          }
        }
      ]
    },
    saveToSentItems: true
  };

  console.log(`Sending email to ${config.email.recipient}...`);

  // Try sending with /users/{from-email}/sendMail for app-only auth
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${config.email.from}/sendMail`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${response.status} - ${error}`);
  }

  console.log('Email sent successfully!');
  return { success: true, recipient: config.email.recipient, subject };
}

export default { buildEmailHtml, sendEmail };
