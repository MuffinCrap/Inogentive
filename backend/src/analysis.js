/**
 * OpenAI Analysis Module
 * AC-2: OpenAI Analysis Generation
 */

import config from './config.js';

/**
 * Generate executive analysis using GPT-4o
 */
export async function generateAnalysis(data) {
  console.log('Generating AI analysis with GPT-4o...');

  const systemPrompt = `You are a senior business analyst generating executive weekly reports for retail operations. Your tone is professional, concise, and actionable. Focus on insights that drive decisions, not just data recitation.

Key principles:
- Lead with the most important finding
- Quantify impact where possible
- Make recommendations specific and actionable
- Flag risks early with mitigation suggestions`;

  const userPrompt = `Generate a weekly executive report based on this performance data:

## Current Week Metrics
- Revenue YTD: $${Number(data.ytdRevenue).toLocaleString()}
- Total Orders: ${Number(data.orders).toLocaleString()}
- Total Customers: ${Number(data.customers).toLocaleString()}
- Return Rate: ${data.returnRate}%
- Revenue per Customer: $${Number(data.revenuePerCustomer).toFixed(2)}
- Total Profit: $${Number(data.totalProfit).toLocaleString()}

## Week-over-Week Changes
- Revenue Change: ${data.revenueChange}%
- Order Change: ${data.orderChange}%

## Top 5 Products by Revenue
${data.topProducts}

## Category Breakdown
${data.categories}

## Anomalies Detected
${data.anomalies.length > 0 ? data.anomalies.join('\n') : 'No significant anomalies detected'}

---

Please provide:
1. **Executive Summary** (3-4 sentences overview of performance)
2. **Key Wins** (2-3 bullet points of positive trends)
3. **Areas of Concern** (2-3 bullet points requiring attention)
4. **Recommended Actions** (2-3 specific, actionable next steps)

Format using markdown headers (##).`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.openai.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API failed: ${response.status} - ${error}`);
  }

  const result = await response.json();
  const analysis = result.choices[0].message.content;

  console.log('AI analysis generated successfully');
  console.log(`Tokens used: ${result.usage.total_tokens}`);

  return analysis;
}

export default { generateAnalysis };
