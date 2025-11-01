// 🎨 Componente de Filtros y Efectos

'use client';

import { useState } from 'react';
import { Palette, RotateCcw, RotateCw, Layers, Eye } from 'lucide-react';
import { AVAILABLE_FILTERS, AVAILABLE_OVERLAYS, FilterConfig, FlipConfig, OverlayConfig } from '@/types';

interface FiltersAndEffectsSectionProps {
  selectedFilters: string[];
  onFiltersChange: (filters: string[]) => void;
  flip: FlipConfig;
  onFlipChange: (flip: FlipConfig) => void;
  overlay: OverlayConfig;
  onOverlayChange: (overlay: OverlayConfig) => void;
}

export default function FiltersAndEffectsSection({
  selectedFilters,
  onFiltersChange,
  flip,
  onFlipChange,
  overlay,
  onOverlayChange,
}: FiltersAndEffectsSectionProps) {
  const [activeTab, setActiveTab] = useState<'filters' | 'flip' | 'overlay'>('filters');

  const toggleFilter = (filterName: string) => {
    if (selectedFilters.includes(filterName)) {
      onFiltersChange(selectedFilters.filter(f => f !== filterName));
    } else {
      onFiltersChange([...selectedFilters, filterName]);
    }
  };

  const updateFlip = (updates: Partial<FlipConfig>) => {
    onFlipChange({ ...flip, ...updates });
  };

  const updateOverlay = (updates: Partial<OverlayConfig>) => {
    onOverlayChange({ ...overlay, ...updates });
  };

  const getFilterCategory = (category: string) => {
    switch (category) {
      case 'visual': return 'Visual';
      case 'color': return 'Color';
      case 'style': return 'Estilo';
      default: return category;
    }
  };

  const groupedFilters = AVAILABLE_FILTERS.reduce((acc, filter) => {
    if (!acc[filter.category]) {
      acc[filter.category] = [];
    }
    acc[filter.category].push(filter);
    return acc;
  }, {} as Record<string, FilterConfig[]>);

  return (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Palette className="w-6 h-6 text-purple-400" />
        🎨 Filtros y Efectos
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('filters')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'filters'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Eye className="w-4 h-4" />
          Filtros
        </button>
        <button
          onClick={() => setActiveTab('flip')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'flip'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Flip
        </button>
        <button
          onClick={() => setActiveTab('overlay')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'overlay'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Layers className="w-4 h-4" />
          Overlay
        </button>
      </div>

      {/* Filtros */}
      {activeTab === 'filters' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-300">
              Selecciona uno o más filtros para aplicar por lote
            </p>
            <span className="text-xs text-gray-400">
              {selectedFilters.length} seleccionados
            </span>
          </div>

          {Object.entries(groupedFilters).map(([category, filters]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                {getFilterCategory(category)}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.name}
                    onClick={() => toggleFilter(filter.name)}
                    className={`p-3 rounded-lg text-sm transition-all ${
                      selectedFilters.includes(filter.name)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium">{filter.displayName}</div>
                    <div className="text-xs opacity-75">{filter.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {selectedFilters.length > 0 && (
            <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
              <h4 className="text-sm font-medium text-purple-300 mb-2">
                Filtros seleccionados:
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedFilters.map((filterName) => (
                  <span
                    key={filterName}
                    className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full"
                  >
                    {AVAILABLE_FILTERS.find(f => f.name === filterName)?.displayName || filterName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Flip */}
      {activeTab === 'flip' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-300">
            Opciones de volteo para simular versiones alternativas (A/B Testing visual)
          </p>

          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
              <input
                type="checkbox"
                checked={flip.horizontal}
                onChange={(e) => updateFlip({ horizontal: e.target.checked })}
                className="w-4 h-4 text-purple-600"
              />
              <div className="flex items-center gap-3">
                <RotateCcw className="w-5 h-5 text-gray-300" />
                <div>
                  <div className="font-medium text-white">Flip Horizontal</div>
                  <p className="text-xs text-gray-400">
                    Voltea el video horizontalmente (espejo)
                  </p>
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
              <input
                type="checkbox"
                checked={flip.vertical}
                onChange={(e) => updateFlip({ vertical: e.target.checked })}
                className="w-4 h-4 text-purple-600"
              />
              <div className="flex items-center gap-3">
                <RotateCw className="w-5 h-5 text-gray-300" />
                <div>
                  <div className="font-medium text-white">Flip Vertical</div>
                  <p className="text-xs text-gray-400">
                    Voltea el video verticalmente
                  </p>
                </div>
              </div>
            </label>
          </div>

          {(flip.horizontal || flip.vertical) && (
            <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
              <h4 className="text-sm font-medium text-purple-300 mb-2">
                Configuración de Flip:
              </h4>
              <div className="flex gap-2">
                {flip.horizontal && (
                  <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                    Horizontal
                  </span>
                )}
                {flip.vertical && (
                  <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                    Vertical
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay */}
      {activeTab === 'overlay' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-300">
            Capa superior animada (marco, título, branding) por clip
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Estilo de Overlay
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {AVAILABLE_OVERLAYS.map((overlayOption) => (
                <button
                  key={overlayOption.value}
                  onClick={() => updateOverlay({ style: overlayOption.value as any })}
                  className={`p-3 rounded-lg text-sm transition-all text-left ${
                    overlay.style === overlayOption.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">{overlayOption.label}</div>
                  <div className="text-xs opacity-75">{overlayOption.description}</div>
                </button>
              ))}
            </div>
          </div>

          {overlay.style !== 'none' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Posición
                </label>
                <select
                  value={overlay.position}
                  onChange={(e) => updateOverlay({ position: e.target.value as any })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="top">Superior</option>
                  <option value="center">Centro</option>
                  <option value="bottom">Inferior</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Opacidad: {overlay.opacity}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={overlay.opacity}
                  onChange={(e) => updateOverlay({ opacity: Number(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {overlay.style !== 'none' && (
            <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
              <h4 className="text-sm font-medium text-purple-300 mb-2">
                Configuración de Overlay:
              </h4>
              <div className="space-y-1 text-sm text-gray-300">
                <div>Estilo: <span className="text-white">{AVAILABLE_OVERLAYS.find(o => o.value === overlay.style)?.label}</span></div>
                <div>Posición: <span className="text-white">{overlay.position}</span></div>
                <div>Opacidad: <span className="text-white">{overlay.opacity}%</span></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
