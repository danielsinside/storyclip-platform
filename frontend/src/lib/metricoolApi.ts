/**
 * Metricool API Client
 * Documentation: https://app.metricool.com/api
 */

const METRICOOL_BASE_URL = 'https://app.metricool.com/api';

export interface MetricoolConfig {
  userToken: string;
  userId: string;
  blogId: string;
}

export interface MetricoolNormalizeResponse {
  url: string;
  thumbnail?: string;
}

export interface MetricoolPostProvider {
  network: 'facebook' | 'instagram';
  account?: string;
}

export interface MetricoolPostRequest {
  publicationDate?: {
    dateTime: string; // Format: "2024-02-05T13:24:00"
    timezone: string; // e.g., "Europe/Madrid"
  };
  creationDate: {
    dateTime: string;
    timezone: string;
  };
  text?: string; // Facebook Stories no soportan caption
  firstCommentText?: string;
  providers: MetricoolPostProvider[];
  media?: Array<{
    url: string;
    type: 'image' | 'video';
  }>;
  autoPublish: boolean;
  saveExternalMediaFiles: boolean;
  shortener: boolean;
  draft: boolean;
  facebookData?: {
    type: 'STORY' | 'POST' | 'REEL';
  };
  hasNotReadNotes?: boolean;
  creatorUserMail?: string;
  creatorUserId?: string;
}

export interface MetricoolPostResponse {
  success: boolean;
  postId?: string;
  error?: string;
  message?: string;
}

export interface MetricoolPostStatus {
  id: string;
  status: string;
  lifecycle?: string;
  externalId?: string;
  providers?: any[];
  publicationDate?: string;
  creationDate?: string;
  error?: string;
}

export class MetricoolAPI {
  private config: MetricoolConfig;

  constructor(config: MetricoolConfig) {
    this.config = config;
  }

  /**
   * Build URL with auth query parameters
   */
  private buildUrl(endpoint: string): string {
    const url = new URL(`${METRICOOL_BASE_URL}${endpoint}`);
    url.searchParams.set('userId', this.config.userId);
    url.searchParams.set('blogId', this.config.blogId);
    return url.toString();
  }

