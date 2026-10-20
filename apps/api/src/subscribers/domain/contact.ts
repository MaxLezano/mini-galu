/**
 * Clave para reconocer a la misma persona en las listas: el mail en minúsculas, o los últimos 10 dígitos del
 * WhatsApp (en la tienda se escribe libre, "11 5555-1234"; en cuentas y pedidos se guarda en E.164).
 */
export function contactKey(channel: "email" | "whatsapp", contact: string): string | null {
  if (channel === "email") return contact.trim().toLowerCase() || null;
  const digits = contact.replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-10) : null;
}
