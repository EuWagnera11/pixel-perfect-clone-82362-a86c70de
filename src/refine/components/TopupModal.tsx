import { useEffect } from "react";
import { X, Sparkle } from "@phosphor-icons/react";
import { PRICING } from "../lib/credits";

type Props = {
  open: boolean;
  onClose: () => void;
  currentPlanId: string;
  onPurchase: (packageId: string) => void;
};

export function TopupModal({ open, onClose, currentPlanId, onPurchase }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const packages = Object.values(PRICING.topup_packages);
  const eligible = currentPlanId !== "free" && currentPlanId !== "starter";

  return (
    <div className="topup-overlay" onClick={onClose}>
      <div className="topup-modal" onClick={(e) => e.stopPropagation()}>
        <button className="topup-close" onClick={onClose} aria-label="Fechar">
          <X size={16} weight="bold" />
        </button>
        <div className="topup-header">
          <h2>Comprar créditos avulsos</h2>
          <p>Créditos extras válidos por 3 anos. Usados primeiro nas próximas gerações.</p>
        </div>

        {!eligible && (
          <div className="topup-locked">
            <Sparkle size={14} weight="fill" />
            Top-up disponível para Creator, Pro e Studio.
            <a href="/pricing">Fazer upgrade</a>
          </div>
        )}

        <div className="topup-grid">
          {packages.map((pkg: any) => {
            const perK = ((pkg.price_brl / pkg.credits) * 1000).toFixed(2);
            return (
              <button
                key={pkg.id}
                className="topup-card"
                disabled={!eligible}
                onClick={() => onPurchase(pkg.id)}
              >
                <div className="topup-card-name">{pkg.name}</div>
                <div className="topup-card-credits">
                  {pkg.credits.toLocaleString("pt-BR")} <span>cr</span>
                </div>
                <div className="topup-card-price">R$ {pkg.price_brl}</div>
                <div className="topup-card-rate">R$ {perK}/1k cr</div>
              </button>
            );
          })}
        </div>

        <div className="topup-foot">
          Quer mais créditos por mês? <a href="/pricing">Comparar planos</a>
        </div>
      </div>
    </div>
  );
}
