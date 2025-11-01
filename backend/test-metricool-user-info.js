#!/usr/bin/env node

/**
 * Get Metricool User Info
 *
 * This script helps you find your userId and blogId for Metricool API integration.
 */

require('dotenv').config();
const axios = require('axios');

async function getMetricoolUserInfo() {
  console.log('🔍 Finding your Metricool User Info\n');

  const userToken = process.env.METRICOOL_USER_TOKEN;
  if (!userToken) {
    console.error('❌ METRICOOL_USER_TOKEN not configured in .env');
    process.exit(1);
  }

  console.log('✅ User Token found:', userToken.substring(0, 10) + '...\n');

  // Try to get user info from different endpoints
  const baseUrl = 'https://app.metricool.com/api';

  // Try endpoint 1: /admin/simpleProfiles with dummy params
  console.log('📡 Method 1: Trying /admin/simpleProfiles with different param combinations...\n');

  const combinations = [
    { userId: '', blogId: '' },
    { userId: '0', blogId: '0' },
    { userId: 'me', blogId: 'default' },
  ];

  for (const params of combinations) {
    try {
      console.log(`  Testing with userId="${params.userId}", blogId="${params.blogId}"...`);
      const response = await axios.get(`${baseUrl}/admin/simpleProfiles`, {
        headers: {
          'X-Mc-Auth': userToken
        },
        params: params,
        validateStatus: () => true // Accept any status code
      });

      console.log(`  Status: ${response.status}`);

      if (response.status === 200 && response.data) {
        console.log('\n✅ Success! Response:');
        console.log(JSON.stringify(response.data, null, 2));

        // Try to extract userId and blogId from response
        if (response.data.userId) {
          console.log(`\n📋 Found userId: ${response.data.userId}`);
        }
        if (response.data.blogId) {
          console.log(`📋 Found blogId: ${response.data.blogId}`);
        }

        return;
      } else if (response.data && typeof response.data === 'object') {
        console.log('  Response contains:', Object.keys(response.data).join(', '));
      }

    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }

  // Try endpoint 2: /user/me or similar
  console.log('\n📡 Method 2: Trying common user info endpoints...\n');

  const endpoints = [
    '/user/me',
    '/user/profile',
    '/auth/me',
    '/me',
    '/user',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`  GET ${endpoint}...`);
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        headers: {
          'X-Mc-Auth': userToken
        },
        validateStatus: () => true
      });

      if (response.status === 200 && response.data) {
        console.log(`\n✅ Success at ${endpoint}!`);
        console.log(JSON.stringify(response.data, null, 2));

        if (response.data.userId || response.data.id) {
          console.log(`\n📋 Found userId: ${response.data.userId || response.data.id}`);
        }
        if (response.data.blogId || response.data.defaultBlogId) {
          console.log(`📋 Found blogId: ${response.data.blogId || response.data.defaultBlogId}`);
        }

        return;
      }

    } catch (error) {
      // Silently continue to next endpoint
    }
  }

  console.log('\n❌ Could not automatically determine userId and blogId\n');
  console.log('📝 Manual Steps:\n');
  console.log('1. Log in to your Metricool dashboard: https://app.metricool.com');
  console.log('2. Go to Settings > API');
  console.log('3. Look for your User ID and Blog ID (may be labeled as "Account ID" or "Workspace ID")');
  console.log('4. You can also check the browser\'s Network tab when loading any page');
  console.log('5. Look for API calls that include userId and blogId parameters\n');
  console.log('Alternative: Contact Metricool support for API documentation');
}

// Run
getMetricoolUserInfo().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
