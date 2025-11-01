// 🎨 Componente de Barra de Progreso Animada

'use client';

import { useEffect, useState } from 'react';

interface AnimatedProgressBarProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export default function AnimatedProgressBar({
  progress,
  label,
  showPercentage = true,
  color = 'blue',
  size = 'md',
  animated = true,
}: AnimatedProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayProgress(progress);
    }
  }, [progress, animated]);

  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'from-green-500 to-green-600';
      case 'purple':
        return 'from-purple-500 to-purple-600';
      case 'orange':
        return 'from-orange-500 to-orange-600';
      case 'red':
        return 'from-red-500 to-red-600';
      default:
        return 'from-blue-500 to-blue-600';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2';
      case 'lg':
        return 'h-4';
      default:
        return 'h-3';
    }
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-300">{label}</span>
          {showPercentage && (
            <span className="text-sm text-gray-400">{Math.round(displayProgress)}%</span>
          )}
        </div>
      )}
      
      <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${getSizeClasses()}`}>
        <div
          className={`h-full bg-gradient-to-r ${getColorClasses()} transition-all duration-500 ease-out ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${displayProgress}%` }}
        />
      </div>
    </div>
  );
}
