import { useState } from "react";
import { publishStory } from "@/lib/publishClient";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addPublishRecord } from "@/components/PublishHistory";

type Props = {
  mediaUrl: string;
  caption?: string;
  userId?: string;
  blogId?: string;
  disabled?: boolean;
};

export default function PublishButton({ mediaUrl, caption, userId, blogId, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [publishId, setPublishId] = useState<string>();
  const [status, setStatus] = useState<string>();
  const { toast } = useToast();

  async function onPublish() {
    setLoading(true);
    try {
      const res = await publishStory({ 
        mediaUrl, 
        caption, 
        userId, 
        blogId, 
        scheduledAt: null 
      });
      
      setPublishId(res.publishId);
      setStatus(res.status);
      
      // Add to history
      addPublishRecord({
        publishId: res.publishId,
        idempotencyKey: res.idempotencyKey,
        mediaUrl,
        caption,
        status: res.status,
        providerId: res.providerId
      });
      
      toast({
        title: "Story publicada",
        description: `Estado: ${res.status}${res.providerId ? ` · ID: ${res.providerId}` : ""}`,
      });
    } catch (e: any) {
      console.error("Publish error:", e);
      
      // Add error to history
      addPublishRecord({
        publishId: `error-${Date.now()}`,
        mediaUrl,
        caption,
        status: 'failed',
        error: e?.message
      });
      
      toast({
        title: "Error al publicar",
        description: e?.message || "No se pudo publicar la story",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button 
        onClick={onPublish} 
        disabled={loading || !mediaUrl || disabled}
        size="sm"
        className="w-full text-xs h-7"
      >
        {loading ? (
          <>
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            Publicando…
          </>
        ) : (
          <>
            <Send className="w-3 h-3 mr-1.5" />
            Publicar Story
          </>
        )}
      </Button>
      
      {publishId && (
        <div className="text-[10px] text-muted-foreground truncate">
          ID: <code className="bg-muted px-1 rounded">{publishId}</code>
        </div>
      )}
      
      {status && (
        <div className="text-[10px]">
          Estado: <span className="font-semibold">{status}</span>
        </div>
      )}
    </div>
  );
}
