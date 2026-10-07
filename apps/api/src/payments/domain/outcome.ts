import type { PaymentOutcome } from "@mini-galu/contracts";

/** Estados de Mercado Pago (API de Orders y de Payments) → lo que le importa a la tienda. */
export function outcomeOf(status: string): PaymentOutcome {
  if (status === "approved" || status === "processed") return "approved";
  if (["pending", "in_process", "processing", "action_required", "authorized", "in_mediation"].includes(status))
    return "pending";
  return "rejected";
}

const REJECTED: Record<string, string> = {
  // API de Orders (medidos en el sandbox)
  rejected_by_issuer: "Tu banco rechazó el pago. Probá con otra tarjeta u otro medio.",
  insufficient_amount: "La tarjeta no tiene saldo suficiente. Probá con otra.",
  bad_filled_card_data: "Revisá los datos de la tarjeta.",
  required_call_for_authorize: "Tu banco pide que autorices el pago: llamalos y volvé a intentar.",
  // API de Payments (dinero en cuenta)
  cc_rejected_bad_filled_card_number: "Revisá el número de la tarjeta.",
  cc_rejected_bad_filled_date: "Revisá la fecha de vencimiento.",
  cc_rejected_bad_filled_security_code: "Revisá el código de seguridad.",
  cc_rejected_bad_filled_other: "Revisá los datos de la tarjeta.",
  cc_rejected_insufficient_amount: "La tarjeta no tiene saldo suficiente. Probá con otra.",
  cc_rejected_call_for_authorize: "Tu banco pide que autorices el pago: llamalos y volvé a intentar.",
  cc_rejected_card_disabled: "La tarjeta no está activa: llamá a tu banco.",
  cc_rejected_duplicated_payment:
    "Ya hiciste un pago igual hace un momento. Si no te llegó la confirmación, escribinos.",
  cc_rejected_max_attempts: "Llegaste al límite de intentos con esa tarjeta. Probá con otra.",
};

/** Mensaje para el cliente según el resultado (detalle de Mercado Pago). */
export function messageFor(outcome: PaymentOutcome, statusDetail: string | null): string {
  if (outcome === "approved") return "¡Pago aprobado!";
  if (outcome === "pending")
    return "Tu pago quedó en revisión. Apenas se apruebe te avisamos por mail y el pedido pasa al taller.";
  return (statusDetail && REJECTED[statusDetail]) || "El pago fue rechazado. Probá con otra tarjeta u otro medio.";
}
