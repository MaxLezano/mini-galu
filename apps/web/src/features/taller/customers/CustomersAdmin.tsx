"use client";

import type { AdminCustomerDetail, AdminCustomers } from "@mini-galu/contracts";
import { Baby, Cake, Download, Info, Repeat, Search, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { monthShort, toArInputs } from "@/lib/date";
import { useMounted } from "@/lib/use-mounted";
import { CustomerDrawer } from "./components/CustomerDrawer";
import { CustomersTable } from "./components/CustomersTable";
import { CUSTOMER_FILTERS, type CustomerFilter, filterCustomers } from "./customer-view";
import "./customers.css";

const sinceLabel = (iso: string) => `${monthShort(iso)} ${toArInputs(iso).date.slice(0, 4)}`;

/** Clientes (admin-clientes.html): números, filtros, búsqueda, tabla y ficha con nota. */
export function CustomersAdmin({ initial }: { initial: AdminCustomers }) {
  const mounted = useMounted();
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const [q, setQ] = useState("");
  // la ficha se abre por URL (?cliente=mail) para que la búsqueda global y "atrás" funcionen
  const router = useRouter();
  const pathname = usePathname();
  const openEmail = useSearchParams().get("cliente");
  const openCustomer = (email: string | null) =>
    router.push(email ? `${pathname}?cliente=${encodeURIComponent(email)}` : pathname, { scroll: false });
  const [detail, setDetail] = useState<AdminCustomerDetail | null>(null);
  const [note, setNote] = useState("");

  // "Nuevas este mes" depende del reloj: se calcula después de montar
  const month = mounted ? toArInputs(new Date().toISOString()).date.slice(0, 7) : "";
  const list = useMemo(() => filterCustomers(initial.customers, filter, q, month), [initial, filter, q, month]);

  useEffect(() => {
    if (!openEmail) return setDetail(null);
    let alive = true;
    adminApi
      .customer(openEmail)
      .then((d) => {
        if (!alive) return;
        setDetail(d);
        setNote(d.note);
      })
      .catch(() => toast("No pudimos abrir la ficha. Probá de nuevo.", { icon: <Info className="i-sm" /> }));
    return () => {
      alive = false;
    };
  }, [openEmail]);

  const saveNote = async () => {
    if (!detail || note.trim() === detail.note) return;
    try {
      await adminApi.saveCustomerNote(detail.email, note);
      setDetail({ ...detail, note: note.trim() });
      toast("Nota guardada");
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No pudimos guardar la nota", {
        icon: <Info className="i-sm" />,
      });
    }
  };

  const k = initial.kpis;
  return (
    <>
      <main className="adm-content" id="adm-page">
        <div className="adm-head">
          <div>
            <span className="eyebrow">Tienda</span>
            <h1 className="display">Clientes</h1>
          </div>
          <div className="actions">
            <a className="btn btn-sm btn-ghost" href={adminApi.customersCsvUrl()} download>
              <Download className="i-sm" /> Exportar
            </a>
          </div>
        </div>
        <div className="kpis">
          <div className="kpi">
            <span>
              <Users className="i-sm" /> Clientes
            </span>
            <b>{k.customers}</b>
            <small className="muted">con al menos una compra, link o cuenta</small>
          </div>
          <div className="kpi">
            <span>
              <Repeat className="i-sm" /> Volvieron a comprar
            </span>
            <b>{k.repeat}</b>
            <small className="muted">más de un pedido</small>
          </div>
          <div className="kpi">
            <span>
              <Cake className="i-sm" /> Cumples en 30 días
            </span>
            <b>{k.birthdaysSoon}</b>
            <small className="muted">de las nenas cargadas en Mi cuenta</small>
          </div>
          <div className="kpi">
            <span>
              <Baby className="i-sm" /> Nenas registradas
            </span>
            <b>{k.children}</b>
            <small className="muted">con talle y cumple</small>
          </div>
        </div>
        <section className="box">
          <div className="filters-row" style={{ marginBottom: 16 }}>
            <div className="filters-row">
              {CUSTOMER_FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`chip ${filter === key ? "is-on" : ""}`}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <span style={{ flex: 1 }} />
            <label className="tiny-search">
              <span>
                <Search className="i-sm" />
              </span>
              <input
                className="input"
                placeholder="Buscar cliente o ciudad"
                aria-label="Buscar cliente"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
          </div>
          <CustomersTable customers={list} sinceLabel={sinceLabel} onOpen={openCustomer} />
        </section>
      </main>
      <CustomerDrawer
        open={!!openEmail}
        customer={detail}
        sinceLabel={sinceLabel}
        note={note}
        onNote={setNote}
        onSaveNote={saveNote}
        onClose={() => openCustomer(null)}
      />
    </>
  );
}
