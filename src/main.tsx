import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import "./styles/mockup.css";
import RefineApp from "./refine/RefineApp";

createRoot(document.getElementById("root")!).render(
  <>
    <RefineApp />
    <Sonner position="bottom-right" richColors />
  </>
);
