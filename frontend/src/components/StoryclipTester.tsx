import { useRef } from "react";
import { useStoryclip } from "@/hooks/useStoryclip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function StoryclipTester() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { initGate, uploadAndProcess, busy, error, clips, jobId, status } = useStoryclip();

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>StoryClip Integration Tester</CardTitle>
        <CardDescription>Test video upload and processing with StoryClip backend</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={initGate} disabled={busy} variant="outline">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            1) Health & Config
          </Button>
        </div>

        <div className="space-y-2">
          <Input
            ref={fileRef}
            type="file"
            accept="video/*"
            disabled={busy}
          />
          <Button
            disabled={busy || !fileRef.current?.files?.[0]}
            onClick={() => uploadAndProcess(fileRef.current!.files![0])}
            className="w-full"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            2) Upload & Process
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {jobId && (
          <div className="text-sm space-y-1">
            <p><strong>Job ID:</strong> {jobId}</p>
            {status && (
              <>
                <p><strong>Status:</strong> {status.status}</p>
                <p><strong>Progress:</strong> {status.progress ?? 0}%</p>
              </>
            )}
          </div>
        )}

        {clips.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Generated Clips ({clips.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {clips.slice(0, 8).map((url, i) => (
                <video
                  key={i}
                  src={url}
                  controls
                  className="rounded shadow w-full aspect-[9/16] object-cover"
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
