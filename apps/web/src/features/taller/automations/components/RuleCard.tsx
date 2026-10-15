import { type AdminAutomationRule, AUTOMATION_RULES } from "@mini-galu/contracts";
import {
  BadgeCheck,
  BellRing,
  Cake,
  CalendarHeart,
  Check,
  CornerDownRight,
  House,
  LayoutDashboard,
  Link2,
  type LucideIcon,
  Mail,
  Printer,
  ShoppingBag,
  Store,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { BrandIcon } from "@/ui/atoms/BrandIcon";

const ICON: Record<AdminAutomationRule["key"], LucideIcon> = {
  pago_aprobado: BadgeCheck,
  etiqueta: Printer,
  despachado: Truck,
  entregado: House,
  listo_retirar: Store,
  volvio_talle: BellRing,
  lanzamiento: CalendarHeart,
  link_sin_pagar: Link2,
  bolsa_abandonada: ShoppingBag,
  cumple: Cake,
  stock_bajo: TriangleAlert,
};

type Props = {
  rule: AdminAutomationRule;
  busy: boolean;
  onToggle: (on: boolean) => void;
  onEdit: () => void;
};

/** Una regla — admin-automatizaciones.html → .auto */
export function RuleCard({ rule, busy, onToggle, onEdit }: Props) {
  const def = AUTOMATION_RULES[rule.key];
  const Icon = ICON[rule.key];
  const locked = "locked" in def && def.locked;
  return (
    <article className={`auto ${rule.on ? "" : "off"}`} data-rule={rule.key}>
      <div className="head">
        <span className="ic">
          <Icon />
        </span>
        <b>{def.title}</b>
        {def.phase ? (
          <span className="pill-status st-muted">{def.phase}</span>
        ) : (
          <input
            className="tog"
            type="checkbox"
            checked={rule.on}
            disabled={busy || locked}
            title={locked ? "Es parte del flujo del pedido" : undefined}
            aria-label={`Activar ${def.title}`}
            onChange={(e) => onToggle(e.target.checked)}
          />
        )}
      </div>
      <div className="when">
        <CornerDownRight className="i-sm" />
        <span>
          <b>Cuando</b> {def.when}
        </span>
      </div>
      <ul className="does">
        {def.does.map((d) => (
          <li key={d}>
            <Check className="i-sm" />
            {d}
          </li>
        ))}
      </ul>
      <div className="foot">
        <span className="chs">
          {def.channels.map((c) =>
            c === "whatsapp" ? (
              <BrandIcon key={c} name="whatsapp" />
            ) : c === "mail" ? (
              <Mail key={c} />
            ) : (
              <LayoutDashboard key={c} />
            ),
          )}
          <span>{rule.runs ? `${rule.runs} ${rule.runs === 1 ? "vez" : "veces"} este mes` : "Todavía no se usó"}</span>
        </span>
        {rule.message !== null && !def.phase && (
          <button type="button" className="link" onClick={onEdit}>
            Editar mensaje
          </button>
        )}
      </div>
    </article>
  );
}
