import { formatARS } from "@mini-galu/contracts";
import { Baby, Gift, Heart, ListChecks, LogOut, Package, UserRound } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import type { AccountMenuSummary } from "@/features/account/account-menu";

type Props = {
  open: boolean;
  firstName: string;
  favorites: number;
  /** null mientras se carga la cuenta. */
  summary: AccountMenuSummary | null;
  onToggle: () => void;
  /** Pestaña de Mi cuenta (`#pedidos`); el container decide si navega o solo cambia el hash. */
  onTab: (e: MouseEvent<HTMLAnchorElement>, tab: string) => void;
  onSignOut: () => void;
};

/** Menú de cuenta del header — mockup `app.js` · `pop-user`. */
export function AccountMenu({ open, firstName, favorites, summary, onToggle, onTab, onSignOut }: Props) {
  const tab = (key: string) => ({
    href: `/cuenta#${key}`,
    onClick: (e: MouseEvent<HTMLAnchorElement>) => onTab(e, key),
  });
  return (
    <div className={`nav-pop-wrap hide-m ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="icon-btn"
        aria-label="Mi cuenta"
        aria-expanded={open}
        aria-controls="pop-user"
        data-tip="Mi cuenta"
        onClick={onToggle}
      >
        <UserRound />
      </button>
      <div className="nav-pop pop-user" id="pop-user">
        <div className="pop-hi">
          <span className="av">{firstName[0]?.toUpperCase() ?? "?"}</span>
          <span>
            <b>Hola, {firstName}</b>
            <small>{summary ? summary.nenas : "…"}</small>
          </span>
        </div>
        <Link {...tab("nenas")}>
          <Baby className="i-sm" /> Mis nenas
        </Link>
        <Link {...tab("pedidos")}>
          <Package className="i-sm" /> Mis pedidos
          {summary?.orders && <span className={`pill-status ${summary.orders.tone}`}>{summary.orders.label}</span>}
        </Link>
        <Link {...tab("favoritos")}>
          <Heart className="i-sm" /> Favoritos {favorites > 0 && <small className="muted">{favorites}</small>}
        </Link>
        <Link {...tab("lista")}>
          <ListChecks className="i-sm" /> Lista de cumple
        </Link>
        <Link {...tab("giftcards")}>
          <Gift className="i-sm" /> Gift cards
          {!!summary?.giftcardCents && <small className="muted">saldo {formatARS(summary.giftcardCents)}</small>}
        </Link>
        <Link {...tab("datos")}>
          <UserRound className="i-sm" /> Mis datos
        </Link>
        <hr className="seam" />
        <a
          href="/"
          className="muted"
          onClick={(e) => {
            e.preventDefault();
            onSignOut();
          }}
        >
          <LogOut className="i-sm" /> Salir
        </a>
      </div>
    </div>
  );
}
