#!/usr/bin/env node

/**
 * Test Metricool Integration
 *
 * This script tests the Metricool API integration by:
 * 1. Verifying the API key is configured
 * 2. Testing basic API connectivity
 * 3. Fetching available accounts
 */

require('dotenv').config();
const MetricoolService = require('./services/metricool.service');

async function testMetricoolIntegration() {
  console.log('🧪 Testing Metricool Integration\n');

  // Step 1: Check API key
  const apiKey = process.env.METRICOOL_USER_TOKEN;
  if (!apiKey) {
    console.error('❌ METRICOOL_USER_TOKEN not configured in .env');
    process.exit(1);
  }
  console.log('✅ API Key configured:', apiKey.substring(0, 10) + '...');

  // Step 2: Initialize service
  const metricool = new MetricoolService(apiKey);
  console.log('✅ MetricoolService initialized\n');

  // Step 3: Test API connectivity by fetching accounts
  try {
    console.log('📡 Fetching Metricool accounts...');
    const accounts = await metricool.getAccounts();

    console.log('✅ API connection successful!\n');
    console.log('📊 Available Accounts:');

    if (Array.isArray(accounts)) {
      accounts.forEach((account, index) => {
        console.log(`  ${index + 1}. ${account.name || account.id}`);
        console.log(`     - Type: ${account.type || 'Unknown'}`);
        console.log(`     - ID: ${account.id}`);
        console.log(`     - Status: ${account.status || 'Active'}`);
      });
    } else if (accounts.data && Array.isArray(accounts.data)) {
      accounts.data.forEach((account, index) => {
        console.log(`  ${index + 1}. ${account.name || account.id}`);
        console.log(`     - Type: ${account.type || 'Unknown'}`);
        console.log(`     - ID: ${account.id}`);
        console.log(`     - Status: ${account.status || 'Active'}`);
      });
    } else {
      console.log('  Response:', JSON.stringify(accounts, null, 2));
    }

    console.log('\n✅ Metricool integration test completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('  1. Copy an account ID from above');
    console.log('  2. Configure it in your frontend settings');
    console.log('  3. Try publishing stories from the UI');

  } catch (error) {
    console.error('\n❌ API connection failed:', error.message);
    console.error('\nError details:', error.response?.data || error);

    console.log('\n📝 Troubleshooting:');
    console.log('  1. Verify METRICOOL_USER_TOKEN is correct');
    console.log('  2. Check Metricool API documentation');
    console.log('  3. Ensure your Metricool account has connected social profiles');

    process.exit(1);
  }
}

// Run test
testMetricoolIntegration().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
