import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Loader2, Clock, Zap, Calendar, Facebook } from 'lucide-react';
import { useMetricoolPublish, type StoryPublishItem } from '@/hooks/useMetricoolPublish';
import type { MetricoolConfig } from '@/lib/metricoolApi';
import { motion, AnimatePresence } from 'framer-motion';

export interface MetricoolPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  videoUrls: string[];
  metricoolConfig: MetricoolConfig;
  publishMode: 'now' | 'scheduled';
  scheduledDate?: Date;
  facebookAccount?: string;
}

const statusColors = {
  idle: 'bg-gray-200',
  normalizing: 'bg-blue-500',
  publishing: 'bg-purple-500',
  completed: 'bg-green-500',
  error: 'bg-red-500',
};

const statusIcons = {
  idle: Clock,
  normalizing: Loader2,
  publishing: Zap,
  completed: CheckCircle2,
  error: XCircle,
};

export function MetricoolPublishModal({
  isOpen,
  onClose,
  onComplete,
  videoUrls,
  metricoolConfig,
  publishMode,
  scheduledDate,
  facebookAccount,
}: MetricoolPublishModalProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [summary, setSummary] = useState<{ success: number; failed: number; total: number } | null>(null);

  const {
    items,
    isPublishing,
    overallProgress,
    publishNow,
    schedulePublish,
    abort,
    reset,
  } = useMetricoolPublish({
    config: metricoolConfig,
    onProgress: (updatedItems) => {
      console.log('Progress update:', updatedItems);
    },
    onComplete: (results) => {
      console.log('Publishing complete:', results);
      setSummary(results);
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error) => {
      console.error('Publishing error:', error);
    },
  });

  useEffect(() => {
    if (isOpen && !hasStarted && videoUrls.length > 0) {
      setHasStarted(true);
      setSummary(null);

      if (publishMode === 'now') {
        publishNow(videoUrls, facebookAccount);
      } else if (publishMode === 'scheduled' && scheduledDate) {
        schedulePublish(videoUrls, scheduledDate, 1, facebookAccount);
      }
    }
  }, [isOpen, hasStarted, videoUrls, publishMode, scheduledDate, facebookAccount, publishNow, schedulePublish]);

  const handleClose = () => {
    if (isPublishing) {
      const confirm = window.confirm('¿Estás seguro que deseas cancelar la publicación?');
      if (!confirm) return;
      abort();
    }
    reset();
    setHasStarted(false);
    setSummary(null);
    onClose();
  };

  const completedCount = items.filter(i => i.status === 'completed').length;
  const failedCount = items.filter(i => i.status === 'error').length;
  const isComplete = summary !== null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Facebook className="h-6 w-6 text-blue-600" />
            {publishMode === 'now' ? 'Publicando Stories' : 'Programando Stories'}
          </DialogTitle>
          <DialogDescription>
            {publishMode === 'now'
              ? 'Publicando tus Stories en Facebook Stories en orden secuencial'
              : `Programando ${videoUrls.length} Stories para ${scheduledDate?.toLocaleString()}`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progreso total</span>
            <span className="text-muted-foreground">
              {completedCount} / {videoUrls.length} completados
              {failedCount > 0 && ` (${failedCount} errores)`}
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Items List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          <AnimatePresence>
            {items.map((item, index) => {
              const StatusIcon = statusIcons[item.status];
              const isAnimating = item.status === 'normalizing' || item.status === 'publishing';

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 border rounded-lg bg-card space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${statusColors[item.status]} flex items-center justify-center`}>
                        <StatusIcon className={`h-4 w-4 text-white ${isAnimating ? 'animate-spin' : ''}`} />
                      </div>
                      <div>
                        <p className="font-medium">Story {item.order}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.status === 'idle' && 'En cola'}
                          {item.status === 'normalizing' && 'Subiendo video a Metricool...'}
                          {item.status === 'publishing' && 'Publicando en Facebook...'}
                          {item.status === 'completed' && '✅ Publicado exitosamente'}
                          {item.status === 'error' && `❌ Error: ${item.error}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{Math.round(item.progress)}%</span>
                  </div>
                  {item.progress > 0 && item.progress < 100 && (
                    <Progress value={item.progress} className="h-1" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Summary */}
        {isComplete && summary && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-4 rounded-lg border-2 ${
              summary.failed === 0
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <p className="font-semibold text-lg mb-2">
              {summary.failed === 0 ? '🎉 ¡Publicación completada!' : '⚠️ Publicación completada con errores'}
            </p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{summary.total}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Exitosos</p>
                <p className="text-2xl font-bold text-green-600">{summary.success}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fallidos</p>
                <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isPublishing && (
            <Button
              onClick={abort}
              variant="destructive"
              className="flex-1"
            >
              Cancelar Publicación
            </Button>
          )}
          {isComplete && (
            <Button
              onClick={handleClose}
              className="flex-1"
            >
              Cerrar
            </Button>
          )}
        </div>

        {/* Info Footer */}
        <div className="text-xs text-muted-foreground text-center border-t pt-4">
          <p>
            Las Stories se publican secuencialmente con 5 segundos de espera entre cada una para mantener el orden.
          </p>
          {publishMode === 'now' && (
            <p className="mt-1">
              ⚡ Publicación inmediata - Las Stories aparecerán en Facebook en unos segundos
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
