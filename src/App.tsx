import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import AuthPage from "./pages/Auth";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import Personas from "./pages/app/Personas";
import PersonaNew from "./pages/app/PersonaNew";
import Templates from "./pages/app/Templates";
import Generate from "./pages/app/Generate";
import Generations from "./pages/app/Generations";
import Billing from "./pages/app/Billing";
import Settings from "./pages/app/Settings";
import Suite from "./pages/app/Suite";
import AudioStudio from "./pages/app/AudioStudio";
import EditStudio from "./pages/app/EditStudio";
import SpecializedStudio from "./pages/app/SpecializedStudio";
import DriveStudio from "./pages/app/DriveStudio";
import BatchStudio from "./pages/app/BatchStudio";
import LearnStudio from "./pages/app/LearnStudio";
import RecreateStudio from "./pages/app/RecreateStudio";
import PresetsCatalog from "./pages/app/PresetsCatalog";
import WorldsCatalog from "./pages/app/WorldsCatalog";
import CalendarStudio from "./pages/app/CalendarStudio";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="personas" element={<Personas />} />
              <Route path="personas/new" element={<PersonaNew />} />
              <Route path="templates" element={<Templates />} />
              <Route path="generate" element={<Generate />} />
              <Route path="generations" element={<Generations />} />
              <Route path="billing" element={<Billing />} />
              <Route path="settings" element={<Settings />} />
              <Route path="suite" element={<Suite />} />
              <Route path="audio" element={<AudioStudio />} />
              <Route path="edit" element={<EditStudio />} />
              <Route path="specialized" element={<SpecializedStudio />} />
              <Route path="drive" element={<DriveStudio />} />
              <Route path="batch" element={<BatchStudio />} />
              <Route path="learn" element={<LearnStudio />} />
              <Route path="recreate" element={<RecreateStudio />} />
              <Route path="presets" element={<PresetsCatalog />} />
              <Route path="worlds" element={<WorldsCatalog />} />
              <Route path="calendar" element={<CalendarStudio />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
