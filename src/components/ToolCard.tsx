import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  to: string;
  /** Optional gradient applied to the icon tile (CSS background value). */
  gradient?: string;
  /** Optional badge color tone: "copper" (default) | "amber" | "violet" | "emerald" | "sky" | "rose". */
  tone?: "copper" | "amber" | "violet" | "emerald" | "sky" | "rose";
  /** Animation delay (seconds) for staggered grids. */
  delay?: number;
  /** Mark as "new" or "soon" with a small status pill. */
  status?: "new" | "soon" | "pro";
  className?: string;
};

const toneMap: Record<NonNullable<ToolCardProps["tone"]>, string> = {
  copper: "bg-primary/10 text-primary border-primary/20",
  amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  violet: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  sky: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  rose: "bg-rose-500/10 text-rose-300 border-rose-500/20",
};

const statusMap: Record<NonNullable<ToolCardProps["status"]>, { label: string; cls: string }> = {
  new: { label: "Novo", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  soon: { label: "Em breve", cls: "bg-white/5 text-foreground-muted border-white/10" },
  pro: { label: "Pro", cls: "bg-primary/15 text-primary border-primary/30" },
};

export function ToolCard({
  icon: Icon,
  title,
  description,
  badge,
  to,
  gradient,
  tone = "copper",
  delay = 0,
  status,
  className,
}: ToolCardProps) {
  const isSoon = status === "soon";
  const Wrapper: any = isSoon ? "div" : Link;
  const wrapperProps = isSoon ? {} : { to };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("h-full", className)}
    >
      <Wrapper
        {...wrapperProps}
        className={cn(
          "tool-card group relative flex h-full flex-col gap-5 p-5 lg:p-6",
          isSoon && "pointer-events-none opacity-70",
        )}
      >
        {/* Glow halo on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, hsl(19 80% 55% / 0.18) 0%, transparent 70%)",
          }}
        />

        {/* Top row: icon + status */}
        <div className="relative flex items-start justify-between">
          <div
            className="grid h-11 w-11 place-items-center rounded-xl border border-white/5 text-foreground shadow-inner"
            style={{
              background:
                gradient ??
                "linear-gradient(135deg, hsl(240 5% 14%) 0%, hsl(240 5% 9%) 100%)",
            }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            {status && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                  statusMap[status].cls,
                )}
              >
                {statusMap[status].label}
              </span>
            )}
            <span className="grid h-7 w-7 place-items-center rounded-full border border-white/5 bg-white/5 text-foreground-muted transition-all group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="relative flex-1">
          <div className="text-base font-semibold tracking-tight text-foreground">{title}</div>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-foreground-muted">
            {description}
          </p>
        </div>

        {/* Footer badge */}
        {badge && (
          <div className="relative">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
                toneMap[tone],
              )}
            >
              <span
                aria-hidden
                className="inline-block h-1 w-1 rounded-full bg-current"
              />
              {badge}
            </span>
          </div>
        )}
      </Wrapper>
    </motion.div>
  );
}

export default ToolCard;
