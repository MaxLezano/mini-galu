import { z } from "zod";

/** Ley 24.240, art. 34: días corridos para arrepentirse de una compra a distancia (desde que se recibe). */
export const REVOCATION_DAYS = 10;

/** Formulario del botón de arrepentimiento (Res. SCI 424/2020): sin cuenta, con el número de pedido y el mail. */
export const RevocationInputSchema = z.object({
  order: z.string().trim().min(1, "Escribí el número de pedido").max(20),
  email: z.string().trim().toLowerCase().max(120).pipe(z.email("Revisá el email")),
  reason: z.string().trim().max(1000).default(""),
});
export type RevocationInput = z.input<typeof RevocationInputSchema>;

/** Lo que se le muestra (y se le manda por mail) al pedir la baja. */
export type RevocationReceipt = {
  /** Código de la solicitud (ARR-7K2M9Q). */
  code: string;
  /** MG-1042 */
  order: string;
  requestedAt: string;
  /** Si se pidió dentro de los 10 días desde que lo recibió (o antes de recibirlo). */
  inTime: boolean;
  /** true si ya la había pedido: se devuelve el mismo código. */
  repeated: boolean;
};

/** Pedido con la baja pedida, como lo ve el panel. */
export type AdminRevocation = { code: string; at: string; inTime: boolean; reason: string | null };
