import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ExternalLink, Check, X } from 'lucide-react';

interface MetricoolConfigProps {
  onConfigured?: (config: { userToken: string; userId: string; blogId: string }) => void;
}

export function MetricoolConfig({ onConfigured }: MetricoolConfigProps) {
  const [userToken, setUserToken] = useState('');
  const [userId, setUserId] = useState('');
  const [blogId, setBlogId] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('metricool_userToken');
    const savedUserId = localStorage.getItem('metricool_userId');
    const savedBlogId = localStorage.getItem('metricool_blogId');

    if (savedToken && savedUserId && savedBlogId) {
      setUserToken(savedToken);
      setUserId(savedUserId);
      setBlogId(savedBlogId);
      setIsConfigured(true);
      onConfigured?.({ userToken: savedToken, userId: savedUserId, blogId: savedBlogId });
    }
  }, []);

  const handleSave = () => {
    if (!userToken || !userId || !blogId) {
      alert('Por favor completa todos los campos');
      return;
    }

    // Save to localStorage
    localStorage.setItem('metricool_userToken', userToken);
    localStorage.setItem('metricool_userId', userId);
    localStorage.setItem('metricool_blogId', blogId);

    setIsConfigured(true);
    onConfigured?.({ userToken, userId, blogId });
  };

  const handleClear = () => {
    localStorage.removeItem('metricool_userToken');
    localStorage.removeItem('metricool_userId');
    localStorage.removeItem('metricool_blogId');
    setUserToken('');
    setUserId('');
    setBlogId('');
    setIsConfigured(false);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Configuración de Metricool
          {isConfigured && <Check className="h-5 w-5 text-green-500" />}
        </h3>
        <a
          href="https://app.metricool.com/settings/api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          Obtener credenciales <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="userToken">
            User Token <span className="text-red-500">*</span>
          </Label>
          <Input
            id="userToken"
            type="password"
            placeholder="Tu API token de Metricool"
            value={userToken}
            onChange={(e) => setUserToken(e.target.value)}
            disabled={isConfigured}
          />
          <p className="text-xs text-muted-foreground">
            Encuentra tu token en: Configuración → API → REST API Access token
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="userId">
            User ID <span className="text-red-500">*</span>
          </Label>
          <Input
            id="userId"
            placeholder="Tu User ID de Metricool"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={isConfigured}
          />
          <p className="text-xs text-muted-foreground">
            El identificador de tu cuenta de Metricool
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="blogId">
            Blog ID (Brand ID) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="blogId"
            placeholder="ID de tu marca en Metricool"
            value={blogId}
            onChange={(e) => setBlogId(e.target.value)}
            disabled={isConfigured}
          />
          <p className="text-xs text-muted-foreground">
            El número de identificación de tu marca (visible en la URL del navegador)
          </p>
        </div>

        <div className="flex gap-2">
          {!isConfigured ? (
            <Button onClick={handleSave} className="flex-1">
              Guardar Configuración
            </Button>
          ) : (
            <Button onClick={handleClear} variant="outline" className="flex-1 gap-2">
              <X className="h-4 w-4" />
              Reconfigurar
            </Button>
          )}
        </div>
      </div>

      {isConfigured && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-medium">
            ✅ Metricool configurado correctamente
          </p>
          <p className="text-xs text-green-700 mt-1">
            Ahora puedes publicar tus Stories en Facebook
          </p>
        </div>
      )}
    </Card>
  );
}
