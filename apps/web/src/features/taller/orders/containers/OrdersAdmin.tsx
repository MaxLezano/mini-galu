"use client";

import {
  type AdminOrderDetail,
  type AdminOrderSummary,
  ORDER_CHANNELS,
  ORDER_STATUSES,
  type OrderChannel,
  type OrderStatus,
  type ShippingMethod,
} from "@mini-galu/contracts";
import {
  ArrowRight,
  GripVertical,
  Link2,
  List,
  ListChecks,
  Printer,
  Search,
  SquareCheck,
  SquareKanban,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast, useUi } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { launchWhen, relativeWhen } from "@/lib/date";
import { SITE } from "@/lib/site";
import { useMounted } from "@/lib/use-mounted";
import { OPEN_ORDER, panelChanged } from "../../shell/panel-events";

import { OrdersBoard } from "../components/OrdersBoard";
import { OrdersList } from "../components/OrdersList";
import { PICKING_MODAL, PickingModal } from "../components/PickingModal";
import { WHATSAPP_MODAL, WhatsAppModal } from "../components/WhatsAppModal";
import { generateLabel } from "../label-action";
import { defaultTemplate, type NextAction, pickingList, type TemplateKey, toPrepare } from "../order-flow";
import { OrderDrawer } from "./OrderDrawer";
import { PAYMENT_LINK_MODAL, PaymentLinkModal } from "./PaymentLinkModal";
import "../orders.css";

const HOUR = 3_600_000;

