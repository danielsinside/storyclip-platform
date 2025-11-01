import { z } from 'zod';

// Profile validation schema
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  timezone: z.string().max(50, "Timezone must be less than 50 characters"),
  seed: z.enum(['natural', 'viral', 'cinematica', 'humor', 'impacto'], {
    errorMap: () => ({ message: "Invalid seed type" })
  }),
  delay_mode: z.enum(['HYPE', 'FAST', 'NATURAL', 'PRO'], {
    errorMap: () => ({ message: "Invalid delay mode" })
  }),
  safe_hours_start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format"),
  safe_hours_end: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format"),
  allow_flip: z.boolean(),
  metricool_brand_id: z.string().max(50, "Brand ID must be less than 50 characters").optional().or(z.literal('')),
});

// Video session validation schema
export const sessionSchema = z.object({
  filename: z.string().max(255).optional(),
  filesize: z.number().int().positive().max(5000000000).optional(), // Max 5GB
  duration: z.number().int().positive().max(7200).optional(), // Max 2 hours
  videoUrl: z.string().url().max(500).optional(),
  seed: z.string().max(50).optional(),
  delayMode: z.string().max(50).optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  keywords: z.string().max(500).optional(),
  ambientNoise: z.boolean().optional(),
  amplitude: z.number().min(0).max(2).optional(),
  cutStart: z.number().min(0).max(7200).optional(),
  cutEnd: z.number().min(0).max(7200).optional(),
  audioUnique: z.boolean().optional(),
  audioMode: z.string().max(50).optional(),
  audioScope: z.string().max(50).optional(),
  audioSeed: z.string().max(50).optional(),
  clipIndicator: z.string().max(50).optional(),
  indicatorPosition: z.string().max(50).optional(),
  indicatorSize: z.number().int().min(10).max(200).optional(),
  indicatorTextColor: z.string().max(50).optional(),
  indicatorBgColor: z.string().max(50).optional(),
  indicatorOpacity: z.number().min(0).max(1).optional(),
  indicatorStyle: z.string().max(50).optional(),
  filterType: z.string().max(50).optional(),
  filterIntensity: z.number().min(0).max(100).optional(),
  customFilterCss: z.string().max(2000).optional(),
  customFilterName: z.string().max(100).optional(),
  overlayType: z.string().max(50).optional(),
  overlayIntensity: z.number().min(0).max(100).optional(),
  customOverlayName: z.string().max(100).optional(),
  customOverlayConfig: z.any().optional(),
  horizontalFlip: z.boolean().optional(),
  cameraZoom: z.boolean().optional(),
  cameraZoomDuration: z.number().positive().max(60).optional(),
  cameraPan: z.boolean().optional(),
  cameraTilt: z.boolean().optional(),
  cameraRotate: z.boolean().optional(),
  cameraDolly: z.boolean().optional(),
  cameraShake: z.boolean().optional(),
  manualClips: z.array(z.object({
    start: z.number().min(0).max(7200),
    end: z.number().min(0).max(7200)
  })).max(100).optional(),
  status: z.string().max(50).optional(),
  jobId: z.string().max(100).optional(),
});

// Publish payload validation schema
export const publishSchema = z.object({
  posts: z.array(z.object({
    blogId: z.string().min(1, "Blog ID is required").max(100),
    normalizedUrl: z.string().url("Invalid URL format").max(1000),
    message: z.string().max(2000, "Message must be less than 2000 characters"),
    publishAt: z.string().datetime().nullable().optional()
  })).min(1, "At least one post is required").max(100, "Maximum 100 posts allowed"),
  defaultBlogId: z.string().max(100).optional(),
  delayMode: z.enum(['NATURAL', 'FIXED', 'RANDOM', 'HYPE', 'FAST', 'PRO']).optional(),
  userId: z.string().max(100).optional()
});

export type ProfileFormData = z.infer<typeof profileSchema>;
export type VideoSessionData = z.infer<typeof sessionSchema>;
export type PublishPayload = z.infer<typeof publishSchema>;
