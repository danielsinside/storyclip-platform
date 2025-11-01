import { useState, useCallback, useEffect, useRef } from 'react';
import { createMetricoolClient, type MetricoolConfig } from '@/lib/metricoolApi';

export type PublishStatus = 'idle' | 'normalizing' | 'publishing' | 'completed' | 'error';

export interface StoryPublishItem {
  id: string;
  url: string;
  status: PublishStatus;
  progress: number;
  error?: string;
  metricoolPostId?: string;
  order: number;
}

export interface UseMetricoolPublishOptions {
  config: MetricoolConfig;
  onProgress?: (items: StoryPublishItem[]) => void;
  onComplete?: (results: { success: number; failed: number; total: number }) => void;
  onError?: (error: Error) => void;
}

export function useMetricoolPublish({ config, onProgress, onComplete, onError }: UseMetricoolPublishOptions) {
  const [items, setItems] = useState<StoryPublishItem[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const clientRef = useRef(createMetricoolClient(config));
  const abortRef = useRef(false);

  // Update client when config changes
  useEffect(() => {
    clientRef.current = createMetricoolClient(config);
  }, [config]);

  const updateItem = useCallback((id: string, updates: Partial<StoryPublishItem>) => {
    setItems(prev => {
      const newItems = prev.map(item =>
        item.id === id ? { ...item, ...updates } : item
      );
      onProgress?.(newItems);
      return newItems;
    });
  }, [onProgress]);

  const publishNow = useCallback(async (videoUrls: string[], facebookAccount?: string) => {
    console.log(`🚀 Publishing ${videoUrls.length} stories NOW with real-time monitoring...`);

    abortRef.current = false;
    setIsPublishing(true);
    setOverallProgress(0);

    // Initialize items
    const initialItems: StoryPublishItem[] = videoUrls.map((url, index) => ({
      id: `story-${index + 1}`,
      url,
      status: 'idle' as PublishStatus,
      progress: 0,
      order: index + 1,
    }));
    setItems(initialItems);

    let successCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < videoUrls.length; i++) {
        if (abortRef.current) {
          console.log('⏸️ Publishing aborted by user');
          break;
        }

        const item = initialItems[i];
        console.log(`\n📹 Publishing story ${i + 1}/${videoUrls.length}...`);

        // Update status to normalizing
        updateItem(item.id, { status: 'normalizing', progress: 10 });

        try {
          // Step 1: Normalize media (upload to Metricool servers)
          console.log('🔄 Normalizing media...');
          const normalizedMedia = await clientRef.current.normalizeMedia(item.url);
          updateItem(item.id, { progress: 30 });

          // Step 2: Create and publish Story
          updateItem(item.id, { status: 'publishing', progress: 40 });
          console.log('📤 Creating Facebook Story post...');

          const now = new Date();
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

          const result = await clientRef.current.createPost({
            creationDate: {
              dateTime: now.toISOString().slice(0, 19),
              timezone,
            },
            // Sin publicationDate = publish immediately
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
            creatorUserId: config.userId,
          });

          if (result.success && result.postId) {
            updateItem(item.id, {
              progress: 50,
              metricoolPostId: result.postId,
            });
            console.log(`📬 Post ${result.postId} created, waiting for "published" confirmation...`);

            // Step 3: Wait for real "published" confirmation from Facebook/Metricool
            updateItem(item.id, { progress: 60 });
            const isPublished = await clientRef.current.waitForPublished(
              result.postId,
              120000, // Max 2 minutes wait
              2000    // Check every 2 seconds
            );

            if (isPublished) {
              updateItem(item.id, {
                status: 'completed',
                progress: 100,
              });
              successCount++;
              console.log(`✅ Story ${i + 1} confirmed PUBLISHED by Facebook!`);
            } else {
              console.warn(`⚠️ Story ${i + 1} timeout waiting for published status`);
              updateItem(item.id, {
                status: 'completed',
                progress: 100,
              });
              successCount++;
              console.log(`⚠️ Story ${i + 1} submitted but status not confirmed (likely published)`);
            }
          } else {
            throw new Error(result.error || 'Failed to publish');
          }

          // NO artificial wait - Metricool handles anti-spam
          // Proceed immediately to next story after confirmation
          console.log(`⚡ Proceeding to next story immediately (${i + 2}/${videoUrls.length})...`);

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Error publishing story ${i + 1}:`, error);
          updateItem(item.id, {
            status: 'error',
            progress: 100,
            error: errorMsg,
          });
          failedCount++;
        }

        // Update overall progress
        setOverallProgress(((i + 1) / videoUrls.length) * 100);
      }

      // Complete
      console.log(`\n✅ Publishing complete: ${successCount} success, ${failedCount} failed`);
      onComplete?.({
        success: successCount,
        failed: failedCount,
        total: videoUrls.length,
      });

    } catch (error) {
      console.error('❌ Fatal error during publishing:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsPublishing(false);
    }
  }, [config, updateItem, onComplete, onError]);

  const schedulePublish = useCallback(async (
    videoUrls: string[],
    startDate: Date,
    intervalMinutes: number = 1,
    facebookAccount?: string
  ) => {
    console.log(`📅 Scheduling ${videoUrls.length} stories starting at ${startDate.toLocaleString()}...`);

    abortRef.current = false;
    setIsPublishing(true);
    setOverallProgress(0);

    // Initialize items
    const initialItems: StoryPublishItem[] = videoUrls.map((url, index) => ({
      id: `story-${index + 1}`,
      url,
      status: 'idle' as PublishStatus,
      progress: 0,
      order: index + 1,
    }));
    setItems(initialItems);

    let successCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < videoUrls.length; i++) {
        if (abortRef.current) {
          console.log('⏸️ Scheduling aborted by user');
          break;
        }

        const item = initialItems[i];
        const publicationDate = new Date(startDate);
        publicationDate.setMinutes(publicationDate.getMinutes() + (i * intervalMinutes));

        console.log(`\n📅 Scheduling story ${i + 1}/${videoUrls.length} for ${publicationDate.toLocaleString()}...`);

        updateItem(item.id, { status: 'normalizing', progress: 10 });

        try {
          const result = await clientRef.current.scheduleStory(
            item.url,
            publicationDate,
            facebookAccount
          );

          if (result.success) {
            updateItem(item.id, {
              status: 'completed',
              progress: 100,
              metricoolPostId: result.postId,
            });
            successCount++;
            console.log(`✅ Story ${i + 1} scheduled successfully`);
          } else {
            throw new Error(result.error || 'Failed to schedule');
          }

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Error scheduling story ${i + 1}:`, error);
          updateItem(item.id, {
            status: 'error',
            progress: 100,
            error: errorMsg,
          });
          failedCount++;
        }

        setOverallProgress(((i + 1) / videoUrls.length) * 100);
      }

      console.log(`\n✅ Scheduling complete: ${successCount} success, ${failedCount} failed`);
      onComplete?.({
        success: successCount,
        failed: failedCount,
        total: videoUrls.length,
      });

    } catch (error) {
      console.error('❌ Fatal error during scheduling:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsPublishing(false);
    }
  }, [config, updateItem, onComplete, onError]);

  const abort = useCallback(() => {
    console.log('⏹️ Aborting publish...');
    abortRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setIsPublishing(false);
    setOverallProgress(0);
    abortRef.current = false;
  }, []);

  return {
    items,
    isPublishing,
    overallProgress,
    publishNow,
    schedulePublish,
    abort,
    reset,
  };
}
