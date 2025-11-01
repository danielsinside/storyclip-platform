/**
 * Upload video directly to backend
 * This bypasses Supabase and uploads directly to the StoryClip backend
 */

// Backend URL configuration
const BACKEND_URL = 'https://story.creatorsflow.app';
const UPLOAD_ENDPOINT = '/api/v1/upload';

interface UploadResponse {
  success: boolean;
  url?: string;
  filename?: string;
  size?: number;
  originalname?: string;
  error?: string;
  details?: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload video file directly to the backend
 * @param file - The video file to upload
 * @param onProgress - Optional callback for upload progress
 * @returns Promise with the upload response
 */
export async function uploadVideoToBackend(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    try {
      // Validate file
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }

      // Check file size (10GB limit)
      const maxSize = 10 * 1024 * 1024 * 1024; // 10GB in bytes
      if (file.size > maxSize) {
        reject(new Error('File size exceeds 10GB limit'));
        return;
      }

      // Check file type
      const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
      const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

      if (!allowedExtensions.includes(fileExtension)) {
        reject(new Error('Invalid file type. Only MP4, MOV, AVI, MKV, and WEBM files are allowed'));
        return;
      }

      // Create FormData
      const formData = new FormData();
      formData.append('video', file, file.name);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100)
            };
            onProgress(progress);
          }
        });
      }

      // Handle successful response
      xhr.addEventListener('load', () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response: UploadResponse = JSON.parse(xhr.responseText);

            if (response.success) {
              console.log('✅ Upload successful:', response);
              resolve(response);
            } else {
              console.error('❌ Upload failed:', response.error);
              reject(new Error(response.error || 'Upload failed'));
            }
          } else {
            console.error('❌ Upload failed with status:', xhr.status);

            // Try to parse error response
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        } catch (error) {
          console.error('❌ Failed to parse response:', error);
          reject(new Error('Failed to parse server response'));
        }
      });

      // Handle network errors
      xhr.addEventListener('error', () => {
        console.error('❌ Network error during upload');
        reject(new Error('Network error during upload'));
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        console.log('⚠️ Upload aborted');
        reject(new Error('Upload aborted'));
      });

      // Set timeout (5 minutes for large files)
      xhr.timeout = 5 * 60 * 1000;
      xhr.addEventListener('timeout', () => {
        console.error('❌ Upload timeout');
        reject(new Error('Upload timeout - file may be too large'));
      });

      // Open connection and send
      const uploadUrl = `${BACKEND_URL}${UPLOAD_ENDPOINT}`;
      console.log('📤 Starting upload to:', uploadUrl);
      console.log('📁 File details:', {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        type: file.type || 'unknown'
      });

      xhr.open('POST', uploadUrl, true);

      // No need to set Content-Type for FormData, browser will set it with boundary
      // Set CORS credentials
      xhr.withCredentials = true;

      // Send the request
      xhr.send(formData);

    } catch (error) {
      console.error('❌ Upload error:', error);
      reject(error);
    }
  });
}

/**
 * Process video after upload
 * @param videoUrl - The URL of the uploaded video
 * @param options - Processing options
 * @returns Promise with processing response
 */
export async function processUploadedVideo(
  videoUrl: string,
  options: {
    clipDuration?: number;
    maxClips?: number;
    aspect_ratio?: string;
    [key: string]: any;
  } = {}
): Promise<any> {
  try {
    const processUrl = `${BACKEND_URL}/api/process-video`;

    const payload = {
      video_url: videoUrl,
      clip_duration: options.clipDuration || 30,
      max_clips: options.maxClips || 20,
      aspect_ratio: options.aspect_ratio || '9:16',
      ...options
    };

    console.log('🎬 Starting video processing:', payload);

    const response = await fetch(processUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Processing failed with status ${response.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Use default error message
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ Processing started:', result);
    return result;

  } catch (error) {
    console.error('❌ Processing error:', error);
    throw error;
  }
}

/**
 * Check processing status
 * @param jobId - The job ID to check
 * @returns Promise with status response
 */
export async function checkProcessingStatus(jobId: string): Promise<any> {
  try {
    const statusUrl = `${BACKEND_URL}/api/render/${jobId}`;

    console.log('🔍 Checking status for job:', jobId);

    const response = await fetch(statusUrl, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Status check failed with status ${response.status}`);
    }

    const result = await response.json();
    console.log('📊 Job status:', result);
    return result;

  } catch (error) {
    console.error('❌ Status check error:', error);
    throw error;
  }
}

// Export default for easier importing
export default {
  uploadVideoToBackend,
  processUploadedVideo,
  checkProcessingStatus
};