import { relative } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import type { OrderStatus } from "@mini-galu/contracts";
import { createDb, eq, schema } from "@mini-galu/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createAuth } from "./auth/infrastructure/better-auth";
import { authRoutes, requireAdmin } from "./auth/infrastructure/http/auth-routes";
import { AutomationService } from "./automations/application/automation-service";
import {
  DrizzleAutomationOrders,
  DrizzleAutomationSettings,
  DrizzleLowStock,
  DrizzleRunLog,
  DrizzleWaitlist,
} from "./automations/infrastructure/drizzle-automations";
import { adminAutomationRoutes } from "./automations/infrastructure/http/automation-routes";
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
import { AdminCustomersService } from "./customers/application/admin-customers-service";
import { CustomerService } from "./customers/application/customer-service";
import { DrizzleAdminCustomers } from "./customers/infrastructure/drizzle-admin-customers";
import { DrizzleCustomerOrders, DrizzleCustomers } from "./customers/infrastructure/drizzle-customers";
import { accountRoutes, wishlistRoutes } from "./customers/infrastructure/http/account-routes";
import { adminCustomerRoutes } from "./customers/infrastructure/http/admin-customer-routes";
import { GiftcardService } from "./giftcards/application/giftcard-service";
import type { GiftcardRecord } from "./giftcards/application/ports";
import { DrizzleGiftcards } from "./giftcards/infrastructure/drizzle-giftcards";
import { giftcardRoutes } from "./giftcards/infrastructure/http/giftcard-routes";
import { NewsletterService } from "./newsletter/application/newsletter-service";
import { DrizzleLetters, DrizzleSubscribers } from "./newsletter/infrastructure/drizzle-newsletter";
import { adminNewsletterRoutes, newsletterRoutes } from "./newsletter/infrastructure/http/newsletter-routes";
import { OrderNotifications } from "./notifications/application/order-notifications";
import { untilLabel } from "./notifications/domain/mail";
import { SmtpMailer } from "./notifications/infrastructure/smtp-mailer";
import { AdminOrdersService } from "./orders/application/admin-orders-service";
import { CheckoutService } from "./orders/application/checkout-service";
import { OrderPayments } from "./orders/application/order-payments";
import { OrderShipping } from "./orders/application/order-shipping";
import { PaymentLinks } from "./orders/application/payment-links";
import { formatOrderNumber, payPath } from "./orders/domain/order";
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
import { AndreaniClient } from "./shipping/infrastructure/andreani/andreani-client";
import { AndreaniGateway, AndreaniRates } from "./shipping/infrastructure/andreani/andreani-gateway";
import { AndreaniBranches, FakeBranches } from "./shipping/infrastructure/andreani-branches";
import { DrizzleShipmentRepository } from "./shipping/infrastructure/drizzle-shipment-repository";
import { DrizzleShippingSettings } from "./shipping/infrastructure/drizzle-shipping-settings";
import { FakeAndreani } from "./shipping/infrastructure/fake-andreani";
import {
  adminShipmentRoutes,
  adminShippingRoutes,
  trackingRoutes,
} from "./shipping/infrastructure/http/shipment-routes";
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
    rateLimit: config.env === "production",
    google: config.google,
    onSignUp: async (u) => {
      if (u.newsletterOptIn) await newsletter.subscribe(u.email, "registro");
    },
    mail: {
      resetPassword: (to, name, url) =>
        notifications.message({
          to,
          subject: "Creá una contraseña nueva",
          eyebrow: "Tu cuenta",
          name: name || null,
          body: "Nos pediste cambiar la contraseña de tu cuenta de Mini Galú. El link vale 1 hora. Si no fuiste vos, ignorá este mail: tu contraseña sigue igual.",
          cta: { label: "Crear contraseña nueva", url },
          number: null,
        }),
      verifyEmail: (to, name, url) =>
        notifications.message({
          to,
          subject: "Confirmá tu mail",
          eyebrow: "Tu cuenta",
          name: name || null,
          body: "¡Gracias por crear tu cuenta! Confirmá tu mail para recibir los avisos de tus pedidos y de los talles que vuelven.",
          cta: { label: "Confirmar mi mail", url },
          number: null,
        }),
    },
    // se bloqueó una cuenta por intentos fallidos: si existe, se le avisa (la respuesta al navegador es la misma)
    onLoginLocked: async (email) => {
      const [u] = await db
        .select({ email: schema.user.email, firstName: schema.user.firstName })
        .from(schema.user)
        .where(eq(schema.user.email, email.trim().toLowerCase()));
      if (!u) return;
      await notifications.message({
        to: u.email,
        subject: "Bloqueamos el ingreso a tu cuenta por 15 minutos",
        eyebrow: "Seguridad de tu cuenta",
        name: u.firstName || null,
        body: "Hubo varios intentos fallidos de ingresar con tu email, así que pausamos el ingreso por 15 minutos. Si fuiste vos, esperá y probá de nuevo. Si no fuiste vos, cambiá la contraseña y activá la verificación en dos pasos.",
        cta: null,
        number: null,
      });
    },
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
  // Andreani de verdad si están las credenciales en el .env; si no, envíos simulados y tabla por zona
  const shippingSettings = new DrizzleShippingSettings(db);
  const andreani = config.andreani ? new AndreaniClient(config.andreani) : null;
  const shipping = new ShippingService(
    andreani && config.andreani
      ? new AndreaniRates(andreani, config.andreani, shippingSettings, new TableShippingRates())
      : new TableShippingRates(),
    undefined,
    config.branches === "andreani" ? new AndreaniBranches() : new FakeBranches(),
  );
  const cart = new CartService(new DrizzleCartRepository(db), variants, storage, orders);
  const coupons = new CouponService(new DrizzleCouponRepository(db));
  // las gift cards se arman más abajo (necesitan los mails); el checkout las usa recién al cotizar o comprar
  const checkout: CheckoutService = new CheckoutService(
    cart,
    shipping,
    coupons,
    orders,
    storage,
    {
      check: (code) => giftcards.check(code),
      checkById: (id) => giftcards.checkById(id),
      summary: (orderId) => giftcards.summary(orderId),
    },
    (orderId) => orderPayments.approved(orderId, { method: "giftcard", installments: 1 }),
  );
  const orderPayments = new OrderPayments(orders, cart, coupons, events);
  const adminOrders = new AdminOrdersService(
    orders,
    storage,
    events,
    slotLabel,
    (number, token) => config.webOrigin + payPath(number, token),
  );
  const paymentLinks = new PaymentLinks(variants, shipping, orders, events, config.webOrigin, () =>
    automations.isOn("link_sin_pagar"),
  );
  const shipments = new ShipmentService(
    andreani && config.andreani
      ? new AndreaniGateway(andreani, config.andreani)
      : new FakeAndreani(undefined, config.fakeAndreaniSpeed),
    new DrizzleShipmentRepository(db),
    new OrderShipping(orders, storage, events, `${WORKSHOP}, CABA`),
    (number, token) => config.webOrigin + payPath(number, token),
    shippingSettings,
    config.branches,
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
    scheduler.every(3600, "pedir reseñas", () => automations.askReviews());
    scheduler.every(600, "stock bajo", () => automations.checkLowStock());
    scheduler.every(600, "mandar gift cards programadas", () => giftcards.deliverDue());
  }

  // TODO(fase 6 · automations): avisar a los anotados que ya salió (y 1 hora antes si notifyBefore)
  events.on("LaunchPublished", (e) => console.info("[eventos] Lanzamiento publicado:", JSON.stringify(e.payload)));
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
  const newsletter = new NewsletterService(
    new DrizzleSubscribers(db),
    new DrizzleLetters(db),
    notifications,
    (t) => `${config.webOrigin}/cartas/baja?t=${encodeURIComponent(t)}`,
  );
  const giftcards: GiftcardService = new GiftcardService(
    new DrizzleGiftcards(db),
    {
      create: (o) => checkout.placeGiftcard(o.buyer, o.amountCents),
      async close(orderId) {
        if (await orders.setStatus(orderId, "nuevo", "entregado", new Date()))
          await orders.addEvent(orderId, {
            kind: "status",
            title: "Gift card activada",
            detail: "No hay prendas que preparar",
            auto: true,
            toStatus: "entregado",
          });
      },
      log: (orderId, title, detail) => orders.addEvent(orderId, { kind: "giftcard", title, detail, auto: true }),
      async find(orderId) {
        const o = await orders.findById(orderId);
        return o
          ? {
              kind: o.kind,
              email: o.email,
              firstName: o.firstName,
              giftcardId: o.giftcardId ?? null,
              giftcardCents: o.giftcardCents,
            }
          : null;
      },
    },
    {
      toRecipient: (to, c) => notifications.giftcard(to, giftcardMailData(c)),
      toBuyer: (to, c) =>
        notifications.giftcardBuyer(to, giftcardMailData(c), {
          via: c.via,
          recipient: c.recipient,
          when: c.deliverAt && c.deliverAt > new Date() ? longDay(c.deliverAt) : null,
          whatsappUrl:
            c.via === "whatsapp"
              ? `https://wa.me/${c.recipient.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `¡Hola! ${c.fromName} te regaló una gift card de Mini Galú para ${c.toName} ♡ Código: ${c.code} · se usa en ${config.webOrigin}/catalogo`,
                )}`
              : null,
        }),
    },
  );
  const customers = new CustomerService(
    new DrizzleCustomers(db, storage),
    new DrizzleCustomerOrders(db, storage, formatOrderNumber),
    newsletter,
    giftcards,
  );
  // automatizaciones: cada regla se puede pausar y editar desde el panel (admin-automatizaciones.html)
  const automations = new AutomationService(
    new DrizzleAutomationSettings(db),
    new DrizzleRunLog(db),
    notifications,
    new DrizzleAutomationOrders(db, slotLabel, formatOrderNumber),
    new DrizzleWaitlist(db),
    new DrizzleLowStock(db),
    {
      tracking: (n) => `${config.webOrigin}/seguimiento?pedido=${encodeURIComponent(n)}`,
      product: (slug) => `${config.webOrigin}/producto/${slug}`,
      site: config.webOrigin,
      workshop: `${WORKSHOP}, CABA`,
    },
  );
  // la compra de una gift card no lleva los avisos de un pedido de prendas: le llega su código
  const prendas = (e: { payload: Record<string, unknown> }) => e.payload.kind !== "giftcard";
  events.on("PaymentApproved", (e) =>
    prendas(e) ? automations.paymentApproved(String(e.payload.orderId)) : undefined,
  );
  // lista de cumple: lo que se regaló con este pedido queda marcado
  events.on("PaymentApproved", (e) =>
    prendas(e) ? customers.wishGifted(String(e.payload.orderId)).then(() => {}) : undefined,
  );
  // gift cards: se activa la que se compró o se descuenta la que se usó
  events.on("PaymentApproved", (e) => giftcards.paymentApproved(String(e.payload.orderId)));
  events.on("OrderStatusChanged", (e) =>
    automations.statusChanged(String(e.payload.orderId), e.payload.to as OrderStatus),
  );
  events.on("StockReplenished", (e) =>
    automations.replenished(e.payload as { productId: string; slug: string; name: string; sizes: { size: string }[] }),
  );
  events.on("PaymentLinkReminder", (e) => {
    const p = e.payload;
    return automations.linkReminder({
      orderId: String(p.orderId),
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
    .route("/newsletter", newsletterRoutes(newsletter))
    .route("/giftcards", giftcardRoutes(giftcards))
    .route("/me", accountRoutes(auth, customers))
    .route("/lists", wishlistRoutes(customers))
    .get("/account/options", (c) => c.json({ google: !!config.google }))
    .use("/admin/*", requireAdmin(auth, config.requireAdmin2fa))
    .route("/admin/catalog", adminCatalogRoutes(adminCatalog, catalog))
    .route("/admin/content/launches", adminLaunchesRoutes(launches))
    .route("/admin/content/home", adminHomeRoutes(content))
    .route("/admin/orders", adminShipmentRoutes(shipments))
    .route("/admin/orders", adminOrderRoutes(adminOrders, paymentLinks))
    .route("/admin/coupons", adminCouponRoutes(coupons))
    .route("/admin/payments", adminPaymentRoutes(payments))
    .route("/admin/shipping", adminShippingRoutes(shipments))
    .route("/admin/newsletter", adminNewsletterRoutes(newsletter))
    .route(
      "/admin/customers",
      adminCustomerRoutes(new AdminCustomersService(new DrizzleAdminCustomers(db, storage, formatOrderNumber))),
    )
    .route(
      "/admin/automations",
      adminAutomationRoutes(automations, () => ({
        mail: "conectado",
        whatsapp: "sin_conectar",
        mercadopago: gateway.mode,
        andreani: config.andreani?.env ?? "simulado",
      })),
    )
    .onError(onError)
    .notFound((c) => c.json({ error: { code: "not_found", message: "Ruta inexistente" } }, 404));

  return { app, db, events, scheduler };
}

export type AppType = ReturnType<typeof buildApp>["app"];

const AR_DAY = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "America/Argentina/Buenos_Aires",
});
const AR_DATE = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});
const longDay = (d: Date) => AR_DAY.format(d);

function giftcardMailData(c: GiftcardRecord & { code: string; expiresAt: Date }) {
  return {
    code: c.code,
    amountCents: c.amountCents,
    toName: c.toName,
    fromName: c.fromName,
    message: c.message,
    expiresLabel: AR_DATE.format(c.expiresAt),
    design: c.design,
  };
}
