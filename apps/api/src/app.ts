import { relative } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { createDb } from "@mini-galu/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createAuth } from "./auth/infrastructure/better-auth";
import { authRoutes, requireAdmin } from "./auth/infrastructure/http/auth-routes";
import { CartService } from "./cart/application/cart-service";
import { DrizzleCartRepository, DrizzleVariantCatalog } from "./cart/infrastructure/drizzle-cart-repository";
import { cartOwner } from "./cart/infrastructure/http/cart-owner";
import { cartRoutes } from "./cart/infrastructure/http/cart-routes";
import { AdminCatalogService } from "./catalog/application/admin-catalog-service";
import { CatalogService } from "./catalog/application/catalog-service";
import { DrizzleAdminProductRepository } from "./catalog/infrastructure/drizzle-admin-product-repository";
import {
  DrizzleProductRepository,
  DrizzleWaitlistRepository,
} from "./catalog/infrastructure/drizzle-product-repository";
import { adminCatalogRoutes } from "./catalog/infrastructure/http/admin-catalog-routes";
import { catalogRoutes } from "./catalog/infrastructure/http/catalog-routes";
import type { Config } from "./config";
import { AdminLaunchesService } from "./content/application/admin-launches-service";
import { ContentService } from "./content/application/content-service";
import type { ProductPublisher } from "./content/application/launch-ports";
import { DrizzleAdminLaunchRepository } from "./content/infrastructure/drizzle-admin-launch-repository";
import { DrizzleContentRepository } from "./content/infrastructure/drizzle-content-repository";
import { adminHomeRoutes } from "./content/infrastructure/http/admin-home-routes";
import { adminLaunchesRoutes } from "./content/infrastructure/http/admin-launches-routes";
import { contentRoutes } from "./content/infrastructure/http/content-routes";
import { CouponService } from "./coupons/application/coupon-service";
import { DrizzleCouponRepository } from "./coupons/infrastructure/drizzle-coupon-repository";
import { adminCouponRoutes } from "./coupons/infrastructure/http/admin-coupon-routes";
import { OrderNotifications } from "./notifications/application/order-notifications";
import { untilLabel } from "./notifications/domain/mail";
import { SmtpMailer } from "./notifications/infrastructure/smtp-mailer";
import { AdminOrdersService } from "./orders/application/admin-orders-service";
import { CheckoutService } from "./orders/application/checkout-service";
import { OrderPayments } from "./orders/application/order-payments";
import { OrderShipping } from "./orders/application/order-shipping";
import { PaymentLinks } from "./orders/application/payment-links";
import { payPath } from "./orders/domain/order";
import { DrizzleOrderRepository } from "./orders/infrastructure/drizzle-order-repository";
import { adminOrderRoutes } from "./orders/infrastructure/http/admin-order-routes";
import { checkoutRoutes } from "./orders/infrastructure/http/checkout-routes";
import { PaymentService } from "./payments/application/payment-service";
import type { PaymentGateway } from "./payments/application/ports";
import { DrizzlePaymentRepository, DrizzlePaymentSettings } from "./payments/infrastructure/drizzle-payments";
import {
  adminPaymentRoutes,
  checkoutPaymentRoutes,
  webhookRoutes,
} from "./payments/infrastructure/http/payment-routes";
import { MercadoPagoGateway } from "./payments/infrastructure/mercadopago-gateway";
import { SimulatedGateway } from "./payments/infrastructure/simulated-gateway";
import { EventBus } from "./shared/events/event-bus";
import { onError } from "./shared/http/errors";
import { LocalDiskImageStorage } from "./shared/media/image-storage";
import { IntervalScheduler } from "./shared/scheduler/interval-scheduler";
import { ShipmentService } from "./shipping/application/shipment-service";
import { ShippingService, WORKSHOP } from "./shipping/application/shipping-service";
import { slotLabel } from "./shipping/domain/pickup";
import { AndreaniBranches, FakeBranches } from "./shipping/infrastructure/andreani-branches";
import { DrizzleShipmentRepository } from "./shipping/infrastructure/drizzle-shipment-repository";
import { FakeAndreani } from "./shipping/infrastructure/fake-andreani";
import { adminShipmentRoutes, trackingRoutes } from "./shipping/infrastructure/http/shipment-routes";
import { TableShippingRates } from "./shipping/infrastructure/table-shipping-rates";

