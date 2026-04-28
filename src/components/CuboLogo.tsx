import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Refine logo — wordmark minimalista premium.
 * Quadrado laranja com "R" em serif refinada + wordmark Inter.
 */
export function CuboLogo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground font-serif text-base font-bold leading-none">
        R
      </span>
      <span className={cn("text-base font-semibold", dark ? "text-background" : "text-foreground")}>
        refine<span className="text-primary">.</span>
      </span>
    </Link>
  );
}
