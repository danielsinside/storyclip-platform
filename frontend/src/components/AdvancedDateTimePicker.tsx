import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import 'react-day-picker/dist/style.css';

interface AdvancedDateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  minDate?: Date;
  disabled?: boolean;
}

export function AdvancedDateTimePicker({
  value,
  onChange,
  minDate = new Date(),
  disabled = false
}: AdvancedDateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [selectedHour, setSelectedHour] = useState<number>(value?.getHours() || new Date().getHours() + 1);
  const [selectedMinute, setSelectedMinute] = useState<number>(value?.getMinutes() || 0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (value) {
      setSelectedDate(value);
      setSelectedHour(value.getHours());
      setSelectedMinute(value.getMinutes());
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const newDate = new Date(date);
      newDate.setHours(selectedHour, selectedMinute, 0, 0);
      setSelectedDate(newDate);

      // Auto-aplicar si ya hay hora seleccionada
      if (selectedHour !== undefined && selectedMinute !== undefined) {
        onChange(newDate);
      }
    } else {
      setSelectedDate(undefined);
      onChange(undefined);
    }
  };

  const handleHourChange = (hour: number) => {
    setSelectedHour(hour);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(hour, selectedMinute, 0, 0);
      setSelectedDate(newDate);
      onChange(newDate);
    }
  };

  const handleMinuteChange = (minute: number) => {
    setSelectedMinute(minute);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(selectedHour, minute, 0, 0);
      setSelectedDate(newDate);
      onChange(newDate);
    }
  };

  const handleClear = () => {
    setSelectedDate(undefined);
    setSelectedHour(new Date().getHours() + 1);
    setSelectedMinute(0);
    onChange(undefined);
    setIsOpen(false);
  };

  const handleApply = () => {
    if (selectedDate) {
      const finalDate = new Date(selectedDate);
      finalDate.setHours(selectedHour, selectedMinute, 0, 0);
      onChange(finalDate);
    }
    setIsOpen(false);
  };

  // Generar horas (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Generar minutos (0, 5, 10, 15, ..., 55)
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="relative">
      {/* Input Display */}
      <Button
        type="button"
        variant="outline"
        className={`w-full justify-start text-left font-normal ${!selectedDate && 'text-muted-foreground'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <Calendar className="mr-2 h-4 w-4" />
        {selectedDate ? (
          <span className="flex items-center gap-2">
            {format(selectedDate, "PPP", { locale: es })}
            <Clock className="h-3 w-3" />
            {format(selectedDate, "HH:mm")}
          </span>
        ) : (
          <span>Selecciona fecha y hora</span>
        )}
      </Button>

      {/* Dropdown Picker */}
      {isOpen && !disabled && (
        <Card className="absolute z-50 mt-2 p-4 shadow-lg border-2 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Calendar */}
            <div className="flex-shrink-0">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={{ before: minDate }}
                locale={es}
                className="rounded-md border"
                modifiersClassNames={{
                  selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                  today: 'font-bold text-primary border border-primary'
                }}
              />
            </div>

            {/* Time Selector */}
            <div className="flex flex-col gap-3 min-w-[200px]">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hora de publicación
                </Label>

                {/* Hour Selector */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Hora</Label>
                  <div className="grid grid-cols-6 gap-1 max-h-[200px] overflow-y-auto p-1 border rounded-md">
                    {hours.map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => handleHourChange(hour)}
                        className={`
                          px-2 py-1 text-sm rounded transition-colors
                          ${selectedHour === hour
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'hover:bg-accent hover:text-accent-foreground'
                          }
                        `}
                      >
                        {hour.toString().padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minute Selector */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Minutos</Label>
                  <div className="grid grid-cols-6 gap-1 p-1 border rounded-md">
                    {minutes.map((minute) => (
                      <button
                        key={minute}
                        type="button"
                        onClick={() => handleMinuteChange(minute)}
                        className={`
                          px-2 py-1 text-sm rounded transition-colors
                          ${selectedMinute === minute
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'hover:bg-accent hover:text-accent-foreground'
                          }
                        `}
                      >
                        {minute.toString().padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selected Time Display */}
              {selectedDate && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-900">
                    📅 {format(selectedDate, "PPP", { locale: es })}
                  </p>
                  <p className="text-lg font-bold text-blue-700 mt-1">
                    🕐 {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  className="flex-1"
                  size="sm"
                >
                  Limpiar
                </Button>
                <Button
                  type="button"
                  onClick={handleApply}
                  className="flex-1"
                  size="sm"
                  disabled={!selectedDate}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Backdrop to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
