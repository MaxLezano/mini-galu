import { instagramUrl, type StorePolicies, whatsappUrl } from "@mini-galu/contracts";

/** Contacto y taller como los muestra la tienda (Tienda y pagos → Datos de la tienda). */
export function storeInfo(p: StorePolicies) {
  return {
    whatsapp: whatsappUrl(p.contact.whatsapp),
    email: p.contact.email,
    instagram: instagramUrl(p.contact.instagram),
    instagramHandle: `@${p.contact.instagram}`,
    workshop: p.workshop.city,
    province: p.workshop.province,
  };
}
export type StoreInfo = ReturnType<typeof storeInfo>;
