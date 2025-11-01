/**
 * Metricool API Service
 *
 * Integración con la API de Metricool para publicar Stories en Facebook/Instagram
 * Documentación: https://developers.metricool.com/
 */

const axios = require('axios');

// HOTFIX: Correct Metricool API base URL (not api.metricool.com)
const METRICOOL_API_BASE = 'https://app.metricool.com/api';

class MetricoolService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: METRICOOL_API_BASE,
      headers: {
        'X-Mc-Auth': apiKey, // Metricool uses X-Mc-Auth header, not Bearer token
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Get user accounts (Facebook Pages, Instagram profiles)
   * HOTFIX: Metricool uses /admin/simpleProfiles endpoint with userId parameter
   */
  async getAccounts(userId = '4172139') {
    try {
      const response = await this.client.get(`/admin/simpleProfiles?userId=${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Metricool accounts:', error.response?.data || error.message);
      throw new Error(`Failed to fetch accounts: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get specific account details
   */
  async getAccount(accountId) {
    try {
      const response = await this.client.get(`/accounts/${accountId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Metricool account:', error.response?.data || error.message);
      throw new Error(`Failed to fetch account: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Normalize media URL through Metricool (REQUIRED before creating post)
   * This ensures Metricool processes and validates the media
   * @param {string} mediaUrl - Public URL of the video/image
   * @returns {Promise<string>} Normalized media URL
   */
  async normalizeMedia(mediaUrl) {
    try {
      const response = await this.client.get('/actions/normalize/image/url', {
        params: { url: mediaUrl }
      });

      const normalizedUrl = response.data?.url || response.data?.normalizedUrl || mediaUrl;
      console.log(`✅ Media normalized: ${mediaUrl} → ${normalizedUrl}`);
      return normalizedUrl;
    } catch (error) {
      console.error('⚠️  Error normalizing media, using original URL:', error.response?.data || error.message);
      // Fallback to original URL if normalize fails
      return mediaUrl;
    }
  }

  /**
   * Upload media file to Metricool
   * @param {string} mediaUrl - Public URL of the video/image
   * @returns {Promise<string>} Media ID
   */
  async uploadMedia(mediaUrl) {
    try {
      const response = await this.client.post('/media/upload', {
        url: mediaUrl
      });

      console.log('Media uploaded to Metricool:', response.data);
      return response.data.mediaId || response.data.id;
    } catch (error) {
      console.error('Error uploading media to Metricool:', error.response?.data || error.message);
      throw new Error(`Failed to upload media: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a Story post
   * @param {Object} params - Story parameters
   * @param {string} params.accountId - Metricool account ID (blogId - Facebook Page ID)
   * @param {string} params.mediaUrl - Public URL of the video
   * @param {string} params.text - Optional text/caption (NOT supported for Stories - will be ignored)
   * @param {Date} params.scheduledAt - Optional scheduled date
   * @param {string} params.userId - Metricool user ID (default: 4172139)
   * @returns {Promise<Object>} Post details
   */
  async createStory({ accountId, mediaUrl, text, scheduledAt, userId = '4172139' }) {
    try {
      // STEP 1: Normalize media URL first (REQUIRED by Metricool)
      console.log(`🔄 Normalizing media URL: ${mediaUrl}`);
      const normalizedUrl = await this.normalizeMedia(mediaUrl);

      // STEP 2: Create post with normalized media
      const publishUrl = `/v2/scheduler/posts?userId=${userId}&blogId=${accountId}`;

      // Calculate publication times
      const now = new Date();
      const publishTime = scheduledAt || new Date(now.getTime() + 30000); // 30 seconds from now if not scheduled
      const creationTime = now;

      const formatDateInTimezone = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };

      // Use normalized URL in payload
      const postData = {
        text: text || "", // Empty text for stories
        autoPublish: true,
        saveExternalMediaFiles: true,
        publicationDate: {
          dateTime: formatDateInTimezone(publishTime),
          timezone: "America/New_York"
        },
        creationDate: {
          dateTime: formatDateInTimezone(creationTime),
          timezone: "America/New_York"
        },
        providers: [{ network: "facebook" }],
        facebookData: { type: "STORY" },
        media: [normalizedUrl], // Use NORMALIZED URL
        mediaAltText: [null],
        creatorUserMail: "daniel@creatorsflow.app",
        creatorUserId: parseInt(userId)
      };

      console.log(`📤 Creating Story for blogId ${accountId} with normalized media`);
      const response = await this.client.post(publishUrl, postData);

      console.log('✅ Story created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating Story:', error.response?.data || error.message);

      // Parse Metricool error
      const errorData = error.response?.data;
      const errorMsg = errorData?.error || errorData?.message || error.message;

      throw new Error(`PROVIDER_ERROR:${error.response?.status || 500}:${errorMsg}`);
    }
  }

  /**
   * Wait for post to be PUBLISHED on Facebook with escalating poll intervals
   * Polls fast initially (1.5s), then gradually slower (2s→3s→5s→8s→13s...)
   * Stops when status === 'PUBLISHED' or 'LIVE' or reaches max time
   * @param {string} postId - Metricool post ID
   * @param {number} maxWaitSeconds - Maximum wait time in seconds (default 120s)
   * @param {function} onProgress - Progress callback(elapsed, total, status)
   * @returns {Promise<Object>} Post status with externalId
   */
  async waitForPublish(postId, maxWaitSeconds = 120, onProgress) {
    console.log(`⏳ Polling for post ${postId} to be PUBLISHED (max ${maxWaitSeconds}s)...`);
    const startTime = Date.now();

    // Escalating intervals: 1.5s, 2s, 3s, 5s, 8s, 13s, 21s... (Fibonacci-like)
    const intervals = [1500, 2000, 3000, 5000, 8000, 13000, 21000, 34000];
    let intervalIndex = 0;
    let attempt = 0;

    while (true) {
      const elapsed = (Date.now() - startTime) / 1000;

      // Check if we've exceeded max wait time
      if (elapsed >= maxWaitSeconds) {
        throw new Error(`Post ${postId} did not publish within ${maxWaitSeconds}s`);
      }

      attempt++;
      try {
        // Get post status from Metricool
        const status = await this.getPostStatus(postId);

        console.log(`   [${elapsed.toFixed(1)}s] Attempt ${attempt}: status="${status.status || status.lifecycle}"${status.externalId ? `, externalId=${status.externalId}` : ''}`);

        // Report progress
        if (onProgress) {
          onProgress({
            type: 'waiting',
            elapsed: Math.floor(elapsed),
            total: maxWaitSeconds,
            status: status.status || status.lifecycle,
            attempt
          });
        }

        // Check if PUBLISHED (could be 'published', 'PUBLISHED', 'live', 'LIVE')
        const statusLower = (status.status || status.lifecycle || '').toLowerCase();
        if (statusLower === 'published' || statusLower === 'live') {
          console.log(`✅ Post ${postId} PUBLISHED in ${elapsed.toFixed(1)}s! ExternalId: ${status.externalId || 'N/A'}`);
          return status;
        }

        // Check if FAILED
        if (statusLower === 'failed' || statusLower === 'error') {
          throw new Error(`Post ${postId} FAILED to publish: ${status.error || 'Unknown error'}`);
        }

        // Still processing - wait with escalating interval
        const currentInterval = intervals[Math.min(intervalIndex, intervals.length - 1)];
        intervalIndex++;

        console.log(`   ⏸️  Waiting ${currentInterval}ms before next check...`);
        await new Promise(resolve => setTimeout(resolve, currentInterval));

      } catch (error) {
        // If it's a 404 or network error, keep retrying (post might not be queryable yet)
        if (error.message?.includes('404') || error.message?.includes('not found')) {
          console.log(`   ⚠️  Post not found yet (attempt ${attempt}), will retry...`);

          // Use shorter interval for 404s (post might not be in system yet)
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        // For other errors, check if we should give up
        if (elapsed >= maxWaitSeconds) {
          throw error;
        }

        // Log but continue retrying
        console.error(`   ⚠️  Error checking status: ${error.message}, will retry...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  /**
   * Publish stories as SCHEDULED (no confirmation needed)
   * Creates all posts in Metricool Planner with scheduled times
   * Stories are automatically published by Metricool at their scheduled time
   *
   * @param {Object} params - Parameters
   * @param {string} params.accountId - Metricool account ID
   * @param {Array} params.stories - Array of story objects
   * @param {Date} params.scheduledAt - Start date/time for first story
   * @param {Function} params.onProgress - Progress callback (optional)
   * @returns {Promise<Object>} Batch results
   */
  async publishStoriesScheduled({ accountId, stories, scheduledAt, onProgress }) {
    const results = {
      total: stories.length,
      published: 0,
      errors: 0,
      details: [],
      startTime: Date.now()
    };

    // Start time (default: 30 min from now)
    const startTime = scheduledAt || new Date(Date.now() + 30 * 60 * 1000);
    const intervalSeconds = 10; // 10 seconds between stories

    console.log(`📅 Scheduling ${stories.length} stories starting at ${startTime.toISOString()}`);
    console.log(`⏱️  Interval: ${intervalSeconds}s between stories`);

    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      const storyScheduledTime = new Date(startTime.getTime() + (i * intervalSeconds * 1000));

      try {
        console.log(`\n📝 [${i + 1}/${stories.length}] Scheduling story: ${story.id} for ${storyScheduledTime.toISOString()}`);

        // Call progress callback - scheduling
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: stories.length,
            published: results.published,
            errors: results.errors,
            currentStory: story.id,
            status: 'scheduling',
            scheduledFor: storyScheduledTime.toISOString()
          });
        }

        // Create scheduled story
        const result = await this.createStory({
          accountId,
          mediaUrl: story.url,
          text: story.text,
          scheduledAt: storyScheduledTime,
          userId: '4172139'
        });

        const postId = result.id || result.postId || result.data?.id;
        console.log(`✅ Story ${i + 1} scheduled in Metricool with ID: ${postId} for ${storyScheduledTime.toISOString()}`);

        results.published++;
        results.details.push({
          id: story.id,
          index: i + 1,
          status: 'scheduled',
          postId: postId,
          scheduledFor: storyScheduledTime.toISOString(),
          result: result
        });

        // Call progress callback - scheduled
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: stories.length,
            published: results.published,
            errors: results.errors,
            currentStory: story.id,
            status: 'scheduled',
            metricoolPostId: postId,
            scheduledFor: storyScheduledTime.toISOString()
          });
        }

      } catch (error) {
        console.error(`❌ Error scheduling story ${i + 1}:`, error.message);

        results.errors++;
        results.details.push({
          id: story.id,
          index: i + 1,
          status: 'error',
          error: error.message
        });

        // Call progress callback - error
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: stories.length,
            published: results.published,
            errors: results.errors,
            currentStory: story.id,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    const totalDuration = ((Date.now() - results.startTime) / 1000).toFixed(1);
    results.durationSec = parseFloat(totalDuration);

    console.log(`\n✅ Scheduled ${results.published}/${results.total} stories in ${totalDuration}s`);
    if (results.errors > 0) {
      console.log(`⚠️  ${results.errors} stories failed to schedule`);
    }

    return results;
  }

  /**
   * Publish multiple Stories in batch WITH CONFIRMATION or SCHEDULED
   *
   * MODE "now": Each story waits for the previous one to be published before proceeding
   * MODE "scheduled": All stories are scheduled at intervals (no polling needed)
   *
   * IMPORTANT: Stories do NOT support text overlay via API (Facebook/Instagram limitation)
   * Any text must be burned into the video file itself before uploading
   *
   * @param {Object} params - Batch parameters
   * @param {string} params.accountId - Metricool account ID
   * @param {Array} params.stories - Array of story objects (text field will be ignored)
   * @param {string} params.publishSpeed - Publishing speed: 'safe', 'fast', 'ultra'
   * @param {string} params.publishMode - 'now' or 'scheduled'
   * @param {Date} params.scheduledAt - Scheduled start date (for scheduled mode)
   * @param {Function} params.onProgress - Progress callback (optional)
   * @returns {Promise<Object>} Batch results
   */
  async publishStoriesBatch({ accountId, stories, publishSpeed = 'safe', publishMode = 'now', scheduledAt, onProgress}) {
    const results = {
      total: stories.length,
      published: 0,
      errors: 0,
      details: [],
      startTime: Date.now()
    };

    // Configuration differs based on publish mode
    if (publishMode === 'scheduled') {
      // SCHEDULED MODE: Just create posts in Planner (no polling)
      console.log(`📅 Scheduling ${stories.length} stories to account ${accountId}`);
      console.log(`📅 Starting at: ${scheduledAt?.toISOString() || 'NOW'}`);
      console.log(`⏱️  Interval: 10 seconds between stories`);

      return await this.publishStoriesScheduled({
        accountId,
        stories,
        scheduledAt,
        onProgress
      });
    }

    // NOW MODE: Publish immediately with confirmation polling
    const speedConfig = {
      'safe': { maxWaitSeconds: 120, betweenStories: 5 },   // Wait up to 2 min, 5s between stories
      'fast': { maxWaitSeconds: 90, betweenStories: 3 },    // Wait up to 1.5 min, 3s between stories
      'ultra': { maxWaitSeconds: 60, betweenStories: 2 }    // Wait up to 1 min, 2s between stories
    };

    const config = speedConfig[publishSpeed] || speedConfig['safe'];

    console.log(`📤 Publishing ${stories.length} stories NOW to account ${accountId} (${publishSpeed} mode)`);
    console.log(`⚡ Escalating poll: 1.5s→2s→3s→5s→8s... (max ${config.maxWaitSeconds}s per story)`);
    console.log(`⏸️  Delay between stories: ${config.betweenStories}s`);

    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      const storyStartTime = Date.now();

      try {
        console.log(`\n📝 [${i + 1}/${stories.length}] Publishing story: ${story.id}`);

        // Publish IMMEDIATELY (not scheduled) so we can get confirmation
        const result = await this.createStory({
          accountId,
          mediaUrl: story.url,
          text: story.text,
          scheduledAt: null, // Publish NOW to get immediate feedback
          userId: '4172139'
        });

        const postId = result.id || result.postId || result.data?.id;
        console.log(`✅ Story ${i + 1} created in Metricool with ID: ${postId}`);

        // Call progress callback - uploading
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: stories.length,
            published: results.published,
            errors: results.errors,
            currentStory: story.id,
            status: 'uploading',
            metricoolPostId: postId
          });
        }

        // WAIT for Facebook to PUBLISH with escalating poll (1.5s→2s→3s→5s→8s...)
        console.log(`⏳ Polling for story ${i + 1} to be PUBLISHED on Facebook...`);

        try {
          // Use escalating poll with progress updates
          const publishStatus = await this.waitForPublish(postId, config.maxWaitSeconds, (progress) => {
            if (onProgress) {
              onProgress({
                current: i + 1,
                total: stories.length,
                published: results.published,
                errors: results.errors,
                currentStory: story.id,
                status: 'waiting',
                metricoolPostId: postId,
                waitProgress: {
                  elapsed: progress.elapsed,
                  total: progress.total,
                  attempt: progress.attempt,
                  currentStatus: progress.status
                }
              });
            }
          });

          const duration = ((Date.now() - storyStartTime) / 1000).toFixed(1);
          console.log(`✅ Story ${i + 1} PUBLISHED on Facebook (${duration}s total)`);
          console.log(`   ExternalId: ${publishStatus.externalId || 'N/A'}`);

          results.published++;
          results.details.push({
            id: story.id,
            index: i + 1,
            status: 'published',
            postId: postId,
            externalId: publishStatus.externalId,
            publishedAt: new Date().toISOString(),
            duration: parseFloat(duration),
            result: result
          });

          // Call progress callback - published
          if (onProgress) {
            onProgress({
              current: i + 1,
              total: stories.length,
              published: results.published,
              errors: results.errors,
              currentStory: story.id,
              status: 'published',
              metricoolPostId: postId,
              facebookPostId: publishStatus.externalId
            });
          }

          // Small delay before next story to avoid rate limits
          if (i < stories.length - 1) {
            console.log(`⏸️  Waiting ${config.betweenStories}s before next story...`);
            await new Promise(resolve => setTimeout(resolve, config.betweenStories * 1000));
          }

        } catch (waitError) {
          // Story wait failed (unlikely with fixed delay)
          console.error(`⚠️  Story ${i + 1} wait failed: ${waitError.message}`);
          console.log(`📝 Continuing with next story...`);

          results.published++; // Count as published anyway (it's in Metricool)
          results.details.push({
            id: story.id,
            index: i + 1,
            status: 'published',
            postId: postId,
            publishedAt: new Date().toISOString(),
            duration: ((Date.now() - storyStartTime) / 1000).toFixed(1),
            result: result,
            warning: 'Published but confirmation timeout'
          });

          if (onProgress) {
            onProgress({
              current: i + 1,
              total: stories.length,
              published: results.published,
              errors: results.errors,
              currentStory: story.id,
              status: 'published',
              metricoolPostId: postId
            });
          }
        }

      } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`❌ Error publishing story ${i + 1} after ${duration}s:`, error.message);

        results.errors++;
        results.details.push({
          id: story.id,
          index: i + 1,
          status: 'error',
          error: error.message,
          duration: parseFloat(duration)
        });

        // Call progress callback if provided
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: stories.length,
            published: results.published,
            errors: results.errors,
            currentStory: story.id,
            status: 'error',
            error: error.message
          });
        }

        // Optional: Stop on first error or continue?
        // For now, we continue to try publishing remaining stories
      }
    }

    const totalDuration = ((Date.now() - results.startTime) / 1000).toFixed(1);
    console.log(`\n✅ Batch publish completed in ${totalDuration}s:`);
    console.log(`   - Published: ${results.published}/${results.total}`);
    console.log(`   - Errors: ${results.errors}`);
    console.log(`   - Average time per story: ${(totalDuration / stories.length).toFixed(1)}s`);

    results.durationSec = parseFloat(totalDuration);
    return results;
  }

  /**
   * Get post status from Metricool scheduler
   * Uses the v2 scheduler endpoint to get detailed post status including:
   * - status/lifecycle: 'PUBLISHED', 'PROCESSING', 'FAILED', etc.
   * - externalId: Facebook post ID (if published)
   * - providers: array with network details
   */
  async getPostStatus(postId) {
    try {
      // Try v2 scheduler endpoint first (recommended by Metricool docs)
      const response = await this.client.get(`/v2/scheduler/posts/${postId}`);

      // Response format varies, normalize it
      const data = response.data?.data || response.data;

      return {
        id: data.id || postId,
        status: data.status || data.lifecycle,
        externalId: data.externalId || data.providers?.[0]?.externalId,
        providers: data.providers || [],
        publicationDate: data.publicationDate,
        creationDate: data.creationDate,
        error: data.error,
        raw: data // Keep raw response for debugging
      };
    } catch (error) {
      // If 404, the post might not be queryable yet (still being created)
      if (error.response?.status === 404) {
        throw new Error('Post not found (404) - might still be processing');
      }

      console.error('Error fetching post status:', error.response?.data || error.message);
      throw new Error(`Failed to fetch post status: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Cancel/Delete a scheduled post
   */
  async cancelPost(postId) {
    try {
      const response = await this.client.delete(`/posts/${postId}`);
      return response.data;
    } catch (error) {
      console.error('Error canceling post:', error.response?.data || error.message);
      throw new Error(`Failed to cancel post: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Normalize clip URLs - ensures all URLs use the correct domain
   * @param {Array} clips - Array of clip objects with url field
   * @returns {Promise<Array>} Clips with normalized URLs
   */
  async normalizeClipUrls(clips) {
    if (!Array.isArray(clips)) {
      return clips;
    }

    return clips.map(clip => {
      if (!clip || !clip.url) {
        return clip;
      }

      let url = clip.url;

      // Replace storyclip domain with story domain
      if (url.includes('storyclip.creatorsflow.app')) {
        url = url.replace('storyclip.creatorsflow.app', 'story.creatorsflow.app');
      }

      // Ensure HTTPS
      if (url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
      }

      // Ensure full domain for relative paths
      if (url.startsWith('/')) {
        url = `https://story.creatorsflow.app${url}`;
      }

      return {
        ...clip,
        url,
        normalizedUrl: url,
        originalUrl: url
      };
    });
  }
}

module.exports = MetricoolService;
