// 🎯 Componente de Indicador de Estado

'use client';

import { CheckCircle, AlertCircle, Clock, Play, Pause, RefreshCw } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  animated?: boolean;
}

export default function StatusIndicator({
  status,
  size = 'md',
  showText = true,
  animated = true,
}: StatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-900/20',
          borderColor: 'border-green-500/30',
          text: 'Completado',
          textColor: 'text-green-300',
        };
      case 'failed':
        return {
          icon: AlertCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-900/20',
          borderColor: 'border-red-500/30',
          text: 'Error',
          textColor: 'text-red-300',
        };
      case 'processing':
        return {
          icon: Play,
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/20',
          borderColor: 'border-blue-500/30',
          text: 'Procesando',
          textColor: 'text-blue-300',
        };
      case 'paused':
        return {
          icon: Pause,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-900/20',
          borderColor: 'border-yellow-500/30',
          text: 'Pausado',
          textColor: 'text-yellow-300',
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-400',
          bgColor: 'bg-gray-900/20',
          borderColor: 'border-gray-500/30',
          text: 'Pendiente',
          textColor: 'text-gray-300',
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          icon: 'w-4 h-4',
          container: 'px-2 py-1',
          text: 'text-xs',
        };
      case 'lg':
        return {
          icon: 'w-6 h-6',
          container: 'px-4 py-2',
          text: 'text-base',
        };
      default:
        return {
          icon: 'w-5 h-5',
          container: 'px-3 py-1.5',
          text: 'text-sm',
        };
    }
  };

  const config = getStatusConfig();
  const sizeClasses = getSizeClasses();
  const IconComponent = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 ${config.bgColor} ${config.borderColor} border rounded-lg ${sizeClasses.container}`}>
      <IconComponent 
        className={`${config.icon} ${config.color} ${
          animated && status === 'processing' ? 'animate-pulse' : ''
        }`} 
      />
      {showText && (
        <span className={`${config.textColor} ${sizeClasses.text} font-medium`}>
          {config.text}
        </span>
      )}
    </div>
  );
}
