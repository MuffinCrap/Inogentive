/**
 * Configuration module - loads environment variables
 * AC-4: Environment-based configuration
 */

import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from backend root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
loadEnv({ path: join(__dirname, '..', '.env') });

// Validate required environment variables
const required = [
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'POWERBI_WORKSPACE_ID',
  'POWERBI_DATASET_ID',
  'OPENAI_API_KEY',
  'EMAIL_RECIPIENT'
];

const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('Missing required environment variables:', missing.join(', '));
  console.error('Copy .env.example to .env and fill in your credentials.');
  process.exit(1);
}

export const config = {
  // Azure AD
  azure: {
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  },

  // Power BI
  powerbi: {
    workspaceId: process.env.POWERBI_WORKSPACE_ID,
    datasetId: process.env.POWERBI_DATASET_ID
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o'
  },

  // Email
  email: {
    recipient: process.env.EMAIL_RECIPIENT,
    from: process.env.EMAIL_FROM || process.env.EMAIL_RECIPIENT
  }
};

export default config;
