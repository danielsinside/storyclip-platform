const API_BASE = import.meta.env.VITE_SC_PROXY || 'https://api.creatorsflow.app';
const LEGACY_API_BASE = 'https://story.creatorsflow.app';
const API_KEY = import.meta.env.VITE_STORYCLIP_API_KEY || 'sk_cd07c4b520ee1aede470c72b0b11c557211f2ca1bdea1a6f71f98b8538c42df3';
const TENANT = 'stories';

// Helper to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || errorData.error || `API Error: ${response.status}`);
  }
  return response.json();
};

// Helper to handle fetch errors
const safeFetch = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    console.error('Network error:', error);
    throw new Error('No se pudo conectar al servidor. Verifica tu conexión a internet o contacta soporte.');
  }
};

export const api = {
  // Health & Config (legacy)
  getHealth: () => 
    safeFetch(`${LEGACY_API_BASE}/api/health`)
      .then(handleResponse),
  
  getConfig: () => 
    safeFetch(`${LEGACY_API_BASE}/api/config`)
      .then(handleResponse),
  
  // ============== UPLOAD VIDEO (STANDBY MODE) ==============
  // Only uploads the video, creates session in standby - NO PROCESSING YET
  uploadVideo: (formData: FormData) => 
    safeFetch(`${LEGACY_API_BASE}/api/videos/upload`, {
      method: 'POST',
      body: formData
    }).then(handleResponse),
  
  // ============== PROCESS VIDEO (DIRECT ENDPOINT) ==============
  // DEPRECATED: Use processVideo from storyclipV2.ts instead
  // This function is disabled to prevent incorrect request building
  processVideo: async (data: {
    uploadId: string;
    mode: 'auto' | 'manual';
    manual?: {
      seed: string;
      delayMode: string;
      clips?: Array<{ start: number; end: number }>;
      duration?: number;
      audio?: { ambientNoise: boolean; amplitude: number };
      metadata?: {
        title: string;
        description: string;
        keywords: string;
      };
    };
  }) => {
    // DISABLED: This function builds incorrect requests
    // Use processVideo from storyclipV2.ts instead
    throw new Error('api.processVideo is deprecated. Import and use processVideo from @/lib/storyclipV2 instead');
  },
  
  // Job status - supports both new render API and legacy story API
  getJobStatus: (storyIdOrJobId: string) => {
    console.log('🔍 Getting job status for:', storyIdOrJobId);
    
    // Use local backend for job status
    return safeFetch(`${LEGACY_API_BASE}/api/v1/jobs/${storyIdOrJobId}/status`, {
      cache: 'no-store'
    }).then(handleResponse);
  },

  // Apply filter to video and get filtered preview
  applyFilter: async (jobId: string, filterConfig: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    hue?: number;
  }) => {
    console.log('🎨 Applying filter to job:', jobId, filterConfig);
    
    return safeFetch(`${LEGACY_API_BASE}/api/videos/${jobId}/apply-filter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(filterConfig)
    }).then(handleResponse);
  },
  
  // Publish via Lovable backend (Metricool)
  publishToMetricool: (data: {
    posts: Array<{
      blogId: string;
      normalizedUrl: string;
      message: string;
      publishAt?: string | null;
    }>;
    defaultBlogId?: string;
    delayMode?: string;
  }) => 
    safeFetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/metricool-publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
  
  // Get Metricool blogs/brands
  getMetricoolBlogs: () => 
    safeFetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/metricool-blogs`)
      .then(handleResponse),
  
  // Get Metricool brands (creators)
  getMetricoolBrands: () =>
    safeFetch(`${LEGACY_API_BASE}/api/metricool/brands`, {
      headers: {
        'X-Api-Key': API_KEY,
        'X-Tenant': TENANT
      }
    }).then(handleResponse),
  
  // Get capabilities
  getCapabilities: () => 
    safeFetch(`${API_BASE}/capabilities`, {
      headers: {
        'X-Api-Key': API_KEY
      }
    }).then(handleResponse),
  
  // Get presets
  getPresets: () => 
    safeFetch(`${API_BASE}/presets`, {
      headers: {
        'X-Api-Key': API_KEY
      }
    }).then(handleResponse),
};

// Clip URL pattern
export const getClipUrl = (jobId: string, clipIndex: number) => {
  const paddedIndex = String(clipIndex).padStart(3, '0');
  return `https://story.creatorsflow.app/outputs/${jobId}/clip_${paddedIndex}.mp4`;
};
