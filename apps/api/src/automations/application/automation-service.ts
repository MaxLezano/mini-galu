import {
  type AdminAutomations,
  AUTOMATION_KEYS,
  AUTOMATION_RULES,
  AUTOMATION_SAMPLE,
  type AutomationKey,
  fillMessage,
  type OrderStatus,
  type RuleUpdate,
  type Size,
  sizeLabel,
} from "@mini-galu/contracts";
import { ConflictError } from "../../shared/domain/errors";
import { argentinaNow, nextBirthday } from "../domain/birthday";
import type {
  AutomationOrders,
  AutomationSettingsStore,
  Birthdays,
  IdleCarts,
  LowStock,
  Messenger,
  OrderFacts,
  RunLog,
  Suggestions,
  Waitlist,
} from "./ports";

const DAY = 86_400_000;
/** "Se acerca un cumple": cuántos días antes sale el mail. */
export const BIRTHDAY_NOTICE_DAYS = 15;
/** "Bolsa abandonada": horas sin tocar la bolsa antes del recordatorio, y hasta cuándo vale la pena mandarlo. */
export const IDLE_CART_HOURS = 24;
const IDLE_CART_MAX_DAYS = 7;

export type AutomationLinks = {
  tracking: (orderNumber: string) => string;
  product: (slug: string) => string;
  /** Catálogo filtrado por talle. */
  catalog: (size: string) => string;
  /** La bolsa de la cuenta (pasa por ingresar si no hay sesión). */
  bag: string;
  site: string;
  /** "Villa Crespo, CABA" */
  workshop: string;
};

/**
 * Lo que el taller hace solo (admin-automatizaciones.html): cada regla se puede pausar y su mensaje se puede editar.
 * Escuchan eventos de dominio y el programador; cada aviso queda en el registro y en el historial del pedido.
 * Canal activo: mail. TODO(fase 6 · automations): WhatsApp Business con las credenciales de Meta (modo prueba).
 */
