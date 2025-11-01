import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, AlertCircle, Settings2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CreatorSelectorProps {
  onSelectionChange: (creators: Array<{ id: string; blogId: string; name: string }>) => void;
}

interface MetricoolBrand {
  id: number;
  label: string;
  picture?: string;
  facebook?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  linkedinCompany?: string | null;
  pinterest?: string | null;
  timezone?: string;
}

const getConnectedNetworks = (brand: MetricoolBrand): string[] => {
  const networks: string[] = [];
  if (brand.facebook) networks.push('Facebook');
  if (brand.instagram) networks.push('Instagram');
  if (brand.twitter) networks.push('Twitter');
  if (brand.tiktok) networks.push('TikTok');
  if (brand.youtube) networks.push('YouTube');
  if (brand.linkedinCompany) networks.push('LinkedIn');
  if (brand.pinterest) networks.push('Pinterest');
  return networks;
};

export const CreatorSelector = ({ onSelectionChange }: CreatorSelectorProps) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [allBrands, setAllBrands] = useState<MetricoolBrand[]>([]);
  const [portfolioBrands, setPortfolioBrands] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portfolioOpen, setPortfolioOpen] = useState(false);

  // Get visible brands based on portfolio selection
  const visibleBrands = allBrands.filter(brand => portfolioBrands.has(String(brand.id)));

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getMetricoolBrands();
      
      if (response?.success && response?.brands) {
        setAllBrands(response.brands);
        
        // By default, add all brands to portfolio
        const allBrandIds = new Set<string>(response.brands.map((b: MetricoolBrand) => String(b.id)));
        setPortfolioBrands(allBrandIds);
        
        // Auto-select first brand
        if (response.brands.length > 0) {
          const firstBrandId = String(response.brands[0].id);
          setSelected([firstBrandId]);
          onSelectionChange([{
            id: firstBrandId,
            blogId: firstBrandId,
            name: response.brands[0].label
          }]);
        }
      } else {
        setError('No se pudieron cargar los creadores de Metricool');
      }
    } catch (error: any) {
      console.error('Error loading brands:', error);
      setError(error.message || 'Error al cargar creadores');
    } finally {
      setLoading(false);
    }
  };

  const updateParentSelection = (selectedIds: string[]) => {
    const mappedCreators = selectedIds.map(id => {
      const brand = allBrands.find(b => String(b.id) === id);
      return {
        id,
        blogId: id,
        name: brand?.label || 'Unknown'
      };
    });
    onSelectionChange(mappedCreators);
  };

  const handleToggle = (brandId: string) => {
    const newSelected = selected.includes(brandId)
      ? selected.filter(id => id !== brandId)
      : [...selected, brandId];
    
    setSelected(newSelected);
    updateParentSelection(newSelected);
  };

  const handlePortfolioToggle = (brandId: string) => {
    setPortfolioBrands(prev => {
      const newSet = new Set(prev);
      if (newSet.has(brandId)) {
        newSet.delete(brandId);
        // If brand was selected and we remove it from portfolio, deselect it
        if (selected.includes(brandId)) {
          const newSelected = selected.filter(id => id !== brandId);
          setSelected(newSelected);
          updateParentSelection(newSelected);
        }
      } else {
        newSet.add(brandId);
      }
      return newSet;
    });
  };

  return (
    <Card className="p-6 shadow-card border-border/50 hover:border-primary/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gradient">Select Creators</h3>
        <Collapsible open={portfolioOpen} onOpenChange={setPortfolioOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <Settings2 className="h-4 w-4" />
              Portafolio
            </Button>
          </CollapsibleTrigger>
            <CollapsibleContent className="absolute right-6 mt-2 z-50 max-h-[400px] overflow-y-auto">
              <Card className="p-4 shadow-lg border-2 animate-fade-in w-80">
                <h4 className="text-sm font-semibold mb-3">Gestiona tu portafolio de brands</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Selecciona qué brands quieres que aparezcan en el selector
                </p>
                <div className="space-y-3">
                  {allBrands.map((brand) => {
                    const brandId = String(brand.id);
                    const networks = getConnectedNetworks(brand);
                    
                    return (
                      <div 
                        key={brandId} 
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={`portfolio-${brandId}`}
                          checked={portfolioBrands.has(brandId)}
                          onCheckedChange={() => handlePortfolioToggle(brandId)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`portfolio-${brandId}`}
                            className="text-sm font-medium cursor-pointer block mb-1"
                          >
                            {brand.label || 'Sin nombre'}
                          </Label>
                          <div className="flex gap-1 flex-wrap">
                            {networks.map((network) => (
                              <Badge 
                                key={network} 
                                variant="outline" 
                                className="text-xs"
                              >
                                {network}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      
      {loading && (
        <div className="flex flex-col items-center gap-4 text-muted-foreground py-12 justify-center animate-fade-in">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-sm font-medium">Cargando creadores</p>
            <p className="text-xs text-muted-foreground mt-1">Conectando con Metricool...</p>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4 animate-fade-in">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && visibleBrands.length === 0 && (
        <Alert className="mb-4 animate-fade-in">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay brands seleccionados en tu portafolio. Haz clic en "Portafolio" para gestionar tus brands.
          </AlertDescription>
        </Alert>
      )}

      {!loading && visibleBrands.length > 0 && (
        <div className="space-y-2">
          {visibleBrands.map((brand, index) => {
            const networks = getConnectedNetworks(brand);
            const brandId = String(brand.id);
            const isSelected = selected.includes(brandId);
            
            return (
              <div 
                key={brandId} 
                className={`
                  group relative overflow-hidden
                  flex items-center gap-3 p-3 rounded-xl
                  border-2 transition-all duration-300
                  cursor-pointer animate-fade-in
                  ${isSelected 
                    ? 'border-primary bg-primary/5 shadow-glow' 
                    : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
                  }
                `}
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => handleToggle(brandId)}
              >
                {/* Selection indicator */}
                <div className={`
                  absolute left-0 top-0 bottom-0 w-1 transition-all duration-300
                  ${isSelected ? 'bg-primary' : 'bg-transparent'}
                `} />
                
                {/* Checkbox */}
                <Checkbox
                  id={brandId}
                  checked={isSelected}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
                
                {/* Avatar with hover effect */}
                <div className="relative">
                  <Avatar className={`
                    h-12 w-12 ring-2 transition-all duration-300
                    ${isSelected 
                      ? 'ring-primary ring-offset-2 ring-offset-background' 
                      : 'ring-border/50 group-hover:ring-primary/50'
                    }
                  `}>
                    <AvatarImage src={brand.picture} alt={brand.label || 'Brand'} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                      {(brand.label || 'NA').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Online indicator */}
                  {networks.length > 0 && (
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-success border-2 border-background animate-pulse" />
                  )}
                </div>
                
                {/* Content */}
                <Label
                  htmlFor={brandId}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`
                        font-semibold transition-colors duration-200
                        ${isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'}
                      `}>
                        {brand.label || 'Sin nombre'}
                      </span>
                    </div>
                    
                    {/* Networks badges with animation */}
                    <div className="flex gap-1 flex-wrap">
                      {networks.map((network, idx) => (
                        <Badge 
                          key={network} 
                          variant={isSelected ? "default" : "outline"}
                          className="text-xs animate-fade-in transition-all duration-200 hover:scale-105"
                          style={{ animationDelay: `${(index * 0.05) + (idx * 0.02)}s` }}
                        >
                          {network}
                        </Badge>
                      ))}
                      {networks.length === 0 && (
                        <Badge variant="outline" className="text-xs text-muted-foreground opacity-60">
                          Sin redes conectadas
                        </Badge>
                      )}
                    </div>
                  </div>
                </Label>
                
                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                    <svg className="h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {!loading && visibleBrands.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center animate-fade-in">
            {selected.length === 0 
              ? 'Selecciona al menos un creador para publicar' 
              : `${selected.length} creador${selected.length !== 1 ? 'es' : ''} seleccionado${selected.length !== 1 ? 's' : ''}`
            }
          </p>
        </div>
      )}
    </Card>
  );
};
