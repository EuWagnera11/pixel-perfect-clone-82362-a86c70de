import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const tiers = [
  { name: "Starter", price: "R$ 30", credits: "50 fotos / mês", features: ["1 persona", "Templates basic", "Resolução 2K"] },
  { name: "Pro", price: "R$ 97", credits: "300 fotos / mês", features: ["3 personas", "Todos templates", "Magnific upscale", "4K"], featured: true },
  { name: "Agency", price: "R$ 297", credits: "1.500 fotos / mês", features: ["15 personas", "White-label", "API"] },
  { name: "Enterprise", price: "Custom", credits: "Sob medida", features: ["Modelo dedicada", "SLA", "Onboarding 1:1"] },
];

export default function Billing() {
  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">Plano</div>
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Faturamento</h1>
      <p className="mb-8 text-sm text-muted-foreground">Você está no plano <span className="font-medium text-foreground">Free</span> — 3 gerações grátis para teste.</p>

      <div className="grid gap-5 lg:grid-cols-4">
        {tiers.map(t => (
          <div key={t.name} className={`rounded-2xl border p-6 ${t.featured ? "border-primary bg-primary-light/40" : "border-border bg-background"}`}>
            <div className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">{t.name}</div>
            <div className="mb-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{t.price}</span>
              {t.price !== "Custom" && <span className="text-sm text-muted-foreground">/mês</span>}
            </div>
            <div className="mb-6 text-sm text-muted-foreground">{t.credits}</div>
            <Button variant={t.featured ? "default" : "outline"} className="w-full">
              {t.price === "Custom" ? "Falar com vendas" : "Escolher"}
            </Button>
            <ul className="mt-6 space-y-2">
              {t.features.map(f => (
                <li key={f} className="flex gap-2 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
