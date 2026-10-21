import type { AdminCustomerDetail, AdminCustomers } from "@mini-galu/contracts";
import { formatARS } from "@mini-galu/contracts";
import { NotFoundError } from "../../shared/domain/errors";
import { buildCustomers, customerKpis, customersCsv } from "../domain/customer-list";
import type { AdminCustomerRepository, PointsPort } from "./ports";

/** "YYYY-MM-DD" de hoy en Argentina (los cumples se cuentan por día de acá). */
const arToday = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(d);

/** Clientes en el panel (admin-clientes.html): lista con nenas y cumples, ficha, notas y exportación. */
export class AdminCustomersService {
  constructor(
    private readonly repo: AdminCustomerRepository,
    private readonly clock: () => Date = () => new Date(),
    private readonly points?: Pick<PointsPort, "forEmail">,
  ) {}

  private async all() {
    const [orders, accounts] = await Promise.all([this.repo.orderFacts(), this.repo.accountFacts()]);
    return buildCustomers(orders, accounts, arToday(this.clock()));
  }

  async list(): Promise<AdminCustomers> {
    const customers = await this.all();
    return { customers, kpis: customerKpis(customers) };
  }

  async detail(email: string): Promise<AdminCustomerDetail> {
    const key = email.trim().toLowerCase();
    const c = (await this.all()).find((x) => x.email === key);
    if (!c) throw new NotFoundError("No encontramos ese cliente");
    const [orderList, likes, note, points] = await Promise.all([
      this.repo.ordersOf(key),
      this.repo.collectionsOf(key),
      this.repo.note(key),
      this.points?.forEmail(key) ?? null,
    ]);
    const shown = points && (points.rules.enabled || points.balance > 0 || points.coupons.length > 0);
    return { ...c, orderList, likes, note, points: shown ? points : null };
  }

  async setNote(email: string, note: string): Promise<void> {
    await this.repo.setNote(email.trim().toLowerCase(), note);
  }

  async csv(): Promise<string> {
    return customersCsv(await this.all(), formatARS);
  }
}
