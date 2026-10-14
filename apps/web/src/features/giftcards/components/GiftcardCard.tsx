import { formatARS, type GiftcardDesign } from "@mini-galu/contracts";
import { Bow } from "@/ui/atoms/Bow";
import { Embroidery } from "@/ui/atoms/Embroidery";

/** La tarjeta (giftcards.html → .gc): diseño, monto y para quién. */
export function GiftcardCard({
  design,
  amountCents,
  toName,
  className = "",
  logoSize = 24,
}: {
  design: GiftcardDesign;
  amountCents: number;
  toName: string;
  className?: string;
  logoSize?: number;
}) {
  return (
    <div className={`gc ${className}`} data-d={design}>
      <Embroidery />
      <div className="bow">
        <Bow />
      </div>
      <span className="logo" style={{ fontSize: logoSize }}>
        Mini Galú
      </span>
      <div className="amt">{formatARS(amountCents)}</div>
      <div className="row">
        <span className="to">Para {toName.trim() || "…"} ♡</span>
        <small>GIFT CARD</small>
      </div>
    </div>
  );
}
