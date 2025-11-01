export const METRICOOL_BASE =
  import.meta.env.VITE_METRICOOL_PROXY?.replace(/\/$/, "") || "/api/metricool";

export const endpoints = {
  stream: (batchId: string) => `${METRICOOL_BASE}/stream?batchId=${encodeURIComponent(batchId)}`,
  status: (batchId: string) => `${METRICOOL_BASE}/status?batchId=${encodeURIComponent(batchId)}`,
  publish: () => `${METRICOOL_BASE}/publish/stories`,
  pause: (batchId: string) => `${METRICOOL_BASE}/pause?batchId=${encodeURIComponent(batchId)}`,
  resume: (batchId: string) => `${METRICOOL_BASE}/resume?batchId=${encodeURIComponent(batchId)}`,
  cancel: (batchId: string) => `${METRICOOL_BASE}/cancel?batchId=${encodeURIComponent(batchId)}`,
  retryFailed: (batchId: string) => `${METRICOOL_BASE}/retry-failed?batchId=${encodeURIComponent(batchId)}`
};
