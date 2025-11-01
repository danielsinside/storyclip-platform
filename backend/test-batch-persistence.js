/**
 * Test script for batch persistence in database
 * Tests the PublishBatchesRepository
 */

const batchesRepo = require('./services/publish-batches.repository');

async function testBatchPersistence() {
  console.log('🧪 Testing Batch Persistence...\n');

  const batchId = `test_batch_${Date.now()}`;
  const accountId = '5372118'; // Test account ID

  try {
    // 1. Create a test batch
    console.log('1️⃣ Creating batch...');
    await batchesRepo.createBatch({
      batchId,
      jobId: 'test_job_123',
      userId: 'test_user',
      accountId,
      publishMode: 'now',
      totalClips: 3,
      scheduledFor: null
    });
    console.log('✅ Batch created:', batchId);

    // 2. Add clips to the batch
    console.log('\n2️⃣ Adding clips...');
    for (let i = 1; i <= 3; i++) {
      await batchesRepo.addClip({
        batchId,
        clipIndex: i,
        clipUrl: `https://example.com/clip_${i}.mp4`,
        clipTitle: `Test Clip ${i}`,
        scheduledAt: null
      });
      console.log(`✅ Added clip ${i}`);
    }

    // 3. Get batch summary
    console.log('\n3️⃣ Getting batch summary...');
    const summary = await batchesRepo.getBatchSummary(batchId);
    console.log('✅ Batch summary:', JSON.stringify(summary, null, 2));

    // 4. Update clip status
    console.log('\n4️⃣ Updating clip status...');
    await batchesRepo.updateClipStatus(batchId, 1, 'uploading');
    console.log('✅ Clip 1 status updated to "uploading"');

    await batchesRepo.setClipUploaded(batchId, 1, 'metricool_post_123');
    console.log('✅ Clip 1 uploaded to Metricool');

    await batchesRepo.setClipPublished(batchId, 1, 'fb_post_456');
    console.log('✅ Clip 1 published on Facebook');

    // 5. Update batch progress
    console.log('\n5️⃣ Updating batch progress...');
    await batchesRepo.updateBatchProgress(batchId, {
      publishedClips: 1,
      failedClips: 0,
      currentClipIndex: 1
    });
    console.log('✅ Batch progress updated');

    // 6. Get updated summary
    console.log('\n6️⃣ Getting updated summary...');
    const updatedSummary = await batchesRepo.getBatchSummary(batchId);
    console.log('✅ Updated summary:');
    console.log('   - Total clips:', updatedSummary.total);
    console.log('   - Published:', updatedSummary.published);
    console.log('   - Failed:', updatedSummary.failed);
    console.log('   - Progress:', updatedSummary.progress + '%');
    console.log('   - Clips:');
    updatedSummary.clips.forEach(clip => {
      console.log(`     • Clip ${clip.index}: ${clip.status} (${clip.title})`);
    });

    // 7. Mark clip as failed
    console.log('\n7️⃣ Marking clip 2 as failed...');
    await batchesRepo.setClipFailed(batchId, 2, 'Test error message');
    console.log('✅ Clip 2 marked as failed');

    // 8. Complete the batch
    console.log('\n8️⃣ Completing batch...');
    await batchesRepo.updateBatchStatus(batchId, 'completed');
    console.log('✅ Batch status updated to "completed"');

    // 9. Final summary
    console.log('\n9️⃣ Final summary...');
    const finalSummary = await batchesRepo.getBatchSummary(batchId);
    console.log('✅ Final state:');
    console.log('   - Status:', finalSummary.status);
    console.log('   - Published:', finalSummary.published);
    console.log('   - Failed:', finalSummary.failed);
    console.log('   - Completed at:', finalSummary.completedAt);

    console.log('\n✅ All tests passed! Batch persistence is working correctly.\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testBatchPersistence();
