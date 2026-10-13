"use client";

import { Printer } from "lucide-react";
import { Modal } from "@/ui/organisms/Modal";
import type { PickRow } from "../order-flow";

export const PICKING_MODAL = "m-pick";

/** Lista de preparación imprimible (admin.js → openPicking): prendas agrupadas por modelo y talle. */
export function PickingModal({ rows, orders, onClose }: { rows: PickRow[]; orders: number; onClose: () => void }) {
  const units = rows.reduce((a, r) => a + r.qty, 0);
  const print = () => {
    document.body.classList.add("print-modal");
    window.print();
    setTimeout(() => document.body.classList.remove("print-modal"), 500);
  };
  return (
    <Modal
      id={PICKING_MODAL}
      label="Lista de preparación"
      title={
        <>
          Lista de <em>preparación</em>
        </>
      }
    >
      <div className="modal-body" style={{ display: "grid", gap: 14 }}>
        <p className="muted" style={{ margin: 0 }}>
          {orders} {orders === 1 ? "pedido" : "pedidos"} · {units} {units === 1 ? "prenda" : "prendas"}. Agrupado por
          modelo y talle.
        </p>
        {rows.length ? (
          <div className="tbl-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th />
                  <th>Prenda</th>
                  <th>Talle</th>
                  <th className="num">Cant.</th>
                  <th>Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.slug}-${r.size}`}>
                    <td className="check">
                      <label className="check">
                        <input type="checkbox" aria-label={`${r.name} talle ${r.size} listo`} />
                      </label>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {r.imageUrl && (
                          <img
                            src={r.imageUrl}
                            alt=""
                            style={{ width: 36, aspectRatio: "3/4", objectFit: "cover", borderRadius: 6 }}
                          />
                        )}
                        <b>{r.name}</b>
                      </div>
                    </td>
                    <td>{r.size}</td>
                    <td className="num">
                      <b>{r.qty}</b>
                    </td>
                    <td className="muted" style={{ fontSize: 12.5 }}>
                      {r.orders.map((n) => `#${n}`).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No hay pedidos para preparar.</p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="no-print">
          <button type="button" className="btn" onClick={print} disabled={!rows.length}>
            <Printer className="i-sm" /> Imprimir
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
