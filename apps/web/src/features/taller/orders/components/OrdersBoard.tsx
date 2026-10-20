"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  type AdminOrderSummary,
  BOARD_STATUSES,
  formatARS,
  ORDER_STATUSES,
  type OrderStatus,
} from "@mini-galu/contracts";
import { CircleCheck, Hourglass, Inbox, PackageCheck, Scissors, Truck } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { OrderCard } from "./OrderCard";

const COL_ICON: Record<(typeof BOARD_STATUSES)[number], ReactNode> = {
  esperando_pago: <Hourglass className="i-sm" />,
  nuevo: <Inbox className="i-sm" />,
  preparando: <Scissors className="i-sm" />,
  listo: <PackageCheck className="i-sm" />,
  en_camino: <Truck className="i-sm" />,
  entregado: <CircleCheck className="i-sm" />,
};

type CardProps = Omit<ComponentProps<typeof OrderCard>, "order" | "dragRef" | "dragProps" | "dragging">;

type Props = {
  orders: AdminOrderSummary[];
  selecting: boolean;
  cardProps: (o: AdminOrderSummary) => CardProps;
  onMove: (number: string, to: OrderStatus) => void;
  /** "Ver los N" de la columna de entregados: pasa a la lista filtrada. */
  onShowAll: (status: OrderStatus) => void;
};

function DraggableCard({ order, props }: { order: AdminOrderSummary; props: CardProps }) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: order.number });
  return (
    <div style={{ opacity: isDragging ? 0.35 : 1 }}>
      <OrderCard {...props} order={order} dragRef={setNodeRef} dragProps={listeners} />
    </div>
  );
}

function Column({ status, children }: { status: OrderStatus; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className="col-list"
      data-status={status}
      style={isOver ? { outline: "2px dashed var(--canela)", outlineOffset: 4, borderRadius: 14 } : undefined}
    >
      {children}
    </div>
  );
}

/** Tablero por estado: se arrastra un pedido a otra columna para cambiarle el estado (admin-pedidos.html). */
export function OrdersBoard({ orders, selecting, cardProps, onMove, onShowAll }: Props) {
  const [active, setActive] = useState<AdminOrderSummary | null>(null);
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const start = (e: DragStartEvent) => setActive(orders.find((o) => o.number === e.active.id) ?? null);
  const end = (e: DragEndEvent) => {
    setActive(null);
    const o = orders.find((x) => x.number === e.active.id);
    const to = e.over?.id as OrderStatus | undefined;
    if (o && to && to !== o.status) onMove(o.number, to);
  };

  return (
    <DndContext id={dndId} sensors={sensors} onDragStart={start} onDragEnd={end} onDragCancel={() => setActive(null)}>
      {/* con scroll horizontal: enfocable para moverlo con el teclado aunque no haya tarjetas (axe) */}
      <section
        className={`board ${selecting ? "selecting" : ""}`}
        id="board"
        aria-label="Tablero de pedidos"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: región con scroll, el foco permite desplazarla
        tabIndex={0}
      >
        {BOARD_STATUSES.map((s) => {
          const list = orders.filter((o) => o.status === s);
          const shown = s === "entregado" ? list.slice(0, 4) : list;
          const st = ORDER_STATUSES[s];
          return (
            <section className="col" aria-label={st.label} key={s}>
              <div className="col-head">
                {COL_ICON[s]}
                {st.label}
                <span className="c">{list.length}</span>
                <span className="sum">{list.length ? formatARS(list.reduce((a, o) => a + o.totalCents, 0)) : ""}</span>
              </div>
              <Column status={s}>
                {shown.length ? (
                  shown.map((o) => <DraggableCard key={o.number} order={o} props={cardProps(o)} />)
                ) : (
                  <div className="col-empty">Nada por acá</div>
                )}
              </Column>
              {list.length > shown.length && (
                <button
                  type="button"
                  className="link"
                  style={{ justifySelf: "center", fontSize: 12.5 }}
                  onClick={() => onShowAll(s)}
                >
                  Ver los {list.length}
                </button>
              )}
            </section>
          );
        })}
      </section>
      <DragOverlay>{active ? <OrderCard {...cardProps(active)} order={active} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}
