import { formatCuit, instagramUrl, type StorePolicies, whatsappUrl } from "@mini-galu/contracts";

/** Contacto, taller y datos fiscales como los muestra la tienda (Tienda y pagos → Datos de la tienda). */
export function storeInfo(p: StorePolicies) {
  return {
    whatsapp: whatsappUrl(p.contact.whatsapp),
    email: p.contact.email,
    instagram: instagramUrl(p.contact.instagram),
    instagramHandle: `@${p.contact.instagram}`,
    workshop: p.workshop.city,
    province: p.workshop.province,
    /** Lo que exige Defensa del Consumidor en el pie: nombre, CUIT y domicilio (solo lo cargado). */
    fiscal: [p.fiscal.name, p.fiscal.cuit && `CUIT ${formatCuit(p.fiscal.cuit)}`, p.fiscal.address]
      .filter(Boolean)
      .join(" · "),
    dataFiscalUrl: p.fiscal.dataFiscalUrl || null,
  };
}
export type StoreInfo = ReturnType<typeof storeInfo>;