/** Pedidos del taller — design/mockups/admin-pedidos.html */
export function OrdersAdmin({ initial, open: openFirst }: { initial: AdminOrderSummary[]; open: string | null }) {
  const [orders, setOrders] = useState(initial);
  const [view, setView] = useState<"board" | "list">("board");
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState<OrderChannel | "">("");
  const [ship, setShip] = useState<ShippingMethod | "">("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openNumber, setOpenNumber] = useState<string | null>(openFirst);
  const [picking, setPicking] = useState<AdminOrderSummary[]>([]);
  // al mover pedidos el menú y la campana vuelven a contar (no al montar: el armazón ya cargó al navegar)
  useEffect(() => {
    if (orders !== initial) panelChanged();
  }, [orders, initial]);
  // la búsqueda y la campana del armazón abren pedidos estando ya en esta pantalla
  useEffect(() => {
    const open = (e: Event) => setOpenNumber((e as CustomEvent<string>).detail);
    window.addEventListener(OPEN_ORDER, open);
    return () => window.removeEventListener(OPEN_ORDER, open);
  }, []);
  const [wa, setWa] = useState<{ order: AdminOrderDetail; template: TemplateKey } | null>(null);
  const [compact, setCompact] = useState(false);
  const mounted = useMounted();
  const { openModal, closeModal } = useUi();

  // en celular arranca en lista (como el mockup)
  useEffect(() => {
    const mq = matchMedia("(max-width: 700px)");
    setCompact(mq.matches);
    if (mq.matches) setView("list");
    const on = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const match = useCallback(
    (o: AdminOrderSummary) => {
      const text = `${o.number} ${o.customer.name} ${o.customer.city ?? ""}`.toLowerCase();
      return (
        (!q || text.includes(q.trim().toLowerCase())) &&
        (!channel || o.channel === channel) &&
        (!ship || o.shippingMethod === ship)
      );
    },
    [q, channel, ship],
  );
  const filtered = useMemo(() => orders.filter(match), [orders, match]);
  const listed = useMemo(() => filtered.filter((o) => !status || o.status === status), [filtered, status]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: filtered.length };
    for (const o of filtered) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [filtered]);

  const replace = (o: AdminOrderSummary) =>
    setOrders((list) => list.map((x) => (x.number === o.number ? { ...x, ...o } : x)));

  const move = async (number: string, to: OrderStatus) => {
    const before = orders.find((o) => o.number === number);
    if (!before) return;
    if (to === "esperando_pago") return toast("Un pedido pagado no puede volver a 'Esperando pago'");
    replace({ ...before, status: to, statusChangedAt: new Date().toISOString() });
    try {
      replace(await adminApi.moveOrder(number, to));
      toast(`#${number} · ${ORDER_STATUSES[to].short}`);
    } catch (e) {
      replace(before);
      toast(e instanceof ApiRequestError ? e.message : "No se pudo cambiar el estado");
    }
  };

  const openWhatsApp = async (number: string, template?: TemplateKey) => {
    try {
      const order = await adminApi.order(number);
      setWa({ order, template: template ?? defaultTemplate(order) });
      openModal(WHATSAPP_MODAL);
    } catch {
      toast("No se pudo abrir el pedido");
    }
  };

  const label = async (number: string) => {
    const r = await generateLabel(number);
    if ("error" in r) return toast(r.error);
    toast(`#${number} · Etiqueta Andreani generada`, { icon: <Printer className="i-sm" /> });
    adminApi.orders().then(setOrders, () => {});
  };

  const onNext = (o: AdminOrderSummary, a: NonNullable<NextAction>) => {
    if (a.kind === "whatsapp") return openWhatsApp(o.number, a.template);
    if (a.kind === "label") return label(o.number);
    if (a.kind === "href") return window.open(a.href, "_blank", "noopener");
    return move(o.number, a.to);
  };

  const select = (number: string, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      on ? n.add(number) : n.delete(number);
      return n;
    });

  const cardProps = (o: AdminOrderSummary) => ({
    when: mounted ? relativeWhen(o.statusChangedAt) : null,
    hot: mounted && Date.now() - new Date(o.statusChangedAt).getTime() < HOUR && o.status === "nuevo",
    selected: selected.has(o.number),
    onOpen: () => setOpenNumber(o.number),
    onNext: (a: NonNullable<NextAction>) => onNext(o, a),
    onSelect: (on: boolean) => select(o.number, on),
  });

  const showPicking = (list: AdminOrderSummary[]) => {
    setPicking(list);
    openModal(PICKING_MODAL);
  };

  const advanceSelected = async () => {
    try {
      const r = await adminApi.advanceOrders([...selected]);
      setOrders(await adminApi.orders());
      setSelected(new Set());
      toast(
        r.skipped.length
          ? `${r.moved.length} avanzados · ${r.skipped.length} sin siguiente paso`
          : `${r.moved.length} ${r.moved.length === 1 ? "pedido avanzado" : "pedidos avanzados"} de estado`,
        { icon: <ArrowRight className="i-sm" /> },
      );
    } catch {
      toast("No se pudieron avanzar los pedidos");
    }
  };

  const chosen = orders.filter((o) => selected.has(o.number));
  const pickRows = pickingList(picking);
  const wo = wa?.order;

  return (
    <main className="adm-content" id="adm-page">
      <div className="adm-head">
        <div>
          <span className="eyebrow is-in">Día a día</span>
          <h1 className="display">Pedidos</h1>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => showPicking(toPrepare(orders))}>
            <ListChecks className="i-sm" /> Lista de preparación
          </button>
          <button type="button" className="btn btn-sm" onClick={() => openModal(PAYMENT_LINK_MODAL)}>
            <Link2 className="i-sm" /> Link de pago
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="seg-btns" role="group" aria-label="Vista">
          <button type="button" aria-pressed={view === "board"} onClick={() => setView("board")}>
            <SquareKanban className="i-sm" />
            Tablero
          </button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
            <List className="i-sm" />
            Lista
          </button>
        </div>
        <label className="tiny-search">
          <span>
            <Search className="i-sm" />
          </span>
          <input
            className="input"
            placeholder="Buscar por número, cliente o ciudad"
            aria-label="Buscar pedidos"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="filters-row" role="group" aria-label="Canal">
          {([["", "Todos"], ...Object.entries(ORDER_CHANNELS)] as [OrderChannel | "", string][]).map(([k, label]) => (
            <button
              type="button"
              key={k || "todos"}
              className={`chip ${channel === k ? "is-on" : ""}`}
              onClick={() => setChannel(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          className="input"
          style={{ width: "auto", height: 40, borderRadius: 999, fontSize: 13.5 }}
          aria-label="Tipo de envío"
          value={ship}
          onChange={(e) => setShip(e.target.value as ShippingMethod | "")}
        >
          <option value="">Todos los envíos</option>
          <option value="domicilio">Domicilio</option>
          <option value="sucursal">Sucursal</option>
          <option value="taller">Retira en taller</option>
        </select>
      </div>

      <div className="hint">
        <span className="hide-s" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <GripVertical className="i-sm" /> Arrastrá un pedido a otra columna para cambiarle el estado.
        </span>
        <span className="grow" />
        <button
          type="button"
          className={`btn btn-xs btn-ghost ${selecting ? "is-on" : ""}`}
          onClick={() => {
            setSelecting((s) => !s);
            setSelected(new Set());
          }}
        >
          <SquareCheck className="i-sm" /> {selecting ? "Listo" : "Seleccionar"}
        </button>
      </div>

      {view === "board" ? (
        <OrdersBoard
          orders={filtered}
          selecting={selecting}
          cardProps={cardProps}
          onMove={move}
          onShowAll={(s) => {
            setView("list");
            setStatus(s);
          }}
        />
      ) : (
        <OrdersList
          orders={listed}
          counts={counts}
          status={status}
          compact={compact}
          selecting={selecting || !compact}
          selected={selected}
          cardProps={cardProps}
          onStatus={setStatus}
          onSelectAll={(on) => setSelected(on ? new Set(listed.map((o) => o.number)) : new Set())}
        />
      )}

      <div className={`bulk ${selected.size ? "is-on" : ""}`} role="region" aria-label="Acciones">
        <b>
          {selected.size} {selected.size === 1 ? "pedido" : "pedidos"}
        </b>
        <button type="button" className="btn" onClick={() => showPicking(chosen)}>
          <ListChecks className="i-sm" /> Preparación
        </button>
        {/* TODO(fase 5 · shipping): "Etiquetas" Andreani en un PDF */}
        <button type="button" className="btn" onClick={advanceSelected}>
          <ArrowRight className="i-sm" /> Avanzar estado
        </button>
        <button type="button" className="btn" aria-label="Deseleccionar" onClick={() => setSelected(new Set())}>
          <X className="i-sm" />
        </button>
      </div>

      <OrderDrawer
        number={openNumber}
        onChanged={(o) => replace(o)}
        onWhatsApp={(o, t) => {
          setWa({ order: o, template: t ?? defaultTemplate(o) });
          openModal(WHATSAPP_MODAL);
        }}
        onClose={() => setOpenNumber(null)}
      />
      <PickingModal rows={pickRows} orders={picking.length} onClose={closeModal} />
      <PaymentLinkModal onCreated={() => adminApi.orders().then(setOrders, () => {})} />
      <WhatsAppModal
        order={wo ?? null}
        template={wa?.template ?? "libre"}
        vars={{
          seguimiento: wo ? `${location.origin}/seguimiento?pedido=${wo.number}` : "",
          taller: SITE.workshop,
          horario: wo?.pickupLabel ? `Te esperamos el ${wo.pickupLabel}.` : "Coordinamos el horario por acá.",
          link: wo?.payUrl ?? "",
          vence: wo?.reservedUntil ? launchWhen(wo.reservedUntil) : "",
        }}
      />
    </main>
  );
}
