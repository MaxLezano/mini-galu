"use client";

import { type AccountChild, formatARS, imageThumb, type ProductSummary } from "@mini-galu/contracts";
import { ListChecks, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { birthdayLabel } from "@/features/account/account-view";
import { toast, useUi } from "@/features/shell/ui-store";
import { accountApi } from "@/lib/account-api";
import { ApiRequestError } from "@/lib/api";
import { cover } from "@/lib/product";
import { Embroidery } from "@/ui/atoms/Embroidery";
import { SkeletonRows } from "@/ui/molecules/SkeletonRows";
import { Modal } from "@/ui/organisms/Modal";

export const WISH_PICK_MODAL = "m-wish-pick";

/** "Sumar a la lista de cumple": elegir para cuál nena (app.js → wishPick). */
export function WishPickModal({ product, size }: { product: ProductSummary; size: string | null }) {
  const { modal, closeModal } = useUi();
  const open = modal === WISH_PICK_MODAL;
  const [nenas, setNenas] = useState<AccountChild[] | null>(null);

  useEffect(() => {
    if (open)
      accountApi.overview().then(
        (o) => setNenas(o.children),
        () => setNenas([]),
      );
  }, [open]);

  const sizeToAdd = size ?? product.variants.find((v) => v.stock > 0)?.size ?? product.variants[0]?.size ?? "Único";

  const add = async (n: AccountChild) => {
    try {
      const before = n.wishlist.length;
      const after = await accountApi.addWish(n.id, product.slug, sizeToAdd);
      closeModal();
      toast(
        after.wishlist.length > before ? (
          <span>
            <b>{product.name}</b> sumado a la lista de {n.name} ·{" "}
            <Link className="link" href="/cuenta#lista" style={{ color: "inherit" }}>
              ver lista
            </Link>
          </span>
        ) : (
          `Ya está en la lista de ${n.name}`
        ),
        { image: cover(product), icon: <ListChecks className="i-sm" /> },
      );
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo sumar, probá de nuevo");
    }
  };

  return (
    <Modal
      id={WISH_PICK_MODAL}
      label="Sumar a una lista de cumple"
      title={
        <>
          Sumar a la <em>lista de cumple</em>
        </>
      }
    >
      <div className="modal-body" style={{ display: "grid", gap: 14 }}>
        <div className="wp-item">
          <img loading="lazy" src={imageThumb(cover(product))} alt="" />
          <span>
            <b>{product.name}</b>
            <small>
              Talle {sizeToAdd} · {formatARS(product.priceCents)}
            </small>
          </span>
        </div>
        {nenas === null ? (
          <SkeletonRows rows={2} />
        ) : nenas.length ? (
          <>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cacao-2)" }}>¿Para quién?</span>
            <div className="wp-nenas">
              {nenas.map((n) => (
                <button type="button" key={n.id} className="wp-nena" onClick={() => add(n)}>
                  <i>{n.name[0]}</i>
                  <span>
                    <b>{n.name}</b>
                    <small>
                      {n.size ? `Talle ${n.size}` : ""}
                      {n.birthday ? ` · cumple el ${birthdayLabel(n.birthday)}` : ""}
                    </small>
                  </span>
                  <Plus className="i-sm" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ padding: "12px 0" }}>
            <Embroidery />
            <div className="hand" style={{ fontSize: 28 }}>
              Primero sumá a tu nena
            </div>
            <p className="muted" style={{ margin: "0 0 6px" }}>
              La lista de cumple se arma para una nena: su talle, su cumple y lo que le gusta.
            </p>
            <Link className="btn" href="/cuenta#nenas" onClick={closeModal}>
              Agregar nena
            </Link>
          </div>
        )}
      </div>
    </Modal>
  );
}
