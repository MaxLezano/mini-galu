"use client";

import type { AdminDaySummary, AdminLaunch, AdminOrderSummary } from "@mini-galu/contracts";
import { ListChecks } from "lucide-react";
import { useState } from "react";
import { useUi } from "@/features/shell/ui-store";
import { relativeWhen } from "@/lib/date";
import { useMounted } from "@/lib/use-mounted";
import { PICKING_MODAL, PickingModal } from "../../orders/components/PickingModal";
import { pickingList, toPrepare } from "../../orders/order-flow";
import { SalesChart } from "../components/SalesChart";
import { AutoFeed, Kpis, LaunchBanner, LowStockList, RecentOrders, TodoGrid } from "../components/SummaryBlocks";
import type { LowStockRow } from "../summary-view";
import "../../orders/orders.css";
import "../summary.css";

type Props = {
  summary: AdminDaySummary;
  /** Pedidos del tablero, para la lista de preparación. */
  orders: AdminOrderSummary[];
  low: LowStockRow[];
  launch: AdminLaunch | null;
  /** Lo que depende del reloj se calcula una sola vez en el servidor (no cambia al hidratar). */
  today: {
    title: string;
    greeting: string;
    month: string;
    prevMonth: string;
    launchWhen: string | null;
    launchDays: number | null;
  };
  name: string;
};

/** Resumen del día — design/mockups/admin.html */
export function DaySummary({ summary, orders, low, launch, today, name }: Props) {
  const { openModal, closeModal } = useUi();
  const mounted = useMounted();
  const [picking, setPicking] = useState<AdminOrderSummary[]>([]);
  const when = (iso: string) => (mounted ? relativeWhen(iso) : "");
  const prep = summary.todo.toPrepare;

  return (
    <main className="adm-content" id="adm-page">
      <div className="adm-head">
        <div>
          <span className="eyebrow is-in">{today.title}</span>
          <h1 className="display">
            {today.greeting}, <em>{name}</em>
          </h1>
          <span className="hand greet-note">
            {prep ? `hoy hay ${prep} ${prep === 1 ? "paquete" : "paquetes"} para armar ♡` : "todo al día, ¡a coser! ♡"}
          </span>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setPicking(toPrepare(orders));
              openModal(PICKING_MODAL);
            }}
          >
            <ListChecks className="i-sm" /> Lista de preparación
          </button>
        </div>
      </div>

      <TodoGrid todo={summary.todo} />
      <Kpis month={summary.month} current={today.month} previous={today.prevMonth} />

      <div className="cols-2">
        <SalesChart
          weeks={summary.weeks}
          months={summary.months}
          projectionCents={summary.month.projectionCents}
          monthLabel={today.month}
        />
        <RecentOrders orders={summary.recent} when={when} />
      </div>

      <LaunchBanner launch={launch} when={today.launchWhen} days={today.launchDays} />

      <div className="cols-2e">
        <LowStockList rows={low} />
        <AutoFeed items={summary.feed} when={when} />
      </div>

      <PickingModal rows={pickingList(picking)} orders={picking.length} onClose={closeModal} />
    </main>
  );
}
