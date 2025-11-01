import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Clock, Zap, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { AdvancedDateTimePicker } from './AdvancedDateTimePicker';

export type PublishMode = 'now' | 'scheduled' | 'bestTime';

interface PublishOptionsProps {
  onModeChange: (mode: PublishMode, scheduledDate?: Date) => void;
  disabled?: boolean;
}

export function PublishOptions({ onModeChange, disabled }: PublishOptionsProps) {
  const [mode, setMode] = useState<PublishMode>('now');
  const [scheduledDate, setScheduledDate] = useState<Date>();

  const handleModeChange = (newMode: PublishMode) => {
    setMode(newMode);
    onModeChange(newMode, scheduledDate);
  };

  const handleDateTimeChange = (date: Date | undefined) => {
    setScheduledDate(date);
    if (mode === 'scheduled') {
      onModeChange('scheduled', date);
    }
  };


  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Opciones de Publicación</h3>
      
      <RadioGroup
        value={mode}
        onValueChange={(value) => handleModeChange(value as PublishMode)}
        disabled={disabled}
        className="space-y-4"
      >
        {/* Publicar Ahora */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem value="now" id="now" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="now" className="flex items-center gap-2 cursor-pointer">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-medium">Publicar Ahora</span>
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Cada historia espera confirmación real de Facebook antes de publicar la siguiente
            </p>

            {mode === 'now' && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs text-blue-900 font-medium mb-1">
                  ✓ Vigilancia en tiempo real del estado
                </p>
                <p className="text-xs text-blue-800">
                  Metricool aplica anti-spam automático. Cada historia se envía solo cuando la anterior está confirmada como "published", garantizando el orden perfecto sin intervalos artificiales.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Programar Fecha */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem value="scheduled" id="scheduled" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="scheduled" className="flex items-center gap-2 cursor-pointer">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">Programar Fecha</span>
            </Label>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              Selecciona una fecha y hora específica
            </p>
            
            {mode === 'scheduled' && (
              <div className="space-y-3">
                <AdvancedDateTimePicker
                  value={scheduledDate}
                  onChange={handleDateTimeChange}
                  minDate={new Date()}
                  disabled={disabled}
                />

                {scheduledDate && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      📅 Primera historia: {format(scheduledDate, "PPP 'a las' HH:mm")}
                    </p>
                    <p className="text-xs text-blue-700">
                      ⏱️ Las historias se programarán con 1 minuto de diferencia (granularidad mínima de Metricool).
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mejor Momento */}
        <div className="flex items-start space-x-3">
          <RadioGroupItem value="bestTime" id="bestTime" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="bestTime" className="flex items-center gap-2 cursor-pointer">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-medium">Mejor Momento (Próximamente)</span>
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Función en desarrollo - usa "Publicar Ahora" o "Programar Fecha"
            </p>
          </div>
        </div>
      </RadioGroup>
    </Card>
  );
}