/** Composition root: acá (y solo acá) se eligen los adapters de cada puerto. */
export function buildApp(config: Config) {
  const db = createDb(config.databaseUrl);
  const storage = new LocalDiskImageStorage(config.publicUrl, config.mediaDir);
  const events = new EventBus();
  const auth = createAuth(db, {
    publicUrl: config.publicUrl,
    webOrigin: config.webOrigin,
    secret: config.authSecret,
    secureCookies: config.env === "production",
  });

  const catalog = new CatalogService(new DrizzleProductRepository(db), new DrizzleWaitlistRepository(db), storage);
  const adminCatalog = new AdminCatalogService(new DrizzleAdminProductRepository(db), storage, events);
  const content = new ContentService(new DrizzleContentRepository(db), catalog, storage);

  // los lanzamientos publican prendas a través del catálogo (que valida, por ejemplo, que tengan foto)
  const publisher: ProductPublisher = {
    async publish(slugs) {
      const published: string[] = [];
      const skipped: { slug: string; reason: string }[] = [];
      for (const slug of slugs) {
        try {
          await adminCatalog.setStatus(slug, "published");
          published.push(slug);
        } catch (e) {
          skipped.push({ slug, reason: e instanceof Error ? e.message : "error" });
        }
      }
      return { published, skipped };
    },
  };
  const launches = new AdminLaunchesService(new DrizzleAdminLaunchRepository(db), publisher, storage, events);

  // checkout: bolsa → pedido (reserva stock) → pago
  const orders = new DrizzleOrderRepository(db);
  const variants = new DrizzleVariantCatalog(db);
  const shipping = new ShippingService(
    new TableShippingRates(),
    undefined,
    config.branches === "andreani" ? new AndreaniBranches() : new FakeBranches(),
  );
  const cart = new CartService(new DrizzleCartRepository(db), variants, storage, orders);
  const coupons = new CouponService(new DrizzleCouponRepository(db));
  const checkout = new CheckoutService(cart, shipping, coupons, orders, storage);
  const orderPayments = new OrderPayments(orders, cart, coupons, events);
  const adminOrders = new AdminOrdersService(
    orders,
    storage,
    events,
    slotLabel,
    (number, token) => config.webOrigin + payPath(number, token),
  );
  const paymentLinks = new PaymentLinks(variants, shipping, orders, events, config.webOrigin);
  // envíos: FakeAndreani hasta tener las credenciales del contrato con Andreani
  const shipments = new ShipmentService(
    new FakeAndreani(undefined, config.fakeAndreaniSpeed),
    new DrizzleShipmentRepository(db),
    new OrderShipping(orders, storage, events, `${WORKSHOP}, CABA`),
    (number, token) => config.webOrigin + payPath(number, token),
  );
  const webhookUrl = `${config.publicUrl}/payments/webhook`;
  const gateway: PaymentGateway = config.mercadoPago
    ? new MercadoPagoGateway({
        ...config.mercadoPago,
        notificationUrl: webhookUrl.startsWith("https://") ? webhookUrl : null,
      })
    : new SimulatedGateway();
  const payments = new PaymentService(
    gateway,
    new DrizzlePaymentRepository(db),
    new DrizzlePaymentSettings(db),
    orderPayments,
    events,
    { web: config.webOrigin, webhook: webhookUrl },
  );
  const secure = config.env === "production";

  const scheduler = new IntervalScheduler();
  if (config.env !== "test") {
    scheduler.every(60, "publicar lanzamientos", () => launches.publishDue());
    scheduler.every(60, "liberar reservas vencidas", () => orderPayments.releaseExpired());
    scheduler.every(60, "recordar links de pago", () => paymentLinks.remindUnpaid());
    scheduler.every(config.trackingEverySeconds, "seguimiento de envíos", () => shipments.sync());
  }

  // TODO(fase 6 · automations): "Volvió un talle" avisa a la lista de espera por WhatsApp/mail
  events.on("StockReplenished", (e) => console.info("[eventos] Volvió un talle:", JSON.stringify(e.payload)));
  // TODO(fase 6 · automations): avisar a los anotados que ya salió (y 1 hora antes si notifyBefore)
  events.on("LaunchPublished", (e) => console.info("[eventos] Lanzamiento publicado:", JSON.stringify(e.payload)));
  // TODO(fase 6 · automations): mail + WhatsApp de "pago aprobado" al cliente y aviso al taller
  events.on("PaymentApproved", (e) => console.info("[eventos] Pago aprobado:", JSON.stringify(e.payload)));
  // "Recibimos tu pago" por mail (el resto de los avisos y WhatsApp llegan con las automatizaciones, fase 6)
  const notifications = new OrderNotifications(
    {
      async find(orderId) {
        const o = await orders.findById(orderId);
        if (!o) return null;
        const r = checkout.toReceipt(o);
        const a = o.shippingAddress;
        return {
          number: r.number,
          firstName: o.firstName,
          email: o.email,
          items: r.items,
          subtotalCents: o.subtotalCents,
          discountCents: o.discountCents,
          shippingCents: o.shippingCents,
          totalCents: o.totalCents,
          couponCode: o.couponCode,
          shippingMethod: o.shippingMethod,
          shippingAddress: a
            ? `${a.street} ${a.number}${a.unit ? `, ${a.unit}` : ""} · ${a.city}, ${a.province} (${a.postalCode})`
            : null,
          pickupLabel: o.pickupSlot ? slotLabel(o.pickupSlot) : null,
          branchLabel: r.branchLabel,
          paymentMethod: o.paymentMethod,
          installments: o.installments,
        };
      },
    },
    new SmtpMailer(config.smtp),
    (number) => ({
      tracking: `${config.webOrigin}/seguimiento?pedido=${encodeURIComponent(number)}`,
      whatsapp: "https://wa.me/5491100000000",
      site: config.webOrigin,
      workshop: WORKSHOP,
    }),
  );
  events.on("PaymentApproved", async (e) => {
    const orderId = String(e.payload.orderId);
    if (await notifications.paymentApproved(orderId))
      await orders.addEvent(orderId, {
        kind: "mail",
        title: "Mail de confirmación enviado",
        detail: `“Recibimos tu pago” a ${String(e.payload.email)}`,
        auto: true,
      });
  });
  // TODO(fase 6 · automations): el recordatorio también por WhatsApp
  events.on("PaymentLinkReminder", async (e) => {
    const p = e.payload;
    await notifications.paymentReminder({
      number: String(p.number),
      firstName: String(p.firstName),
      email: String(p.email),
      totalCents: Number(p.totalCents),
      payUrl: String(p.payUrl),
      reservedUntilLabel: p.reservedUntil ? untilLabel(new Date(String(p.reservedUntil))) : null,
    });
  });
  events.on("OrderExpired", (e) => console.info("[eventos] Reserva vencida:", JSON.stringify(e.payload)));
  // TODO(fase 10 · payments): reembolsar desde el panel (hoy se ve en el historial del pedido y en el resumen)
  for (const t of ["PaymentNeedsRefund", "PaymentAmountMismatch"])
    events.on(t, (e) => console.warn(`[eventos] ${t}:`, JSON.stringify(e.payload)));

  const app = new Hono()
    .use(logger())
    .use("*", cors({ origin: config.webOrigin, credentials: true }))
    .use(
      "/media/*",
      serveStatic({
        root: relative(process.cwd(), config.mediaDir),
        rewriteRequestPath: (p) => p.replace(/^\/media/, ""),
        onFound: (_path, c) => c.header("Cache-Control", "public, max-age=86400"),
      }),
    )
    .get("/health", (c) => c.json({ ok: true }))
    .route("/catalog", catalogRoutes(catalog))
    .route("/content", contentRoutes(content))
    .route("/auth", authRoutes(auth))
    .use("/cart/*", cartOwner(auth, cart, secure))
    .use("/checkout/*", cartOwner(auth, cart, secure))
    .route("/cart", cartRoutes(cart, secure))
    .route("/checkout", checkoutRoutes(checkout))
    .route("/checkout", checkoutPaymentRoutes(payments))
    .route("/payments", webhookRoutes(payments))
    .route("/tracking", trackingRoutes(shipments))
    .use("/admin/*", requireAdmin(auth))
    .route("/admin/catalog", adminCatalogRoutes(adminCatalog, catalog))
    .route("/admin/content/launches", adminLaunchesRoutes(launches))
    .route("/admin/content/home", adminHomeRoutes(content))
    .route("/admin/orders", adminShipmentRoutes(shipments))
    .route("/admin/orders", adminOrderRoutes(adminOrders, paymentLinks))
    .route("/admin/coupons", adminCouponRoutes(coupons))
    .route("/admin/payments", adminPaymentRoutes(payments))
    .onError(onError)
    .notFound((c) => c.json({ error: { code: "not_found", message: "Ruta inexistente" } }, 404));

  return { app, db, events, scheduler };
}

export type AppType = ReturnType<typeof buildApp>["app"];
