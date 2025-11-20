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

  const systemPrompt = `You are a senior business analyst and strategic advisor generating comprehensive executive weekly reports for retail operations. Your reports are thorough, data-driven, and provide deep insights that drive strategic decisions.

Key principles:
- Provide comprehensive analysis with specific numbers and percentages
- Include trend analysis and historical context where relevant
- Offer multiple levels of recommendations (immediate, short-term, strategic)
- Identify root causes, not just symptoms
- Quantify business impact in dollar terms where possible
- Include competitive and market context
- Flag risks with severity levels and mitigation strategies
- Highlight opportunities for growth and optimization`;

  const userPrompt = `Generate a comprehensive weekly executive report based on this performance data:

## Current Week Metrics
- Revenue YTD: $${Number(data.ytdRevenue).toLocaleString()}
- Total Orders: ${Number(data.orders).toLocaleString()}
- Total Customers: ${Number(data.customers).toLocaleString()}
- Return Rate: ${data.returnRate}%
- Revenue per Customer: $${Number(data.revenuePerCustomer).toFixed(2)}
- Total Profit: $${Number(data.totalProfit).toLocaleString()}
- Total Cost: $${Number(data.totalCost).toLocaleString()}

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

Please provide a DETAILED and COMPREHENSIVE report with the following sections:

## Executive Summary
Provide a thorough 5-6 sentence overview of overall business performance, highlighting the most critical insights and their strategic implications.

## Financial Performance Analysis
- Detailed breakdown of revenue performance with trend analysis
- Profit margin analysis and cost efficiency metrics
- Revenue per customer trends and customer lifetime value insights
- Compare current performance against targets/benchmarks

## Key Wins & Positive Trends
- 4-5 detailed bullet points with specific metrics
- Explain WHY these are wins and their business impact
- Identify what's driving these successes

## Areas of Concern & Risk Assessment
- 4-5 detailed bullet points with severity indicators (High/Medium/Low)
- Root cause analysis for each concern
- Potential business impact if not addressed
- Include the return rate issues and product-specific problems

## Product Performance Deep Dive
- Analysis of top performers and why they're succeeding
- Underperforming products and categories
- Return rate analysis by product with recommendations
- Inventory and demand insights

## Customer Insights
- Customer acquisition and retention trends
- Revenue per customer analysis
- Customer segment performance
- Opportunities to increase customer value

## Recommended Actions
Organize into three tiers:
### Immediate Actions (This Week)
- 3-4 specific, tactical actions with expected outcomes

### Short-Term Initiatives (Next 30 Days)
- 3-4 strategic initiatives with resource requirements

### Strategic Recommendations (Next Quarter)
- 2-3 longer-term strategic moves with projected ROI

## Risk Mitigation Plan
- Prioritized list of risks with mitigation strategies
- Timeline and ownership recommendations

Format using markdown headers (##) and subheaders (###). Use bullet points, bold text for emphasis, and include specific numbers throughout.`;

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
      max_tokens: 3000
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
