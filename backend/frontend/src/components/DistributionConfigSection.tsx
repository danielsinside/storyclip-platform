// ⚙️ Componente de Configuración de Distribución

'use client';

import { useState } from 'react';
import { Settings, Clock, Hash, Shuffle, Target } from 'lucide-react';
import { ClipDistribution, DURATION_PRESETS, QUANTITY_PRESETS } from '@/types';
import { formatTime } from '@/utils/distribution';

interface DistributionConfigSectionProps {
  distribution: ClipDistribution;
  onDistributionChange: (distribution: ClipDistribution) => void;
  videoDuration: number | null;
}

export default function DistributionConfigSection({
  distribution,
  onDistributionChange,
  videoDuration,
}: DistributionConfigSectionProps) {
  const [configMode, setConfigMode] = useState<'presets' | 'manual'>('presets');

  const updateDistribution = (updates: Partial<ClipDistribution>) => {
    onDistributionChange({ ...distribution, ...updates });
  };

  const handlePresetSelect = (duration: number, quantity: number) => {
    updateDistribution({
      clipDuration: duration,
      maxClips: quantity,
    });
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Settings className="w-6 h-6 text-green-400" />
        ⚙️ Configuración de Distribución
      </h2>

      {/* Modo de configuración */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Modo de configuración
        </label>
        <div className="flex gap-4">
          <button
            onClick={() => setConfigMode('presets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              configMode === 'presets'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Target className="w-4 h-4" />
            Presets (recomendado)
          </button>
          <button
            onClick={() => setConfigMode('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              configMode === 'manual'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Settings className="w-4 h-4" />
            Manual (valores personalizados)
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {configMode === 'presets'
            ? 'Presets: opciones predefinidas'
            : 'Manual: valores personalizados'}
        </p>
      </div>

      {/* Configuración con presets */}
      {configMode === 'presets' && (
        <div className="space-y-6">
          {/* Duración por clip */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Duración por clip (segundos)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => updateDistribution({ clipDuration: preset.value })}
                  className={`p-3 rounded-lg text-sm transition-all ${
                    distribution.clipDuration === preset.value
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-xs opacity-75">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad de clips */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Cantidad de clips
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {QUANTITY_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => updateDistribution({ maxClips: preset.value })}
                  className={`p-3 rounded-lg text-sm transition-all ${
                    distribution.maxClips === preset.value
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              El sistema ajustará automáticamente según la duración del video
            </p>
          </div>
        </div>
      )}

      {/* Configuración manual */}
      {configMode === 'manual' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Duración por clip */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duración por clip (segundos)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={distribution.clipDuration}
                onChange={(e) => updateDistribution({ clipDuration: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Valor entre 1 y 60 segundos
              </p>
            </div>

            {/* Cantidad de clips */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cantidad de clips
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={distribution.maxClips}
                onChange={(e) => updateDistribution({ maxClips: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Valor entre 1 y 100 clips
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modo de distribución */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Modo de distribución
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
            <input
              type="radio"
              name="distributionMode"
              value="automatic"
              checked={distribution.mode === 'automatic'}
              onChange={(e) => updateDistribution({ mode: e.target.value as any })}
              className="w-4 h-4 text-green-600"
            />
            <div>
              <div className="font-medium text-white flex items-center gap-2">
                <Shuffle className="w-4 h-4" />
                Automático (recomendado)
              </div>
              <p className="text-xs text-gray-400">
                Distribuye todo el video inteligentemente
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
            <input
              type="radio"
              name="distributionMode"
              value="optimal"
              checked={distribution.mode === 'optimal'}
              onChange={(e) => updateDistribution({ mode: e.target.value as any })}
              className="w-4 h-4 text-green-600"
            />
            <div>
              <div className="font-medium text-white flex items-center gap-2">
                <Target className="w-4 h-4" />
                Óptimo (ajusta duración)
              </div>
              <p className="text-xs text-gray-400">
                Ajusta la duración para maximizar cobertura
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
            <input
              type="radio"
              name="distributionMode"
              value="manual"
              checked={distribution.mode === 'manual'}
              onChange={(e) => updateDistribution({ mode: e.target.value as any })}
              className="w-4 h-4 text-green-600"
            />
            <div>
              <div className="font-medium text-white flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Fijo (puede cortar video)
              </div>
              <p className="text-xs text-gray-400">
                Usa duración fija, puede no cubrir todo el video
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Opciones adicionales */}
      {distribution.mode === 'automatic' && (
        <div className="mt-6">
          <label className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
            <input
              type="checkbox"
              checked={distribution.randomOffset || false}
              onChange={(e) => updateDistribution({ randomOffset: e.target.checked })}
              className="w-4 h-4 text-green-600"
            />
            <div>
              <div className="font-medium text-white flex items-center gap-2">
                <Shuffle className="w-4 h-4" />
                Random Offset
              </div>
              <p className="text-xs text-gray-400">
                Aplica variación aleatoria de hasta 1s para entrada visual
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Información del video */}
      {videoDuration && (
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Información del video:</h3>
          <p className="text-white">
            Duración total: <span className="font-mono">{formatTime(videoDuration)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
