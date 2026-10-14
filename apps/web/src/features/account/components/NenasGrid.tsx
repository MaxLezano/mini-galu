import type { AccountChild } from "@mini-galu/contracts";
import { Cake, Pencil, Plus, X } from "lucide-react";
import Link from "next/link";
import { Foco } from "@/ui/atoms/Foco";
import { ageOf, birthdayLabel, daysToBirthday } from "../account-view";

type Props = {
  nenas: AccountChild[];
  /** null hasta montar (la edad depende del reloj). */
  now: Date | null;
  onAdd: () => void;
  onEdit: (c: AccountChild) => void;
  onRemove: (c: AccountChild) => void;
};

/** "Mis nenas" — cuenta.html → #nenas */
export function NenasGrid({ nenas, now, onAdd, onEdit, onRemove }: Props) {
  return (
    <div className="nenas" id="nenas">
      {nenas.map((n, i) => {
        const age = n.birthday && now ? ageOf(n.birthday, now) : null;
        const days = n.birthday && now ? daysToBirthday(n.birthday, now) : null;
        return (
          <div className={`nena-card ${i % 2 ? "salvia" : ""}`} key={n.id} data-nena={n.name}>
            <div className="bow">
              <Foco />
            </div>
            <button type="button" className="nena-x" aria-label={`Quitar a ${n.name}`} onClick={() => onRemove(n)}>
              <X className="i-sm" />
            </button>
            <div className="big">{n.name}</div>
            <div className="stats">
              {age !== null && (
                <span>
                  <b>{age}</b>
                  {age === 1 ? "año" : "años"}
                </span>
              )}
              {n.size && (
                <span>
                  <b>{n.size}</b>talle
                </span>
              )}
              {n.heightCm && (
                <span>
                  <b>{n.heightCm}</b>cm
                </span>
              )}
            </div>
            {n.birthday && (
              <div className="bday">
                <Cake className="i-sm" />
                <span>
                  Cumple el <b>{birthdayLabel(n.birthday)}</b>
                  {days !== null && days <= 30 ? ` · ${days === 0 ? "¡hoy!" : `faltan ${days} días`}` : ""}
                </span>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {n.size && (
                <Link className="btn btn-sm" href={`/catalogo?talle=${n.size}`}>
                  Ver lo que le queda
                </Link>
              )}
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => onEdit(n)}>
                <Pencil className="i-sm" /> Editar
              </button>
            </div>
          </div>
        );
      })}
      <button type="button" className="add-nena" onClick={onAdd}>
        <span>
          <Plus className="i-lg" />
          <br />
          <b>Agregar nena</b>
          <br />
          <small>Nombre, cumple y talle</small>
        </span>
      </button>
    </div>
  );
}
