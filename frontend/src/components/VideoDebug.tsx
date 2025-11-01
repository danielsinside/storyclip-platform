import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, ExternalLink, Download, AlertTriangle, CheckCircle } from 'lucide-react';

interface VideoDebugProps {
  uploadId?: string;
  videoUrl?: string | null;
  sessionData?: any;
}

export function VideoDebug({ uploadId, videoUrl, sessionData }: VideoDebugProps) {
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkVideoUrl = async (url: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const info = {
        url,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        lastModified: response.headers.get('last-modified'),
        accessible: response.ok
      };
      
      setVideoInfo(info);
    } catch (err) {
      setError(`Error checking URL: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testVideoUrl = () => {
    if (videoUrl) {
      checkVideoUrl(videoUrl);
    }
  };

  const testConstructedUrl = () => {
    if (uploadId) {
      const constructedUrl = `https://story.creatorsflow.app/outputs/uploads/${uploadId}.mp4`;
      checkVideoUrl(constructedUrl);
    }
  };

  const testLocalUrl = () => {
    if (uploadId) {
      const localUrl = `http://144.126.129.34:3000/outputs/uploads/${uploadId}.mp4`;
      checkVideoUrl(localUrl);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">🔍 Video Debug</h3>
        <Badge variant="outline">Debug Mode</Badge>
      </div>

      {/* Session Data */}
      <div>
        <h4 className="font-medium mb-2">Session Data:</h4>
        <div className="bg-muted p-3 rounded text-sm">
          <p><strong>Upload ID:</strong> {uploadId || 'No disponible'}</p>
          <p><strong>Video URL:</strong> {videoUrl || 'No disponible'}</p>
          <p><strong>Session Status:</strong> {sessionData?.status || 'No disponible'}</p>
          <p><strong>Filename:</strong> {sessionData?.filename || 'No disponible'}</p>
          <p><strong>Duration:</strong> {sessionData?.duration || 'No disponible'}s</p>
        </div>
      </div>

      {/* URL Tests */}
      <div>
        <h4 className="font-medium mb-2">URL Tests:</h4>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={testVideoUrl} disabled={!videoUrl || isLoading} size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Test Current URL
          </Button>
          <Button onClick={testConstructedUrl} disabled={!uploadId || isLoading} size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Test Constructed URL
          </Button>
          <Button onClick={testLocalUrl} disabled={!uploadId || isLoading} size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Test Local URL
          </Button>
        </div>
      </div>

      {/* Results */}
      {videoInfo && (
        <div>
          <h4 className="font-medium mb-2">Test Results:</h4>
          <div className="bg-muted p-3 rounded text-sm space-y-1">
            <div className="flex items-center gap-2">
              {videoInfo.accessible ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              <span><strong>Status:</strong> {videoInfo.status} {videoInfo.statusText}</span>
            </div>
            <p><strong>Content Type:</strong> {videoInfo.contentType || 'No disponible'}</p>
            <p><strong>Content Length:</strong> {videoInfo.contentLength || 'No disponible'}</p>
            <p><strong>Last Modified:</strong> {videoInfo.lastModified || 'No disponible'}</p>
            <p><strong>URL:</strong> {videoInfo.url}</p>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Verificando URL...</span>
        </div>
      )}
    </Card>
  );
}
