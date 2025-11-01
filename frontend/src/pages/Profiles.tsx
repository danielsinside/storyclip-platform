import Header from "@/components/Header";
import { ProfileManager } from "@/components/ProfileManager";
import AuthGuard from "@/components/AuthGuard";

export default function Profiles() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Perfiles de Creador</h1>
            <p className="text-muted-foreground">
              Configura y gestiona tus perfiles predefinidos con diferentes estilos y configuraciones
            </p>
          </div>
          
          <ProfileManager />
        </main>
      </div>
    </AuthGuard>
  );
}
