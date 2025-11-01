import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import type { SeedType, DelayMode } from "@/types";
import { profileSchema } from "@/lib/validation";
import { z } from "zod";

interface CreatorProfile {
  id: string;
  name: string;
  timezone: string;
  seed: SeedType;
  delay_mode: DelayMode;
  safe_hours_start: string;
  safe_hours_end: string;
  allow_flip: boolean;
  metricool_brand_id?: string;
  is_active: boolean;
}

interface ProfileManagerProps {
  onProfileSelect?: (profile: CreatorProfile | null) => void;
}

export function ProfileManager({ onProfileSelect }: ProfileManagerProps) {
  const [profiles, setProfiles] = useState<CreatorProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<CreatorProfile | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    timezone: "UTC",
    seed: "natural" as SeedType,
    delay_mode: "NATURAL" as DelayMode,
    safe_hours_start: "09:00",
    safe_hours_end: "21:00",
    allow_flip: true,
    metricool_brand_id: "",
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("creator_profiles")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error loading profiles:", error);
      toast.error("Error al cargar perfiles");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Debes iniciar sesión");
        return;
      }

      // Validate input data
      const validated = profileSchema.parse(formData);

      if (editingId) {
        const updateData: any = validated;
        const { error } = await supabase
          .from("creator_profiles")
          .update(updateData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Perfil actualizado");
      } else {
        const insertData: any = {
          ...validated,
          user_id: user.id,
        };
        const { error } = await supabase
          .from("creator_profiles")
          .insert(insertData);

        if (error) throw error;
        toast.success("Perfil creado");
      }

      resetForm();
      loadProfiles();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
      toast.error("Error al guardar perfil");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("creator_profiles")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      toast.success("Perfil eliminado");
      loadProfiles();
      if (selectedProfile?.id === id) {
        setSelectedProfile(null);
        onProfileSelect?.(null);
      }
    } catch (error) {
      console.error("Error deleting profile:", error);
      toast.error("Error al eliminar perfil");
    }
  };

  const handleEdit = (profile: CreatorProfile) => {
    setFormData({
      name: profile.name,
      timezone: profile.timezone,
      seed: profile.seed,
      delay_mode: profile.delay_mode,
      safe_hours_start: profile.safe_hours_start,
      safe_hours_end: profile.safe_hours_end,
      allow_flip: profile.allow_flip,
      metricool_brand_id: profile.metricool_brand_id || "",
    });
    setEditingId(profile.id);
    setIsCreating(true);
  };

  const handleSelect = (profile: CreatorProfile) => {
    setSelectedProfile(profile);
    onProfileSelect?.(profile);
    toast.success(`Perfil "${profile.name}" seleccionado`);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      timezone: "UTC",
      seed: "natural",
      delay_mode: "NATURAL",
      safe_hours_start: "09:00",
      safe_hours_end: "21:00",
      allow_flip: true,
      metricool_brand_id: "",
    });
    setEditingId(null);
    setIsCreating(false);
  };

  if (loading) {
    return <div className="animate-pulse">Cargando perfiles...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Profile List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Perfiles de Creador</CardTitle>
              <CardDescription>
                Gestiona tus configuraciones predefinidas
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsCreating(!isCreating)}
              variant={isCreating ? "outline" : "default"}
              size="sm"
            >
              {isCreating ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {isCreating ? "Cancelar" : "Nuevo Perfil"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay perfiles creados. Crea uno para empezar.
            </p>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedProfile?.id === profile.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => handleSelect(profile)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{profile.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {profile.seed} • {profile.delay_mode} • {profile.timezone}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(profile);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(profile.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar" : "Crear"} Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Mi Canal Tech"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="seed">Estilo (Seed)</Label>
                <Select
                  value={formData.seed}
                  onValueChange={(value) => setFormData({ ...formData, seed: value as SeedType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natural">Natural</SelectItem>
                    <SelectItem value="viral">Viral</SelectItem>
                    <SelectItem value="cinematica">Cinematica</SelectItem>
                    <SelectItem value="humor">Humor</SelectItem>
                    <SelectItem value="impacto">Impacto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="delay_mode">Modo de Delay</Label>
                <Select
                  value={formData.delay_mode}
                  onValueChange={(value) => setFormData({ ...formData, delay_mode: value as DelayMode })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HYPE">HYPE</SelectItem>
                    <SelectItem value="FAST">FAST</SelectItem>
                    <SelectItem value="NATURAL">NATURAL</SelectItem>
                    <SelectItem value="PRO">PRO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="timezone">Zona Horaria</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => setFormData({ ...formData, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">America/New_York</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                  <SelectItem value="Europe/Madrid">Europe/Madrid</SelectItem>
                  <SelectItem value="Europe/London">Europe/London</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="safe_hours_start">Hora Inicio Segura</Label>
                <Input
                  id="safe_hours_start"
                  type="time"
                  value={formData.safe_hours_start}
                  onChange={(e) => setFormData({ ...formData, safe_hours_start: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="safe_hours_end">Hora Fin Segura</Label>
                <Input
                  id="safe_hours_end"
                  type="time"
                  value={formData.safe_hours_end}
                  onChange={(e) => setFormData({ ...formData, safe_hours_end: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="allow_flip"
                checked={formData.allow_flip}
                onCheckedChange={(checked) => setFormData({ ...formData, allow_flip: checked })}
              />
              <Label htmlFor="allow_flip">Permitir Flip</Label>
            </div>

            <div>
              <Label htmlFor="metricool_brand_id">Metricool Brand ID (opcional)</Label>
              <Input
                id="metricool_brand_id"
                value={formData.metricool_brand_id}
                onChange={(e) => setFormData({ ...formData, metricool_brand_id: e.target.value })}
                placeholder="brand_123"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {editingId ? "Actualizar" : "Crear"} Perfil
              </Button>
              <Button onClick={resetForm} variant="outline">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
