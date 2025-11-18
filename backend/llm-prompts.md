# LLM Prompts for Executive Report Generation

## Overview

This document contains the prompts used to generate executive reports from Power BI data. The prompts are designed for GPT-4 or Claude but can be adapted for other models.

## System Prompt

```
You are an expert retail analytics consultant generating weekly executive reports for a UK retail chain with 90+ stores. Your reports are read by C-suite executives who need:

1. **Immediate clarity** - Lead with the most important information
2. **Actionable insights** - Not just what happened, but what to do about it
3. **Context** - How metrics compare to targets and previous periods
4. **Brevity** - Executives have 2 minutes to scan this report

REPORT STRUCTURE:
- Executive Summary (3-4 bullet points of critical information)
- Key Highlights (metrics with WoW changes)
- Performance Insights (what's working, what needs attention)
- Recommendations (prioritized actions)
- Week-over-Week Changes (data table)

TONE:
- Professional but direct
- Confident assertions, not hedging language
- Numbers are precise, insights are actionable
- Flag concerns clearly but constructively

FORMATTING:
- Use Markdown formatting
- Bold key metrics and important terms
- Use bullet points for readability
- Include a data table for WoW comparisons
- Keep total length under 800 words

IMPORTANT CONTEXT:
- This is a retail business operating at scale (90+ stores)
- Small percentage improvements have massive absolute impact
- Speed of insight enables better decisions
- Executives care about: Revenue, Conversion, Customer Experience, Operations

When analyzing, consider:
- Are there anomalies that need immediate attention?
- What patterns are emerging across stores/regions?
- What's driving changes (positive or negative)?
- What actions would have the highest ROI?
```

## User Prompt Template

```
Generate a Weekly Executive Report for the week ending {{weekEnding}}.

Here is the data extracted from Power BI:

## KEY METRICS
{{#each keyMetrics}}
- {{@key}}: {{this}}
{{/each}}

## ALL MEASURES
```json
{{json allMeasures}}
```

## REGIONAL PERFORMANCE
{{#each regionalPerformance}}
### {{region}}
- Revenue: {{revenue}}
- Revenue vs Target: {{revenueVsTarget}}
- Conversion: {{conversion}}
- Traffic: {{traffic}}
{{/each}}

## STORE PERFORMANCE
### Top 5 Stores
{{#each topStores}}
{{@index}}. {{name}} - £{{revenue}} ({{change}}% WoW)
{{/each}}

### Bottom 5 Stores
{{#each bottomStores}}
{{@index}}. {{name}} - £{{revenue}} ({{change}}% WoW)
{{/each}}

## PREVIOUS WEEK COMPARISON
- Last Week Revenue: {{previousWeek.revenue}}
- Last Week Conversion: {{previousWeek.conversion}}
- Last Week ATV: {{previousWeek.atv}}
- Last Week Traffic: {{previousWeek.traffic}}

Generate a comprehensive executive report that:
1. Highlights the most critical information first
2. Identifies patterns and anomalies
3. Provides specific, actionable recommendations
4. Uses precise numbers from the data provided

Format the report in Markdown.
```

## Example Output

```markdown
# Weekly Executive Report - Week 46

**Generated:** November 18, 2025, 09:00 AM

## Executive Summary

- **Revenue up 3.2% WoW** to £2.4M, driven by strong London performance and online growth
- **Conversion improved to 4.8%** (+0.3pp), indicating better in-store execution
- **Northern region requires attention** - 2% decline in conversion across 12 stores
- **Inventory action needed** - 15 locations showing slower-than-target turnover

### Key Highlights

- **Total Revenue:** £2.4M (+3.2% WoW)
- **Conversion Rate:** 4.8% (+0.3pp vs last week)
- **Average Transaction Value:** £47.50 (-1.2% WoW)
- **Store Traffic:** 51,230 visitors (+5.1% WoW)

### Performance Insights

**Strong Performers:**
- London flagship store showing 12% revenue increase, now contributing 8% of total revenue
- Online orders up 8% with fulfillment times improving to 1.2 days average
- New homeware category driving 15% of incremental sales - consider expanding range

**Areas Requiring Attention:**
- Northern region stores showing consistent 2% decline in conversion over 3 weeks
- Inventory turnover 18% below target in 15 locations - cash flow impact of ~£120K
- Customer satisfaction scores dipped in Manchester, Leeds, and Sheffield stores

### Recommendations

1. **Immediate (This Week):**
   - Deploy regional manager to Northern stores for conversion diagnostic
   - Review staffing levels during peak hours (12-3pm showing lowest conversion)

2. **Short-Term (Next 2 Weeks):**
   - Launch targeted clearance promotion for slow-moving inventory
   - Investigate customer feedback themes in underperforming stores

3. **Monitor:**
   - ATV decline trend - third consecutive week of decrease
   - Online returns rate creeping up (now 8.2% vs 7.5% target)

### Week-over-Week Changes

| Metric | This Week | Last Week | Change | vs Target |
|--------|-----------|-----------|--------|-----------|
| Revenue | £2.4M | £2.32M | +3.2% | +1.5% |
| Transactions | 50,526 | 49,100 | +2.9% | +0.8% |
| Avg Basket | £47.50 | £48.09 | -1.2% | -2.1% |
| Returns | 3.2% | 3.5% | -0.3pp | On Target |
| Traffic | 51,230 | 48,743 | +5.1% | +2.3% |
| Conversion | 4.8% | 4.5% | +0.3pp | +0.1pp |

---

*Report generated automatically by Inovora Weekly Report Automation*
```

