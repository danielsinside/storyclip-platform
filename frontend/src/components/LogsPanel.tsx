import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Log {
  type: string;
  message: string;
  timestamp?: string;
  progress?: number;
}

interface LogsPanelProps {
  logs: Log[];
  title?: string;
  isActive?: boolean;
}

export const LogsPanel = ({ logs, title = 'AI Engine Logs', isActive = true }: LogsPanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'complete':
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'processing':
      case 'analyzing':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <Info className="h-4 w-4 text-info" />;
    }
  };

  return (
    <Card className="p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        {isActive && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <ScrollArea className="h-64">
        <div className="space-y-2 pr-4" ref={scrollRef}>
          {logs.length === 0 && (
            <p className="text-sm text-muted-foreground">Waiting for data...</p>
          )}
          {logs.map((log, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted/30 animate-fade-in"
            >
              {getIcon(log.type)}
              <div className="flex-1">
                <p className="text-foreground">{log.message}</p>
                {log.progress !== undefined && (
                  <div className="mt-1 h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${log.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
