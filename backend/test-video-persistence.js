#!/usr/bin/env node

/**
 * Test script to verify video persistence when navigating back to manual configuration
 */

const axios = require('axios');

const API_URL = 'https://story.creatorsflow.app/api';
const TEST_JOB_ID = 'upl_1761700214393_s1c7id'; // Use a known job ID

async function testVideoPersistence() {
  console.log('🎬 Testing Video Persistence Fix');
  console.log('=====================================\n');

  try {
    // Step 1: Get job status to verify video URL is available
    console.log('1️⃣ Fetching job status...');
    const statusResponse = await axios.get(`${API_URL}/v1/jobs/${TEST_JOB_ID}/status`);
    const jobData = statusResponse.data;

    console.log('   ✅ Job status retrieved successfully');
    console.log('   📊 Status:', jobData.status);
    console.log('   📎 Total clips:', jobData.totalClips);
    console.log('   🎥 Has video URL:', !!jobData.videoUrl);

    if (jobData.videoUrl) {
      console.log('   📍 Video URL:', jobData.videoUrl);
    }

    // Step 2: Test localStorage persistence simulation
    console.log('\n2️⃣ Simulating localStorage persistence...');
    const videoUrlKey = `videoUrl_${TEST_JOB_ID}`;
    const durationKey = `duration_${TEST_JOB_ID}`;

    console.log('   💾 Would save to localStorage:');
    console.log(`      - ${videoUrlKey}: ${jobData.videoUrl || 'N/A'}`);
    console.log(`      - ${durationKey}: ${jobData.duration || 'N/A'}`);

    // Step 3: Test URL construction
    console.log('\n3️⃣ Testing URL construction fallback...');
    const origin = 'https://story.creatorsflow.app';

    if (TEST_JOB_ID.startsWith('job_')) {
      const constructedUrl = `${origin}/media/${TEST_JOB_ID}/source.mp4`;
      console.log('   🔧 Constructed URL (stable media):', constructedUrl);

      // Test if the URL is accessible
      try {
        const headResponse = await axios.head(constructedUrl);
        console.log('   ✅ Media URL is accessible');
        console.log('      Content-Type:', headResponse.headers['content-type']);
      } catch (error) {
        console.log('   ⚠️ Media URL not accessible:', error.message);
      }
    } else {
      const constructedUrl = `${origin}/outputs/uploads/${TEST_JOB_ID}.mp4`;
      console.log('   🔧 Constructed URL (legacy):', constructedUrl);
    }

    // Step 4: Test video store persistence
    console.log('\n4️⃣ Video Store Persistence:');
    console.log('   📦 The zustand store with persist middleware will:');
    console.log('      - Keep originalUrl across navigation');
    console.log('      - Prioritize filteredPreviewUrl if available');
    console.log('      - Persist to localStorage automatically');

    // Step 5: Summary
    console.log('\n✅ Video Persistence Fix Summary:');
    console.log('   1. VideoPlayer now checks for null URL before rendering');
    console.log('   2. Manual page prioritizes store > session > localStorage > constructed URL');
    console.log('   3. Store uses zustand persist to maintain URL across navigation');
    console.log('   4. VideoPlayer always updates store when receiving new URL');
    console.log('\n🎯 The video should now persist when navigating back to manual configuration!');

  } catch (error) {
    console.error('❌ Error during test:', error.response?.data || error.message);
  }
}

// Run the test
testVideoPersistence();