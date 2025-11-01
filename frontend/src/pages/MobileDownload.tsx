import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { StoryClip } from '@/types';
import JSZip from 'jszip';

export default function MobileDownload() {
  const { jobId } = useParams();
  const [clips, setClips] = useState<StoryClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClips = async () => {
      if (!jobId) {
        setError('No job ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('📱 Fetching clips for mobile download:', jobId);

        // Fetch job status from API
        const status = await api.getJobStatus(jobId);
        console.log('📥 Received job status:', status);

        // Extract outputs from the response
        const outputs = status.outputs || status.queueStatus?.result?.outputs || [];

        if (!outputs || outputs.length === 0) {
          setError('No clips found for this job');
          setLoading(false);
          return;
        }

        // Convert outputs to clip format
        const fetchedClips = outputs.map((output: any, index: number) => ({
          clipIndex: index + 1,
          title: `Clip ${index + 1}`,
          url: typeof output === 'string' ? output : output.url || output.path,
          duration: output.durationSeconds || output.duration || 0,
          description: '',
          seed: 'natural'
        }));

        // Keep original order for ZIP file (no reversal needed)
        setClips(fetchedClips);
        setLoading(false);
        console.log('✅ Clips loaded successfully:', fetchedClips.length);
      } catch (error) {
        console.error('❌ Error loading clips:', error);
        setError('Failed to load clips. Please try again.');
        setLoading(false);
      }
    };

    fetchClips();
  }, [jobId]);

  const handleDownloadZip = async () => {
    try {
      setDownloading(true);
      setDownloadProgress('📦 Preparando descarga...');

      const zip = new JSZip();

      setDownloadProgress(`⬇️ Descargando ${clips.length} videos...`);

      // Download all videos and add them to the ZIP
      for (const clip of clips) {
        try {
          setDownloadProgress(`⬇️ Descargando clip ${clip.clipIndex} de ${clips.length}...`);
          const response = await fetch(clip.url);
          const blob = await response.blob();

          // Pad clip index to maintain order (001, 002, etc.)
          const paddedIndex = String(clip.clipIndex).padStart(3, '0');
          zip.file(`clip_${paddedIndex}.mp4`, blob);
        } catch (error) {
          console.error(`Error downloading clip ${clip.clipIndex}:`, error);
          setDownloadProgress(`⚠️ Error en clip ${clip.clipIndex}, continuando...`);
        }
      }

      setDownloadProgress('🗜️ Comprimiendo videos...');

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      setDownloadProgress('💾 Guardando archivo...');

      // Download the ZIP
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `storyclips_${jobId || 'export'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadProgress('✅ Descarga completa');
      setDownloadComplete(true);

      console.log('✅ ZIP download complete');
    } catch (error) {
      console.error('❌ Error creating ZIP:', error);
      setDownloadProgress('❌ Error al crear el archivo');
      setError('Error al crear el archivo ZIP. Por favor, intenta de nuevo.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="p-6 text-center">
          <p className="text-lg">Cargando videos...</p>
        </Card>
      </div>
    );
  }

  if (error || clips.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Videos no encontrados</h1>
          <p className="text-muted-foreground mb-4">
            {error || 'No se encontraron videos para este código QR. Por favor, genera un nuevo código desde la página de procesamiento.'}
          </p>
          {error && (
            <p className="text-xs text-muted-foreground mt-4">
              Job ID: {jobId}
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 rounded-2xl">
              <Download className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">StoryClips</h1>
          <p className="text-muted-foreground">
            {clips.length} video{clips.length > 1 ? 's' : ''} listo{clips.length > 1 ? 's' : ''} para descargar
          </p>
        </div>

        {/* Video Previews Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {clips.slice(0, 6).map((clip, index) => (
            <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
              <video
                src={clip.url}
                className="w-full h-full object-cover"
                playsInline
                muted
                preload="metadata"
                crossOrigin="anonymous"
              />
            </div>
          ))}
          {clips.length > 6 && (
            <div className="aspect-square rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-purple-600">+{clips.length - 6}</span>
            </div>
          )}
        </div>

        {/* Download Button */}
        <Button
          onClick={handleDownloadZip}
          disabled={downloading}
          className="w-full h-14 text-lg"
          size="lg"
        >
          {downloading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Descargando...
            </>
          ) : downloadComplete ? (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Descargar de nuevo
            </>
          ) : (
            <>
              <Download className="mr-2 h-5 w-5" />
              Descargar en móvil
            </>
          )}
        </Button>

        {/* Progress Message */}
        {downloadProgress && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-sm text-blue-900 font-medium">{downloadProgress}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-sm mb-2">📱 Instrucciones:</h3>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Presiona el botón "Descargar en móvil"</li>
            <li>Espera mientras se descargan los videos</li>
            <li>Se descargará un archivo ZIP con todos los videos</li>
            <li>Abre el archivo ZIP en tu iPhone</li>
            <li>Guarda los videos en tu galería de Fotos</li>
          </ol>
        </div>

        {/* Job ID Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Job ID: {jobId}
          </p>
        </div>
      </Card>
    </div>
  );
}
