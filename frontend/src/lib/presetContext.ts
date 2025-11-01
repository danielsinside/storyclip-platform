import { Location } from 'react-router-dom';

export type PresetContext = {
  uploadId: string;
  videoUrl: string;
  duration: number;
  filename?: string;
  filesize?: number;
};

export function buildPresetContext(uploadIdFromRoute: string | undefined, location: Location): PresetContext | null {
  console.log('[buildPresetContext] uploadIdFromRoute:', uploadIdFromRoute);
  console.log('[buildPresetContext] location.state:', location?.state);
  
  const navState = (location?.state as any) || {};
  let persisted: any = null;
  try { 
    persisted = JSON.parse(localStorage.getItem(`preset_state_${uploadIdFromRoute}`) || 'null'); 
  } catch {}
  
  console.log('[buildPresetContext] persisted from localStorage:', persisted);
  
  const uploadId = uploadIdFromRoute || navState.uploadId || persisted?.uploadId || '';
  console.log('[buildPresetContext] uploadId:', uploadId);
  
  // Si no tenemos videoUrl, intentar construirla desde uploadId
  let videoUrl = navState.videoUrl || persisted?.videoUrl || '';
  if (!videoUrl && uploadId) {
    videoUrl = `https://story.creatorsflow.app/outputs/uploads/${uploadId}.mp4`;
  }
  console.log('[buildPresetContext] videoUrl:', videoUrl);
  
  const duration = typeof navState.duration === 'number'
    ? navState.duration
    : typeof persisted?.duration === 'number'
      ? persisted.duration
      : 60; // Default duration for direct access
  
  const filename = navState.filename || persisted?.filename || (uploadId ? `${uploadId}.mp4` : '');
  const filesize = typeof navState.filesize === 'number'
    ? navState.filesize
    : typeof persisted?.filesize === 'number'
      ? persisted.filesize
      : 0;
  
  console.log('[buildPresetContext] final values:', { uploadId, videoUrl, duration, filename, filesize });
  
  if (!uploadId || !videoUrl) {
    console.log('[buildPresetContext] returning null - missing uploadId or videoUrl');
    return null;
  }
  
  console.log('[buildPresetContext] returning context:', { uploadId, videoUrl, duration, filename, filesize });
  return { uploadId, videoUrl, duration, filename, filesize };
}
