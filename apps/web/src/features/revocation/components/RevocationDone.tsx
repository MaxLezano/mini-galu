import type { RevocationReceipt } from "@mini-galu/contracts";
import Link from "next/link";

type Props = { r: RevocationReceipt; when: string };

/** El código de la solicitud, en pantalla (también le llega por mail). */
export function RevocationDone({ r, when }: Props) {
  return (
    <div className="rv-done" role="status">
      <span className="eyebrow is-in">{r.repeated ? "Ya la habías pedido" : "Solicitud registrada"}</span>
      <p className="rv-code-label">Código de tu solicitud</p>
      <p className="rv-code" data-testid="revocation-code">
        {r.code}
      </p>
      <p className="muted">
        Pedido <b>#{r.order}</b> · {when}. Guardá el código: también te lo mandamos por mail.
      </p>
      {!r.inTime && (
        <p className="rv-note">
          Pasaron más de 10 días desde que lo recibiste. Igual lo registramos: lo revisamos y te escribimos.
        </p>
      )}
      <ol className="rv-steps">
        <li>Te escribimos en estos días para coordinar la devolución de las prendas, si ya las recibiste.</li>
        <li>Las prendas vuelven sin uso, con sus etiquetas. El envío de vuelta corre por nuestra cuenta.</li>
        <li>Te devolvemos el dinero por el mismo medio con el que pagaste.</li>
      </ol>
      <div className="rv-actions">
        <Link className="btn btn-ghost" href={`/seguimiento?pedido=${encodeURIComponent(r.order)}`}>
          Ver el pedido
        </Link>
        <Link className="link" href="/ayuda/cambios#arrepentimiento">
          Cómo funciona el arrepentimiento
        </Link>
      </div>
    </div>
  );
}
