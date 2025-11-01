/**
 * Repository for managing publish batches
 * Handles persistence of Metricool publication batches in SQLite
 */

const db = require('../database/db');
const logger = require('../utils/logger');

class PublishBatchesRepository {
  /**
   * Create a new publish batch
   */
  async createBatch({ batchId, jobId, userId, accountId, publishMode, totalClips, scheduledFor }) {
    const sql = `
      INSERT INTO publish_batches (
        batch_id, job_id, user_id, account_id, publish_mode,
        total_clips, scheduled_for, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    await db.run(sql, [
      batchId,
      jobId || null,
      userId || null,
      accountId,
      publishMode,
      totalClips,
      scheduledFor || null
    ]);

    logger.info(`Created publish batch: ${batchId}`);
    return this.getBatch(batchId);
  }

  /**
   * Get batch by ID
   */
  async getBatch(batchId) {
    const sql = `SELECT * FROM publish_batches WHERE batch_id = ?`;
    return await db.get(sql, [batchId]);
  }

  /**
   * Update batch status
   */
  async updateBatchStatus(batchId, status) {
    const sql = `
      UPDATE publish_batches
      SET status = ?,
          completed_at = CASE WHEN ? IN ('completed', 'failed') THEN datetime('now') ELSE completed_at END
      WHERE batch_id = ?
    `;

    await db.run(sql, [status, status, batchId]);
    logger.info(`Updated batch ${batchId} status to: ${status}`);
  }

  /**
   * Update batch progress
   */
  async updateBatchProgress(batchId, { publishedClips, failedClips, currentClipIndex }) {
    const sql = `
      UPDATE publish_batches
      SET published_clips = ?,
          failed_clips = ?,
          current_clip_index = ?
      WHERE batch_id = ?
    `;

    await db.run(sql, [publishedClips, failedClips, currentClipIndex, batchId]);
  }

  /**
   * Set batch error
   */
  async setBatchError(batchId, errorMsg) {
    const sql = `
      UPDATE publish_batches
      SET status = 'failed',
          error_msg = ?,
          completed_at = datetime('now')
      WHERE batch_id = ?
    `;

    await db.run(sql, [errorMsg, batchId]);
    logger.error(`Batch ${batchId} failed: ${errorMsg}`);
  }

  /**
   * Add clip to batch
   */
  async addClip({ batchId, clipIndex, clipUrl, clipTitle, scheduledAt }) {
    const sql = `
      INSERT INTO publish_batch_clips (
        batch_id, clip_index, clip_url, clip_title, scheduled_at
      ) VALUES (?, ?, ?, ?, ?)
    `;

    await db.run(sql, [batchId, clipIndex, clipUrl, clipTitle || null, scheduledAt || null]);
  }

  /**
   * Get all clips for a batch
   */
  async getBatchClips(batchId) {
    const sql = `
      SELECT * FROM publish_batch_clips
      WHERE batch_id = ?
      ORDER BY clip_index ASC
    `;

    return await db.query(sql, [batchId]);
  }

  /**
   * Update clip status
   */
  async updateClipStatus(batchId, clipIndex, status) {
    const sql = `
      UPDATE publish_batch_clips
      SET status = ?,
          uploaded_at = CASE WHEN ? = 'uploading' THEN datetime('now') ELSE uploaded_at END,
          published_at = CASE WHEN ? = 'published' THEN datetime('now') ELSE published_at END
      WHERE batch_id = ? AND clip_index = ?
    `;

    await db.run(sql, [status, status, status, batchId, clipIndex]);
  }

  /**
   * Set clip as uploaded to Metricool
   */
  async setClipUploaded(batchId, clipIndex, metricoolPostId) {
    const sql = `
      UPDATE publish_batch_clips
      SET status = 'waiting_confirmation',
          metricool_post_id = ?,
          uploaded_at = datetime('now'),
          attempts = attempts + 1
      WHERE batch_id = ? AND clip_index = ?
    `;

    await db.run(sql, [metricoolPostId, batchId, clipIndex]);
  }

  /**
   * Set clip as published
   */
  async setClipPublished(batchId, clipIndex, facebookPostId) {
    const sql = `
      UPDATE publish_batch_clips
      SET status = 'published',
          facebook_post_id = ?,
          published_at = datetime('now')
      WHERE batch_id = ? AND clip_index = ?
    `;

    await db.run(sql, [facebookPostId || null, batchId, clipIndex]);
  }

  /**
   * Set clip as failed
   */
  async setClipFailed(batchId, clipIndex, errorMsg) {
    const sql = `
      UPDATE publish_batch_clips
      SET status = 'failed',
          error_msg = ?,
          attempts = attempts + 1
      WHERE batch_id = ? AND clip_index = ?
    `;

    await db.run(sql, [errorMsg, batchId, clipIndex]);
  }

  /**
   * Get batch summary (for API responses)
   */
  async getBatchSummary(batchId) {
    const batch = await this.getBatch(batchId);
    if (!batch) return null;

    const clips = await this.getBatchClips(batchId);

    return {
      batchId: batch.batch_id,
      jobId: batch.job_id,
      status: batch.status,
      publishMode: batch.publish_mode,
      total: batch.total_clips,
      published: batch.published_clips,
      failed: batch.failed_clips,
      currentIndex: batch.current_clip_index,
      progress: Math.round(((batch.published_clips + batch.failed_clips) / batch.total_clips) * 100),
      scheduledFor: batch.scheduled_for,
      createdAt: batch.created_at,
      startedAt: batch.started_at,
      completedAt: batch.completed_at,
      error: batch.error_msg,
      clips: clips.map(clip => ({
        index: clip.clip_index,
        url: clip.clip_url,
        title: clip.clip_title,
        status: clip.status,
        metricoolPostId: clip.metricool_post_id,
        facebookPostId: clip.facebook_post_id,
        error: clip.error_msg,
        attempts: clip.attempts,
        uploadedAt: clip.uploaded_at,
        publishedAt: clip.published_at
      }))
    };
  }

  /**
   * Get active batches for a user
   */
  async getUserActiveBatches(userId) {
    const sql = `
      SELECT * FROM publish_batches
      WHERE user_id = ? AND status = 'processing'
      ORDER BY created_at DESC
    `;

    return await db.query(sql, [userId]);
  }

  /**
   * Get all batches (for admin/debugging)
   */
  async getAllBatches(limit = 100) {
    const sql = `
      SELECT * FROM publish_batches
      ORDER BY created_at DESC
      LIMIT ?
    `;

    return await db.query(sql, [limit]);
  }
}

module.exports = new PublishBatchesRepository();
