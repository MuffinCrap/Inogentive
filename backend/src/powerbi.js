/**
 * Power BI Data Extraction Module
 * AC-1: Power BI Data Extraction
 */

import config from './config.js';

/**
 * Get Azure AD access token using client credentials flow
 */
async function getAccessToken(scope) {
  const tokenUrl = `https://login.microsoftonline.com/${config.azure.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.azure.clientId,
    client_secret: config.azure.clientSecret,
    scope: scope
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Execute a DAX query against Power BI dataset
 */
async function executeQuery(accessToken, query) {
  const url = `https://api.powerbi.com/v1.0/myorg/groups/${config.powerbi.workspaceId}/datasets/${config.powerbi.datasetId}/executeQueries`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      queries: [{ query }],
      serializerSettings: {
        includeNulls: true
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Power BI query failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.results[0].tables[0].rows;
}

/**
 * List datasets in workspace (for debugging)
 */
async function listDatasets(accessToken) {
  const url = `https://api.powerbi.com/v1.0/myorg/groups/${config.powerbi.workspaceId}/datasets`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list datasets: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Get mock data for testing when Power BI is unavailable
 */
function getMockData() {
  console.log('Using MOCK DATA for testing...');
  return {
    revenue: 24900000,
    ytdRevenue: 24900000,
    orders: 25200,
    customers: 17400,
    returnRate: 2.17,
    totalCost: 10500000,
    totalProfit: 14400000,
    revenuePerCustomer: 1431,
    revenueChange: '5.2',
    orderChange: '3.8',
    topProducts: '1. Mountain-200 Black - $1,373,454\n2. Mountain-200 Silver - $1,339,394\n3. Road-250 Red - $1,152,628\n4. Road-350-W Yellow - $1,082,627\n5. Touring-1000 Blue - $932,453',
    categories: '- Bikes: 13,929 orders, $22,342,809\n- Accessories: 9,137 orders, $1,272,058\n- Clothing: 2,134 orders, $1,285,133',
    anomalies: [],
    reportDate: new Date().toISOString().split('T')[0],
    weekEnding: new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
}

/**
 * Extract all KPI data from Power BI
 */
export async function extractPowerBIData(useMock = false) {
  // Use mock data if requested
  if (useMock || process.env.USE_MOCK_DATA === 'true') {
    return getMockData();
  }

  console.log('Authenticating with Azure AD for Power BI...');
  const accessToken = await getAccessToken('https://analysis.windows.net/powerbi/api/.default');
  console.log('Authentication successful');

  // Debug: List available datasets
  console.log('Listing available datasets in workspace...');
  const datasetsResponse = await listDatasets(accessToken);
  console.log('Available datasets:');
  datasetsResponse.value.forEach(ds => {
    console.log(`  - ${ds.name} (ID: ${ds.id})`);
  });
  console.log(`Looking for dataset ID: ${config.powerbi.datasetId}`);
  console.log('');

  console.log('Extracting KPI measures...');

  // Query 1: Main KPIs
  const kpiQuery = `
    EVALUATE
    ROW(
      "Total Revenue", [Total Revenue],
      "YTD Revenue", [YTD Revenue],
      "Total Orders", [Total Orders],
      "Total Customers", [Total Customers],
      "Return Rate", [Return Rate],
      "Total Cost", [Total Cost],
      "Total Profit", [Total Profit],
      "Revenue Per Customer", [Revenue Per Customer]
    )
  `;

  const kpis = await executeQuery(accessToken, kpiQuery);
  console.log('KPI measures extracted');

  // Query 2: Top 10 Products
  console.log('Extracting top products...');
  const topProductsQuery = `
    EVALUATE
    TOPN(
      10,
      SUMMARIZE(
        'Product Lookup',
        'Product Lookup'[ProductName],
        "Revenue", [Total Revenue]
      ),
      [Revenue], DESC
    )
  `;

  const topProducts = await executeQuery(accessToken, topProductsQuery);
  console.log('Top products extracted');

  // Query 3: Previous period for comparison (last 7 days offset)
  console.log('Extracting previous period data...');
  const previousQuery = `
    EVALUATE
    ROW(
      "Prev Revenue", CALCULATE([Total Revenue], DATEADD('Calendar Lookup'[Date], -7, DAY)),
      "Prev Orders", CALCULATE([Total Orders], DATEADD('Calendar Lookup'[Date], -7, DAY))
    )
  `;

  let previousData;
  try {
    previousData = await executeQuery(accessToken, previousQuery);
  } catch (error) {
    console.warn('Could not get previous period data, using estimates');
    previousData = [{ '[Prev Revenue]': 0, '[Prev Orders]': 0 }];
  }

  // Query 4: Orders by Category
  console.log('Extracting category breakdown...');
  const categoryQuery = `
    EVALUATE
    SUMMARIZE(
      'Product Categories Lookup',
      'Product Categories Lookup'[CategoryName],
      "Orders", [Total Orders],
      "Revenue", [Total Revenue]
    )
  `;

  const categories = await executeQuery(accessToken, categoryQuery);

  // Compile results
  const current = kpis[0];
  const previous = previousData[0];

  // Calculate changes
  const revenueChange = previous['[Prev Revenue]'] > 0
    ? ((current['[Total Revenue]'] - previous['[Prev Revenue]']) / previous['[Prev Revenue]'] * 100).toFixed(1)
    : 0;

  const orderChange = previous['[Prev Orders]'] > 0
    ? ((current['[Total Orders]'] - previous['[Prev Orders]']) / previous['[Prev Orders]'] * 100).toFixed(1)
    : 0;

  // Detect anomalies
  const anomalies = [];
  if (Math.abs(parseFloat(revenueChange)) > 10) {
    anomalies.push(`Revenue ${parseFloat(revenueChange) > 0 ? 'increased' : 'decreased'} by ${Math.abs(revenueChange)}%`);
  }
  if (Math.abs(parseFloat(orderChange)) > 10) {
    anomalies.push(`Orders ${parseFloat(orderChange) > 0 ? 'increased' : 'decreased'} by ${Math.abs(orderChange)}%`);
  }

  // Format top products
  const topProductsList = topProducts
    .slice(0, 5)
    .map((p, i) => `${i + 1}. ${p['[ProductName]']} - $${Number(p['[Revenue]']).toLocaleString()}`)
    .join('\n');

  // Format categories
  const categoryList = categories
    .map(c => `- ${c['[CategoryName]']}: ${c['[Orders]']} orders, $${Number(c['[Revenue]']).toLocaleString()}`)
    .join('\n');

  console.log('Data extraction complete');

  return {
    // Current metrics
    revenue: current['[Total Revenue]'],
    ytdRevenue: current['[YTD Revenue]'],
    orders: current['[Total Orders]'],
    customers: current['[Total Customers]'],
    returnRate: current['[Return Rate]'],
    totalCost: current['[Total Cost]'],
    totalProfit: current['[Total Profit]'],
    revenuePerCustomer: current['[Revenue Per Customer]'],

    // Changes
    revenueChange,
    orderChange,

    // Lists
    topProducts: topProductsList,
    categories: categoryList,
    anomalies,

    // Metadata
    reportDate: new Date().toISOString().split('T')[0],
    weekEnding: new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
}

/**
 * Get access token for Microsoft Graph (email)
 */
export async function getGraphToken() {
  return getAccessToken('https://graph.microsoft.com/.default');
}

export default { extractPowerBIData, getGraphToken };
