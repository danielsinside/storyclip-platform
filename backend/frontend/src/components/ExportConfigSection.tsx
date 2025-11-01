// 🎬 Componente de Configuración de Exportación

'use client';

import { useState } from 'react';
import { Settings, Download, Zap, Monitor, Film } from 'lucide-react';
import { ExportConfig, EXPORT_PRESETS, QUALITY_PRESETS } from '@/types';

interface ExportConfigSectionProps {
  exportConfig: ExportConfig;
  onExportConfigChange: (config: ExportConfig) => void;
}

export default function ExportConfigSection({
  exportConfig,
  onExportConfigChange,
}: ExportConfigSectionProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  const updateExportConfig = (updates: Partial<ExportConfig>) => {
    onExportConfigChange({ ...exportConfig, ...updates });
  };

  const applyPreset = (presetKey: string) => {
    const preset = EXPORT_PRESETS[presetKey];
    if (preset) {
      onExportConfigChange(preset);
    }
  };

  const getPresetIcon = (presetKey: string) => {
    switch (presetKey) {
      case 'stories-optimized':
        return <Zap className="w-4 h-4" />;
      case 'reels-optimized':
        return <Film className="w-4 h-4" />;
      case 'web-optimized':
        return <Monitor className="w-4 h-4" />;
      case 'archive-quality':
        return <Download className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getPresetDescription = (presetKey: string) => {
    switch (presetKey) {
      case 'stories-optimized':
        return 'Optimizado para Instagram Stories y Facebook Stories';
      case 'reels-optimized':
        return 'Máxima calidad para Instagram Reels y TikTok';
      case 'web-optimized':
        return 'Balanceado para web y redes sociales';
      case 'archive-quality':
        return 'Máxima calidad para archivo y edición';
      default:
        return '';
    }
  };

  return (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Settings className="w-6 h-6 text-blue-400" />
        🎬 Configuración de Exportación
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'presets'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Zap className="w-4 h-4" />
          Presets
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Settings className="w-4 h-4" />
          Personalizado
        </button>
      </div>

      {/* Presets */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-300 mb-4">
            Selecciona un preset optimizado para tu caso de uso
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(EXPORT_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`p-4 rounded-lg text-left transition-all ${
                  exportConfig.quality === preset.quality && 
                  exportConfig.resolution === preset.resolution
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  {getPresetIcon(key)}
                  <div className="font-medium capitalize">
                    {key.replace('-', ' ')}
                  </div>
                </div>
                <p className="text-xs opacity-75 mb-2">
                  {getPresetDescription(key)}
                </p>
                <div className="text-xs space-y-1">
                  <div>Formato: {preset.format.toUpperCase()}</div>
                  <div>Resolución: {preset.resolution}</div>
                  <div>Calidad: {preset.quality}</div>
                  <div>FPS: {preset.fps}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Configuración personalizada */}
      {activeTab === 'custom' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-300 mb-4">
            Configura manualmente los parámetros de exportación
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Formato */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Formato
              </label>
              <select
                value={exportConfig.format}
                onChange={(e) => updateExportConfig({ format: e.target.value as any })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mp4">MP4 (H.264)</option>
                <option value="webm">WebM (VP9)</option>
                <option value="mov">MOV (H.264)</option>
              </select>
            </div>

            {/* Resolución */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Resolución
              </label>
              <select
                value={exportConfig.resolution}
                onChange={(e) => updateExportConfig({ resolution: e.target.value as any })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="720p">720p (HD)</option>
                <option value="1080p">1080p (Full HD)</option>
                <option value="4k">4K (Ultra HD)</option>
              </select>
            </div>

            {/* Calidad */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Calidad
              </label>
              <select
                value={exportConfig.quality}
                onChange={(e) => updateExportConfig({ quality: e.target.value as any })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {QUALITY_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {QUALITY_PRESETS.find(p => p.value === exportConfig.quality)?.description}
              </p>
            </div>

            {/* FPS */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                FPS
              </label>
              <select
                value={exportConfig.fps}
                onChange={(e) => updateExportConfig({ fps: Number(e.target.value) as any })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={24}>24 FPS (Cinema)</option>
                <option value={30}>30 FPS (Estándar)</option>
                <option value={60}>60 FPS (Suave)</option>
              </select>
            </div>

            {/* Compresión */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Compresión: {exportConfig.compression}%
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={exportConfig.compression}
                onChange={(e) => updateExportConfig({ compression: Number(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Alta compresión</span>
                <span>Máxima calidad</span>
              </div>
            </div>

            {/* Codec */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Codec
              </label>
              <select
                value={exportConfig.codec}
                onChange={(e) => updateExportConfig({ codec: e.target.value as any })}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="h264">H.264 (Compatible)</option>
                <option value="h265">H.265 (Eficiente)</option>
                <option value="vp9">VP9 (Web)</option>
              </select>
            </div>
          </div>

          {/* Resumen de configuración */}
          <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <h4 className="text-sm font-medium text-blue-300 mb-2">
              Configuración actual:
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-300">
              <div>Formato: <span className="text-white">{exportConfig.format.toUpperCase()}</span></div>
              <div>Resolución: <span className="text-white">{exportConfig.resolution}</span></div>
              <div>Calidad: <span className="text-white">{exportConfig.quality}</span></div>
              <div>FPS: <span className="text-white">{exportConfig.fps}</span></div>
              <div>Compresión: <span className="text-white">{exportConfig.compression}%</span></div>
              <div>Codec: <span className="text-white">{exportConfig.codec.toUpperCase()}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