## Prompt Variations

### For Anomaly-Heavy Weeks

Add to system prompt:
```
This week has significant anomalies in the data. Prioritize explaining:
1. What happened (the anomaly)
2. Why it likely happened (root cause hypothesis)
3. Impact if not addressed
4. Specific action to take

Be direct about concerns - executives prefer clear warnings over diplomatic hedging.
```

### For Target-Miss Scenarios

Add to system prompt:
```
Several key metrics are below target this week. Structure your analysis to:
1. Acknowledge the miss clearly and quantify the gap
2. Identify contributing factors (don't make excuses)
3. Highlight any positive counter-trends
4. Recommend specific recovery actions with expected impact
```

### For Strong Performance Weeks

Add to system prompt:
```
Performance is strong across most metrics. Focus on:
1. What's driving the success (be specific)
2. How to sustain or accelerate the momentum
3. Any warning signs that could derail progress
4. Opportunities to expand what's working to other areas
```

## Temperature Settings

| Scenario | Temperature | Reasoning |
|----------|-------------|-----------|
| Standard Report | 0.3 | Consistent, factual output |
| Anomaly Analysis | 0.4 | Slightly more creative hypothesis |
| Recommendations | 0.5 | More varied suggestions |

## Token Limits

- **Input (data):** ~2,000 tokens
- **Output (report):** ~1,500 tokens
- **Total:** ~3,500 tokens per report

Estimated cost per report:
- GPT-4 Turbo: ~$0.04
- Claude 3 Sonnet: ~$0.02

## Error Handling

If LLM returns poor quality:

1. **Too short:** Increase max_tokens, add "Be comprehensive" to prompt
2. **Too verbose:** Add "Keep under 800 words" reminder
3. **Missing sections:** Explicitly list required sections in prompt
4. **Wrong tone:** Add example of desired tone
5. **Hallucinating data:** Emphasize "Only use data provided, do not invent metrics"

## Testing Prompts

Before production, test with:

1. **Normal week data** - Baseline quality check
2. **Anomaly-heavy data** - Can it identify and explain issues?
3. **All metrics positive** - Avoid false positives in recommendations
4. **All metrics negative** - Handle bad news professionally
5. **Mixed signals** - Revenue up but conversion down, etc.

## Iteration Log

Track prompt improvements:

| Date | Change | Reason | Result |
|------|--------|--------|--------|
| 2025-11-18 | Initial prompt | - | Baseline |
| | | | |

## Alternative Models

### Claude Configuration

```json
{
  "model": "claude-3-sonnet-20240229",
  "max_tokens": 2000,
  "temperature": 0.3,
  "system": "{{system_prompt}}",
  "messages": [
    { "role": "user", "content": "{{user_prompt}}" }
  ]
}
```

### GPT-4 Configuration

```json
{
  "model": "gpt-4-turbo-preview",
  "max_tokens": 2000,
  "temperature": 0.3,
  "messages": [
    { "role": "system", "content": "{{system_prompt}}" },
    { "role": "user", "content": "{{user_prompt}}" }
  ]
}
```

## Future Enhancements

1. **Few-shot examples** - Include 2-3 example reports for consistency
2. **Chain-of-thought** - Have LLM explain reasoning before conclusions
3. **Multi-turn refinement** - Generate draft, then refine specific sections
4. **Custom sections** - Allow users to request specific analysis focus
5. **Trend analysis** - Pass multiple weeks of data for pattern detection
