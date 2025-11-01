import { supabase } from "@/integrations/supabase/client";

export type PublishInput = {
  mediaUrl: string;
  caption?: string;
  scheduledAt?: string | null;
  userId?: string;
  blogId?: string;
};

// Generate idempotency key to prevent duplicate submissions
function generateIdempotencyKey(): string {
  return `storyclip-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
}

export async function publishStory(input: PublishInput) {
  console.log('📤 Publishing story:', input);
  
  // Input validation
  if (!input.mediaUrl || typeof input.mediaUrl !== 'string') {
    throw new Error('mediaUrl is required and must be a string');
  }
  
  if (!input.mediaUrl.startsWith('http://') && !input.mediaUrl.startsWith('https://')) {
    throw new Error('mediaUrl must be a valid HTTP(S) URL');
  }
  
  const idempotencyKey = generateIdempotencyKey();
  
  const { data, error } = await supabase.functions.invoke("metricool-publish", {
    body: {
      target: "facebook_story",
      mediaUrl: input.mediaUrl,
      caption: input.caption ?? "",
      scheduledAt: input.scheduledAt ?? null,
      userId: input.userId,
      blogId: input.blogId,
      idempotencyKey
    },
  });
  
  if (error) {
    console.error('❌ Publish error:', error);
    throw new Error(error.message || "Edge function error");
  }
  
  console.log('✅ Publish response:', data);
  
  return data as {
    publishId: string;
    status: "queued" | "sent" | "published" | "failed" | "retrying";
    providerId?: string;
    idempotencyKey?: string;
    error?: { code: string; message: string };
  };
}

export async function getMetricoolStatus(postId: string, userId?: string, blogId?: string) {
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/metricool-status`);
  if (userId) url.searchParams.set("userId", userId);
  if (blogId) url.searchParams.set("blogId", blogId);
  url.searchParams.set("postId", postId);
  
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(await response.text());
  
  return response.json() as Promise<{ status: string; data: any }>;
}
