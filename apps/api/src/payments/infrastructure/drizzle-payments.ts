import { DEFAULT_PAYMENT_SETTINGS, type PaymentSettings, PaymentSettingsSchema } from "@mini-galu/contracts";
import { type Db, eq, schema as s } from "@mini-galu/db";
import type { GatewayPayment, PaymentRepository, PaymentSettingsStore } from "../application/ports";

export class DrizzlePaymentRepository implements PaymentRepository {
  constructor(private readonly db: Db) {}

  async record(orderId: string, provider: string, p: GatewayPayment) {
    const values = {
      status: p.status,
      statusDetail: p.statusDetail,
      method: p.method,
      installments: p.installments,
      amountCents: p.amountCents,
      raw: p.raw,
    };
    await this.db
      .insert(s.payments)
      .values({ orderId, provider, providerPaymentId: p.id, ...values })
      .onConflictDoUpdate({ target: [s.payments.provider, s.payments.providerPaymentId], set: values });
  }
}

const KEY = "payments";

/** Ajustes de cobro del panel (medios activos y cuotas sin interés) en content_blocks["payments"]. */
export class DrizzlePaymentSettings implements PaymentSettingsStore {
  constructor(private readonly db: Db) {}

  async get(): Promise<PaymentSettings> {
    const [r] = await this.db.select().from(s.contentBlocks).where(eq(s.contentBlocks.key, KEY));
    const parsed = PaymentSettingsSchema.safeParse(r?.value);
    return parsed.success ? parsed.data : DEFAULT_PAYMENT_SETTINGS;
  }

  async save(value: PaymentSettings) {
    await this.db
      .insert(s.contentBlocks)
      .values({ key: KEY, value })
      .onConflictDoUpdate({ target: s.contentBlocks.key, set: { value } });
  }
}
