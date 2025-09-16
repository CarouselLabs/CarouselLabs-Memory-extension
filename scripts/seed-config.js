#!/usr/bin/env node

/**
 * Seed static configuration from SSM parameters
 * This runs locally during development to update config/auth.defaults.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STAGE = process.env.STAGE || 'dev';
const CONFIG_PATH = path.join(__dirname, '../config/auth.defaults.json');

async function getSSMParameter(paramName) {
  try {
    const cmd = `aws ssm get-parameter --name "${paramName}" --with-decryption --query "Parameter.Value" --output text`;
    const result = execSync(cmd, { encoding: 'utf8' }).trim();
    return result;
  } catch (error) {
    console.warn(`Failed to get parameter ${paramName}:`, error.message);
    return null;
  }
}

async function seedConfig() {
  console.log(`🌱 Seeding config from SSM for stage: ${STAGE}`);
  
  try {
    // Get the main service config parameter which contains nested extension config
    const serviceConfigParam = `/tf/${STAGE}/carousel-labs/services/mem0/config`;
    console.log(`📡 Fetching: ${serviceConfigParam}`);
    
    const serviceConfigJson = await getSSMParameter(serviceConfigParam);
    if (!serviceConfigJson) {
      throw new Error(`Service config parameter '${serviceConfigParam}' not found`);
    }

    let serviceConfig = {};
    try {
      serviceConfig = JSON.parse(serviceConfigJson);
      console.log('✅ Parsed service config');
    } catch (e) {
      console.error('❌ Error parsing service config JSON:', e);
      throw e;
    }

    // Extract the extension-specific configuration
    const extensionConfig = serviceConfig.extension;
    if (!extensionConfig) {
      throw new Error('Extension configuration not found within service config');
    }
    
    console.log('🎯 Extracted extension config:', extensionConfig);

    // Write to static config file
    const staticConfig = {
      cognito_domain: extensionConfig.cognito_domain,
      cognito_client_id: extensionConfig.cognito_client_id,
      auth_exchange_url: extensionConfig.auth_exchange_url
    };

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(staticConfig, null, 2));
    console.log(`✅ Updated ${CONFIG_PATH}`);
    console.log('📦 Static config:', staticConfig);

  } catch (error) {
    console.error('❌ Error seeding config:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  seedConfig();
}

module.exports = { seedConfig };
