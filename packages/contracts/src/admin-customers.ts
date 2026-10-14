import { z } from "zod";
import type { Cents } from "./money";
import type { OrderStatus } from "./orders";

/** Una nena de la cuenta, como la ve el taller. `birthday`: "YYYY-MM-DD". */
export type AdminCustomerChild = { name: string; size: string | null; birthday: string | null };

/** El cumple que viene antes (de las nenas de la cuenta). `date`: "YYYY-MM-DD" del próximo cumple. */
export type NextBirthday = { name: string; date: string; inDays: number };

/** Una fila de Clientes (admin-clientes.html): quien compró (con o sin cuenta) o se registró. */
export type AdminCustomer = {
  /** El mail identifica al cliente (también a los que compraron sin cuenta). */
  email: string;
  name: string;
  phone: string | null;
  /** Localidad del último envío (o provincia); null si siempre retiró en el taller. */
  city: string | null;
  /** Primer pedido o alta de la cuenta. */
  since: string;
  hasAccount: boolean;
  /** Pedidos pagados (sin cancelados ni reembolsados). */
  orders: number;
  spentCents: Cents;
  children: AdminCustomerChild[];
  nextBirthday: NextBirthday | null;
};

export type AdminCustomers = {
  customers: AdminCustomer[];
  kpis: { customers: number; repeat: number; birthdaysSoon: number; children: number };
};

export type AdminCustomerOrder = {
  number: string;
  createdAt: string;
  totalCents: Cents;
  status: OrderStatus;
  thumbs: string[];
};

/** La ficha: lo de la fila más pedidos, colecciones que compra y la nota del taller. */
export type AdminCustomerDetail = AdminCustomer & {
  orderList: AdminCustomerOrder[];
  likes: string[];
  note: string;
};

export const CustomerNoteSchema = z.object({ note: z.string().trim().max(2000) });