  /**
   * Build headers with authentication
   */
  private buildHeaders(): HeadersInit {
    return {
      'X-Mc-Auth': this.config.userToken,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Normalize/upload media to Metricool servers
   * Required before creating posts with media
   * For videos, use /actions/normalize/video/url
   */
  async normalizeMedia(mediaUrl: string, isVideo: boolean = true): Promise<MetricoolNormalizeResponse> {
    const type = isVideo ? 'video' : 'image';
    const endpoint = `/actions/normalize/${type}/url?url=${encodeURIComponent(mediaUrl)}`;
    const url = this.buildUrl(endpoint);

    console.log(`🔄 Normalizing ${type}:`, mediaUrl);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Metricool normalize failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Media normalized:', data);
      return data;
    } catch (error) {
      console.error('❌ Error normalizing media:', error);
      throw error;
    }
  }

  /**
   * Create a scheduled post (Story for Facebook)
   */
  async createPost(request: MetricoolPostRequest): Promise<MetricoolPostResponse> {
    const endpoint = '/v2/scheduler/posts';
    const url = this.buildUrl(endpoint);

    console.log('📤 Creating Metricool post:', {
      providers: request.providers,
      mediaCount: request.media?.length || 0,
      autoPublish: request.autoPublish,
      publicationDate: request.publicationDate,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Metricool post creation failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Post created:', data);
      return {
        success: true,
        postId: data.id || data.postId,
        ...data,
      };
    } catch (error) {
      console.error('❌ Error creating post:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get post status by ID
   * Used to monitor real-time publication status
   */
  async getPostStatus(postId: string): Promise<MetricoolPostStatus> {
    const endpoint = `/v2/scheduler/posts/${postId}`;
    const url = this.buildUrl(endpoint);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get post status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const data = result.data || result;

      return {
        id: data.id || postId,
        status: data.status || data.lifecycle || 'unknown',
        lifecycle: data.lifecycle,
        externalId: data.externalId || data.providers?.[0]?.externalId,
        providers: data.providers || [],
        publicationDate: data.publicationDate,
        creationDate: data.creationDate,
        error: data.error,
      };
    } catch (error) {
      console.error('❌ Error getting post status:', error);
      throw error;
    }
  }

  /**
   * Wait for post to reach "published" status with real-time monitoring
   * @param postId - The post ID to monitor
   * @param maxWaitMs - Maximum time to wait (default: 120000ms = 2 minutes)
   * @param pollIntervalMs - How often to check status (default: 2000ms = 2 seconds)
   * @returns true if published, false if timeout
   */
  async waitForPublished(
    postId: string,
    maxWaitMs: number = 120000,
    pollIntervalMs: number = 2000
  ): Promise<boolean> {
    const startTime = Date.now();

    console.log(`⏰ Monitoring post ${postId} for "published" status...`);

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const status = await this.getPostStatus(postId);
        console.log(`📊 Post ${postId} status: ${status.status} (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);

        // Check if published (Metricool uses "published" or "PUBLISHED")
        if (status.status.toLowerCase() === 'published') {
          console.log(`✅ Post ${postId} is now PUBLISHED!`);
          return true;
        }

        // Check for error states
        if (status.status.toLowerCase().includes('error') || status.status.toLowerCase().includes('failed')) {
          console.error(`❌ Post ${postId} failed with status: ${status.status}`);
          throw new Error(`Post failed: ${status.status} - ${status.error || 'Unknown error'}`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

      } catch (error) {
        // If we can't get status (404, etc), wait a bit and try again
        console.warn(`⚠️ Error checking status, will retry: ${error}`);
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      }
    }

    console.warn(`⏰ Timeout waiting for post ${postId} to be published after ${maxWaitMs}ms`);
    return false;
  }

  /**
   * Publish a single Facebook Story immediately
   */
  async publishStoryNow(
    videoUrl: string,
    facebookAccount?: string
  ): Promise<MetricoolPostResponse> {
    // Step 1: Normalize media
    const normalizedMedia = await this.normalizeMedia(videoUrl);

    // Step 2: Create Story post with "publish now"
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const request: MetricoolPostRequest = {
      creationDate: {
        dateTime: now.toISOString().slice(0, 19),
        timezone,
      },
      // No publicationDate = publish immediately
      text: '', // Facebook Stories no soportan caption
      firstCommentText: '',
      providers: [
        {
          network: 'facebook',
          ...(facebookAccount ? { account: facebookAccount } : {}),
        },
      ],
      media: [
        {
          url: normalizedMedia.url,
          type: 'video',
        },
      ],
      autoPublish: true,
      saveExternalMediaFiles: false,
      shortener: false,
      draft: false,
      facebookData: {
        type: 'STORY',
      },
      hasNotReadNotes: false,
      creatorUserId: this.config.userId,
    };

    return this.createPost(request);
  }

  /**
   * Schedule a Facebook Story for future publication
   */
  async scheduleStory(
    videoUrl: string,
    publicationDate: Date,
    facebookAccount?: string
  ): Promise<MetricoolPostResponse> {
    // Step 1: Normalize media
    const normalizedMedia = await this.normalizeMedia(videoUrl);

    // Step 2: Create scheduled Story post
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const request: MetricoolPostRequest = {
      publicationDate: {
        dateTime: publicationDate.toISOString().slice(0, 19),
        timezone,
      },
      creationDate: {
        dateTime: now.toISOString().slice(0, 19),
        timezone,
      },
      text: '',
      firstCommentText: '',
      providers: [
        {
          network: 'facebook',
          ...(facebookAccount ? { account: facebookAccount } : {}),
        },
      ],
      media: [
        {
          url: normalizedMedia.url,
          type: 'video',
        },
      ],
      autoPublish: true,
      saveExternalMediaFiles: false,
      shortener: false,
      draft: false,
      facebookData: {
        type: 'STORY',
      },
      hasNotReadNotes: false,
      creatorUserId: this.config.userId,
    };

    return this.createPost(request);
  }

  /**
   * Publish multiple Stories sequentially (maintaining order)
   */
  async publishStoriesSequentially(
    videoUrls: string[],
    publishNow: boolean = true,
    startDate?: Date,
    intervalMinutes: number = 1,
    facebookAccount?: string
  ): Promise<{ success: boolean; results: MetricoolPostResponse[]; errors: string[] }> {
    console.log(`📚 Publishing ${videoUrls.length} stories sequentially...`);
    console.log(`⏰ Mode: ${publishNow ? 'PUBLISH NOW' : 'SCHEDULED'}`);

    const results: MetricoolPostResponse[] = [];
    const errors: string[] = [];

    for (let i = 0; i < videoUrls.length; i++) {
      const videoUrl = videoUrls[i];
      console.log(`\n📹 Publishing story ${i + 1}/${videoUrls.length}: ${videoUrl}`);

      try {
        let result: MetricoolPostResponse;

        if (publishNow) {
          // Publish immediately, but wait between each to maintain order
          result = await this.publishStoryNow(videoUrl, facebookAccount);

          // Wait a bit before next story to ensure order
          if (i < videoUrls.length - 1) {
            console.log('⏳ Waiting 5 seconds before next story...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } else {
          // Schedule with incremental time
          const publicationDate = new Date(startDate || new Date());
          publicationDate.setMinutes(publicationDate.getMinutes() + (i * intervalMinutes));

          result = await this.scheduleStory(videoUrl, publicationDate, facebookAccount);
        }

        results.push(result);

        if (!result.success) {
          errors.push(`Story ${i + 1}: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error publishing story ${i + 1}:`, error);
        errors.push(`Story ${i + 1}: ${errorMsg}`);
        results.push({
          success: false,
          error: errorMsg,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\n✅ Published ${successCount}/${videoUrls.length} stories successfully`);

    if (errors.length > 0) {
      console.error('❌ Errors:', errors);
    }

    return {
      success: successCount === videoUrls.length,
      results,
      errors,
    };
  }
}

/**
 * Create Metricool API instance
 * Configuration should be loaded from environment variables or settings
 */
export function createMetricoolClient(config: MetricoolConfig): MetricoolAPI {
  return new MetricoolAPI(config);
}
