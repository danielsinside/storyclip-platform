# 🔌 Integración Frontend Lovable → Backend StoryClip

## ✅ Sistema Verificado y Funcionando

**Estado actual del backend:**
- ✅ Servidor: Online
- ✅ Endpoints: Disponibles y probados
- ✅ CDN: HTTP 200 (funcionando)
- ✅ Watchdog: Activo
- ✅ Base de datos: Operativa

---

## 🔗 Endpoints Disponibles

### Base URL
```typescript
const API_BASE_URL = "https://story.creatorsflow.app";
```

### 1. Upload Video
```typescript
POST /api/videos/upload?uploadId={uploadId}
Content-Type: multipart/form-data

Body:
  file: File (video)
```

### 2. Process Video
```typescript
POST /api/process-video
Content-Type: application/json

Body:
{
  "uploadId": string,
  "clipDuration": number,  // default: 5
  "maxClips": number       // default: 50
}
```

### 3. Get Job Status
```typescript
GET /api/v1/jobs/{jobId}/status

Response:
{
  id: string,
  status: "running" | "done" | "error",
  progress: number,        // 0-100
  message: string,
  result: {
    artifacts: Array<{
      id: string,
      url: string,
      type: "video",
      format: "mp4",
      size: number,
      duration: number,
      filename: string
    }>
  },
  outputs: string[],
  totalClips: number,
  createdAt: string,
  finishedAt: string
}
```

---

## 📝 Código para tu Frontend Lovable

### Paso 1: Tipos TypeScript

Crea un archivo `src/types/storyclip.ts`:

```typescript
export interface UploadResponse {
  success: boolean;
  uploadId: string;
  temp_path: string;
  filename: string;
  size: number;
}

export interface ProcessResponse {
  success: boolean;
  jobId: string;
  status: "running";
  message: string;
}

export interface ClipArtifact {
  id: string;
  url: string;
  type: "video";
  format: "mp4";
  size: number;
  duration: number;
  filename: string;
}

export interface JobStatusResponse {
  id: string;
  status: "running" | "done" | "error";
  progress: number;
  message: string;
  result?: {
    artifacts: ClipArtifact[];
  };
  outputs?: string[];
  totalClips: number;
  createdAt: string;
  finishedAt?: string;
}

export type JobStatus = "idle" | "uploading" | "processing" | "completed" | "error";
```

---

### Paso 2: Servicio API

Crea un archivo `src/services/storyclip.ts`:

