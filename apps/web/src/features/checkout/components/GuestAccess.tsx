import Link from "next/link";
import { BrandIcon } from "@/ui/atoms/BrandIcon";

/**
 * Arriba de "Tus datos" para quien no ingresó: Google (si la tienda lo tiene configurado) o su cuenta con mail.
 * Al volver, la bolsa de invitada se suma a la de la cuenta y los datos y la dirección se completan solos.
 */
export function GuestAccess({
  google,
  onGoogle,
  loginHref,
}: {
  google: boolean;
  onGoogle: () => void;
  loginHref: string;
}) {
  return (
    <>
      {google && (
        <button type="button" className="btn btn-ghost btn-block" onClick={onGoogle}>
          <BrandIcon name="google" className="i-sm" /> Continuar con Google
        </button>
      )}
      <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
        ¿Tenés cuenta?{" "}
        <Link className="link" href={loginHref}>
          Ingresá
        </Link>{" "}
        y completamos tus datos.
      </p>
      <div className="divider">o como invitada</div>
    </>
  );
}
