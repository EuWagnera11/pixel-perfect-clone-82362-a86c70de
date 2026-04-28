import { Link } from "react-router-dom";
import { Box } from "lucide-react";
import { cn } from "@/lib/utils";

export function CuboLogo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
        <Box className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <span className={cn("text-base", dark ? "text-background" : "text-foreground")}>
        Cubo<span className="text-primary">.</span>Studio
      </span>
    </Link>
  );
}
