import { type AdminOrderSummary, formatARS, ORDER_CHANNELS } from "@mini-galu/contracts";
import {
  CircleCheck,
  CreditCard,
  ExternalLink,
  Globe,
  House,
  MessageCircleHeart,
  PackageCheck,
  Printer,
  Scissors,
  Send,
  Star,
  Store,
  Truck,
} from "lucide-react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { type NextAction, nextAction } from "../order-flow";

export const SHIP_SHORT = { domicilio: "Domicilio", sucursal: "Sucursal", taller: "Retira" } as const;
export const ShipIcon = ({ method }: { method: AdminOrderSummary["shippingMethod"] }) =>
  method === "taller" ? (
    <House className="i-sm" />
  ) : method === "sucursal" ? (
    <Store className="i-sm" />
  ) : (
    <Truck className="i-sm" />
  );

export function ChannelIcon({ channel }: { channel: AdminOrderSummary["channel"] }) {
  if (channel === "whatsapp") return <BrandIcon name="whatsapp" />;
  if (channel === "instagram") return <BrandIcon name="instagram" />;
  if (channel === "galu") return <MessageCircleHeart className="i-sm" />;
  return <Globe className="i-sm" />;
}

const ACTION_ICON: Record<NonNullable<NextAction>["icon"], ReactNode> = {
  scissors: <Scissors className="i-sm" />,
  "package-check": <PackageCheck className="i-sm" />,
  truck: <Truck className="i-sm" />,
  "circle-check": <CircleCheck className="i-sm" />,
  star: <Star className="i-sm" />,
  send: <Send className="i-sm" />,
  printer: <Printer className="i-sm" />,
  "external-link": <ExternalLink className="i-sm" />,
};
export const ActionIcon = ({ icon }: { icon: NonNullable<NextAction>["icon"] }) => ACTION_ICON[icon];

type Props = {
  order: AdminOrderSummary;
  /** "hace 25 min" (null hasta montar: depende del reloj). */
  when: string | null;
  /** Pasó al estado actual hace menos de una hora. */
  hot: boolean;
  selected: boolean;
  /** Muestra el estado arriba (lista en celular). */
  statusPill?: ReactNode;
  onOpen: () => void;
  onNext: (a: NonNullable<NextAction>) => void;
  onSelect: (on: boolean) => void;
  /** Arrastre del tablero (dnd-kit). */
  dragRef?: Ref<HTMLElement>;
  dragProps?: HTMLAttributes<HTMLElement>;
  dragging?: boolean;
};

/** Tarjeta de pedido — admin-pedidos.html → ocard(). */
export function OrderCard({
  order: o,
  when,
  hot,
  selected,
  statusPill,
  onOpen,
  onNext,
  onSelect,
  dragRef,
  dragProps,
  dragging,
}: Props) {
  const nx = nextAction(o);
  return (
    // Click en cualquier parte de la tarjeta abre el detalle (atajo de mouse); con teclado se abre desde el número.
    // biome-ignore lint/a11y/useKeyWithClickEvents: el acceso con teclado es el botón del número
    <article
      ref={dragRef}
      {...dragProps}
      className={`ocard ${dragging ? "sortable-chosen" : ""}`}
      data-order={o.number}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button, input, label")) return;
        onOpen();
      }}
    >
      <label className="sel check" aria-label={`Seleccionar #${o.number}`}>
        <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)} />
      </label>
      <div className="top">
        {statusPill}
        <button
          type="button"
          className="onum"
          onClick={onOpen}
          aria-label={`Abrir pedido #${o.number} de ${o.customer.name}`}
        >
          <b>#{o.number}</b>
        </button>
        <small>{when ?? ""}</small>
      </div>
      <div className="who">
        {o.customer.name}
        <small>
          {[o.customer.city, `${o.units} ${o.units === 1 ? "prenda" : "prendas"}`, formatARS(o.totalCents)]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </div>
      <div className="bottom">
        <span className="thumbs-row">
          {o.items.map((i) => (
            <img key={`${i.slug}-${i.size}`} src={i.imageUrl} alt="" />
          ))}
        </span>
      </div>
      <div className="flags">
        <span className="flag">
          <ChannelIcon channel={o.channel} />
          {ORDER_CHANNELS[o.channel]}
        </span>
        <span className="flag">
          <ShipIcon method={o.shippingMethod} />
          {SHIP_SHORT[o.shippingMethod]}
        </span>
        {o.paymentMethod === "credito" && (o.installments ?? 1) > 1 && (
          <span className="flag">
            <CreditCard className="i-sm" />
            {o.installments} cuotas
          </span>
        )}
        {hot && <span className="flag hot">Recién</span>}
      </div>
      {nx && (
        <button
          type="button"
          className={`btn btn-xs ${o.status === "nuevo" ? "" : "btn-soft"} next`}
          onClick={() => onNext(nx)}
        >
          <ActionIcon icon={nx.icon} /> {nx.label}
        </button>
      )}
    </article>
  );
}
