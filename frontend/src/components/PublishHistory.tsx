import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink, Clock, CheckCircle, XCircle } from 'lucide-react';
import { timeAgo } from '@/lib/timeAgo';

interface PublishRecord {
  publishId: string;
  idempotencyKey?: string;
  mediaUrl: string;
  caption?: string;
  status: 'sent' | 'published' | 'failed' | 'queued' | 'retrying';
  providerId?: string;
  timestamp: string;
  error?: string;
}

export function PublishHistory() {
  const [history, setHistory] = useState<PublishRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem('publish_history');
      if (saved) {
        const records = JSON.parse(saved) as PublishRecord[];
        // Sort by timestamp, most recent first
        records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setHistory(records.slice(0, 20)); // Keep last 20
      }
    } catch (error) {
      console.error('Error loading publish history:', error);
    }
  };

  const addToHistory = (record: Omit<PublishRecord, 'timestamp'>) => {
    const newRecord: PublishRecord = {
      ...record,
      timestamp: new Date().toISOString()
    };

    const updated = [newRecord, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem('publish_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('publish_history');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Here you could poll status for recent items
    // For now just reload
    loadHistory();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'sent':
      case 'queued':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      published: 'default',
      failed: 'destructive',
      sent: 'secondary',
      queued: 'outline',
    };
    const labels: Record<string, string> = {
      published: 'Publicado',
      failed: 'Error',
      sent: 'Enviado',
      queued: 'En cola',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="gap-1">
        {getStatusIcon(status)}
        {labels[status] || status}
      </Badge>
    );
  };

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial de Publicaciones</CardTitle>
          <CardDescription>
            Las últimas publicaciones a Metricool aparecerán aquí
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay publicaciones recientes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Historial de Publicaciones</CardTitle>
            <CardDescription>
              Últimas {history.length} publicaciones
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
            >
              Limpiar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.map((record) => (
            <div
              key={record.publishId}
              className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(record.status)}
                  {record.providerId && (
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      ID: {record.providerId}
                    </code>
                  )}
                </div>
                
                {record.caption && (
                  <p className="text-sm text-foreground mb-1 truncate">
                    {record.caption}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {timeAgo(record.timestamp, "es")}
                  </span>
                  {record.idempotencyKey && (
                    <span className="opacity-50">
                      • {record.idempotencyKey}
                    </span>
                  )}
                </div>
                
                {record.error && (
                  <p className="text-xs text-destructive mt-1">
                    {record.error}
                  </p>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                asChild
              >
                <a
                  href={record.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ver media"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Export helper to add records from PublishButton
export function addPublishRecord(record: Omit<PublishRecord, 'timestamp'>) {
  try {
    const saved = localStorage.getItem('publish_history');
    const history = saved ? JSON.parse(saved) : [];
    
    const newRecord: PublishRecord = {
      ...record,
      timestamp: new Date().toISOString()
    };
    
    const updated = [newRecord, ...history].slice(0, 20);
    localStorage.setItem('publish_history', JSON.stringify(updated));
    
    // Trigger storage event for cross-tab sync
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.error('Error saving to publish history:', error);
  }
}