```typescript
import type {
  UploadResponse,
  ProcessResponse,
  JobStatusResponse,
} from "@/types/storyclip";

const API_BASE_URL = "https://story.creatorsflow.app";

/**
 * Upload a video file
 */
export async function uploadVideo(
  file: File,
  uploadId?: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const id = uploadId || `upload_${Date.now()}`;
  const url = `${API_BASE_URL}/api/videos/upload?uploadId=${id}`;

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Start video processing
 */
export async function processVideo(
  uploadId: string,
  options?: {
    clipDuration?: number;
    maxClips?: number;
  }
): Promise<ProcessResponse> {
  const response = await fetch(`${API_BASE_URL}/api/process-video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uploadId,
      clipDuration: options?.clipDuration || 5,
      maxClips: options?.maxClips || 50,
    }),
  });

  if (!response.ok) {
    throw new Error(`Process failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get job status
 */
export async function getJobStatus(
  jobId: string
): Promise<JobStatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/jobs/${jobId}/status`
  );

  if (!response.ok) {
    throw new Error(`Failed to get status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Poll job status until completion
 */
export async function pollJobStatus(
  jobId: string,
  onProgress?: (status: JobStatusResponse) => void,
  interval: number = 2000,
  maxAttempts: number = 180 // 6 minutos
): Promise<JobStatusResponse> {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getJobStatus(jobId);

        // Notificar progreso
        if (onProgress) {
          onProgress(status);
        }

        // Job completado
        if (status.status === "done" && status.progress === 100) {
          resolve(status);
          return;
        }

        // Job falló
        if (status.status === "error") {
          reject(new Error(status.message || "Job failed"));
          return;
        }

        // Timeout
        attempts++;
        if (attempts >= maxAttempts) {
          reject(new Error("Timeout: Job did not complete in time"));
          return;
        }

        // Continuar polling
        setTimeout(poll, interval);
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}
```

---

### Paso 3: Hook React

Crea un archivo `src/hooks/useStoryClip.ts`:

```typescript
import { useState } from "react";
import { uploadVideo, processVideo, pollJobStatus } from "@/services/storyclip";
import type { JobStatus, JobStatusResponse, ClipArtifact } from "@/types/storyclip";

export function useStoryClip() {
  const [status, setStatus] = useState<JobStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [clips, setClips] = useState<ClipArtifact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const processVideoFile = async (
    file: File,
    options?: {
      clipDuration?: number;
      maxClips?: number;
    }
  ) => {
    try {
      setStatus("uploading");
      setProgress(0);
      setMessage("Uploading video...");
      setError(null);
      setClips([]);

      // 1. Upload
      const uploadResponse = await uploadVideo(file);
      console.log("✅ Upload complete:", uploadResponse.uploadId);

      setStatus("processing");
      setProgress(10);
      setMessage("Starting processing...");

      // 2. Process
      const processResponse = await processVideo(
        uploadResponse.uploadId,
        options
      );
      console.log("✅ Processing started:", processResponse.jobId);

      setJobId(processResponse.jobId);
      setProgress(20);
      setMessage("Processing video...");

      // 3. Poll status
      const finalStatus = await pollJobStatus(
        processResponse.jobId,
        (statusUpdate: JobStatusResponse) => {
          setProgress(statusUpdate.progress);
          setMessage(statusUpdate.message || `Processing: ${statusUpdate.progress}%`);
          console.log(`📊 Progress: ${statusUpdate.progress}%`, statusUpdate.message);
        }
      );

      // 4. Completado
      console.log("🎉 Job completed!", finalStatus);
      setStatus("completed");
      setProgress(100);
      setMessage(`Completed! ${finalStatus.totalClips} clips generated`);
      setClips(finalStatus.result?.artifacts || []);

      return finalStatus;
    } catch (err: any) {
      console.error("❌ Error:", err);
      setStatus("error");
      setError(err.message || "An error occurred");
      setMessage(err.message || "Processing failed");
      throw err;
    }
  };

  const reset = () => {
    setStatus("idle");
    setProgress(0);
    setMessage("");
    setClips([]);
    setError(null);
    setJobId(null);
  };

  return {
    status,
    progress,
    message,
    clips,
    error,
    jobId,
    processVideoFile,
    reset,
    isProcessing: status === "uploading" || status === "processing",
    isCompleted: status === "completed",
    isError: status === "error",
  };
}
```

---

### Paso 4: Componente de Ejemplo

```typescript
import { useStoryClip } from "@/hooks/useStoryClip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

export function VideoProcessor() {
  const {
    status,
    progress,
    message,
    clips,
    error,
    processVideoFile,
    reset,
    isProcessing,
    isCompleted,
    isError,
  } = useStoryClip();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await processVideoFile(file, {
        clipDuration: 5,
        maxClips: 50,
      });
    } catch (error) {
      console.error("Processing failed:", error);
    }
  };

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-bold">StoryClip Processor</h2>

      {/* Upload */}
      {status === "idle" && (
        <div>
          <Input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </div>
      )}

      {/* Progress */}
      {isProcessing && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-gray-600">{message}</p>
          <p className="text-xs text-gray-500">Status: {status}</p>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-600 text-sm">{error}</p>
          <Button onClick={reset} variant="outline" className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {/* Results */}
      {isCompleted && clips.length > 0 && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <p className="text-green-800 font-medium">✅ Completed!</p>
            <p className="text-green-600 text-sm">
              {clips.length} clips generated
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clips.map((clip) => (
              <div key={clip.id} className="border rounded p-4">
                <video
                  src={clip.url}
                  controls
                  className="w-full rounded mb-2"
                />
                <p className="text-sm font-medium">{clip.filename}</p>
                <p className="text-xs text-gray-500">
                  {(clip.size / 1024 / 1024).toFixed(2)} MB • {clip.duration}s
                </p>
                <a
                  href={clip.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-xs hover:underline"
                >
                  Open in new tab →
                </a>
              </div>
            ))}
          </div>

          <Button onClick={reset} variant="outline">
            Process Another Video
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## 🔧 Configuración CORS (Ya está configurado en el backend)

El backend ya tiene CORS configurado para tu dominio:
```
https://storyclip-studio.lovable.app
https://preview--storyclip-studio.lovable.app
```

**Si usas otro dominio de Lovable**, avísame para agregarlo.

---

## ✅ Checklist de Integración

- [ ] Copiar tipos TypeScript (`src/types/storyclip.ts`)
- [ ] Copiar servicio API (`src/services/storyclip.ts`)
- [ ] Copiar hook (`src/hooks/useStoryClip.ts`)
- [ ] Crear componente o integrar en componente existente
- [ ] Probar con video real
- [ ] Verificar que los clips se muestren correctamente

---

## 🧪 Testing Rápido

```typescript
// En la consola del navegador
const testFlow = async () => {
  // 1. Upload
  const file = document.querySelector('input[type="file"]').files[0];
  const formData = new FormData();
  formData.append('file', file);
  
  const uploadResp = await fetch('https://story.creatorsflow.app/api/videos/upload?uploadId=test_123', {
    method: 'POST',
    body: formData
  });
  const upload = await uploadResp.json();
  console.log('Upload:', upload);
  
  // 2. Process
  const processResp = await fetch('https://story.creatorsflow.app/api/process-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId: upload.uploadId, clipDuration: 5, maxClips: 50 })
  });
  const process = await processResp.json();
  console.log('Process:', process);
  
  // 3. Poll
  const jobId = process.jobId;
  const poll = async () => {
    const statusResp = await fetch(`https://story.creatorsflow.app/api/v1/jobs/${jobId}/status`);
    const status = await statusResp.json();
    console.log(`${status.progress}%: ${status.message}`);
    
    if (status.status === 'done') {
      console.log('✅ Completed!', status.result.artifacts);
      return status;
    }
    
    setTimeout(poll, 2000);
  };
  poll();
};

testFlow();
```

---

## 📞 Soporte

Si tienes problemas:
1. Verifica la consola del navegador para errores
2. Verifica que el dominio tenga CORS habilitado
3. Prueba los endpoints directamente con curl/Postman

---

**¿Todo listo?** Con este código tu frontend de Lovable estará 100% integrado con el backend robusto de StoryClip! 🚀
