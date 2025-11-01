import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Upload from "./pages/Upload";
import Preset from "./pages/Preset";
import Manual from "./pages/Manual";
import Process from "./pages/Process";
import Publish from "./pages/Publish";
import Auth from "./pages/Auth";
import Profiles from "./pages/Profiles";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import MobileDownload from "./pages/MobileDownload";
import NotFound from "./pages/NotFound";
import AuthGuard from "./components/AuthGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<AuthGuard><Upload /></AuthGuard>} />
          <Route path="/projects" element={<AuthGuard><Projects /></AuthGuard>} />
          <Route path="/projects/:projectId" element={<AuthGuard><ProjectDetail /></AuthGuard>} />
          <Route path="/profiles" element={<AuthGuard><Profiles /></AuthGuard>} />
          <Route path="/preset/:presetId" element={<AuthGuard><Preset /></AuthGuard>} />
          <Route path="/manual/:uploadId" element={<AuthGuard><Manual /></AuthGuard>} />
          <Route path="/process/:jobId" element={<AuthGuard><Process /></AuthGuard>} />
          <Route path="/publish/:jobId" element={<AuthGuard><Publish /></AuthGuard>} />
          <Route path="/mobile-download/:jobId" element={<MobileDownload />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
