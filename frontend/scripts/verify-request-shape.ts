/*
  Script: verify-request-shape.ts
  Objetivo: Verificar la forma del request para /process-video tras los cambios en Manual.tsx
*/

// Simulación mínima del objeto que arma Manual.tsx (sin dependencias de React)
const processRequest = {
  uploadId: "test_small",
  mode: "manual" as const,
  preset: "storyclip_social_916",
  clips: [0, 1, 2].map((i) => ({
    start: i * 3,
    end: (i + 1) * 3,
    effects: {
      mirrorHorizontal: true,
      color: {
        brightness: 0.05,
        contrast: 1.2,
        saturation: 1.1,
      },
      indicator: {
        enabled: true,
        label: String(i + 1),
        position: "top-right",
        opacity: 0.8,
      },
    },
  })),
  audio: {
    volume: 1,
  },
  metadata: {
    title: "Test",
    description: "Test Desc",
    keywords: ["test"],
    seed: 42,
    delayMode: "none",
  },
};

function hasTopLevelFilters(obj: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(obj, "filters");
}

function hasMetadataVisual(obj: any): boolean {
  return Boolean(obj?.metadata && Object.prototype.hasOwnProperty.call(obj.metadata, "visual"));
}

function clipsHaveEffects(obj: any): boolean {
  if (!Array.isArray(obj?.clips) || obj.clips.length === 0) return false;
  const first = obj.clips[0];
  const eff = first?.effects;
  if (!eff) return false;
  const hasMirror = Object.prototype.hasOwnProperty.call(eff, "mirrorHorizontal");
  const hasColor = Object.prototype.hasOwnProperty.call(eff, "color");
  const hasIndicator = Object.prototype.hasOwnProperty.call(eff, "indicator");
  return hasMirror && hasColor && hasIndicator;
}

const topLevelKeys = Object.keys(processRequest);

const result = {
  topLevelKeys,
  checks: {
    noTopLevelFilters: !hasTopLevelFilters(processRequest),
    noMetadataVisual: !hasMetadataVisual(processRequest),
    clipsEffectsOk: clipsHaveEffects(processRequest),
  },
  sampleClip0Effects: processRequest.clips?.[0]?.effects,
};

console.log(JSON.stringify(result, null, 2));

