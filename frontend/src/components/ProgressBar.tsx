import { Progress } from '@/components/ui/progress';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  variant?: 'default' | 'success' | 'warning';
}

export const ProgressBar = ({ current, total, label, variant = 'default' }: ProgressBarProps) => {
  const percentage = Math.round((current / total) * 100);

  const getColorClass = () => {
    switch (variant) {
      case 'success':
        return 'bg-success';
      case 'warning':
        return 'bg-warning';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label || 'Progress'}</span>
        <span className="text-muted-foreground">
          {current}/{total} ({percentage}%)
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
};
