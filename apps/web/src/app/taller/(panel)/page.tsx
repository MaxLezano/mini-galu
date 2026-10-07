import { redirect } from "next/navigation";

/** El resumen del día (tareas, métricas, pedidos) llega con la fase 4: mientras tanto, productos. */
export default function Page() {
  redirect("/taller/productos");
}