export class AutomationService {
  constructor(
    private readonly settings: AutomationSettingsStore,
    private readonly runs: RunLog,
    private readonly messenger: Messenger,
    private readonly orders: AutomationOrders,
    private readonly waitlist: Waitlist,
    private readonly lowStock: LowStock,
    private readonly kids: Birthdays,
    private readonly suggestions: Suggestions,
    private readonly carts: IdleCarts,
    private readonly links: AutomationLinks,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /* ---------------------------------------------------------------- panel */

  async admin(channels: AdminAutomations["channels"]): Promise<AdminAutomations> {
    const now = this.clock();
    // día 1 a las 00:00 de Argentina (UTC−3)
    const ar = new Date(now.getTime() - 3 * 3_600_000);
    const month = new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), 1, 3));
    const [overrides, counts, sent, links, waitlist, runs] = await Promise.all([
      this.settings.get(),
      this.runs.countsSince(month),
      this.runs.sentSince(month),
      this.runs.linkRecovery(month),
      this.runs.waitlistSales(month),
      this.runs.recent(30),
    ]);
    return {
      rules: AUTOMATION_KEYS.map((key) => ({
        key,
        on: this.isOnWith(overrides, key),
        message:
          AUTOMATION_RULES[key].message === null ? null : (overrides[key]?.message ?? AUTOMATION_RULES[key].message),
        runs: counts[key] ?? 0,
      })),
      channels,
      stats: {
        sent,
        waitlistSalesCents: waitlist.cents,
        waitlistSales: waitlist.count,
        remindedLinks: links.reminded,
        recoveredLinks: links.recovered,
      },
      runs,
    };
  }

  async update(key: AutomationKey, upd: RuleUpdate) {
    const rule = AUTOMATION_RULES[key];
    if ("locked" in rule && rule.locked)
      throw new ConflictError("Esta regla es parte del flujo del pedido: no se pausa");
    const phase = rule.phase as string | null;
    if (phase) throw new ConflictError(`Esta regla llega en la ${phase.toLowerCase()}`);
    if (upd.message !== undefined && rule.message === null) throw new ConflictError("Esta regla no manda mensajes");
    const all = await this.settings.get();
    all[key] = { ...all[key], ...upd };
    await this.settings.save(all);
  }

  async isOn(key: AutomationKey) {
    return this.isOnWith(await this.settings.get(), key);
  }

  /** "Enviarme una prueba": todos los mensajes activos con datos de ejemplo, a ese mail. */
  async test(email: string): Promise<number> {
    const overrides = await this.settings.get();
    let n = 0;
    for (const key of AUTOMATION_KEYS) {
      const rule = AUTOMATION_RULES[key];
      if (rule.message === null || !this.isOnWith(overrides, key)) continue;
      await this.messenger.message({
        to: email,
        subject: `[Prueba] ${rule.title}`,
        eyebrow: `Prueba · ${rule.title}`,
        name: null,
        body: fillMessage(overrides[key]?.message ?? rule.message, AUTOMATION_SAMPLE),
        cta: null,
        number: null,
      });
      n++;
    }
    return n;
  }

  /* ---------------------------------------------------------------- reglas */

  async paymentApproved(orderId: string) {
    if (!(await this.isOn("pago_aprobado"))) return;
    const o = await this.orders.find(orderId);
    if (!o) return;
    const email = await this.messenger.paymentApproved(orderId, await this.text("pago_aprobado", this.vars(o)));
    if (!email) return;
    await this.orders.log(o.id, "Mail de confirmación enviado", `“Recibimos tu pago” a ${email}`);
    await this.record("pago_aprobado", o, "Mail de confirmación");
  }

  /** Cambios de estado: despachado (en camino) y listo para retirar en el taller. */
  async statusChanged(orderId: string, to: OrderStatus) {
    const o = await this.orders.find(orderId);
    if (!o) return;
    if (to === "en_camino" && (await this.isOn("despachado"))) {
      const link = this.links.tracking(o.number);
      await this.send("despachado", o, {
        subject: `Tu pedido #${o.number} ya salió`,
        eyebrow: `Pedido #${o.number} · en camino`,
        body: await this.text("despachado", { ...this.vars(o), link_seguimiento: link }),
        cta: { label: "Seguir mi pedido", url: link },
        logTitle: "Aviso de despacho enviado",
      });
    }
    if (to === "listo" && o.shippingMethod === "taller" && (await this.isOn("listo_retirar"))) {
      await this.send("listo_retirar", o, {
        subject: `Tu pedido #${o.number} está listo para retirar`,
        eyebrow: `Pedido #${o.number} · listo para retirar`,
        body: await this.text("listo_retirar", {
          ...this.vars(o),
          taller: this.links.workshop,
          horario: o.pickupLabel ? `Te esperamos el ${o.pickupLabel}.` : "Coordinamos el horario por WhatsApp.",
        }),
        cta: null,
        logTitle: "Aviso de listo para retirar enviado",
      });
    }
  }

  /** A los 3 días de entregado, una sola vez: pedir una foto o reseña. Lo corre el programador. */
  async askReviews(): Promise<number> {
    if (!(await this.isOn("entregado"))) return 0;
    const now = this.clock().getTime();
    let n = 0;
    for (const id of await this.orders.deliveredBetween(new Date(now - 30 * DAY), new Date(now - 3 * DAY))) {
      if (await this.runs.exists("entregado", `resena:${id}`)) continue;
      const o = await this.orders.find(id);
      if (!o) continue;
      await this.send(
        "entregado",
        o,
        {
          subject: "¿Cómo le quedó? ♡",
          eyebrow: `Pedido #${o.number} · entregado`,
          body: await this.text("entregado", this.vars(o)),
          cta: { label: "Ver la tienda", url: this.links.site },
          logTitle: "Pedido de reseña enviado",
        },
        `resena:${id}`,
      );
      n++;
    }
    return n;
  }

  async linkReminder(p: {
    orderId: string;
    number: string;
    firstName: string;
    email: string;
    totalCents: number;
    payUrl: string;
    reservedUntilLabel: string | null;
  }) {
    const intro = await this.text("link_sin_pagar", { nombre: p.firstName, pedido: p.number, link_pago: p.payUrl });
    await this.messenger.paymentReminder(p, intro);
    await this.runs.add(
      {
        rule: "link_sin_pagar",
        subject: `#${p.number} · ${p.firstName}`,
        detail: `Recordatorio de pago por mail a ${p.email}`,
        channel: "mail",
        status: "ok",
        orderId: p.orderId,
        contact: p.email,
      },
      this.clock(),
    );
  }

  /** Volvió stock de talles con lista de espera: se avisa a todos los anotados, en orden. */
  async replenished(p: { productId: string; slug: string; name: string; sizes: { size: string }[] }) {
    if (!(await this.isOn("volvio_talle"))) return;
    const now = this.clock();
    const url = this.links.product(p.slug);
    for (const { size } of p.sizes) {
      const waiting = await this.waitlist.pending(p.productId, size);
      const subject = `${p.name} T${size}`;
      const body = await this.text("volvio_talle", { talle: size, prenda: p.name, link_producto: url });
      const mails = waiting.filter((w) => w.channel === "email");
      for (const w of mails) {
        await this.messenger.message({
          to: w.contact,
          subject: `Volvió el talle ${size} del ${p.name}`,
          eyebrow: "Volvió tu talle",
          name: null,
          body,
          cta: { label: "Ver la prenda", url },
          number: null,
        });
        await this.runs.add(
          {
            rule: "volvio_talle",
            subject,
            detail: `Aviso por mail a ${w.contact}`,
            channel: "mail",
            status: "ok",
            contact: w.contact.toLowerCase(),
            productSlug: p.slug,
          },
          now,
        );
      }
      await this.waitlist.markNotified(
        mails.map((w) => w.id),
        now,
      );
      const wa = waiting.length - mails.length;
      if (wa)
        await this.runs.add(
          {
            rule: "volvio_talle",
            subject,
            detail: `${wa} ${wa === 1 ? "anotado" : "anotados"} por WhatsApp sin avisar: WhatsApp todavía no está conectado`,
            channel: "whatsapp",
            status: "warn",
            productSlug: p.slug,
          },
          now,
        );
    }
  }

  /** Talles que quedaron en 1: aviso en el panel, una vez. Lo corre el programador. */
  async checkLowStock(): Promise<number> {
    if (!(await this.isOn("stock_bajo"))) return 0;
    let n = 0;
    for (const item of await this.lowStock.list()) {
      if (await this.runs.exists("stock_bajo", item.key)) continue;
      await this.runs.add(
        {
          rule: "stock_bajo",
          subject: item.label,
          detail: "Quedó en 1",
          channel: "panel",
          status: "ok",
          subjectKey: item.key,
        },
        this.clock(),
      );
      n++;
    }
    return n;
  }

  /**
   * Faltan 15 días (o menos, si la nena se cargó tarde) para un cumple: mail con ideas en su talle, una vez por
   * cumple. El programador lo corre desde las 9 de Argentina; al cargar una nena (`anyHour`), en el momento.
   * Sin talle cargado no hay ideas que mandar.
   */
  async birthdays(opts: { anyHour?: boolean } = {}): Promise<number> {
    if (!(await this.isOn("cumple"))) return 0;
    const now = this.clock();
    if (!opts.anyHour && argentinaNow(now).hour < 9) return 0;
    const kids = await this.kids.list();
    const coupon = kids.length ? await this.kids.coupon() : null;
    const gift = coupon
      ? `

Regalo del taller: con el código ${coupon.code} tenés ${coupon.label}.`
      : "";
    let n = 0;
    for (const c of kids) {
      if (!c.size) continue;
      const { days, year } = nextBirthday(c.birthday, now);
      if (days < 1 || days > BIRTHDAY_NOTICE_DAYS) continue;
      const key = `cumple:${c.childId}:${year}`;
      if (await this.runs.exists("cumple", key)) continue;
      const talle = sizeLabel(c.size as Size);
      const link = this.links.catalog(c.size);
      await this.messenger.message({
        to: c.email,
        subject: `Se viene el cumple de ${c.name} ♡`,
        eyebrow: days === 1 ? `Mañana cumple ${c.name}` : `Faltan ${days} días · cumple de ${c.name}`,
        name: null,
        body:
          (await this.text("cumple", { nombre: c.parentFirstName, nena: c.name, talle, link_catalogo: link })) + gift,
        cta: { label: `Ver todo en talle ${talle}`, url: link },
        number: null,
        products: await this.suggestions.inSize(c.size, 3),
      });
      await this.runs.add(
        {
          rule: "cumple",
          subject: `Cumple de ${c.name} · ${c.parentFirstName}`.trim(),
          detail: `Ideas en talle ${talle} por mail a ${c.email}`,
          channel: "mail",
          status: "ok",
          subjectKey: key,
          contact: c.email.toLowerCase(),
        },
        now,
      );
      n++;
    }
    return n;
  }

  /**
   * Alguien con cuenta dejó prendas en la bolsa 24 h: un recordatorio con las fotos de lo que todavía tiene stock,
   * una vez por cada vez que la deja. Bolsas de más de 7 días no (ya no es un recordatorio). Lo corre el programador,
   * de 9 a 21 de Argentina.
   */
  async idleCarts(): Promise<number> {
    if (!(await this.isOn("bolsa_abandonada"))) return 0;
    const now = this.clock();
    const { hour } = argentinaNow(now);
    if (hour < 9 || hour >= 21) return 0;
    const t = now.getTime();
    let n = 0;
    for (const c of await this.carts.between(
      new Date(t - IDLE_CART_MAX_DAYS * DAY),
      new Date(t - IDLE_CART_HOURS * 3_600_000),
    )) {
      if (!c.items.length) continue;
      const key = `bolsa:${c.cartId}:${c.updatedAt.toISOString()}`;
      if (await this.runs.exists("bolsa_abandonada", key)) continue;
      await this.messenger.message({
        to: c.email,
        subject: "Te quedaron prendas en la bolsa ♡",
        eyebrow: "Tu bolsa te espera",
        name: null,
        body: await this.text("bolsa_abandonada", { nombre: c.firstName, link_bolsa: this.links.bag }),
        cta: { label: "Volver a mi bolsa", url: this.links.bag },
        number: null,
        products: c.items.slice(0, 3).map(({ size, ...p }) => ({
          ...p,
          name: size === "Único" ? p.name : `${p.name} · talle ${sizeLabel(size as Size)}`,
        })),
      });
      const count = c.items.length;
      await this.runs.add(
        {
          rule: "bolsa_abandonada",
          subject: `${c.firstName} ${c.lastName}`.trim(),
          detail: `Recordatorio de ${count} ${count === 1 ? "prenda" : "prendas"} por mail a ${c.email}`,
          channel: "mail",
          status: "ok",
          subjectKey: key,
          contact: c.email.toLowerCase(),
        },
        now,
      );
      n++;
    }
    return n;
  }

  /* ---------------------------------------------------------------- ayudas */

  private isOnWith(overrides: Awaited<ReturnType<AutomationSettingsStore["get"]>>, key: AutomationKey) {
    const rule = AUTOMATION_RULES[key];
    if (rule.phase) return false;
    if ("locked" in rule && rule.locked) return true;
    return overrides[key]?.on ?? true;
  }

  private async text(key: AutomationKey, vars: Record<string, string>) {
    const custom = (await this.settings.get())[key]?.message;
    return fillMessage(custom ?? AUTOMATION_RULES[key].message ?? "", vars);
  }

  private vars(o: OrderFacts) {
    return { nombre: o.firstName, pedido: o.number };
  }

  private async send(
    rule: AutomationKey,
    o: OrderFacts,
    m: { subject: string; eyebrow: string; body: string; cta: { label: string; url: string } | null; logTitle: string },
    subjectKey?: string,
  ) {
    await this.messenger.message({
      to: o.email,
      subject: m.subject,
      eyebrow: m.eyebrow,
      name: null,
      body: m.body,
      cta: m.cta,
      number: o.number,
    });
    await this.orders.log(o.id, m.logTitle, `Por mail a ${o.email}`);
    await this.record(rule, o, m.logTitle, subjectKey);
  }

  private record(rule: AutomationKey, o: OrderFacts, detail: string, subjectKey?: string) {
    return this.runs.add(
      {
        rule,
        subject: `#${o.number} · ${o.firstName} ${o.lastName}`.trim(),
        detail,
        channel: "mail",
        status: "ok",
        orderId: o.id,
        contact: o.email,
        subjectKey,
      },
      this.clock(),
    );
  }
}
